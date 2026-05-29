// 遊戲狀態與回合控制（單一場遊戲，伺服器端唯一真實來源）
// 模組 2：回合制 + 計時 + 老師控制（開始/暫停/下一回合/重置/調參）
// 模組 3：各組登入 + 抽職業卡 + 財務資料
// 模組 4：買賣資產 + 每回合發薪/被動收入結算 + 即時動態
import { PROFESSIONS, randomProfession, getProfession } from './data/professions.js';
import { MARKET, getMarketItem } from './data/assets.js';
import { BOARD } from './data/board.js';
import { drawCard } from './data/cards.js';
import { randomMonthlyEvent, SECTOR_VOLATILITY } from './data/events.js';
import { saveToFile } from './storage.js';

let io = null;
let tickInterval = null;
let teamSeq = 0; // 組別流水號
let uidSeq = 0; // 資產 / 負債的唯一序號
let autosaveTimer = null; // 自動存檔的去抖計時器
const feed = []; // 最新動態（大螢幕用），最多保留 30 筆

function nextUid() {
  uidSeq += 1;
  return 'u' + uidSeq;
}

const state = {
  phase: 'lobby', // lobby（等待開始）| running（進行中）| paused（暫停）| ended（結束）
  round: 0, // 目前回合（1 起算）
  maxRounds: 12, // 總回合數
  roundSeconds: 240, // 每回合秒數（預設 4 分鐘，老師可調）
  timeLeft: 0, // 本回合剩餘秒數
  teams: {}, // 各組資料（模組 3 起填入）
  turnOrder: [], // 擲骰輪流順序（依加入順序的 teamId）
  currentTurnIndex: 0, // 目前輪到第幾位（指向 turnOrder）
  market: freshMarket(), // 三大類市場指數（會浮動）
  monthlyEvent: null, // 本月大事件
  showTutorial: false, // 大螢幕是否顯示新手教學
};

// 市場初始化：每支股票/ETF/加密貨幣各自一條價格序列；房地產用分類指數
function freshMarket() {
  const instruments = {};
  for (const item of MARKET) {
    if (item.category === 'dividend' || item.category === 'crypto') {
      // 加密以 100 為名目價（當作指數）；股票/ETF 以牌價為起點
      const base = item.category === 'crypto' ? 100 : item.price;
      instruments[item.id] = {
        id: item.id,
        name: item.name,
        emoji: item.emoji,
        category: item.category,
        tags: item.tags || [],
        price: base,
        history: [base],
      };
    }
  }
  return {
    instruments, // 每支商品的現價與歷史（畫走勢圖）
    realestate: { index: 100, history: [100] }, // 房地產分類指數（持有房產估值）
  };
}

// 加密類別所屬的波動歸到 'crypto'，股利歸 'stock'（查波動度用）
function volSectorOf(category) {
  if (category === 'dividend') return 'stock';
  if (category === 'crypto') return 'crypto';
  return null;
}

// 把某資產對應到一支「可浮動的商品」：市場本身的商品用自己 id，
// 機會卡來的股票/加密則對標到代表性商品，讓它也隨價格浮動
function resolveInstrumentId(category, tags = [], ownId) {
  const inst = state.market.instruments;
  if (ownId && inst[ownId]) return ownId;
  if (category === 'crypto') return tags.includes('meme') ? 'crypto_meme' : 'crypto_btc';
  if (category === 'dividend') return tags.includes('ai') ? 'stock_aichip' : 'etf_market';
  return null;
}

// 目前輪到哪一組擲骰（null＝本回合都擲完了）
function currentTurnId() {
  return state.turnOrder[state.currentTurnIndex] || null;
}

// 對外公開的狀態
function publicState() {
  return {
    phase: state.phase,
    round: state.round,
    maxRounds: state.maxRounds,
    roundSeconds: state.roundSeconds,
    timeLeft: state.timeLeft,
    currentTurnId: currentTurnId(), // 目前輪到擲骰的組別
    turnIndex: state.currentTurnIndex,
    turnTotal: state.turnOrder.length,
    market: state.market, // 三大類市場指數＋歷史（畫走勢圖）
    monthlyEvent: state.monthlyEvent, // 本月大事件
    showTutorial: state.showTutorial, // 大螢幕教學開關
  };
}

// 老師開關大螢幕新手教學
export function toggleTutorial(on) {
  state.showTutorial = typeof on === 'boolean' ? on : !state.showTutorial;
  broadcast();
}

// 換下一組擲骰
function advanceTurn() {
  state.currentTurnIndex += 1;
  broadcast();
}

export function initGame(ioInstance) {
  io = ioInstance;
}

export function getPublicState() {
  return publicState();
}

// 廣播最新狀態給所有連線（大螢幕、學生、老師）
function broadcast() {
  if (io) io.emit('game:state', publicState());
}

// 每秒倒數計時器
function startTick() {
  stopTick();
  tickInterval = setInterval(() => {
    if (state.phase !== 'running') return; // 暫停時不倒數
    if (state.timeLeft > 0) {
      state.timeLeft -= 1;
      broadcast();
    }
    // 時間到（timeLeft === 0）：停在 0，等待老師按「下一回合」，由老師掌握節奏
  }, 1000);
}

function stopTick() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

// 進入新回合：本月大事件 → 指數浮動 → 各組自動發薪
function enterNewRound(roundNumber) {
  state.round = roundNumber;
  state.timeLeft = state.roundSeconds;
  state.currentTurnIndex = 0; // 從第一組重新開始輪
  applyMonthlyEvent(); // 先跑本月大事件，更新市場指數與資產價值
  for (const team of Object.values(state.teams)) {
    team.hasRolledThisRound = false;
    team.pendingAction = null; // 上一回合沒處理的機會/慈善視為放棄
    settleTeam(team); // 每回合自動發薪（薪水＋被動−支出）
  }
  broadcastTeams();
}

