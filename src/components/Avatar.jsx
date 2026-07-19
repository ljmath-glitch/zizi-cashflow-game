// 原創像素風「人物」角色（SVG）＋喜怒哀樂表情，純 CSS @keyframes 動畫。全部自繪、無函式庫。
// 臉（髮型 hair / 髮色 hairColor / 配件 accessory / 表情 mood）由玩家自訂；
// 服裝（outfit）依「職業 profession」決定，呈現職業形象。

export const AVATAR_TYPES = [
  { id: 'short', name: '短髮' },
  { id: 'bob', name: '鮑伯頭' },
  { id: 'long', name: '長直髮' },
  { id: 'wavy', name: '波浪捲' },
  { id: 'twin', name: '雙馬尾' },
  { id: 'ponytail', name: '馬尾' },
  { id: 'bun', name: '丸子頭' },
  { id: 'braid', name: '麻花辮' },
  { id: 'spiky', name: '沖天炮' },
  { id: 'buzz', name: '小平頭' },
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
  { id: 'flower', name: '髮花' },
];

export const MOODS = ['neutral', 'happy', 'excited', 'sad', 'angry', 'surprised', 'love', 'faint'];

const MOOD_ANIM = {
  neutral: 'av-idle', happy: 'av-bounce', excited: 'av-wiggle', sad: 'av-sag',
  angry: 'av-shake', surprised: 'av-pop', love: 'av-bob', faint: 'av-faint',
};

const find = (list, id, def) => list.find((x) => x.id === id) || list[def] || list[0];
export const hairColorOf = (id) => find(HAIR_COLORS, id, 0);

// 固定色
const SKIN = '#ffd9b3', SKIN_SH = '#f0bd95', INK = '#2a241e', WHITE = '#ffffff';
const PANTS = '#3f4d6b', PANTS_SH = '#313c54', SHOE = '#5a3f2c', SHOE_SH = '#3f2c1e';
const BLUSH = '#ff9bb0', MOUTH = '#c46a62';

const R = (x, y, w, h, fill, key, extra) => <rect key={key} x={x} y={y} width={w} height={h} fill={fill} {...extra} />;

// 職業 → 服裝設定（shirt 上衣主色 / dark 陰影 / pants 褲 / tmpl 版型 / head 頭飾 / 額外配飾）
const PROFESSION_OUTFIT = {
  doctor: { tmpl: 'coat', shirt: '#7cc4f2', dark: '#3f8fc7', extra: 'stetho' },
  nurse: { tmpl: 'scrubs', shirt: '#56c4bd', dark: '#359189', head: 'nursecap' },
  engineer: { tmpl: 'casual', shirt: '#6b7280', dark: '#444a54', extra: 'lanyard' },
  teacher: { tmpl: 'vest', shirt: '#b08453', dark: '#7e5d36' },
  youtuber: { tmpl: 'hoodie', shirt: '#ef6a6a', dark: '#b94343', head: 'headphones' },
  restaurant: { tmpl: 'apron', shirt: '#d24f4f', dark: '#9c3636', head: 'bandana' },
  police: { tmpl: 'uniform', shirt: '#3f6fa6', dark: '#2a4f7a', head: 'policecap', extra: 'badge' },
  sales: { tmpl: 'suit', shirt: '#46506b', dark: '#2f374e', tie: '#c0445f' },
  lawyer: { tmpl: 'suit', shirt: '#3a3f4d', dark: '#272b36', tie: '#8a2f3a' },
  pilot: { tmpl: 'uniform', shirt: '#2b3550', dark: '#1c2438', head: 'pilotcap', extra: 'epaulet' },
  manager: { tmpl: 'suit', shirt: '#5b6470', dark: '#3d434c', tie: '#3478b8' },
  flightattendant: { tmpl: 'uniform', shirt: '#8a3b52', dark: '#642a3b', extra: 'scarf' },
  civilservant: { tmpl: 'suit', shirt: '#6b7280', dark: '#474d56', tie: '#3a9d6e' },
  chef: { tmpl: 'chef', shirt: '#f4f1ea', dark: '#cfc8b8', head: 'chefhat' },
  ecommerce: { tmpl: 'casual', shirt: '#f7a05c', dark: '#c97a36' },
  clerk: { tmpl: 'vest', shirt: '#7bd6a6', dark: '#46a173', head: 'storecap' },
  firefighter: { tmpl: 'uniform', shirt: '#c0392b', dark: '#8a2820', extra: 'badge' },
  vet: { tmpl: 'coat', shirt: '#4aa96c', dark: '#357a4e', extra: 'stetho' },
  streamer: { tmpl: 'hoodie', shirt: '#6c5ce7', dark: '#4b3fb0', head: 'headphones' },
  barista: { tmpl: 'apron', shirt: '#6f4e37', dark: '#4a3323', head: 'bandana' },
  hairstylist: { tmpl: 'apron', shirt: '#8a5b9a', dark: '#603f6e' },
  security: { tmpl: 'uniform', shirt: '#4b5563', dark: '#333a44', extra: 'badge' },
};
const DEFAULT_OUTFIT = { tmpl: 'casual', shirt: '#9aa3b0', dark: '#6b7280' };

