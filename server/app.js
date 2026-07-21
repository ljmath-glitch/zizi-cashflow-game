// 茲茲財富自由挑戰賽 — 可掛載的遊戲模組
// 兩種用法：
//   1. 獨立部署：server/index.js 呼叫 mountCashflow(app, httpServer, { base: '' })
//   2. 掛在別的 Node 服務下（如課務系統）：mountCashflow(app, httpServer, { base: '/cashflow' })
//      → 遊戲畫面在 /cashflow、API 在 /cashflow/api/*、Socket 在 /cashflow/socket.io
// 注意：路由刻意不用 '*' 萬用字元寫法，Express 4 與 5 都相容。
import express from 'express';
import { Server } from 'socket.io';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getLanIp } from './lan.js';
import { initGame, createRoom, getRoom, roomExists } from './game.js';
import { activeMarket } from './data/assets.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { BOARD } from './data/board.js';
import { ensureSavesDir, saveToFile, loadFromFile, listSaves, timestampName } from './storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function mountCashflow(app, httpServer, { base = '', serveStatic = true, port = null } = {}) {
  // base 標準化：'' 或 '/cashflow'（開頭要斜線、結尾不要）
  const b = base ? '/' + base.replace(/^\/|\/$/g, '') : '';

  const io = new Server(httpServer, {
    cors: { origin: '*' },
    path: b + '/socket.io',
  });
  const lanIp = getLanIp();

  initGame(io);
  ensureSavesDir();

  // ── HTTP API ──
  app.get(b + '/api/server-info', (req, res) => res.json({ lanIp, port: port || undefined }));
  app.get(b + '/api/market', (req, res) => res.json(activeMarket()));
  app.get(b + '/api/achievements', (req, res) => res.json(ACHIEVEMENTS));
  app.get(b + '/api/board', (req, res) => res.json(BOARD));
  app.post(b + '/api/rooms', (req, res) => {
    const code = createRoom();
    console.log('🏠 [現金流] 建立房間：', code);
    res.json({ code });
  });
  app.get(b + '/api/room-exists', (req, res) => {
    res.json({ exists: roomExists(req.query.code) });
  });

  // ── Socket.IO 事件（與原 server/index.js 相同邏輯） ──
  function roomOf(socket) {
    return getRoom(socket.data.code);
  }
  // 手機重連後補回隊伍房間（idempotent），避免 student:team 更新送不到
  function ensureTeamRoom(socket, teamId) {
    if (socket.data.code && teamId) socket.join(socket.data.code + '|team:' + teamId);
  }

  io.on('connection', (socket) => {
    const code = String(socket.handshake.query.room || '').toUpperCase();
    const room = getRoom(code);
    socket.data.code = room ? code : null;

    socket.emit('server:hello', { message: '已連上茲茲伺服器', lanIp });

    if (!room) {
      socket.emit('room:invalid', { code });
      return;
    }

    socket.join(code);
    console.log(`🔌 [現金流] 連線 ${socket.id} → 房間 ${code}`);

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
    socket.on('teacher:spotlightNav', ({ tab, scroll } = {}) => roomOf(socket)?.navSpotlight({ tab, scroll }));
    socket.on('teacher:grantFreedom', ({ teamId } = {}, ack) => { ack?.(roomOf(socket)?.grantFreedom(teamId) || { ok: false }); }); // 測試用
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
    socket.on('student:join', ({ name, professionId, avatar } = {}, ack) => {
      const r = roomOf(socket);
      if (!r) return ack?.({ ok: false, reason: '房間不存在' });
      const team = r.createTeam(name, professionId, avatar);
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
    socket.on('student:chooseGoal', ({ teamId, achievementId } = {}, ack) => { ensureTeamRoom(socket, teamId); ack?.(roomOf(socket)?.chooseGoal(teamId, achievementId) || { ok: false }); });
    socket.on('student:buyAchievement', ({ teamId } = {}, ack) => { ensureTeamRoom(socket, teamId); ack?.(roomOf(socket)?.buyAchievement(teamId) || { ok: false }); });

    socket.on('disconnect', () => {});
  });

  // ── 靜態檔 + SPA fallback（不用 '*'，Express 4/5 都相容） ──
  if (serveStatic) {
    const distPath = path.join(__dirname, '..', 'dist');
    const indexHtml = path.join(distPath, 'index.html');
    if (fs.existsSync(indexHtml)) {
      app.use(b || '/', express.static(distPath));
      // SPA fallback：/cashflow 底下的 GET（非 API、非檔案）都回 index.html
      app.use(b || '/', (req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.path.startsWith('/api/')) return next();
        res.sendFile(indexHtml);
      });
    } else {
      console.warn('⚠️ [現金流] 找不到 dist/index.html，僅提供 API/Socket（請先 npm run build）');
    }
  }

  return { io };
}
