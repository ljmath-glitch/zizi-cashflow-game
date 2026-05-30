import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { socket, ROOM } from '../socket.js';
import { useConnection } from '../hooks/useConnection.js';
import { useGameState } from '../hooks/useGameState.js';
import { useTeams } from '../hooks/useTeams.js';
import { useFeed } from '../hooks/useFeed.js';
import { formatTime, formatMoney } from '../util/format.js';
import { SQUARE_META, GRID, cellOf } from '../util/board.js';
import ConnectionBadge from '../components/ConnectionBadge.jsx';
import Sparkline from '../components/Sparkline.jsx';

// 大螢幕端（投影機）— M7：等待室 QR / 進行中老鼠賽跑圈盤面 + 排行榜 + 動態
export default function Screen() {
  const { connected } = useConnection();
  const game = useGameState();
  const teams = useTeams();
  const feed = useFeed();
  const [serverInfo, setServerInfo] = useState(null);
  const [board, setBoard] = useState([]);
  const [drawn, setDrawn] = useState(null); // 最近抽到的卡（翻牌動畫）
  const [celebrate, setCelebrate] = useState(null); // 跳出老鼠圈大慶祝
  const [report, setReport] = useState(null); // 月初回顧/預告彈窗
  const [bankrupt, setBankrupt] = useState(null); // 破產淘汰動畫

  useEffect(() => {
    fetch('/api/server-info').then((r) => r.json()).then(setServerInfo).catch(() => {});
    fetch('/api/board').then((r) => r.json()).then(setBoard).catch(() => {});
  }, []);

  useEffect(() => {
    let cardTimer, freedTimer;
    function onCard(payload) {
      setDrawn(payload);
      clearTimeout(cardTimer);
      cardTimer = setTimeout(() => setDrawn(null), 4200);
    }
    function onFreed(payload) {
      setCelebrate(payload);
      clearTimeout(freedTimer);
      freedTimer = setTimeout(() => setCelebrate(null), 7000);
    }
    let reportTimer, bankruptTimer;
    function onReport(r) {
      setReport(r);
      clearTimeout(reportTimer);
      reportTimer = setTimeout(() => setReport(null), 8000);
    }
    function onBankrupt(payload) {
      setBankrupt(payload);
      clearTimeout(bankruptTimer);
      bankruptTimer = setTimeout(() => setBankrupt(null), 6000);
    }
    socket.on('card:drawn', onCard);
    socket.on('game:freed', onFreed);
    socket.on('month:report', onReport);
    socket.on('game:bankrupt', onBankrupt);
    return () => {
      socket.off('card:drawn', onCard);
      socket.off('game:freed', onFreed);
      socket.off('month:report', onReport);
      socket.off('game:bankrupt', onBankrupt);
      clearTimeout(cardTimer);
      clearTimeout(freedTimer);
      clearTimeout(reportTimer);
      clearTimeout(bankruptTimer);
    };
  }, []);

  // 學生掃描網址：
  //  - 自架（localhost / 區網 IP）→ 用區網 IP + 連接埠，讓同 Wi-Fi 的手機連得到
  //  - 雲端網域（如 onrender.com，https）→ 直接用目前網址，不加 IP/埠
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host);
  const roomQ = ROOM ? `?room=${ROOM}` : '';
  const studentUrl = isLocalHost && serverInfo?.lanIp
    ? `http://${serverInfo.lanIp}:${window.location.port || serverInfo.port || '3000'}/student${roomQ}`
    : `${window.location.origin}/student${roomQ}`;

  const phase = game?.phase ?? 'lobby';
  const round = game?.round ?? 0;
  const maxRounds = game?.maxRounds ?? 12;
  const timeLeft = game?.timeLeft ?? 0;
  const lowTime = phase === 'running' && timeLeft <= 30;

  const ranked = [...teams].sort((a, b) => {
    if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1; // 破產排最後
    if (a.free !== b.free) return a.free ? -1 : 1;
    return b.netWorth - a.netWorth;
  });
  const rolledCount = teams.filter((t) => t.hasRolled).length;

  return (
    <div className="h-screen screen-bg text-white flex flex-col overflow-hidden">
      <header className="relative flex items-center justify-between px-8 py-3 border-b border-white/10 shrink-0 backdrop-blur-sm">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zizi-champagne to-transparent" />
        <h1 className="text-2xl font-bold">
          茲茲財富自由挑戰賽
          {ROOM && <span className="ml-2 text-white/50 text-base">房號 {ROOM}</span>}
          <span className="ml-3 text-zizi-gold text-lg">
            {phase === 'lobby' ? '等待開始' : phase === 'ended' ? '遊戲結束' : `第 ${round} / ${maxRounds} 回合`}
          </span>
        </h1>
        <div className="flex items-center gap-5">
          {phase === 'running' && (
            <span className="text-sm text-white/70">已擲骰 {rolledCount}/{teams.length}</span>
          )}
          {(phase === 'running' || phase === 'paused') && (
            <span className={'text-2xl font-bold tabular-nums ' + (lowTime ? 'text-red-400 animate-pulse' : 'text-white')}>
              ⏱ {formatTime(timeLeft)}
              {phase === 'paused' && <span className="ml-2 text-base text-zizi-gold">(暫停)</span>}
            </span>
          )}
          <ConnectionBadge connected={connected} />
        </div>
      </header>

      <main className="flex-1 min-h-0 p-5">
        {phase === 'lobby' ? (
          <LobbyView studentUrl={studentUrl} teams={teams} />
        ) : (
          <div className="h-full flex gap-5">
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              <MarketBar market={game?.market} monthlyEvent={game?.monthlyEvent} />
              <div className="flex-1 min-h-0 flex items-center justify-center">
                <Board board={board} teams={teams} round={round} timeLeft={timeLeft} phase={phase} currentTurnId={game?.currentTurnId} />
              </div>
            </div>
            <div className="w-80 shrink-0 flex flex-col gap-4 min-h-0">
              <Leaderboard ranked={ranked} ended={phase === 'ended'} />
              <FeedPanel feed={feed} />
            </div>
          </div>
        )}
      </main>

      {game?.spotlight && <Spotlight team={game.spotlight} />}
      {game?.showTutorial && <Tutorial />}
      {report && !game?.showTutorial && <MonthReport report={report} onClose={() => setReport(null)} />}
      {drawn && <CardOverlay payload={drawn} onClose={() => setDrawn(null)} />}
      {celebrate && <Celebration name={celebrate.name} onClose={() => setCelebrate(null)} />}
      {bankrupt && <BankruptOverlay payload={bankrupt} onClose={() => setBankrupt(null)} />}
    </div>
  );
}

