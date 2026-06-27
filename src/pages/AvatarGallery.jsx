import Avatar, {
  AVATAR_TYPES, AVATAR_COLORS, HAIR_COLORS, AVATAR_ACCESSORIES, MOODS,
} from '../components/Avatar.jsx';

// 角色預覽頁（/avatars）：一次看完所有髮型／髮色／服裝／配件／表情，方便調整風格。
const MOOD_LABEL = {
  neutral: '平靜', happy: '開心', excited: '興奮', sad: '難過',
  angry: '生氣', surprised: '驚訝', love: '喜愛', faint: '暈倒',
};

function Cell({ label, children }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-white/70 rounded-2xl p-3 ring-1 ring-slate-200">
      {children}
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="w-full max-w-5xl">
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
        <p className="text-sm text-slate-500">原創像素角色 ‧ 看看要不要調整，截圖回我即可</p>
      </div>

      <Section title="髮型（棕髮 ‧ 天空藍服裝）">
        {AVATAR_TYPES.map((a) => (
          <Cell key={a.id} label={a.name}>
            <Avatar hair={a.id} hairColor="brown" color="sky" size={64} />
          </Cell>
        ))}
      </Section>

      <Section title="髮色（短髮）">
        {HAIR_COLORS.map((c) => (
          <Cell key={c.id} label={c.name}>
            <Avatar hair="short" hairColor={c.id} color="sky" size={64} />
          </Cell>
        ))}
      </Section>

      <Section title="服裝色">
        {AVATAR_COLORS.map((c) => (
          <Cell key={c.id} label={c.name}>
            <Avatar hair="short" hairColor="brown" color={c.id} size={64} />
          </Cell>
        ))}
      </Section>

      <Section title="配件">
        {AVATAR_ACCESSORIES.map((a) => (
          <Cell key={a.id} label={a.name}>
            <Avatar hair="short" hairColor="brown" color="rose" accessory={a.id} size={64} />
          </Cell>
        ))}
      </Section>

      <Section title="表情（喜怒哀樂 ‧ 會動）">
        {MOODS.map((m) => (
          <Cell key={m} label={MOOD_LABEL[m]}>
            <Avatar hair="twin" hairColor="pink" color="violet" mood={m} size={64} />
          </Cell>
        ))}
      </Section>

      <Section title="散步動畫 + 隨機搭配">
        {[
          { hair: 'long', hairColor: 'blonde', color: 'mint', accessory: 'bow' },
          { hair: 'spiky', hairColor: 'blue', color: 'crimson', accessory: 'glasses' },
          { hair: 'bob', hairColor: 'black', color: 'gold', accessory: 'hat' },
          { hair: 'buzz', hairColor: 'ginger', color: 'orange', accessory: 'none' },
          { hair: 'twin', hairColor: 'mintH', color: 'sky', accessory: 'bow' },
        ].map((cfg, i) => (
          <Cell key={i} label="走路中">
            <Avatar {...cfg} mood="happy" size={72} walking />
          </Cell>
        ))}
      </Section>
    </div>
  );
}
