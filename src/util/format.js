// 把秒數格式化為 mm:ss
export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

// 把金額格式化為 $1,234,567
export function formatMoney(n) {
  return '$' + Math.round(n || 0).toLocaleString('en-US');
}

// 遊戲階段的中文標籤
export const PHASE_LABEL = {
  lobby: '等待開始',
  running: '進行中',
  paused: '已暫停',
  ended: '遊戲結束',
};
