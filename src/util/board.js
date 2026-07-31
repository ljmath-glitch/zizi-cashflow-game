// 老鼠賽跑圈格子的顯示資料 + 環狀座標計算（學生端與大螢幕共用）
// screenColor＝大螢幕（深紫夜空底）用的半透明玻璃色塊；color＝學生端等淺色底用的實色
export const SQUARE_META = {
  opportunity: { label: '機會', emoji: '🎲', color: 'bg-emerald-500', screenColor: 'bg-emerald-500/25 ring-emerald-300/40' },
  doodad: { label: '額外支出', emoji: '💸', color: 'bg-rose-500', screenColor: 'bg-rose-500/25 ring-rose-300/40' },
  charity: { label: '慈善', emoji: '❤️', color: 'bg-pink-500', screenColor: 'bg-pink-500/25 ring-pink-300/40' },
  payday: { label: '發薪', emoji: '💰', color: 'bg-amber-500', screenColor: 'bg-amber-400/30 ring-amber-300/60' },
  market: { label: '市場', emoji: '📈', color: 'bg-teal-500', screenColor: 'bg-teal-500/25 ring-teal-300/40' },
  baby: { label: '生小孩', emoji: '👶', color: 'bg-violet-500', screenColor: 'bg-violet-500/30 ring-violet-300/40' },
  downsized: { label: '失業', emoji: '💼', color: 'bg-slate-500', screenColor: 'bg-slate-500/30 ring-slate-300/40' },
  bonus: { label: '好運', emoji: '🍀', color: 'bg-lime-500', screenColor: 'bg-lime-500/25 ring-lime-300/50' },
  surprise: { label: '驚喜', emoji: '🎁', color: 'bg-fuchsia-500', screenColor: 'bg-fuchsia-500/25 ring-fuchsia-300/50' },
  flash: { label: '快訊', emoji: '📰', color: 'bg-sky-500', screenColor: 'bg-sky-500/25 ring-sky-300/50' },
  sale: { label: '特賣', emoji: '🛒', color: 'bg-orange-500', screenColor: 'bg-orange-500/25 ring-orange-300/50' },
  quiz: { label: '快問答', emoji: '💡', color: 'bg-indigo-500', screenColor: 'bg-indigo-500/25 ring-indigo-300/50' },
};

// 24 格環狀跑道排成「長方形」外圈（寬 9 × 高 5，周長 = 2×(9+5)−4 = 24）。
// 改長方形是為了貼合 16:9 大螢幕、把格子放大、左右更寬。
// 順時針：上排 → 右排 ↓ → 下排 ← → 左排 ↑。
export const COLS = 9;
export const ROWS = 5;
// 保留舊名稱相容（學生端等若有引用 GRID 仍可用，取較大邊）
export const GRID = COLS;

export function cellOf(i) {
  // 上排：c = 0..COLS-1（共 COLS 格）
  if (i < COLS) return { r: 0, c: i };
  i -= COLS;
  // 右排：往下 r = 1..ROWS-1（共 ROWS-1 格）
  if (i < ROWS - 1) return { r: i + 1, c: COLS - 1 };
  i -= ROWS - 1;
  // 下排：往左 c = COLS-2..0（共 COLS-1 格）
  if (i < COLS - 1) return { r: ROWS - 1, c: COLS - 2 - i };
  i -= COLS - 1;
  // 左排：往上 r = ROWS-2..1（共 ROWS-2 格）
  return { r: ROWS - 2 - i, c: 0 };
}
