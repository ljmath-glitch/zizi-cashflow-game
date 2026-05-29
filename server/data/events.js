// 每回合市場事件：分「小事件」（頻繁、溫和）與「大事件」（偶發、影響大、不連續災難）
// effects 為乘數（套在指定類別的每支商品上）：1.10＝+10%
// 類別：stock（股票/ETF）、crypto（加密）、commodity（原物料）、realestate（房地產）
// scale='small'｜'big'；catastrophe=true 的大事件不會連續出現

// 小事件：每回合最常見，小幅波動、貼近日常財經新聞
export const SMALL_EVENTS = [
  { id: 's_calm', emoji: '🌤️', title: '市場平靜', desc: '小幅震盪，沒什麼大事', effects: {} },
  { id: 's_stock_up', emoji: '📈', title: '法人小買超', desc: '股市小漲', effects: { stock: 1.03 } },
  { id: 's_stock_dn', emoji: '📉', title: '獲利了結賣壓', desc: '股市小跌', effects: { stock: 0.97 } },
  { id: 's_export', emoji: '🚢', title: '出口數據亮眼', desc: '傳產、權值股受惠', effects: { stock: 1.04 } },
  { id: 's_rate_hold', emoji: '🏦', title: '央行利率不變', desc: '市場無波動', effects: {} },
  { id: 's_gold_up', emoji: '🥇', title: '避險買盤進場', desc: '黃金等原物料小漲', effects: { commodity: 1.05 } },
  { id: 's_gold_dn', emoji: '🥇', title: '避險需求降溫', desc: '原物料小跌', effects: { commodity: 0.96 } },
  { id: 's_crypto_chop', emoji: '🪙', title: '幣圈震盪', desc: '加密貨幣上下洗盤', effects: {} },
  { id: 's_dividend', emoji: '💰', title: '除息旺季', desc: '高息股小漲', effects: { stock: 1.02 } },
  { id: 's_oil_up', emoji: '🛢️', title: '油價小漲', desc: '原物料走高', effects: { commodity: 1.04 } },
  { id: 's_consume', emoji: '🛍️', title: '消費信心回升', desc: '內需股小漲', effects: { stock: 1.03 } },
];

// 大事件：偶爾出現、影響大、有戲劇性（catastrophe 標記者不會連續出現）
export const BIG_EVENTS = [
  { id: 'b_ai_boom', emoji: '🤖', title: 'AI 應用大爆發', desc: '科技股大漲，AI 概念尤強', effects: { stock: 1.15 }, aiBoost: 1.8 },
  { id: 'b_tw_high', emoji: '🇹🇼', title: '台股創歷史新高', desc: '全民瘋股、買氣狂熱', effects: { stock: 1.12 } },
  { id: 'b_rate_cut', emoji: '🏠', title: '央行大降息', desc: '股市與房市同步走升', effects: { stock: 1.07, realestate: 1.08 } },
  { id: 'b_btc_etf', emoji: '🪙', title: '比特幣 ETF 通過', desc: '資金湧入加密貨幣', effects: { crypto: 1.4 } },
  { id: 'b_btc_halving', emoji: '⛏️', title: '比特幣減半行情', desc: '加密貨幣大漲', effects: { crypto: 1.5 } },
  { id: 'b_war', emoji: '⚔️', title: '中東衝突升溫', desc: '油價、黃金飆漲，股市下挫', effects: { commodity: 1.3, stock: 0.95 } },
  { id: 'b_gold_surge', emoji: '🥇', title: '黃金價格飆升', desc: '避險需求爆發，原物料大漲', effects: { commodity: 1.25 } },
  { id: 'b_biotech', emoji: '🧬', title: '新藥解盲成功', desc: '生技股大漲', effects: { stock: 1.08 }, bioBoost: 2.2 },
  { id: 'b_reit', emoji: '🏗️', title: '建商推案熱、房價飆', desc: '房地產大漲', effects: { realestate: 1.1 } },
  // ↓ 災難型（catastrophe）：不會連續出現
  { id: 'b_tech_bust', emoji: '💥', title: '科技股泡沫破裂', desc: '股市重挫，AI 概念領跌', effects: { stock: 0.82 }, aiBoost: 1.8, catastrophe: true },
  { id: 'b_crypto_crash', emoji: '📉', title: '交易所暴雷、幣圈崩盤', desc: '加密貨幣腰斬', effects: { crypto: 0.5 }, catastrophe: true },
  { id: 'b_blackswan', emoji: '😱', title: '黑天鵝全球股災', desc: '股、幣、房全面下殺', effects: { stock: 0.82, crypto: 0.7, realestate: 0.95 }, catastrophe: true },
  { id: 'b_inflation', emoji: '⚠️', title: '通膨升溫、急速升息', desc: '股市與房市承壓、原物料漲', effects: { stock: 0.92, realestate: 0.95, commodity: 1.08 }, catastrophe: true },
  { id: 'b_curb', emoji: '🏚️', title: '政府重手打炒房', desc: '房地產明顯下修', effects: { realestate: 0.85 }, catastrophe: true },
];

// 股市情報（暗示未來可能的行情，有機率成真、也可能落空或反向）
export const RUMORS = [
  { text: '小道消息：某 AI 大廠財報亮眼，科技股可能要噴了…', sector: 'stock', dir: 'up' },
  { text: '傳聞：央行可能升息，股市恐拉回…', sector: 'stock', dir: 'down' },
  { text: '幣圈瘋傳：有大戶在掃貨比特幣…', sector: 'crypto', dir: 'up' },
  { text: '網路謠言：某交易所出問題，小心幣價跳水…', sector: 'crypto', dir: 'down' },
  { text: '分析師：地緣風險升高，黃金石油看漲…', sector: 'commodity', dir: 'up' },
  { text: '消息面：房市要降溫了，建商急著出貨…', sector: 'realestate', dir: 'down' },
  { text: '法人看好：明年景氣復甦，傳產股有戲…', sector: 'stock', dir: 'up' },
];

export function randomRumor() {
  return RUMORS[Math.floor(Math.random() * RUMORS.length)];
}

// 挑一個本回合事件：~70% 小事件、~30% 大事件；
// lastBigCatastropheId 用來避免連續出現災難型大事件
export function pickEvent(lastCatId) {
  if (Math.random() < 0.7) {
    const e = SMALL_EVENTS[Math.floor(Math.random() * SMALL_EVENTS.length)];
    return { ...e, scale: 'small' };
  }
  let pool = BIG_EVENTS;
  // 若上一個大事件是災難，本次大事件排除所有災難型，避免連環災難
  if (lastCatId) pool = BIG_EVENTS.filter((e) => !e.catastrophe);
  const e = pool[Math.floor(Math.random() * pool.length)];
  return { ...e, scale: 'big' };
}
