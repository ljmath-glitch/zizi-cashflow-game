// 老鼠賽跑圈格子的顯示資料 + 環狀座標計算（學生端與大螢幕共用）
export const SQUARE_META = {
  opportunity: { label: '機會', emoji: '🎲', color: 'bg-emerald-500' },
  doodad: { label: '額外支出', emoji: '💸', color: 'bg-rose-500' },
  charity: { label: '慈善', emoji: '❤️', color: 'bg-pink-500' },
  payday: { label: '發薪', emoji: '💰', color: 'bg-amber-500' },
  market: { label: '市場', emoji: '📈', color: 'bg-teal-500' },
  baby: { label: '生小孩', emoji: '👶', color: 'bg-violet-500' },
  downsized: { label: '失業', emoji: '💼', color: 'bg-slate-500' },
};

// 24 格環狀跑道排在 7×7 格線的外圈，順時針從左上角開始
export const GRID = 7;
export function cellOf(i) {
  if (i <= 6) return { r: 0, c: i }; // 上排 0–6
  if (i <= 12) return { r: i - 6, c: 6 }; // 右排 7–12
  if (i <= 18) return { r: 6, c: 6 - (i - 12) }; // 下排 13–18
  return { r: 6 - (i - 18), c: 0 }; // 左排 19–23
}
