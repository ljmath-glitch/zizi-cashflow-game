// 遊戲狀態與回合控制（單一場遊戲，伺服器端唯一真實來源）
// 模組 2：回合制 + 計時 + 老師控制（開始/暫停/下一回合/重置/調參）
// 模組 3：各組登入 + 抽職業卡 + 財務資料
// 模組 4：買賣資產 + 每回合發薪/被動收入結算 + 即時動態
import { PROFESSIONS, randomProfession, getProfession } from './data/professions.js';
import { MARKET, getMarketItem, INSTRUMENT_VOL } from './data/assets.js';
import { BOARD } from './data/board.js';
import { drawCard } from './data/cards.js';
import { pickEvent, randomRumor } from './data/events.js';
import { saveToFile } from './storage.js';

// 多房間：每個房間是一個獨立的遊戲（用房號隔開），同一伺服器可同時開很多場
let io = null;
const rooms = new Map(); // code -> room

export function initGame(ioInstance) {
  io = ioInstance;
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆字
  let c;
  do {
    c = '';
    for (let i = 0; i < 5; i++) c += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(c));
  return c;
}

export function createRoom() {
  const code = genCode();
  rooms.set(code, makeRoom(code));
  return code;
}

export function getRoom(code) {
  return code ? rooms.get(String(code).toUpperCase()) || null : null;
}

export function roomExists(code) {
  return !!getRoom(code);
}

// 難度設定（老師開局前選）：影響起始存款、機會卡現金流、額外支出
// startCash＝起始存款倍率；dealIncome＝機會卡月現金流倍率；doodad＝額外支出卡金額倍率
export const DIFFICULTY = {
  easy: { label: '輕鬆', emoji: '🌱', startCash: 2, dealIncome: 1.5, doodad: 0.7, desc: '起始存款×2、機會卡現金流×1.5、額外支出7折' },
  normal: { label: '標準', emoji: '⚖️', startCash: 1, dealIncome: 1, doodad: 1, desc: '原汁原味的現金流挑戰' },
  hard: { label: '挑戰', emoji: '🔥', startCash: 1, dealIncome: 0.8, doodad: 1.3, desc: '機會卡現金流8折、額外支出×1.3，高手限定' },
};

// ── 單一房間的完整遊戲邏輯 ──
function makeRoom(code) {

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
  monthlyEvent: null, // 本回合市場事件
  lastCatId: null, // 上一個災難型大事件 id（避免連續災難）
  pendingRumor: null, // 待兌現的股市情報
  showTutorial: false, // 大螢幕是否顯示新手教學
  spotlightTeamId: null, // 老師投影到大螢幕教學的組別（平常不公開）
  difficulty: 'normal', // 難度（easy｜normal｜hard），老師在大廳選
};

// 目前難度的參數（永遠回傳有效設定）
function diffCfg() {
  return DIFFICULTY[state.difficulty] || DIFFICULTY.normal;
}

