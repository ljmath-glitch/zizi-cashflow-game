// 茲茲一百萬挑戰賽 — 後端伺服器
// Express 提供前端 + Socket.IO 即時通訊，全部跑在同一個連接埠（預設 3000）
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLanIp } from './lan.js';
import {
  initGame,
  getPublicState,
  startGame,
  pauseGame,
  nextRound,
  resetGame,
  setConfig,
  skipTurn,
  toggleTutorial,
  setSpotlight,
  createTeam,
  getTeam,
  getTeamPayload,
  professionPair,
  listPublicTeams,
  buyAsset,
  sellAsset,
  loanMoney,
  repayLoan,
  repayDebt,
  rollDice,
  chooseDeck,
  dealDecision,
  charityDecision,
  acquireDecision,
  getFeed,
  getSnapshot,
  loadSnapshot,
  clearGame,
} from './game.js';
import { MARKET } from './data/assets.js';
import { BOARD } from './data/board.js';
import {
  ensureSavesDir,
  saveToFile,
  loadFromFile,
  listSaves,
  timestampName,
} from './storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }, // 區網內不同裝置連入，開發階段先全開
});

const lanIp = getLanIp();

// 初始化遊戲狀態管理（讓 game 模組能透過 io 廣播）
initGame(io);

// 伺服器啟動時自動還原上次的自動存檔（斷電 / 重啟可接續）
ensureSavesDir();
const autosave = loadFromFile('autosave.json');
if (autosave) {
  loadSnapshot(autosave);
  console.log('💾 已載入自動存檔 autosave.json');
}

// 提供伺服器資訊（區網 IP / 連接埠）→ 大螢幕端用來產生學生掃描的 QR Code
app.get('/api/server-info', (req, res) => {
  res.json({ lanIp, port: PORT });
});

// 提供市場投資商品清單（學生端市場分頁用）
app.get('/api/market', (req, res) => {
  res.json(MARKET);
});

// 提供老鼠賽跑圈格子配置（大螢幕畫盤面用）
app.get('/api/board', (req, res) => {
  res.json(BOARD);
});

