// 茲茲一百萬挑戰賽 — 後端伺服器（多房間版）
// Express 提供前端 + Socket.IO 即時通訊，全部跑在同一個連接埠（預設 3000）
// 每個「房間」是一場獨立的遊戲，用房號隔開；同一網址可同時開很多場。
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLanIp } from './lan.js';
import { initGame, createRoom, getRoom, roomExists } from './game.js';
import { MARKET } from './data/assets.js';
import { BOARD } from './data/board.js';
import { ensureSavesDir, saveToFile, loadFromFile, listSaves, timestampName } from './storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const lanIp = getLanIp();

initGame(io);
ensureSavesDir();

// 伺服器資訊（區網 IP / 連接埠）
app.get('/api/server-info', (req, res) => res.json({ lanIp, port: PORT }));
// 市場商品、盤面格子
app.get('/api/market', (req, res) => res.json(MARKET));
app.get('/api/board', (req, res) => res.json(BOARD));

// 建立新房間 → 回傳房號
app.post('/api/rooms', (req, res) => {
  const code = createRoom();
  console.log('🏠 建立房間：', code);
  res.json({ code });
});
// 查詢房號是否存在
app.get('/api/room-exists', (req, res) => {
  res.json({ exists: roomExists(req.query.code) });
});

// 取得此 socket 所屬房間
function roomOf(socket) {
  return getRoom(socket.data.code);
}

// 確保此 socket 仍在自己的「隊伍房間」（emitTeam 用這個房間廣播）。
// 手機在行動網路/雲端常斷線重連，重連後若沒回到房間，伺服器的 student:team 更新就送不到，
// 會造成彈窗關不掉、按了像沒反應。每個學生動作前都補一次 join（idempotent，重覆呼叫無害）。
function ensureTeamRoom(socket, teamId) {
  if (socket.data.code && teamId) socket.join(socket.data.code + '|team:' + teamId);
}

