import { io } from 'socket.io-client';

// 單一 Socket.IO 連線實例（同源連線）
// 開發時前端在 5173，由 Vite proxy 轉發 /socket.io 到後端 3000；正式環境則同為 3000
export const socket = io({
  autoConnect: true,
  transports: ['websocket', 'polling'],
});
