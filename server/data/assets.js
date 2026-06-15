// 可投資資產目錄（v2：2026 現代化、淡化房地產）
// category 決定被動收入的四大分類：
//   interest（利息）、dividend（股利｜股票/ETF）、realestate（房地產）、business（企業）
//   crypto（加密貨幣）＝無現金流，只靠價差，不計入非工資收入
// kind 購買方式：shares（依股數）、amount（任意金額）、fixed（單筆固定）
export const MARKET = [
  // ── 股票 / ETF（股利） ──
  {
    id: 'etf_market',
    name: '市值型 ETF（0050 型）',
    emoji: '📊',
    category: 'dividend',
    tags: ['etf'],
    kind: 'shares',
    price: 200,
    dividendPerYear: 6, // 年配息/股（約 3%）
    risk: '低',
    desc: '一籃子大型股，穩健成長、年配息約 3%',
  },
  {
    id: 'etf_highdiv',
    name: '高股息 ETF（0056 型）',
    emoji: '💵',
    category: 'dividend',
    tags: ['etf'],
    kind: 'shares',
    price: 35,
    dividendPerYear: 2, // 約 5.7%
    risk: '低',
    desc: '主打高配息，年配息約 5–6%',
  },
  {
    id: 'etf_ai',
    name: 'AI 主題 ETF',
    emoji: '🤖',
    category: 'dividend',
    tags: ['ai', 'etf'],
    kind: 'shares',
    price: 60,
    dividendPerYear: 1,
    risk: '中',
    desc: '集中 AI 產業，成長性高、配息少、價格波動中等',
  },
  {
    id: 'stock_semi',
    name: '半導體龍頭股（台積電型）',
    emoji: '🏭',
    category: 'dividend',
    kind: 'shares',
    price: 1000,
    dividendPerYear: 40, // 約 4%
    risk: '中',
    desc: '每股 1,000，年配息約 4%',
  },
  {
    id: 'stock_aichip',
    name: 'AI 晶片股（輝達型）',
    emoji: '⚡',
    category: 'dividend',
    tags: ['ai'],
    kind: 'shares',
    price: 1200,
    dividendPerYear: 4,
    risk: '高',
    desc: '高成長、配息極少，價格大起大落',
  },
  {
    id: 'stock_aisoft',
    name: 'AI 軟體新創股',
    emoji: '💻',
    category: 'dividend',
    tags: ['ai'],
    kind: 'shares',
    price: 300,
    dividendPerYear: 0,
    risk: '高',
    desc: '不配息，純賭未來成長（價差），波動極大',
  },
  {
    id: 'stock_biotech',
    name: '生技新藥股',
    emoji: '🧬',
    category: 'dividend',
    tags: ['biotech'],
    kind: 'shares',
    price: 400,
    dividendPerYear: 0,
    risk: '高',
    desc: '新藥題材，過關大漲、解盲失敗大跌，波動大',
  },
  {
    id: 'stock_traditional',
    name: '傳產龍頭股（鋼鐵/塑化型）',
    emoji: '🏗️',
    category: 'dividend',
    tags: ['traditional'],
    kind: 'shares',
    price: 80,
    dividendPerYear: 5, // 約 6%
    risk: '低',
    desc: '景氣循環股，配息高、波動小',
  },
  {
    id: 'stock_food',
    name: '食品股（統一型）',
    emoji: '🍜',
    category: 'dividend',
    tags: ['traditional'],
    kind: 'shares',
    price: 70,
    dividendPerYear: 3,
    risk: '低',
    desc: '民生必需、抗跌穩定',
  },
  {
    id: 'stock_telecom',
    name: '電信股（中華電型）',
    emoji: '📶',
    category: 'dividend',
    tags: ['traditional'],
    kind: 'shares',
    price: 120,
    dividendPerYear: 5, // 約 4%
    risk: '極低',
    desc: '超穩定、像定存的股票，配息約 4%',
  },

  // ── 原物料（黃金/白銀/石油，價差為主、不配息） ──
  {
    id: 'gold',
    name: '黃金存摺',
    emoji: '🥇',
    category: 'commodity',
    kind: 'shares',
    price: 8000, // 每單位（克）名目價
    risk: '中',
    desc: '避險首選，亂世漲、平時穩；不配息賺價差',
  },
  {
    id: 'silver',
    name: '白銀',
    emoji: '🥈',
    category: 'commodity',
    kind: 'shares',
    price: 1200,
    risk: '中高',
    desc: '工業+避險需求，波動比黃金大',
  },
  {
    id: 'oil',
    name: '石油期貨',
    emoji: '🛢️',
    category: 'commodity',
    kind: 'shares',
    price: 2500,
    risk: '高',
    desc: '受國際情勢影響大，戰爭/減產會飆漲',
  },

  // ── 加密貨幣（無現金流，只靠價差） ──
  // 暫時只開放比特幣，其餘幣種（ETH／MEME）先關閉，避免新手選太多種類混亂。
  {
    id: 'crypto_btc',
    name: '比特幣 BTC',
    emoji: '🪙',
    category: 'crypto',
    kind: 'amount',
    risk: '高',
    desc: '不配息，價格暴漲暴跌；可投入任意金額',
  },

  // ── 利息（定存 / 債券） ──
  {
    id: 'deposit',
    name: '銀行定存',
    emoji: '🏦',
    category: 'interest',
    kind: 'amount',
    annualRate: 0.015,
    risk: '極低',
    desc: '幾乎零風險，年利率約 1.5%',
  },
  {
    id: 'bond_etf',
    name: '債券 ETF',
    emoji: '📜',
    category: 'interest',
    kind: 'amount',
    annualRate: 0.04,
    risk: '低',
    desc: '低風險，年息約 4%（每月配息）',
  },

  // ── 房地產（標明地點與房型；大物件走機會卡大買賣） ──
  {
    id: 're_studio_shilin',
    name: '套房 ‧ 士林',
    emoji: '🏠',
    category: 'realestate',
    location: '士林',
    roomType: '套房',
    kind: 'fixed',
    price: 200000, // 頭期款
    fullValue: 800000, // 帳面價值
    mortgage: 600000, // 房貸（負債）
    monthlyIncome: 13500, // 租金 18,000 − 房貸月繳 4,500
    risk: '中',
    desc: '士林套房出租，頭期 20 萬、月淨租金 +13,500',
  },
  {
    id: 're_1r_tianmu',
    name: '一房一廳 ‧ 天母',
    emoji: '🏠',
    category: 'realestate',
    location: '天母',
    roomType: '一房一廳',
    kind: 'fixed',
    price: 300000,
    fullValue: 1200000,
    mortgage: 900000,
    monthlyIncome: 18000,
    risk: '中',
    desc: '天母一房一廳，頭期 30 萬、月淨租金 +18,000',
  },
  {
    id: 're_2r_shilin',
    name: '兩房一廳 ‧ 士林',
    emoji: '🏘️',
    category: 'realestate',
    location: '士林',
    roomType: '兩房一廳',
    kind: 'fixed',
    price: 450000,
    fullValue: 1800000,
    mortgage: 1350000,
    monthlyIncome: 26000,
    risk: '中',
    desc: '士林兩房一廳，頭期 45 萬、月淨租金 +26,000',
  },

  // ── 企業 / 副業（現代商業模式） ──
  {
    id: 'biz_vending',
    name: '自動販賣機台',
    emoji: '🥤',
    category: 'business',
    kind: 'fixed',
    price: 150000,
    fullValue: 150000,
    monthlyIncome: 6000,
    risk: '中',
    desc: '一次性投入 15 萬，月收 6,000，幾乎被動',
  },
  {
    id: 'biz_course',
    name: '線上課程',
    emoji: '🎓',
    category: 'business',
    kind: 'fixed',
    price: 80000,
    fullValue: 80000,
    monthlyIncome: 5000,
    risk: '中',
    desc: '錄一次賣很久，投入 8 萬、月收 5,000',
  },
];

export function getMarketItem(id) {
  return MARKET.find((m) => m.id === id) || null;
}

// 被動收入分類的中文標籤
export const PASSIVE_LABEL = {
  interest: '利息',
  dividend: '股利',
  realestate: '房地產',
  business: '企業',
};

// 各「可浮動商品」的每回合波動模型（給市場引擎用）
// drift＝每回合趨勢偏移；vol＝隨機波動幅度；cap＝單回合漲跌上限
// crypto/原物料另有極端行情機率（在 game.js 處理）
export const INSTRUMENT_VOL = {
  // 股票/ETF：長期偏多、單回合小波動，最多 ±10%
  dividend: { drift: 0.006, vol: 0.04, cap: 0.1 },
  // 原物料：中等波動
  commodity: { drift: 0.002, vol: 0.08, cap: 0.25 },
  // 加密貨幣：狂；每回合 ±5~50%，極低機率破百（在引擎特別處理）
  crypto: { drift: 0, vol: 0.25, cap: 1.5 },
};