io.on('connection', (socket) => {
  const code = String(socket.handshake.query.room || '').toUpperCase();
  const room = getRoom(code);
  socket.data.code = room ? code : null;

  socket.emit('server:hello', { message: '已連上茲茲伺服器', lanIp, port: PORT });

  if (!room) {
    // 沒有有效房號 → 通知前端（顯示「房間不存在」並回首頁建立/輸入房號）
    socket.emit('room:invalid', { code });
    return;
  }

  socket.join(code); // 加入該房間，之後廣播只送這間
  console.log(`🔌 連線 ${socket.id} → 房間 ${code}`);

  // 一連上就同步該房間目前狀態
  socket.emit('game:state', room.getPublicState());
  socket.emit('teams:list', room.listPublicTeams());
  socket.emit('feed:list', room.getFeed());

  // ── 老師端控制 ──
  socket.on('teacher:start', () => roomOf(socket)?.startGame());
  socket.on('teacher:pause', () => roomOf(socket)?.pauseGame());
  socket.on('teacher:nextRound', () => roomOf(socket)?.nextRound());
  socket.on('teacher:skipTurn', () => roomOf(socket)?.skipTurn());
  socket.on('teacher:tutorial', ({ show } = {}) => roomOf(socket)?.toggleTutorial(show));
  socket.on('teacher:spotlight', ({ teamId } = {}) => roomOf(socket)?.setSpotlight(teamId));
  socket.on('teacher:reset', () => roomOf(socket)?.resetGame());
  socket.on('teacher:clear', () => roomOf(socket)?.clearGame());
  socket.on('teacher:setConfig', (cfg) => roomOf(socket)?.setConfig(cfg || {}));

  // 存檔 / 載入（以房間為單位，檔名帶房號）
  socket.on('teacher:save', (_p, ack) => {
    const r = roomOf(socket);
    if (!r) return ack?.({ ok: false, reason: '房間不存在' });
    try {
      const filename = saveToFile(`room_${socket.data.code}_${timestampName()}`, r.getSnapshot());
      ack?.({ ok: true, filename });
    } catch (e) {
      ack?.({ ok: false, reason: e.message });
    }
  });
  socket.on('teacher:listSaves', (_p, ack) => {
    const prefix = `room_${socket.data.code}_`;
    ack?.({ ok: true, saves: listSaves().filter((s) => s.name.startsWith(prefix)) });
  });
  socket.on('teacher:load', ({ name } = {}, ack) => {
    const r = roomOf(socket);
    const data = r && loadFromFile(name);
    if (!data) return ack?.({ ok: false, reason: '讀取失敗' });
    r.loadSnapshot(data);
    ack?.({ ok: true });
  });

  // ── 學生端 ──
  socket.on('student:offerProfessions', (_p, ack) => {
    const r = roomOf(socket);
    ack?.(r ? { ok: true, options: r.professionPair() } : { ok: false });
  });
  socket.on('student:join', ({ name, professionId } = {}, ack) => {
    const r = roomOf(socket);
    if (!r) return ack?.({ ok: false, reason: '房間不存在' });
    const team = r.createTeam(name, professionId);
    socket.join(socket.data.code + '|team:' + team.id);
    const payload = r.getTeamPayload(team.id);
    socket.emit('student:team', payload);
    ack?.({ ok: true, team: payload });
  });
  socket.on('student:resume', ({ teamId } = {}, ack) => {
    const r = roomOf(socket);
    const team = r && r.getTeam(teamId);
    if (!team) return ack?.({ ok: false });
    socket.join(socket.data.code + '|team:' + team.id);
    const payload = r.getTeamPayload(team.id);
    socket.emit('student:team', payload);
    ack?.({ ok: true, team: payload });
  });
  socket.on('student:buy', (payload = {}, ack) => { ensureTeamRoom(socket, payload.teamId); ack?.(roomOf(socket)?.buyAsset(payload.teamId, payload) || { ok: false }); });
  socket.on('student:sell', ({ teamId, ...payload } = {}, ack) => { ensureTeamRoom(socket, teamId); ack?.(roomOf(socket)?.sellAsset(teamId, payload) || { ok: false }); });
  socket.on('student:loan', ({ teamId, amount } = {}, ack) => { ensureTeamRoom(socket, teamId); ack?.(roomOf(socket)?.loanMoney(teamId, amount) || { ok: false }); });
  socket.on('student:repay', ({ teamId, amount } = {}, ack) => { ensureTeamRoom(socket, teamId); ack?.(roomOf(socket)?.repayLoan(teamId, amount) || { ok: false }); });
  socket.on('student:repayDebt', ({ teamId, key, amount } = {}, ack) => { ensureTeamRoom(socket, teamId); ack?.(roomOf(socket)?.repayDebt(teamId, key, amount) || { ok: false }); });
  socket.on('student:roll', ({ teamId } = {}, ack) => { ensureTeamRoom(socket, teamId); ack?.(roomOf(socket)?.rollDice(teamId) || { ok: false }); });
  socket.on('student:chooseDeck', ({ teamId, deck } = {}, ack) => { ensureTeamRoom(socket, teamId); ack?.(roomOf(socket)?.chooseDeck(teamId, deck) || { ok: false }); });
  socket.on('student:dealDecision', ({ teamId, accept, withLoan } = {}, ack) => { ensureTeamRoom(socket, teamId); ack?.(roomOf(socket)?.dealDecision(teamId, accept, withLoan) || { ok: false }); });
  socket.on('student:charityDecision', ({ teamId, donate } = {}, ack) => { ensureTeamRoom(socket, teamId); ack?.(roomOf(socket)?.charityDecision(teamId, donate) || { ok: false }); });
  socket.on('student:acquireDecision', ({ teamId, accept } = {}, ack) => { ensureTeamRoom(socket, teamId); ack?.(roomOf(socket)?.acquireDecision(teamId, accept) || { ok: false }); });

  socket.on('disconnect', () => {});
});

// 正式環境：Express 提供打包後前端 + SPA fallback
if (isProd) {
  const distPath = path.join(ROOT, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('🎮  茲茲一百萬挑戰賽 — 伺服器已啟動（多房間）');
  console.log(`    本機： http://localhost:${PORT}`);
  console.log(`    區網： http://${lanIp}:${PORT}`);
  if (!isProd) console.log('    開發模式前端： http://localhost:5173');
  console.log('========================================');
});