// 每回合開場：抽本月大事件，更新每支商品價格 + 房地產指數，再重算所有資產
function applyMonthlyEvent() {
  const evt = randomMonthlyEvent();
  const prevEvent = state.monthlyEvent; // 上個月的事件（供回顧）
  // 記錄變動前的價格，供計算本月漲跌
  const before = {};
  for (const id in state.market.instruments) before[id] = state.market.instruments[id].price;
  const reBefore = state.market.realestate.index;

  state.monthlyEvent = { ...evt, round: state.round };

  // 逐支商品浮動：基礎波動 × 事件乘數（AI 股對 AI 事件更敏感）
  for (const id in state.market.instruments) {
    const inst = state.market.instruments[id];
    const sector = volSectorOf(inst.category); // stock / crypto
    const vol = SECTOR_VOLATILITY[sector] || 0.05;
    const drift = 1 + (Math.random() * 2 - 1) * vol;
    let eventMult = evt.effects?.[sector] ?? 1;
    // AI 主題商品對「股市類」事件的反應放大 1.8 倍
    if (sector === 'stock' && inst.tags.includes('ai') && eventMult !== 1) {
      eventMult = 1 + (eventMult - 1) * 1.8;
    }
    inst.price = Math.max(1, Math.round(inst.price * drift * eventMult));
    inst.history.push(inst.price);
    if (inst.history.length > 40) inst.history.shift();
  }

  // 房地產分類指數
  {
    const vol = SECTOR_VOLATILITY.realestate || 0.03;
    const drift = 1 + (Math.random() * 2 - 1) * vol;
    const eventMult = evt.effects?.realestate ?? 1;
    const re = state.market.realestate;
    re.index = Math.max(5, Math.round(re.index * drift * eventMult));
    re.history.push(re.index);
    if (re.history.length > 40) re.history.shift();
  }

  for (const team of Object.values(state.teams)) recomputeAssetValues(team);

  // 計算三大類平均漲跌%（給大螢幕月報）
  function avgMove(filter) {
    let sum = 0, n = 0;
    for (const id in state.market.instruments) {
      const inst = state.market.instruments[id];
      if (!filter(inst)) continue;
      const b = before[id] || inst.price;
      sum += (inst.price - b) / b; n++;
    }
    return n ? Math.round((sum / n) * 100) : 0;
  }
  const moves = {
    stock: avgMove((i) => i.category === 'dividend'),
    crypto: avgMove((i) => i.category === 'crypto'),
    realestate: reBefore ? Math.round(((state.market.realestate.index - reBefore) / reBefore) * 100) : 0,
  };

  addFeed(`${evt.emoji} 本月大事件：${evt.title}（${evt.desc || ''}）`);
  if (io) {
    io.emit('market:monthly', { event: state.monthlyEvent, market: publicMarket(), before, reBefore });
    // 月報彈窗：上月回顧（事件＋漲跌結果）＋ 本月突發事件
    io.emit('month:report', {
      round: state.round,
      prevEvent: prevEvent ? { emoji: prevEvent.emoji, title: prevEvent.title } : null,
      thisEvent: { emoji: evt.emoji, title: evt.title, desc: evt.desc || '' },
      moves,
    });
  }
}

// 重算某組所有浮動資產的現值
function recomputeAssetValues(team) {
  for (const a of team.assets || []) {
    if (a.instrumentId && state.market.instruments[a.instrumentId]) {
      a.value = Math.max(0, Math.round((a.units || 0) * state.market.instruments[a.instrumentId].price));
    } else if (a.category === 'realestate' && a.costBasis != null) {
      a.value = Math.max(0, Math.round(a.costBasis * state.market.realestate.index / 100));
    }
  }
}

// 對外公開的市場資料（含每支商品現價/歷史 + 房地產指數）
function publicMarket() {
  return state.market;
}

// 開始遊戲，或從暫停/結束狀態繼續/重開
export function startGame() {
  if (state.phase === 'lobby' || state.phase === 'ended') {
    // 開新局：進入第 1 回合並結算第一次發薪
    state.phase = 'running';
    enterNewRound(1);
  } else {
    // 從 paused 恢復進行（保留目前 timeLeft，不重新發薪）
    state.phase = 'running';
  }
  startTick();
  broadcast();
  scheduleAutosave();
}

export function pauseGame() {
  if (state.phase === 'running') {
    state.phase = 'paused';
    broadcast();
    scheduleAutosave();
  }
}

// 老師跳過目前這組的擲骰回合（該組離線/拖太久時用）
export function skipTurn() {
  if (state.phase !== 'running') return;
  const team = getTeam(currentTurnId());
  if (team) {
    team.hasRolledThisRound = true;
    team.pendingAction = null;
    addFeed(`⏭️ 老師跳過了 ${team.name} 的回合`);
    emitTeam(team);
  }
  advanceTurn();
}

// 進入下一回合；超過總回合數則結束遊戲
export function nextRound() {
  if (state.phase === 'lobby') return;
  if (state.round >= state.maxRounds) {
    state.phase = 'ended';
    state.timeLeft = 0;
    stopTick();
    addFeed('🏁 遊戲結束！');
    broadcast();
    return;
  }
  state.phase = 'running';
  enterNewRound(state.round + 1); // 回合 +1 並結算發薪
  startTick();
  broadcast();
}

export function resetGame() {
  stopTick();
  state.phase = 'lobby';
  state.round = 0;
  state.timeLeft = 0;
  state.market = freshMarket(); // 市場指數歸 100
  state.monthlyEvent = null;
  // 重置各組財務回到起始狀態（保留組別與職業），等同重新開始整場
  for (const team of Object.values(state.teams)) {
    resetTeamFinances(team);
    emitTeam(team);
  }
  feed.length = 0;
  if (io) io.emit('feed:list', feed);
  broadcast();
  broadcastTeams();
}

// 全新遊戲：清空所有組別與動態，回到最初的空白狀態（換班 / 重新測驗用）
export function clearGame() {
  stopTick();
  state.phase = 'lobby';
  state.round = 0;
  state.timeLeft = 0;
  state.teams = {};
  state.turnOrder = [];
  state.currentTurnIndex = 0;
  state.market = freshMarket();
  state.monthlyEvent = null;
  teamSeq = 0;
  uidSeq = 0;
  feed.length = 0;
  broadcast();
  broadcastTeams(); // 連帶觸發自動存檔，讓 autosave.json 也變空白
  if (io) io.emit('feed:list', feed);
}

// ── 組別 / 財務 ──

