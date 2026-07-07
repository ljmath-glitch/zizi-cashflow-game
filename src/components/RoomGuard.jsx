import { useEffect, useState } from 'react';
import { socket, ROOM } from '../socket.js';
import { BASE } from '../base.js';

// 房號守門：沒有房號或房號無效時，擋下並引導回首頁
export default function RoomGuard({ children }) {
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    function onInvalid() {
      setInvalid(true);
    }
    socket.on('room:invalid', onInvalid);
    return () => socket.off('room:invalid', onInvalid);
  }, []);

  if (!ROOM || invalid) {
    return (
      <div className="min-h-full screen-bg text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-3">🚪</div>
        <p className="text-xl font-bold mb-2">找不到房間</p>
        <p className="text-white/70 mb-6">
          {ROOM ? `房號 ${ROOM} 不存在或已結束` : '這個網址沒有帶房號'}
        </p>
        <a href={BASE} className="rounded-xl bg-zizi-gold text-white font-bold px-6 py-3">
          回首頁建立 / 輸入房號
        </a>
      </div>
    );
  }
  return children;
}
