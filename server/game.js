// 遊戲狀態與回合控制（單一場遊戲，伺服器端唯一真實來源）
// 模組 2：回合制 + 計時 + 老師控制（開始/暫停/下一回合/重置/調參）
// 模組 3：各組登入 + 抽職業卡 + 財務資料
// 模組 4：買賣資產 + 每回合發薪/被動收入結算 + 即時動態
import { PROFESSIONS, randomProfession, getProfession } from './data/professions.js';
import { activeMarket, marketFor, getMarketItem, INSTRUMENT_VOL } from './data/assets.js';
import { getAchievement, starsOf } from './data/achievements.js';
import { BOARD, boardFor } from './data/board.js';
import { drawCard, INSURANCE, COVER_RATE, insuranceByCover } from './data/cards.js';
import { pickEvent, randomRumor } from './data/events.js';
import { saveToFile } from './storage.js';

// 多房間：每個房間是一個獨立的遊戲（用房號隔開），同一伺服器可同時開很多場
let io = null;
const rooms = new Map(); // code -> room

export function initGame(ioInstance) {
  io = ioInstance;
}

// ── 房間持久化（撐過伺服器重啟／重新部署）──
// 課務系統會傳入 Postgres 版 store（存 DB，重啟不會清）；未設則各房間退回存本機檔（本機開發用）。
let persistStore = null;
export function setPersistStore(s) { persistStore = s; }

