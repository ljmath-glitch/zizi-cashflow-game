// 每回合市場事件：分「小事件」（頻繁、溫和）與「大事件」（偶發、影響大、不連續災難）
// effects 為乘數（套在指定類別的每支商品上）：1.10＝+10%
// 類別：stock（股票/ETF）、crypto（加密）、commodity（原物料）、realestate（房地產）
// scale='small'｜'big'；catastrophe=true 的大事件不會連續出現
//
// 全班共同「搞笑賺賠」（與市場乘數各自獨立，由 game.js 的 applyMonthlyEvent 套用）：
//   cashRange:[lo,hi]＝金額每次隨機（取整到 500），同一回合全班同額、每次出現不同 → 首選；
//   cash:N＝固定金額（保留相容）。負值＝全班一起賠。
// weight（可選）：大事件被抽中的相對權重；未指定時，災難型 catastrophe 預設 0.3（黑天鵝＝稀有），其餘為 1。

// 小事件：每回合最常見，像「本週新聞快訊」。
// 大多是生活／趣味／職業風味（不影響市場 effects:{}），只有少數會小幅動到行情或帶來共同賺賠。
export const SMALL_EVENTS = [
  // —— 會小幅影響市場（少數）——
  { id: 's_stock_up', emoji: '📈', title: '法人小買超', desc: '股市小漲一點', effects: { stock: 1.03 } },
  { id: 's_stock_dn', emoji: '📉', title: '獲利了結賣壓', desc: '股市小跌一點', effects: { stock: 0.97 } },
  { id: 's_export', emoji: '🚢', title: '出口數據亮眼', desc: '傳產、權值股受惠', effects: { stock: 1.04 } },
  { id: 's_gold_up', emoji: '🥇', title: '避險買盤進場', desc: '黃金等原物料小漲', effects: { commodity: 1.05 } },
  { id: 's_oil_up', emoji: '🛢️', title: '油價小漲', desc: '原物料走高', effects: { commodity: 1.04 } },
  { id: 's_consume', emoji: '🛍️', title: '消費信心回升', desc: '內需股小漲', effects: { stock: 1.03 } },

  // —— 純風味 / 共同話題（不影響市場，貼近 2026 台灣國中生的生活）——
  { id: 's_calm', emoji: '🌤️', title: '風平浪靜的一週', desc: '什麼大事都沒發生，喝杯珍奶放鬆一下', effects: {} },
  { id: 's_weather', emoji: '🌧️', title: '連日大雨', desc: '出門記得帶傘，市場沒什麼變化', effects: {} },
  { id: 's_viral', emoji: '😂', title: '迷因瘋傳', desc: '全班都在傳同一支搞笑短影音，笑到肚子痛', effects: {} },
  { id: 's_concert', emoji: '🎤', title: '天團開唱、搶票之亂', desc: '演唱會門票 30 秒完售，大家在群組哀號', effects: {} },
  { id: 's_bogo', emoji: '🧋', title: '手搖飲買一送一', desc: '全台排隊搶半價珍奶，你也跟著喝了兩杯', effects: {} },
  { id: 's_esports', emoji: '🎮', title: '台灣電競隊奪冠', desc: '國際賽台灣隊逆轉奪冠，全班熬夜看直播', effects: {} },
  { id: 's_aihw', emoji: '🤖', title: 'AI 幫寫作業被抓包', desc: '有人用 AI 寫作業被老師發現，全班笑翻', effects: {} },
  { id: 's_gacha', emoji: '📱', title: '手遊改版新角色', desc: '大家瘋抽新角色，抽到 SSR 的在炫耀', effects: {} },
  { id: 's_shortvid', emoji: '📹', title: '短影音挑戰爆紅', desc: '全校都在拍同一個跳舞挑戰', effects: {} },
  { id: 's_stamp', emoji: '🧸', title: '超商集點換公仔', desc: '為了換限定公仔，全班拚命集點', effects: {} },
  { id: 's_festival', emoji: '🎏', title: '連假來了', desc: '出遊人潮爆滿，你選擇在家耍廢', effects: {} },
  { id: 's_exam', emoji: '📚', title: '期末考倒數', desc: '大家忙著抱佛腳，投資的事先放一邊', effects: {} },
  { id: 's_lucky', emoji: '🍀', title: '今天運氣不錯', desc: '路上撿到 10 元，心情很好', effects: {} },
  { id: 's_health', emoji: '🏃', title: '全民運動風', desc: '大家開始跑步健身，健康最重要', effects: {} },
  { id: 's_news_quiet', emoji: '📰', title: '本週財經無大事', desc: '新聞都在報美食和旅遊', effects: {} },

  // —— 職業風味（只是情境，無強制效果）——
  { id: 's_prof_doctor', emoji: '🩺', title: '流感季到了', desc: '醫護人員特別忙；其他人記得多洗手', effects: {} },
  { id: 's_prof_youtuber', emoji: '🎬', title: '某網紅影片爆紅', desc: '自媒體工作者最有感，流量就是錢', effects: {} },
  { id: 's_prof_teacher', emoji: '🧑‍🏫', title: '期中考週', desc: '老師忙著改考卷，學生忙著抱佛腳', effects: {} },
  { id: 's_prof_chef', emoji: '👨‍🍳', title: '美食節登場', desc: '餐飲業生意興隆，大家排隊吃美食', effects: {} },

  // —— 搞笑「共同賺錢」：全班每組現金 +（金額每次隨機，落在 cashRange 區間）——
  { id: 's_invoice', emoji: '🧾', title: '統一發票中獎', desc: '大家都對中了發票小獎，開心請喝飲料！', effects: {}, cashRange: [1000, 3000] },
  { id: 's_resell', emoji: '📦', title: '清出舊物上網賣', desc: '把家裡的舊公仔、舊球鞋掛上網拍，居然被秒殺！', effects: {}, cashRange: [1500, 5000] },
  { id: 's_redenvelope', emoji: '🧧', title: '阿嬤突然包紅包', desc: '阿嬤心情好，每個人都收到一個紅包，賺到！', effects: {}, cashRange: [1000, 4000] },
  { id: 's_livegiveaway', emoji: '🎁', title: '直播抽獎中獎', desc: '追直播順手抽獎，居然中了現金券！', effects: {}, cashRange: [500, 3000] },
  { id: 's_cashback', emoji: '💳', title: '刷卡回饋大放送', desc: '信用卡通路回饋加碼，帳單現金回饋入帳', effects: {}, cashRange: [500, 2500] },

  // —— 搞笑「共同賠錢」：全班每組現金 −（金額每次隨機）——
  { id: 's_phonewc', emoji: '📱', title: '手機掉進馬桶', desc: '滑手機滑到手滑，「咚」一聲…修手機要花錢', effects: {}, cashRange: [-4000, -2000] },
  { id: 's_claw', emoji: '🎰', title: '娃娃機課金之夜', desc: '夾了一整晚還是沒夾到，錢包扁扁回家', effects: {}, cashRange: [-3500, -1000] },
  { id: 's_subs', emoji: '🔁', title: '訂閱忘記取消', desc: '一堆串流／遊戲訂閱忘記退，被扣款扣到哭', effects: {}, cashRange: [-2500, -800] },
  { id: 's_tow', emoji: '🚗', title: '違規停車被拖吊', desc: '停一下下就被拖走，領車還要付拖吊費', effects: {}, cashRange: [-3000, -1000] },
  { id: 's_scalper', emoji: '🎫', title: '買到黃牛假票', desc: '搶不到票跟黃牛買，結果是假的…嗚嗚', effects: {}, cashRange: [-5000, -2000] },
  { id: 's_impulse', emoji: '🛒', title: '半夜手滑下單', desc: '半夜逛購物網手滑買了一堆用不到的東西', effects: {}, cashRange: [-3500, -1000] },
];