// 共用：陰影/腿/鞋/袖/手/脖子（上衣本體與細節由各版型疊上）
function Limbs({ shirt }) {
  return (
    <g>
      <ellipse cx="12" cy="28.7" rx="7" ry="1.1" fill="rgba(0,0,0,0.18)" />
      {R(8.4, 21.5, 3, 5.4, PANTS, 'lL')}
      {R(12.6, 21.5, 3, 5.4, PANTS, 'lR')}
      {R(8.4, 21.5, 1, 5.4, PANTS_SH, 'lLs')}
      {R(12.6, 21.5, 1, 5.4, PANTS_SH, 'lRs')}
      {R(7.5, 26.5, 4.2, 1.9, SHOE, 'shL', { rx: 0.4 })}
      {R(12.3, 26.5, 4.2, 1.9, SHOE, 'shR', { rx: 0.4 })}
      {R(7.5, 27.8, 4.2, 0.6, SHOE_SH, 'shLs')}
      {R(12.3, 27.8, 4.2, 0.6, SHOE_SH, 'shRs')}
      {R(3.8, 14.8, 3.4, 4.4, shirt, 'slL', { rx: 0.9 })}
      {R(16.8, 14.8, 3.4, 4.4, shirt, 'slR', { rx: 0.9 })}
      {R(4.0, 18.3, 2.7, 3.6, SKIN, 'hL', { rx: 0.7 })}
      {R(17.3, 18.3, 2.7, 3.6, SKIN, 'hR', { rx: 0.7 })}
      {R(10, 12.2, 4, 2.6, SKIN, 'neck')}
      {R(10, 12.2, 4, 0.9, SKIN_SH, 'neckSh')}
    </g>
  );
}

