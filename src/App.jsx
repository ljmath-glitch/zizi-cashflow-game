import { Routes, Route, Link } from 'react-router-dom';
import Student from './pages/Student.jsx';
import Screen from './pages/Screen.jsx';
import Teacher from './pages/Teacher.jsx';

// 首頁：三個入口的導覽（方便開發測試；正式上課時各角色直接開對應網址）
function Home() {
  const entries = [
    { to: '/student', emoji: '📱', title: '學生端', desc: '各組學生操作財務' },
    { to: '/screen', emoji: '📺', title: '大螢幕端', desc: '投影排行榜與動態' },
    { to: '/teacher', emoji: '🎛️', title: '老師端', desc: '控制遊戲節奏' },
  ];

  return (
    <div className="min-h-full bg-zizi-blue text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-2">茲茲一百萬挑戰賽</h1>
      <p className="text-zizi-gold mb-8">成為一道閃電，點燃孩子的學習熱誠 ⚡</p>
      <div className="grid gap-4 w-full max-w-md">
        {entries.map((e) => (
          <Link
            key={e.to}
            to={e.to}
            className="bg-white/10 hover:bg-white/20 transition rounded-2xl p-5 flex items-center gap-4"
          >
            <span className="text-4xl">{e.emoji}</span>
            <span>
              <span className="block text-lg font-semibold">{e.title}</span>
              <span className="block text-sm text-white/70">{e.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/student" element={<Student />} />
      <Route path="/screen" element={<Screen />} />
      <Route path="/teacher" element={<Teacher />} />
    </Routes>
  );
}