// 依職業把某組財務還原到起始狀態
function resetTeamFinances(team) {
  const prof = getProfession(team.professionId);
  if (!prof) return;
  team.cash = prof.savings;
  team.salary = prof.salary;
  team.expenses = { ...prof.expenses }; // 各項月支出（稅金/房貸/車貸/學貸/卡債/額外）
  team.perChild = prof.perChild;
  team.children = 0;
  team.personalLiabilities = { ...prof.liabilities, bankLoan: 0 }; // 各項負債餘額
  team.assets = []; // 投資資產（每筆含 category）
  team.assetLiabilities = []; // 投資連動負債（房貸/企業貸款）
  team.charityTurns = 0; // 慈善剩餘可用次數（擲兩顆骰）
  team.skipTurns = 0; // 失業輪空次數
  team.position = 0; // 在老鼠賽跑圈上的格子（0–23）
  team.hasRolledThisRound = false; // 本回合是否已擲骰
  team.pendingAction = null; // 待處理的互動事件（機會抽卡 / 慈善）
  team.history = [];
  team.free = false;
  team.freedRound = null;
}

// 職業卡的公開摘要（給開局二選一畫面顯示）
function profExpenseTotal(prof) {
  const e = prof.expenses;
  return e.tax + e.homeMortgage + e.carLoan + e.schoolLoan + e.creditCard + e.other;
}
function profLiabTotal(prof) {
  const l = prof.liabilities;
  return l.homeMortgage + l.carLoan + l.schoolLoan + l.creditCard;
}
export function professionPublic(prof) {
  return {
    id: prof.id,
    name: prof.name,
    emoji: prof.emoji,
    salary: prof.salary,
    variableIncome: prof.variableIncome || null,
    expenseTotal: profExpenseTotal(prof),
    cashflowStart: prof.salary - profExpenseTotal(prof),
    savings: prof.savings,
    liabilitiesTotal: profLiabTotal(prof), // 起始負債總額
    netWorthStart: prof.savings - profLiabTotal(prof),
    hasHouse: (prof.liabilities.homeMortgage || 0) > 0, // 是否有自住房（有房貸＝有房）
    freedomThreshold: profExpenseTotal(prof), // 被動收入需達此值才財務自由
    perk: prof.perk,
  };
}

// 隨機抽兩張不同職業卡，給玩家二選一
export function professionPair() {
  const pool = [...PROFESSIONS];
  const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
  const b = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
  return [professionPublic(a), professionPublic(b)];
}

// 學生加入：建立組別。professionId 有給且有效就用，否則隨機
export function createTeam(name, professionId) {
  const prof = (professionId && getProfession(professionId)) || randomProfession();
  teamSeq += 1;
  // teamId 同時作為「重連代號」（如 T3-4829），學生斷線後可用它還原
  const teamId = `T${teamSeq}-${Math.floor(1000 + Math.random() * 9000)}`;
  const team = {
    id: teamId,
    name: (name || '').trim() || `第 ${teamSeq} 組`,
    professionId: prof.id,
    professionName: prof.name,
    professionEmoji: prof.emoji,
    professionPerk: prof.perk,
    variableIncome: prof.variableIncome || null, // 浮動收入範圍（YouTuber）
  };
  resetTeamFinances(team);
  state.teams[teamId] = team;
  state.turnOrder.push(teamId); // 加入輪流順序的最後
  addFeed(`👋 ${team.name}（${prof.name}）加入遊戲`);
  broadcast();
  broadcastTeams();
  return team;
}

export function getTeam(teamId) {
  return state.teams[teamId] || null;
}

// 給學生端的完整資料（含衍生欄位）；用於 join / resume 回傳
export function getTeamPayload(teamId) {
  const team = getTeam(teamId);
  return team ? { ...team, derived: computeDerived(team) } : null;
}

// 被動收入（非工資收入）四分類：利息 / 股利 / 房地產 / 企業（crypto 不計）
function passiveBreakdown(team) {
  const b = { interest: 0, dividend: 0, realestate: 0, business: 0 };
  for (const a of team.assets || []) {
    if (b[a.category] !== undefined) b[a.category] += a.monthlyIncome || 0;
  }
  b.total = b.interest + b.dividend + b.realestate + b.business;
  return b;
}

// 每月銀行貸款月付＝貸款餘額的 10%
function bankLoanPayment(team) {
  return Math.round((team.personalLiabilities?.bankLoan || 0) * 0.1);
}

// 總支出 = 各項月支出 + 小孩支出×人數 + 銀行貸款月付
function computeTotalExpense(team) {
  const e = team.expenses || {};
  const base = (e.tax || 0) + (e.homeMortgage || 0) + (e.carLoan || 0) +
    (e.schoolLoan || 0) + (e.creditCard || 0) + (e.other || 0);
  return base + (team.perChild || 0) * (team.children || 0) + bankLoanPayment(team);
}

// 負債總額（計入淨資產）
function computeLiabilitiesTotal(team) {
  const l = team.personalLiabilities || {};
  const personal = (l.homeMortgage || 0) + (l.carLoan || 0) + (l.schoolLoan || 0) +
    (l.creditCard || 0) + (l.bankLoan || 0);
  const linked = (team.assetLiabilities || []).reduce((s, x) => s + (x.balance || 0), 0);
  return personal + linked;
}

// 衍生欄位（總收入/總支出/月現金流/淨資產等），統一在伺服器算，前端直接顯示
function computeDerived(team) {
  const passive = passiveBreakdown(team);
  const totalExpense = computeTotalExpense(team);
  const totalIncome = team.salary + passive.total;
  const cashflow = totalIncome - totalExpense; // 月現金流
  const assetsValue = (team.assets || []).reduce((s, a) => s + (a.value || 0), 0);
  const liabilitiesTotal = computeLiabilitiesTotal(team);
  return {
    passive,
    passiveTotal: passive.total,
    totalIncome,
    totalExpense,
    cashflow,
    bankLoanPayment: bankLoanPayment(team),
    assetsValue,
    liabilitiesTotal,
    netWorth: team.cash + assetsValue - liabilitiesTotal,
    free: passive.total >= totalExpense, // 非工資收入 ≥ 總支出 → 財務自由
  };
}

export function netWorth(team) {
  return computeDerived(team).netWorth;
}

