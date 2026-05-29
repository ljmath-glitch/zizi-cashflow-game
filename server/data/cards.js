// 三大牌庫（v2 M8）：機會卡（小生意/大買賣）、市場風雲卡、額外支出卡
// 目標貼近真實現金流並現代化（ETF / AI / 加密貨幣 / 現代商業）

// ── 機會卡：小生意（便宜、現金少時可玩） ──
// 只放「房地產 + 事業」（股票/ETF/加密/債券改到市場自由買賣，不出現在機會卡）
// deal 卡欄位：cost 現金成本；fullValue 帳面價值；mortgage 連動貸款（負債）；
//   monthlyIncome 每月淨被動；category=realestate｜business
export const SMALL_DEALS = [
  // 房地產（小）
  { id: 'sd_foreclosed', name: '法拍套房 ‧ 士林', emoji: '🏠', desc: '士林法拍套房，頭期 5 萬、貸款 35 萬，月淨租金 +2,800', category: 'realestate', location: '士林', roomType: '套房', cost: 50000, fullValue: 400000, mortgage: 350000, monthlyIncome: 2800 },
  { id: 'sd_rooftop', name: '頂樓加蓋套房 ‧ 士林', emoji: '🏠', desc: '士林頂加分租，頭期 4 萬、貸款 26 萬，月淨 +2,200', category: 'realestate', location: '士林', roomType: '套房', cost: 40000, fullValue: 300000, mortgage: 260000, monthlyIncome: 2200 },
  { id: 'sd_parking_re', name: '車位出租 ‧ 天母', emoji: '🅿️', desc: '天母精華區車位，現金 8 萬、月租 +1,500（無貸款）', category: 'realestate', location: '天母', roomType: '車位', cost: 80000, fullValue: 80000, monthlyIncome: 1500 },
  { id: 'sd_oldflat', name: '老公寓分租 ‧ 士林', emoji: '🏠', desc: '士林老公寓隔成雅房分租，頭期 9 萬、貸款 61 萬，月淨 +4,500', category: 'realestate', location: '士林', roomType: '一房一廳', cost: 90000, fullValue: 700000, mortgage: 610000, monthlyIncome: 4500 },
  // 事業（小）
  { id: 'sd_vending', name: '二手販賣機一台', emoji: '🥤', desc: '低價頂讓，月收 +2,500', category: 'business', cost: 60000, fullValue: 60000, monthlyIncome: 2500 },
  { id: 'sd_claw', name: '路邊夾娃娃機台', emoji: '🎰', desc: '$40,000，月收 +1,800', category: 'business', cost: 40000, fullValue: 40000, monthlyIncome: 1800 },
  { id: 'sd_laundry', name: '自助洗衣店一台', emoji: '🧺', desc: '$80,000，月收 +3,500', category: 'business', cost: 80000, fullValue: 80000, monthlyIncome: 3500 },
  { id: 'sd_bubble_share', name: '朋友手搖飲小股', emoji: '🧋', desc: '$30,000 入股，月分潤 +1,500', category: 'business', cost: 30000, fullValue: 30000, monthlyIncome: 1500 },
  { id: 'sd_podcast', name: 'Podcast 廣告分潤', emoji: '🎙️', desc: '$25,000 入股，月分潤 +1,200', category: 'business', cost: 25000, fullValue: 25000, monthlyIncome: 1200 },
  { id: 'sd_petgroom', name: '寵物美容工作室小股', emoji: '✂️', desc: '$45,000，月收 +2,000', category: 'business', cost: 45000, fullValue: 45000, monthlyIncome: 2000 },
  { id: 'sd_ecom', name: '學弟的電商代購', emoji: '📦', desc: '$35,000 合夥，月收 +1,800', category: 'business', cost: 35000, fullValue: 35000, monthlyIncome: 1800 },
  { id: 'sd_solar', name: '小型太陽能板（售電）', emoji: '🔆', desc: '$70,000，月售電 +2,800', category: 'business', cost: 70000, fullValue: 70000, monthlyIncome: 2800 },
  { id: 'sd_aiart', name: 'AI 繪圖接案工作室', emoji: '🎨', desc: '$30,000，月接案 +1,500', category: 'business', cost: 30000, fullValue: 30000, monthlyIncome: 1500 },
  { id: 'sd_breakfast', name: '早餐店頂讓 ‧ 士林', emoji: '🥪', desc: '$100,000 頂讓，月收 +4,000', category: 'business', cost: 100000, fullValue: 100000, monthlyIncome: 4000 },
  { id: 'sd_chicken', name: '雞排攤一攤', emoji: '🍗', desc: '$50,000 開攤，月收 +2,500', category: 'business', cost: 50000, fullValue: 50000, monthlyIncome: 2500 },
  { id: 'sd_charger', name: '電動車充電樁', emoji: '🔌', desc: '$120,000 設一支，月收 +3,500', category: 'business', cost: 120000, fullValue: 120000, monthlyIncome: 3500 },
  { id: 'sd_bookstore', name: '二手書店小股', emoji: '📚', desc: '$30,000 入股，月分潤 +1,200', category: 'business', cost: 30000, fullValue: 30000, monthlyIncome: 1200 },
];