// 市場初始化：每支股票/ETF/加密貨幣各自一條價格序列；房地產用分類指數
function freshMarket() {
  const instruments = {};
  for (const item of MARKET) {
    if (item.category === 'dividend' || item.category === 'crypto' || item.category === 'commodity') {
      // 加密以 100 為名目價（當作指數）；股票/ETF/原物料以牌價為起點
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
    spotlight: state.spotlightTeamId ? getTeamPayload(state.spotlightTeamId) : null, // 老師投影的組別完整財務
    difficulty: state.difficulty, // 本場難度
  };
}

// ── 大螢幕「買賣直播」：把玩家抽機會卡 → 思考 → 決定的過程即時投到大螢幕 ──
// payload：{ stage: 'choosing'｜'deciding'｜'decided', ... }；傳 null 清除
function broadcastDealLive(payload) {
  if (io) io.to(code).emit('deal:live', payload);
}

// 直播用的組別摘要（帶現金，讓全班看得到他買不買得起）
function dealTeamRef(team) {
  return {
    teamId: team.id,
    teamName: team.name,
    professionName: team.professionName,
    professionEmoji: team.professionEmoji,
    cash: team.cash,
  };
}

// 老師開關大螢幕新手教學
function toggleTutorial(on) {
  state.showTutorial = typeof on === 'boolean' ? on : !state.showTutorial;
  broadcast();
}

// 老師把某組財務投到大螢幕（再點同一組或傳 null 取消）
function setSpotlight(teamId) {
  state.spotlightTeamId = teamId && getTeam(teamId) && state.spotlightTeamId !== teamId ? teamId : null;
  broadcast();
}

// 換下一組擲骰
function advanceTurn() {
  state.currentTurnIndex += 1;
  broadcast();
}

function getPublicState() {
  return publicState();
}

// 廣播最新狀態給所有連線（大螢幕、學生、老師）
function broadcast() {
  if (io) io.to(code).emit('game:state', publicState());
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

// 進入新回合：跑市場事件、清旗標（發薪改由骰子經過「發薪日」格才結算）
function enterNewRound(roundNumber) {
  state.round = roundNumber;
  state.timeLeft = state.roundSeconds;
  state.currentTurnIndex = 0; // 從第一組重新開始輪
  broadcastDealLive(null); // 上回合沒做完的買賣直播收掉
  applyMonthlyEvent(); // 跑市場事件，更新市場指數與資產價值
  for (const team of Object.values(state.teams)) {
    if (team.bankrupt) continue; // 已淘汰跳過
    team.hasRolledThisRound = false;
    team.pendingAction = null; // 上一回合沒處理的機會/慈善視為放棄
    emitTeam(team);
  }
  // 重建輪流順序，排除已破產的組（保留加入順序）
  state.turnOrder = state.turnOrder.filter((id) => state.teams[id] && !state.teams[id].bankrupt);
  state.currentTurnIndex = 0;
  broadcastTeams();
}

// 每回合開場：抽事件（多為小事件、偶爾大事件），更新每支商品價格與房地產指數
function applyMonthlyEvent() {
  const evt = pickEvent(state.lastCatId);
  state.lastCatId = evt.catastrophe ? evt.id : null; // 記錄災難，避免連續
  const prevEvent = state.monthlyEvent;
  const before = {};
  for (const id in state.market.instruments) before[id] = state.market.instruments[id].price;
  const reBefore = state.market.realestate.index;

  state.monthlyEvent = { ...evt, round: state.round };

  // 情報兌現：上回合釋出的情報有 55% 機率成真，化為額外偏移
  let rumorBias = null;
  if (state.pendingRumor) {
    const r = state.pendingRumor;
    state.pendingRumor = null;
    if (Math.random() < 0.55) rumorBias = { sector: r.sector, factor: r.dir === 'up' ? 1.08 : 0.92 };
  }

  // 逐支商品浮動
  for (const id in state.market.instruments) {
    const inst = state.market.instruments[id];
    const cat = inst.category; // dividend / crypto / commodity
    const sectorKey = cat === 'dividend' ? 'stock' : cat; // 事件 effects 的鍵
    const m = INSTRUMENT_VOL[cat] || INSTRUMENT_VOL.dividend;
    const isEtf = (inst.tags || []).includes('etf'); // ETF＝一籃子，波動約個股一半
    const damp = isEtf ? 0.5 : 1; // ETF 減半係數

    let factor;
    if (cat === 'crypto') {
      // 加密：每回合 ±5~50%，約 3% 機率極端 ±50~150%
      const extreme = Math.random() < 0.03;
      const mag = extreme ? 0.5 + Math.random() * 1.0 : 0.05 + Math.random() * 0.45;
      factor = 1 + (Math.random() < 0.5 ? -1 : 1) * mag;
    } else if (cat === 'dividend') {
      // 股票：平常小幅；個股小機率(8%)出現較大震盪（最多約±18%），ETF 機率與幅度減半
      factor = 1 + m.drift + (Math.random() * 2 - 1) * m.vol * damp;
      const shockChance = isEtf ? 0.04 : 0.08;
      if (Math.random() < shockChance) {
        const shock = (0.06 + Math.random() * 0.1) * (Math.random() < 0.5 ? -1 : 1) * damp;
        factor += shock;
      }
    } else {
      // 原物料：趨勢偏移 + 中幅隨機
      factor = 1 + m.drift + (Math.random() * 2 - 1) * m.vol;
    }

    // 事件乘數（AI/生技題材對對應事件更敏感；ETF 對整體股市事件的反應減半）
    let eff = evt.effects?.[sectorKey] ?? 1;
    if (eff !== 1) {
      if (evt.aiBoost && (inst.tags || []).includes('ai')) eff = 1 + (eff - 1) * evt.aiBoost;
      if (evt.bioBoost && (inst.tags || []).includes('biotech')) eff = 1 + (eff - 1) * evt.bioBoost;
      if (cat === 'dividend' && isEtf) eff = 1 + (eff - 1) * 0.5;
    }
    factor *= eff;
    if (rumorBias && sectorKey === rumorBias.sector) {
      let rb = rumorBias.factor;
      if (cat === 'dividend' && isEtf) rb = 1 + (rb - 1) * 0.5;
      factor *= rb;
    }

    // 單回合漲跌上限：ETF 約股票一半（±5%），個股 ±18%，原物料 ±25%，加密 ±150%
    let cap = m.cap;
    if (cat === 'dividend') cap = isEtf ? 0.05 : 0.18;
    factor = Math.max(1 - cap, Math.min(1 + cap, factor));
    inst.price = Math.max(1, Math.round(inst.price * factor));
    inst.history.push(inst.price);
    if (inst.history.length > 40) inst.history.shift();
  }

  // 房地產指數（小幅、長期略偏多，最多單回合 ±20%）
  {
    let factor = 1 + 0.004 + (Math.random() * 2 - 1) * 0.03;
    factor *= evt.effects?.realestate ?? 1;
    if (rumorBias && rumorBias.sector === 'realestate') factor *= rumorBias.factor;
    factor = Math.max(0.85, Math.min(1.2, factor));
    const re = state.market.realestate;
    re.index = Math.max(5, Math.round(re.index * factor));
    re.history.push(re.index);
    if (re.history.length > 40) re.history.shift();
  }

  for (const team of Object.values(state.teams)) recomputeAssetValues(team);

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
    commodity: avgMove((i) => i.category === 'commodity'),
    realestate: reBefore ? Math.round(((state.market.realestate.index - reBefore) / reBefore) * 100) : 0,
  };

  addFeed(`${evt.emoji} ${evt.scale === 'big' ? '【大事件】' : ''}${evt.title}（${evt.desc || ''}）`);

  // 釋出新情報（約 25% 機率），暗示下回合可能行情
  let rumor = null;
  if (Math.random() < 0.25) {
    rumor = randomRumor();
    state.pendingRumor = rumor;
    addFeed(`🔍 股市情報：${rumor.text}`);
  }

  if (io) {
    io.to(code).emit('market:monthly', { event: state.monthlyEvent, market: publicMarket(), before, reBefore });
    io.to(code).emit('month:report', {
      round: state.round,
      prevEvent: prevEvent ? { emoji: prevEvent.emoji, title: prevEvent.title } : null,
      thisEvent: { emoji: evt.emoji, title: evt.title, desc: evt.desc || '' },
      moves,
      scale: evt.scale,
      rumor,
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
function startGame() {
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

function pauseGame() {
  if (state.phase === 'running') {
    state.phase = 'paused';
    broadcast();
    scheduleAutosave();
  }
}

// 老師跳過目前這組的擲骰回合（該組離線/拖太久時用）
function skipTurn() {
  if (state.phase !== 'running') return;
  const team = getTeam(currentTurnId());
  if (team) {
    team.hasRolledThisRound = true;
    team.pendingAction = null;
    broadcastDealLive(null); // 若他卡在買賣直播，順便收掉
    addFeed(`⏭️ 老師跳過了 ${team.name} 的回合`);
    emitTeam(team);
  }
  advanceTurn();
}

// 進入下一回合；超過總回合數則結束遊戲
function nextRound() {
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

function resetGame() {
  stopTick();
  state.phase = 'lobby';
  state.round = 0;
  state.timeLeft = 0;
  state.market = freshMarket(); // 市場指數歸 100
  state.monthlyEvent = null;
  broadcastDealLive(null);
  // 重置各組財務回到起始狀態（保留組別與職業），等同重新開始整場
  for (const team of Object.values(state.teams)) {
    resetTeamFinances(team);
    emitTeam(team);
  }
  feed.length = 0;
  if (io) io.to(code).emit('feed:list', feed);
  broadcast();
  broadcastTeams();
}

// 全新遊戲：清空所有組別與動態，回到最初的空白狀態（換班 / 重新測驗用）
function clearGame() {
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
  broadcastDealLive(null);
  broadcast();
  broadcastTeams(); // 連帶觸發自動存檔，讓 autosave.json 也變空白
  if (io) io.to(code).emit('feed:list', feed);
}

// ── 組別 / 財務 ──

// 依職業把某組財務還原到起始狀態
function resetTeamFinances(team) {
  const prof = getProfession(team.professionId);
  if (!prof) return;
  team.cash = Math.round(prof.savings * diffCfg().startCash); // 起始存款依難度加成
  team.salary = prof.salary;
  team.baseSalary = prof.salary; // 景氣連動職業的基準薪（餐廳/廚師用）
  team.incomeFollowsMarket = !!prof.incomeFollowsMarket; // 收入隨景氣起伏
  team.layoffImmune = !!prof.layoffImmune; // 鐵飯碗：免失業
  team.expenses = { ...prof.expenses }; // 各項月支出（稅金/房貸/車貸/學貸/卡債/額外）
  team.perChild = prof.perChild;
  team.children = 0;
  team.personalLiabilities = { ...prof.liabilities, bankLoan: 0, loanShark: 0 }; // 各項負債餘額（loanShark 已停用、保留為 0 相容舊存檔）
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
  team.bankrupt = false; // 是否已破產淘汰
  team.bankruptRound = null;
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
function professionPublic(prof) {
  const savings = Math.round(prof.savings * diffCfg().startCash); // 顯示時就帶入難度加成
  return {
    id: prof.id,
    name: prof.name,
    emoji: prof.emoji,
    salary: prof.salary,
    variableIncome: prof.variableIncome || null,
    expenseTotal: profExpenseTotal(prof),
    cashflowStart: prof.salary - profExpenseTotal(prof),
    savings,
    liabilitiesTotal: profLiabTotal(prof), // 起始負債總額
    netWorthStart: savings - profLiabTotal(prof),
    hasHouse: (prof.liabilities.homeMortgage || 0) > 0, // 是否有自住房（有房貸＝有房）
    freedomThreshold: profExpenseTotal(prof), // 被動收入需達此值才財富自由
    perk: prof.perk,
  };
}

// 隨機抽兩張不同職業卡，給玩家二選一
function professionPair() {
  const pool = [...PROFESSIONS];
  const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
  const b = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
  return [professionPublic(a), professionPublic(b)];
}

// 角色頭像合法值（與前端 src/components/Avatar.jsx 對應；存前先過濾，避免亂值）
const AVATAR_TYPE_IDS = ['mouse', 'cat', 'bear', 'bunny', 'frog', 'robot'];
const AVATAR_COLOR_IDS = ['gold', 'rose', 'sky', 'mint', 'violet', 'orange', 'slate', 'cream'];
function sanitizeAvatar(a) {
  const type = a && AVATAR_TYPE_IDS.includes(a.type) ? a.type : 'mouse';
  const color = a && AVATAR_COLOR_IDS.includes(a.color) ? a.color : 'gold';
  return { type, color };
}

// 學生加入：建立組別。professionId 有給且有效就用，否則隨機。avatar 為自選角色。
function createTeam(name, professionId, avatar) {
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
    avatar: sanitizeAvatar(avatar), // 自選角色 { type, color }
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

function getTeam(teamId) {
  return state.teams[teamId] || null;
}

// 給學生端的完整資料（含衍生欄位）；用於 join / resume 回傳
function getTeamPayload(teamId) {
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

// 每月銀行貸款月付：餘額 × 月息。抵押貸款(房產連動)不計息、也不能還，只在賣出時清償。
const BANK_RATE = 0.10; // 一般銀行貸款月息（好算；已取消高利貸）
// 現金貸款額度上限：銀行最多借你「月薪 × 此倍數」（含尚未還清的舊貸款）。
// 貼近現實——銀行依收入決定可貸額度，收入越高能借越多。
const LOAN_SALARY_MULTIPLE = 10;
// 直接變現折價：房地產/企業這類「不易脫手」的資產，自己賣只拿回帳面價的 75%（折價 25%）。
// 想拿好價錢就等「收購卡」🤝（那條走原價/溢價、不折價）。股票/ETF/加密/定存屬流動資產，照市價賣、不折價。
const LIQUIDATION_KEEP = 0.75;
const ILLIQUID_CATS = ['realestate', 'business'];
function bankLoanPayment(team) {
  const l = team.personalLiabilities || {};
  return Math.round((l.bankLoan || 0) * BANK_RATE);
}

// 現金貸款上限：以「基準月薪 × LOAN_SALARY_MULTIPLE」計（用 baseSalary 避免浮動職業忽高忽低）。
function loanLimitFor(team) {
  const baseSalary = team.baseSalary || team.salary || 0;
  return baseSalary * LOAN_SALARY_MULTIPLE;
}
// 目前還能再借的額度（上限扣掉已欠的銀行貸款，不會小於 0）。
function loanRoomFor(team) {
  const current = (team.personalLiabilities && team.personalLiabilities.bankLoan) || 0;
  return Math.max(0, loanLimitFor(team) - current);
}

// 總支出 = 各項月支出 + 小孩支出×人數 + 銀行貸款月付（抵押貸款不計息）
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
    (l.creditCard || 0) + (l.bankLoan || 0) + (l.loanShark || 0);
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
    free: passive.total >= totalExpense, // 非工資收入 ≥ 總支出 → 財富自由
    loanLimit: loanLimitFor(team), // 現金貸款總額上限（月薪 × 倍數）
    loanRoom: loanRoomFor(team), // 目前還能再借多少
  };
}

function netWorth(team) {
  return computeDerived(team).netWorth;
}

// 對外公開的組別摘要（大螢幕「組別總覽」/ 老師端用）
// 只放摘要欄位（現金、薪水、現金流等）；持有資產明細由老師「投影」細項（getTeamPayload）呈現。
function publicTeam(team) {
  const d = computeDerived(team);
  return {
    id: team.id,
    name: team.name,
    professionName: team.professionName,
    professionEmoji: team.professionEmoji,
    avatar: team.avatar || { type: 'mouse', color: 'gold' }, // 自選角色（舊存檔給預設）
    netWorth: d.netWorth,
    cash: team.cash, // 目前現金
    salary: team.salary, // 本月薪水
    passiveIncome: d.passiveTotal,
    passive: d.passive,
    income: d.totalIncome,
    expense: d.totalExpense,
    cashflow: d.cashflow,
    assetsValue: d.assetsValue,
    liabilitiesTotal: d.liabilitiesTotal,
    bankLoan: (team.personalLiabilities && team.personalLiabilities.bankLoan) || 0,
    loanLimit: d.loanLimit,
    loanRoom: d.loanRoom,
    children: team.children || 0,
    assetCount: (team.assets || []).length, // 持有資產筆數（明細在投影看）
    free: team.free, // 以鎖定的旗標為準（達成後即使數字變動仍維持）
    freedRound: team.freedRound || null,
    bankrupt: !!team.bankrupt, // 是否破產淘汰
    position: team.position || 0, // 老鼠賽跑圈上的格子
    hasRolled: !!team.hasRolledThisRound, // 本回合是否已擲骰
  };
}

function listPublicTeams() {
  return Object.values(state.teams).map(publicTeam);
}

function broadcastTeams() {
  if (io) io.to(code).emit('teams:list', listPublicTeams());
  scheduleAutosave();
}

// 調整遊戲參數（總回合數、每回合秒數、難度）；建議在 lobby 階段調整
function setConfig({ maxRounds, roundSeconds, difficulty } = {}) {
  if (Number.isFinite(maxRounds) && maxRounds > 0) {
    state.maxRounds = Math.floor(maxRounds);
  }
  if (Number.isFinite(roundSeconds) && roundSeconds > 0) {
    state.roundSeconds = Math.floor(roundSeconds);
  }
  // 難度只能在大廳改（遊戲中改會讓進行中的數字混亂）
  if (difficulty && DIFFICULTY[difficulty] && difficulty !== state.difficulty && state.phase === 'lobby') {
    state.difficulty = difficulty;
    const cfg = diffCfg();
    // 已加入的組別重發起始財務，讓新的起始存款倍率生效
    for (const team of Object.values(state.teams)) {
      resetTeamFinances(team);
      emitTeam(team);
    }
    addFeed(`${cfg.emoji} 老師把難度設為「${cfg.label}」（${cfg.desc}）`);
    broadcastTeams();
  }
  broadcast();
  scheduleAutosave();
}

// ── 存檔 / 還原 ──

// 把整場遊戲狀態打包成可序列化的快照
function getSnapshot() {
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
    difficulty: state.difficulty,
    teamSeq,
    uidSeq,
    feed,
  };
}

// 從快照還原整場遊戲（載入存檔 / 伺服器重啟自動還原）
function loadSnapshot(data) {
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
  state.difficulty = DIFFICULTY[data.difficulty] ? data.difficulty : 'normal';
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
    io.to(code).emit('teams:list', listPublicTeams());
    io.to(code).emit('feed:list', feed);
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
      saveToFile('room_' + code + '.json', getSnapshot());
    } catch (e) {
      console.error('⚠️ 自動存檔失敗：', e.message);
    }
  }, 800);
}

// ── 即時動態（最新動態 feed） ──

function addFeed(text) {
  feed.unshift({ text, ts: Date.now() });
  if (feed.length > 30) feed.length = 30;
  if (io) io.to(code).emit('feed:list', feed);
}

function getFeed() {
  return feed;
}

// ── 財務計算與推播 ──

// 把單一組別的最新狀態（含衍生欄位）推給該組（同 team 房間）
function emitTeam(team) {
  if (io) io.to(code + '|team:' + team.id).emit('student:team', { ...team, derived: computeDerived(team) });
}

// 新增一筆歷史紀錄（最新在前，最多 50 筆）
function addHistory(team, entry) {
  team.history.unshift({ ...entry, ts: Date.now() });
  if (team.history.length > 50) team.history.length = 50;
}

// 檢查是否達成財富自由（非工資收入 ≥ 總支出），首次達成時推播動態
function checkFreedom(team) {
  const d = computeDerived(team);
  if (d.free && !team.free) {
    team.free = true;
    team.freedRound = state.round;
    addFeed(`🎉🏆 ${team.name} 達成財富自由！`);
    if (io) io.to(code).emit('game:freed', { teamId: team.id, name: team.name });
  }
}

// ── 發薪結算（擲骰經過「發薪」格時觸發） ──

function settleTeam(team) {
  if (team.bankrupt) return; // 已淘汰不再結算
  // 浮動收入職業（YouTuber/電商/業務）每月於範圍內重抽（取整到千）
  if (team.variableIncome) {
    const [lo, hi] = team.variableIncome;
    team.salary = Math.round((lo + Math.random() * (hi - lo)) / 1000) * 1000;
  } else if (team.incomeFollowsMarket) {
    // 餐廳/廚師：收入隨「本回合市場景氣」起伏（以股市效果當景氣代理），另加生意小波動
    const stockEff = state.monthlyEvent?.effects?.stock ?? 1;
    const macro = Math.max(0.7, Math.min(1.3, 1 + (stockEff - 1) * 2));
    const noise = 0.92 + Math.random() * 0.16; // ±8% 生意波動
    team.salary = Math.round(((team.baseSalary || team.salary) * macro * noise) / 1000) * 1000;
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
  checkBankruptOrCover(team); // 判定破產淘汰 / 暫時周轉
  checkFreedom(team);
  emitTeam(team);
}

// 整筆變現一項資產：房地產/企業折價(LIQUIDATION_KEEP)，75% 變現先還抵押貸款，現金入帳。
// 不夠還抵押貸款 → 歸零（不會欠債，等於失去這個房產契約）。回傳 { proceeds, illiquid, grossValue }。
function liquidateAsset(team, idx) {
  const asset = team.assets[idx];
  const illiquid = ILLIQUID_CATS.includes(asset.category);
  // 房地產/企業折價變現；股票/加密/定存等流動資產照市價
  const keep = illiquid ? LIQUIDATION_KEEP : 1;
  let saleValue = Math.round(asset.value * keep);
  const li = team.assetLiabilities.findIndex((l) => l.linkedAssetUid === asset.uid);
  if (li >= 0) {
    saleValue -= team.assetLiabilities[li].balance; // 變現先還抵押貸款
    team.assetLiabilities.splice(li, 1);
  }
  saleValue = Math.max(0, saleValue); // 不夠還抵押貸→歸零，不欠債（失去房產契約）
  team.cash += saleValue;
  team.assets.splice(idx, 1);
  return { asset, proceeds: saleValue, illiquid, grossValue: asset.value };
}

// 現金 ≤ 0（破產危機）時的處理——依規則「先清倉所有資產自救，全賣光仍補不回來才淘汰」：
//  1. 手上還有資產 → 直接清倉（全部變賣：房產/企業折價、清掉抵押貸款），現金入帳。
//  2. 清倉後現金 > 0 → 保住、不淘汰（但資產與被動收入歸零，得重新靠薪水翻身）。
//  3. 沒有資產可賣、或全部賣光仍為負（資不抵債）→ 真正淘汰。
function checkBankruptOrCover(team) {
  if (team.bankrupt || team.cash > 0) return;
  const shortfall = -team.cash;
  let totalProceeds = 0;
  if ((team.assets || []).length > 0) {
    // 由後往前賣，避免 splice 影響索引；清倉全部資產
    for (let i = team.assets.length - 1; i >= 0; i--) {
      const { proceeds } = liquidateAsset(team, i);
      totalProceeds += proceeds;
    }
    addHistory(team, { round: state.round, type: 'liquidate', text: '破產危機：清倉所有資產自救', delta: totalProceeds });
    addFeed(`🆘 ${team.name} 現金見底（缺 ${formatNT(shortfall)}），清倉所有資產變現 ${formatNT(totalProceeds)} 自救`);
  }
  if (team.cash > 0) {
    // 清倉後現金轉正 → 撐住、不淘汰
    emitEvent(team, {
      emoji: '🆘',
      title: '清倉自救成功！資產全部變賣',
      text: `現金見底，系統已把你所有資產變賣（共 ${formatNT(totalProceeds)}）換回現金保住沒淘汰。但資產歸零、被動收入沒了——快重新靠薪水投資翻身！`,
    });
    emitTeam(team);
    return;
  }
  // 沒有資產可賣、或全部賣光仍補不回來 → 資不抵債，淘汰
  bankruptTeam(team);
}

// 破產淘汰：標記、移出擲骰輪流、廣播動畫
function bankruptTeam(team) {
  if (team.bankrupt) return;
  team.bankrupt = true;
  team.bankruptRound = state.round;
  state.turnOrder = state.turnOrder.filter((id) => id !== team.id);
  if (state.currentTurnIndex >= state.turnOrder.length) {
    state.currentTurnIndex = state.turnOrder.length; // 維持「已輪完」狀態
  }
  addFeed(`💀 ${team.name} 破產被淘汰！`);
  if (io) io.to(code).emit('game:bankrupt', { teamId: team.id, name: team.name, professionEmoji: team.professionEmoji });
  emitTeam(team);
}

// ── 擲骰 / 移動 ──

// 某組擲骰並沿老鼠賽跑圈移動；經過/停在「發薪」格會收月現金流
function rollDice(teamId) {
  if (state.phase !== 'running') return { ok: false, reason: '現在不是操作時間' };
  const team = getTeam(teamId);
  if (!team) return { ok: false, reason: '找不到組別' };
  if (team.bankrupt) return { ok: false, reason: '已破產淘汰' };
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

  // 沿途「經過或停在」發薪日格 → 每經過一次就結算一個月現金流（過了一個月）
  let paydays = 0;
  for (let s = 1; s <= steps; s++) {
    const idx = (from + s) % BOARD.length;
    if (BOARD[idx].type === 'payday') {
      settleTeam(team); // 收當月現金流（薪水＋被動−支出），可能觸發破產
      paydays += 1;
      if (team.bankrupt) break;
    }
  }

  addFeed(`🎲 ${team.name} 擲出 ${rolls.join('+')}＝${steps}，停在 ${square.emoji}${square.label}${paydays ? `（領了 ${paydays} 次薪水）` : ''}`);
  if (io) io.to(code).emit('board:move', {
    teamId, from, to, steps, rolls, square: square.type, paydays,
    teamName: team.name, professionEmoji: team.professionEmoji,
    squareEmoji: square.emoji, squareLabel: square.label,
  });

  // 破產則結束此回合（已被移出輪流）
  if (team.bankrupt) {
    emitTeam(team);
    broadcastTeams();
    return { ok: true, rolls, steps, from, to, square: square.type, paydays, bankrupt: true };
  }

  // 觸發停留格子的事件（停在發薪格本身不重複結算，移動時已算過）
  if (square.type !== 'payday') resolveSquare(team, square.type);

  checkFreedom(team);
  emitTeam(team);
  broadcastTeams();

  // 若沒有待處理的互動（機會抽卡 / 慈善），這組的回合就結束，換下一組
  if (!team.pendingAction) advanceTurn();

  return { ok: true, rolls, steps, from, to, square: square.type, paydays };
}

// ── 格子事件處理 ──

// 推一則「事件通知」給某組（學生端跳出提示）
function emitEvent(team, payload) {
  if (io) io.to(code + '|team:' + team.id).emit('student:event', payload);
}

// 廣播抽到的卡（大螢幕翻牌動畫用），帶上是哪一組、什麼職業骰到的
function announceCard(deck, card, team) {
  if (io)
    io.to(code).emit('card:drawn', {
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
        // 收購要約直接進入「考慮中」直播（大螢幕看得到開價與淨入）
        broadcastDealLive({
          stage: 'deciding',
          deck: 'acquire',
          card: offer.card,
          offer: { offerPrice: offer.offerPrice, net: offer.net, gainPct: offer.gainPct, buyer: offer.buyer },
          team: dealTeamRef(team),
        });
      } else {
        team.pendingAction = { type: 'opportunity' };
        // 大螢幕直播：他停在機會格，正在選小生意還是大買賣
        broadcastDealLive({ stage: 'choosing', team: dealTeamRef(team) });
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
        const matchCat = card.targetCategory && inst.category === card.targetCategory;
        const matchTag = card.targetTag && inst.tags.includes(card.targetTag);
        if (matchCat || matchTag) {
          // ETF 對整體股市風雲卡的反應約個股一半
          let f = card.factor;
          if (inst.category === 'dividend' && (inst.tags || []).includes('etf')) f = 1 + (f - 1) * 0.5;
          inst.price = Math.max(1, Math.round(inst.price * f));
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
    if (io) io.to(code).emit('market:monthly', { event: state.monthlyEvent, market: publicMarket() });
    addFeed(`${card.emoji} 市場風雲：${card.name}（${card.desc}）`);
  } else if (card.kind === 'windfall') {
    for (const team of Object.values(state.teams)) {
      team.cash += card.amount;
      addHistory(team, { round: state.round, type: card.amount >= 0 ? 'income' : 'expense', text: card.name, delta: card.amount });
      if (card.amount < 0) checkBankruptOrCover(team);
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
  // 開價依該房的售價範圍（priceLow~priceHigh）抽出，低機率偏向高端（重劃/搶手）
  let offerPrice;
  if (asset.priceLow && asset.priceHigh) {
    const lo = asset.priceLow, hi = asset.priceHigh;
    // 12% 機率偏高端（後 1/3），其餘落在全區間
    const r = Math.random() < 0.12 ? 0.67 + Math.random() * 0.33 : Math.random();
    offerPrice = Math.round(lo + (hi - lo) * r);
  } else {
    // 無範圍資料（舊資料）退回用現值加溢價
    const premium = Math.random() < 0.12 ? 0.5 + Math.random() * 0.3 : 0.1 + Math.random() * 0.2;
    offerPrice = Math.round(asset.value * (1 + premium));
  }
  // 賣出淨額 = 開價 − 抵押貸款（不夠則歸零，不欠債）
  const mortgage = asset.mortgageAmt || 0;
  const net = Math.max(0, offerPrice - mortgage);
  const buyer = BUYERS[Math.floor(Math.random() * BUYERS.length)];
  const where = [asset.location, asset.roomType].filter(Boolean).join(' ');
  // 相對「投入頭期」的報酬率
  const gainPct = asset.totalCost ? Math.round(((net - asset.totalCost) / asset.totalCost) * 100) : 0;
  return {
    type: 'acquire',
    assetUid: asset.uid,
    offerPrice,
    net,
    gainPct,
    buyer,
    card: {
      emoji: '🤝',
      name: `${buyer}想收購你的${asset.roomType || '房產'}`,
      desc: `${where}　開價 ${formatNT(offerPrice)}（清貸款後淨入 ${formatNT(net)}）`,
    },
  };
}

// 玩家決定是否賣出被收購的房產
function acquireDecision(teamId, accept) {
  const team = getTeam(teamId);
  if (!team || team.pendingAction?.type !== 'acquire') return { ok: false, reason: '目前沒有收購要約' };
  const { assetUid, offerPrice, net, gainPct, buyer, card: offerCard } = team.pendingAction;
  team.pendingAction = null;

  const idx = (team.assets || []).findIndex((a) => a.uid === assetUid);
  if (idx < 0) {
    // 房產已不在（理論上不會發生），直接換人
    broadcastDealLive(null);
    if (currentTurnId() === team.id) advanceTurn();
    return { ok: false, reason: '找不到該房產' };
  }
  const asset = team.assets[idx];

  if (accept) {
    let proceeds = offerPrice;
    // 清償抵押貸款
    const li = team.assetLiabilities.findIndex((l) => l.linkedAssetUid === assetUid);
    if (li >= 0) {
      proceeds -= team.assetLiabilities[li].balance;
      team.assetLiabilities.splice(li, 1);
    }
    proceeds = Math.max(0, proceeds); // 不夠還抵押貸→歸零，不欠債
    team.cash += proceeds;
    team.assets.splice(idx, 1);
    addHistory(team, { round: state.round, type: 'sell', text: `被收購：${asset.emoji} ${asset.name}`, delta: proceeds });
    addFeed(`🤝 ${team.name} 以 ${formatNT(offerPrice)} 賣出 ${asset.roomType || '房產'}（淨入 ${formatNT(proceeds)}）`);
    emitEvent(team, { emoji: '🤝', title: '成交！', text: `賣出 ${asset.name}，扣房貸後淨入帳 ${formatNT(proceeds)}` });
    broadcastDealLive({
      stage: 'decided', deck: 'acquire', card: offerCard, accept: true,
      offer: { offerPrice, net: proceeds, gainPct, buyer }, team: dealTeamRef(team),
    });
  } else {
    addFeed(`${team.name} 婉拒了 ${asset.roomType || '房產'} 的收購`);
    broadcastDealLive({
      stage: 'decided', deck: 'acquire', card: offerCard, accept: false,
      offer: { offerPrice, net, gainPct, buyer }, team: dealTeamRef(team),
    });
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
  // 依難度調整支出金額（複製一份再改，取整到百位）
  const mult = diffCfg().doodad;
  if (mult !== 1) card = { ...card, amount: Math.round((card.amount * mult) / 100) * 100 };
  // 連動條件：沒出租房 / 沒小孩 就不會發生這筆支出
  if (card.requires === 'realestate' && !(team.assets || []).some((a) => a.category === 'realestate')) {
    addFeed(`😅 ${team.name} 抽到「${card.name}」，但沒有出租房，免了`);
    emitEvent(team, { emoji: '😅', title: '虛驚一場', text: `${card.name}：你沒有出租房，這筆支出免了！` });
    return;
  }
  if (card.requires === 'child' && (team.children || 0) === 0) {
    addFeed(`😅 ${team.name} 抽到「${card.name}」，但還沒有小孩，免了`);
    emitEvent(team, { emoji: '😅', title: '虛驚一場', text: `${card.name}：你還沒有小孩，這筆支出免了！` });
    return;
  }
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
    checkBankruptOrCover(team);
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
  // 鐵飯碗職業（警察/公務員）免於失業
  if (team.layoffImmune) {
    addFeed(`🛡️ ${team.name} 是鐵飯碗，免於這次裁員`);
    emitEvent(team, { emoji: '🛡️', title: '鐵飯碗，免裁員', text: '你的工作非常穩定，這次裁員與你無關！' });
    emitTeam(team);
    return;
  }
  const d = computeDerived(team);
  team.cash -= d.totalExpense;
  team.skipTurns += 1;
  team.charityTurns = 0;
  addHistory(team, { round: state.round, type: 'expense', text: '失業（付一個月支出）', delta: -d.totalExpense });
  addFeed(`💼 ${team.name} 失業了！付一個月支出 ${formatNT(d.totalExpense)}，下回合輪空`);
  emitEvent(team, { emoji: '💼', title: '失業', text: `付一個月總支出 ${formatNT(d.totalExpense)}，下回合輪空一次` });
  checkBankruptOrCover(team);
  emitTeam(team);
  broadcastTeams();
}

function formatNT(n) {
  return '$' + Math.round(n || 0).toLocaleString('en-US');
}

// ── 機會卡互動：選牌庫 → 抽卡 → 買或放棄 ──

// 依難度調整機會卡（複製一份再改，不能動到原牌庫）：月現金流乘上倍率、取整到百位
// 只調「正」的現金流——負現金流的養房卡是刻意設計的風險，不因難度放大虧損
function adjustDealCard(card) {
  const mult = diffCfg().dealIncome;
  if (!card || mult === 1 || !(card.monthlyIncome > 0)) return card;
  return { ...card, monthlyIncome: Math.max(100, Math.round((card.monthlyIncome * mult) / 100) * 100) };
}

// 玩家選擇小生意 / 大買賣 → 抽一張機會卡
function chooseDeck(teamId, deck) {
  const team = getTeam(teamId);
  if (!team || team.pendingAction?.type !== 'opportunity') return { ok: false, reason: '目前沒有機會可抽' };
  if (deck !== 'small' && deck !== 'big') return { ok: false, reason: '請選擇小生意或大買賣' };
  const card = adjustDealCard(drawCard(deck));
  team.pendingAction = { type: 'deal', deck, card };
  // 大螢幕直播：完整卡面（含頭期/貸款/現金流/售價範圍），全班一起看他怎麼選
  broadcastDealLive({ stage: 'deciding', deck, card, team: dealTeamRef(team) });
  emitTeam(team);
  return { ok: true, card };
}

// 玩家決定買或放棄機會卡。withLoan=true 時，現金不足會自動貸款補足再購買
function dealDecision(teamId, accept, withLoan = false) {
  const team = getTeam(teamId);
  if (!team || team.pendingAction?.type !== 'deal') return { ok: false, reason: '目前沒有可決定的機會卡' };
  const card = team.pendingAction.card;
  const deck = team.pendingAction.deck;
  team.pendingAction = null;

  if (!accept) {
    addFeed(`${team.name} 放棄了 ${card.emoji} ${card.name}`);
    broadcastDealLive({ stage: 'decided', deck, card, accept: false, team: dealTeamRef(team) });
    emitTeam(team);
    broadcastTeams();
    if (currentTurnId() === team.id) advanceTurn();
    return { ok: true, bought: false };
  }

  let loanAmount = 0; // 貸款補頭期的金額（大螢幕直播用）
  if (team.cash < card.cost) {
    if (withLoan) {
      // 頭期不夠 → 向銀行借差額（月息 10%，湊整到萬元）補頭期
      const need = Math.ceil((card.cost - team.cash) / 10000) * 10000;
      loanAmount = need;
      team.personalLiabilities.bankLoan = (team.personalLiabilities.bankLoan || 0) + need;
      team.cash += need;
      addHistory(team, { round: state.round, type: 'loan', text: `銀行貸款補頭期 ${card.name}`, delta: need });
      addFeed(`💳 ${team.name} 向銀行借 ${formatNT(need)}（月息10%）補頭期買下 ${card.emoji} ${card.name}`);
    } else {
      // 買不起 → 退回機會卡讓玩家重新決定（回合尚未結束）
      team.pendingAction = { type: 'deal', deck, card };
      emitTeam(team);
      return { ok: false, reason: '存款不足，買不起這筆' };
    }
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
    priceLow: card.priceLow || null, // 房地產售價範圍（收購/賣出用）
    priceHigh: card.priceHigh || null,
    mortgageAmt: card.mortgage || 0, // 記錄原始貸款（賣出計算淨額）
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
      name: `${card.name} 抵押貸款`,
      emoji: '🏦',
      balance: card.mortgage,
      linkedAssetUid: uid,
    });
  }
  addHistory(team, { round: state.round, type: 'buy', text: `機會：買入 ${card.emoji} ${card.name}`, delta: -card.cost });
  addFeed(`${team.name} 把握機會買了 ${card.emoji} ${card.name}`);
  broadcastDealLive({ stage: 'decided', deck, card, accept: true, loanAmount, team: dealTeamRef(team) });
  checkFreedom(team);
  emitTeam(team);
  broadcastTeams();
  if (currentTurnId() === team.id) advanceTurn();
  return { ok: true, bought: true };
}

// 慈善決定：捐 10% 總收入 → 接下來 3 回合可擲兩顆骰
function charityDecision(teamId, donate) {
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
function buyAsset(teamId, { marketId, qty, amount } = {}) {
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
    if (amt < 100) return { ok: false, reason: '投入金額需至少 100' };
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
function loanMoney(teamId, amount) {
  if (state.phase !== 'running') return { ok: false, reason: '目前不是操作時間' };
  const team = getTeam(teamId);
  if (!team) return { ok: false, reason: '找不到組別' };
  amount = Math.floor(Number(amount) || 0);
  if (amount < 10000 || amount % 10000 !== 0) {
    return { ok: false, reason: '貸款金額需為 10,000 的倍數' };
  }
  // 額度上限：銀行依月薪決定可貸總額（含未還清的舊貸款）
  const room = loanRoomFor(team);
  if (amount > room) {
    const limit = loanLimitFor(team);
    return {
      ok: false,
      reason: room <= 0
        ? `已達貸款上限（月薪 ${LOAN_SALARY_MULTIPLE} 倍＝${formatNT(limit)}），請先還款再借`
        : `超過貸款額度：上限為月薪 ${LOAN_SALARY_MULTIPLE} 倍（${formatNT(limit)}），目前最多再借 ${formatNT(room)}`,
    };
  }
  team.personalLiabilities.bankLoan += amount;
  team.cash += amount;
  addHistory(team, { round: state.round, type: 'loan', text: `銀行貸款 +${formatNT(amount)}`, delta: amount });
  addFeed(`💳 ${team.name} 向銀行貸款 ${formatNT(amount)}`);
  emitTeam(team);
  broadcastTeams();
  return { ok: true };
}

// 還款：償還銀行貸款（不能超過現金或餘額）
function repayLoan(teamId, amount) {
  if (state.phase !== 'running') return { ok: false, reason: '目前不是操作時間' };
  const team = getTeam(teamId);
  if (!team) return { ok: false, reason: '找不到組別' };
  amount = Math.floor(Number(amount) || 0);
  const l = team.personalLiabilities;
  const bal = (l.bankLoan || 0);
  if (bal <= 0) return { ok: false, reason: '目前沒有銀行貸款' };
  if (amount <= 0) return { ok: false, reason: '金額需大於 0' };
  amount = Math.min(amount, bal);
  if (team.cash < amount) return { ok: false, reason: '現金不足以還這麼多' };
  team.cash -= amount;
  l.bankLoan = (l.bankLoan || 0) - amount;
  addHistory(team, { round: state.round, type: 'repay', text: `還貸款 -${formatNT(amount)}`, delta: -amount });
  addFeed(`✅ ${team.name} 還了貸款 ${formatNT(amount)}`);
  emitTeam(team);
  broadcastTeams();
  return { ok: true };
}

// 償還起始職業負債（自住房貸/車貸/學貸/卡債）：可分批，月付按比例同步降低
const DEBT_LABELS = { homeMortgage: '自住房貸', carLoan: '車貸', schoolLoan: '學貸', creditCard: '卡債' };
function repayDebt(teamId, key, amount) {
  if (state.phase !== 'running') return { ok: false, reason: '目前不是操作時間' };
  const team = getTeam(teamId);
  if (!team) return { ok: false, reason: '找不到組別' };
  if (!DEBT_LABELS[key]) return { ok: false, reason: '無法償還此項' };
  const bal = team.personalLiabilities[key] || 0;
  if (bal <= 0) return { ok: false, reason: '這筆已經沒有欠款' };
  // amount 未給或超過餘額 → 視為全部付清
  let pay = Math.floor(Number(amount) || 0);
  if (pay <= 0 || pay > bal) pay = bal;
  if (team.cash < pay) return { ok: false, reason: `現金不足（需 ${formatNT(pay)}）` };

  const payment = team.expenses[key] || 0;
  const newBal = bal - pay;
  // 月付按剩餘比例縮減（付清則歸零）
  const newPayment = newBal > 0 ? Math.round(payment * (newBal / bal)) : 0;
  const saved = payment - newPayment;
  team.cash -= pay;
  team.personalLiabilities[key] = newBal;
  team.expenses[key] = newPayment;
  addHistory(team, { round: state.round, type: 'repay', text: `還${DEBT_LABELS[key]} -${formatNT(pay)}（每月省 ${formatNT(saved)}）`, delta: -pay });
  addFeed(`✅ ${team.name} 還了${DEBT_LABELS[key]} ${formatNT(pay)}${newBal === 0 ? '（已付清）' : ''}，每月省 ${formatNT(saved)}`);
  emitTeam(team);
  broadcastTeams();
  return { ok: true, saved, cleared: newBal === 0 };
}

// 賣出持有資產。payload：
//   { uid }            整筆賣出（房地產/企業等不可分割）
//   { uid, sellQty }   賣出指定股數（股票/ETF）
//   { uid, sellAmount } 賣出指定金額（加密貨幣，依現價換算單位）
function sellAsset(teamId, payload = {}) {
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

  // 整筆賣出（房地產/企業會折價變現；流動資產照市價）
  const { asset: soldAsset, proceeds, illiquid, grossValue } = liquidateAsset(team, idx);
  addHistory(team, { round: state.round, type: 'sell', text: `賣出 ${soldAsset.emoji} ${soldAsset.name}`, delta: proceeds });
  addFeed(`${team.name} 賣出 ${soldAsset.emoji} ${soldAsset.name}${illiquid ? '（折價變現）' : ''}`);
  emitTeam(team);
  broadcastTeams();
  return { ok: true, proceeds, illiquid, grossValue };
}


  return { getPublicState, startGame, pauseGame, skipTurn, nextRound, resetGame, clearGame, toggleTutorial, setSpotlight, professionPair, createTeam, getTeam, getTeamPayload, listPublicTeams, broadcastTeams, setConfig, getSnapshot, loadSnapshot, getFeed, rollDice, acquireDecision, chooseDeck, dealDecision, charityDecision, buyAsset, loanMoney, repayLoan, repayDebt, sellAsset, netWorth, publicTeam };
}