// 服裝（依職業版型）
function Outfit({ profession }) {
  const o = PROFESSION_OUTFIT[profession] || DEFAULT_OUTFIT;
  const torso = (<>{R(5.8, 14.4, 12.4, 8.6, o.shirt, 'torso', { rx: 1.4 })}{R(5.8, 21.2, 12.4, 1.8, o.dark, 'tsh', { opacity: 0.5 })}{R(5.8, 14.4, 2.3, 8.6, o.dark, 'tsh2', { opacity: 0.22 })}</>);
  let front = null;
  switch (o.tmpl) {
    case 'suit':
      front = (<>
        {R(8.6, 14.6, 6.8, 8.4, WHITE, 'shirt')}
        <polygon points="8.6,14.6 12,18 8.6,18" fill={o.shirt} />
        <polygon points="15.4,14.6 12,18 15.4,18" fill={o.shirt} />
        {R(11.3, 14.8, 1.4, 4.6, o.tie || '#b03b4f', 'tie')}
        {R(11.3, 14.6, 1.4, 0.8, '#fff', 'knot', { opacity: 0.5 })}
      </>);
      break;
    case 'coat':
      front = (<>
        {R(8.8, 14.6, 6.4, 8.4, '#7cc4f2', 'inner')}
        {R(5.8, 14.4, 4.4, 8.6, '#ffffff', 'coatL', { rx: 1.2 })}
        {R(13.8, 14.4, 4.4, 8.6, '#ffffff', 'coatR', { rx: 1.2 })}
        {R(9.4, 14.6, 0.8, 8, '#dfe6ec', 'cline1')}
        {R(13.8, 14.6, 0.8, 8, '#dfe6ec', 'cline2')}
        {R(13.2, 17, 0.6, 0.6, '#cfd6dc', 'btn1')}
        {R(13.2, 19, 0.6, 0.6, '#cfd6dc', 'btn2')}
      </>);
      break;
    case 'chef':
      front = (<>
        {R(9.2, 15, 0.8, 0.8, o.dark, 'cb1')}{R(9.2, 17, 0.8, 0.8, o.dark, 'cb2')}{R(9.2, 19, 0.8, 0.8, o.dark, 'cb3')}
        {R(13.6, 14.6, 3, 8.4, o.shirt, 'lap')}
        {R(13.6, 14.6, 0.8, 8.4, o.dark, 'lapEdge', { opacity: 0.5 })}
        {R(9.4, 14.5, 5, 1.4, '#d24f4f', 'kerchief', { rx: 0.6 })}
      </>);
      break;
    case 'apron':
      front = (<>
        {R(7.6, 16, 8.8, 7, '#f0e9da', 'apron', { rx: 0.6 })}
        {R(10.6, 14.4, 0.8, 2, '#f0e9da', 'strapL')}{R(12.6, 14.4, 0.8, 2, '#f0e9da', 'strapR')}
        {R(7.6, 16, 8.8, 0.8, '#d8d0bd', 'apronTop')}
      </>);
      break;
    case 'vest':
      front = (<>
        {R(8.6, 14.6, 6.8, 8.4, '#f4f1ea', 'innerShirt')}
        {R(5.8, 14.4, 3.4, 8.6, o.shirt, 'vestL', { rx: 1.1 })}
        {R(14.8, 14.4, 3.4, 8.6, o.shirt, 'vestR', { rx: 1.1 })}
        {R(11.6, 15, 0.5, 6, o.dark, 'placket', { opacity: 0.5 })}
      </>);
      break;
    case 'hoodie':
      front = (<>
        {R(9, 14.4, 6, 2.4, o.dark, 'hood', { rx: 1 })}
        {R(11.6, 16.4, 0.8, 5, o.dark, 'zip', { opacity: 0.6 })}
        {R(7.8, 19.6, 8.4, 2, o.dark, 'pocket', { rx: 0.6, opacity: 0.4 })}
      </>);
      break;
    case 'scrubs':
      front = (<>
        <polygon points="9,14.4 12,17.6 15,14.4" fill={SKIN} />
        {R(9, 14.4, 0.7, 3.4, o.dark, 'vL', { opacity: 0.5 })}
        {R(14.3, 14.4, 0.7, 3.4, o.dark, 'vR', { opacity: 0.5 })}
        {R(14.6, 18.5, 2.4, 2, o.dark, 'pocket', { rx: 0.3, opacity: 0.4 })}
      </>);
      break;
    case 'uniform':
      front = (<>
        {R(8.6, 14.5, 6.8, 1.4, WHITE, 'collar', { opacity: 0.85 })}
        {R(11.7, 14.6, 0.6, 8, o.dark, 'btnline')}
        {R(11.85, 16, 0.3, 0.3, '#ffe08a', 'b1')}{R(11.85, 18, 0.3, 0.3, '#ffe08a', 'b2')}{R(11.85, 20, 0.3, 0.3, '#ffe08a', 'b3')}
        {R(5.8, 22.2, 12.4, 0.9, '#2a2f3a', 'belt')}
      </>);
      break;
    default: // casual
      front = (<>{R(9, 19, 6, 3, o.dark, 'tee', { opacity: 0.18, rx: 0.6 })}</>);
  }
  // 額外配飾
  const extra = [];
  if (o.extra === 'stetho') extra.push(
    <g key="stetho">
      <path d="M9 14 Q9 18 11.4 19" stroke="#2c3e50" strokeWidth="0.7" fill="none" />
      <path d="M15 14 Q15 18 12.6 19" stroke="#2c3e50" strokeWidth="0.7" fill="none" />
      {R(11.2, 19, 1.6, 1.6, '#9fb6c9', 'chest', { rx: 0.8 })}
    </g>);
  if (o.extra === 'lanyard') extra.push(<g key="lan">{R(11.6, 14.4, 0.8, 4, '#2f9d6e', 'strap')}{R(10.8, 18, 2.4, 1.8, '#e8edf2', 'card', { rx: 0.3 })}{R(10.8, 18, 2.4, 0.6, '#6b7280', 'cardTop')}</g>);
  if (o.extra === 'badge') extra.push(R(8.4, 16, 1.4, 1.4, '#ffd24a', 'badge', { key: 'badge', rx: 0.3 }));
  if (o.extra === 'epaulet') extra.push(<g key="ep">{R(5.6, 14.6, 2, 1, '#ffd24a', 'epL', { rx: 0.3 })}{R(16.4, 14.6, 2, 1, '#ffd24a', 'epR', { rx: 0.3 })}</g>);
  if (o.extra === 'scarf') extra.push(<g key="sc">{R(9.4, 13.8, 5.2, 1.6, '#e8a23b', 'scarf', { rx: 0.8 })}{R(12.6, 14.6, 1.4, 2.6, '#e8a23b', 'scarfTail', { rx: 0.4 })}</g>);

  return (<g><Limbs shirt={o.shirt} />{torso}{front}{extra}</g>);
}

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