// ── 機會卡：大買賣（昂貴、現金多才玩得起） ──
export const BIG_DEALS = [
  // 房地產（大）
  { id: 'bd_apartment', name: '整棟公寓 ‧ 天母', emoji: '🏢', desc: '天母整棟 12 戶出租公寓，頭期 15 萬、貸款 105 萬，月淨 +9,000', category: 'realestate', location: '天母', roomType: '整棟公寓', cost: 150000, fullValue: 1200000, mortgage: 1050000, monthlyIncome: 9000 },
  { id: 'bd_office', name: '辦公室 ‧ 士林', emoji: '🏬', desc: '士林整層商辦出租，頭期 25 萬、貸款 175 萬，月淨 +15,000', category: 'realestate', location: '士林', roomType: '辦公室', cost: 250000, fullValue: 2000000, mortgage: 1750000, monthlyIncome: 15000 },
  { id: 'bd_4r_tianmu', name: '四房一廳豪宅 ‧ 天母', emoji: '🏯', desc: '天母四房一廳豪宅出租，頭期 30 萬、貸款 220 萬，月淨 +18,000', category: 'realestate', location: '天母', roomType: '四房一廳', cost: 300000, fullValue: 2500000, mortgage: 2200000, monthlyIncome: 18000 },
  { id: 'bd_bnb', name: '三房一廳民宿 ‧ 天母', emoji: '🏡', desc: '天母三房一廳改民宿，頭期 20 萬、貸款 130 萬，月淨 +12,000', category: 'realestate', location: '天母', roomType: '三房一廳', cost: 200000, fullValue: 1500000, mortgage: 1300000, monthlyIncome: 12000 },
  { id: 'bd_storefront', name: '店面 ‧ 士林夜市旁', emoji: '🏪', desc: '士林夜市黃金店面，頭期 40 萬、貸款 310 萬，月淨 +26,000', category: 'realestate', location: '士林', roomType: '店面', cost: 400000, fullValue: 3500000, mortgage: 3100000, monthlyIncome: 26000 },
  { id: 'bd_renewal', name: '都更老屋 ‧ 士林', emoji: '🏚️', desc: '士林等都更的老屋，頭期 30 萬、貸款 250 萬，月淨 +14,000', category: 'realestate', location: '士林', roomType: '三房一廳', cost: 300000, fullValue: 2800000, mortgage: 2500000, monthlyIncome: 14000 },
  { id: 'bd_warehouse', name: '辦公室（整層）‧ 天母', emoji: '🏬', desc: '天母整層辦公室出租，頭期 35 萬、貸款 265 萬，月淨 +20,000', category: 'realestate', location: '天母', roomType: '辦公室', cost: 350000, fullValue: 3000000, mortgage: 2650000, monthlyIncome: 20000 },
  // 事業（大）
  { id: 'bd_bubble', name: '加盟連鎖手搖飲', emoji: '🧋', desc: '$300,000，月收 +25,000', category: 'business', cost: 300000, fullValue: 300000, monthlyIncome: 25000 },
  { id: 'bd_youtube', name: '收購經營中的 YouTube 頻道', emoji: '🎬', desc: '$500,000，月廣告分潤 +30,000', category: 'business', cost: 500000, fullValue: 500000, monthlyIncome: 30000 },
  { id: 'bd_saas', name: 'AI SaaS 訂閱公司股權', emoji: '🤖', desc: '$400,000，月訂閱收入 +28,000', category: 'business', cost: 400000, fullValue: 400000, monthlyIncome: 28000 },
  { id: 'bd_cvs', name: '連鎖超商加盟店', emoji: '🏪', desc: '$600,000，月收 +35,000', category: 'business', cost: 600000, fullValue: 600000, monthlyIncome: 35000 },
  { id: 'bd_parking_biz', name: '停車場經營權', emoji: '🅿️', desc: '$450,000，月收 +26,000', category: 'business', cost: 450000, fullValue: 450000, monthlyIncome: 26000 },
  { id: 'bd_gym', name: '連鎖健身房股權', emoji: '🏋️', desc: '$350,000，月收 +22,000', category: 'business', cost: 350000, fullValue: 350000, monthlyIncome: 22000 },
  { id: 'bd_carwash', name: '連鎖洗車場', emoji: '🚗', desc: '$400,000，月收 +24,000', category: 'business', cost: 400000, fullValue: 400000, monthlyIncome: 24000 },
  { id: 'bd_kitchen', name: '餐飲品牌中央廚房', emoji: '🍱', desc: '$700,000，月收 +40,000', category: 'business', cost: 700000, fullValue: 700000, monthlyIncome: 40000 },
  { id: 'bd_unmanned', name: '無人商店連鎖', emoji: '🛒', desc: '$380,000，24 小時自動營業，月收 +24,000', category: 'business', cost: 380000, fullValue: 380000, monthlyIncome: 24000 },
  { id: 'bd_livestream', name: '直播帶貨團隊', emoji: '📡', desc: '$320,000 入股，月分潤 +23,000', category: 'business', cost: 320000, fullValue: 320000, monthlyIncome: 23000 },
  { id: 'bd_pethotel', name: '寵物旅館', emoji: '🐾', desc: '$350,000，月收 +21,000', category: 'business', cost: 350000, fullValue: 350000, monthlyIncome: 21000 },
  { id: 'bd_cowork', name: '共享辦公室', emoji: '💼', desc: '$500,000，月收 +30,000', category: 'business', cost: 500000, fullValue: 500000, monthlyIncome: 30000 },
  { id: 'bd_solarfarm', name: '農地種電場', emoji: '🌾', desc: '$600,000，太陽能售電，月收 +33,000', category: 'business', cost: 600000, fullValue: 600000, monthlyIncome: 33000 },
];

