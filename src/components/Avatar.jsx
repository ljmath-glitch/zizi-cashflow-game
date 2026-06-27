// 原創像素風「人物」角色（SVG）＋喜怒哀樂表情，純 CSS @keyframes 動畫。
// 程序化繪製（rects 拼貼），有眉毛/大眼睛/反光/臉部陰影/立體身體。全部自繪、無函式庫。
// 可分開挑：髮型 hair、髮色 hairColor、服裝色 color、配件 accessory。

export const AVATAR_TYPES = [
  { id: 'short', name: '短髮' },
  { id: 'bob', name: '鮑伯頭' },
  { id: 'twin', name: '雙馬尾' },
  { id: 'spiky', name: '沖天炮' },
  { id: 'long', name: '長髮' },
  { id: 'buzz', name: '小平頭' },
];

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

export const HAIR_COLORS = [
  { id: 'brown', name: '棕', body: '#7a4d2b', dark: '#553318', light: '#9c6839' },
  { id: 'black', name: '黑', body: '#33302e', dark: '#1d1b1a', light: '#4d4844' },
  { id: 'blonde', name: '金', body: '#e6c266', dark: '#bd953a', light: '#f3d98e' },
  { id: 'ginger', name: '橘棕', body: '#c96b35', dark: '#9c4d22', light: '#e08a4e' },
  { id: 'silver', name: '銀白', body: '#cfd2d8', dark: '#a4a8b0', light: '#eef0f3' },
  { id: 'pink', name: '粉', body: '#f48fb1', dark: '#c25f86', light: '#f9b8cf' },
  { id: 'blue', name: '藍', body: '#6f8ff2', dark: '#445fc0', light: '#9fb3f7' },
  { id: 'mintH', name: '薄荷', body: '#74cfb0', dark: '#3f9a7e', light: '#9ee3c9' },
];

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

// 固定色
const SKIN = '#ffd9b3', SKIN_SH = '#f0bd95', INK = '#2a241e', WHITE = '#ffffff';
const PANTS = '#3f4d6b', PANTS_SH = '#313c54', SHOE = '#6b4a32', SHOE_SH = '#4a3220';
const BLUSH = '#ff9bb0', MOUTH = '#c46a62';

const R = (x, y, w, h, fill, key, extra) => <rect key={key} x={x} y={y} width={w} height={h} fill={fill} {...extra} />;

// 身體（陰影/腿/鞋/上衣/袖/手/脖子/領口）
function Body({ outfit }) {
  return (
    <g>
      <ellipse cx="12" cy="28.7" rx="7" ry="1.1" fill="rgba(0,0,0,0.18)" />
      {/* 腿 */}
      {R(8.4, 21.5, 3, 5.4, PANTS, 'lL')}
      {R(12.6, 21.5, 3, 5.4, PANTS, 'lR')}
      {R(8.4, 21.5, 1, 5.4, PANTS_SH, 'lLs')}
      {R(12.6, 21.5, 1, 5.4, PANTS_SH, 'lRs')}
      {/* 鞋 */}
      {R(7.5, 26.5, 4.2, 1.9, SHOE, 'sL', { rx: 0.4 })}
      {R(12.3, 26.5, 4.2, 1.9, SHOE, 'sR', { rx: 0.4 })}
      {R(7.5, 27.8, 4.2, 0.6, SHOE_SH, 'sLs')}
      {R(12.3, 27.8, 4.2, 0.6, SHOE_SH, 'sRs')}
      {/* 上衣 */}
      {R(5.8, 14.4, 12.4, 8.6, outfit.body, 'torso', { rx: 1.4 })}
      {R(3.8, 14.8, 3.4, 4.4, outfit.body, 'slL', { rx: 0.9 })}
      {R(16.8, 14.8, 3.4, 4.4, outfit.body, 'slR', { rx: 0.9 })}
      {/* 上衣陰影 */}
      {R(5.8, 21.2, 12.4, 1.8, outfit.dark, 'tsh', { opacity: 0.5 })}
      {R(5.8, 14.4, 2.3, 8.6, outfit.dark, 'tsh2', { opacity: 0.22 })}
      {/* 手 */}
      {R(4.0, 18.3, 2.7, 3.6, SKIN, 'hL', { rx: 0.7 })}
      {R(17.3, 18.3, 2.7, 3.6, SKIN, 'hR', { rx: 0.7 })}
      {/* 脖子 + 領口 */}
      {R(10, 12.2, 4, 2.6, SKIN, 'neck')}
      {R(10, 12.2, 4, 0.9, SKIN_SH, 'neckSh')}
      {R(9.3, 14.0, 5.4, 1.1, outfit.dark, 'collar', { rx: 0.5, opacity: 0.55 })}
    </g>
  );
}