// 伺服器啟動時，把持久化後端裡的房間全部還原回記憶體（含進行中的遊戲、隊伍、回合、計時）
export async function restoreRooms() {
  if (!persistStore || !persistStore.loadAllRooms) return 0;
  let n = 0;
  try {
    const saved = await persistStore.loadAllRooms(); // 期望 [{ code, data }]
    for (const { code, data } of saved || []) {
      const c = String(code || '').toUpperCase();
      if (!c || !data || rooms.has(c)) continue;
      const room = makeRoom(c);
      rooms.set(c, room);
      try { room.loadSnapshot(data); n += 1; } catch (e) { console.error('⚠️ 還原房間失敗', c, e.message); }
    }
  } catch (e) {
    console.error('⚠️ 讀取房間清單失敗：', e.message);
  }
  return n;
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

// 已淘汰舊「難度（輕鬆/標準/挑戰）」，改為三階分級（初階/中階/高階），難易直接內含在各階。

// 起手現金：所有職業統一（比較公平），15 萬讓開場就買得起一個中型資產、及早啟動被動收入。難度倍率(startCash)仍適用。
// 取代各職業原本高低不一的 savings（savings 保留在資料裡但不再決定起手現金）。
const START_CASH = 150000;

// 遊戲階段：初階（給國中生第一次玩，只教核心現金流）／完整（全部機制）
// 三階分級（取代舊難度）：每階自帶難易倍率（startCash/dealIncome/doodad）＋機制開關。
//   board：'basic' 精簡盤面｜'full' 完整盤面
//   market：'basic' 定存+2ETF｜'mid' 股票/黃金(無加密)｜'full' 全部
//   events 市場事件/月初報告、loan 貸款、acquire 收購/都更、achievements 人生成就、superDeal 超級生意
export const STAGES = {
  basic: { label: '初階', emoji: '🟢', startCash: 2, dealIncome: 2.0, doodad: 0.7,
    board: 'basic', market: 'basic', events: true, loan: false, acquire: false, achievements: false, superDeal: false,
    desc: '核心觀念：買資產養被動收入→財富自由。極簡報表、只有定存+ETF、輕量事件（趣味＋ETF小漲跌，無貸款/失業/成就）（最寬鬆）' },
  mid: { label: '中階', emoji: '🟡', startCash: 1.5, dealIncome: 1.5, doodad: 1,
    board: 'full', market: 'mid', events: true, loan: true, acquire: true, achievements: true, superDeal: false,
    desc: '加入市場漲跌、貸款、失業、慈善、房產收購、人生成就；市場含股票/黃金（無加密貨幣）' },
  full: { label: '高階', emoji: '🔴', startCash: 1, dealIncome: 1.3, doodad: 1.3,
    board: 'full', market: 'full', events: true, loan: true, acquire: true, achievements: true, superDeal: true, insurance: true,
    desc: '全部機制：加密貨幣、超級生意、黑天鵝、保險…最完整也最有挑戰' },
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
  gameSeconds: 3600, // 遊戲總時長秒數（預設 60 分鐘，老師可調）；整場倒數，歸零自動結算
  timeLeft: 0, // 本回合剩餘秒數
  teams: {}, // 各組資料（模組 3 起填入）
  turnOrder: [], // 擲骰輪流順序（依加入順序的 teamId）
  currentTurnIndex: 0, // 目前輪到第幾位（指向 turnOrder）
  market: freshMarket(), // 三大類市場指數（會浮動）
  monthlyEvent: null, // 本回合市場事件
  lastCatId: null, // 上一個災難型大事件 id（避免連續災難）
  roundsSinceBig: 0, // 已連續幾回合沒出大事件（保底機制用，避免整場都沒大事件）
  pendingRumor: null, // 待兌現的股市情報
  showTutorial: false, // 大螢幕是否顯示新手教學
  spotlightTeamId: null, // 老師投影到大螢幕教學的組別（平常不公開）
  spotlightTab: 'finance', // 投影手機鏡像目前分頁（finance/market/assets/history）
  spotlightScroll: 0, // 投影手機鏡像的捲動步數（老師端上下捲）
  stage: 'basic', // 分級：basic 初階｜mid 中階｜full 高階（老師在大廳選；預設初階給第一次玩）
};

// 目前分級的參數與開關（永遠回傳有效設定）
function stageCfg() {
  return STAGES[state.stage] || STAGES.full;
}

// 市場初始化：每支股票/ETF/加密貨幣各自一條價格序列；房地產用分類指數
// stage='basic' 時只建初階市場（定存＋兩支 ETF）；ETF 在初階不跑波動、只配息
function freshMarket(stage) {
  const instruments = {};
  for (const item of marketFor(stage || 'full')) {
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
    gameSeconds: state.gameSeconds,
    timeLeft: state.timeLeft,
    currentTurnId: currentTurnId(), // 目前輪到擲骰的組別
    turnIndex: state.currentTurnIndex,
    turnTotal: state.turnOrder.length,
    market: state.market, // 三大類市場指數＋歷史（畫走勢圖）
    monthlyEvent: state.monthlyEvent, // 本月大事件
    showTutorial: state.showTutorial, // 大螢幕教學開關
    spotlight: state.spotlightTeamId ? getTeamPayload(state.spotlightTeamId) : null, // 老師投影的組別完整財務
    spotlightTab: state.spotlightTab, // 手機鏡像分頁
    spotlightScroll: state.spotlightScroll, // 手機鏡像捲動步數
    stage: state.stage, // 分級（basic 初階｜mid 中階｜full 高階）
    board: boardFor(state.stage), // 依階段的盤面（前端直接用，不必再打 /api/board）
    marketCatalog: marketFor(state.stage), // 依階段的市場可買清單（初階只有定存＋2 ETF）
    insuranceCatalog: stageCfg().insurance ? INSURANCE : [], // 高階才有保險
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

// 老師把某組手機畫面鏡像到大螢幕（再點同一組或傳 null 取消）；切組時重置分頁與捲動
function setSpotlight(teamId) {
  state.spotlightTeamId = teamId && getTeam(teamId) && state.spotlightTeamId !== teamId ? teamId : null;
  state.spotlightTab = 'finance';
  state.spotlightScroll = 0;
  broadcast();
}

// 老師端導覽投影中的手機鏡像：切分頁 / 上下捲動（scroll 為步數，不小於 0）
function navSpotlight({ tab, scroll } = {}) {
  if (!state.spotlightTeamId) return;
  const TABS = ['finance', 'market', 'assets', 'history'];
  if (tab && TABS.includes(tab)) {
    state.spotlightTab = tab;
    state.spotlightScroll = 0; // 換分頁回到最上面
  }
  if (typeof scroll === 'number') {
    state.spotlightScroll = Math.max(0, Math.round(scroll));
  }
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

// 每秒倒數計時器（整場遊戲的總時長）
function startTick() {
  stopTick();
  tickInterval = setInterval(() => {
    if (state.phase !== 'running') return; // 暫停時不倒數
    if (state.timeLeft > 0) {
      state.timeLeft -= 1;
      if (state.timeLeft <= 0) {
        endGame('⏰ 時間到，遊戲結束！'); // 遊戲總時長歸零 → 自動結算
      } else {
        broadcast();
      }
    }
  }, 1000);
}

// 結束整場遊戲（時間到 / 回合到 / 老師手動）：進入結算
function endGame(reason) {
  state.phase = 'ended';
  state.timeLeft = 0;
  stopTick();
  addFeed(reason || '🏁 遊戲結束！');
  broadcast();
  scheduleAutosave();
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
  // 不再每回合重置倒數：timeLeft 是「整場遊戲」的總倒數，只在開新局時設定（見 startGame）
  state.currentTurnIndex = 0; // 從第一組重新開始輪
  broadcastDealLive(null); // 上回合沒做完的買賣直播收掉
  if (stageCfg().events) applyMonthlyEvent(); // 初階不跑市場事件/月初報告（保持單純）
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
  // 保底：連續 BIG_EVENT_PITY 回合沒出大事件，本回合強制來一個大事件（不讓整場靜悄悄）
  const BIG_EVENT_PITY = 4;
  const forceBig = (state.roundsSinceBig || 0) >= BIG_EVENT_PITY;
  const evt = pickEvent(state.lastCatId, forceBig, state.stage);
  state.lastCatId = evt.catastrophe ? evt.id : null; // 記錄災難，避免連續
  state.roundsSinceBig = evt.scale === 'big' ? 0 : (state.roundsSinceBig || 0) + 1;
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

  // 共同「搞笑賺賠」：事件帶 cashRange（隨機）或 cash（固定）時，符合條件的組現金一次性 +/−
  // professions 有設＝只影響這些職業（不寫＝全體）；emitTeam 由 enterNewRound 收尾推播
  let cashAmt = 0;
  if (evt.cashRange) {
    const [lo, hi] = evt.cashRange;
    cashAmt = Math.round((lo + Math.random() * (hi - lo)) / 500) * 500; // 取整到 500
  } else if (evt.cash) {
    cashAmt = evt.cash;
  }
  const cashProfs = evt.professions || null; // null＝全體
  const cashScope = cashProfs ? (evt.professionLabel || '部分職業') : '全班每組';
  if (cashAmt) {
    let affected = 0;
    for (const team of Object.values(state.teams)) {
      if (team.bankrupt) continue;
      if (cashProfs && !cashProfs.includes(team.professionId)) continue; // 職業別事件：不符合就跳過
      team.cash += cashAmt;
      affected += 1;
    }
    addFeed(`${cashAmt > 0 ? '💰' : '💸'} ${evt.title}：${cashScope} ${cashAmt > 0 ? '+' : '−'}${Math.abs(cashAmt).toLocaleString()}${cashProfs ? `（影響 ${affected} 組）` : ''}`);
  }

  // 釋出新情報（約 25% 機率），暗示下回合可能行情（初階不放情報，保持單純）
  let rumor = null;
  if (state.stage !== 'basic' && Math.random() < 0.25) {
    rumor = randomRumor();
    state.pendingRumor = rumor;
    addFeed(`🔍 股市情報：${rumor.text}`);
  }

  if (io) {
    io.to(code).emit('market:monthly', { event: state.monthlyEvent, market: publicMarket(), before, reBefore });
    io.to(code).emit('month:report', {
      round: state.round,
      prevEvent: prevEvent ? { emoji: prevEvent.emoji, title: prevEvent.title } : null,
      thisEvent: { emoji: evt.emoji, title: evt.title, desc: evt.desc || '', fx: evt.fx || null },
      moves,
      scale: evt.scale,
      cash: cashAmt, // 共同賺賠金額（0＝無；已解析 cashRange 隨機值）
      cashScope, // 受影響族群顯示字串（全班每組 / 職業族群名）
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
    // 開新局：設定整場總倒數、進入第 1 回合並結算第一次發薪
    state.phase = 'running';
    state.timeLeft = state.gameSeconds; // 整場總時長，從這裡開始倒數
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
    endGame('🏁 回合數到，遊戲結束！');
    return;
  }
  state.phase = 'running';
  enterNewRound(state.round + 1); // 回合 +1 並結算發薪（不重置總倒數）
  startTick();
  broadcast();
}

function resetGame() {
  stopTick();
  state.phase = 'lobby';
  state.round = 0;
  state.timeLeft = 0;
  state.market = freshMarket(state.stage); // 市場指數歸 100（依階段）
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
  team.cash = Math.round(START_CASH * stageCfg().startCash); // 起手現金統一，依難度加成
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
  team.skipTurns = 0; // （保留相容；失業已改為「發薪日沒薪水」不再輪空）
  team.missPaydays = 0; // 失業：接下來幾個發薪日領不到薪水
  team.position = 0; // 在老鼠賽跑圈上的格子（0–23）
  team.hasRolledThisRound = false; // 本回合是否已擲骰
  team.pendingAction = null; // 待處理的互動事件（機會抽卡 / 慈善）
  team.history = [];
  team.free = false;
  team.freedRound = null;
  team.achievements = []; // 已完成的人生成就 id（財富自由後才能追求）
  team.currentGoalId = null; // 目前選定要達成的成就 id
  team.achievementUpkeep = 0; // 成就帶來的每月額外開銷加總（如夢想之家管理費）
  team.insured = {}; // 已投保的險種 { medical:true, property:true, auto:true }（高階）
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
  const savings = Math.round(START_CASH * stageCfg().startCash); // 起手現金統一（顯示帶入難度加成）
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

// 角色合法值（與前端 src/components/Avatar.jsx 對應；存前先過濾，避免亂值）
// 臉部自訂（服裝改由職業決定，不再存 outfit 色）
const HAIR_IDS = ['short', 'bob', 'long', 'wavy', 'twin', 'ponytail', 'bun', 'braid', 'spiky', 'buzz'];
const HAIRCOLOR_IDS = ['brown', 'black', 'blonde', 'ginger', 'silver', 'pink', 'blue', 'mintH'];
const ACC_IDS = ['none', 'glasses', 'bow', 'flower'];
const DEFAULT_AVATAR = { hair: 'short', hairColor: 'brown', accessory: 'none' };
function sanitizeAvatar(a) {
  a = a || {};
  return {
    hair: HAIR_IDS.includes(a.hair) ? a.hair : 'short',
    hairColor: HAIRCOLOR_IDS.includes(a.hairColor) ? a.hairColor : 'brown',
    accessory: ACC_IDS.includes(a.accessory) ? a.accessory : 'none',
  };
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
  return base + (team.perChild || 0) * (team.children || 0) + bankLoanPayment(team) + (team.achievementUpkeep || 0) + insurancePremium(team);
}

// 每月保費總額（已投保的險種保費加總）
function insurancePremium(team) {
  const ins = team.insured || {};
  return INSURANCE.reduce((s, i) => s + (ins[i.cover] ? i.premium : 0), 0);
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

  // 人生成就：已完成星數＋目前目標的達成條件（現金夠不夠、買了會不會破壞財富自由）
  const doneIds = team.achievements || [];
  const goalDef = team.currentGoalId ? getAchievement(team.currentGoalId) : null;
  const goal = goalDef
    ? {
        id: goalDef.id,
        name: goalDef.name,
        emoji: goalDef.emoji,
        cost: goalDef.cost,
        upkeep: goalDef.upkeep || 0,
        stars: goalDef.stars,
        story: goalDef.story,
        affordable: team.cash >= goalDef.cost, // 現金是否夠
        keepsFree: passive.total >= totalExpense + (goalDef.upkeep || 0), // 買了是否仍維持財富自由
      }
    : null;

  return {
    passive,
    passiveTotal: passive.total,
    totalIncome,
    totalExpense,
    cashflow,
    bankLoanPayment: bankLoanPayment(team),
    insurancePremium: insurancePremium(team), // 每月保費總額（高階）
    assetsValue,
    liabilitiesTotal,
    netWorth: team.cash + assetsValue - liabilitiesTotal,
    free: passive.total >= totalExpense, // 非工資收入 ≥ 總支出 → 財富自由
    loanLimit: loanLimitFor(team), // 現金貸款總額上限（月薪 × 倍數）
    loanRoom: loanRoomFor(team), // 目前還能再借多少
    achievementStars: starsOf(doneIds), // 已完成成就總星數
    achievementsDone: doneIds.map((id) => {
      const a = getAchievement(id);
      return a ? { id: a.id, name: a.name, emoji: a.emoji, stars: a.stars } : null;
    }).filter(Boolean),
    goal, // 目前選定的人生成就目標（含達成條件），沒選則 null
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
    professionId: team.professionId, // 決定服裝外型
    professionName: team.professionName,
    professionEmoji: team.professionEmoji,
    avatar: team.avatar || DEFAULT_AVATAR, // 自選臉（服裝由職業決定）
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
    achievementStars: d.achievementStars, // 已完成人生成就總星數（大螢幕排名用）
    achievementsDone: d.achievementsDone, // 已完成成就 [{emoji,name,stars}]
    currentGoal: d.goal ? { emoji: d.goal.emoji, name: d.goal.name, cost: d.goal.cost, stars: d.goal.stars } : null, // 目前追求的夢想（含價格）
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

// 調整遊戲參數（總回合數、遊戲時長、分級）；只能在 lobby 階段調整
function setConfig({ maxRounds, gameSeconds, stage } = {}) {
  if (Number.isFinite(maxRounds) && maxRounds > 0) {
    state.maxRounds = Math.floor(maxRounds);
  }
  if (Number.isFinite(gameSeconds) && gameSeconds > 0) {
    state.gameSeconds = Math.floor(gameSeconds);
  }
  // 分級（初階/中階/高階）只能在大廳改；改了要重建市場＋重置各組（各階市場與起手不同）
  if (stage && STAGES[stage] && stage !== state.stage && state.phase === 'lobby') {
    state.stage = stage;
    state.market = freshMarket(state.stage);
    state.monthlyEvent = null;
    for (const team of Object.values(state.teams)) {
      resetTeamFinances(team);
      emitTeam(team);
    }
    addFeed(`${STAGES[stage].emoji} 老師把分級設為「${STAGES[stage].label}」（${STAGES[stage].desc}）`);
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
    gameSeconds: state.gameSeconds,
    timeLeft: state.timeLeft,
    teams: state.teams,
    turnOrder: state.turnOrder,
    currentTurnIndex: state.currentTurnIndex,
    market: state.market,
    monthlyEvent: state.monthlyEvent,
    roundsSinceBig: state.roundsSinceBig,
    stage: state.stage,
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
  state.gameSeconds = data.gameSeconds ?? 3600;
  state.timeLeft = data.timeLeft ?? 0;
  state.teams = data.teams && typeof data.teams === 'object' ? data.teams : {};
  state.market = data.market && data.market.instruments ? data.market : freshMarket();
  state.monthlyEvent = data.monthlyEvent ?? null;
  state.roundsSinceBig = Number.isFinite(data.roundsSinceBig) ? data.roundsSinceBig : 0;
  state.stage = STAGES[data.stage] ? data.stage : 'basic';
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
      const snap = getSnapshot();
      if (persistStore && persistStore.saveRoom) {
        Promise.resolve(persistStore.saveRoom(code, snap)).catch((e) => console.error('⚠️ 房間自動存檔(DB)失敗：', e.message));
      } else {
        saveToFile('room_' + code + '.json', snap);
      }
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
  // 失業中：這個發薪日領不到薪水（只結算被動收入 − 總支出），扣掉一個 missPayday
  let cashflow = d.cashflow;
  let paidSalary = team.salary;
  if ((team.missPaydays || 0) > 0) {
    team.missPaydays -= 1;
    cashflow = d.cashflow - team.salary;
    paidSalary = 0;
    addFeed(`💼 ${team.name} 失業中，這個發薪日沒領到薪水（少 ${formatNT(team.salary)}）`);
  }
  team.cash += cashflow; // 月現金流入帳（可能為負）
  addHistory(team, {
    round: state.round,
    type: 'payday',
    salary: paidSalary,
    passive: d.passiveTotal,
    expense: d.totalExpense,
    delta: cashflow,
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

// 現金 ≤ 0（破產危機）時的處理——分段變現，不再一次清光：
//  1. 先賣「流動資產」（股票/ETF/黃金/加密/定存/債券），一項一項賣，現金補到 > 0 就停手，
//     盡量保留能生被動收入的「小生意/大買賣」（房地產/企業）。
//  2. 流動資產全賣光仍不夠 → 才開始賣房地產/企業（同樣一項一項，補到 > 0 就停）。
//  3. 全部資產賣光仍為負（資不抵債）→ 才真正淘汰。
function checkBankruptOrCover(team) {
  if (team.bankrupt || team.cash > 0) return;
  const shortfall = -team.cash;
  let totalProceeds = 0;
  let soldCount = 0;

  // 一項一項賣，補到現金轉正就停；優先賣流動資產，流動的賣完了才動房產/企業
  while (team.cash <= 0 && (team.assets || []).length > 0) {
    let idx = team.assets.findIndex((a) => !ILLIQUID_CATS.includes(a.category)); // 先找流動資產
    if (idx < 0) idx = team.assets.length - 1; // 流動的沒了 → 賣不動產/企業（從最後一項）
    const { proceeds } = liquidateAsset(team, idx);
    totalProceeds += proceeds;
    soldCount += 1;
  }

  if (soldCount > 0) {
    addHistory(team, { round: state.round, type: 'liquidate', text: '周轉：變賣部分資產救急', delta: totalProceeds });
    addFeed(`🆘 ${team.name} 現金見底（缺 ${formatNT(shortfall)}），變賣 ${soldCount} 項資產 ${formatNT(totalProceeds)} 周轉`);
  }

  if (team.cash > 0) {
    // 周轉成功、不淘汰
    const left = (team.assets || []).length;
    emitEvent(team, {
      emoji: '🆘',
      title: '變賣資產、成功周轉！',
      text: left > 0
        ? `現金見底，系統優先幫你賣掉股票等流動資產（共 ${formatNT(totalProceeds)}）補回現金，還保留了 ${left} 項資產（含能生被動收入的房產/事業）。快穩住財務！`
        : `現金見底，把資產全部變賣（共 ${formatNT(totalProceeds)}）才補回現金保住沒淘汰。被動收入歸零——快重新靠薪水投資翻身！`,
    });
    emitTeam(team);
    return;
  }
  // 全部資產賣光仍補不回來 → 資不抵債，淘汰
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

  const board = boardFor(state.stage); // 依階段取盤面（初階格子較單純）
  const from = team.position;
  const to = (from + steps) % board.length;
  team.position = to;
  const square = board[to];

  // 沿途「經過或停在」發薪日格 → 每經過一次就結算一個月現金流（過了一個月）
  let paydays = 0;
  for (let s = 1; s <= steps; s++) {
    const idx = (from + s) % board.length;
    if (board[idx].type === 'payday') {
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
      teamId: team.id,
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
      applyMarketCard(team, drawCard('market', marketCardRelevant));
      break;
    case 'doodad':
      applyDoodad(team, drawCard('doodad'));
      break;
    case 'bonus':
      applyBonus(team, drawCard('bonus'));
      break;
    case 'surprise':
      applySurprise(team, drawCard('surprise'));
      break;
    case 'flash':
      applyFlash(team, drawCard('flash'));
      break;
    case 'sale': {
      const item = drawCard('sale');
      if (item) team.pendingAction = { type: 'sale', item };
      break;
    }
    case 'quiz': {
      const quiz = drawCard('quiz');
      if (quiz) team.pendingAction = { type: 'quiz', quiz };
      break;
    }
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

// 市場風雲卡是否對「當前這場的市場」有感：房地產指數/現金卡一律可；漲跌卡要有對應的在架商品才抽
// （避免中階抽到「加密貨幣崩盤」但盤上根本沒加密幣＝演了沒反應）
function marketCardRelevant(card) {
  if (!card || card.kind !== 'price') return true;
  if (card.targetCategory === 'realestate') return true;
  return Object.values(state.market.instruments).some((inst) =>
    (card.targetCategory && inst.category === card.targetCategory) ||
    (card.targetTag && (inst.tags || []).includes(card.targetTag))
  );
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
  if (!stageCfg().acquire) return null; // 初階不做房產收購/都更（保持單純）
  const houses = (team.assets || []).filter((a) => a.category === 'realestate');
  if (houses.length === 0) return null;
  if (Math.random() > 0.35) return null;

  // 都更/重劃房優先被相中：一旦被收購就是等待已久的「翻盤」（持有多間時，都更房先出場）
  const renewalHouses = houses.filter((h) => h.renewal);
  const asset = renewalHouses.length
    ? renewalHouses[Math.floor(Math.random() * renewalHouses.length)]
    : houses[Math.floor(Math.random() * houses.length)];
  const isRenewal = !!asset.renewal;
  // 開價依該房的售價範圍（priceLow~priceHigh）抽出
  let offerPrice;
  if (asset.priceLow && asset.priceHigh) {
    const lo = asset.priceLow, hi = asset.priceHigh;
    // 都更/重劃房：直接走高價端（都更通過分回新屋，價值翻倍）；一般房：多為中間價、少數偏高
    const r = isRenewal
      ? 0.8 + Math.random() * 0.2
      : (Math.random() < 0.12 ? 0.67 + Math.random() * 0.33 : Math.random());
    offerPrice = Math.round(lo + (hi - lo) * r);
  } else {
    // 無範圍資料（舊資料）退回用現值加溢價
    const premium = Math.random() < 0.12 ? 0.5 + Math.random() * 0.3 : 0.1 + Math.random() * 0.2;
    offerPrice = Math.round(asset.value * (1 + premium));
  }
  // 賣出淨額 = 開價 − 抵押貸款（不夠則歸零，不欠債）
  const mortgage = asset.mortgageAmt || 0;
  const net = Math.max(0, offerPrice - mortgage);
  const buyer = isRenewal ? '都更建商' : BUYERS[Math.floor(Math.random() * BUYERS.length)];
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
      emoji: isRenewal ? '🏗️' : '🤝',
      name: isRenewal ? `你的${asset.roomType || '房子'}都更／重劃通過了！` : `${buyer}想收購你的${asset.roomType || '房產'}`,
      desc: isRenewal
        ? `${where}　${buyer}開價 ${formatNT(offerPrice)}（清貸款後淨入 ${formatNT(net)}）— 等待已久的翻盤！`
        : `${where}　開價 ${formatNT(offerPrice)}（清貸款後淨入 ${formatNT(net)}）`,
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
  const mult = stageCfg().doodad;
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
    // 保險理賠：若這是「可保的意外」且該組有投保對應險種，保險付 COVER_RATE，玩家只付自付額
    const insuredCover = card.insure && (team.insured || {})[card.insure];
    if (insuredCover) {
      const claim = Math.round(card.amount * COVER_RATE);
      const outOfPocket = card.amount - claim;
      team.cash -= outOfPocket;
      addHistory(team, { round: state.round, type: 'expense', text: `${card.name}（保險理賠 ${formatNT(claim)}）`, delta: -outOfPocket });
      addFeed(`🛡️ ${team.name}：${card.name} 由保險理賠 ${formatNT(claim)}，只付自付額 ${formatNT(outOfPocket)}`);
      emitEvent(team, { emoji: '🛡️', title: '保險理賠！', text: `${card.name}：保險付了 ${formatNT(claim)}，你只付自付額 ${formatNT(outOfPocket)}。好家在有保險！` });
    } else {
      team.cash -= card.amount;
      addHistory(team, { round: state.round, type: 'expense', text: card.name, delta: -card.amount });
      addFeed(`${card.emoji} ${team.name}：${card.name}（-${card.amount}）`);
      const noInsHint = card.insure ? '（沒保這種險，只能自己全額付…）' : '';
      emitEvent(team, { emoji: card.emoji, title: '額外支出', text: `${card.name}，花掉 ${formatNT(card.amount)}${noInsHint}` });
    }
    checkBankruptOrCover(team);
  }
  emitTeam(team);
  broadcastTeams();
}

// 好運格：抽一張好運卡，小賺一筆現金
function applyBonus(team, card) {
  if (!card) return;
  announceCard('bonus', card, team);
  team.cash += card.amount;
  addHistory(team, { round: state.round, type: 'income', text: card.name, delta: card.amount });
  addFeed(`${card.emoji} ${team.name}：好運！${card.name}（+${card.amount}）`);
  emitEvent(team, { emoji: card.emoji, title: '🍀 好運！', text: `${card.name}，進帳 ${formatNT(card.amount)}` });
  emitTeam(team);
  broadcastTeams();
}

// 依區間隨機取金額（取整到 500）
function randInRange([lo, hi]) {
  return Math.round((lo + Math.random() * (hi - lo)) / 500) * 500;
}

// 🎁 驚喜格：免費得到一個小資產（教「資產＝被動收入」）或一筆現金驚喜
function applySurprise(team, card) {
  if (!card) return;
  announceCard('surprise', card, team);
  if (card.kind === 'asset') {
    const a = card.asset;
    team.assets.push({ uid: nextUid(), marketId: null, name: a.name, emoji: a.emoji, category: a.category, tags: [], instrumentId: null, units: null, location: null, value: a.value, monthlyIncome: a.monthlyIncome });
    addHistory(team, { round: state.round, type: 'income', text: `驚喜：獲得 ${a.name}`, delta: 0 });
    addFeed(`🎁 ${team.name}：驚喜！免費獲得 ${a.emoji} ${a.name}（月收 +${a.monthlyIncome}）`);
    emitEvent(team, { emoji: '🎁', title: '🎁 驚喜！免費資產', text: `${card.story || card.name}\n免費得到「${a.name}」，每月被動收入 +${formatNT(a.monthlyIncome)}！` });
    checkFreedom(team);
  } else {
    const amt = randInRange(card.amountRange);
    team.cash += amt;
    addHistory(team, { round: state.round, type: 'income', text: card.name, delta: amt });
    addFeed(`🎁 ${team.name}：驚喜！${card.name}（+${amt}）`);
    emitEvent(team, { emoji: card.emoji, title: '🎁 驚喜！', text: `${card.story || card.name}，進帳 ${formatNT(amt)}` });
  }
  emitTeam(team);
  broadcastTeams();
}

// 📰 快訊格：個人小新聞，現金 + 或 −（金額每次隨機）
function applyFlash(team, card) {
  if (!card) return;
  announceCard('flash', card, team);
  const amt = randInRange(card.amountRange);
  team.cash += amt;
  addHistory(team, { round: state.round, type: amt >= 0 ? 'income' : 'expense', text: card.name, delta: amt });
  const sign = amt >= 0 ? '+' : '−';
  addFeed(`📰 ${team.name}：本週快訊「${card.name}」（${sign}${Math.abs(amt)}）`);
  emitEvent(team, { emoji: card.emoji, title: '📰 本週快訊', text: `${card.story || card.name}（${sign}${formatNT(Math.abs(amt))}）` });
  if (amt < 0) checkBankruptOrCover(team);
  emitTeam(team);
  broadcastTeams();
}

// 投保 / 退保（高階專屬）：切換某險種的投保狀態
function toggleInsurance(teamId, cover) {
  if (state.phase !== 'running') return { ok: false, reason: '目前不是操作時間' };
  if (!stageCfg().insurance) return { ok: false, reason: '這個階段沒有保險' };
  const team = getTeam(teamId);
  if (!team) return { ok: false, reason: '找不到組別' };
  const ins = insuranceByCover(cover);
  if (!ins) return { ok: false, reason: '查無此險種' };
  team.insured = team.insured || {};
  const on = !team.insured[cover];
  if (on) team.insured[cover] = true; else delete team.insured[cover];
  addFeed(`🛡️ ${team.name} ${on ? '投保了' : '退保了'} ${ins.name}（每月保費 ${formatNT(ins.premium)}）`);
  emitTeam(team);
  broadcastTeams();
  return { ok: true, insured: on };
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

// 失業：下一個發薪日領不到薪水（不馬上扣現金、不輪空、可繼續前進）
function downsize(team) {
  // 鐵飯碗職業（警察/公務員/消防/保全）免於失業
  if (team.layoffImmune) {
    addFeed(`🛡️ ${team.name} 是鐵飯碗，免於這次裁員`);
    emitEvent(team, { emoji: '🛡️', title: '鐵飯碗，免裁員', text: '你的工作非常穩定，這次裁員與你無關！' });
    emitTeam(team);
    return;
  }
  team.missPaydays = (team.missPaydays || 0) + 1;
  addHistory(team, { round: state.round, type: 'event', text: '失業（下個發薪日沒薪水）', delta: 0 });
  addFeed(`💼 ${team.name} 失業了！下一個發薪日領不到薪水`);
  emitEvent(team, { emoji: '💼', title: '失業', text: '下一個發薪日領不到薪水（薪水歸零一次）；不會馬上扣錢，也能繼續前進。' });
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
  const mult = stageCfg().dealIncome;
  if (!card || mult === 1 || !(card.monthlyIncome > 0)) return card;
  return { ...card, monthlyIncome: Math.max(100, Math.round((card.monthlyIncome * mult) / 100) * 100) };
}

// 玩家選擇小生意 / 大買賣 → 抽一張機會卡
function chooseDeck(teamId, deck) {
  const team = getTeam(teamId);
  if (!team || team.pendingAction?.type !== 'opportunity') return { ok: false, reason: '目前沒有機會可抽' };
  if (deck === 'super') {
    // 超級生意：財富自由後專屬（高報酬、本金不用大）；初階不開放
    if (!stageCfg().superDeal) return { ok: false, reason: '這個階段沒有超級生意' };
    if (!team.free) return { ok: false, reason: '要先財富自由才能開啟超級生意' };
  } else if (deck !== 'small' && deck !== 'big') {
    return { ok: false, reason: '請選擇小生意或大買賣' };
  }
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
    renewal: card.renewal || false, // 都更/重劃房：被收購時走高價端（翻盤）

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

// 🛒 特賣格：玩家決定是否用折扣價買下這個小資產（撿便宜的被動收入）
function saleDecision(teamId, accept) {
  const team = getTeam(teamId);
  if (!team || team.pendingAction?.type !== 'sale') return { ok: false, reason: '目前沒有特賣可決定' };
  const item = team.pendingAction.item;
  team.pendingAction = null;

  if (accept) {
    if (team.cash < item.cost) {
      team.pendingAction = { type: 'sale', item };
      emitTeam(team);
      return { ok: false, reason: '存款不足，買不起這個特賣' };
    }
    team.cash -= item.cost;
    team.assets.push({ uid: nextUid(), marketId: null, name: item.name, emoji: item.emoji, category: item.category, tags: [], instrumentId: null, units: null, location: null, value: item.value, monthlyIncome: item.monthlyIncome });
    addHistory(team, { round: state.round, type: 'buy', text: `特賣入手 ${item.name}`, delta: -item.cost });
    addFeed(`🛒 ${team.name}：特賣入手 ${item.emoji} ${item.name}（月收 +${item.monthlyIncome}）`);
    checkFreedom(team);
    emitTeam(team);
    broadcastTeams();
    if (currentTurnId() === team.id) advanceTurn();
    return { ok: true, bought: true };
  }
  emitTeam(team);
  if (currentTurnId() === team.id) advanceTurn();
  return { ok: true, bought: false };
}

// 💡 快問答格：答對得獎金；答錯不罰、看解說學起來（寓教於樂）
function quizAnswer(teamId, choice) {
  const team = getTeam(teamId);
  if (!team || team.pendingAction?.type !== 'quiz') return { ok: false, reason: '目前沒有題目可作答' };
  const quiz = team.pendingAction.quiz;
  team.pendingAction = null;
  const correct = Number(choice) === quiz.answer;

  if (correct) {
    team.cash += quiz.reward;
    addHistory(team, { round: state.round, type: 'income', text: '理財快問答答對', delta: quiz.reward });
    addFeed(`💡 ${team.name}：理財快問答答對！+${quiz.reward}`);
    emitEvent(team, { emoji: '🎉', title: '答對了！', text: `${quiz.explain}\n獎勵 +${formatNT(quiz.reward)}` });
  } else {
    addFeed(`💡 ${team.name}：理財快問答答錯，下次加油`);
    emitEvent(team, { emoji: '📖', title: '答錯了，學起來！', text: quiz.explain });
  }
  emitTeam(team);
  broadcastTeams();
  if (currentTurnId() === team.id) advanceTurn();
  return { ok: true, correct };
}

// ── 買賣資產 ──

// 同組重複購買防呆視窗（毫秒）：3 秒內買同一支會被擋，避免多支手機同時按重複扣款
const DUP_BUY_WINDOW = 3000;

// 買入資產；options 依商品類型帶 qty（股數）或 amount（基金金額）
function buyAsset(teamId, { marketId, qty, amount } = {}) {
  if (state.phase !== 'running') {
    return { ok: false, reason: '目前不是操作時間' };
  }
  const team = getTeam(teamId);
  if (!team) return { ok: false, reason: '找不到組別' };
  const item = getMarketItem(marketId);
  if (!item) return { ok: false, reason: '查無此投資商品' };
  if (!marketFor(state.stage).some((mm) => mm.id === marketId)) {
    return { ok: false, reason: '這個階段買不到這個商品' };
  }

  // 防呆（同組多支手機）：短時間內重複買「同一支」多半是好幾個人同時按 → 先擋，避免重複扣款
  const now = Date.now();
  if (team.lastBuy && team.lastBuy.marketId === marketId && now - team.lastBuy.ts < DUP_BUY_WINDOW) {
    const wait = Math.ceil((DUP_BUY_WINDOW - (now - team.lastBuy.ts)) / 1000);
    return { ok: false, reason: `剛買過「${item.name}」了，怕同組重複扣款先擋一下，${wait} 秒後想再買可再按` };
  }

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
  team.lastBuy = { marketId, ts: now }; // 記錄這次購買，供上面的重複購買防呆判斷

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
  if (!stageCfg().loan) return { ok: false, reason: '這個階段不開放貸款' }; // 初階不教借錢
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

  // 可分割商品的部分賣出（股票/原物料依股數或單位、加密依金額）
  // 原物料（黃金/白銀/石油）與股票一樣用「單位數」持有，也能分批賣，不必一次全賣。
  const isShares = (asset.category === 'dividend' || asset.category === 'commodity') && asset.units != null;
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

// ── 人生成就（跳出老鼠圈後的玩法）──

// 選定要追求的人生成就目標（只有已達成財富自由、且尚未完成該成就者可選）
function chooseGoal(teamId, achievementId) {
  const team = getTeam(teamId);
  if (!team) return { ok: false, reason: '找不到組別' };
  if (!computeDerived(team).free) return { ok: false, reason: '要先達成財富自由，才能追求人生夢想' };
  const ach = getAchievement(achievementId);
  if (!ach) return { ok: false, reason: '查無此成就' };
  if ((team.achievements || []).includes(ach.id)) return { ok: false, reason: '這個成就已經完成囉' };
  team.currentGoalId = ach.id;
  emitTeam(team);
  broadcastTeams();
  return { ok: true, goal: ach.id };
}

// 買下（完成）目前選定的人生成就：需現金足夠，且買完仍維持財富自由
function buyAchievement(teamId) {
  if (state.phase !== 'running') return { ok: false, reason: '目前不是操作時間' };
  const team = getTeam(teamId);
  if (!team) return { ok: false, reason: '找不到組別' };
  const ach = team.currentGoalId ? getAchievement(team.currentGoalId) : null;
  if (!ach) return { ok: false, reason: '還沒選定人生夢想' };
  if ((team.achievements || []).includes(ach.id)) return { ok: false, reason: '這個成就已經完成囉' };

  const passive = passiveBreakdown(team).total;
  const upkeep = ach.upkeep || 0;
  // 維持財富自由：買完（含新增每月開銷）後，被動收入仍需 ≥ 總支出
  if (passive < computeTotalExpense(team) + upkeep) {
    return { ok: false, reason: '買了會讓你不再財富自由！先把被動收入養更高再來 💪' };
  }
  if (team.cash < ach.cost) {
    return { ok: false, reason: `現金不足（需 ${formatNT(ach.cost)}），繼續累積或擴大投資收入吧！` };
  }

  team.cash -= ach.cost;
  team.achievementUpkeep = (team.achievementUpkeep || 0) + upkeep;
  team.achievements = [...(team.achievements || []), ach.id];
  team.currentGoalId = null; // 完成後清空，讓玩家挑下一個夢想
  const totalStars = starsOf(team.achievements);
  addHistory(team, { round: state.round, type: 'achievement', text: `達成人生成就 ${ach.emoji} ${ach.name}`, delta: -ach.cost });
  addFeed(`${ach.emoji}🏆 ${team.name} 達成人生成就「${ach.name}」！（累積 ${totalStars} ⭐）`);
  if (io) io.to(code).emit('game:achievement', { teamId: team.id, name: team.name, achievement: { name: ach.name, emoji: ach.emoji, stars: ach.stars }, totalStars });
  emitTeam(team);
  broadcastTeams();
  return { ok: true, achievement: ach.id, totalStars };
}

// 【測試用】直接讓某組達成財富自由＋給足現金，方便驗證人生成就流程（正式上課別亂按）
function grantFreedom(teamId) {
  const team = getTeam(teamId);
  if (!team) return { ok: false, reason: '找不到組別' };
  if (team.bankrupt) return { ok: false, reason: '已破產淘汰' };
  const d = computeDerived(team);
  // 補一筆「測試被動收入」，讓被動收入超過總支出（多留 3 萬緩衝給成就的每月開銷）
  const need = Math.max(0, d.totalExpense - d.passiveTotal) + 30000;
  team.assets = team.assets || [];
  team.assets.push({ uid: nextUid(), category: 'business', name: '測試被動收入', emoji: '🧪', value: 0, monthlyIncome: need });
  team.cash += 3000000; // 給足現金以便測試購買成就
  checkFreedom(team); // 觸發財富自由旗標＋大螢幕慶祝
  addFeed(`🧪 ${team.name}（測試）直接達成財富自由`);
  emitTeam(team);
  broadcastTeams();
  return { ok: true };
}


  const endGameNow = () => { if (state.phase === 'running' || state.phase === 'paused') endGame('🏁 老師結束了遊戲！'); };
  return { getPublicState, startGame, pauseGame, endGame: endGameNow, skipTurn, nextRound, resetGame, clearGame, toggleTutorial, setSpotlight, navSpotlight, professionPair, createTeam, getTeam, getTeamPayload, listPublicTeams, broadcastTeams, setConfig, getSnapshot, loadSnapshot, getFeed, rollDice, acquireDecision, chooseDeck, dealDecision, charityDecision, saleDecision, quizAnswer, buyAsset, loanMoney, repayLoan, repayDebt, sellAsset, chooseGoal, buyAchievement, toggleInsurance, grantFreedom, netWorth, publicTeam };
}
