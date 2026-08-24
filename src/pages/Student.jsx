import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket.js';
import { useConnection } from '../hooks/useConnection.js';
import { useGameState } from '../hooks/useGameState.js';
import { useTeams } from '../hooks/useTeams.js';
import { useMyTeam } from '../hooks/useMyTeam.js';
import { formatMoney } from '../util/format.js';
import {
  netWorthOf,
  freedomPercent,
  freedomGap,
  isFinanciallyFree,
  PASSIVE_LABEL,
} from '../util/finance.js';
import { SQUARE_META } from '../util/board.js';
import { toast } from '../util/toast.js';
import { api } from '../base.js';
import ConnectionBadge from '../components/ConnectionBadge.jsx';
import Sparkline from '../components/Sparkline.jsx';
import Toaster from '../components/Toaster.jsx';
import Avatar, { AVATAR_TYPES, HAIR_COLORS, AVATAR_ACCESSORIES } from '../components/Avatar.jsx';

// 學生端（手機）— v2(M6)：完整損益表 + 資產負債表 + 市場（現代化資產）
export default function Student() {
  const { connected } = useConnection();
  const game = useGameState();
  const { team, resuming, join, resume, offerProfessions } = useMyTeam();

  const phase = game?.phase ?? 'lobby';
  const roundLabel =
    phase === 'lobby'
      ? '等待開始'
      : phase === 'ended'
      ? '遊戲結束'
      : `第 ${game.round} 回合`;

  return (
    <div className="min-h-full app-bg flex flex-col">
      <header className="relative bg-gradient-to-r from-zizi-dusk via-zizi-plum to-zizi-dusk text-white px-4 py-3 flex items-center justify-between shadow-lg overflow-hidden">
        {/* 標題列頂端一道金色細光 */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zizi-amber to-transparent" />
        <h1 className="font-bold flex items-center gap-1.5 drop-shadow-md">
          <span className="drop-shadow">⚡</span>
          茲茲財富自由挑戰賽
          <span className="ml-1 text-white text-xs font-medium bg-black/15 ring-1 ring-white/25 rounded-full px-2 py-0.5">
            {roundLabel}
          </span>
        </h1>
        <ConnectionBadge connected={connected} />
      </header>

      {team ? (
        <>
          <FinancePanel team={team} phase={phase} />
          <PendingModal team={team} />
          <Toaster />
        </>
      ) : resuming ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">還原中…</div>
      ) : (
        <JoinForm connected={connected} join={join} resume={resume} offerProfessions={offerProfessions} />
      )}

      {/* 版權署名：茲茲品牌＋著作人(別名)。授權使用、非轉讓 */}
      <footer className="mt-auto py-3 text-center text-slate-400/70 text-[11px]">
        茲茲 出品 · © 2026 李云 版權所有
      </footer>
    </div>
  );
}

