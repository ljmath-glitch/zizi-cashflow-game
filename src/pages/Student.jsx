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
import ConnectionBadge from '../components/ConnectionBadge.jsx';
import Sparkline from '../components/Sparkline.jsx';
import Toaster from '../components/Toaster.jsx';

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
      <header className="relative bg-gradient-to-r from-amber-500 via-zizi-gold to-amber-500 text-white px-4 py-3 flex items-center justify-between shadow-lg overflow-hidden">
        {/* 標題列頂端一道白色細光 */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
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
    </div>
  );
}

function JoinForm({ connected, join, resume, offerProfessions }) {
  const [teamName, setTeamName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [options, setOptions] = useState(null); // 二選一的兩張職業卡

  // 第一步：送出隊名 → 抽兩張職業卡
  async function handleNext() {
    if (busy) return;
    setBusy(true);
    const opts = await offerProfessions();
    setOptions(opts);
    setBusy(false);
  }

  // 第二步：選定職業 → 正式加入
  async function pick(professionId) {
    if (busy) return;
    setBusy(true);
    await join(teamName, professionId);
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

function FinancePanel({ team, phase }) {
  const [tab, setTab] = useState('finance');
  const [dir, setDir] = useState(1); // 內容滑入方向：右切=+1、左切=-1
  const idx = TABS.findIndex((t) => t.key === tab);
  const free = isFinanciallyFree(team);
  const d = team.derived || {};

  function changeTab(key) {
    const ni = TABS.findIndex((t) => t.key === key);
    if (ni === idx) return;
    setDir(ni > idx ? 1 : -1);
    setTab(key);
  }

  // 手指左右滑動切換分頁（滑動 UI）
  const touchX = useRef(null);
  function onTouchStart(e) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e) {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 60) return;
    const ni = dx < 0 ? Math.min(idx + 1, TABS.length - 1) : Math.max(idx - 1, 0);
    if (ni !== idx) changeTab(TABS[ni].key);
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
            <p className="text-xs text-white/60">存款</p>
            <p className="text-lg font-bold tabular-nums">{formatMoney(team.cash)}</p>
            <p className={'text-xs tabular-nums ' + ((d.cashflow ?? 0) >= 0 ? 'text-green-300' : 'text-red-300')}>
              月現金流 {(d.cashflow ?? 0) >= 0 ? '+' : '-'}{formatMoney(Math.abs(d.cashflow ?? 0))}
            </p>
          </div>
        </div>
      </div>

      {team.bankrupt && (
        <div className="bg-red-600 text-white text-center py-2 font-bold">
          💀 你已破產被淘汰（現金歸零、入不敷出）
        </div>
      )}

      {free && !team.bankrupt && (
        <div className="bg-green-500 text-white text-center py-2 font-bold">
          🏆 已達成財富自由！
        </div>
      )}

      {!team.bankrupt && (team.personalLiabilities?.loanShark || 0) > 0 && (
        <div className="bg-red-700 text-white text-center py-1.5 text-sm font-medium">
          🔴 高利貸 {formatMoney(team.personalLiabilities.loanShark)}，每月利息 {formatMoney(Math.round(team.personalLiabilities.loanShark * 0.2))}（月息20%，快還！）
        </div>
      )}
      {!team.bankrupt && (team.personalLiabilities?.bankLoan || 0) > 0 && (
        <div className="bg-red-500 text-white text-center py-1.5 text-sm font-medium">
          ⚠️ 銀行貸款 {formatMoney(team.personalLiabilities.bankLoan)}，每月利息 {formatMoney(Math.round(team.personalLiabilities.bankLoan * 0.1))}
        </div>
      )}

      {!team.bankrupt && <RollBar team={team} phase={phase} />}

      {/* 滑動膠囊式分頁：白色指示器在底層平滑滑到所選分頁 */}
      <nav className="px-3 pt-3 pb-2 bg-white/60 backdrop-blur border-b border-white/50">
        <div className="relative flex p-1 bg-slate-100/80 rounded-2xl">
          <span
            className="seg-indicator absolute inset-y-1 left-1 rounded-xl bg-white shadow-[0_2px_10px_rgba(245,158,11,0.28)]"
            style={{
              width: `calc((100% - 0.5rem) / ${TABS.length})`,
              transform: `translateX(calc(${idx} * 100%))`,
            }}
          />
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={
                'relative z-10 flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ' +
                (tab === t.key ? 'text-zizi-ink' : 'text-slate-400')
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
        <div key={tab} className="slide-in" style={{ '--slide-from': dir > 0 ? '16px' : '-16px' }}>
          {tab === 'finance' && <IncomeStatement team={team} />}
          {tab === 'market' && <MarketTab team={team} phase={phase} />}
          {tab === 'balance' && <BalanceSheet team={team} phase={phase} />}
          {tab === 'history' && <HistoryTab team={team} />}
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
              <span className="text-slate-400">連帶貸款</span>
              <span className="text-right font-semibold text-red-500">{formatMoney(c.mortgage)}</span>
            </>)}
            <span className="text-slate-400">每月現金流</span>
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
          {!afford && (
            <p className="text-xs text-red-500 mb-2">
              現金不足（差 {formatMoney(c.cost - team.cash)}），可改用「貸款購買」
            </p>
          )}
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
                    text: '記得快還高利貸（月息 20%）！',
                    tone: 'info',
                  })
                }
                className="rounded-xl bg-slate-700 text-white font-bold py-2.5 text-sm leading-tight disabled:opacity-50"
              >
                💳 高利貸購買<span className="block text-[0.65rem] font-normal">月息 20%，較貴！</span>
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

  return null;
}