// 對外公開的組別摘要（大螢幕排行榜 / 老師端用）
export function publicTeam(team) {
  const d = computeDerived(team);
  return {
    id: team.id,
    name: team.name,
    professionName: team.professionName,
    professionEmoji: team.professionEmoji,
    netWorth: d.netWorth,
    passiveIncome: d.passiveTotal,
    passive: d.passive,
    expense: d.totalExpense,
    cashflow: d.cashflow,
    free: team.free, // 以鎖定的旗標為準（達成後即使數字變動仍維持）
    position: team.position || 0, // 老鼠賽跑圈上的格子
    hasRolled: !!team.hasRolledThisRound, // 本回合是否已擲骰
  };
}

export function listPublicTeams() {
  return Object.values(state.teams).map(publicTeam);
}

export function broadcastTeams() {
  if (io) io.emit('teams:list', listPublicTeams());
  scheduleAutosave();
}

// 調整遊戲參數（總回合數、每回合秒數）；建議在 lobby 階段調整
export function setConfig({ maxRounds, roundSeconds } = {}) {
  if (Number.isFinite(maxRounds) && maxRounds > 0) {
    state.maxRounds = Math.floor(maxRounds);
  }
  if (Number.isFinite(roundSeconds) && roundSeconds > 0) {
    state.roundSeconds = Math.floor(roundSeconds);
  }
  broadcast();
  scheduleAutosave();
}

// ── 存檔 / 還原 ──

// 把整場遊戲狀態打包成可序列化的快照
export function getSnapshot() {
  return {
    version: 1,
    savedAt: Date.now(),
    phase: state.phase,
    round: state.round,
    maxRounds: state.maxRounds,
    roundSeconds: state.roundSeconds,
    timeLeft: state.timeLeft,
    teams: state.teams,
    turnOrder: state.turnOrder,
    currentTurnIndex: state.currentTurnIndex,
    market: state.market,
    monthlyEvent: state.monthlyEvent,
    teamSeq,
    uidSeq,
    feed,
  };
}

// 從快照還原整場遊戲（載入存檔 / 伺服器重啟自動還原）
export function loadSnapshot(data) {
  if (!data || typeof data !== 'object') return false;
  stopTick();
  state.phase = data.phase ?? 'lobby';
  state.round = data.round ?? 0;
  state.maxRounds = data.maxRounds ?? 12;
  state.roundSeconds = data.roundSeconds ?? 240;
  state.timeLeft = data.timeLeft ?? 0;
  state.teams = data.teams && typeof data.teams === 'object' ? data.teams : {};
  state.market = data.market && data.market.instruments ? data.market : freshMarket();
  state.monthlyEvent = data.monthlyEvent ?? null;
  state.turnOrder = Array.isArray(data.turnOrder) ? data.turnOrder : Object.keys(state.teams);
  state.currentTurnIndex = Number.isFinite(data.currentTurnIndex) ? data.currentTurnIndex : 0;
  teamSeq = Number.isFinite(data.teamSeq)
    ? data.teamSeq
    : Object.keys(state.teams).length;
  uidSeq = Number.isFinite(data.uidSeq) ? data.uidSeq : 0;
  feed.length = 0;
  if (Array.isArray(data.feed)) feed.push(...data.feed);

  // 重新把全部狀態推給所有連線
  broadcast();
  if (io) {
    io.emit('teams:list', listPublicTeams());
    io.emit('feed:list', feed);
  }
  for (const team of Object.values(state.teams)) emitTeam(team);

  // 若還原時是進行中，繼續倒數
  if (state.phase === 'running') startTick();
  return true;
}

// 去抖自動存檔：寫入 saves/autosave.json
function scheduleAutosave() {
  if (autosaveTimer) return;
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    try {
      saveToFile('autosave.json', getSnapshot());
    } catch (e) {
      console.error('⚠️ 自動存檔失敗：', e.message);
    }
  }, 800);
}

// ── 即時動態（最新動態 feed） ──

function addFeed(text) {
  feed.unshift({ text, ts: Date.now() });
  if (feed.length > 30) feed.length = 30;
  if (io) io.emit('feed:list', feed);
}

export function getFeed() {
  return feed;
}

// ── 財務計算與推播 ──

// 把單一組別的最新狀態（含衍生欄位）推給該組（同 team 房間）
function emitTeam(team) {
  if (io) io.to('team:' + team.id).emit('student:team', { ...team, derived: computeDerived(team) });
}

// 新增一筆歷史紀錄（最新在前，最多 50 筆）
function addHistory(team, entry) {
  team.history.unshift({ ...entry, ts: Date.now() });
  if (team.history.length > 50) team.history.length = 50;
}

// 檢查是否達成財務自由（非工資收入 ≥ 總支出），首次達成時推播動態
function checkFreedom(team) {
  const d = computeDerived(team);
  if (d.free && !team.free) {
    team.free = true;
    team.freedRound = state.round;
    addFeed(`🎉🏆 ${team.name} 達成財務自由！`);
    if (io) io.emit('game:freed', { teamId: team.id, name: team.name });
  }
}

// ── 發薪結算（擲骰經過「發薪」格時觸發） ──

function settleTeam(team) {
  // 浮動收入職業（YouTuber）每月於範圍內重抽（取整到千）
  if (team.variableIncome) {
    const [lo, hi] = team.variableIncome;
    team.salary = Math.round((lo + Math.random() * (hi - lo)) / 1000) * 1000;
  }
  const d = computeDerived(team);
  team.cash += d.cashflow; // 月現金流入帳（可能為負）
  addHistory(team, {
    round: state.round,
    type: 'payday',
    salary: team.salary,
    passive: d.passiveTotal,
    expense: d.totalExpense,
    delta: d.cashflow,
  });
  coverIfNegative(team); // 現金為負 → 自動貸款補足（破產螺旋）
  checkFreedom(team);
  emitTeam(team);
}

// 現金為負時自動向銀行貸款補足（湊整到萬元），並發出破產警告
// 仁慈版：不直接淘汰，而是讓負債滾大，體會「越借越窮」的陷阱
function coverIfNegative(team) {
  if (team.cash >= 0) return 0;
  const need = Math.ceil(-team.cash / 10000) * 10000;
  team.personalLiabilities.bankLoan += need;
  team.cash += need;
  addFeed(`⚠️ ${team.name} 現金見底，自動貸款 ${formatNT(need)}（破產警告！）`);
  emitEvent(team, {
    emoji: '⚠️',
    title: '破產警告',
    text: `現金不足，自動向銀行借 ${formatNT(need)}，每月利息增加！快增加被動收入或賣資產還債。`,
  });
  return need;
}

