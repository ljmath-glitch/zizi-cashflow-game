import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Student from './pages/Student.jsx';
import Screen from './pages/Screen.jsx';
import Teacher from './pages/Teacher.jsx';
import RoomGuard from './components/RoomGuard.jsx';

// 首頁：老師建立房間 → 拿到房號與三個連結；或輸入房號加入別人的房間
function Home() {
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [err, setErr] = useState(null);

  async function createRoom() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json();
      setCode(data.code);
    } catch {
      setErr('建立房間失敗，請稍後再試');
    }
    setBusy(false);
  }

  async function joinAs(role) {
    const c = joinCode.trim().toUpperCase();
    if (!c) return;
    const res = await fetch('/api/room-exists?code=' + encodeURIComponent(c));
    const { exists } = await res.json();
    if (!exists) {
      setErr('找不到房號 ' + c);
      return;
    }
    window.location.href = `/${role}?room=${c}`;
  }

  const origin = window.location.origin;

  return (
    <div className="min-h-full screen-bg text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-1">茲茲財富自由挑戰賽</h1>
      <p className="text-zizi-gold mb-8">成為一道閃電，點燃孩子的學習熱誠 ⚡</p>

      {!code ? (
        <div className="w-full max-w-md space-y-6">
          {/* 老師建立房間 */}
          <div className="bg-white/10 rounded-2xl p-5 text-center">
            <p className="text-lg font-semibold mb-1">我是老師</p>
            <p className="text-sm text-white/60 mb-4">建立一個專屬房間，再把連結分享給學生</p>
            <button
              onClick={createRoom}
              disabled={busy}
              className="w-full rounded-xl bg-zizi-gold text-white font-bold py-3 disabled:opacity-50"
            >
              {busy ? '建立中…' : '➕ 建立新房間'}
            </button>
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
      ) : (
        // 建好房間：顯示房號與三個連結
        <div className="w-full max-w-md bg-white/10 rounded-2xl p-6 text-center">
          <p className="text-sm text-white/60">你的房號</p>
          <p className="text-5xl font-black text-zizi-gold tracking-widest my-2">{code}</p>
          <p className="text-sm text-white/60 mb-1">把房號或下面連結分享給學生即可加入</p>
          <p className="text-xs text-white/40 mb-4">💡 記住房號 <b className="text-zizi-gold">{code}</b>，之後回首頁輸入它就能再進老師端</p>
          <div className="space-y-2 text-left">
            <a href={`/teacher?room=${code}`} className="block bg-zizi-gold text-white rounded-xl px-4 py-3 font-bold text-center">
              🎛️ 進入老師端
            </a>
            <a href={`/screen?room=${code}`} target="_blank" rel="noopener" className="block bg-white/15 hover:bg-white/25 rounded-xl px-4 py-2.5 text-center">
              📺 大螢幕端（投影用）<span className="text-xs text-white/50">↗ 開新分頁</span>
            </a>
            <div className="bg-white/10 rounded-xl px-4 py-2.5">
              <p className="text-xs text-white/50">學生連結</p>
              <p className="font-mono text-sm break-all text-zizi-gold">{origin}/student?room={code}</p>
            </div>
          </div>
        </div>
      )}
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
    </Routes>
  );
}