// 新手教學說明書（老師可開關）
// 老師投影：把某組完整財務投到大螢幕做教學分析
function Spotlight({ team }) {
  const d = team.derived || {};
  const p = d.passive || {};
  const e = team.expenses || {};
  const pl = team.personalLiabilities || {};
  const PASSIVE = { interest: '利息', dividend: '股利', realestate: '房地產', business: '企業' };
  const incomeRows = [
    ['工資（主動）', team.salary],
    ...['interest', 'dividend', 'realestate', 'business'].filter((k) => (p[k] || 0) > 0).map((k) => [`${PASSIVE[k]}（被動）`, p[k]]),
  ];
  const expenseRows = [
    ['稅金', e.tax], ['自住房貸', e.homeMortgage], ['車貸', e.carLoan], ['學貸', e.schoolLoan],
    ['卡債', e.creditCard], ['額外支出', e.other],
    [`小孩 ×${team.children || 0}`, (team.perChild || 0) * (team.children || 0)],
    ['貸款利息', d.bankLoanPayment],
  ].filter((r) => (r[1] || 0) > 0);

  return (
    <div className="fixed inset-0 z-50 bg-zizi-ink/85 backdrop-blur-md flex flex-col items-center justify-center p-8 overflow-auto">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-5xl">{team.professionEmoji}</span>
        <div>
          <p className="text-3xl font-black text-zizi-gold">{team.name}{team.bankrupt && ' 💀'}</p>
          <p className="text-white/70">{team.professionName} ‧ 現金 {formatMoney(team.cash)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 max-w-6xl w-full">
        {/* 收入 */}
        <div className="glass-dark rounded-2xl p-4">
          <h3 className="text-lg font-bold text-green-300 mb-2">收入　總 {formatMoney(d.totalIncome)}</h3>
          {incomeRows.map(([l, v]) => (
            <div key={l} className="flex justify-between text-white/85 py-0.5"><span>{l}</span><span className="tabular-nums">+{formatMoney(v)}</span></div>
          ))}
        </div>
        {/* 支出 */}
        <div className="glass-dark rounded-2xl p-4">
          <h3 className="text-lg font-bold text-red-300 mb-2">支出　總 {formatMoney(d.totalExpense)}</h3>
          {expenseRows.map(([l, v]) => (
            <div key={l} className="flex justify-between text-white/85 py-0.5"><span>{l}</span><span className="tabular-nums">-{formatMoney(v)}</span></div>
          ))}
        </div>
        {/* 資產負債 */}
        <div className="glass-dark rounded-2xl p-4">
          <h3 className="text-lg font-bold text-zizi-gold mb-2">資產負債</h3>
          <div className="flex justify-between text-white/85 py-0.5"><span>資產總值</span><span className="tabular-nums">{formatMoney(d.assetsValue)}</span></div>
          <div className="flex justify-between text-white/85 py-0.5"><span>負債總額</span><span className="tabular-nums text-red-300">-{formatMoney(d.liabilitiesTotal)}</span></div>
          <div className="flex justify-between text-white font-bold py-1 border-t border-white/15 mt-1"><span>淨資產</span><span className="tabular-nums">{formatMoney(d.netWorth)}</span></div>
          <p className="text-xs text-white/50 mt-2">持有投資 {(team.assets || []).length} 筆</p>
        </div>
      </div>

      <div className="mt-5 bg-zizi-gold/15 rounded-2xl px-6 py-3 text-center">
        <span className="text-white/70">月現金流 </span>
        <span className={'text-2xl font-black tabular-nums ' + ((d.cashflow ?? 0) >= 0 ? 'text-green-300' : 'text-red-300')}>
          {(d.cashflow ?? 0) >= 0 ? '+' : '-'}{formatMoney(Math.abs(d.cashflow ?? 0))}
        </span>
        <span className="text-white/70 ml-4">距財富自由：被動 {formatMoney(d.passiveTotal)} / 支出 {formatMoney(d.totalExpense)}</span>
      </div>
      <p className="mt-4 text-white/40 text-sm">（老師再點一次「投影中」即可關閉）</p>
    </div>
  );
}

function Tutorial() {
  const squares = [
    { e: '💰', t: '發薪', d: '每個月初自動領「薪水＋被動收入−支出」' },
    { e: '🎲', t: '機會', d: '抽卡投資：小生意 / 大買賣，買房地產或企業就靠它' },
    { e: '📈', t: '市場', d: '抽市場風雲卡，全班股價、房價一起漲跌' },
    { e: '💸', t: '額外支出', d: '臨時花費，乖乖付錢' },
    { e: '❤️', t: '慈善', d: '捐 10% 收入，接下來 3 回合可擲兩顆骰' },
    { e: '👶', t: '生小孩', d: '每月支出增加（最多 3 個）' },
    { e: '💼', t: '失業', d: '付一個月支出並暫停一回合' },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-zizi-ink/85 backdrop-blur-md flex flex-col items-center justify-center p-10 overflow-auto">
      <h2 className="text-4xl font-black text-zizi-gold mb-2">📖 新手教學</h2>
      <p className="text-white/70 mb-6">目標：讓「被動收入 ＞ 總支出」，跳出老鼠賽跑圈、財富自由！</p>

      <div className="grid grid-cols-2 gap-6 max-w-5xl w-full">
        <div className="glass-dark rounded-2xl p-5">
          <h3 className="text-xl font-bold text-white mb-3">🕹️ 怎麼玩</h3>
          <ol className="space-y-2 text-white/85 list-decimal list-inside">
            <li>手機掃 QR 加入，<b>二選一</b>抽職業卡（看清楚有沒有房、負債多少）</li>
            <li>每個月<b>輪流擲骰子</b>，棋子沿著跑道前進</li>
            <li>停到不同格子 → 觸發發薪 / 機會 / 市場 / 支出等事件</li>
            <li>用「<b>市場</b>」分頁買股票/ETF/加密；房地產、企業要停「機會」格抽到</li>
            <li>低買高賣賺價差，或買能<b>每月生現金</b>的資產</li>
            <li>被動收入蓋過總支出 → <b>跳出老鼠圈、贏！</b></li>
          </ol>
        </div>

        <div className="glass-dark rounded-2xl p-5">
          <h3 className="text-xl font-bold text-white mb-3">🎯 格子說明</h3>
          <div className="space-y-1.5 text-white/85 text-sm">
            {squares.map((s) => (
              <div key={s.t} className="flex items-start gap-2">
                <span className="text-xl">{s.e}</span>
                <span><b className="text-zizi-gold">{s.t}</b>：{s.d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 max-w-5xl w-full text-center">
        <div className="glass-dark rounded-2xl p-4">
          <p className="text-3xl">📈</p>
          <p className="text-white font-bold mt-1">會浮動的資產</p>
          <p className="text-white/60 text-sm">股票、ETF、加密貨幣有價格走勢圖，加密波動最大</p>
        </div>
        <div className="glass-dark rounded-2xl p-4">
          <p className="text-3xl">🏠</p>
          <p className="text-white font-bold mt-1">房地產</p>
          <p className="text-white/60 text-sm">士林/天母不同房型；有人會出價收購，可賺一筆</p>
        </div>
        <div className="glass-dark rounded-2xl p-4">
          <p className="text-3xl">💳</p>
          <p className="text-white font-bold mt-1">銀行貸款</p>
          <p className="text-white/60 text-sm">缺現金可借，但每月要還 7% 利息，別越借越窮</p>
        </div>
      </div>

      <p className="mt-6 text-white/40 text-sm">（老師按「關閉教學」即可開始遊戲）</p>
    </div>
  );
}

// 月初彈窗：回顧上個月 + 公布本月突發事件
function MonthReport({ report, onClose }) {
  const { round, prevEvent, thisEvent, moves, scale, rumor } = report;
  const moveRow = (label, emoji, pct) => (
    <div className="flex items-center justify-between px-4 py-1.5">
      <span className="text-white/70">{emoji} {label}</span>
      <span className={'font-bold tabular-nums ' + (pct >= 0 ? 'text-green-400' : 'text-red-400')}>
        {pct >= 0 ? '▲' : '▼'}{Math.abs(pct)}%
      </span>
    </div>
  );
  return (
    <div onClick={onClose} className="fixed inset-0 z-40 flex items-center justify-center bg-zizi-ink/70 backdrop-blur-sm cursor-pointer">
      <span className="absolute bottom-6 inset-x-0 text-center text-white/55 text-sm">👆 點畫面任一處關閉</span>
      <div className="card-pop bg-gradient-to-b from-amber-800 to-amber-950 border-2 border-zizi-gold rounded-3xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] w-[34rem] max-w-[92vw] p-7 text-white">
        <p className="text-center text-white/60">— 第 {round} 回合 —</p>

        {prevEvent ? (
          <div className="mt-3 bg-white/5 rounded-2xl p-4">
            <p className="text-sm text-white/50 mb-1">上回合行情回顧</p>
            <p className="text-lg font-bold">{prevEvent.emoji} {prevEvent.title}</p>
            <div className="mt-2 divide-y divide-white/10 text-sm">
              {moveRow('股票 / ETF', '📈', moves.stock)}
              {moveRow('加密貨幣', '🪙', moves.crypto)}
              {moves.commodity != null && moveRow('原物料', '🥇', moves.commodity)}
              {moveRow('房地產', '🏠', moves.realestate)}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-center text-white/60">遊戲開始！祝大家投資順利 🍀</p>
        )}

        <div className={'mt-4 rounded-2xl p-4 text-center ' + (scale === 'big' ? 'bg-zizi-gold/20 ring-2 ring-zizi-gold' : 'bg-white/5')}>
          <p className="text-sm text-zizi-gold mb-1">{scale === 'big' ? '🔥 本回合大事件' : '📢 本回合市場'}</p>
          <p className="text-3xl mb-1">{thisEvent.emoji}</p>
          <p className="text-2xl font-black text-zizi-gold">{thisEvent.title}</p>
          <p className="text-white/70 mt-1">{thisEvent.desc}</p>
        </div>

        {rumor && (
          <div className="mt-3 bg-white/5 rounded-xl px-4 py-2 text-sm text-amber-200">
            🔍 小道消息：{rumor.text}
          </div>
        )}
      </div>
    </div>
  );
}

// 跳出老鼠賽跑圈大慶祝（煙火 + 彩帶 + 隊名）
function Celebration({ name, onClose }) {
  const confetti = Array.from({ length: 40 });
  const emojis = ['🎉', '✨', '🏆', '💰', '🎊', '⭐'];
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-zizi-ink/80 backdrop-blur-sm overflow-hidden cursor-pointer">
      {confetti.map((_, i) => (
        <span
          key={i}
          className="confetti absolute text-3xl"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 1.5}s`,
            animationDuration: `${2.5 + Math.random() * 2}s`,
          }}
        >
          {emojis[i % emojis.length]}
        </span>
      ))}
      <div className="text-center card-pop relative z-10">
        <div className="text-8xl mb-4">🏆</div>
        <p className="text-3xl text-white/90">恭喜</p>
        <p className="text-6xl font-black text-zizi-gold my-3 drop-shadow-lg">{name}</p>
        <p className="text-4xl font-bold text-white">跳出老鼠賽跑圈！</p>
        <p className="text-2xl text-white/80 mt-3">達成財富自由 🎉</p>
      </div>
    </div>
  );
}

// 破產淘汰動畫
function BankruptOverlay({ payload, onClose }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-zizi-ink/85 backdrop-blur-sm cursor-pointer">
      <div className="text-center card-pop">
        <div className="text-8xl mb-4">💀</div>
        <p className="text-6xl font-black text-red-500 my-3 drop-shadow-lg">
          {payload.professionEmoji} {payload.name}
        </p>
        <p className="text-4xl font-bold text-white">破產被淘汰！</p>
        <p className="text-xl text-white/60 mt-3">現金歸零、入不敷出 ☠️</p>
      </div>
    </div>
  );
}

// 抽牌翻牌動畫（覆蓋全螢幕中央）
function CardOverlay({ payload, onClose }) {
  const { deck, card, teamName, professionName, professionEmoji } = payload;
  const META = {
    small: { label: '機會・小生意', color: 'bg-emerald-500' },
    big: { label: '機會・大買賣', color: 'bg-amber-600' },
    market: { label: '市場風雲', color: 'bg-amber-500' },
    doodad: { label: '額外支出', color: 'bg-rose-500' },
    acquire: { label: '房產收購要約', color: 'bg-teal-600' },
  };
  const m = META[deck] || { label: '事件', color: 'bg-slate-500' };
  return (
    <div onClick={onClose} className="fixed inset-0 z-40 flex items-center justify-center bg-zizi-ink/45 backdrop-blur-sm cursor-pointer">
      <span className="absolute bottom-6 inset-x-0 text-center text-white/55 text-sm">👆 點畫面任一處關閉</span>
      <div className="card-pop bg-white rounded-3xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-black/5 w-80 overflow-hidden">
        <div className={'py-2 text-center text-white font-bold ' + m.color}>{m.label}</div>
        <div className="p-6 text-center">
          <div className="text-7xl mb-3">{card.emoji}</div>
          <h3 className="text-2xl font-black text-zizi-ink">{card.name}</h3>
          {card.desc && <p className="text-slate-500 mt-2">{card.desc}</p>}
          {card.amount != null && deck === 'doodad' && (
            <p className="mt-3 text-rose-500 font-bold text-xl">-{formatMoney(card.amount)}{card.recurring ? ' / 月' : ''}</p>
          )}
          {teamName && (
            <p className="mt-4 text-base font-semibold text-slate-600">
              {professionEmoji} {teamName}
              {professionName && <span className="text-slate-400 font-normal">（{professionName}）</span>}
              <span className="text-slate-400 font-normal"> 骰到</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LobbyView({ studentUrl, teams }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      {/* 故事 / 規則開場 */}
      <div className="max-w-4xl text-center">
        <h2 className="text-3xl font-black text-zizi-gold mb-2">🐭 你正在「老鼠賽跑」</h2>
        <p className="text-lg text-white/80 leading-relaxed">
          多數人每天為錢工作：薪水一進帳，馬上被房貸、車貸、帳單吃光，像老鼠在滾輪上拼命跑卻原地打轉。
        </p>
        <p className="text-2xl font-bold text-white mt-3">
          🎯 目標：讓你的<span className="text-zizi-gold">被動收入</span>（房租、股利、企業現金流）
          <span className="text-zizi-gold">超過總支出</span>，就能<span className="text-zizi-gold">跳出老鼠圈、財富自由！</span>
        </p>
      </div>

      <div className="flex items-center justify-center gap-12 flex-wrap">
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg text-white/80">掃描 QR Code 加入遊戲</p>
          <div className="bg-white p-4 rounded-2xl">
            <QRCodeSVG value={studentUrl} size={200} />
          </div>
          <p className="text-sm font-mono text-zizi-gold">{studentUrl}</p>
        </div>
        <div className="min-w-[18rem]">
          <p className="text-xl mb-3">
            已加入 <span className="text-zizi-gold font-bold">{teams.length}</span> 組
          </p>
          <div className="grid grid-cols-2 gap-2">
            {teams.map((t) => (
              <div key={t.id} className="bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-2xl">{t.professionEmoji}</span>
                <span className="truncate">
                  <span className="block font-semibold leading-tight">{t.name}</span>
                  <span className="block text-xs text-white/60">{t.professionName}</span>
                </span>
              </div>
            ))}
            {teams.length === 0 && <p className="text-white/40 col-span-2">等待各組加入…</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// 本月大事件 + 重點商品走勢圖（每支股票/加密各自價格）
function MarketBar({ market, monthlyEvent }) {
  const inst = market?.instruments || {};
  // 挑幾支代表性商品上大螢幕
  const keyIds = ['etf_market', 'stock_aichip', 'crypto_btc'];
  const items = keyIds.map((id) => inst[id]).filter(Boolean);
  const re = market?.realestate;

  function chip(name, emoji, price, hist) {
    const base = hist && hist.length > 1 ? hist[hist.length - 2] : price;
    const up = price >= base;
    const pct = base ? Math.round(((price - base) / base) * 100) : 0;
    return (
      <div className="flex items-center gap-2" key={name}>
        <div className="text-right leading-tight">
          <p className="text-xs text-white/60">{emoji} {name}</p>
          <p className="font-bold tabular-nums text-sm">
            {price}
            <span className={'ml-1 text-xs ' + (up ? 'text-green-400' : 'text-red-400')}>
              {up ? '▲' : '▼'}{Math.abs(pct)}%
            </span>
          </p>
        </div>
        <Sparkline data={hist || [price]} width={80} height={30} color={up ? '#22c55e' : '#ef4444'} />
      </div>
    );
  }

  return (
    <div className="glass-dark rounded-2xl px-4 py-3 flex items-center gap-4 shadow-lg">
      {monthlyEvent && (
        <div className="flex items-center gap-2 pr-4 border-r border-white/15 max-w-[36%]">
          <span className="text-3xl">{monthlyEvent.emoji}</span>
          <div className="leading-tight">
            <p className="text-xs text-white/50">本月大事件</p>
            <p className="font-bold text-zizi-gold">{monthlyEvent.title}</p>
            <p className="text-xs text-white/60 truncate">{monthlyEvent.desc}</p>
          </div>
        </div>
      )}
      <div className="flex-1 flex items-center justify-around gap-3">
        {items.map((it) => chip(it.name.replace(/（.*）/, ''), it.emoji, it.price, it.history))}
        {re && chip('房地產', '🏠', re.index, re.history)}
      </div>
    </div>
  );
}

// 老鼠賽跑圈盤面：24 格環狀 + 各組代幣
function Board({ board, teams, round, timeLeft, phase, currentTurnId }) {
  const cs = 100 / GRID; // 每格百分比
  const currentTeam = teams.find((t) => t.id === currentTurnId);
  // 把各組依目前格子分組，方便在同格時錯開排列
  const byCell = {};
  teams.forEach((t) => {
    const p = t.position || 0;
    (byCell[p] = byCell[p] || []).push(t);
  });

  return (
    <div className="relative aspect-square" style={{ width: 'min(100%, 78vh)' }}>
      {/* 格子 */}
      {board.map((sq) => {
        const { r, c } = cellOf(sq.index);
        const meta = SQUARE_META[sq.type] || {};
        return (
          <div
            key={sq.index}
            className="absolute p-1"
            style={{ left: `${c * cs}%`, top: `${r * cs}%`, width: `${cs}%`, height: `${cs}%` }}
          >
            <div className={'w-full h-full rounded-lg flex flex-col items-center justify-center text-white ' + (meta.color || 'bg-slate-500')}>
              <span className="text-4xl leading-none">{meta.emoji}</span>
              <span className="text-sm font-bold mt-1 leading-none">{meta.label}</span>
            </div>
          </div>
        );
      })}

      {/* 中央資訊 */}
      <div
        className="absolute flex flex-col items-center justify-center text-center"
        style={{ left: `${cs}%`, top: `${cs}%`, width: `${5 * cs}%`, height: `${5 * cs}%` }}
      >
        <p className="text-white/50 text-lg">老鼠賽跑圈</p>
        <p className="text-zizi-gold font-black text-5xl my-1">第 {round} 回合</p>
        {(phase === 'running' || phase === 'paused') && (
          <p className="text-white/80 text-2xl tabular-nums">⏱ {formatTime(timeLeft)}</p>
        )}
        {phase === 'running' && (
          <p className="mt-2 text-lg font-bold text-zizi-gold">
            {currentTeam ? `🎲 輪到 ${currentTeam.professionEmoji} ${currentTeam.name}` : '本回合擲完，等待下一回合'}
          </p>
        )}
        <p className="text-white/40 text-sm mt-2">目標：被動收入 ＞ 總支出 → 跳出老鼠圈</p>
      </div>

      {/* 代幣（依 position 定位，position 變化時用 CSS 過場滑動） */}
      {teams.map((t) => {
        const p = t.position || 0;
        const { r, c } = cellOf(p);
        const group = byCell[p] || [];
        const k = group.findIndex((x) => x.id === t.id);
        const n = group.length;
        const offset = (k - (n - 1) / 2) * 2.2; // 同格錯開（百分比）
        const left = (c + 0.5) * cs + offset;
        const top = (r + 0.5) * cs;
        return (
          <div
            key={t.id}
            className={'absolute z-10 transition-all duration-700 ease-out ' + (t.bankrupt ? 'opacity-40 grayscale' : '')}
            style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}
            title={t.name}
          >
            {t.id === currentTurnId && !t.bankrupt && (
              <span className="absolute inset-0 -m-1 rounded-full ring-4 ring-zizi-gold animate-ping" />
            )}
            <div className={'relative rounded-full w-9 h-9 flex items-center justify-center text-lg shadow-lg ring-2 ' + (t.bankrupt ? 'bg-slate-600 ring-slate-400' : t.free ? 'bg-green-400 ring-white' : t.id === currentTurnId ? 'bg-zizi-gold ring-white' : 'bg-white ring-zizi-gold')}>
              {t.bankrupt ? '💀' : t.professionEmoji}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Leaderboard({ ranked, ended }) {
  const medal = ['🥇', '🥈', '🥉'];
  return (
    <div className="glass-dark rounded-2xl p-4 flex-1 min-h-0 overflow-auto shadow-lg">
      <h2 className="text-xl font-bold mb-3">🏆 排行榜</h2>
      <div className="space-y-1.5">
        {ranked.map((t, i) => {
          const pct = t.expense > 0 ? Math.min(100, Math.round((t.passiveIncome / t.expense) * 100)) : 0;
          if (t.bankrupt) {
            return (
              <div key={t.id} className="rounded-xl px-3 py-2 bg-red-900/30 ring-1 ring-red-500/40 opacity-70">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center">💀</span>
                  <span className="text-xl grayscale">{t.professionEmoji}</span>
                  <span className="flex-1 font-semibold truncate text-sm line-through text-white/60">{t.name}</span>
                  <span className="text-sm font-bold text-red-400">已淘汰</span>
                </div>
              </div>
            );
          }
          return (
            <div key={t.id} className={'rounded-xl px-3 py-2 ' + (t.free ? 'bg-green-500/20 ring-1 ring-green-400' : 'bg-white/10')}>
              <div className="flex items-center gap-2">
                <span className="w-6 text-center font-bold">{medal[i] || i + 1}</span>
                <span className="text-xl">{t.professionEmoji}</span>
                <span className="flex-1 font-semibold truncate text-sm">{t.name}</span>
                <span className="text-sm font-bold text-zizi-gold tabular-nums">{formatMoney(t.netWorth)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                  <div className={'h-full ' + (t.free ? 'bg-green-400' : 'bg-zizi-gold')} style={{ width: pct + '%' }} />
                </div>
                <span className="text-[0.65rem] text-white/60 w-8 text-right">{pct}%</span>
              </div>
            </div>
          );
        })}
        {ranked.length === 0 && <p className="text-white/40">尚無組別</p>}
      </div>
      {ended && ranked[0] && (
        <div className="mt-4 text-center bg-zizi-gold/20 rounded-2xl py-3">
          <p className="text-sm text-white/70">本場冠軍</p>
          <p className="text-2xl font-black text-zizi-gold">{ranked[0].professionEmoji} {ranked[0].name}</p>
        </div>
      )}
    </div>
  );
}

function FeedPanel({ feed }) {
  return (
    <div className="glass-dark rounded-2xl p-4 h-56 shrink-0 flex flex-col shadow-lg">
      <h2 className="text-lg font-bold mb-2">📢 最新動態</h2>
      <div className="flex-1 overflow-auto space-y-1.5">
        {feed.map((f, i) => (
          <div key={i} className={'rounded-lg px-2.5 py-1.5 text-xs ' + (i === 0 ? 'bg-zizi-gold/20' : 'bg-white/10 text-white/80')}>
            {f.text}
          </div>
        ))}
        {feed.length === 0 && <p className="text-white/40 text-sm">尚無動態</p>}
      </div>
    </div>
  );
}
