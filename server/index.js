// 茲茲財富自由挑戰賽 — 獨立部署進入點
// 遊戲本體在 server/app.js 的 mountCashflow()，這裡只負責建 Express + 開埠。
// （掛進課務系統時不走這支，由課務系統的 server.js 直接呼叫 mountCashflow）
import express from 'express';
import { createServer } from 'node:http';
import { getLanIp } from './lan.js';
import { mountCashflow } from './app.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json());
const httpServer = createServer(app);

// 開發模式不掛靜態檔（前端跑在 Vite 5173）；正式環境提供打包後的 dist
mountCashflow(app, httpServer, { base: '', serveStatic: isProd, port: PORT });

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('🎮  茲茲財富自由挑戰賽 — 伺服器已啟動（多房間）');
  console.log(`    本機： http://localhost:${PORT}`);
  console.log(`    區網： http://${getLanIp()}:${PORT}`);
  if (!isProd) console.log('    開發模式前端： http://localhost:5173');
  console.log('========================================');
});
