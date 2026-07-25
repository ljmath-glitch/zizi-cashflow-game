import { useEffect, useState } from 'react';
import { socket, ROOM } from '../socket.js';
import { BASE } from '../base.js';

// 房號守門：沒有房號或房號無效時擋下。
// 重要：房間存在伺服器記憶體，重新部署會短暫消失、再由 DB 自動還原；因此收到 room:invalid 時
// 不立刻放棄，而是「強制重連、重試幾次」（涵蓋伺服器重啟＋還原的數秒），期間顯示重新連線中，
// 收到 game:state 就代表房間回來了、自動接回。連續多次都失敗才判定房間真的不存在。
export default function RoomGuard({ children }) {
  const [status, setStatus] = useState('ok'); // 'ok' | 'retry' | 'gone'
  useEffect(() => {
    if (!ROOM) return;
    let tries = 0;
    let timer = null;
    function onInvalid() {
      tries += 1;
      if (tries >= 5) { setStatus('gone'); return; } // 約 10 秒仍找不到才放棄
      setStatus('retry');
      clearTimeout(timer);
      timer = setTimeout(() => { try { socket.disconnect(); socket.connect(); } catch {} }, 2000);
    }
    function onState() { tries = 0; clearTimeout(timer); setStatus('ok'); } // 收到狀態＝房間正常
    socket.on('room:invalid', onInvalid);
    socket.on('game:state', onState);
    return () => { socket.off('room:invalid', onInvalid); socket.off('game:state', onState); clearTimeout(timer); };
  }, []);

  if (!ROOM) return <RoomError note="這個網址沒有帶房號" />;
  if (status === 'gone') return <RoomError note={`房號 ${ROOM} 不存在或已結束`} />;
  return (
    <>
      {children}
      {status === 'retry' && (
        <div className="fixed inset-0 z-[80] bg-zizi-ink/80 backdrop-blur-sm flex flex-col items-center justify-center text-white text-center p-6">
          <div className="text-4xl mb-3 animate-pulse">🔄</div>
          <p className="text-xl font-bold mb-1">與伺服器重新連線中…</p>
          <p className="text-white/70">伺服器可能正在更新，稍候會自動接回遊戲</p>
        </div>
      )}
    </>
  );
}

function RoomError({ note }) {
  return (
    <div className="min-h-full screen-bg text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-3">🚪</div>
      <p className="text-xl font-bold mb-2">找不到房間</p>
      <p className="text-white/70 mb-6">{note}</p>
      <a href={BASE} className="rounded-xl bg-zizi-gold text-white font-bold px-6 py-3">
        回首頁建立 / 輸入房號
      </a>
    </div>
  );
}