// ── 市場風雲卡（影響全班） ──
// kind='price'：把符合 targetCategory 或 targetTag 的資產價值 ×factor
// kind='windfall'：全班每人現金 +amount（可負）
export const MARKET_CARDS = [
  { id: 'mk_ai_boom', kind: 'price', name: 'AI 浪潮來襲', emoji: '🚀', desc: '所有 AI 相關資產 +40%', targetTag: 'ai', factor: 1.4 },
  { id: 'mk_ai_bust', kind: 'price', name: 'AI 泡沫破裂', emoji: '💥', desc: '所有 AI 相關資產 -35%', targetTag: 'ai', factor: 0.65 },
  { id: 'mk_ai_acq', kind: 'price', name: '某 AI 新創被天價收購', emoji: '🤝', desc: 'AI 相關資產 +25%', targetTag: 'ai', factor: 1.25 },
  { id: 'mk_btc_halving', kind: 'price', name: '比特幣減半行情', emoji: '🪙', desc: '加密貨幣 +60%', targetCategory: 'crypto', factor: 1.6 },
  { id: 'mk_crypto_crash', kind: 'price', name: '幣圈大崩盤', emoji: '📉', desc: '加密貨幣 -50%', targetCategory: 'crypto', factor: 0.5 },
  { id: 'mk_meme_viral', kind: 'price', name: '迷因幣爆紅', emoji: '🐶', desc: '加密貨幣 +80%', targetCategory: 'crypto', factor: 1.8 },
  { id: 'mk_stock_high', kind: 'price', name: '台股創新高', emoji: '📈', desc: '股票 / ETF +15%', targetCategory: 'dividend', factor: 1.15 },
  { id: 'mk_stock_crash', kind: 'price', name: '股災來襲', emoji: '🔻', desc: '股票 / ETF -20%', targetCategory: 'dividend', factor: 0.8 },
  { id: 'mk_re_boom', kind: 'price', name: '房市大多頭', emoji: '🏠', desc: '房地產 +20%', targetCategory: 'realestate', factor: 1.2 },
  { id: 'mk_re_curb', kind: 'price', name: '政府打房', emoji: '🏚️', desc: '房地產 -15%', targetCategory: 'realestate', factor: 0.85 },
  { id: 'mk_biz_up', kind: 'price', name: '企業景氣回升', emoji: '📊', desc: '企業資產價值 +10%', targetCategory: 'business', factor: 1.1 },
  { id: 'mk_voucher', kind: 'windfall', name: '政府發消費券', emoji: '🎁', desc: '每人 +6,000', amount: 6000 },
  { id: 'mk_cash', kind: 'windfall', name: '全民普發現金', emoji: '🧧', desc: '每人 +10,000', amount: 10000 },
  { id: 'mk_taxback', kind: 'windfall', name: '報稅退稅', emoji: '📋', desc: '每人 +5,000', amount: 5000 },
  { id: 'mk_pandemic', kind: 'windfall', name: '疫情衝擊', emoji: '🦠', desc: '每人 -8,000', amount: -8000 },
  { id: 'mk_oil', kind: 'windfall', name: '油價大漲', emoji: '⛽', desc: '每人 -5,000', amount: -5000 },
  { id: 'mk_power', kind: 'windfall', name: '電費調漲', emoji: '💡', desc: '每人 -3,000', amount: -3000 },
];