// 後層頭髮（在身體之後畫，長髮才有）
function HairBack({ hair, hc }) {
  switch (hair) {
    case 'long':
      return (<g>{R(4.6, 5.5, 14.8, 14.5, hc.body, 'b', { rx: 3 })}{R(4.6, 5.5, 2.4, 14.5, hc.dark, 'bs', { opacity: 0.3 })}{R(16.2, 5.5, 2.8, 14.5, hc.light, 'bh', { opacity: 0.35 })}</g>);
    case 'wavy':
      return (<g>{R(4.4, 5.5, 15.2, 12, hc.body, 'b', { rx: 3 })}{R(4.4, 16.5, 3, 3, hc.body, 'w1', { rx: 1.4 })}{R(8, 17.5, 3, 3, hc.body, 'w2', { rx: 1.4 })}{R(11.5, 17.5, 3, 3, hc.body, 'w3', { rx: 1.4 })}{R(15, 16.5, 3, 3, hc.body, 'w4', { rx: 1.4 })}{R(4.4, 5.5, 2.4, 12, hc.dark, 'bs', { opacity: 0.3 })}</g>);
    case 'ponytail':
      return (<g>{R(16.5, 6, 4, 11, hc.body, 'pt', { rx: 1.8 })}{R(16.5, 6, 1.4, 11, hc.dark, 'pts', { opacity: 0.3 })}{R(15.6, 6.4, 2.4, 2, hc.body, 'tie')}</g>);
    case 'braid':
      return (<g>{R(15.8, 7, 2.8, 2.4, hc.body, 'br1', { rx: 0.8 })}{R(16.2, 9, 2.4, 2.2, hc.dark, 'br2', { rx: 0.8 })}{R(15.8, 11, 2.8, 2.2, hc.body, 'br3', { rx: 0.8 })}{R(16.2, 13, 2.4, 2.2, hc.dark, 'br4', { rx: 0.8 })}{R(16.2, 15, 2, 1.4, '#ff5d8f', 'tieB', { rx: 0.4 })}</g>);
    case 'twin':
      return (<g>{R(3.2, 6, 3.2, 9, hc.body, 'tL', { rx: 1.5 })}{R(17.6, 6, 3.2, 9, hc.body, 'tR', { rx: 1.5 })}{R(3.2, 6, 1.2, 9, hc.dark, 'tLs', { opacity: 0.3 })}{R(18.4, 6, 1.2, 9, hc.light, 'tRh', { opacity: 0.35 })}</g>);
    default:
      return null;
  }
}