// ── 擲骰 / 移動 ──

// 某組擲骰並沿老鼠賽跑圈移動；經過/停在「發薪」格會收月現金流
export function rollDice(teamId) {
  if (state.phase !== 'running') return { ok: false, reason: '現在不是操作時間' };
  const team = getTeam(teamId);
  if (!team) return { ok: false, reason: '找不到組別' };
  if (currentTurnId() !== teamId) return { ok: false, reason: '還沒輪到你擲骰' };
  if (team.hasRolledThisRound) return { ok: false, reason: '這回合已經擲過了' };

  team.hasRolledThisRound = true;

  // 失業：本回合輪空（不移動），直接換下一組
  if (team.skipTurns > 0) {
    team.skipTurns -= 1;
    addFeed(`💼 ${team.name} 失業中，本回合輪空`);
    emitTeam(team);
    broadcastTeams();
    advanceTurn();
    return { ok: true, skipped: true };
  }

  // 慈善有效時可擲兩顆骰
  const diceCount = team.charityTurns > 0 ? 2 : 1;
  if (team.charityTurns > 0) team.charityTurns -= 1;
  const rolls = [];
  let steps = 0;
  for (let i = 0; i < diceCount; i++) {
    const r = 1 + Math.floor(Math.random() * 6);
    rolls.push(r);
    steps += r;
  }

  const from = team.position;
  const to = (from + steps) % BOARD.length;
  team.position = to;
  const square = BOARD[to];

  addFeed(`🎲 ${team.name} 擲出 ${rolls.join('+')}＝${steps}，停在 ${square.emoji}${square.label}`);
  if (io) io.emit('board:move', { teamId, from, to, steps, rolls, square: square.type });

  // 觸發停留格子的事件
  resolveSquare(team, square.type);

  checkFreedom(team);
  emitTeam(team);
  broadcastTeams();

  // 若沒有待處理的互動（機會抽卡 / 慈善），這組的回合就結束，換下一組
  if (!team.pendingAction) advanceTurn();

  return { ok: true, rolls, steps, from, to, square: square.type };
}

// ── 格子事件處理 ──

// 推一則「事件通知」給某組（學生端跳出提示）
function emitEvent(team, payload) {
  if (io) io.to('team:' + team.id).emit('student:event', payload);
}

// 廣播抽到的卡（大螢幕翻牌動畫用），帶上是哪一組、什麼職業骰到的
function announceCard(deck, card, team) {
  if (io)
    io.emit('card:drawn', {
      deck,
      card,
      teamName: team.name,
      professionName: team.professionName,
      professionEmoji: team.professionEmoji,
    });
}

function resolveSquare(team, type) {
  switch (type) {
    case 'opportunity': {
      // 若持有房地產，有機會出現「收購要約」；否則正常選小生意/大買賣
      const offer = maybeAcquisitionOffer(team);
      if (offer) {
        team.pendingAction = offer;
        announceCard('acquire', offer.card, team);
      } else {
        team.pendingAction = { type: 'opportunity' };
      }
      break;
    }
    case 'charity': {
      const cost = Math.round(computeDerived(team).totalIncome * 0.1);
      team.pendingAction = { type: 'charity', cost };
      break;
    }
    case 'market':
      applyMarketCard(team, drawCard('market'));
      break;
    case 'doodad':
      applyDoodad(team, drawCard('doodad'));
      break;
    case 'baby':
      haveBaby(team);
      break;
    case 'downsized':
      downsize(team);
      break;
    default:
      break;
  }
}

// 市場風雲卡：影響全班
function applyMarketCard(lander, card) {
  if (!card) return;
  announceCard('market', card, lander);

  if (card.kind === 'price') {
    // 整類別漲跌：推動對應的每支商品價格（股票/加密）或房地產指數
    if (card.targetCategory === 'realestate') {
      const re = state.market.realestate;
      re.index = Math.max(5, Math.round(re.index * card.factor));
      re.history.push(re.index);
      if (re.history.length > 40) re.history.shift();
    } else {
      for (const id in state.market.instruments) {
        const inst = state.market.instruments[id];
        const matchCat =
          (card.targetCategory === 'dividend' && inst.category === 'dividend') ||
          (card.targetCategory === 'crypto' && inst.category === 'crypto');
        const matchTag = card.targetTag && inst.tags.includes(card.targetTag);
        if (matchCat || matchTag) {
          inst.price = Math.max(1, Math.round(inst.price * card.factor));
          inst.history.push(inst.price);
          if (inst.history.length > 40) inst.history.shift();
        }
      }
    }
    for (const team of Object.values(state.teams)) {
      recomputeAssetValues(team);
      checkFreedom(team);
      emitTeam(team);
    }
    if (io) io.emit('market:monthly', { event: state.monthlyEvent, market: publicMarket() });
    addFeed(`${card.emoji} 市場風雲：${card.name}（${card.desc}）`);
  } else if (card.kind === 'windfall') {
    for (const team of Object.values(state.teams)) {
      team.cash += card.amount;
      addHistory(team, { round: state.round, type: card.amount >= 0 ? 'income' : 'expense', text: card.name, delta: card.amount });
      if (card.amount < 0) coverIfNegative(team);
      emitTeam(team);
    }
    addFeed(`${card.emoji} 市場風雲：${card.name}（${card.desc}）`);
  }
  broadcastTeams();
}

// ── 房地產收購要約 ──

// 買家名稱池（增添情境感）
const BUYERS = ['建設公司', '海外投資客', '隔壁鄰居', '連鎖民宿業者', '科技新貴', '包租公協會', '地產基金'];