// ── 額外支出卡（強制消費，不得違抗） ──
// recurring=true 代表變成每月固定支出（加到 expenses.other）
export const DOODAD_CARDS = [
  { id: 'dd_phone', name: '換最新手機', emoji: '📱', amount: 30000 },
  { id: 'dd_console', name: '買電競主機', emoji: '🎮', amount: 18000 },
  { id: 'dd_flight', name: '衝動訂出國機票', emoji: '✈️', amount: 40000 },
  { id: 'dd_concert', name: '搶到演唱會搖滾區', emoji: '🎤', amount: 8000 },
  { id: 'dd_carfix', name: '愛車進廠大修', emoji: '🔧', amount: 25000 },
  { id: 'dd_shopping', name: '週年慶失心瘋', emoji: '🛍️', amount: 12000 },
  { id: 'dd_laptop', name: '買新筆電', emoji: '💻', amount: 35000 },
  { id: 'dd_tour', name: '跟團出國玩', emoji: '🏝️', amount: 45000 },
  { id: 'dd_dinner', name: '朋友聚餐請客', emoji: '🍽️', amount: 6000 },
  { id: 'dd_gift', name: '送禮物給情人', emoji: '💍', amount: 15000 },
  { id: 'dd_party', name: '辦生日派對', emoji: '🎂', amount: 10000 },
  { id: 'dd_dental', name: '牙齒矯正', emoji: '🦷', amount: 50000 },
  { id: 'dd_tv', name: '買大電視', emoji: '📺', amount: 28000 },
  { id: 'dd_idol', name: '追星買周邊', emoji: '🎟️', amount: 7000 },
  { id: 'dd_dog', name: '養了一隻狗', emoji: '🐶', amount: 2000, recurring: true },
  { id: 'dd_cat', name: '認養貓咪', emoji: '🐱', amount: 1500, recurring: true },
  { id: 'dd_gym', name: '辦健身房會員', emoji: '🏋️', amount: 1800, recurring: true },
];

const DECKS = { small: SMALL_DEALS, big: BIG_DEALS, market: MARKET_CARDS, doodad: DOODAD_CARDS };

// 從指定牌庫隨機抽一張（抽完放回，等同無限牌庫，適合課堂）
export function drawCard(deck) {
  const pool = DECKS[deck];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
