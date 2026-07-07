import { io } from 'socket.io-client';
import { BASE } from './base.js';

// 從網址讀房號（?room=ABC12）；連線時帶給伺服器，決定加入哪一場遊戲
const params = new URLSearchParams(window.location.search);
export const ROOM = (params.get('room') || '').toUpperCase();

// 單一 Socket.IO 連線實例（同源；房號放在 query）
// path 跟著部署基底走：獨立=/socket.io；掛在課務系統下=/cashflow/socket.io
export const socket = io({
  autoConnect: true,
  transports: ['websocket', 'polling'],
  path: BASE + 'socket.io',
  query: { room: ROOM },
});
