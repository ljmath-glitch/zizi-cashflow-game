// 角色頭像（SVG）＋喜怒哀樂表情，純 CSS @keyframes 動畫。
// 學生選角、棋盤代幣、大螢幕事件劇場共用。沒有任何函式庫，輕又好調。

// 可選角色（外型由耳朵/頭頂區分；身體共用一顆圓胖造型）
export const AVATAR_TYPES = [
  { id: 'mouse', name: '老鼠', emoji: '🐭' },
  { id: 'cat', name: '貓咪', emoji: '🐱' },
  { id: 'bear', name: '小熊', emoji: '🐻' },
  { id: 'bunny', name: '兔子', emoji: '🐰' },
  { id: 'frog', name: '青蛙', emoji: '🐸' },
  { id: 'robot', name: '機器人', emoji: '🤖' },
];

// 可選顏色（身體色 + 對應深色描邊）
export const AVATAR_COLORS = [
  { id: 'gold', name: '香檳金', body: '#f5c451', dark: '#d99a23' },
  { id: 'rose', name: '櫻花粉', body: '#f78da7', dark: '#d65b7f' },
  { id: 'sky', name: '天空藍', body: '#7cc4f2', dark: '#3f97d6' },
  { id: 'mint', name: '薄荷綠', body: '#86dcb0', dark: '#3fae7d' },
  { id: 'violet', name: '薰衣紫', body: '#b9a3f0', dark: '#8467d6' },
  { id: 'orange', name: '蜜桃橘', body: '#f7a96b', dark: '#dd7a36' },
  { id: 'slate', name: '霧灰', body: '#aab4c4', dark: '#71809a' },
  { id: 'cream', name: '奶油白', body: '#f3e2bd', dark: '#cdb27e' },
];

export const MOODS = ['neutral', 'happy', 'excited', 'sad', 'angry', 'surprised', 'love', 'faint'];

// 每種情緒對應的 SVG 動畫 class（定義在 index.css）
const MOOD_ANIM = {
  neutral: 'av-idle',
  happy: 'av-bounce',
  excited: 'av-wiggle',
  sad: 'av-sag',
  angry: 'av-shake',
  surprised: 'av-pop',
  love: 'av-bob',
  faint: 'av-faint',
};

export function avatarColor(id) {
  return AVATAR_COLORS.find((x) => x.id === id) || AVATAR_COLORS[0];
}

// 頭頂 / 耳朵（依角色）
function Ears({ type, c }) {
  switch (type) {
    case 'cat':
      return (
        <>
          <path d="M24 30 L30 8 L44 24 Z" fill={c.body} stroke={c.dark} strokeWidth="3" strokeLinejoin="round" />
          <path d="M76 30 L70 8 L56 24 Z" fill={c.body} stroke={c.dark} strokeWidth="3" strokeLinejoin="round" />
        </>
      );
    case 'bear':
      return (
        <>
          <circle cx="28" cy="22" r="12" fill={c.body} stroke={c.dark} strokeWidth="3" />
          <circle cx="72" cy="22" r="12" fill={c.body} stroke={c.dark} strokeWidth="3" />
        </>
      );
    case 'bunny':
      return (
        <>
          <ellipse cx="36" cy="16" rx="7" ry="20" fill={c.body} stroke={c.dark} strokeWidth="3" />
          <ellipse cx="64" cy="16" rx="7" ry="20" fill={c.body} stroke={c.dark} strokeWidth="3" />
          <ellipse cx="36" cy="18" rx="3" ry="12" fill="#fff" opacity="0.5" />
          <ellipse cx="64" cy="18" rx="3" ry="12" fill="#fff" opacity="0.5" />
        </>
      );
    case 'frog':
      return (
        <>
          <circle cx="32" cy="20" r="11" fill={c.body} stroke={c.dark} strokeWidth="3" />
          <circle cx="68" cy="20" r="11" fill={c.body} stroke={c.dark} strokeWidth="3" />
          <circle cx="32" cy="20" r="4" fill="#2b2b2b" />
          <circle cx="68" cy="20" r="4" fill="#2b2b2b" />
        </>
      );
    case 'robot':
      return (
        <>
          <line x1="50" y1="20" x2="50" y2="6" stroke={c.dark} strokeWidth="3" />
          <circle cx="50" cy="5" r="4" fill={c.dark} />
          <rect x="24" y="44" width="6" height="16" rx="3" fill={c.dark} />
          <rect x="70" y="44" width="6" height="16" rx="3" fill={c.dark} />
        </>
      );
    case 'mouse':
    default:
      return (
        <>
          <circle cx="26" cy="24" r="14" fill={c.body} stroke={c.dark} strokeWidth="3" />
          <circle cx="74" cy="24" r="14" fill={c.body} stroke={c.dark} strokeWidth="3" />
          <circle cx="26" cy="24" r="7" fill={c.dark} opacity="0.45" />
          <circle cx="74" cy="24" r="7" fill={c.dark} opacity="0.45" />
        </>
      );
  }
}