// 頭（膚色＋耳朵＋下顎陰影）
function Head() {
  return (
    <g>
      {R(7.5, 3.6, 9, 1.6, SKIN, 'h0')}
      {R(6, 5, 12, 7.4, SKIN, 'h1', { rx: 2.2 })}
      {R(8, 11.8, 8, 1.3, SKIN, 'h2')}
      {R(5.3, 7.6, 1.5, 2.4, SKIN, 'eL', { rx: 0.6 })}
      {R(17.2, 7.6, 1.5, 2.4, SKIN, 'eR', { rx: 0.6 })}
      {R(6, 11.0, 12, 1.5, SKIN_SH, 'jaw', { opacity: 0.45 })}
    </g>
  );
}

// 髮型
function Hair({ hair, hc }) {
  const top = (
    <>
      {R(5.8, 2.4, 12.4, 3.6, hc.body, 't', { rx: 1.8 })}
      {R(5.8, 2.4, 12.4, 1.1, hc.light, 'tl', { rx: 1.2, opacity: 0.8 })}
      {R(5.8, 2.6, 3, 3.2, hc.dark, 'ts', { opacity: 0.3 })}
    </>
  );
  switch (hair) {
    case 'buzz':
      return (
        <g>
          {R(6.2, 3.0, 11.6, 2.6, hc.body, 'b', { rx: 1.6 })}
          {R(6.2, 3.0, 11.6, 1, hc.light, 'bl', { rx: 1.2, opacity: 0.7 })}
        </g>
      );
    case 'spiky':
      return (
        <g>
          {R(7, 1.0, 1.8, 2.2, hc.body, 's1')}
          {R(9.4, 0.4, 1.8, 2.6, hc.body, 's2')}
          {R(11.8, 0.6, 1.8, 2.6, hc.body, 's3')}
          {R(14.2, 1.0, 1.8, 2.2, hc.body, 's4')}
          {top}
        </g>
      );
    case 'bob':
      return (
        <g>
          {top}
          {R(5.4, 5, 2.6, 6.2, hc.body, 'bl', { rx: 1 })}
          {R(16, 5, 2.6, 6.2, hc.body, 'br', { rx: 1 })}
          {R(5.4, 5, 1, 6.2, hc.dark, 'bls', { opacity: 0.3 })}
        </g>
      );
    case 'long':
      return (
        <g>
          {R(4.8, 5, 2.8, 13, hc.body, 'll', { rx: 1.2 })}
          {R(16.4, 5, 2.8, 13, hc.body, 'lr', { rx: 1.2 })}
          {R(4.8, 5, 1, 13, hc.dark, 'lls', { opacity: 0.3 })}
          {top}
        </g>
      );
    case 'twin':
      return (
        <g>
          {top}
          {R(3.6, 5.4, 2.8, 7, hc.body, 'tl', { rx: 1.2 })}
          {R(17.6, 5.4, 2.8, 7, hc.body, 'tr', { rx: 1.2 })}
          {R(4.4, 4.6, 2, 2, hc.dark, 'tlt', { rx: 0.6, opacity: 0.5 })}
          {R(17.6, 4.6, 2, 2, hc.dark, 'trt', { rx: 0.6, opacity: 0.5 })}
        </g>
      );
    case 'short':
    default:
      return (
        <g>
          {top}
          {R(5.8, 5.2, 2.4, 2.8, hc.body, 'sbL')}
          {R(15.8, 5.2, 2.4, 2.8, hc.body, 'sbR')}
          {R(10.6, 4.8, 2.8, 1.8, hc.body, 'bang')}
        </g>
      );
  }
}