function JoinForm({ connected, join, resume, offerProfessions }) {
  const [teamName, setTeamName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [options, setOptions] = useState(null); // 二選一的兩張職業卡
  const [hair, setHair] = useState(AVATAR_TYPES[0].id);
  const [hairColor, setHairColor] = useState(HAIR_COLORS[0].id);
  const [accessory, setAccessory] = useState(AVATAR_ACCESSORIES[0].id);
  const avatar = { hair, hairColor, accessory };

  // 第一步：送出隊名 → 抽兩張職業卡
  async function handleNext() {
    if (busy) return;
    setBusy(true);
    const opts = await offerProfessions();
    setOptions(opts);
    setBusy(false);
  }

  // 第二步：選定職業 → 正式加入（帶上自選角色）
  async function pick(professionId) {
    if (busy) return;
    setBusy(true);
    await join(teamName, professionId, avatar);
    setBusy(false);
  }

  async function handleResume() {
    if (busy || !code.trim()) return;
    setBusy(true);
    setErr(null);
    const res = await resume(code);
    if (!res?.ok) setErr('找不到這個代號，請確認後再試');
    setBusy(false);
  }

  // 第二步畫面：二選一職業卡
  if (options) {
    return (
      <main className="flex-1 flex flex-col items-center gap-4 p-6">
        <h2 className="text-xl font-bold text-zizi-ink mt-2">選一個職業</h2>
        <p className="text-sm text-slate-500">{teamName || '你們這組'}，挑一張職業卡開始挑戰！</p>
        <div className="w-full max-w-md space-y-3">
          {options.map((p) => (
            <ProfessionChoice key={p.id} prof={p} disabled={busy} onPick={() => pick(p.id)} />
          ))}
        </div>
        <p className="text-xs text-slate-400">抽到就要二選一，沒辦法重抽喔！</p>
      </main>
    );
  }

  // 第一步畫面：輸入隊名
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-5 p-6">
      <div className="glass ring-1 ring-white/50 shadow-soft rounded-[2rem] px-7 py-8 w-full max-w-xs flex flex-col items-center gap-5">
        <div className="text-5xl animate-float drop-shadow-sm">📱</div>
        <h2 className="text-xl font-bold text-zizi-ink -mt-1">加入遊戲</h2>
        <p className="text-center text-xs text-slate-500 -mt-3">
          🎯 目標：讓<b className="text-zizi-ink">被動收入超過總支出</b>，跳出老鼠賽跑圈、達成財富自由！
        </p>

        {/* 捏臉：髮型 / 髮色 / 配件（服裝之後由你抽到的職業決定） */}
        <div className="w-full">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="bg-zizi-gold/15 rounded-2xl px-3 pt-2 pb-1">
              <Avatar hair={hair} hairColor={hairColor} accessory={accessory} mood="happy" size={64} walking />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-zizi-ink">捏一個角色</p>
              <p className="text-xs text-slate-500">骰骰子時它會在大螢幕演出喜怒哀樂！</p>
              <p className="text-[0.65rem] text-slate-400">服裝會依你抽到的職業變裝 👔</p>
            </div>
          </div>

          {/* 髮型 */}
          <p className="text-xs text-slate-500 mb-1">髮型</p>
          <div className="grid grid-cols-5 gap-1.5">
            {AVATAR_TYPES.map((a) => (
              <button
                key={a.id}
                onClick={() => setHair(a.id)}
                className={'rounded-xl pt-1 flex items-end justify-center overflow-hidden h-12 transition ' + (hair === a.id ? 'bg-zizi-gold/25 ring-2 ring-zizi-gold' : 'bg-white/60 ring-1 ring-slate-200')}
                title={a.name}
              >
                <Avatar hair={a.id} hairColor={hairColor} accessory="none" mood="neutral" size={30} />
              </button>
            ))}
          </div>

          {/* 髮色 */}
          <p className="text-xs text-slate-500 mt-2 mb-1">髮色</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {HAIR_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setHairColor(c.id)}
                className={'w-6 h-6 rounded-full transition ' + (hairColor === c.id ? 'ring-2 ring-offset-2 ring-zizi-gold scale-110' : 'ring-1 ring-slate-300')}
                style={{ backgroundColor: c.body }}
                title={c.name}
              />
            ))}
          </div>

          {/* 配件 */}
          <p className="text-xs text-slate-500 mt-2 mb-1">配件</p>
          <div className="grid grid-cols-4 gap-1.5">
            {AVATAR_ACCESSORIES.map((a) => (
              <button
                key={a.id}
                onClick={() => setAccessory(a.id)}
                className={'rounded-lg py-1 text-xs font-medium transition ' + (accessory === a.id ? 'bg-zizi-gold/25 ring-2 ring-zizi-gold text-zizi-ink' : 'bg-white/60 ring-1 ring-slate-200 text-slate-500')}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full space-y-3">
          <label className="block">
            <span className="text-sm text-slate-600">隊名</span>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="輸入你們這組的隊名"
              maxLength={20}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white/70 px-3 py-2 focus:border-zizi-gold focus:ring-2 focus:ring-zizi-gold/30 focus:outline-none transition"
            />
          </label>
          <button
            onClick={handleNext}
            disabled={!connected || busy}
            className="w-full rounded-xl bg-gradient-to-r from-zizi-gold to-amber-500 text-white font-semibold py-3 shadow-glow disabled:opacity-50 disabled:shadow-none"
          >
            {busy ? '抽卡中…' : '🎴 抽職業卡（二選一）'}
          </button>
        </div>
      </div>
      <div className="w-full max-w-xs border-t border-slate-200/70 pt-4">
        <p className="text-xs text-slate-500 mb-2">已經有組別代號？輸入它重新登入：</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="例如 T3-4829"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 focus:border-zizi-gold focus:outline-none"
          />
          <button
            onClick={handleResume}
            disabled={!connected || busy}
            className="rounded-xl bg-zizi-ink text-white font-medium px-4 disabled:opacity-50"
          >
            重新登入
          </button>
        </div>
        {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
      </div>
      <p className="text-xs text-slate-400">
        {connected ? '已連上伺服器 ✅' : '正在連線伺服器…'}
      </p>
    </main>
  );
}

// 二選一的單張職業卡（顯示關鍵數字幫助決策）
function ProfessionChoice({ prof, disabled, onPick }) {
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      className="w-full text-left glass ring-1 ring-white/50 rounded-3xl shadow-soft p-4 border-2 border-transparent hover:border-zizi-gold hover:-translate-y-0.5 hover:shadow-glow transition-all duration-200 disabled:opacity-50"
    >
      <div className="flex items-center gap-3">
        <span className="text-4xl">{prof.emoji}</span>
        <div className="flex-1">
          <p className="text-lg font-bold text-zizi-ink">
            {prof.name}
            <span className={'ml-2 text-xs rounded-full px-2 py-0.5 ' + (prof.hasHouse ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500')}>
              {prof.hasHouse ? '🏠 有自住房' : '🏠 租屋族'}
            </span>
          </p>
          <p className="text-xs text-zizi-gold">{prof.perk}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <Stat label="月薪" value={prof.variableIncome ? '浮動' : formatMoney(prof.salary)} />
        <Stat label="月支出" value={formatMoney(prof.expenseTotal)} />
        <Stat label="起始存款" value={formatMoney(prof.savings)} />
        <Stat
          label="月現金流"
          value={(prof.cashflowStart >= 0 ? '+' : '-') + formatMoney(Math.abs(prof.cashflowStart))}
          good={prof.cashflowStart >= 0}
        />
        <Stat label="起始負債" value={formatMoney(prof.liabilitiesTotal)} good={prof.liabilitiesTotal === 0 ? undefined : false} />
        <Stat
          label="淨資產"
          value={(prof.netWorthStart >= 0 ? '' : '-') + formatMoney(Math.abs(prof.netWorthStart))}
          good={prof.netWorthStart >= 0}
        />
      </div>
      <div className="mt-2 bg-zizi-gold/10 rounded-lg px-3 py-2 text-xs text-zizi-ink">
        🎯 被動收入達 <b>{formatMoney(prof.freedomThreshold)}/月</b> 就財富自由！
      </div>
    </button>
  );
}

function Stat({ label, value, good }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={'font-semibold tabular-nums ' + (good === false ? 'text-red-500' : 'text-slate-700')}>
        {value}
      </span>
    </div>
  );
}

const TABS = [
  { key: 'finance', label: '💰 損益' },
  { key: 'market', label: '🛒 市場' },
  { key: 'balance', label: '📊 資產負債' },
  { key: 'history', label: '📜 歷史' },
];
// 初階分頁：只有「總覽（簡化儀表）＋市場」，不給完整損益表/資產負債表，降低國中生負擔
const BASIC_TABS = [
  { key: 'overview', label: '📊 總覽' },
  { key: 'market', label: '🛒 市場' },
];

function FinancePanel({ team, phase }) {
  const game = useGameState();
  const basic = game?.stage === 'basic';
  const tabs = basic ? BASIC_TABS : TABS;
  const [tab, setTab] = useState('finance');
  const [dir, setDir] = useState(1); // 內容滑入方向：右切=+1、左切=-1
  const cur = tabs.some((t) => t.key === tab) ? tab : tabs[0].key; // 切換模式時，若原分頁不存在就回第一頁
  const idx = tabs.findIndex((t) => t.key === cur);
  const free = isFinanciallyFree(team);
  const d = team.derived || {};

  function changeTab(key) {
    const ni = tabs.findIndex((t) => t.key === key);
    if (ni === idx) return;
    setDir(ni > idx ? 1 : -1);
    setTab(key);
  }

  // 手指左右滑動切換分頁（滑動 UI）
  // 只有「明顯水平」的滑動才換頁：水平位移要夠大、且明顯大於垂直位移，
  // 避免直向捲動（尤其滑到底時）帶一點左右偏移就被誤判成換分頁。
  const touchStart = useRef(null);
  function onTouchStart(e) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e) {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 60) return; // 水平位移不夠大
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return; // 比較像直向捲動 → 不換頁
    const ni = dx < 0 ? Math.min(idx + 1, tabs.length - 1) : Math.max(idx - 1, 0);
    if (ni !== idx) changeTab(tabs[ni].key);
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* 職業卡 + 存款 + 月現金流（深藍懸浮玻璃面板） */}
      <div className="bg-gradient-to-b from-zizi-caramel to-zizi-ink text-white px-4 pb-4 pt-1">
        <div className="bg-white/10 ring-1 ring-white/15 backdrop-blur rounded-2xl p-3 flex items-center gap-3 shadow-lg">
          <span className="text-4xl grid place-items-center w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/15">{team.professionEmoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/60 truncate">
              {team.name} ‧ 代號 <span className="font-mono text-zizi-gold">{team.id}</span>
            </p>
            <p className="text-lg font-bold leading-tight truncate">{team.professionName}</p>
            <p className="text-xs text-zizi-gold truncate">{team.professionPerk}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-white/60">{team.cash < 0 ? '存款（欠款待補）' : '存款'}</p>
            <p className={'text-lg font-bold tabular-nums ' + (team.cash < 0 ? 'text-rose-300' : '')}>{formatMoney(team.cash)}</p>
            <p className={'text-xs tabular-nums ' + ((d.cashflow ?? 0) >= 0 ? 'text-green-300' : 'text-red-300')}>
              月現金流 {(d.cashflow ?? 0) >= 0 ? '+' : '-'}{formatMoney(Math.abs(d.cashflow ?? 0))}
            </p>
          </div>
        </div>
      </div>

      {team.bankrupt && (
        <div className="bg-red-600 text-white text-center py-2 font-bold">
          💀 你已破產被淘汰（資不抵債、又入不敷出）
        </div>
      )}

      {free && !team.bankrupt && (basic
        ? <div className="bg-green-500 text-white text-center py-2 font-bold">🎉👑 恭喜達成財富自由！被動收入已經 ≥ 支出</div>
        : <AchievementPanel team={team} phase={phase} />)}

      {!team.bankrupt && (team.personalLiabilities?.bankLoan || 0) > 0 && (
        <div className="bg-red-500 text-white text-center py-1.5 text-sm font-medium">
          ⚠️ 銀行貸款 {formatMoney(team.personalLiabilities.bankLoan)}，每月利息 {formatMoney(Math.round(team.personalLiabilities.bankLoan * 0.10))}（月息10%）
        </div>
      )}

      {!team.bankrupt && <RollBar team={team} phase={phase} />}

      {/* 滑動膠囊式分頁：白色指示器在底層平滑滑到所選分頁 */}
      <nav className="px-3 pt-3 pb-2 bg-white/60 backdrop-blur border-b border-white/50">
        <div className="relative flex p-1 bg-slate-100/80 rounded-2xl">
          <span
            className="seg-indicator absolute inset-y-1 left-1 rounded-xl bg-white shadow-[0_2px_10px_rgba(245,158,11,0.28)]"
            style={{
              width: `calc((100% - 0.5rem) / ${tabs.length})`,
              transform: `translateX(calc(${idx} * 100%))`,
            }}
          />
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={
                'relative z-10 flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ' +
                (cur === t.key ? 'text-zizi-ink' : 'text-slate-400')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main
        className="flex-1 p-4 overflow-auto"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div key={cur} className="slide-in" style={{ '--slide-from': dir > 0 ? '16px' : '-16px' }}>
          {cur === 'overview' && <BasicOverview team={team} />}
          {cur === 'finance' && <IncomeStatement team={team} />}
          {cur === 'market' && <MarketTab team={team} phase={phase} />}
          {cur === 'balance' && <BalanceSheet team={team} phase={phase} />}
          {cur === 'history' && <HistoryTab team={team} />}
        </div>
      </main>
    </div>
  );
}

// 損益表：收入（工資 + 被動四類）− 支出各項 = 月現金流，含財富自由進度
// 彈窗外框（模組層級的穩定元件；不可定義在 PendingModal 內，否則每次 render 會重掛、吃掉點擊）
function Overlay({ children }) {
  return (
    <div className="fixed inset-0 z-30 bg-zizi-ink/55 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="card-pop w-full max-w-sm bg-white/95 ring-1 ring-white/60 rounded-3xl p-5 shadow-2xl my-auto">{children}</div>
    </div>
  );
}

// 格子互動彈窗：機會（選牌庫→買/放棄）、慈善（捐/不捐）
// 重要：所有決定都用 socket ack 確認，成功才關閉彈窗（不靠廣播，手機斷線重連也不會卡死）；
// 並用 busy 防連點，避免狂按狂跳 toast。
function PendingModal({ team }) {
  const game = useGameState();
  const pa = team.pendingAction;
  const [busy, setBusy] = useState(false);
  const [resolvedKey, setResolvedKey] = useState(null);

  // 用 pendingAction 的內容當識別；換成新的事件時自動「解鎖」重新顯示
  const paKey = pa
    ? `${pa.type}:${pa.card?.id ?? ''}:${pa.cost ?? ''}:${pa.offerPrice ?? ''}`
    : null;

  // 事件變了就重置（避免上一個的 busy/已處理狀態殘留）
  useEffect(() => {
    setBusy(false);
  }, [paKey]);

  if (!pa) return null;
  if (resolvedKey === paKey) return null; // 已送出且伺服器確認 → 先關閉，等新狀態進來

  // 送出決定：靠 ack 判斷成敗。成功→關閉(+慶祝)；失敗→顯示原因；逾時→解鎖可重試
  function decide(event, args, okToast) {
    if (busy) return;
    setBusy(true);
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        setBusy(false);
        toast({ emoji: '📡', title: '連線有點慢，請再按一次', tone: 'bad' });
      }
    }, 4000);
    socket.emit(event, { teamId: team.id, ...args }, (res) => {
      done = true;
      clearTimeout(timer);
      setBusy(false);
      if (res?.ok) {
        setResolvedKey(paKey);
        if (okToast) toast(okToast);
      } else {
        toast({ emoji: '⚠️', title: res?.reason || '操作失敗，請再試一次', tone: 'bad' });
      }
    });
  }

  if (pa.type === 'opportunity') {
    return (
      <Overlay>
        <div className="text-center">
          <div className="text-4xl mb-1">🎲</div>
          <h3 className="text-lg font-bold text-zizi-ink mb-1">機會來了！</h3>
          <p className="text-sm text-slate-500 mb-4">選一種投資機會抽卡</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={busy}
              onClick={() => decide('student:chooseDeck', { deck: 'small' })}
              className="rounded-xl bg-emerald-500 text-white font-bold py-4 disabled:opacity-50"
            >
              🟢 小生意<span className="block text-xs font-normal">便宜、現金少也能玩</span>
            </button>
            <button
              disabled={busy}
              onClick={() => decide('student:chooseDeck', { deck: 'big' })}
              className="rounded-xl bg-amber-600 text-white font-bold py-4 disabled:opacity-50"
            >
              🔵 大買賣<span className="block text-xs font-normal">昂貴、報酬高</span>
            </button>
            {team.free && game?.stage === 'full' && (
              <button
                disabled={busy}
                onClick={() => decide('student:chooseDeck', { deck: 'super' })}
                className="col-span-2 rounded-xl bg-gradient-to-r from-zizi-gold to-amber-500 text-zizi-ink font-black py-4 shadow-glow disabled:opacity-50"
              >
                🚀 超級生意<span className="block text-xs font-bold">財富自由專屬 · 超高報酬、本金不用大，以錢滾錢！</span>
              </button>
            )}
          </div>
        </div>
      </Overlay>
    );
  }

  if (pa.type === 'deal') {
    const c = pa.card;
    const afford = team.cash >= c.cost;
    // 年化投資報酬率 = 月現金流×12 ÷ 投入頭期
    const roi = c.cost ? Math.round((c.monthlyIncome * 12 / c.cost) * 100) : 0;
    const mi = c.monthlyIncome || 0;
    return (
      <Overlay>
        <div className="text-center">
          <div className="text-5xl mb-1">{c.emoji}</div>
          <p className="text-xs text-zizi-gold font-medium">{pa.deck === 'big' ? '大額機會' : '小額機會'}</p>
          <h3 className="text-lg font-bold text-zizi-ink">{c.name}</h3>
          {c.story && <p className="text-xs text-slate-500 mt-1 mb-2 leading-relaxed">{c.story}</p>}
          <div className="bg-slate-50 rounded-xl p-3 text-sm grid grid-cols-2 gap-y-1 mb-3">
            <span className="text-slate-400">需要現金（頭期）</span>
            <span className="text-right font-semibold">{formatMoney(c.cost)}</span>
            {c.mortgage > 0 && (<>
              <span className="text-slate-400">抵押貸款<span className="text-[0.6rem]">（不計息、賣出時清償）</span></span>
              <span className="text-right font-semibold text-red-500">{formatMoney(c.mortgage)}</span>
            </>)}
            <span className="text-slate-400">每月現金流<span className="text-[0.6rem]">（已扣抵押貸）</span></span>
            <span className={'text-right font-semibold ' + (mi >= 0 ? 'text-green-600' : 'text-red-500')}>
              {mi >= 0 ? '+' : '-'}{formatMoney(Math.abs(mi))}
            </span>
            <span className="text-slate-400">投資報酬率（年）</span>
            <span className={'text-right font-bold ' + (roi >= 0 ? 'text-green-600' : 'text-red-500')}>{roi}%</span>
            {c.priceLow && c.priceHigh && (<>
              <span className="text-slate-400">售價範圍</span>
              <span className="text-right font-semibold text-slate-700">{formatMoney(c.priceLow)}~{formatMoney(c.priceHigh)}</span>
            </>)}
          </div>
          {mi < 0 && (
            <p className="text-xs text-amber-600 mb-2">⚠️ 這筆每月會小虧，但售價範圍高、有增值翻盤機會</p>
          )}
          {!afford && (() => {
            // 貸款購買預覽：借差額(湊整到萬)×月息10% 的利息，對比資產月收，算出「貸款後每月現金流是增是減」
            const loanAmt = Math.max(0, Math.ceil((c.cost - team.cash) / 10000) * 10000);
            const loanInterest = Math.round(loanAmt * 0.1);
            const net = mi - loanInterest;
            return (
              <div className={'rounded-xl p-3 mb-3 ring-1 ' + (net >= 0 ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200')}>
                <p className="text-[0.72rem] font-semibold text-slate-600 mb-1">💳 若「貸款購買」，每月現金流變化：</p>
                <div className="grid grid-cols-2 gap-y-0.5 text-xs">
                  <span className="text-slate-500">資產月收</span>
                  <span className={'text-right font-semibold ' + (mi >= 0 ? 'text-green-600' : 'text-red-500')}>{mi >= 0 ? '+' : '−'}{formatMoney(Math.abs(mi))}</span>
                  <span className="text-slate-500">貸款月息（借 {formatMoney(loanAmt)}×10%）</span>
                  <span className="text-right font-semibold text-red-500">−{formatMoney(loanInterest)}</span>
                  <span className="text-slate-700 font-bold border-t border-slate-200 pt-0.5 mt-0.5">淨月現金流</span>
                  <span className={'text-right font-black border-t border-slate-200 pt-0.5 mt-0.5 ' + (net >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {net >= 0 ? '+' : '−'}{formatMoney(Math.abs(net))}/月
                  </span>
                </div>
                <p className={'text-[0.7rem] mt-1 leading-snug ' + (net >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                  {net >= 0
                    ? '✅ 資產月收 > 貸款利息，貸款買仍讓每月現金流「增加」，划算！'
                    : '⚠️ 貸款利息比資產月收還高，貸款買會讓每月現金流「倒貼」，要三思！'}
                </p>
              </div>
            );
          })()}
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={busy}
              onClick={() => decide('student:dealDecision', { accept: false })}
              className="rounded-xl border border-slate-300 text-slate-600 font-semibold py-3 disabled:opacity-50"
            >
              放棄
            </button>
            {afford ? (
              <button
                disabled={busy}
                onClick={() =>
                  decide('student:dealDecision', { accept: true }, {
                    emoji: c.emoji,
                    title: `成交！買下 ${c.name}`,
                    text: mi >= 0 ? `每月現金流 +${formatMoney(mi)} 入袋 🎉` : '看好它的增值翻盤！',
                    tone: 'good',
                  })
                }
                className="rounded-xl bg-gradient-to-r from-zizi-gold to-amber-500 text-white font-bold py-3 shadow-glow disabled:opacity-50"
              >
                買下來
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() =>
                  decide('student:dealDecision', { accept: true, withLoan: true }, {
                    emoji: c.emoji,
                    title: `貸款買下 ${c.name}`,
                    text: '不夠的頭期向銀行借（月息 10%），記得還！',
                    tone: 'info',
                  })
                }
                className="rounded-xl bg-slate-700 text-white font-bold py-2.5 text-sm leading-tight disabled:opacity-50"
              >
                💳 貸款購買<span className="block text-[0.65rem] font-normal">銀行借頭期，月息 10%</span>
              </button>
            )}
          </div>
        </div>
      </Overlay>
    );
  }

  if (pa.type === 'acquire') {
    return (
      <Overlay>
        <div className="text-center">
          <div className="text-5xl mb-1">🤝</div>
          <h3 className="text-lg font-bold text-zizi-ink">有人想收購你的房產！</h3>
          <p className="text-sm text-slate-500 mt-1">{pa.buyer} 開出收購價</p>
          <div className="bg-emerald-50 rounded-xl p-4 my-4">
            <p className="text-sm text-slate-500">開價 {formatMoney(pa.offerPrice)}</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">清貸款後淨入 {formatMoney(pa.net)}</p>
            {typeof pa.gainPct === 'number' && (
              <p className={'text-sm mt-1 font-bold ' + (pa.gainPct >= 0 ? 'text-emerald-700' : 'text-red-500')}>
                相對投入頭期 {pa.gainPct >= 0 ? '賺' : '賠'} {Math.abs(pa.gainPct)}%
              </p>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4">賣出後會清償該房貸、淨額入帳；之後就少了這筆租金現金流。</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={busy}
              onClick={() => decide('student:acquireDecision', { accept: false })}
              className="rounded-xl border border-slate-300 text-slate-600 font-semibold py-3 disabled:opacity-50"
            >
              不賣
            </button>
            <button
              disabled={busy}
              onClick={() =>
                decide('student:acquireDecision', { accept: true }, {
                  emoji: '💰',
                  title: '成功賣出獲利！',
                  text: `清貸款後淨入 ${formatMoney(pa.net)} 🎉`,
                  tone: 'good',
                })
              }
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-3 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.6)] disabled:opacity-50"
            >
              賣出獲利
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  if (pa.type === 'charity') {
    const afford = team.cash >= pa.cost;
    return (
      <Overlay>
        <div className="text-center">
          <div className="text-4xl mb-1">❤️</div>
          <h3 className="text-lg font-bold text-zizi-ink">慈善捐款</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            捐出 <b>{formatMoney(pa.cost)}</b>（總收入 10%），接下來 <b>3 回合</b>可以擲<b>兩顆骰子</b>跑更快！
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={busy}
              onClick={() => decide('student:charityDecision', { donate: false })}
              className="rounded-xl border border-slate-300 text-slate-600 font-semibold py-3 disabled:opacity-50"
            >
              不捐
            </button>
            <button
              disabled={!afford || busy}
              onClick={() =>
                decide('student:charityDecision', { donate: true }, {
                  emoji: '❤️',
                  title: '謝謝你的善心！',
                  text: '接下來 3 回合可擲兩顆骰子，跑更快 🎲🎲',
                  tone: 'good',
                })
              }
              className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 disabled:opacity-40 shadow-[0_8px_24px_-8px_rgba(244,63,94,0.6)]"
            >
              捐款
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  if (pa.type === 'sale') {
    const it = pa.item;
    const afford = team.cash >= it.cost;
    const roi = it.cost ? Math.round((it.monthlyIncome * 12 / it.cost) * 100) : 0;
    return (
      <Overlay>
        <div className="text-center">
          <div className="text-5xl mb-1">🛒</div>
          <p className="text-xs text-orange-500 font-semibold">限時特賣</p>
          <h3 className="text-lg font-bold text-zizi-ink">{it.emoji} {it.name}</h3>
          {it.story && <p className="text-xs text-slate-500 mt-1 mb-2 leading-relaxed">{it.story}</p>}
          <div className="bg-orange-50 rounded-xl p-3 text-sm grid grid-cols-2 gap-y-1 mb-3 ring-1 ring-orange-200">
            <span className="text-slate-500">特賣價</span>
            <span className="text-right font-bold text-orange-600">{formatMoney(it.cost)} <span className="text-[0.6rem] text-slate-400 line-through">{formatMoney(it.origCost)}</span></span>
            <span className="text-slate-500">每月被動收入</span>
            <span className="text-right font-semibold text-green-600">+{formatMoney(it.monthlyIncome)}</span>
            <span className="text-slate-500">投資報酬率（年）</span>
            <span className="text-right font-bold text-green-600">{roi}%</span>
          </div>
          {!afford && <p className="text-xs text-red-500 mb-2">現金不足（差 {formatMoney(it.cost - team.cash)}）</p>}
          <div className="grid grid-cols-2 gap-3">
            <button disabled={busy} onClick={() => decide('student:saleDecision', { accept: false })} className="rounded-xl border border-slate-300 text-slate-600 font-semibold py-3 disabled:opacity-50">不買</button>
            <button
              disabled={!afford || busy}
              onClick={() => decide('student:saleDecision', { accept: true }, { emoji: it.emoji, title: `撿到便宜！買下 ${it.name}`, text: `每月被動收入 +${formatMoney(it.monthlyIncome)} 🎉`, tone: 'good' })}
              className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3 disabled:opacity-40 shadow-glow"
            >
              買下來
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  if (pa.type === 'quiz') {
    const q = pa.quiz;
    return (
      <Overlay>
        <div className="text-center">
          <div className="text-5xl mb-1">💡</div>
          <p className="text-xs text-indigo-500 font-semibold">理財快問答 · 答對得 {formatMoney(q.reward)}</p>
          <h3 className="text-base font-bold text-zizi-ink mt-1 mb-3 leading-snug">{q.q}</h3>
          <div className="space-y-2">
            {q.options.map((opt, i) => (
              <button
                key={i}
                disabled={busy}
                onClick={() => decide('student:quizAnswer', { choice: i })}
                className="w-full rounded-xl bg-white ring-1 ring-indigo-200 text-zizi-ink font-semibold py-3 hover:bg-indigo-50 disabled:opacity-50 text-sm"
              >
                {opt}
              </button>
            ))}
          </div>
          <p className="text-[0.7rem] text-slate-400 mt-3">選一個答案：答對有獎金，答錯也會告訴你正確觀念</p>
        </div>
      </Overlay>
    );
  }

  return null;
}

// 註：自動事件提示（額外支出/生小孩/失業…）已統一由 components/Toaster.jsx 接收 student:event 顯示

const SQUARE_HINT = {
  payday: '領到月現金流 💰',
  opportunity: '抽到機會卡，請做選擇',
  market: '市場風雲，全班資產跟著漲跌',
  doodad: '額外支出，已自動扣款',
  bonus: '好運！小賺一筆 🍀',
  charity: '慈善機會，請選擇捐或不捐',
  baby: '生了一個小孩，每月支出增加',
  downsized: '失業，下個發薪日領不到薪水',
  surprise: '驚喜！免費資產或現金 🎁',
  flash: '本週快訊，現金有增有減 📰',
  sale: '特賣！小資產折扣，決定買不買',
  quiz: '理財快問答，答對得獎金 💡',
};

// 擲骰列：依序輪流，只有「輪到你」才能擲骰
function RollBar({ team, phase }) {
  const game = useGameState();
  const teams = useTeams();
  const [result, setResult] = useState(null);
  const [rolling, setRolling] = useState(false);

  const rolled = team.hasRolledThisRound;
  const myTurn = game?.currentTurnId === team.id;
  const currentTeam = teams.find((t) => t.id === game?.currentTurnId);

  function doRoll() {
    if (rolling || !myTurn) return;
    setRolling(true);
    socket.emit('student:roll', { teamId: team.id }, (res) => {
      if (res?.ok) setResult(res);
      setRolling(false);
    });
  }

  if (phase !== 'running') {
    return <div className="bg-slate-100 text-slate-500 text-center text-sm py-2">⏳ 等待老師開始本回合…</div>;
  }

  // 輪到我，且還沒擲 → 醒目「換你擲骰子」
  if (myTurn && !rolled) {
    return (
      <div className="bg-zizi-gold/15 border-y-2 border-zizi-gold px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-zizi-ink">👉 換你擲骰子了！</span>
        <button
          onClick={doRoll}
          disabled={rolling}
          className="rounded-xl bg-zizi-gold text-white font-bold px-6 py-2.5 text-lg disabled:opacity-80"
        >
          {rolling ? (<><span className="roll-wiggle">🎲</span> 擲骰中…</>) : '🎲 擲骰子'}
        </button>
      </div>
    );
  }

  // 已擲骰：顯示這次結果
  if (rolled && result) {
    const sq = SQUARE_META[result.square];
    return (
      <div className="bg-zizi-gold/10 px-4 py-2.5 text-sm text-slate-700">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-zizi-ink">🎲 {result.rolls?.join('+')}＝{result.steps}</span>
          {result.skipped ? (
            <span>💼 失業輪空</span>
          ) : (
            <span>停在 {sq?.emoji} <b>{sq?.label}</b><span className="text-slate-400">　{SQUARE_HINT[result.square]}</span></span>
          )}
        </div>
      </div>
    );
  }

  // 還沒輪到我（或已擲完等其他組）
  return (
    <div className="bg-slate-100 text-slate-500 text-center text-sm py-2">
      {rolled
        ? '你已擲骰，等待其他組與老師進入下一回合…'
        : currentTeam
        ? `⏳ 輪到 ${currentTeam.professionEmoji} ${currentTeam.name} 擲骰，請稍候…`
        : '本回合都擲完了，等待老師進入下一回合…'}
    </div>
  );
}

function IncomeStatement({ team }) {
  const d = team.derived || {};
  const p = d.passive || {};
  const e = team.expenses || {};
  const pct = freedomPercent(team);
  const gap = freedomGap(team);

  const incomeRows = [
    { label: '工資（主動收入）', value: team.salary },
    ...['interest', 'dividend', 'realestate', 'business']
      .filter((k) => (p[k] || 0) > 0)
      .map((k) => ({ label: `${PASSIVE_LABEL[k]}（被動）`, value: p[k], sub: true })),
  ];
  const expenseRows = [
    { label: '稅金', value: e.tax },
    { label: '自住房貸', value: e.homeMortgage },
    { label: '車貸', value: e.carLoan },
    { label: '學貸', value: e.schoolLoan },
    { label: '卡債', value: e.creditCard },
    { label: '額外支出', value: e.other },
    { label: `小孩支出 ×${team.children || 0}`, value: (team.perChild || 0) * (team.children || 0) },
    { label: '銀行貸款月付', value: d.bankLoanPayment },
  ].filter((r) => (r.value || 0) > 0 || r.label.startsWith('小孩'));

  return (
    <div className="space-y-4">
      {/* 非工資收入重點卡 */}
      <div className="bg-white rounded-2xl shadow-soft p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">🎯 財富自由進度</span>
          <span className="text-sm font-bold text-zizi-gold tabular-nums">{pct}%</span>
        </div>
        <div className="relative h-3 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-zizi-gold transition-all duration-500"
            style={{ width: pct + '%' }}
          />
          {pct > 0 && pct < 100 && (
            <div className="shimmer absolute inset-y-0 left-0 rounded-full" style={{ width: pct + '%' }} />
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          非工資收入 {formatMoney(d.passiveTotal || 0)} / 總支出 {formatMoney(d.totalExpense || 0)}
          {gap > 0
            ? `　還差 ${formatMoney(gap)} 就財富自由`
            : '　已覆蓋支出，財富自由！🎉'}
        </p>
      </div>

      {/* 收入 */}
      <Section title="收入" total={d.totalIncome}>
        {incomeRows.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} sub={r.sub} positive />
        ))}
      </Section>

      {/* 支出 */}
      <Section title="支出" total={d.totalExpense} totalNegative>
        {expenseRows.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} negative />
        ))}
      </Section>

      {/* 月現金流 */}
      <div className="bg-gradient-to-r from-zizi-gold to-amber-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-glow">
        <span className="font-semibold">月現金流（每回合入帳）</span>
        <span className="text-xl font-bold tabular-nums">
          {(d.cashflow ?? 0) >= 0 ? '+' : '-'}{formatMoney(Math.abs(d.cashflow ?? 0))}
        </span>
      </div>
    </div>
  );
}

function Section({ title, total, totalNegative, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-2 bg-slate-50 flex items-center justify-between">
        <span className="font-semibold text-slate-700">{title}</span>
        <span className={'font-bold tabular-nums ' + (totalNegative ? 'text-red-500' : 'text-slate-800')}>
          {totalNegative ? '-' : ''}{formatMoney(total || 0)}
        </span>
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function Row({ label, value, sub, positive, negative }) {
  return (
    <div className={'flex items-center justify-between px-4 py-2.5 ' + (sub ? 'pl-6' : '')}>
      <span className={'text-sm ' + (sub ? 'text-slate-400' : 'text-slate-600')}>{label}</span>
      <span
        className={
          'text-sm font-medium tabular-nums ' +
          (negative ? 'text-red-500' : positive ? 'text-green-600' : 'text-slate-800')
        }
      >
        {negative ? '-' : positive ? '+' : ''}{formatMoney(value || 0)}
      </span>
    </div>
  );
}

// 單筆資產列：整合顯示總量/現值/盈虧，並可賣出指定數量
function AssetRow({ a, teamId, canSell }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState(5000);

  // 股票/ETF 與原物料（黃金/白銀/石油）都用「單位數」持有 → 可分批賣
  const isShares = (a.category === 'dividend' || a.category === 'commodity') && a.units != null;
  const isCrypto = a.category === 'crypto' && a.units != null;
  const unitWord = a.category === 'commodity' ? '單位' : '股'; // 原物料用「單位」，股票用「股」
  // 房地產/企業：直接賣會折價（拿約帳面 75%），等「🤝收購卡」較划算
  const illiquid = a.category === 'realestate' || a.category === 'business';
  const cost = a.totalCost != null ? a.totalCost : a.buyValue;
  const diff = a.value - (cost || 0);
  const pct = cost ? Math.round((diff / cost) * 100) : 0;

  // 賣出靠 ack 確認：成功顯示「實拿金額」，失敗顯示原因（不會跳假成功）
  function emitSell(payload, title) {
    socket.emit('student:sell', { teamId, ...payload }, (res) => {
      if (res?.ok) {
        const got = res.proceeds != null ? `實拿 ${formatMoney(res.proceeds)}` : '已賣出';
        toast({ emoji: '💵', title, text: res.illiquid ? `${got}（已折價變現）` : got, tone: 'good' });
      } else {
        toast({ emoji: '⚠️', title: res?.reason || '賣出失敗', tone: 'bad' });
      }
    });
  }
  function sellWhole() {
    const warn = illiquid ? '\n\n⚠️ 直接賣只拿帳面 75%，且要先還清抵押貸款。若不夠還，實拿會歸零、等於失去房產（但不會欠債）。等「🤝收購卡」通常更划算！' : '';
    if (!window.confirm(`確定全部賣出 ${a.emoji} ${a.name}？${warn}`)) return;
    emitSell({ uid: a.uid }, `賣出 ${a.name}`);
  }
  function sellPart() {
    if (isShares) emitSell({ uid: a.uid, sellQty: Number(qty) }, `賣出部分 ${a.name}`);
    else if (isCrypto) emitSell({ uid: a.uid, sellAmount: Number(amount) }, `賣出部分 ${a.name}`);
    setOpen(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{a.emoji}</span>
        <div className="flex-1">
          <p className="font-semibold text-slate-800 text-sm">
            {a.name}
            {isShares && <span className="text-slate-400"> 共 {a.qty} {unitWord}</span>}
            {a.location && (
              <span className="ml-1 text-xs bg-teal-100 text-teal-700 rounded px-1.5 py-0.5">
                📍{a.location}{a.roomType ? ` ${a.roomType}` : ''}
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500">
            現值 {formatMoney(a.value)}
            {cost != null && diff !== 0 && (
              <span className={diff >= 0 ? 'text-green-600' : 'text-red-500'}>
                {' '}（{diff >= 0 ? '▲' : '▼'}{Math.abs(pct)}%）
              </span>
            )}
            {a.monthlyIncome > 0
              ? ` ‧ 月被動 +${formatMoney(a.monthlyIncome)}`
              : a.category === 'crypto'
              ? ' ‧ 無配息（賺價差）'
              : ''}
          </p>
          {illiquid && (
            <p className="text-[0.65rem] text-amber-600 mt-0.5">💡 直接賣約 75% 折價；等 🤝 收購卡較划算</p>
          )}
        </div>
        {(isShares || isCrypto) ? (
          <button
            disabled={!canSell}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
          >
            賣出
          </button>
        ) : (
          <button
            disabled={!canSell}
            onClick={sellWhole}
            className="rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
          >
            賣出
          </button>
        )}
      </div>

      {/* 部分賣出（股票依股數、加密依金額） */}
      {open && (isShares || isCrypto) && (
        <div className="mt-2 flex items-center gap-2 border-t pt-2">
          {isShares ? (
            <>
              <input type="number" min="1" max={a.qty} value={qty} onChange={(e) => setQty(e.target.value)}
                className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
              <span className="text-xs text-slate-400">{unitWord}</span>
              <button onClick={() => setQty(a.qty)} className="text-xs text-zizi-ink underline">全部</button>
            </>
          ) : (
            <>
              <input type="number" min="100" step="100" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
              <span className="text-xs text-slate-400">元</span>
              <button onClick={() => setAmount(Math.round(a.value))} className="text-xs text-zizi-ink underline">全部</button>
            </>
          )}
          <button onClick={sellPart} disabled={!canSell}
            className="flex-1 rounded-lg bg-red-500 text-white font-semibold py-2 text-sm disabled:opacity-40">
            確認賣出
          </button>
        </div>
      )}
    </div>
  );
}

// 單筆起始負債：顯示月息%，可分批還款（月付按比例同步降低）
function DebtRow({ debt, teamId, cash, canAct }) {
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState(10000);
  // 月息% = 每月還款 ÷ 欠款餘額（越高越該優先還）
  const rate = debt.value > 0 ? (debt.monthly / debt.value) * 100 : 0;

  function repay(amount) {
    socket.emit('student:repayDebt', { teamId, key: debt.key, amount }, (res) => {
      if (res?.ok) toast({ emoji: '✅', title: `已還款 ${debt.label}`, text: `還了 ${formatMoney(amount)}`, tone: 'good' });
      else toast({ emoji: '⚠️', title: res?.reason || '還款失敗', tone: 'bad' });
    });
    setOpen(false);
  }

  return (
    <div className="bg-red-50 rounded-2xl px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm text-slate-700">
            {debt.label}
            <span className="ml-2 text-xs bg-red-200 text-red-700 rounded px-1.5 py-0.5">月息 {rate.toFixed(1)}%</span>
          </p>
          <p className="text-xs text-slate-500">
            欠 <span className="text-red-600 font-medium">{formatMoney(debt.value)}</span>
            　每月還 {formatMoney(debt.monthly)}
          </p>
        </div>
        <button
          disabled={!canAct}
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-emerald-400 text-emerald-700 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
        >
          還款
        </button>
      </div>
      {open && (
        <div className="mt-2 flex items-center gap-2 border-t border-red-100 pt-2">
          <input
            type="number" min="1000" step="1000" value={amt}
            onChange={(e) => setAmt(e.target.value)}
            className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button onClick={() => repay(Number(amt))} disabled={cash < Number(amt)}
            className="rounded-lg bg-emerald-600 text-white font-semibold px-3 py-1.5 text-sm disabled:opacity-40">
            還這些
          </button>
          <button onClick={() => repay(debt.value)} disabled={cash < debt.value}
            className="rounded-lg border border-emerald-400 text-emerald-700 px-3 py-1.5 text-sm disabled:opacity-40">
            全部付清
          </button>
        </div>
      )}
    </div>
  );
}

// 資產負債表：資產（依分類）+ 負債（個人 + 投資連動）
function BalanceSheet({ team, phase }) {
  const d = team.derived || {};
  const canSell = phase === 'running';
  const assets = team.assets || [];
  const pl = team.personalLiabilities || {};

  const e = team.expenses || {};
  // 起始負債：可付清，付清後免除每月支出（key 對應 expenses 的月付）
  const startDebts = [
    { key: 'homeMortgage', label: '自住房貸', value: pl.homeMortgage, monthly: e.homeMortgage },
    { key: 'carLoan', label: '車貸', value: pl.carLoan, monthly: e.carLoan },
    { key: 'schoolLoan', label: '學貸', value: pl.schoolLoan, monthly: e.schoolLoan },
    { key: 'creditCard', label: '卡債', value: pl.creditCard, monthly: e.creditCard },
  ].filter((r) => (r.value || 0) > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
          <p className="text-xs text-slate-500">資產總值</p>
          <p className="font-bold text-slate-800 tabular-nums">{formatMoney(d.assetsValue || 0)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
          <p className="text-xs text-slate-500">負債總額</p>
          <p className="font-bold text-red-500 tabular-nums">{formatMoney(d.liabilitiesTotal || 0)}</p>
        </div>
      </div>
      <div className="bg-zizi-gold/10 rounded-2xl p-3 text-center">
        <p className="text-xs text-slate-500">淨資產（資產＋現金−負債）</p>
        <p className={'text-xl font-bold tabular-nums ' + ((netWorthOf(team)) >= 0 ? 'text-zizi-ink' : 'text-red-500')}>
          {formatMoney(netWorthOf(team))}
        </p>
      </div>

      <LoanPanel team={team} phase={phase} />

      {/* 投資資產 */}
      <div>
        <p className="text-sm font-medium text-slate-500 mb-2">我的投資</p>
        {assets.length === 0 && (
          <p className="text-center text-slate-400 py-4">還沒有投資，去「市場」買第一筆吧！</p>
        )}
        <div className="space-y-2">
          {assets.map((a) => (
            <AssetRow key={a.uid} a={a} teamId={team.id} canSell={canSell} />
          ))}
        </div>
      </div>

      {/* 負債 */}
      {(startDebts.length > 0 || (pl.bankLoan || 0) > 0 || (team.assetLiabilities || []).length > 0) && (
        <div>
          <p className="text-sm font-medium text-slate-500 mb-2">負債</p>
          <div className="space-y-2">
            {startDebts.map((r) => (
              <DebtRow key={r.key} debt={r} teamId={team.id} cash={team.cash} canAct={canSell} />
            ))}
            {(pl.bankLoan || 0) > 0 && (
              <div className="bg-red-50 rounded-2xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  銀行貸款 <span className="text-xs text-slate-400">（月息 10%，於上方還款）</span>
                </span>
                <span className="text-sm font-medium text-red-600 tabular-nums">-{formatMoney(pl.bankLoan)}</span>
              </div>
            )}
            {(team.assetLiabilities || []).map((l) => (
              <div key={l.uid} className="bg-red-50 rounded-2xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-slate-600">{l.emoji} {l.name}<span className="text-xs text-slate-400">（不計息，賣出時自動清償）</span></span>
                <span className="text-sm font-medium text-red-600 tabular-nums">-{formatMoney(l.balance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 銀行貸款 / 還款
function LoanPanel({ team, phase }) {
  const [loanAmt, setLoanAmt] = useState(50000);
  const [repayAmt, setRepayAmt] = useState(10000);
  const [msg, setMsg] = useState(null);
  const canAct = phase === 'running';
  const pl = team.personalLiabilities || {};
  const bal = (pl.bankLoan || 0); // 銀行貸款餘額

  function emit(ev, amount) {
    socket.emit(ev, { teamId: team.id, amount: Number(amount) }, (res) => {
      setMsg(res?.ok ? { ok: true, text: '完成 ✅' } : { ok: false, text: res?.reason || '失敗' });
      setTimeout(() => setMsg(null), 2000);
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-700">💳 銀行貸款</span>
        <span className="text-sm text-slate-500">
          目前欠 <b className="text-red-500">{formatMoney(bal)}</b>
        </span>
      </div>
      <p className="text-xs text-slate-400">利息：每月還貸款餘額的 10%（借越多、月支出越重）</p>

      {msg && (
        <div className={'rounded-lg px-3 py-1.5 text-sm text-center ' + (msg.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
          {msg.text}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="number" min="10000" step="10000" value={loanAmt}
          onChange={(e) => setLoanAmt(e.target.value)}
          className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          disabled={!canAct}
          onClick={() => emit('student:loan', loanAmt)}
          className="flex-1 rounded-lg bg-slate-700 text-white font-semibold py-2 text-sm disabled:opacity-40"
        >
          借錢
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number" min="10000" step="10000" value={repayAmt}
          onChange={(e) => setRepayAmt(e.target.value)}
          className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          disabled={!canAct || bal <= 0}
          onClick={() => emit('student:repay', repayAmt)}
          className="flex-1 rounded-lg bg-emerald-600 text-white font-semibold py-2 text-sm disabled:opacity-40"
        >
          還款
        </button>
      </div>
    </div>
  );
}

// 星星列（達成幾顆就亮幾顆）
function Stars({ n }) {
  return <span className="text-amber-500 tracking-tight">{'★'.repeat(n)}</span>;
}

// 人生成就面板（財富自由後出現）：選夢想 → 看「還差多少」→ 現金夠就完成 → 換下一個
function AchievementPanel({ team, phase }) {
  const [catalog, setCatalog] = useState([]);
  const [showChooser, setShowChooser] = useState(false);
  const d = team.derived || {};
  const goal = d.goal; // 目前追求的夢想（含 affordable / keepsFree）
  const done = d.achievementsDone || [];
  const stars = d.achievementStars || 0;
  const doneIds = new Set(done.map((a) => a.id));

  useEffect(() => {
    fetch(api('api/achievements')).then((r) => r.json()).then(setCatalog).catch(() => setCatalog([]));
  }, []);

  const canBuy = phase === 'running';

  function choose(a) {
    socket.emit('student:chooseGoal', { teamId: team.id, achievementId: a.id }, (res) => {
      if (res?.ok) { setShowChooser(false); toast({ emoji: a.emoji, title: `目標鎖定：${a.name}`, text: '存夠現金就能完成，衝吧！', tone: 'good' }); }
      else toast({ emoji: '⚠️', title: res?.reason || '選擇失敗', tone: 'bad' });
    });
  }

  function buy() {
    socket.emit('student:buyAchievement', { teamId: team.id }, (res) => {
      if (res?.ok) toast({ emoji: '🏆', title: '達成人生成就！', text: `目前累積 ${res.totalStars} ⭐，再選下一個夢想！`, tone: 'good' });
      else toast({ emoji: '⚠️', title: res?.reason || '尚未達成', tone: 'bad' });
    });
  }

  const remain = goal ? Math.max(0, goal.cost - team.cash) : 0;
  const pct = goal ? Math.min(100, Math.round((team.cash / goal.cost) * 100)) : 0;

  return (
    <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 text-white px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="font-bold flex items-center gap-1.5">👑 財富自由！人生成就</p>
        <p className="text-sm">{stars > 0 ? <><Stars n={stars} /> <span className="text-white/80">{stars}⭐</span></> : <span className="text-white/70">尚無星星</span>}</p>
      </div>

      {/* 目前目標 + 進度 */}
      {goal ? (
        <div className="mt-2 bg-white/15 ring-1 ring-white/25 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{goal.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold leading-tight">{goal.name} <Stars n={goal.stars} /></p>
              <p className="text-xs text-white/75">價格 {formatMoney(goal.cost)}{goal.upkeep > 0 && ` ‧ 每月開銷 +${formatMoney(goal.upkeep)}`}</p>
            </div>
            <button onClick={() => setShowChooser((v) => !v)} className="text-xs underline text-white/80 shrink-0">換夢想</button>
          </div>
          {/* 進度條 */}
          <div className="mt-2 h-2.5 rounded-full bg-black/25 overflow-hidden">
            <div className="h-full bg-zizi-gold transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-sm">
            {remain > 0
              ? <>距離目標還差 <span className="font-bold text-zizi-gold tabular-nums">{formatMoney(remain)}</span></>
              : <span className="font-bold text-zizi-gold">現金已足夠！</span>}
          </p>
          {/* 完成按鈕 / 阻擋原因 */}
          {!goal.keepsFree ? (
            <p className="mt-2 text-xs bg-black/25 rounded-lg px-2 py-1.5">⚠️ 買了會讓你不再財富自由（每月開銷變高），先把被動收入養更高再來！</p>
          ) : (
            <button
              onClick={buy}
              disabled={!canBuy || !goal.affordable}
              className={'mt-2 w-full py-2 rounded-xl font-bold shadow-glow ' + (canBuy && goal.affordable ? 'bg-gradient-to-r from-zizi-gold to-amber-500 text-zizi-ink' : 'bg-white/20 text-white/50')}
            >
              {goal.affordable ? '🏆 完成這個成就！' : '現金還不夠'}
            </button>
          )}
        </div>
      ) : (
        <button onClick={() => setShowChooser(true)} className="mt-2 w-full py-2.5 rounded-xl font-bold bg-white/20 ring-1 ring-white/30">
          🎯 選一個人生夢想當目標
        </button>
      )}

      {/* 夢想選單 */}
      {showChooser && (
        <div className="mt-2 bg-white rounded-2xl p-2 max-h-72 overflow-auto text-zizi-ink">
          <p className="text-xs text-slate-500 px-1 py-1">選一個夢想當目標（越貴星星越多）：</p>
          <div className="space-y-1.5">
            {catalog.filter((a) => !doneIds.has(a.id)).map((a) => (
              <button
                key={a.id}
                onClick={() => choose(a)}
                className="w-full flex items-center gap-2 p-2 rounded-xl bg-slate-50 hover:bg-amber-50 ring-1 ring-slate-200 text-left"
              >
                <span className="text-2xl shrink-0">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-tight">{a.name} <Stars n={a.stars} /></p>
                  <p className="text-[0.7rem] text-slate-500 truncate">{a.story}</p>
                </div>
                <span className="text-xs font-bold tabular-nums text-zizi-caramel shrink-0">{formatMoney(a.cost)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 已完成的成就 */}
      {done.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {done.map((a, i) => (
            <span key={i} className="text-xs bg-black/25 rounded-full px-2 py-1 flex items-center gap-1">
              {a.emoji} {a.name} <Stars n={a.stars} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// 初階「總覽」：簡化儀表，只給最重要的幾個數字＋財富自由進度＋生錢資產，不放完整報表
function BasicOverview({ team }) {
  const d = team.derived || {};
  const income = d.totalIncome ?? 0;
  const expense = d.totalExpense ?? 0;
  const cf = d.cashflow ?? 0;
  const passive = d.passiveTotal ?? 0;
  const pct = expense ? Math.min(100, Math.round((passive / expense) * 100)) : 0;
  const earners = (team.assets || []).filter((a) => (a.monthlyIncome || 0) > 0);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white rounded-xl p-2 shadow-sm">
          <p className="text-[0.7rem] text-slate-400">每月收入</p>
          <p className="font-black text-green-600 tabular-nums text-sm">{formatMoney(income)}</p>
        </div>
        <div className="bg-white rounded-xl p-2 shadow-sm">
          <p className="text-[0.7rem] text-slate-400">每月支出</p>
          <p className="font-black text-rose-500 tabular-nums text-sm">{formatMoney(expense)}</p>
        </div>
        <div className="bg-white rounded-xl p-2 shadow-sm">
          <p className="text-[0.7rem] text-slate-400">月現金流</p>
          <p className={'font-black tabular-nums text-sm ' + (cf >= 0 ? 'text-green-600' : 'text-rose-500')}>{cf >= 0 ? '+' : '−'}{formatMoney(Math.abs(cf))}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-baseline mb-1">
          <p className="font-bold text-zizi-ink">🎯 財富自由進度</p>
          <p className="font-black text-amber-600 text-lg tabular-nums">{pct}%</p>
        </div>
        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-zizi-gold transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">被動收入 <b className="text-green-600">{formatMoney(passive)}</b> ／ 總支出 <b>{formatMoney(expense)}</b></p>
        <p className="text-xs text-slate-400 mt-1">💡 買「每月會生錢的資產」讓被動收入變多，等它 ≥ 支出就財富自由！</p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="font-bold text-zizi-ink mb-2">💰 我的生錢資產</p>
        {earners.length === 0 ? (
          <p className="text-sm text-slate-400">還沒有～去「🛒 市場」或踩「🎲 機會」格買第一個吧！</p>
        ) : (
          <div className="space-y-1.5">
            {earners.map((a) => (
              <div key={a.uid} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5">
                <span className="text-xl">{a.emoji}</span>
                <span className="flex-1 min-w-0 truncate text-sm">{a.name}</span>
                <span className="text-green-600 font-bold text-sm tabular-nums shrink-0">+{formatMoney(a.monthlyIncome)}/月</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-center text-xs text-slate-400">目前現金 {formatMoney(team.cash)}</p>
    </div>
  );
}

// 市場分頁：只列可隨時交易的金融商品（股票/ETF、加密、定存債券）
// 房地產與企業副業改由機會卡抽到才能買賣
function MarketTab({ team, phase }) {
  const game = useGameState();
  const [market, setMarket] = useState([]);

  useEffect(() => {
    fetch(api('api/market')).then((r) => r.json()).then(setMarket).catch(() => setMarket([]));
  }, []);

  function buy(payload, item) {
    socket.emit('student:buy', { teamId: team.id, ...payload }, (res) => {
      if (res?.ok) {
        toast({
          emoji: item?.emoji || '🎉',
          title: `恭喜入手 ${item?.name || '新資產'}！`,
          text: '已加入你的資產組合，點一下關閉',
          tone: 'good',
        });
      } else {
        // 失敗用明顯的跳出視窗顯示原因（例：投入金額需至少 1,000、存款不足）
        toast({ emoji: '⚠️', title: res?.reason || '購買失敗', tone: 'bad' });
      }
    });
  }

  const canBuy = phase === 'running';
  const CAT_LABEL = {
    dividend: '📈 股票 / ETF',
    commodity: '🥇 原物料（黃金/白銀/石油）',
    crypto: '🪙 加密貨幣',
    interest: '🏦 定存 / 債券',
  };
  const order = ['dividend', 'commodity', 'crypto', 'interest'];
  const instruments = game?.market?.instruments || {};
  // 初階等模式：伺服器會依階段給精簡的市場清單（marketCatalog），優先用它
  const list = game?.marketCatalog?.length ? game.marketCatalog : market;
  const grouped = order
    .map((cat) => ({ cat, items: list.filter((m) => m.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          可用存款 <span className="font-bold text-zizi-ink">{formatMoney(team.cash)}</span>
        </span>
        {!canBuy && <span className="text-xs text-amber-600">等待老師開始本回合操作</span>}
      </div>

      <p className="text-xs text-slate-400">💡 房地產與企業副業要靠停在「🎲機會」格抽到才能買賣</p>

      {grouped.map((g) => (
        <div key={g.cat}>
          <p className="text-sm font-semibold text-slate-500 mb-2">{CAT_LABEL[g.cat]}</p>
          <div className="space-y-3">
            {g.items.map((item) => (
              <MarketCard key={item.id} item={item} canBuy={canBuy} onBuy={buy} inst={instruments[item.id]} />
            ))}
          </div>
        </div>
      ))}

      {game?.insuranceCatalog?.length > 0 && (
        <InsuranceSection team={team} list={game.insuranceCatalog} canBuy={canBuy} />
      )}
    </div>
  );
}

// 保險（高階）：每月繳一小筆保費，意外發生時保險幫你擋 80%，避免被一次打垮
function InsuranceSection({ team, list, canBuy }) {
  const insured = team.insured || {};
  const premium = team.derived?.insurancePremium || 0;

  function toggle(cover, name, on) {
    socket.emit('student:toggleInsurance', { teamId: team.id, cover }, (res) => {
      if (res?.ok) {
        toast({
          emoji: res.insured ? '🛡️' : '🚫',
          title: res.insured ? `已投保 ${name}` : `已退保 ${name}`,
          text: res.insured ? '每月扣保費，意外時幫你擋 80%' : '之後意外要自己全額承擔',
          tone: res.insured ? 'good' : 'bad',
        });
      } else {
        toast({ emoji: '⚠️', title: res?.reason || '操作失敗', tone: 'bad' });
      }
    });
  }

  return (
    <div>
      <p className="text-sm font-semibold text-slate-500 mb-1">🛡️ 保險</p>
      <p className="text-[0.72rem] leading-snug text-slate-400 mb-2">
        每月繳一小筆保費，意外發生時保險幫你擋 <b>80%</b>（自付 20%）。平常沒事＝繳小錢買安心；中大獎＝避免被一次打垮。
      </p>
      <div className="space-y-3">
        {list.map((ins) => {
          const on = !!insured[ins.cover];
          return (
            <div key={ins.id} className={`rounded-2xl shadow-sm p-4 ring-1 ${on ? 'bg-emerald-50 ring-emerald-200' : 'bg-white ring-transparent'}`}>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{ins.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-sm">
                      {ins.name}
                      {on && <span className="ml-2 text-[0.7rem] rounded-full bg-emerald-500 text-white px-2 py-0.5">保障中</span>}
                    </span>
                    <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 tabular-nums">保費 {formatMoney(ins.premium)}/月</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{ins.desc}</p>
                  {ins.ref && <p className="text-[0.7rem] text-slate-400 mt-0.5">{ins.ref}</p>}
                </div>
              </div>
              <button
                disabled={!canBuy}
                onClick={() => toggle(ins.cover, ins.name, on)}
                className={`mt-3 w-full rounded-xl py-2 text-sm font-semibold transition disabled:opacity-40 ${
                  on ? 'bg-white text-rose-600 ring-1 ring-rose-200' : 'bg-emerald-500 text-white'
                }`}
              >
                {on ? '退保' : '投保'}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[0.72rem] text-slate-500 text-right tabular-nums">
        目前每月保費合計：<b className="text-zizi-ink">{formatMoney(premium)}</b>
      </p>
    </div>
  );
}

function MarketCard({ item, canBuy, onBuy, inst }) {
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState(10000);
  const [showChart, setShowChart] = useState(false);

  // 浮動商品（股票/加密）有現價與走勢；定存債券無
  const hist = inst?.history || [];
  const price = inst?.price ?? null;
  const prev = hist.length > 1 ? hist[hist.length - 2] : price;
  const up = price != null && price >= prev;
  const pct = prev ? Math.round(((price - prev) / prev) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-start gap-3">
        <span className="text-3xl">{item.emoji}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
            <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">風險 {item.risk}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
          {item.category === 'crypto' && (
            <p className="mt-1 text-[0.7rem] leading-snug bg-rose-50 text-rose-600 ring-1 ring-rose-200 rounded-lg px-2 py-1">
              ⚠️ 高風險：暴漲暴跌、不配息，還可能遇<b>詐騙或交易所暴雷而歸零</b>。別把錢全押！
            </p>
          )}
          {price != null && (
            <button
              onClick={() => setShowChart((v) => !v)}
              className="mt-1 inline-flex items-center gap-2 text-xs"
            >
              <span className="text-slate-500">現價</span>
              <span className="font-bold text-slate-800 tabular-nums">{price}</span>
              <span className={up ? 'text-green-600' : 'text-red-500'}>{up ? '▲' : '▼'}{Math.abs(pct)}%</span>
              <span className="text-zizi-ink underline">{showChart ? '收起圖' : '看走勢圖'}</span>
            </button>
          )}
        </div>
      </div>

      {showChart && price != null && (
        <div className="mt-2 bg-slate-50 rounded-xl p-2 flex items-center justify-center">
          <Sparkline data={hist} width={260} height={56} color={up ? '#16a34a' : '#dc2626'} />
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {item.kind === 'shares' && (
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        )}
        {item.kind === 'amount' && (
          <input type="number" min="100" step="100" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        )}
        <button
          disabled={!canBuy}
          onClick={() =>
            onBuy(
              item.kind === 'shares' ? { marketId: item.id, qty: Number(qty) }
                : { marketId: item.id, amount: Number(amount) },
              item
            )
          }
          className="flex-1 rounded-lg bg-gradient-to-r from-zizi-gold to-amber-500 text-white font-semibold py-2 text-sm shadow-sm disabled:opacity-40 disabled:shadow-none"
        >
          {item.kind === 'shares'
            ? `買入（${formatMoney((price || item.price) * Number(qty || 0))}）`
            : `投入（${formatMoney(Number(amount || 0))}）`}
        </button>
      </div>
    </div>
  );
}

function HistoryTab({ team }) {
  const history = team.history || [];
  if (history.length === 0) return <p className="text-center text-slate-400 pt-8">尚無紀錄</p>;

  return (
    <div className="space-y-2">
      {history.map((h, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm px-4 py-3 text-sm">
          {h.type === 'payday' ? (
            <div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">第 {h.round} 回合發薪</span>
                <span className={'font-bold tabular-nums ' + (h.delta >= 0 ? 'text-green-600' : 'text-red-500')}>
                  {h.delta >= 0 ? '+' : '-'}{formatMoney(Math.abs(h.delta))}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                工資 +{formatMoney(h.salary)} ‧ 被動 +{formatMoney(h.passive)} ‧ 支出 -{formatMoney(h.expense)}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-slate-700">
                <span className="text-slate-400 mr-1">第 {h.round} 回合</span>
                {h.text}
              </span>
              <span className={'font-bold tabular-nums ' + (h.delta >= 0 ? 'text-green-600' : 'text-red-500')}>
                {h.delta >= 0 ? '+' : '-'}{formatMoney(Math.abs(h.delta))}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
