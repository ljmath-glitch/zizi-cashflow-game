import Avatar, {
  AVATAR_TYPES, HAIR_COLORS, AVATAR_ACCESSORIES, MOODS,
} from '../components/Avatar.jsx';

// 角色預覽頁（/avatars）：一次看完髮型／髮色／配件／職業服裝／表情，方便調整風格。
const MOOD_LABEL = {
  neutral: '平靜', happy: '開心', excited: '興奮', sad: '難過',
  angry: '生氣', surprised: '驚訝', love: '喜愛', faint: '暈倒',
};

const PROFESSIONS = [
  ['doctor', '🩺 醫師'], ['nurse', '🩹 護理師'], ['engineer', '💻 工程師'], ['teacher', '🧑‍🏫 老師'],
  ['youtuber', '🎬 YouTuber'], ['restaurant', '🍜 餐廳老闆'], ['police', '👮 警察'], ['sales', '💼 業務員'],
  ['lawyer', '⚖️ 律師'], ['pilot', '✈️ 機師'], ['manager', '👔 經理'], ['flightattendant', '🧳 空服員'],
  ['civilservant', '🏛️ 公務員'], ['chef', '👨‍🍳 廚師'], ['ecommerce', '🛍️ 電商'], ['clerk', '🏪 店員'],
  ['firefighter', '🚒 消防員'], ['vet', '🐾 獸醫'], ['streamer', '🎮 遊戲實況主'], ['barista', '☕ 咖啡廳店長'],
  ['hairstylist', '💇 髮型設計師'], ['security', '🛡️ 保全'],
];

function Cell({ label, children }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-white/70 rounded-2xl p-3 ring-1 ring-slate-200 w-24">
      <div className="h-24 flex items-end">{children}</div>
      <span className="text-xs text-slate-600 text-center leading-tight">{label}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="w-full max-w-6xl">
      <h2 className="text-lg font-bold text-zizi-ink mb-2">{title}</h2>
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

export default function AvatarGallery() {
  return (
    <div className="min-h-full app-bg p-6 flex flex-col items-center gap-7">
      <div className="text-center">
        <h1 className="text-2xl font-black text-zizi-ink">角色預覽</h1>
        <p className="text-sm text-slate-500">原創像素角色 ‧ 臉自訂、服裝依職業 ‧ 截圖回我調整</p>
      </div>

      <Section title="職業服裝（16 種，臉用預設）">
        {PROFESSIONS.map(([id, name]) => (
          <Cell key={id} label={name}>
            <Avatar hair="short" hairColor="brown" profession={id} size={68} />
          </Cell>
        ))}
      </Section>

      <Section title="髮型（女生款重畫：長直髮／波浪捲／雙馬尾／馬尾／丸子頭／麻花辮）">
        {AVATAR_TYPES.map((a) => (
          <Cell key={a.id} label={a.name}>
            <Avatar hair={a.id} hairColor="brown" profession="teacher" size={68} />
          </Cell>
        ))}
      </Section>

      <Section title="髮色">
        {HAIR_COLORS.map((c) => (
          <Cell key={c.id} label={c.name}>
            <Avatar hair="long" hairColor={c.id} profession="ecommerce" size={68} />
          </Cell>
        ))}
      </Section>

      <Section title="配件">
        {AVATAR_ACCESSORIES.map((a) => (
          <Cell key={a.id} label={a.name}>
            <Avatar hair="bob" hairColor="black" accessory={a.id} profession="manager" size={68} />
          </Cell>
        ))}
      </Section>

      <Section title="表情（會動）">
        {MOODS.map((m) => (
          <Cell key={m} label={MOOD_LABEL[m]}>
            <Avatar hair="twin" hairColor="pink" profession="youtuber" mood={m} size={68} />
          </Cell>
        ))}
      </Section>

      <Section title="散步動畫">
        {['doctor', 'police', 'chef', 'pilot', 'nurse'].map((id, i) => (
          <Cell key={i} label="走路中">
            <Avatar hair={['short', 'spiky', 'bun', 'short', 'ponytail'][i]} hairColor="brown" profession={id} mood="happy" size={72} walking />
          </Cell>
        ))}
      </Section>
    </div>
  );
}
