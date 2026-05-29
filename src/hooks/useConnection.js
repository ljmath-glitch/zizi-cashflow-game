import { useEffect, useState } from 'react';
import { socket } from '../socket.js';

// 共用 Hook：追蹤與後端的連線狀態，並接收伺服器歡迎訊息
export function useConnection() {
  const [connected, setConnected] = useState(socket.connected);
  const [hello, setHello] = useState(null);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onHello(data) {
      setHello(data);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('server:hello', onHello);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('server:hello', onHello);
    };
  }, []);

  return { connected, hello };
}
