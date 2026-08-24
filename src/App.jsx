import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { api, page } from './base.js';
import Student from './pages/Student.jsx';
import Screen from './pages/Screen.jsx';
import Teacher from './pages/Teacher.jsx';
import AvatarGallery from './pages/AvatarGallery.jsx';
import RoomGuard from './components/RoomGuard.jsx';

// 首頁：老師建立房間 → 拿到房號與三個連結；或輸入房號加入別人的房間
function Home() {
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [err, setErr] = useState(null);
  const [showHost, setShowHost] = useState(false); // 建房前先出現主辦帳密輸入
  const [hostUser, setHostUser] = useState('');
  const [hostPass, setHostPass] = useState('');

  async function createRoom() {
    if (busy) return;
    if (!hostUser.trim() || !hostPass) { setErr('請輸入主辦帳號與密碼'); return; }
    setBusy(true);
    setErr(null);
    try {
      // 建房需主辦帳密（共用一組，寫在週報給家長）；帳密走自訂 header。加入/遊玩不受影響
      const res = await fetch(api('api/rooms'), {
        method: 'POST',
        headers: { 'x-cashflow-user': hostUser.trim(), 'x-cashflow-pass': hostPass },
      });
      if (res.status === 401) { setErr('主辦帳號或密碼錯誤'); setBusy(false); return; }
      if (res.status === 403) { setErr('遊戲目前未開放（僅活動期間可開房）'); setBusy(false); return; }
      if (!res.ok) { setErr('建立房間失敗，請稍後再試'); setBusy(false); return; }
      const data = await res.json();
      // 建房後直接進大螢幕：host=1 讓大螢幕右上角出現老師控制抽屜；學生掃大螢幕上的 QR 加入
      window.location.href = page(`screen?room=${data.code}&host=1`);
    } catch {
      setErr('建立房間失敗，請稍後再試');
      setBusy(false);
    }
  }

  async function joinAs(role) {
    const c = joinCode.trim().toUpperCase();
    if (!c) return;
    const res = await fetch(api('api/room-exists?code=' + encodeURIComponent(c)));
    const { exists } = await res.json();
    if (!exists) {
      setErr('找不到房號 ' + c);
      return;
    }
    // 大螢幕/學生開新分頁（保留這頁，才能繼續進老師端）；老師端才在本頁跳轉
    if (role === 'teacher') {
      window.location.href = page(`${role}?room=${c}`);
    } else {
      window.open(page(`${role}?room=${c}`), '_blank');
    }
  }

  return (
    <div className="min-h-full screen-bg text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-1">茲茲財富自由挑戰賽</h1>
      <p className="text-zizi-gold mb-8">成為一道閃電，點燃孩子的學習熱誠 ⚡</p>

      <div className="w-full max-w-md space-y-6">
          {/* 主辦建立房間（老師/家長）：輸入主辦帳密 → 直接進大螢幕(自帶控制) */}
          <div className="bg-white/10 rounded-2xl p-5 text-center">
            <p className="text-lg font-semibold mb-1">我是主辦（老師 / 家長）</p>
            {!showHost ? (
              <>
                <p className="text-sm text-white/60 mb-4">建立房間後直接進入大螢幕（右上角有老師控制）；學生掃大螢幕上的 QR 加入</p>
                <button
                  onClick={() => { setErr(null); setShowHost(true); }}
                  className="w-full rounded-xl bg-zizi-gold text-white font-bold py-3"
                >
                  ➕ 建立新房間（進大螢幕）
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-white/60 mb-3">輸入主辦帳號密碼即可開房（週報上有）</p>
                <input
                  value={hostUser}
                  onChange={(e) => setHostUser(e.target.value)}
                  placeholder="主辦帳號"
                  autoComplete="username"
                  className="w-full rounded-xl px-3 py-2 text-center text-zizi-ink font-semibold mb-2"
                />
                <input
                  type="password"
                  value={hostPass}
                  onChange={(e) => setHostPass(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createRoom(); }}
                  placeholder="密碼"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-3 py-2 text-center text-zizi-ink font-semibold mb-3"
                />
                <button
                  onClick={createRoom}
                  disabled={busy}
                  className="w-full rounded-xl bg-zizi-gold text-white font-bold py-3 disabled:opacity-50"
                >
                  {busy ? '建立中…' : '✅ 確認開房'}
                </button>
                <button
                  onClick={() => { setShowHost(false); setErr(null); }}
                  className="mt-2 text-sm text-white/50 hover:text-white/80"
                >
                  取消
                </button>
              </>
            )}
          </div>

          {/* 用房號加入：老師 / 大螢幕 / 學生 */}
          <div className="bg-white/10 rounded-2xl p-5">
            <p className="text-lg font-semibold mb-1 text-center">用房號加入</p>
            <p className="text-sm text-white/60 mb-3 text-center">輸入房號，選擇你的身分加入</p>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="例如 ABC12"
              maxLength={5}
              className="w-full rounded-xl px-3 py-2 text-center text-zizi-ink font-bold tracking-widest mb-3"
            />
            <button onClick={() => joinAs('teacher')} className="w-full rounded-xl bg-zizi-gold hover:brightness-105 text-white py-2.5 font-bold mb-2">🎛️ 老師控制台</button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => joinAs('student')} className="rounded-xl bg-white/20 hover:bg-white/30 py-2 font-medium">📱 學生加入</button>
              <button onClick={() => joinAs('screen')} className="rounded-xl bg-white/20 hover:bg-white/30 py-2 font-medium">📺 大螢幕</button>
            </div>
          </div>
          {err && <p className="text-center text-red-300 text-sm">{err}</p>}
        </div>

      {/* 版權宣示：茲茲品牌＋著作人（別名）。授權使用，非轉讓；未經同意不得重製 */}
      <footer className="mt-10 text-center text-white/40 text-xs leading-relaxed">
        <p className="text-white/60 font-semibold tracking-wide">茲茲 出品</p>
        <p>© 2026 李云・版權所有 All Rights Reserved</p>
        <p>本遊戲之玩法設計、程式、美術與教材受著作權保護，未經授權不得重製或散布</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/student" element={<RoomGuard><Student /></RoomGuard>} />
      <Route path="/screen" element={<RoomGuard><Screen /></RoomGuard>} />
      <Route path="/teacher" element={<RoomGuard><Teacher /></RoomGuard>} />
      <Route path="/avatars" element={<AvatarGallery />} />
    </Routes>
  );
}
