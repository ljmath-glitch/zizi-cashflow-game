// 每回合市場事件：分「小事件」（頻繁、溫和）與「大事件」（偶發、影響大、不連續災難）
// effects 為乘數（套在指定類別的每支商品上）：1.10＝+10%
// 類別：stock（股票/ETF）、crypto（加密）、commodity（原物料）、realestate（房地產）
// scale='small'｜'big'；catastrophe=true 的大事件不會連續出現

// 小事件：每回合最常見，像「本週新聞快訊」。
// 大多是生活／趣味／職業風味（不影響市場 effects:{}），只有少數會小幅動到行情。
export const SMALL_EVENTS = [
  // —— 會小幅影響市場（少數）——
  { id: 's_stock_up', emoji: '📈', title: '法人小買超', desc: '股市小漲一點', effects: { stock: 1.03 } },
  { id: 's_stock_dn', emoji: '📉', title: '獲利了結賣壓', desc: '股市小跌一點', effects: { stock: 0.97 } },
  { id: 's_export', emoji: '🚢', title: '出口數據亮眼', desc: '傳產、權值股受惠', effects: { stock: 1.04 } },
  { id: 's_gold_up', emoji: '🥇', title: '避險買盤進場', desc: '黃金等原物料小漲', effects: { commodity: 1.05 } },
  { id: 's_oil_up', emoji: '🛢️', title: '油價小漲', desc: '原物料走高', effects: { commodity: 1.04 } },
  { id: 's_consume', emoji: '🛍️', title: '消費信心回升', desc: '內需股小漲', effects: { stock: 1.03 } },
  // —— 純風味，不影響市場 ——
  { id: 's_calm', emoji: '🌤️', title: '風平浪靜的一週', desc: '什麼大事都沒發生，喝杯珍奶放鬆一下', effects: {} },
  { id: 's_weather', emoji: '🌧️', title: '連日大雨', desc: '出門記得帶傘，市場沒什麼變化', effects: {} },
  { id: 's_viral', emoji: '😂', title: '迷因瘋傳', desc: '全班都在看同一支搞笑影片，笑到肚子痛', effects: {} },
  { id: 's_sport', emoji: '⚽', title: '世界盃開踢', desc: '大家熬夜看球，隔天上班昏昏沉沉', effects: {} },
  { id: 's_festival', emoji: '🎏', title: '連假來了', desc: '出遊人潮爆滿，你選擇在家耍廢', effects: {} },
  { id: 's_newphone', emoji: '📱', title: '新手機發表會', desc: '網路一片討論，但你忍住沒衝動下單', effects: {} },
  { id: 's_lucky', emoji: '🍀', title: '今天運氣不錯', desc: '路上撿到 10 元，心情很好', effects: {} },
  { id: 's_health', emoji: '🏃', title: '全民運動風', desc: '大家開始跑步健身，健康最重要', effects: {} },
  { id: 's_news_quiet', emoji: '📰', title: '本週財經無大事', desc: '新聞都在報美食和旅遊', effects: {} },
  // —— 職業風味（只是情境，無強制效果）——
  { id: 's_prof_doctor', emoji: '🩺', title: '流感季到了', desc: '醫護人員特別忙；其他人記得多洗手', effects: {} },
  { id: 's_prof_youtuber', emoji: '🎬', title: '某網紅影片爆紅', desc: '自媒體工作者最有感，流量就是錢', effects: {} },
  { id: 's_prof_teacher', emoji: '🧑‍🏫', title: '期中考週', desc: '老師忙著改考卷，學生忙著抱佛腳', effects: {} },
  { id: 's_prof_chef', emoji: '👨‍🍳', title: '美食節登場', desc: '餐飲業生意興隆，大家排隊吃美食', effects: {} },
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

// 股市情報（小道消息／傳聞，暗示「下回合」可能的行情，約 55% 成真、也可能落空）
// 注意：用「市場面／坊間傳聞」的口吻，避免跟「大事件」的官方題材（如央行升降息）撞詞而看起來自相矛盾。
export const RUMORS = [
  { text: '小道消息：某 AI 大廠財報亮眼，科技股可能要噴了…', sector: 'stock', dir: 'up' },
  { text: '傳聞：外資連日調節持股，下回合股市恐拉回…', sector: 'stock', dir: 'down' },
  { text: '幣圈瘋傳：有大戶在掃貨比特幣…', sector: 'crypto', dir: 'up' },
  { text: '網路謠言：某交易所出問題，小心幣價跳水…', sector: 'crypto', dir: 'down' },
  { text: '分析師：地緣風險升高，黃金石油看漲…', sector: 'commodity', dir: 'up' },
  { text: '消息面：房市買氣轉冷，屋主開始讓價…', sector: 'realestate', dir: 'down' },
  { text: '法人看好：景氣有望復甦，傳產股有戲…', sector: 'stock', dir: 'up' },
];

export function randomRumor() {
  return RUMORS[Math.floor(Math.random() * RUMORS.length)];
}

// 挑一個本回合事件：~70% 小事件、~30% 大事件；
// lastBigCatastropheId 用來避免連續出現災難型大事件
export function pickEvent(lastCatId) {
  // 大多是小事件（像每週新聞，常常不動市場）；大事件只偶爾出現（約 18%）
  if (Math.random() < 0.82) {
    const e = SMALL_EVENTS[Math.floor(Math.random() * SMALL_EVENTS.length)];
    return { ...e, scale: 'small' };
  }
  let pool = BIG_EVENTS;
  // 若上一個大事件是災難，本次大事件排除所有災難型，避免連環災難
  if (lastCatId) pool = BIG_EVENTS.filter((e) => !e.catastrophe);
  const e = pool[Math.floor(Math.random() * pool.length)];
  return { ...e, scale: 'big' };
}