// 前層頭髮（瀏海/頂部/側髮/綁點）
function HairFront({ hair, hc }) {
  const top = (<>{R(5.8, 2.4, 12.4, 3.6, hc.body, 't', { rx: 1.8 })}{R(5.8, 2.4, 12.4, 1.1, hc.light, 'tl', { rx: 1.2, opacity: 0.8 })}{R(5.8, 2.6, 3, 3.2, hc.dark, 'ts', { opacity: 0.3 })}</>);
  // 柔順瀏海（女生款用）
  const bangs = (<>{R(6, 4.4, 12, 2.4, hc.body, 'bn', { rx: 1.2 })}{R(6, 4.4, 12, 0.9, hc.light, 'bnl', { rx: 1, opacity: 0.7 })}{R(10.4, 5.6, 3.2, 1.6, SKIN, 'part', { rx: 0.8 })}{R(6, 5.2, 2.6, 2.6, hc.body, 'sbL')}{R(15.4, 5.2, 2.6, 2.6, hc.body, 'sbR')}</>);
  switch (hair) {
    case 'buzz':
      return (<g>{R(6.2, 3.0, 11.6, 2.6, hc.body, 'b', { rx: 1.6 })}{R(6.2, 3.0, 11.6, 1, hc.light, 'bl', { rx: 1.2, opacity: 0.7 })}</g>);
    case 'spiky':
      return (<g>{R(7, 1.0, 1.8, 2.2, hc.body, 's1')}{R(9.4, 0.4, 1.8, 2.6, hc.body, 's2')}{R(11.8, 0.6, 1.8, 2.6, hc.body, 's3')}{R(14.2, 1.0, 1.8, 2.2, hc.body, 's4')}{top}</g>);
    case 'bob':
      return (<g>{top}{bangs}{R(5.4, 5, 2.6, 6.4, hc.body, 'bl', { rx: 1 })}{R(16, 5, 2.6, 6.4, hc.body, 'br', { rx: 1 })}{R(5.4, 5, 1, 6.4, hc.dark, 'bls', { opacity: 0.3 })}</g>);
    case 'long':
    case 'wavy':
      return (<g>{top}{bangs}{R(5.6, 5, 2.2, 7, hc.body, 'fL', { rx: 0.8 })}{R(16.2, 5, 2.2, 7, hc.body, 'fR', { rx: 0.8 })}</g>);
    case 'twin':
    case 'ponytail':
    case 'braid':
      return (<g>{top}{bangs}</g>);
    case 'bun':
      return (<g>{R(8.5, 0.6, 3.6, 3.6, hc.body, 'bun1', { rx: 1.8 })}{R(8.5, 0.6, 3.6, 1.4, hc.light, 'bunh', { rx: 1.4, opacity: 0.7 })}{R(13, 1.2, 3, 3, hc.body, 'bun2', { rx: 1.5 })}{top}{bangs}</g>);
    case 'short':
    default:
      return (<g>{top}{R(5.8, 5.2, 2.4, 2.8, hc.body, 'sbL')}{R(15.8, 5.2, 2.4, 2.8, hc.body, 'sbR')}{R(10.6, 4.8, 2.8, 1.8, hc.body, 'bang')}</g>);
  }
}

