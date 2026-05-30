import { useEffect, useState, useCallback } from 'react';
import { socket } from '../socket.js';
import { onToast } from '../util/toast.js';

// 跳出式慶祝視窗：從上方滑入、點一下滑掉、4 秒自動消失
// 視覺：懸浮玻璃卡片 + 立體 emoji 徽章（脈動光環）+ 底部倒數條
// 同時接收伺服器推來的 student:event（額外支出、生小孩、失業、收購成交…）
export default function Toaster() {
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => {
    setItems((arr) => arr.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((arr) => arr.filter((t) => t.id !== id)), 300);
  }, []);

  const push = useCallback(
    (t) => {
      setItems((arr) => [...arr.slice(-3), t]); // 最多同時 4 個
      setTimeout(() => remove(t.id), 4000);
    },
    [remove]
  );

  useEffect(() => {
    const off = onToast(push);
    let seq = 100000;
    function onEvent(e) {
      push({ id: ++seq, emoji: e.emoji, title: e.title, text: e.text, tone: 'info' });
    }
    socket.on('student:event', onEvent);
    return () => {
      off();
      socket.off('student:event', onEvent);
    };
  }, [push]);

  // 局部高飽和色彩（乾淨背景中吸睛）：依語氣決定徽章與倒數條主色
  const tone = {
    good: { ring: 'ring-emerald-200/70', bar: 'bg-emerald-400', badge: 'from-emerald-400 to-emerald-600', glow: 'shadow-[0_18px_50px_-12px_rgba(16,185,129,0.55)]', text: 'text-emerald-950' },
    bad: { ring: 'ring-rose-200/70', bar: 'bg-rose-400', badge: 'from-rose-400 to-rose-600', glow: 'shadow-[0_18px_50px_-12px_rgba(244,63,94,0.55)]', text: 'text-rose-950' },
    info: { ring: 'ring-amber-200/70', bar: 'bg-amber-400', badge: 'from-zizi-gold to-amber-600', glow: 'shadow-[0_18px_50px_-12px_rgba(245,158,11,0.5)]', text: 'text-amber-950' },
  };

  return (
    <div className="fixed top-3 inset-x-0 z-50 flex flex-col items-center gap-2 px-3 pointer-events-none">
      {items.map((t) => {
        const c = tone[t.tone] || tone.good;
        return (
          <button
            key={t.id}
            onClick={() => remove(t.id)}
            className={
              'pointer-events-auto relative w-full max-w-sm text-left overflow-hidden rounded-3xl ' +
              'glass ring-1 ' + c.ring + ' ' + c.glow + ' px-3.5 py-3 ' +
              (t.leaving ? 'toast-out' : 'toast-pop')
            }
          >
            <div className="flex items-center gap-3">
              {/* 立體圓形徽章 + 脈動光環 */}
              <span
                className={
                  'badge-pulse shrink-0 grid place-items-center w-11 h-11 rounded-2xl text-2xl ' +
                  'bg-gradient-to-br ' + c.badge + ' text-white shadow-inner'
                }
              >
                {t.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className={'font-bold leading-tight ' + c.text}>{t.title}</p>
                {t.text && <p className="text-sm text-slate-600 mt-0.5 truncate">{t.text}</p>}
              </div>
              <span className="shrink-0 text-[0.6rem] text-slate-400 self-start mt-0.5">點一下關閉</span>
            </div>
            {/* 底部倒數條 */}
            <span className="absolute left-0 bottom-0 h-1 w-full bg-slate-200/40">
              <span className={'block h-full toast-bar ' + c.bar} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