// 註：自動事件提示（額外支出/生小孩/失業…）已統一由 components/Toaster.jsx 接收 student:event 顯示

const SQUARE_HINT = {
  payday: '領到月現金流 💰',
  opportunity: '抽到機會卡，請做選擇',
  market: '市場風雲，全班資產跟著漲跌',
  doodad: '額外支出，已自動扣款',
  charity: '慈善機會，請選擇捐或不捐',
  baby: '生了一個小孩，每月支出增加',
  downsized: '失業，下回合輪空',
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
          className="rounded-xl bg-zizi-gold text-white font-bold px-6 py-2.5 text-lg disabled:opacity-50"
        >
          🎲 擲骰子
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

  const isShares = a.category === 'dividend' && a.units != null;
  const isCrypto = a.category === 'crypto' && a.units != null;
  const cost = a.totalCost != null ? a.totalCost : a.buyValue;
  const diff = a.value - (cost || 0);
  const pct = cost ? Math.round((diff / cost) * 100) : 0;

  const gainText = diff >= 0 ? `帳面賺 ${Math.abs(pct)}% 🎉` : `認賠 ${Math.abs(pct)}%`;
  // 賣出靠 ack 確認：成功才報喜，失敗顯示原因（不會跳假成功）
  function emitSell(payload, title) {
    socket.emit('student:sell', { teamId, ...payload }, (res) => {
      if (res?.ok) toast({ emoji: '💵', title, text: gainText, tone: diff >= 0 ? 'good' : 'info' });
      else toast({ emoji: '⚠️', title: res?.reason || '賣出失敗', tone: 'bad' });
    });
  }
  function sellWhole() {
    if (!window.confirm(`確定全部賣出 ${a.emoji} ${a.name}？`)) return;
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
            {isShares && <span className="text-slate-400"> 共 {a.qty} 股</span>}
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
              <span className="text-xs text-slate-400">股</span>
              <button onClick={() => setQty(a.qty)} className="text-xs text-zizi-ink underline">全部</button>
            </>
          ) : (
            <>
              <input type="number" min="1000" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)}
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
      {(startDebts.length > 0 || (pl.bankLoan || 0) > 0 || (pl.loanShark || 0) > 0 || (team.assetLiabilities || []).length > 0) && (
        <div>
          <p className="text-sm font-medium text-slate-500 mb-2">負債（付清可免除每月還款）</p>
          <div className="space-y-2">
            {(pl.loanShark || 0) > 0 && (
              <div className="bg-red-100 rounded-2xl px-4 py-2.5 flex items-center justify-between ring-1 ring-red-300">
                <span className="text-sm text-red-700 font-medium">
                  🔴 高利貸 <span className="text-xs font-normal">（月息 20%！於上方優先還款）</span>
                </span>
                <span className="text-sm font-bold text-red-700 tabular-nums">-{formatMoney(pl.loanShark)}</span>
              </div>
            )}
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
                <span className="text-sm text-slate-600">{l.emoji} {l.name}<span className="text-xs text-slate-400">（賣出資產時自動清償）</span></span>
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
  const bal = (pl.bankLoan || 0) + (pl.loanShark || 0); // 還款總額（高利貸優先還）

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

// 市場分頁：只列可隨時交易的金融商品（股票/ETF、加密、定存債券）
// 房地產與企業副業改由機會卡抽到才能買賣
function MarketTab({ team, phase }) {
  const game = useGameState();
  const [market, setMarket] = useState([]);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch('/api/market').then((r) => r.json()).then(setMarket).catch(() => setMarket([]));
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
        setMsg({ ok: false, text: res?.reason || '購買失敗' });
        setTimeout(() => setMsg(null), 2000);
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
  const grouped = order
    .map((cat) => ({ cat, items: market.filter((m) => m.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          可用存款 <span className="font-bold text-zizi-ink">{formatMoney(team.cash)}</span>
        </span>
        {!canBuy && <span className="text-xs text-amber-600">等待老師開始本回合操作</span>}
      </div>

      {msg && (
        <div className={'rounded-xl px-3 py-2 text-sm text-center ' + (msg.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
          {msg.text}
        </div>
      )}

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
          <input type="number" min="1000" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)}
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
