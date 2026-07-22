// 老鼠賽跑圈：24 格的環狀跑道
// 格子類型：opportunity 機會、doodad 額外支出、charity 慈善、
//   payday 發薪、market 市場、baby 生小孩、downsized 失業、bonus 好運（小賺）
export const SQUARE_TYPES = {
  opportunity: { label: '機會', emoji: '🎲' },
  doodad: { label: '額外支出', emoji: '💸' },
  charity: { label: '慈善', emoji: '❤️' },
  payday: { label: '發薪', emoji: '💰' },
  market: { label: '市場', emoji: '📈' },
  baby: { label: '生小孩', emoji: '👶' },
  downsized: { label: '失業', emoji: '💼' },
  bonus: { label: '好運', emoji: '🍀' },
};

// 24 格排列：發薪日均勻分布 3 格（骰子經過/停在才領當月現金流＝過了一個月）
// 配置：機會 9、市場 5、發薪 3、額外支出 2、好運 1、慈善 2、生小孩 1、失業 1
// 額外支出降為 2 格（原 3 格太常花錢），改放 1 格「好運」讓玩家偶爾小賺
const LAYOUT = [
  'opportunity', 'doodad', 'market', 'opportunity',
  'charity', 'payday', 'opportunity', 'market',
  'doodad', 'opportunity', 'baby', 'market',
  'opportunity', 'payday', 'opportunity', 'bonus',
  'market', 'opportunity', 'charity', 'downsized',
  'opportunity', 'payday', 'opportunity', 'market',
];

// 初階盤面（給國中生第一次玩）：只有 發薪/機會/額外支出/好運，
// 沒有市場漲跌、慈善、生小孩、失業。機會多（買資產養被動收入）、發薪與好運多、額外支出少。
const LAYOUT_BASIC = [
  'opportunity', 'payday', 'bonus', 'opportunity',
  'doodad', 'opportunity', 'payday', 'bonus',
  'opportunity', 'doodad', 'opportunity', 'payday',
  'bonus', 'opportunity', 'doodad', 'opportunity',
  'payday', 'bonus', 'opportunity', 'doodad',
  'opportunity', 'payday', 'bonus', 'opportunity',
];

function makeBoard(layout) {
  return layout.map((type, i) => ({
    index: i,
    type,
    label: SQUARE_TYPES[type].label,
    emoji: SQUARE_TYPES[type].emoji,
  }));
}

export const BOARD = makeBoard(LAYOUT); // 完整版（相容既有 import）
export const BOARD_BASIC = makeBoard(LAYOUT_BASIC);

// 依遊戲階段取盤面：'basic' 初階 / 其他為完整版
export function boardFor(stage) {
  return stage === 'basic' ? BOARD_BASIC : BOARD;
}