// 若該組持有房地產，35% 機率產生一筆收購要約（對標某間房）
function maybeAcquisitionOffer(team) {
  const houses = (team.assets || []).filter((a) => a.category === 'realestate');
  if (houses.length === 0) return null;
  if (Math.random() > 0.35) return null;

  const asset = houses[Math.floor(Math.random() * houses.length)];
  // 通常溢價 +10~30%；約 12% 機率出現超高溢價 +50~80%
  const premium =
    Math.random() < 0.12
      ? 0.5 + Math.random() * 0.3
      : 0.1 + Math.random() * 0.2;
  const offerPrice = Math.round(asset.value * (1 + premium));
  const buyer = BUYERS[Math.floor(Math.random() * BUYERS.length)];
  const where = [asset.location, asset.roomType].filter(Boolean).join(' ');
  return {
    type: 'acquire',
    assetUid: asset.uid,
    offerPrice,
    premium: Math.round(premium * 100),
    buyer,
    card: {
      emoji: '🤝',
      name: `${buyer}想收購你的${asset.roomType || '房產'}`,
      desc: `${where}　開價 ${formatNT(offerPrice)}（溢價 +${Math.round(premium * 100)}%）`,
    },
  };
}

// 玩家決定是否賣出被收購的房產
export function acquireDecision(teamId, accept) {
  const team = getTeam(teamId);
  if (!team || team.pendingAction?.type !== 'acquire') return { ok: false, reason: '目前沒有收購要約' };
  const { assetUid, offerPrice } = team.pendingAction;
  team.pendingAction = null;

  const idx = (team.assets || []).findIndex((a) => a.uid === assetUid);
  if (idx < 0) {
    // 房產已不在（理論上不會發生），直接換人
    if (currentTurnId() === team.id) advanceTurn();
    return { ok: false, reason: '找不到該房產' };
  }
  const asset = team.assets[idx];

  if (accept) {
    let proceeds = offerPrice;
    // 清償連動房貸
    const li = team.assetLiabilities.findIndex((l) => l.linkedAssetUid === assetUid);
    if (li >= 0) {
      proceeds -= team.assetLiabilities[li].balance;
      team.assetLiabilities.splice(li, 1);
    }
    team.cash += proceeds;
    team.assets.splice(idx, 1);
    addHistory(team, { round: state.round, type: 'sell', text: `被收購：${asset.emoji} ${asset.name}`, delta: proceeds });
    addFeed(`🤝 ${team.name} 以 ${formatNT(offerPrice)} 賣出 ${asset.roomType || '房產'}（淨入 ${formatNT(proceeds)}）`);
    emitEvent(team, { emoji: '🤝', title: '成交！', text: `賣出 ${asset.name}，扣房貸後淨入帳 ${formatNT(proceeds)}` });
  } else {
    addFeed(`${team.name} 婉拒了 ${asset.roomType || '房產'} 的收購`);
  }
  checkFreedom(team);
  emitTeam(team);
  broadcastTeams();
  if (currentTurnId() === team.id) advanceTurn();
  return { ok: true, sold: accept };
}

// 額外支出卡：強制消費（套用在停留的那一組）
function applyDoodad(team, card) {
  if (!card) return;
  announceCard('doodad', card, team);
  if (card.recurring) {
    team.expenses.other += card.amount;
    addFeed(`${card.emoji} ${team.name}：${card.name}（每月支出 +${card.amount}）`);
    emitEvent(team, { emoji: card.emoji, title: '額外支出（每月）', text: `${card.name}，每月支出增加 ${formatNT(card.amount)}` });
  } else {
    team.cash -= card.amount;
    addHistory(team, { round: state.round, type: 'expense', text: card.name, delta: -card.amount });
    addFeed(`${card.emoji} ${team.name}：${card.name}（-${card.amount}）`);
    emitEvent(team, { emoji: card.emoji, title: '額外支出', text: `${card.name}，花掉 ${formatNT(card.amount)}` });
    coverIfNegative(team);
  }
  emitTeam(team);
  broadcastTeams();
}

// 生小孩：最多 3 個，增加每月小孩支出
function haveBaby(team) {
  if ((team.children || 0) >= 3) {
    emitEvent(team, { emoji: '👶', title: '生小孩', text: '孩子已經夠多囉（上限 3 個）' });
    return;
  }
  team.children += 1;
  addFeed(`👶 ${team.name} 生了一個小孩（每月支出 +${team.perChild}）`);
  emitEvent(team, { emoji: '👶', title: '恭喜生小孩', text: `第 ${team.children} 個小孩，每月支出增加 ${formatNT(team.perChild)}` });
  emitTeam(team);
  broadcastTeams();
}

// 失業：付一個月總支出 + 下回合輪空，並使慈善失效
function downsize(team) {
  const d = computeDerived(team);
  team.cash -= d.totalExpense;
  team.skipTurns += 1;
  team.charityTurns = 0;
  addHistory(team, { round: state.round, type: 'expense', text: '失業（付一個月支出）', delta: -d.totalExpense });
  addFeed(`💼 ${team.name} 失業了！付一個月支出 ${formatNT(d.totalExpense)}，下回合輪空`);
  emitEvent(team, { emoji: '💼', title: '失業', text: `付一個月總支出 ${formatNT(d.totalExpense)}，下回合輪空一次` });
  coverIfNegative(team);
  emitTeam(team);
  broadcastTeams();
}

function formatNT(n) {
  return '$' + Math.round(n || 0).toLocaleString('en-US');
}

// ── 機會卡互動：選牌庫 → 抽卡 → 買或放棄 ──

// 玩家選擇小生意 / 大買賣 → 抽一張機會卡
export function chooseDeck(teamId, deck) {
  const team = getTeam(teamId);
  if (!team || team.pendingAction?.type !== 'opportunity') return { ok: false, reason: '目前沒有機會可抽' };
  if (deck !== 'small' && deck !== 'big') return { ok: false, reason: '請選擇小生意或大買賣' };
  const card = drawCard(deck);
  team.pendingAction = { type: 'deal', deck, card };
  announceCard(deck, card, team);
  emitTeam(team);
  return { ok: true, card };
}

