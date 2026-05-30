// 極簡的彈窗（toast）發布訂閱：任何地方呼叫 toast(...) 就會跳出慶祝視窗
const listeners = new Set();
let seq = 0;

// toast({ emoji, title, text, tone })  tone: 'good'|'bad'|'info'
export function toast(opts) {
  const t = { id: ++seq, tone: 'good', ...opts };
  listeners.forEach((l) => l(t));
}

export function onToast(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
