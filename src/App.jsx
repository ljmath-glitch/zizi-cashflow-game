import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { api, page } from './base.js';
import Student from './pages/Student.jsx';
import Screen from './pages/Screen.jsx';
import Teacher from './pages/Teacher.jsx';
import AvatarGallery from './pages/AvatarGallery.jsx';
import RoomGuard from './components/RoomGuard.jsx';
import logoUrl from './assets/tzutzu-logo.png';

// 茲茲品牌 logo（香檳金閃電＋酒紅火焰，正式標誌）
function Logo({ className }) {
  return <img src={logoUrl} alt="茲茲" className={className} />;
}

// 進入遊戲轉場：深色幕「光圈擴散」蓋滿 + 白金閃光 + 中央閃電（首頁淺 → 大螢幕深，銜接不突兀）
function EnterTransition() {
  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      <div className="enter-iris absolute inset-0 screen-bg" />
      <div className="enter-flash absolute inset-0 bg-white" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <img src={logoUrl} alt="茲茲" className="enter-bolt w-28 h-28 object-contain drop-shadow-[0_10px_40px_rgba(245,158,11,0.45)]" />
        <p className="enter-word mt-6 text-zizi-champagne tracking-[0.3em] font-semibold">進入遊戲…</p>
      </div>
    </div>
  );
}

