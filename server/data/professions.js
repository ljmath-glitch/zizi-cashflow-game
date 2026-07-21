// 8 種職業卡（v2：細分損益表與資產負債表，貼近真實現金流）
// expenses 各項：tax 稅金、homeMortgage 自住房貸、carLoan 車貸、
//   schoolLoan 學貸、creditCard 卡債、other 額外支出
// perChild 每個小孩月支出；liabilities 為各項負債餘額（計入淨資產，不影響月現金流）
// 註：各項 expenses 加總 = 該職業原本的「月支出」，方便沿用平衡性
export const PROFESSIONS = [
  {
    id: 'doctor',
    name: '醫師',
    emoji: '🩺',
    salary: 150000,
    variableIncome: null,
    expenses: { tax: 35000, homeMortgage: 20000, carLoan: 8000, schoolLoan: 15000, creditCard: 4000, other: 13000 },
    perChild: 5000,
    savings: 50000,
    liabilities: { homeMortgage: 2400000, carLoan: 500000, schoolLoan: 1000000, creditCard: 60000 },
    perk: '高薪高支出、高學貸（房貸車貸壓力大）',
  },
  {
    id: 'engineer',
    name: '工程師',
    emoji: '💻',
    salary: 80000,
    variableIncome: null,
    expenses: { tax: 12000, homeMortgage: 15000, carLoan: 6000, schoolLoan: 5000, creditCard: 2000, other: 5000 },
    perChild: 3500,
    savings: 100000,
    liabilities: { homeMortgage: 1800000, carLoan: 400000, schoolLoan: 300000, creditCard: 30000 },
    perk: '中高薪、起始存款多、適合投資科技股',
  },
  {
    id: 'teacher',
    name: '老師',
    emoji: '🧑‍🏫',
    salary: 55000,
    variableIncome: null,
    expenses: { tax: 6000, homeMortgage: 10000, carLoan: 4000, schoolLoan: 4000, creditCard: 1500, other: 4500 },
    perChild: 3000,
    savings: 80000,
    liabilities: { homeMortgage: 1200000, carLoan: 250000, schoolLoan: 250000, creditCard: 20000 },
    perk: '收支穩定、負債較輕',
  },
  {
    id: 'youtuber',
    name: 'YouTuber',
    emoji: '🎬',
    salary: 60000, // 代表值；每月於 variableIncome 範圍內浮動
    variableIncome: [30000, 120000],
    expenses: { tax: 5000, homeMortgage: 0, carLoan: 3000, schoolLoan: 2000, creditCard: 3000, other: 12000 },
    perChild: 3000,
    savings: 30000,
    liabilities: { homeMortgage: 0, carLoan: 200000, schoolLoan: 150000, creditCard: 40000 },
    perk: '收入浮動大（30k–120k）、租屋無房貸',
  },
  {
    id: 'restaurant',
    name: '餐廳老闆',
    emoji: '🍜',
    salary: 70000,
    variableIncome: null,
    incomeFollowsMarket: true, // 收入隨「本回合市場景氣」起伏
    expenses: { tax: 8000, homeMortgage: 12000, carLoan: 6000, schoolLoan: 0, creditCard: 4000, other: 10000 },
    perChild: 3500,
    savings: 60000,
    liabilities: { homeMortgage: 1500000, carLoan: 400000, schoolLoan: 0, creditCard: 50000 },
    perk: '🍜 生意隨景氣起伏：市場好收入↑、差則↓',
  },
  {
    id: 'police',
    name: '警察',
    emoji: '👮',
    salary: 50000,
    variableIncome: null,
    layoffImmune: true, // 鐵飯碗：免於「失業」事件
    expenses: { tax: 5000, homeMortgage: 9000, carLoan: 5000, schoolLoan: 2000, creditCard: 2000, other: 5000 },
    perChild: 3000,
    savings: 50000,
    liabilities: { homeMortgage: 1100000, carLoan: 300000, schoolLoan: 120000, creditCard: 25000 },
    perk: '🛡️ 鐵飯碗：穩定、不會被裁員（免失業）',
  },
  {
    id: 'sales',
    name: '業務員',
    emoji: '💼',
    salary: 45000, // 代表值；每月在 variableIncome 範圍內依「業績」浮動
    variableIncome: [20000, 70000], // 業績提成：時好時壞
    expenses: { tax: 3000, homeMortgage: 0, carLoan: 4000, schoolLoan: 3000, creditCard: 5000, other: 10000 },
    perChild: 2500,
    savings: 20000,
    liabilities: { homeMortgage: 0, carLoan: 250000, schoolLoan: 200000, creditCard: 60000 },
    perk: '📈 業績浮動（20k–70k）、卡債高，靠提成與投資翻身',
  },
  {
    id: 'nurse',
    name: '護理師',
    emoji: '🩹',
    salary: 48000,
    variableIncome: null,
    expenses: { tax: 4000, homeMortgage: 8000, carLoan: 4000, schoolLoan: 4000, creditCard: 2000, other: 4000 },
    perChild: 3000,
    savings: 40000,
    liabilities: { homeMortgage: 1000000, carLoan: 250000, schoolLoan: 250000, creditCard: 25000 },
    perk: '穩定、可兼差',
  },
  {
    id: 'lawyer',
    name: '律師',
    emoji: '⚖️',
    salary: 120000,
    variableIncome: null,
    expenses: { tax: 28000, homeMortgage: 18000, carLoan: 8000, schoolLoan: 12000, creditCard: 4000, other: 12000 },
    perChild: 4500,
    savings: 60000,
    liabilities: { homeMortgage: 2200000, carLoan: 500000, schoolLoan: 900000, creditCard: 60000 },
    perk: '高薪、高學貸',
  },
  {
    id: 'pilot',
    name: '機師',
    emoji: '✈️',
    salary: 130000,
    variableIncome: null,
    expenses: { tax: 30000, homeMortgage: 18000, carLoan: 9000, schoolLoan: 6000, creditCard: 3000, other: 14000 },
    perChild: 4500,
    savings: 80000,
    liabilities: { homeMortgage: 2400000, carLoan: 600000, schoolLoan: 400000, creditCard: 40000 },
    perk: '高薪、高消費誘惑',
  },
  {
    id: 'manager',
    name: '公司經理',
    emoji: '👔',
    salary: 90000,
    variableIncome: null,
    expenses: { tax: 15000, homeMortgage: 16000, carLoan: 7000, schoolLoan: 4000, creditCard: 3000, other: 8000 },
    perChild: 4000,
    savings: 90000,
    liabilities: { homeMortgage: 1900000, carLoan: 450000, schoolLoan: 250000, creditCard: 35000 },
    perk: '中高薪、存款多',
  },
  {
    id: 'flightattendant',
    name: '空服員',
    emoji: '🧳',
    salary: 60000,
    variableIncome: null,
    expenses: { tax: 7000, homeMortgage: 9000, carLoan: 4000, schoolLoan: 3000, creditCard: 3000, other: 7000 },
    perChild: 3000,
    savings: 50000,
    liabilities: { homeMortgage: 1000000, carLoan: 250000, schoolLoan: 180000, creditCard: 30000 },
    perk: '收入中等、愛旅遊購物',
  },
  {
    id: 'civilservant',
    name: '公務員',
    emoji: '🏛️',
    salary: 52000,
    variableIncome: null,
    layoffImmune: true, // 鐵飯碗：免於「失業」事件
    expenses: { tax: 5000, homeMortgage: 9000, carLoan: 4000, schoolLoan: 2000, creditCard: 1500, other: 4500 },
    perChild: 3000,
    savings: 70000,
    liabilities: { homeMortgage: 1100000, carLoan: 250000, schoolLoan: 120000, creditCard: 15000 },
    perk: '🛡️ 鐵飯碗：超穩定、不會被裁員（免失業）',
  },
  {
    id: 'chef',
    name: '廚師',
    emoji: '👨‍🍳',
    salary: 45000,
    variableIncome: null,
    incomeFollowsMarket: true, // 收入隨「本回合市場景氣」起伏
    expenses: { tax: 3500, homeMortgage: 7000, carLoan: 4000, schoolLoan: 1500, creditCard: 3000, other: 6000 },
    perChild: 2800,
    savings: 35000,
    liabilities: { homeMortgage: 900000, carLoan: 250000, schoolLoan: 80000, creditCard: 35000 },
    perk: '🍳 生意隨景氣起伏，有機會自己開店',
  },
  {
    id: 'ecommerce',
    name: '電商賣家',
    emoji: '🛍️',
    salary: 50000,
    variableIncome: [20000, 100000],
    expenses: { tax: 4000, homeMortgage: 0, carLoan: 3000, schoolLoan: 2000, creditCard: 4000, other: 12000 },
    perChild: 3000,
    savings: 40000,
    liabilities: { homeMortgage: 0, carLoan: 200000, schoolLoan: 150000, creditCard: 50000 },
    perk: '收入浮動（20k–100k）、租屋',
  },
  {
    id: 'clerk',
    name: '超商店員',
    emoji: '🏪',
    salary: 32000,
    variableIncome: null,
    expenses: { tax: 1500, homeMortgage: 0, carLoan: 0, schoolLoan: 2000, creditCard: 3000, other: 9500 },
    perChild: 2500,
    savings: 15000,
    liabilities: { homeMortgage: 0, carLoan: 0, schoolLoan: 150000, creditCard: 40000 },
    perk: '低薪租屋族，最需要靠投資翻身',
  },
  {
    id: 'firefighter',
    name: '消防員',
    emoji: '🚒',
    salary: 54000,
    variableIncome: null,
    layoffImmune: true, // 鐵飯碗：免於「失業」事件
    expenses: { tax: 6000, homeMortgage: 10000, carLoan: 5000, schoolLoan: 3000, creditCard: 2000, other: 5000 },
    perChild: 3000,
    savings: 55000,
    liabilities: { homeMortgage: 1200000, carLoan: 300000, schoolLoan: 200000, creditCard: 20000 },
    perk: '🛡️ 打火英雄鐵飯碗：穩定、不會被裁員（免失業）',
  },
  {
    id: 'vet',
    name: '獸醫',
    emoji: '🐾',
    salary: 85000,
    variableIncome: null,
    expenses: { tax: 13000, homeMortgage: 14000, carLoan: 6000, schoolLoan: 6000, creditCard: 2000, other: 5000 },
    perChild: 3500,
    savings: 90000,
    liabilities: { homeMortgage: 1700000, carLoan: 400000, schoolLoan: 400000, creditCard: 30000 },
    perk: '中高薪、專業穩定，寵物商機夯',
  },
  {
    id: 'streamer',
    name: '遊戲實況主',
    emoji: '🎮',
    salary: 55000, // 代表值；每月於 variableIncome 範圍內浮動（斗內/訂閱）
    variableIncome: [20000, 140000],
    expenses: { tax: 4000, homeMortgage: 0, carLoan: 3000, schoolLoan: 2000, creditCard: 4000, other: 13000 },
    perChild: 3000,
    savings: 30000,
    liabilities: { homeMortgage: 0, carLoan: 200000, schoolLoan: 150000, creditCard: 50000 },
    perk: '🎁 斗內收入暴起暴落（20k–140k）、租屋族',
  },
  {
    id: 'barista',
    name: '咖啡廳店長',
    emoji: '☕',
    salary: 46000,
    variableIncome: null,
    incomeFollowsMarket: true, // 收入隨「本回合市場景氣」起伏
    expenses: { tax: 4000, homeMortgage: 8000, carLoan: 4000, schoolLoan: 2000, creditCard: 3000, other: 6000 },
    perChild: 2800,
    savings: 35000,
    liabilities: { homeMortgage: 950000, carLoan: 250000, schoolLoan: 100000, creditCard: 30000 },
    perk: '☕ 生意隨景氣起伏，客人多就賺',
  },
  {
    id: 'hairstylist',
    name: '髮型設計師',
    emoji: '💇',
    salary: 42000, // 代表值；業績＋小費在 variableIncome 範圍內浮動
    variableIncome: [25000, 65000],
    expenses: { tax: 3000, homeMortgage: 0, carLoan: 3000, schoolLoan: 2000, creditCard: 4000, other: 10000 },
    perChild: 2500,
    savings: 25000,
    liabilities: { homeMortgage: 0, carLoan: 200000, schoolLoan: 120000, creditCard: 45000 },
    perk: '✂️ 收入看業績與小費（25k–65k）、租屋',
  },
  {
    id: 'security',
    name: '保全',
    emoji: '🛡️',
    salary: 38000,
    variableIncome: null,
    layoffImmune: true, // 鐵飯碗：免於「失業」事件
    expenses: { tax: 2500, homeMortgage: 0, carLoan: 0, schoolLoan: 2000, creditCard: 3000, other: 10000 },
    perChild: 2500,
    savings: 20000,
    liabilities: { homeMortgage: 0, carLoan: 0, schoolLoan: 120000, creditCard: 35000 },
    perk: '🛡️ 低薪但穩定、不會被裁員，靠投資翻身',
  },
];