// 大事件：偶爾出現、影響大、有戲劇性（catastrophe 標記者不會連續出現）
// fx＝大螢幕「專屬動畫劇場」主題：circuit 電路火花｜boom 綠色噴發｜coinrain 幣雨｜
//   gold 金光四射｜siren 警報閃爍｜storm 颱風吹襲｜confetti 慶祝彩帶｜crash 紅色墜落
export const BIG_EVENTS = [
  { id: 'b_ai_boom', emoji: '🤖', title: 'AI 應用大爆發', desc: '科技股大漲，AI 概念尤強', effects: { stock: 1.15 }, aiBoost: 1.8, fx: 'circuit' },
  { id: 'b_tw_high', emoji: '🇹🇼', title: '台股創歷史新高', desc: '全民瘋股、買氣狂熱', effects: { stock: 1.12 }, fx: 'boom' },
  { id: 'b_rate_cut', emoji: '🏠', title: '央行大降息', desc: '股市與房市同步走升', effects: { stock: 1.07, realestate: 1.08 }, fx: 'boom' },
  { id: 'b_btc_etf', emoji: '🪙', title: '比特幣 ETF 通過', desc: '資金湧入加密貨幣', effects: { crypto: 1.4 }, fx: 'coinrain' },
  { id: 'b_btc_halving', emoji: '⛏️', title: '比特幣減半行情', desc: '加密貨幣大漲', effects: { crypto: 1.5 }, fx: 'coinrain' },
  { id: 'b_war', emoji: '⚔️', title: '中東衝突升溫', desc: '油價、黃金飆漲，股市下挫', effects: { commodity: 1.3, stock: 0.95 }, fx: 'siren' },
  { id: 'b_gold_surge', emoji: '🥇', title: '黃金價格飆升', desc: '避險需求爆發，原物料大漲', effects: { commodity: 1.25 }, fx: 'gold' },
  { id: 'b_biotech', emoji: '🧬', title: '新藥解盲成功', desc: '生技股大漲', effects: { stock: 1.08 }, bioBoost: 2.2, fx: 'boom' },
  { id: 'b_reit', emoji: '🏗️', title: '建商推案熱、房價飆', desc: '房地產大漲', effects: { realestate: 1.1 }, fx: 'boom' },
  { id: 'b_robot', emoji: '🦾', title: '人形機器人量產元年', desc: '機器人與 AI 供應鏈全面噴發', effects: { stock: 1.13 }, aiBoost: 1.6, fx: 'circuit' },
  { id: 'b_chipwar', emoji: '🔌', title: '晶片管制再升級', desc: '半導體重挫、拖累大盤', effects: { stock: 0.9 }, aiBoost: 1.5, catastrophe: true, fx: 'crash' },
  // ↓ 全班共同「大額賺賠」大事件（戲劇性、影響全班現金；金額每次隨機）
  { id: 'b_stimulus', emoji: '🧧', title: '政府全民普發現金', desc: '振興經濟，全班每組荷包大進補！', effects: {}, cashRange: [8000, 16000], fx: 'confetti' },
  { id: 'b_yearend', emoji: '💰', title: '景氣大好、年終爆發', desc: '公司大賺發超級年終，全班笑呵呵', effects: { stock: 1.05 }, cashRange: [6000, 15000], fx: 'confetti' },
  { id: 'b_scam', emoji: '😱', title: '假投資詐騙全班中招', desc: '「穩賺不賠」的訊息是騙人的，全班都被坑', effects: {}, cashRange: [-15000, -6000], catastrophe: true, fx: 'siren' },
  { id: 'b_typhoon', emoji: '🌀', title: '超級颱風重創', desc: '風災水災災損慘重，房市也受影響', effects: { realestate: 0.96 }, cashRange: [-14000, -5000], catastrophe: true, fx: 'storm' },
  { id: 'b_tax_audit', emoji: '📋', title: '國稅局大查稅', desc: '全班被追補稅款，痛失一筆現金', effects: {}, cashRange: [-12000, -5000], catastrophe: true, fx: 'siren' },
  // ↓ 災難型（catastrophe）：不會連續出現
  { id: 'b_tech_bust', emoji: '💥', title: '科技股泡沫破裂', desc: '股市重挫，AI 概念領跌', effects: { stock: 0.82 }, aiBoost: 1.8, catastrophe: true, fx: 'crash' },
  { id: 'b_crypto_crash', emoji: '📉', title: '交易所暴雷、幣圈崩盤', desc: '加密貨幣腰斬', effects: { crypto: 0.5 }, catastrophe: true, fx: 'crash' },
  { id: 'b_blackswan', emoji: '😱', title: '黑天鵝全球股災', desc: '股、幣、房全面下殺', effects: { stock: 0.82, crypto: 0.7, realestate: 0.95 }, catastrophe: true, fx: 'crash' },
  { id: 'b_inflation', emoji: '⚠️', title: '通膨升溫、急速升息', desc: '股市與房市承壓、原物料漲', effects: { stock: 0.92, realestate: 0.95, commodity: 1.08 }, catastrophe: true, fx: 'crash' },
  { id: 'b_curb', emoji: '🏚️', title: '政府重手打炒房', desc: '房地產明顯下修', effects: { realestate: 0.85 }, catastrophe: true, fx: 'crash' },
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
  { text: '傳聞：人形機器人供應鏈接到大單，相關股蠢蠢欲動…', sector: 'stock', dir: 'up' },
  { text: '幣圈風向：迷因幣社群又在集結，準備衝一波…', sector: 'crypto', dir: 'up' },
  { text: '消息面：建商喊卡緩推案，房市短線觀望…', sector: 'realestate', dir: 'down' },
];