// 玩家決定買或放棄機會卡
export function dealDecision(teamId, accept) {
  const team = getTeam(teamId);
  if (!team || team.pendingAction?.type !== 'deal') return { ok: false, reason: '目前沒有可決定的機會卡' };
  const card = team.pendingAction.card;
  team.pendingAction = null;

  if (!accept) {
    addFeed(`${team.name} 放棄了 ${card.emoji} ${card.name}`);
    emitTeam(team);
    broadcastTeams();
    if (currentTurnId() === team.id) advanceTurn();
    return { ok: true, bought: false };
  }

  if (team.cash < card.cost) {
    // 買不起 → 退回機會卡讓玩家重新決定（回合尚未結束）
    team.pendingAction = { type: 'deal', deck: card.deck, card };
    emitTeam(team);
    return { ok: false, reason: '存款不足，買不起這筆' };
  }

  team.cash -= card.cost;
  const uid = nextUid();
  const dealValue = card.fullValue ?? card.cost;
  // 機會卡的股票/加密對標到代表性商品，讓它也隨價格浮動
  const instId = resolveInstrumentId(card.category, card.tags || [], card.id);
  let dealUnits = null, dealBasis = null;
  if (instId) {
    dealUnits = dealValue / state.market.instruments[instId].price;
  } else if (card.category === 'realestate') {
    dealBasis = dealValue; // 房地產隨房地產指數浮動
  }
  team.assets.push({
    uid,
    marketId: card.id,
    name: card.name,
    emoji: card.emoji,
    category: card.category,
    tags: card.tags || [],
    instrumentId: instId,
    units: dealUnits,
    location: card.location || null,
    roomType: card.roomType || null,
    qty: 1,
    value: dealValue,
    costBasis: dealBasis,
    totalCost: card.cost,
    buyValue: dealValue,
    monthlyIncome: card.monthlyIncome || 0,
  });
  if (card.mortgage) {
    team.assetLiabilities.push({
      uid: nextUid(),
      name: `${card.name} 貸款`,
      emoji: '🏦',
      balance: card.mortgage,
      linkedAssetUid: uid,
    });
  }
  addHistory(team, { round: state.round, type: 'buy', text: `機會：買入 ${card.emoji} ${card.name}`, delta: -card.cost });
  addFeed(`${team.name} 把握機會買了 ${card.emoji} ${card.name}`);
  checkFreedom(team);
  emitTeam(team);
  broadcastTeams();
  if (currentTurnId() === team.id) advanceTurn();
  return { ok: true, bought: true };
}

// 慈善決定：捐 10% 總收入 → 接下來 3 回合可擲兩顆骰
export function charityDecision(teamId, donate) {
  const team = getTeam(teamId);
  if (!team || team.pendingAction?.type !== 'charity') return { ok: false, reason: '目前沒有慈善可選' };
  const cost = team.pendingAction.cost;
  team.pendingAction = null;

  if (donate) {
    if (team.cash < cost) {
      team.pendingAction = { type: 'charity', cost };
      emitTeam(team);
      return { ok: false, reason: '存款不足，捐不起' };
    }
    team.cash -= cost;
    team.charityTurns = 3;
    addHistory(team, { round: state.round, type: 'expense', text: '慈善捐款', delta: -cost });
    addFeed(`❤️ ${team.name} 做了慈善（捐 ${formatNT(cost)}），接下來 3 回合可擲兩顆骰！`);
    emitTeam(team);
    broadcastTeams();
    if (currentTurnId() === team.id) advanceTurn();
    return { ok: true, donated: true };
  }
  emitTeam(team);
  if (currentTurnId() === team.id) advanceTurn();
  return { ok: true, donated: false };
}

// ── 買賣資產 ──

// 買入資產；options 依商品類型帶 qty（股數）或 amount（基金金額）
export function buyAsset(teamId, { marketId, qty, amount } = {}) {
  if (state.phase !== 'running') {
    return { ok: false, reason: '目前不是操作時間' };
  }
  const team = getTeam(teamId);
  if (!team) return { ok: false, reason: '找不到組別' };
  const item = getMarketItem(marketId);
  if (!item) return { ok: false, reason: '查無此投資商品' };

  const instId = resolveInstrumentId(item.category, item.tags || [], marketId);
  const instPrice = instId ? state.market.instruments[instId].price : null;
  let cost, value, costBasis = null, units = null, income, q = 1;

  if (item.kind === 'shares') {
    q = Math.floor(Number(qty) || 0);
    if (q < 1) return { ok: false, reason: '股數需至少 1 股' };
    // 現價＝該股目前股價，買貴買便宜看當下
    cost = Math.round(instPrice) * q;
    value = cost;
    units = q; // 持有股數
    income = (q * (item.dividendPerYear || 0)) / 12; // 股利
  } else if (item.kind === 'amount') {
    const amt = Math.floor(Number(amount) || 0);
    if (amt < 1000) return { ok: false, reason: '投入金額需至少 1,000' };
    cost = amt;
    value = amt;
    if (instId) units = amt / instPrice; // 加密：依現價換算持有單位，之後隨價格浮動
    // 加密貨幣無現金流；利息類（定存/債券）才有月配息
    income = item.category === 'crypto' ? 0 : (amt * (item.annualRate || 0)) / 12;
  } else {
    // fixed（房地產 / 企業）：頭期款固定，房產帳面價值隨房地產指數浮動
    cost = item.price;
    const full = item.fullValue ?? item.price;
    if (item.category === 'realestate') {
      value = Math.round(full * state.market.realestate.index / 100);
      costBasis = full;
    } else {
      value = full;
    }
    income = item.monthlyIncome || 0;
  }

  if (team.cash < cost) {
    return { ok: false, reason: '存款不足' };
  }

  team.cash -= cost;

  // 可分割商品（股票/ETF/加密/定存）→ 同商品合併成一筆，方便整合與部分賣出
  const fungible = item.kind === 'shares' || item.kind === 'amount';
  const existing = fungible ? team.assets.find((a) => a.marketId === marketId) : null;
  if (existing) {
    existing.qty += q;
    if (existing.units != null && units != null) existing.units += units;
    existing.value += value;
    existing.totalCost = (existing.totalCost || existing.buyValue || 0) + cost;
    existing.monthlyIncome += Math.round(income);
  } else {
    const uid = nextUid();
    team.assets.push({
      uid,
      marketId,
      name: item.name,
      emoji: item.emoji,
      category: item.category, // interest｜dividend｜realestate｜business｜crypto
      tags: item.tags || [],
      instrumentId: instId, // 對應的浮動商品（股票/加密）
      units, // 持有單位（股數或加密單位）
      location: item.location || null, // 房地產地點（士林/天母）
      roomType: item.roomType || null, // 房地產房型
      qty: q,
      value,
      costBasis,
      totalCost: cost, // 累計投入成本（算盈虧用）
      buyValue: value,
      monthlyIncome: Math.round(income),
    });
  }
  const uid = existing ? existing.uid : team.assets[team.assets.length - 1].uid;

  // 房地產：產生連動房貸（計入負債）
  if (item.mortgage) {
    team.assetLiabilities.push({
      uid: nextUid(),
      name: `${item.name} 房貸`,
      emoji: '🏦',
      balance: item.mortgage,
      linkedAssetUid: uid,
    });
  }

  addHistory(team, {
    round: state.round,
    type: 'buy',
    text: `買入 ${item.emoji} ${item.name}${item.kind === 'shares' ? ` ×${q}` : ''}`,
    delta: -cost,
  });
  addFeed(`${team.name} 買了 ${item.emoji} ${item.name}`);
  checkFreedom(team);
  emitTeam(team);
  broadcastTeams();
  return { ok: true };
}