function Face({ mood, hc }) {
  const browY = mood === 'happy' || mood === 'surprised' || mood === 'excited' ? 6.5 : 6.9;
  const brows = mood === 'angry'
    ? (<><polygon points="8.3,7.6 11,6.9 11,7.7 8.3,8.3" fill={hc.dark} /><polygon points="15.7,7.6 13,6.9 13,7.7 15.7,8.3" fill={hc.dark} /></>)
    : mood === 'sad'
    ? (<><polygon points="8.3,7.0 11,7.7 11,8.4 8.3,7.7" fill={hc.dark} /><polygon points="15.7,7.0 13,7.7 13,8.4 15.7,7.7" fill={hc.dark} /></>)
    : (<>{R(8.3, browY, 2.7, 0.8, hc.dark, 'bwL', { rx: 0.3 })}{R(13, browY, 2.7, 0.8, hc.dark, 'bwR', { rx: 0.3 })}</>);

  let eyes;
  if (mood === 'faint') {
    const X = (cx) => (<g key={cx}><line x1={cx - 1.2} y1="8.4" x2={cx + 1.2} y2="10.6" stroke={INK} strokeWidth="0.7" strokeLinecap="round" /><line x1={cx + 1.2} y1="8.4" x2={cx - 1.2} y2="10.6" stroke={INK} strokeWidth="0.7" strokeLinecap="round" /></g>);
    eyes = (<>{X(9.6)}{X(14.3)}</>);
  } else if (mood === 'love') {
    const heart = (cx) => <path key={cx} d={`M${cx} 10.4 C${cx - 1.8} 8.4 ${cx - 1.8} 7.6 ${cx} 8.6 C${cx + 1.8} 7.6 ${cx + 1.8} 8.4 ${cx} 10.4 Z`} fill="#ff5d8f" />;
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
      {brows}{eyes}
      {R(11.5, 10.3, 1, 0.9, SKIN_SH, 'nose', { rx: 0.3 })}
      {mood !== 'angry' && mood !== 'faint' && (<>{R(7.5, 9.9, 1.7, 1.3, BLUSH, 'blL', { rx: 0.6, opacity: 0.7 })}{R(14.8, 9.9, 1.7, 1.3, BLUSH, 'blR', { rx: 0.6, opacity: 0.7 })}</>)}
      {mouth}
    </g>
  );
}

// 玩家自選臉部配件
function FaceAccessory({ accessory }) {
  if (accessory === 'glasses') {
    return (<g><rect x="8" y="7.9" width="3.2" height="3.1" rx="0.8" fill="rgba(255,255,255,0.22)" stroke={INK} strokeWidth="0.45" /><rect x="12.8" y="7.9" width="3.2" height="3.1" rx="0.8" fill="rgba(255,255,255,0.22)" stroke={INK} strokeWidth="0.45" /><rect x="11.2" y="9" width="1.6" height="0.5" fill={INK} /></g>);
  }
  if (accessory === 'bow') {
    return (<g>{R(4.6, 3.0, 1.6, 1.6, '#ff5d8f', 'b1')}{R(6.6, 3.0, 1.6, 1.6, '#ff5d8f', 'b2')}{R(5.8, 3.4, 1.4, 1.4, '#d23b6a', 'b3', { rx: 0.4 })}</g>);
  }
  if (accessory === 'flower') {
    return (<g>{R(15.4, 3.0, 1.3, 1.3, '#ff8fb0', 'f1', { rx: 0.6 })}{R(16.7, 3.0, 1.3, 1.3, '#ff8fb0', 'f2', { rx: 0.6 })}{R(15.4, 4.2, 1.3, 1.3, '#ff8fb0', 'f3', { rx: 0.6 })}{R(16.7, 4.2, 1.3, 1.3, '#ff8fb0', 'f4', { rx: 0.6 })}{R(16.1, 3.7, 1, 1, '#ffd24a', 'fc', { rx: 0.5 })}</g>);
  }
  return null;
}