export function randomRumor() {
  return RUMORS[Math.floor(Math.random() * RUMORS.length)];
}

// 大事件抽中權重：災難／黑天鵝型（catastrophe）機率大幅降低（預設 0.3），平常多是溫和或正面的大事件
function bigWeight(e) {
  if (e.weight != null) return e.weight;
  return e.catastrophe ? 0.3 : 1;
}
function weightedPick(pool) {
  const total = pool.reduce((s, e) => s + bigWeight(e), 0);
  let r = Math.random() * total;
  for (const e of pool) {
    r -= bigWeight(e);
    if (r <= 0) return e;
  }
  return pool[pool.length - 1];
}

// 挑一個本回合事件：~82% 小事件、~18% 大事件；
// forceBig=true 時保證抽大事件（防止整場都沒大事件的保底機制）
// 大事件依權重抽（黑天鵝災難稀有）；lastCatId 用來避免連續出現災難型大事件
export function pickEvent(lastCatId, forceBig = false) {
  // 大多是小事件（像每週新聞，常常不動市場）；大事件只偶爾出現（約 18%），除非本回合保底強制大事件
  if (!forceBig && Math.random() < 0.82) {
    const e = SMALL_EVENTS[Math.floor(Math.random() * SMALL_EVENTS.length)];
    return { ...e, scale: 'small' };
  }
  let pool = BIG_EVENTS;
  // 若上一個大事件是災難，本次大事件排除所有災難型，避免連環災難
  if (lastCatId) pool = BIG_EVENTS.filter((e) => !e.catastrophe);
  const e = weightedPick(pool);
  return { ...e, scale: 'big' };
}
