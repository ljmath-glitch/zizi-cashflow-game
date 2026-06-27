// 原創像素風「人物」角色（SVG crispEdges）＋喜怒哀樂表情，純 CSS @keyframes 動畫。
// 可分開挑：髮型 hair、髮色 hairColor、服裝色 color、配件 accessory。全部自繪、無函式庫。

export const AVATAR_TYPES = [
  { id: 'short', name: '短髮' },
  { id: 'bob', name: '鮑伯頭' },
  { id: 'twin', name: '雙馬尾' },
  { id: 'spiky', name: '沖天炮' },
  { id: 'long', name: '長髮' },
  { id: 'buzz', name: '小平頭' },
];

// 服裝（上衣）顏色
export const AVATAR_COLORS = [
  { id: 'gold', name: '香檳金', body: '#f5c451', dark: '#c98f24' },
  { id: 'rose', name: '櫻花粉', body: '#f78da7', dark: '#c75a7c' },
  { id: 'sky', name: '天空藍', body: '#6cb8ef', dark: '#3478b8' },
  { id: 'mint', name: '薄荷綠', body: '#7bd6a6', dark: '#3a9d6e' },
  { id: 'violet', name: '薰衣紫', body: '#b297ee', dark: '#6b51b0' },
  { id: 'orange', name: '蜜桃橘', body: '#f7a05c', dark: '#c96e29' },
  { id: 'crimson', name: '熱情紅', body: '#ef6a6a', dark: '#a83232' },
  { id: 'ink', name: '墨黑', body: '#5b6470', dark: '#2b2f38' },
];

// 髮色
export const HAIR_COLORS = [
  { id: 'brown', name: '棕', body: '#7a4d2b', dark: '#5a371c' },
  { id: 'black', name: '黑', body: '#33302e', dark: '#1d1b1a' },
  { id: 'blonde', name: '金', body: '#e6c266', dark: '#b8923a' },
  { id: 'ginger', name: '橘棕', body: '#c96b35', dark: '#9c4d22' },
  { id: 'silver', name: '銀白', body: '#d7d9de', dark: '#a9adb6' },
  { id: 'pink', name: '粉', body: '#f48fb1', dark: '#c25f86' },
  { id: 'blue', name: '藍', body: '#6f8ff2', dark: '#445fc0' },
  { id: 'mintH', name: '薄荷', body: '#74cfb0', dark: '#3f9a7e' },
];

// 配件
export const AVATAR_ACCESSORIES = [
  { id: 'none', name: '無' },
  { id: 'glasses', name: '眼鏡' },
  { id: 'bow', name: '蝴蝶結' },
  { id: 'hat', name: '帽子' },
];

export const MOODS = ['neutral', 'happy', 'excited', 'sad', 'angry', 'surprised', 'love', 'faint'];

const MOOD_ANIM = {
  neutral: 'av-idle', happy: 'av-bounce', excited: 'av-wiggle', sad: 'av-sag',
  angry: 'av-shake', surprised: 'av-pop', love: 'av-bob', faint: 'av-faint',
};

const find = (list, id, def) => list.find((x) => x.id === id) || list[def] || list[0];
export const avatarColor = (id) => find(AVATAR_COLORS, id, 0);
export const hairColorOf = (id) => find(HAIR_COLORS, id, 0);

// 16×20 像素人物底圖：頭(膚色)＋脖子＋上衣＋手＋褲子＋鞋
const BASE = [
  '................', '................',
  '.....KKKKKK.....', '....KSSSSSSK....',
  '....SSSSSSSS....', '....SSSSSSSS....',
  '....SSSSSSSS....', '....SSSSSSSS....',
  '....KSSSSSSK....', '......SSSS......',
  '....KCCCCCCK....', '...KCCCCCCCCK...',
  '..KSCCCCCCCCSK..', '...KCCCCCCCCK...',
  '...KCCCCCCCCK...', '...KCCCCCCCCK...',
  '...KLLLKKLLLK...', '...KLLL..LLLK...',
  '...KLLL..LLLK...', '..KBBBK.KBBBK...',
];

// 髮型（rows 0–9，'.' 沿用底圖）
const HAIR = {
  short: ['................', '.....HHHHHH.....', '....HHHHHHHH....', '....HHHHHHHH....', '....H......H....', '................', '................', '................', '................', '................'],
  bob: ['................', '.....HHHHHH.....', '....HHHHHHHH....', '...HHHHHHHHHH...', '...HH......HH...', '...HH......HH...', '...HH......HH...', '....HH....HH....', '................', '................'],
  twin: ['................', '.....HHHHHH.....', '....HHHHHHHH....', '....HHHHHHHH....', '..HHH......HHH..', '..HH........HH..', '..HH........HH..', '..HHH......HHH..', '...H........H...', '................'],
  spiky: ['.....H.HH.H.....', '....HHHHHHHH....', '....HHHHHHHH....', '....HHHHHHHH....', '....H......H....', '................', '................', '................', '................', '................'],
  long: ['................', '.....HHHHHH.....', '....HHHHHHHH....', '...HHHHHHHHHH...', '...HH......HH...', '...HH......HH...', '...HH......HH...', '...HH......HH...', '...HH......HH...', '...HHH....HHH...'],
  buzz: ['................', '................', '.....hhhhhh.....', '....hhhhhhhh....', '....h......h....', '................', '................', '................', '................', '................'],
};