// 養小孩每月支出依「家庭背景（薪資階級）」拉開差距：越高薪的家庭，養一個小孩越貴
// （私校、才藝、補習、生活水準…），越低薪則較省。用薪資級距重算，取代上面各職業 perChild 的初值。
// 浮動收入職業用範圍中位數當代表薪資。
for (const p of PROFESSIONS) {
  const s = p.variableIncome ? (p.variableIncome[0] + p.variableIncome[1]) / 2 : p.salary;
  p.perChild =
    s >= 110000 ? 8000 : // 頂尖高薪（醫師/機師/律師）
    s >= 78000 ? 5500 : // 高薪（經理/獸醫/工程師/實況主）
    s >= 58000 ? 4000 : // 中高（餐廳/YouTuber/空服/電商）
    s >= 50000 ? 3200 : // 中等（老師/消防/公務員/警察）
    s >= 44000 ? 2700 : // 中低（護理/咖啡店長/廚師/業務/髮型師）
    2000;               // 低薪（保全/超商店員）
}

// 銀行風控角度：收入浮動大（variableIncome）的職業＝還款穩定度低＝風險高，
// 起手的房貸／學貸「利息（月付）」會被抓高一點（差異不大：房貸 ×1.12、學貸 ×1.15，取整到百）。
// 多數浮動職業是租屋族（房貸 0），實際多反映在學貸上，貼近現實。
for (const p of PROFESSIONS) {
  if (!p.variableIncome) continue;
  if (p.expenses.homeMortgage > 0) p.expenses.homeMortgage = Math.round((p.expenses.homeMortgage * 1.12) / 100) * 100;
  if (p.expenses.schoolLoan > 0) p.expenses.schoolLoan = Math.round((p.expenses.schoolLoan * 1.15) / 100) * 100;
}

export function getProfession(id) {
  return PROFESSIONS.find((p) => p.id === id) || null;
}

export function randomProfession() {
  return PROFESSIONS[Math.floor(Math.random() * PROFESSIONS.length)];
}