// 臉（眉毛/眼睛/鼻/腮紅/嘴）依情緒
function Face({ mood, hc }) {
  const browY = mood === 'happy' || mood === 'surprised' || mood === 'excited' ? 6.5 : 6.9;
  const brows = mood === 'angry'
    ? (<><polygon points="8.3,7.6 11,6.9 11,7.7 8.3,8.3" fill={hc.dark} /><polygon points="15.7,7.6 13,6.9 13,7.7 15.7,8.3" fill={hc.dark} /></>)
    : mood === 'sad'
    ? (<><polygon points="8.3,7.0 11,7.7 11,8.4 8.3,7.7" fill={hc.dark} /><polygon points="15.7,7.0 13,7.7 13,8.4 15.7,7.7" fill={hc.dark} /></>)
    : (<>{R(8.3, browY, 2.7, 0.8, hc.dark, 'bwL', { rx: 0.3 })}{R(13, browY, 2.7, 0.8, hc.dark, 'bwR', { rx: 0.3 })}</>);

  // 眼睛
  let eyes;
  if (mood === 'faint') {
    const X = (cx) => (<g><line x1={cx - 1.2} y1="8.4" x2={cx + 1.2} y2="10.6" stroke={INK} strokeWidth="0.7" strokeLinecap="round" /><line x1={cx + 1.2} y1="8.4" x2={cx - 1.2} y2="10.6" stroke={INK} strokeWidth="0.7" strokeLinecap="round" /></g>);
    eyes = (<>{X(9.6)}{X(14.3)}</>);
  } else if (mood === 'love') {
    const heart = (cx) => <path d={`M${cx} ${10.4} C${cx - 1.8} ${8.4} ${cx - 1.8} ${7.6} ${cx} ${8.6} C${cx + 1.8} ${7.6} ${cx + 1.8} ${8.4} ${cx} ${10.4} Z`} fill="#ff5d8f" />;
    eyes = (<>{heart(9.7)}{heart(14.3)}</>);
  } else if (mood === 'happy') {
    eyes = (<>
      <path d="M8.4 9.6 Q9.7 8 11 9.6" stroke={INK} strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d="M13 9.6 Q14.3 8 15.6 9.6" stroke={INK} strokeWidth="0.9" fill="none" strokeLinecap="round" />
    </>);
  } else {
    const big = mood === 'surprised' || mood === 'excited';
    const eh = big ? 3.4 : 3;
    const eye = (x, key) => (
      <g key={key}>
        {R(x, 8, 2.7, eh, WHITE, key + 'w', { rx: 0.7 })}
        {R(x + 0.7, 8.5 + (big ? 0.3 : 0), 1.5, big ? 2.4 : 2, INK, key + 'p', { rx: 0.5 })}
        {R(x + 0.8, 8.7, 0.7, 0.7, WHITE, key + 'h')}
        {mood === 'excited' && R(x + 1.5, 9.6, 0.4, 0.4, WHITE, key + 'h2')}
      </g>
    );
    eyes = (<>{eye(8.3, 'L')}{eye(13, 'R')}</>);
  }

  // 嘴
  let mouth;
  if (mood === 'happy' || mood === 'excited' || mood === 'love') {
    mouth = <path d="M10 11.8 Q12 13.8 14 11.8 Z" fill={mood === 'happy' ? 'none' : '#a23c3c'} stroke={MOUTH} strokeWidth="0.8" strokeLinecap="round" />;
  } else if (mood === 'surprised') {
    mouth = R(11, 11.8, 2, 2, '#a23c3c', 'mo', { rx: 1 });
  } else if (mood === 'sad' || mood === 'angry') {
    mouth = <path d="M10.4 13 Q12 11.6 13.6 13" stroke={MOUTH} strokeWidth="0.9" fill="none" strokeLinecap="round" />;
  } else if (mood === 'faint') {
    mouth = <path d="M10.6 12.2 q0.7 -0.9 1.4 0 q0.7 0.9 1.4 0" stroke={MOUTH} strokeWidth="0.7" fill="none" strokeLinecap="round" />;
  } else {
    mouth = R(10.8, 11.9, 2.4, 0.8, MOUTH, 'mo', { rx: 0.4 });
  }

  return (
    <g>
      {brows}
      {eyes}
      {R(11.5, 10.3, 1, 0.9, SKIN_SH, 'nose', { rx: 0.3 })}
      {mood !== 'angry' && mood !== 'faint' && (<>{R(7.5, 9.9, 1.7, 1.3, BLUSH, 'blL', { rx: 0.6, opacity: 0.7 })}{R(14.8, 9.9, 1.7, 1.3, BLUSH, 'blR', { rx: 0.6, opacity: 0.7 })}</>)}
      {mouth}
    </g>
  );
}

