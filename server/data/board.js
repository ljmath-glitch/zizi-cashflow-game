// 老鼠賽跑圈：24 格的環狀跑道
// 格子類型：opportunity 機會、doodad 額外支出、charity 慈善、
//   payday 發薪、market 市場、baby 生小孩、downsized 失業
export const SQUARE_TYPES = {
  opportunity: { label: '機會', emoji: '🎲' },
  doodad: { label: '額外支出', emoji: '💸' },
  charity: { label: '慈善', emoji: '❤️' },
  payday: { label: '發薪', emoji: '💰' },
  market: { label: '市場', emoji: '📈' },
  baby: { label: '生小孩', emoji: '👶' },
  downsized: { label: '失業', emoji: '💼' },
};

// 24 格排列：發薪日均勻分布 3 格（骰子經過/停在才領當月現金流＝過了一個月）
// 機會最多、市場格次之，其餘人生事件穿插
const LAYOUT = [
  'opportunity', 'doodad', 'opportunity', 'charity',
  'opportunity', 'payday', 'opportunity', 'market',
  'opportunity', 'doodad', 'opportunity', 'baby',
  'opportunity', 'payday', 'opportunity', 'market',
  'opportunity', 'doodad', 'opportunity', 'downsized',
  'opportunity', 'payday', 'opportunity', 'market',
];

export const BOARD = LAYOUT.map((type, i) => ({
  index: i,
  type,
  label: SQUARE_TYPES[type].label,
  emoji: SQUARE_TYPES[type].emoji,
}));