// 首頁：老師建立房間 → 拿到房號與三個連結；或輸入房號加入別人的房間
function Home() {
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [err, setErr] = useState(null);
  const [showHost, setShowHost] = useState(false); // 建房前先出現主辦帳密輸入
  const [hostUser, setHostUser] = useState('');
  const [hostPass, setHostPass] = useState('');
  const [entering, setEntering] = useState(false); // 建房成功後播放「淺→深」轉場動畫再進大螢幕

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
      // 建房成功 → 播放「淺→深」轉場動畫(約 1 秒)，再進大螢幕(host=1)。先把根背景染深，避免換頁瞬間白閃
      document.documentElement.style.backgroundColor = '#2f2015';
      setEntering(true);
      setTimeout(() => {
        window.location.href = page(`screen?room=${data.code}&host=1`);
      }, 1000);
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
    <div className="relative min-h-screen app-bg text-zizi-ink overflow-hidden">
      <div className="relative min-h-screen max-w-6xl mx-auto flex flex-col md:flex-row md:items-stretch">

        {/* 左：品牌與標題（精品雜誌風：大襯線標題＋香檳金細線＋留白） */}
        <div className="md:flex-1 flex flex-col justify-between px-8 pt-14 pb-6 md:px-14 md:py-16 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <Logo className="w-11 h-11 object-contain" />
            <span className="text-zizi-caramel font-bold tracking-[0.25em] text-sm">茲茲 · 財商教育</span>
          </div>

          <div className="mt-10 md:mt-0">
            <div className="mx-auto md:mx-0 w-16 h-[3px] bg-gradient-to-r from-zizi-champagne to-transparent mb-6" />
            <h1 className="font-serif font-black text-zizi-ink leading-[1.14] tracking-wide text-5xl md:text-7xl">
              茲茲<br />財富自由<br />挑戰賽
            </h1>
            <p className="mt-6 md:mt-7 text-zizi-caramel text-base md:text-lg leading-loose max-w-md mx-auto md:mx-0">
              成為一道閃電，點燃孩子的學習熱誠。<br />
              <span className="text-zizi-plum">在遊戲中學會投資、被動收入與跳出老鼠圈。</span>
            </p>
          </div>

          <footer className="hidden md:block text-xs text-zizi-champagne leading-relaxed mt-10">
            <span className="block font-bold tracking-[0.2em] text-zizi-caramel">茲茲 出品</span>
            © 2026 李云・版權所有　未經授權不得重製或散布
          </footer>
        </div>

        {/* 右：入口動作 */}
        <div className="md:flex-1 flex flex-col justify-center gap-5 px-8 pb-12 md:px-14 md:py-16">

          {/* 主辦建立房間（老師/家長）：輸入主辦帳密 → 播轉場 → 進大螢幕(自帶控制) */}
          <div className="bg-white/90 border border-[#EBDFCB] rounded-3xl p-7 shadow-soft">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-2xl">🎬</span>
              <span className="text-lg font-bold text-zizi-ink">我是主辦（老師 / 家長）</span>
            </div>
            {!showHost ? (
              <>
                <p className="text-sm text-zizi-plum leading-relaxed mb-5">建立房間後直接進入大螢幕（右上角有老師控制）；學生掃大螢幕上的 QR 加入。</p>
                <button
                  onClick={() => { setErr(null); setShowHost(true); }}
                  className="w-full rounded-2xl py-4 font-extrabold text-white text-lg bg-gradient-to-br from-zizi-gold to-[#D97706] shadow-[0_8px_20px_rgba(217,119,6,0.28)]"
                >
                  ➕　建立新房間
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-zizi-plum mb-3">輸入主辦帳號密碼即可開房（週報上有）</p>
                <input
                  value={hostUser}
                  onChange={(e) => setHostUser(e.target.value)}
                  placeholder="主辦帳號"
                  autoComplete="username"
                  className="w-full rounded-xl px-3 py-2.5 text-center text-zizi-ink font-semibold bg-zizi-cream border border-[#EBDFCB] mb-2"
                />
                <input
                  type="password"
                  value={hostPass}
                  onChange={(e) => setHostPass(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createRoom(); }}
                  placeholder="密碼"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-3 py-2.5 text-center text-zizi-ink font-semibold bg-zizi-cream border border-[#EBDFCB] mb-3"
                />
                <button
                  onClick={createRoom}
                  disabled={busy}
                  className="w-full rounded-2xl py-4 font-extrabold text-white text-lg bg-gradient-to-br from-zizi-gold to-[#D97706] disabled:opacity-50"
                >
                  {busy ? '建立中…' : '✅ 確認開房'}
                </button>
                <button
                  onClick={() => { setShowHost(false); setErr(null); }}
                  className="mt-2 w-full text-sm text-zizi-plum hover:text-zizi-caramel"
                >
                  取消
                </button>
              </>
            )}
          </div>

          {/* 用房號加入：老師 / 大螢幕 / 學生 */}
          <div className="bg-white/90 border border-[#EBDFCB] rounded-3xl p-7 shadow-soft">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-2xl">🔑</span>
              <span className="text-lg font-bold text-zizi-ink">用房號加入</span>
            </div>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="例如 ABC12"
              maxLength={5}
              className="w-full rounded-xl px-3 py-2.5 text-center text-zizi-ink font-bold tracking-[0.4em] bg-zizi-cream border border-[#EBDFCB] mb-4"
            />
            <button onClick={() => joinAs('teacher')} className="w-full rounded-xl py-3 font-extrabold text-zizi-ink bg-gradient-to-br from-zizi-amber to-zizi-gold mb-2.5">🎛️　老師控制台</button>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => joinAs('student')} className="rounded-xl py-2.5 font-medium text-zizi-caramel bg-[#FBF7F1] border border-[#E5D8C3]">📱 學生加入</button>
              <button onClick={() => joinAs('screen')} className="rounded-xl py-2.5 font-medium text-zizi-caramel bg-[#FBF7F1] border border-[#E5D8C3]">📺 大螢幕</button>
            </div>
          </div>

          {err && <p className="text-center text-red-500 text-sm font-medium">{err}</p>}

          {/* 手機版版權（桌機版在左欄底部） */}
          <footer className="md:hidden text-center text-xs text-zizi-champagne leading-relaxed mt-1">
            <span className="block font-bold tracking-[0.2em] text-zizi-caramel">茲茲 出品</span>
            © 2026 李云・版權所有
          </footer>
        </div>
      </div>

      {/* 建房成功後的「淺→深」進場轉場 */}
      {entering && <EnterTransition />}
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