function Accessory({ accessory, outfit }) {
  if (accessory === 'glasses') {
    return (
      <g>
        <rect x="8" y="7.9" width="3.2" height="3.1" rx="0.8" fill="rgba(255,255,255,0.22)" stroke={INK} strokeWidth="0.45" />
        <rect x="12.8" y="7.9" width="3.2" height="3.1" rx="0.8" fill="rgba(255,255,255,0.22)" stroke={INK} strokeWidth="0.45" />
        <rect x="11.2" y="9" width="1.6" height="0.5" fill={INK} />
      </g>
    );
  }
  if (accessory === 'bow') {
    return (
      <g>
        {R(4.6, 3.0, 1.6, 1.6, '#ff5d8f', 'b1')}
        {R(6.6, 3.0, 1.6, 1.6, '#ff5d8f', 'b2')}
        {R(5.8, 3.4, 1.4, 1.4, '#d23b6a', 'b3', { rx: 0.4 })}
      </g>
    );
  }
  if (accessory === 'hat') {
    return (
      <g>
        {R(6, 0.8, 12, 3, outfit.dark, 'h1', { rx: 1 })}
        {R(4.6, 3.4, 14.8, 1.4, outfit.body, 'h2', { rx: 0.6 })}
        {R(6, 0.8, 12, 1, '#ffffff', 'h3', { rx: 1, opacity: 0.22 })}
      </g>
    );
  }
  return null;
}

function Effects({ mood }) {
  if (mood === 'sad') {
    return (<g className="av-tear">{R(8.8, 10.6, 1.1, 1.8, '#5cc1ee', 't1', { rx: 0.4 })}{R(14.2, 10.6, 1.1, 1.8, '#5cc1ee', 't2', { rx: 0.4 })}</g>);
  }
  if (mood === 'love') {
    return (
      <g className="av-heart">
        <path d="M6 3 C5 1.6 3.4 2.4 6 4.4 C8.6 2.4 7 1.6 6 3 Z" fill="#ff5d8f" />
        <path d="M18.4 4 C17.6 2.9 16.4 3.5 18.4 5 C20.4 3.5 19.2 2.9 18.4 4 Z" fill="#ff7da6" />
      </g>
    );
  }
  if (mood === 'angry') {
    return (<g className="av-anger">{R(16.4, 3.2, 1.1, 1.1, '#e23b3b', 'a1')}{R(17.6, 2.2, 1.1, 1.1, '#e23b3b', 'a2')}{R(17.6, 4.2, 1.1, 1.1, '#e23b3b', 'a3')}{R(18.8, 3.2, 1.1, 1.1, '#e23b3b', 'a4')}</g>);
  }
  return null;
}

// 主元件。size = 寬度（高度自動 = size×30/24）。
export function Avatar({ hair = 'short', hairColor = 'brown', color = 'gold', accessory = 'none', mood = 'neutral', size = 64, walking = false, className = '' }) {
  const outfit = avatarColor(color);
  const hc = hairColorOf(hairColor);
  const anim = MOOD_ANIM[mood] || 'av-idle';
  const h = size * 30 / 24;
  return (
    <div className={'av-wrap ' + (walking ? 'av-walk ' : '') + className} style={{ width: size, height: h }}>
      <svg viewBox="0 0 24 30" width={size} height={h} className={anim} shapeRendering="geometricPrecision" style={{ overflow: 'visible' }}>
        <Body outfit={outfit} />
        <Head />
        <Hair hair={hair} hc={hc} />
        <Face mood={mood} hc={hc} />
        <Accessory accessory={accessory} outfit={outfit} />
        <Effects mood={mood} />
      </svg>
    </div>
  );
}

export default Avatar;
