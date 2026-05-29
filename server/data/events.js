// 每月大事件（每回合開場廣播一則，影響三大類市場指數）
// effects 為「乘數」：1.10＝+10%、0.85＝-15%；未列到的類別只受基礎波動影響
// 三大浮動類別：stock（股票/ETF）、crypto（加密貨幣）、realestate（房地產）
export const MONTHLY_EVENTS = [
  { id: 'ai_boom', emoji: '🤖', title: 'AI 應用大爆發', desc: '科技股買氣旺，股市走高', effects: { stock: 1.12 } },
  { id: 'ai_correction', emoji: '📉', title: '科技股獲利回檔', desc: '漲多拉回，股市下修', effects: { stock: 0.9 } },
  { id: 'btc_etf', emoji: '🪙', title: '比特幣 ETF 通過，資金湧入', desc: '加密貨幣大漲', effects: { crypto: 1.35 } },
  { id: 'exchange_hack', emoji: '💥', title: '交易所遭駭、幣價暴跌', desc: '加密貨幣崩盤', effects: { crypto: 0.6 } },
  { id: 'rate_cut', emoji: '🏠', title: '央行降息，房市轉熱', desc: '房地產與股市同步走升', effects: { realestate: 1.08, stock: 1.05 } },
  { id: 'curb_house', emoji: '🏚️', title: '政府祭出打炒房', desc: '房地產降溫', effects: { realestate: 0.9 } },
  { id: 'global_growth', emoji: '🌎', title: '全球景氣穩定成長', desc: '各類資產溫和上漲', effects: { stock: 1.06, realestate: 1.03 } },
  { id: 'inflation', emoji: '⚠️', title: '通膨升溫、央行升息', desc: '股市與房市承壓', effects: { stock: 0.94, realestate: 0.96 } },
  { id: 'pandemic', emoji: '🦠', title: '新變種病毒擴散', desc: '避險情緒升高，風險資產下跌', effects: { stock: 0.9, crypto: 0.85 } },
  { id: 'retail_mania', emoji: '🚀', title: '散戶狂熱、迷因行情', desc: '股市與幣圈齊漲', effects: { stock: 1.1, crypto: 1.2 } },
  { id: 'black_swan', emoji: '😱', title: '黑天鵝事件、全球股災', desc: '全面下跌', effects: { stock: 0.8, crypto: 0.7, realestate: 0.95 } },
  { id: 'year_end', emoji: '🎉', title: '年終獎金、消費旺季', desc: '內需股受惠走高', effects: { stock: 1.05 } },
  { id: 'oil_surge', emoji: '🛢️', title: '油價飆漲、成本上升', desc: '企業獲利受壓、股市小跌', effects: { stock: 0.96 } },
  { id: 'tw_high', emoji: '🇹🇼', title: '台股創歷史新高', desc: '市場樂觀', effects: { stock: 1.1 } },
  { id: 'btc_halving', emoji: '⛏️', title: '比特幣減半行情', desc: '加密貨幣大漲', effects: { crypto: 1.4 } },
  { id: 'reit_hot', emoji: '🏢', title: '建商推案熱、北市房價漲', desc: '房地產上漲', effects: { realestate: 1.07 } },
  { id: 'calm', emoji: '🌤️', title: '平靜的一個月', desc: '市場波瀾不驚，小幅震盪', effects: {} },
  { id: 'mixed', emoji: '🔀', title: '資金輪動', desc: '錢從股市流向房市', effects: { stock: 0.97, realestate: 1.05 } },
];

// 各類別「基礎波動」範圍（即使沒事件也會小幅震盪）；加密貨幣最劇烈
export const SECTOR_VOLATILITY = {
  stock: 0.05, // ±5%
  realestate: 0.03, // ±3%
  crypto: 0.15, // ±15%
};

export function randomMonthlyEvent() {
  return MONTHLY_EVENTS[Math.floor(Math.random() * MONTHLY_EVENTS.length)];
}