// 眼睛（依情緒）
function Eyes({ mood }) {
  const L = 38, R = 62, Y = 54;
  const ink = '#3a2a1a';
  if (mood === 'happy') {
    return (
      <>
        <path d={`M${L - 8} ${Y + 3} Q${L} ${Y - 8} ${L + 8} ${Y + 3}`} stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d={`M${R - 8} ${Y + 3} Q${R} ${Y - 8} ${R + 8} ${Y + 3}`} stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (mood === 'excited') {
    return (
      <>
        <circle cx={L} cy={Y} r="9" fill="#fff" stroke={ink} strokeWidth="2.5" />
        <circle cx={R} cy={Y} r="9" fill="#fff" stroke={ink} strokeWidth="2.5" />
        <circle cx={L + 2} cy={Y - 2} r="4" fill={ink} />
        <circle cx={R + 2} cy={Y - 2} r="4" fill={ink} />
        <circle cx={L + 4} cy={Y - 4} r="1.6" fill="#fff" />
        <circle cx={R + 4} cy={Y - 4} r="1.6" fill="#fff" />
      </>
    );
  }
  if (mood === 'sad') {
    return (
      <>
        <path d={`M${L - 8} ${Y - 4} Q${L} ${Y + 5} ${L + 8} ${Y - 4}`} stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d={`M${R - 8} ${Y - 4} Q${R} ${Y + 5} ${R + 8} ${Y - 4}`} stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse className="av-tear" cx={L - 6} cy={Y + 8} rx="3" ry="5" fill="#5cc1ee" />
        <ellipse className="av-tear" cx={R + 6} cy={Y + 8} rx="3" ry="5" fill="#5cc1ee" style={{ animationDelay: '0.6s' }} />
      </>
    );
  }
  if (mood === 'angry') {
    return (
      <>
        <line x1={L - 9} y1={Y - 8} x2={L + 5} y2={Y - 2} stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
        <line x1={R + 9} y1={Y - 8} x2={R - 5} y2={Y - 2} stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={L} cy={Y + 2} r="4" fill={ink} />
        <circle cx={R} cy={Y + 2} r="4" fill={ink} />
        <path className="av-anger" d="M70 34 q6 -4 6 2 q4 -4 4 2 q5 -2 1 4" stroke="#e23b3b" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (mood === 'surprised') {
    return (
      <>
        <circle cx={L} cy={Y} r="8" fill="#fff" stroke={ink} strokeWidth="3" />
        <circle cx={R} cy={Y} r="8" fill="#fff" stroke={ink} strokeWidth="3" />
        <circle cx={L} cy={Y} r="3.5" fill={ink} />
        <circle cx={R} cy={Y} r="3.5" fill={ink} />
      </>
    );
  }
  if (mood === 'love') {
    const heart = (x) => (
      <path d={`M${x} ${Y + 5} C${x - 8} ${Y - 4} ${x - 3} ${Y - 9} ${x} ${Y - 4} C${x + 3} ${Y - 9} ${x + 8} ${Y - 4} ${x} ${Y + 5} Z`} fill="#ff5d8f" />
    );
    return (
      <>
        {heart(L)}
        {heart(R)}
        <path className="av-heart" d="M50 30 C44 22 36 28 50 40 C64 28 56 22 50 30 Z" fill="#ff5d8f" />
      </>
    );
  }
  if (mood === 'faint') {
    const x = (cx) => (
      <>
        <line x1={cx - 6} y1={Y - 6} x2={cx + 6} y2={Y + 6} stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
        <line x1={cx + 6} y1={Y - 6} x2={cx - 6} y2={Y + 6} stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
      </>
    );
    return (<>{x(L)}{x(R)}</>);
  }
  // neutral
  return (
    <>
      <circle cx={L} cy={Y} r="5" fill={ink} />
      <circle cx={R} cy={Y} r="5" fill={ink} />
      <circle cx={L + 1.5} cy={Y - 1.5} r="1.6" fill="#fff" />
      <circle cx={R + 1.5} cy={Y - 1.5} r="1.6" fill="#fff" />
    </>
  );
}

// 嘴巴（依情緒）
function Mouth({ mood }) {
  const Y = 70;
  const ink = '#3a2a1a';
  switch (mood) {
    case 'happy':
    case 'love':
      return <path d={`M40 ${Y} Q50 ${Y + 12} 60 ${Y}`} stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" />;
    case 'excited':
    case 'surprised':
      return <ellipse cx="50" cy={Y + 3} rx="9" ry="11" fill="#7a2b2b" stroke={ink} strokeWidth="2.5" />;
    case 'sad':
      return <path d={`M40 ${Y + 6} Q50 ${Y - 6} 60 ${Y + 6}`} stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" />;
    case 'angry':
      return <path d={`M40 ${Y + 5} Q50 ${Y - 4} 60 ${Y + 5}`} stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" />;
    case 'faint':
      return <path d={`M40 ${Y + 2} q5 -6 10 0 q5 6 10 0`} stroke={ink} strokeWidth="3.5" fill="none" strokeLinecap="round" />;
    default:
      return <path d={`M44 ${Y} Q50 ${Y + 6} 56 ${Y}`} stroke={ink} strokeWidth="3.5" fill="none" strokeLinecap="round" />;
  }
}

// 主元件：一個會擺動的 SVG 角色
export function Avatar({ type = 'mouse', color = 'gold', mood = 'neutral', size = 64, walking = false, className = '' }) {
  const c = avatarColor(color);
  const anim = MOOD_ANIM[mood] || 'av-idle';
  const blush = mood === 'happy' || mood === 'love' || mood === 'excited';
  return (
    <div className={'av-wrap ' + (walking ? 'av-walk ' : '') + className} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className={anim} style={{ overflow: 'visible' }}>
        <Ears type={type} c={c} />
        {/* 身體 */}
        <ellipse cx="50" cy="58" rx="35" ry="33" fill={c.body} stroke={c.dark} strokeWidth="3" />
        {/* 肚子亮面 */}
        <ellipse cx="50" cy="66" rx="20" ry="17" fill="#fff" opacity="0.28" />
        {blush && (
          <>
            <ellipse cx="30" cy="64" rx="6" ry="4" fill="#ff8fa8" opacity="0.6" />
            <ellipse cx="70" cy="64" rx="6" ry="4" fill="#ff8fa8" opacity="0.6" />
          </>
        )}
        <Eyes mood={mood} />
        <Mouth mood={mood} />
        {type === 'mouse' && <ellipse cx="50" cy="66" rx="3" ry="2.4" fill={c.dark} />}
        {type === 'cat' && (
          <>
            <line x1="14" y1="62" x2="30" y2="63" stroke={c.dark} strokeWidth="2" />
            <line x1="14" y1="68" x2="30" y2="67" stroke={c.dark} strokeWidth="2" />
            <line x1="86" y1="62" x2="70" y2="63" stroke={c.dark} strokeWidth="2" />
            <line x1="86" y1="68" x2="70" y2="67" stroke={c.dark} strokeWidth="2" />
          </>
        )}
      </svg>
    </div>
  );
}

export default Avatar;