// Socket.IO 連線
io.on('connection', (socket) => {
  console.log('🔌 連線：', socket.id);
  socket.emit('server:hello', {
    message: '已連上茲茲伺服器',
    lanIp,
    port: PORT,
  });

  // 一連上就同步目前遊戲狀態、組別清單與最新動態
  socket.emit('game:state', getPublicState());
  socket.emit('teams:list', listPublicTeams());
  socket.emit('feed:list', getFeed());

  // ── 老師端控制事件 ──
  socket.on('teacher:start', () => startGame());
  socket.on('teacher:pause', () => pauseGame());
  socket.on('teacher:nextRound', () => nextRound());
  socket.on('teacher:skipTurn', () => skipTurn());
  socket.on('teacher:tutorial', ({ show } = {}) => toggleTutorial(show));
  socket.on('teacher:spotlight', ({ teamId } = {}) => setSpotlight(teamId));
  socket.on('teacher:reset', () => resetGame());
  socket.on('teacher:clear', () => clearGame());
  socket.on('teacher:setConfig', (cfg) => setConfig(cfg || {}));

  // 手動存檔（時間戳檔名）
  socket.on('teacher:save', (_payload, ack) => {
    try {
      const filename = saveToFile(timestampName(), getSnapshot());
      if (typeof ack === 'function') ack({ ok: true, filename });
    } catch (e) {
      if (typeof ack === 'function') ack({ ok: false, reason: e.message });
    }
  });

  // 列出存檔清單
  socket.on('teacher:listSaves', (_payload, ack) => {
    if (typeof ack === 'function') ack({ ok: true, saves: listSaves() });
  });

  // 載入指定存檔 → 還原所有組別狀態
  socket.on('teacher:load', ({ name } = {}, ack) => {
    const data = loadFromFile(name);
    if (!data) {
      if (typeof ack === 'function') ack({ ok: false, reason: '讀取失敗' });
      return;
    }
    loadSnapshot(data);
    if (typeof ack === 'function') ack({ ok: true });
  });

  // ── 學生端事件 ──
  // 加入遊戲：建立組別 + 抽職業卡，回傳該組完整資料
  // 開局抽兩張職業卡讓玩家二選一
  socket.on('student:offerProfessions', (_payload, ack) => {
    if (typeof ack === 'function') ack({ ok: true, options: professionPair() });
  });

  socket.on('student:join', ({ name, professionId } = {}, ack) => {
    const team = createTeam(name, professionId);
    socket.join('team:' + team.id); // 加入該組房間，之後財務更新只推給同組
    const payload = getTeamPayload(team.id);
    socket.emit('student:team', payload);
    if (typeof ack === 'function') ack({ ok: true, team: payload });
  });

  // 重新連線：用 teamId 還原（手機重新整理 / 斷線後）
  socket.on('student:resume', ({ teamId } = {}, ack) => {
    const team = getTeam(teamId);
    if (!team) {
      if (typeof ack === 'function') ack({ ok: false });
      return;
    }
    socket.join('team:' + team.id);
    const payload = getTeamPayload(team.id);
    socket.emit('student:team', payload);
    if (typeof ack === 'function') ack({ ok: true, team: payload });
  });

  // 買入 / 賣出資產
  socket.on('student:buy', (payload = {}, ack) => {
    const res = buyAsset(payload.teamId, payload);
    if (typeof ack === 'function') ack(res);
  });

  socket.on('student:sell', ({ teamId, ...payload } = {}, ack) => {
    const res = sellAsset(teamId, payload);
    if (typeof ack === 'function') ack(res);
  });

  // 銀行貸款 / 還款
  socket.on('student:loan', ({ teamId, amount } = {}, ack) => {
    const res = loanMoney(teamId, amount);
    if (typeof ack === 'function') ack(res);
  });
  socket.on('student:repay', ({ teamId, amount } = {}, ack) => {
    const res = repayLoan(teamId, amount);
    if (typeof ack === 'function') ack(res);
  });
  socket.on('student:repayDebt', ({ teamId, key } = {}, ack) => {
    const res = repayDebt(teamId, key);
    if (typeof ack === 'function') ack(res);
  });

  // 擲骰移動
  socket.on('student:roll', ({ teamId } = {}, ack) => {
    const res = rollDice(teamId);
    if (typeof ack === 'function') ack(res);
  });

  // 機會卡：選小生意/大買賣
  socket.on('student:chooseDeck', ({ teamId, deck } = {}, ack) => {
    const res = chooseDeck(teamId, deck);
    if (typeof ack === 'function') ack(res);
  });

  // 機會卡：買或放棄
  socket.on('student:dealDecision', ({ teamId, accept, withLoan } = {}, ack) => {
    const res = dealDecision(teamId, accept, withLoan);
    if (typeof ack === 'function') ack(res);
  });

  // 慈善：捐或不捐
  socket.on('student:charityDecision', ({ teamId, donate } = {}, ack) => {
    const res = charityDecision(teamId, donate);
    if (typeof ack === 'function') ack(res);
  });

  // 房地產收購：賣或不賣
  socket.on('student:acquireDecision', ({ teamId, accept } = {}, ack) => {
    const res = acquireDecision(teamId, accept);
    if (typeof ack === 'function') ack(res);
  });

  socket.on('disconnect', () => {
    console.log('❌ 斷線：', socket.id);
  });
});

// 正式環境（npm start）：由 Express 直接提供打包後的前端
// 開發環境（npm run dev）：前端由 Vite 跑在 5173，這裡不需要提供靜態檔
if (isProd) {
  const distPath = path.join(ROOT, 'dist');
  app.use(express.static(distPath));
  // SPA fallback：非 API 路由都回傳 index.html，交給前端路由處理
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('🎮  茲茲一百萬挑戰賽 — 伺服器已啟動');
  console.log(`    本機： http://localhost:${PORT}`);
  console.log(`    區網： http://${lanIp}:${PORT}`);
  if (!isProd) {
    console.log('');
    console.log('    開發模式：請開前端 Vite 網址 → http://localhost:5173');
    console.log('    （教室正式使用請改用：npm run build 然後 npm start）');
  }
  console.log('========================================');
});