// 職業頭飾（畫在頭髮之上）
function Headwear({ profession }) {
  const o = PROFESSION_OUTFIT[profession];
  if (!o || !o.head) return null;
  switch (o.head) {
    case 'chefhat':
      return (<g>{R(7.5, 0.2, 9, 2.4, WHITE, 'p', { rx: 1.4 })}{R(7, 2.4, 10, 2, WHITE, 'band', { rx: 0.5 })}{R(7, 4.0, 10, 0.6, '#e0ddd4', 'bandSh')}</g>);
    case 'policecap':
      return (<g>{R(6.6, 2.2, 10.8, 2.2, o.dark, 'cap', { rx: 0.6 })}{R(5.6, 4.0, 12.8, 1.3, '#1f2a3a', 'brim', { rx: 0.5 })}{R(10.4, 2.4, 3.2, 1.6, '#1f2a3a', 'plate', { rx: 0.3 })}{R(11.4, 2.7, 1.2, 1, '#ffd24a', 'emb', { rx: 0.3 })}</g>);
    case 'pilotcap':
      return (<g>{R(6.6, 2.2, 10.8, 2.2, o.dark, 'cap', { rx: 0.6 })}{R(5.6, 4.0, 12.8, 1.3, '#10182a', 'brim', { rx: 0.5 })}{R(6.6, 4.0, 10.8, 0.7, '#ffd24a', 'gold' )}{R(11, 2.5, 2, 1.5, '#ffd24a', 'emb', { rx: 0.3 })}</g>);
    case 'nursecap':
      return (<g>{R(8, 1.8, 8, 2.4, WHITE, 'cap', { rx: 0.6 })}{R(11.4, 2.4, 1.2, 0.4, '#e23b3b', 'cx1')}{R(11.7, 2.0, 0.6, 1.2, '#e23b3b', 'cx2')}</g>);
    case 'storecap':
      return (<g>{R(6.8, 2.4, 10.4, 2, o.shirt, 'cap', { rx: 0.8 })}{R(5.8, 4.0, 7, 1, o.dark, 'brim', { rx: 0.4 })}</g>);
    case 'bandana':
      return (<g>{R(6.2, 2.6, 11.6, 1.8, o.shirt, 'b', { rx: 0.5 })}{R(6.2, 2.6, 11.6, 1.8, '#ffffff', 'dots', { opacity: 0.12 })}</g>);
    case 'headphones':
      return (<g><path d="M5.4 8 Q5.4 1.6 12 1.6 Q18.6 1.6 18.6 8" stroke="#2c3138" strokeWidth="1.1" fill="none" />{R(4.4, 7.4, 2.2, 3, '#2c3138', 'earL', { rx: 0.8 })}{R(17.4, 7.4, 2.2, 3, '#2c3138', 'earR', { rx: 0.8 })}</g>);
    default:
      return null;
  }
}

function Effects({ mood }) {
  if (mood === 'sad') return (<g className="av-tear">{R(8.8, 10.6, 1.1, 1.8, '#5cc1ee', 't1', { rx: 0.4 })}{R(14.2, 10.6, 1.1, 1.8, '#5cc1ee', 't2', { rx: 0.4 })}</g>);
  if (mood === 'love') return (<g className="av-heart"><path d="M6 3 C5 1.6 3.4 2.4 6 4.4 C8.6 2.4 7 1.6 6 3 Z" fill="#ff5d8f" /><path d="M18.4 4 C17.6 2.9 16.4 3.5 18.4 5 C20.4 3.5 19.2 2.9 18.4 4 Z" fill="#ff7da6" /></g>);
  if (mood === 'angry') return (<g className="av-anger">{R(16.4, 3.2, 1.1, 1.1, '#e23b3b', 'a1')}{R(17.6, 2.2, 1.1, 1.1, '#e23b3b', 'a2')}{R(17.6, 4.2, 1.1, 1.1, '#e23b3b', 'a3')}{R(18.8, 3.2, 1.1, 1.1, '#e23b3b', 'a4')}</g>);
  return null;
}

// 主元件。臉自訂(hair/hairColor/accessory/mood)，服裝依 profession。size = 寬度。
export function Avatar({ hair = 'short', hairColor = 'brown', accessory = 'none', profession, mood = 'neutral', size = 64, walking = false, className = '' }) {
  const hc = hairColorOf(hairColor);
  const anim = MOOD_ANIM[mood] || 'av-idle';
  const h = size * 30 / 24;
  return (
    <div className={'av-wrap ' + (walking ? 'av-walk ' : '') + className} style={{ width: size, height: h }}>
      <svg viewBox="0 0 24 30" width={size} height={h} className={anim} shapeRendering="geometricPrecision" style={{ overflow: 'visible' }}>
        <HairBack hair={hair} hc={hc} />
        <Outfit profession={profession} />
        <Head />
        <HairFront hair={hair} hc={hc} />
        <Face mood={mood} hc={hc} />
        <FaceAccessory accessory={accessory} />
        <Headwear profession={profession} />
        <Effects mood={mood} />
      </svg>
    </div>
  );
}

export default Avatar;