// ── 銀行貸款 / 還款 ──

// 借錢：以萬元為單位，每月利息為貸款餘額的 10%（計入總支出）
export function loanMoney(teamId, amount) {
  if (state.phase !== 'running') return { ok: false, reason: '目前不是操作時間' };
  const team = getTeam(teamId);
  if (!team) return { ok: false, reason: '找不到組別' };
  amount = Math.floor(Number(amount) || 0);
  if (amount < 10000 || amount % 10000 !== 0) {
    return { ok: false, reason: '貸款金額需為 10,000 的倍數' };
  }
  team.personalLiabilities.bankLoan += amount;
  team.cash += amount;
  addHistory(team, { round: state.round, type: 'loan', text: `銀行貸款 +${formatNT(amount)}`, delta: amount });
  addFeed(`💳 ${team.name} 向銀行貸款 ${formatNT(amount)}`);
  emitTeam(team);
  broadcastTeams();
  return { ok: true };
}

// 還款：減少銀行貸款餘額（不能超過現金或餘額）
export function repayLoan(teamId, amount) {
  if (state.phase !== 'running') return { ok: false, reason: '目前不是操作時間' };
  const team = getTeam(teamId);
  if (!team) return { ok: false, reason: '找不到組別' };
  amount = Math.floor(Number(amount) || 0);
  const bal = team.personalLiabilities.bankLoan || 0;
  if (bal <= 0) return { ok: false, reason: '目前沒有銀行貸款' };
  if (amount <= 0) return { ok: false, reason: '金額需大於 0' };
  amount = Math.min(amount, bal);
  if (team.cash < amount) return { ok: false, reason: '現金不足以還這麼多' };
  team.cash -= amount;
  team.personalLiabilities.bankLoan -= amount;
  addHistory(team, { round: state.round, type: 'repay', text: `還銀行貸款 -${formatNT(amount)}`, delta: -amount });
  addFeed(`✅ ${team.name} 還了銀行貸款 ${formatNT(amount)}`);
  emitTeam(team);
  broadcastTeams();
  return { ok: true };
}

// 賣出持有資產。payload：
//   { uid }            整筆賣出（房地產/企業等不可分割）
//   { uid, sellQty }   賣出指定股數（股票/ETF）
//   { uid, sellAmount } 賣出指定金額（加密貨幣，依現價換算單位）
export function sellAsset(teamId, payload = {}) {
  if (state.phase !== 'running') {
    return { ok: false, reason: '目前不是操作時間' };
  }
  const team = getTeam(teamId);
  if (!team) return { ok: false, reason: '找不到組別' };
  const uid = typeof payload === 'string' ? payload : payload.uid;
  const idx = (team.assets || []).findIndex((a) => a.uid === uid);
  if (idx < 0) return { ok: false, reason: '找不到該資產' };

  const asset = team.assets[idx];
  const sellQty = Number(payload.sellQty) || 0;
  const sellAmount = Number(payload.sellAmount) || 0;

  // 可分割商品的部分賣出（股票依股數、加密依金額）
  const isShares = asset.category === 'dividend' && asset.units != null;
  const isCrypto = asset.category === 'crypto' && asset.units != null;
  if ((isShares && sellQty > 0) || (isCrypto && sellAmount > 0)) {
    let unitsToSell;
    if (isShares) {
      unitsToSell = Math.min(Math.floor(sellQty), asset.qty);
      if (unitsToSell < 1) return { ok: false, reason: '賣出股數需至少 1' };
    } else {
      const price = state.market.instruments[asset.instrumentId]?.price || 1;
      unitsToSell = Math.min(sellAmount / price, asset.units);
      if (unitsToSell <= 0) return { ok: false, reason: '賣出金額無效' };
    }
    const frac = unitsToSell / asset.units;
    const proceeds = Math.round(asset.value * frac);
    // 按比例縮減該筆持有
    asset.units -= unitsToSell;
    asset.qty = isShares ? asset.qty - unitsToSell : asset.qty;
    asset.value = Math.max(0, Math.round(asset.value * (1 - frac)));
    asset.totalCost = Math.round((asset.totalCost || 0) * (1 - frac));
    asset.monthlyIncome = Math.round(asset.monthlyIncome * (1 - frac));
    team.cash += proceeds;
    // 幾乎賣光就移除整筆
    if (asset.units < 1e-6 || asset.value <= 0) team.assets.splice(idx, 1);
    addHistory(team, { round: state.round, type: 'sell', text: `賣出 ${asset.emoji} ${asset.name}${isShares ? ` ×${unitsToSell}` : ''}`, delta: proceeds });
    addFeed(`${team.name} 賣出 ${asset.emoji} ${asset.name}`);
    emitTeam(team);
    broadcastTeams();
    return { ok: true, proceeds };
  }

  // 整筆賣出（房地產/企業/定存，或未指定數量）
  let proceeds = asset.value;
  const li = team.assetLiabilities.findIndex((l) => l.linkedAssetUid === uid);
  if (li >= 0) {
    proceeds -= team.assetLiabilities[li].balance;
    team.assetLiabilities.splice(li, 1);
  }
  team.cash += proceeds;
  team.assets.splice(idx, 1);
  addHistory(team, { round: state.round, type: 'sell', text: `賣出 ${asset.emoji} ${asset.name}`, delta: proceeds });
  addFeed(`${team.name} 賣出 ${asset.emoji} ${asset.name}`);
  emitTeam(team);
  broadcastTeams();
  return { ok: true, proceeds };
}