// 表情（rows 4–8，'.' 沿用底圖）
const FACE = {
  neutral: ['................', '.....E....E.....', '....P......P....', '.......MM.......', '................'],
  happy: ['....E.E..E.E....', '.....E....E.....', '....P......P....', '......MMMM......', '................'],
  excited: ['................', '.....EE..EE.....', '....P......P....', '......MOOM......', '................'],
  sad: ['................', '.....E....E.....', '................', '......MMMM......', '.....M....M.....'],
  angry: ['....K......K....', '.....E....E.....', '................', '......MMMM......', '.....M....M.....'],
  surprised: ['................', '.....EE..EE.....', '................', '.......OO.......', '................'],
  love: ['....H.H..H.H....', '.....H....H.....', '....P......P....', '......MMMM......', '................'],
  faint: ['....E.E..E.E....', '.....E....E.....', '................', '......M.M.......', '................'],
};

function pxColor(sym, outfit, hc) {
  switch (sym) {
    case 'H': return hc.body;
    case 'h': return hc.dark;
    case 'C': return outfit.body;
    case 'c': return outfit.dark;
    case 'K': return '#3a2e26';
    case 'S': return '#ffd9b3';
    case 's': return '#eebf99';
    case 'L': return '#43506b';
    case 'B': return '#5a3a2a';
    case 'E': return '#2a241e';
    case 'O': return '#ffffff';
    case 'P': return '#ff9bb0';
    case 'M': return '#b06a5a';
    default: return null;
  }
}

function buildGrid(hair, mood) {
  const g = BASE.map((r) => r.split(''));
  (HAIR[hair] || HAIR.short).forEach((row, i) => {
    for (let x = 0; x < 16; x++) { const ch = row[x]; if (ch && ch !== '.') g[i][x] = ch; }
  });
  (FACE[mood] || FACE.neutral).forEach((row, i) => {
    const y = 4 + i;
    for (let x = 0; x < 16; x++) { const ch = row[x]; if (ch && ch !== '.') g[y][x] = ch; }
  });
  return g;
}

const P = (x, y, w, h, fill, key) => <rect key={key} x={x} y={y} width={w} height={h} fill={fill} />;

function Accessory({ accessory, outfit }) {
  if (accessory === 'glasses') {
    return (
      <g>
        <rect x="4" y="4.4" width="3" height="1.8" fill="rgba(255,255,255,0.25)" stroke="#2a241e" strokeWidth="0.4" />
        <rect x="9" y="4.4" width="3" height="1.8" fill="rgba(255,255,255,0.25)" stroke="#2a241e" strokeWidth="0.4" />
        <rect x="7" y="5" width="2" height="0.5" fill="#2a241e" />
      </g>
    );
  }
  if (accessory === 'bow') {
    return (
      <g>
        {P(3, 1.4, 1.1, 1.1, '#ff5d8f', 'b1')}
        {P(5, 1.4, 1.1, 1.1, '#ff5d8f', 'b2')}
        {P(4, 1.8, 1.1, 1.1, '#d23b6a', 'b3')}
      </g>
    );
  }
  if (accessory === 'hat') {
    return (
      <g>
        {P(4, 0.6, 8, 2.6, outfit.dark, 'h1')}
        {P(3, 3, 10, 1.1, outfit.body, 'h2')}
        {P(4, 0.6, 8, 0.8, 'rgba(255,255,255,0.25)', 'h3')}
      </g>
    );
  }
  return null;
}

function Effects({ mood }) {
  if (mood === 'sad') {
    return (<g className="av-tear">{P(5, 6, 1.1, 2, '#5cc1ee', 't1')}{P(10, 6, 1.1, 2, '#5cc1ee', 't2')}</g>);
  }
  if (mood === 'love') {
    return (<g className="av-heart">{P(6, 0, 1.1, 1.1, '#ff5d8f', 'h1')}{P(8, 0, 1.1, 1.1, '#ff5d8f', 'h2')}{P(5, 1, 4.1, 1.1, '#ff5d8f', 'h3')}{P(6, 2, 2.1, 1.1, '#ff5d8f', 'h4')}</g>);
  }
  if (mood === 'angry') {
    return (<g className="av-anger">{P(12, 2, 1.1, 1.1, '#e23b3b', 'a1')}{P(13, 1, 1.1, 1.1, '#e23b3b', 'a2')}{P(13, 3, 1.1, 1.1, '#e23b3b', 'a3')}{P(14, 2, 1.1, 1.1, '#e23b3b', 'a4')}</g>);
  }
  return null;
}

// 主元件。size = 寬度（高度自動 = size×20/16）。
export function Avatar({ hair = 'short', hairColor = 'brown', color = 'gold', accessory = 'none', mood = 'neutral', size = 64, walking = false, className = '' }) {
  const outfit = avatarColor(color);
  const hc = hairColorOf(hairColor);
  const anim = MOOD_ANIM[mood] || 'av-idle';
  const grid = buildGrid(hair, mood);
  const rects = [];
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 16; x++) {
      const fill = pxColor(grid[y][x], outfit, hc);
      if (fill) rects.push(<rect key={y * 16 + x} x={x} y={y} width="1.04" height="1.04" fill={fill} />);
    }
  }
  const h = size * 20 / 16;
  return (
    <div className={'av-wrap ' + (walking ? 'av-walk ' : '') + className} style={{ width: size, height: h }}>
      <svg viewBox="0 0 16 20" width={size} height={h} className={anim} shapeRendering="crispEdges" style={{ overflow: 'visible' }}>
        <ellipse cx="8" cy="19.4" rx="4.6" ry="0.7" fill="rgba(0,0,0,0.18)" />
        {rects}
        <Accessory accessory={accessory} outfit={outfit} />
        <Effects mood={mood} />
      </svg>
    </div>
  );
}

export default Avatar;
