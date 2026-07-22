import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { socket, ROOM } from '../socket.js';
import { useConnection } from '../hooks/useConnection.js';
import { useGameState } from '../hooks/useGameState.js';
import { useTeams } from '../hooks/useTeams.js';
import { useFeed } from '../hooks/useFeed.js';
import { formatTime, formatMoney } from '../util/format.js';
import { SQUARE_META, COLS, ROWS, cellOf } from '../util/board.js';
import ConnectionBadge from '../components/ConnectionBadge.jsx';
import Sparkline from '../components/Sparkline.jsx';
import Avatar from '../components/Avatar.jsx';
import { SFX, playEventSound, setSoundEnabled, resumeAudio } from '../util/sound.js';
import { api, page } from '../base.js';

// 難度標示（與 server/game.js 的 DIFFICULTY 對應）
const STAGE_META = {
  basic: { emoji: '🟢', label: '初階' },
  mid: { emoji: '🟡', label: '中階' },
  full: { emoji: '🔴', label: '高階' },
};

// 大螢幕端（投影機）— M7：等待室 QR / 進行中老鼠賽跑圈盤面 + 排行榜 + 動態
export default function Screen() {
  const { connected } = useConnection();
  const game = useGameState();
  const teams = useTeams();
  const feed = useFeed();
  const [serverInfo, setServerInfo] = useState(null);
  const [board, setBoard] = useState([]);
  const [marketCatalog, setMarketCatalog] = useState([]); // 完整市場目錄（給投影鏡像的市場分頁，與學生端一致）
  const [drawn, setDrawn] = useState(null); // 最近抽到的卡（翻牌動畫）
  const [celebrate, setCelebrate] = useState(null); // 跳出老鼠圈大慶祝
  const [report, setReport] = useState(null); // 月初回顧/預告彈窗
  const [bankrupt, setBankrupt] = useState(null); // 破產淘汰動畫
  const [deal, setDeal] = useState(null); // 買賣直播（機會卡選擇→思考→決定）
  const [dice, setDice] = useState(null); // 擲骰結果橫幅
  const [movingId, setMovingId] = useState(null); // 正在走動的代幣（套用跳動動畫）
  const [soundOn, setSoundOn] = useState(true); // 大螢幕音效開關

  // 瀏覽器自動播放政策：第一次點畫面就解鎖音效
  useEffect(() => {
    const unlock = () => resumeAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    fetch(api('api/server-info')).then((r) => r.json()).then(setServerInfo).catch(() => {});
    fetch(api('api/board')).then((r) => r.json()).then(setBoard).catch(() => {});
    fetch(api('api/market')).then((r) => r.json()).then(setMarketCatalog).catch(() => {});
  }, []);

  useEffect(() => {
    let cardTimer, freedTimer, dealTimer, diceTimer, hopTimer;
    function onCard(payload) {
      // 小生意/大買賣/收購改由「買賣直播」呈現，這裡只翻市場風雲與額外支出卡
      if (payload?.deck === 'small' || payload?.deck === 'big' || payload?.deck === 'acquire') return;
      setDrawn(payload);
      clearTimeout(cardTimer);
      cardTimer = setTimeout(() => setDrawn(null), 4200);
    }
    // 買賣直播：choosing/deciding 一直掛著等玩家動作；decided 顯示結果後自動收掉
    function onDeal(payload) {
      clearTimeout(dealTimer);
      setDeal(payload || null);
      if (payload?.stage === 'decided') {
        if (payload.accept) SFX.cha();
        dealTimer = setTimeout(() => setDeal(null), 8000);
      }
    }
    // 擲骰橫幅：顯示骰面與停留格，幾秒後淡出；同時讓該組代幣跳一段「走路」動畫
    function onMove(payload) {
      setDice(payload);
      clearTimeout(diceTimer);
      diceTimer = setTimeout(() => setDice(null), 4000);
      setMovingId(payload.teamId);
      clearTimeout(hopTimer);
      hopTimer = setTimeout(() => setMovingId(null), 900);
      // 音效：先搖骰聲，角色登場時再放事件音效
      SFX.roll();
      setTimeout(() => playEventSound(payload.square, payload.paydays), 300);
    }
    function onFreed(payload) {
      setCelebrate(payload);
      SFX.freed();
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
      SFX.bankrupt();
      clearTimeout(bankruptTimer);
      bankruptTimer = setTimeout(() => setBankrupt(null), 6000);
    }
    socket.on('card:drawn', onCard);
    socket.on('game:freed', onFreed);
    socket.on('month:report', onReport);
    socket.on('game:bankrupt', onBankrupt);
    socket.on('deal:live', onDeal);
    socket.on('board:move', onMove);
    return () => {
      socket.off('card:drawn', onCard);
      socket.off('game:freed', onFreed);
      socket.off('month:report', onReport);
      socket.off('game:bankrupt', onBankrupt);
      socket.off('deal:live', onDeal);
      socket.off('board:move', onMove);
      clearTimeout(cardTimer);
      clearTimeout(freedTimer);
      clearTimeout(reportTimer);
      clearTimeout(bankruptTimer);
      clearTimeout(dealTimer);
      clearTimeout(diceTimer);
      clearTimeout(hopTimer);
    };
  }, []);

  // 學生掃描網址：
  //  - 自架（localhost / 區網 IP）→ 用區網 IP + 連接埠，讓同 Wi-Fi 的手機連得到
  //  - 雲端網域（如 onrender.com，https）→ 直接用目前網址，不加 IP/埠
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host);
  const roomQ = ROOM ? `?room=${ROOM}` : '';
  const studentUrl = isLocalHost && serverInfo?.lanIp
    ? `http://${serverInfo.lanIp}:${window.location.port || serverInfo.port || '3000'}${page('student')}${roomQ}`
    : `${window.location.origin}${page('student')}${roomQ}`;

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
            {phase === 'lobby' ? '等待開始' : phase === 'ended' ? '遊戲結束' : `第 ${round} 回合`}
          </span>
          {STAGE_META[game?.stage] && (
            <span className="ml-2 text-sm font-medium bg-white/10 ring-1 ring-white/20 rounded-full px-2.5 py-0.5 text-white/80">
              {STAGE_META[game.stage].emoji} {STAGE_META[game.stage].label}
            </span>
          )}
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
          <button
            onClick={() => { const v = !soundOn; setSoundOn(v); setSoundEnabled(v); resumeAudio(); }}
            className="text-xl bg-white/10 hover:bg-white/20 ring-1 ring-white/20 rounded-full w-9 h-9 flex items-center justify-center"
            title={soundOn ? '音效開（點一下靜音）' : '音效關（點一下開啟）'}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
          <ConnectionBadge connected={connected} />
        </div>
      </header>

      <main className="flex-1 min-h-0 p-5">
        {phase === 'lobby' ? (
          <LobbyView studentUrl={studentUrl} teams={teams} />
        ) : (
          <div className="h-full flex gap-4">
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              <MarketBar market={game?.market} monthlyEvent={game?.monthlyEvent} />
              <div className="flex-1 min-h-0 flex items-center justify-center">
                <Board board={game?.board?.length ? game.board : board} teams={teams} round={round} timeLeft={timeLeft} phase={phase} currentTurnId={game?.currentTurnId} movingId={movingId} />
              </div>
              <FeedPanel feed={feed} />
            </div>
            <div className="w-[26rem] shrink-0 flex flex-col gap-3 min-h-0">
              <JoinQR studentUrl={studentUrl} />
              <TeamsOverview ranked={ranked} ended={phase === 'ended'} currentTurnId={game?.currentTurnId} />
            </div>
          </div>
        )}
      </main>

      {/* 抽卡事件(機會/市場/額外支出)的角色反應改由全螢幕卡片場景呈現，這裡的頂部橫幅只給非抽卡事件 */}
      {dice && phase === 'running' && !['opportunity', 'market', 'doodad'].includes(dice.square) && (
        <DiceBanner payload={dice} team={teams.find((t) => t.id === dice.teamId)} />
      )}
      {game?.spotlight && <Spotlight team={game.spotlight} tab={game.spotlightTab || 'finance'} scroll={game.spotlightScroll || 0} market={game.market} catalog={game?.marketCatalog?.length ? game.marketCatalog : marketCatalog} />}
      {game?.showTutorial && <Tutorial />}
      {report && !game?.showTutorial && <MonthReport report={report} onClose={() => setReport(null)} />}
      {deal && !game?.showTutorial && !game?.spotlight && (
        <DealLiveOverlay deal={deal} teamFull={teams.find((t) => t.id === deal.team?.teamId)} onClose={() => setDeal(null)} />
      )}
      {drawn && !deal && <CardOverlay payload={drawn} teamFull={teams.find((t) => t.id === drawn.teamId)} onClose={() => setDrawn(null)} />}
      {celebrate && <Celebration payload={celebrate} team={teams.find((t) => t.id === celebrate.teamId)} onClose={() => setCelebrate(null)} />}
      {bankrupt && <BankruptOverlay payload={bankrupt} team={teams.find((t) => t.id === bankrupt.teamId)} onClose={() => setBankrupt(null)} />}
    </div>
  );
}

// 新手教學說明書（老師可開關）
// 老師投影：把某組完整財務投到大螢幕做教學分析
// 大螢幕「手機鏡像」：把某組的手機畫面投到大螢幕，老師端可切分頁＋上下捲動（只看、不操作）
const SPOT_TABS = [
  { key: 'finance', label: '💰 損益' },
  { key: 'market', label: '🛒 市場' },
  { key: 'assets', label: '📊 資產負債' },
  { key: 'history', label: '📜 歷史' },
];
// 市場分類（與學生端 MarketTab 一致）
const MKT_ORDER = ['dividend', 'commodity', 'crypto', 'interest'];
const MKT_LABEL = {
  dividend: '📈 股票 / ETF',
  commodity: '🥇 原物料（黃金/白銀/石油）',
  crypto: '🪙 加密貨幣',
  interest: '🏦 定存 / 債券',
};
function Spotlight({ team, tab = 'finance', scroll = 0, market, catalog = [] }) {
  const d = team.derived || {};
  const p = d.passive || {};
  const e = team.expenses || {};
  const pl = team.personalLiabilities || {};
  const cf = d.cashflow ?? 0;
  const PASSIVE = { interest: '利息', dividend: '股利', realestate: '房地產', business: '企業' };
  const row = (l, v, cls) => (
    <div className="flex justify-between py-0.5"><span className="text-slate-500">{l}</span><span className={'tabular-nums font-semibold ' + (cls || '')}>{v}</span></div>
  );
  const incomeRows = [['工資（主動）', team.salary],
    ...['interest', 'dividend', 'realestate', 'business'].filter((k) => (p[k] || 0) > 0).map((k) => [`${PASSIVE[k]}（被動）`, p[k]])];
  const expenseRows = [['稅金', e.tax], ['自住房貸', e.homeMortgage], ['車貸', e.carLoan], ['學貸', e.schoolLoan],
    ['卡債', e.creditCard], ['生活費', e.other], [`小孩 ×${team.children || 0}`, (team.perChild || 0) * (team.children || 0)],
    ['貸款利息', d.bankLoanPayment]].filter((r) => (r[1] || 0) > 0);
  const debtRows = [['自住房貸', pl.homeMortgage], ['車貸', pl.carLoan], ['學貸', pl.schoolLoan], ['卡債', pl.creditCard], ['銀行貸款', pl.bankLoan]]
    .filter((r) => (r[1] || 0) > 0);
  const pct = d.totalExpense ? Math.min(100, Math.round((d.passiveTotal / d.totalExpense) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-zizi-ink/85 backdrop-blur-md flex flex-col items-center justify-center p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{team.professionEmoji}</span>
        <div>
          <p className="text-2xl font-black text-zizi-gold">📱 {team.name} 的手機{team.bankrupt && ' 💀'}</p>
          <p className="text-white/70 text-sm">{team.professionName} ‧ 現金 {formatMoney(team.cash)} ‧ 月現金流 <b className={cf >= 0 ? 'text-green-300' : 'text-red-300'}>{cf >= 0 ? '+' : '−'}{formatMoney(Math.abs(cf))}</b></p>
        </div>
      </div>

      {/* 手機外框 */}
      <div className="w-[27rem] max-w-[94vw] h-[70vh] bg-black rounded-[2rem] p-2.5 shadow-2xl">
        <div className="w-full h-full bg-zizi-cream text-zizi-ink rounded-[1.6rem] overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-zizi-dusk via-zizi-plum to-zizi-dusk text-white px-4 py-2 flex justify-between items-center shrink-0">
            <span className="font-bold">⚡ {team.name}</span>
            <span className="text-xs text-white/70">代號 {team.id}</span>
          </div>
          {/* 分頁列：反白目前分頁（由老師端控制） */}
          <div className="flex bg-white/70 px-2 py-1.5 gap-1 shrink-0 border-b border-black/5">
            {SPOT_TABS.map((t) => (
              <span key={t.key} className={'flex-1 text-center py-1.5 text-sm font-bold rounded-lg ' + (t.key === tab ? 'bg-white text-zizi-ink shadow' : 'text-slate-400')}>{t.label}</span>
            ))}
          </div>
          {/* 內容：用 translateY 由老師端上下捲動 */}
          <div className="flex-1 overflow-hidden">
            <div className="p-4 text-[15px] leading-relaxed transition-transform duration-300" style={{ transform: `translateY(-${scroll * 150}px)` }}>
              {tab === 'finance' && (<>
                <p className="font-black text-green-700 mb-1">收入　總 {formatMoney(d.totalIncome)}</p>
                {incomeRows.map(([l, v]) => row(l, '+' + formatMoney(v), 'text-green-700'))}
                <p className="font-black text-rose-700 mt-3 mb-1">支出　總 {formatMoney(d.totalExpense)}</p>
                {expenseRows.map(([l, v]) => row(l, '−' + formatMoney(v), 'text-rose-700'))}
                <div className="flex justify-between border-t border-black/10 mt-2 pt-2 font-black">
                  <span>＝ 月現金流</span><span className={'tabular-nums ' + (cf >= 0 ? 'text-green-700' : 'text-rose-700')}>{cf >= 0 ? '+' : '−'}{formatMoney(Math.abs(cf))}</span>
                </div>
                <div className="mt-3 bg-white rounded-xl p-3 ring-1 ring-black/5">
                  <div className="flex justify-between text-sm text-slate-500 mb-1"><span>🎯 財富自由進度</span><span className="font-black text-amber-600">{pct}%</span></div>
                  <div className="h-2.5 rounded-full bg-black/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-zizi-gold" style={{ width: `${pct}%` }} /></div>
                  <p className="text-xs text-slate-400 mt-1">被動 {formatMoney(d.passiveTotal)} ／ 支出 {formatMoney(d.totalExpense)}</p>
                </div>
              </>)}

              {tab === 'assets' && (<>
                <div className="bg-white rounded-xl p-3 ring-1 ring-black/5">
                  {row('資產總值', formatMoney(d.assetsValue), 'text-slate-700')}
                  {row('負債總額', '−' + formatMoney(d.liabilitiesTotal), 'text-rose-700')}
                  <div className="flex justify-between border-t border-black/10 mt-1 pt-1 font-black"><span>淨資產</span><span className="tabular-nums text-amber-600">{formatMoney(d.netWorth)}</span></div>
                </div>
                <p className="font-black mt-3 mb-1">持有資產（{(team.assets || []).length} 筆）</p>
                {(team.assets || []).map((a) => (
                  <div key={a.uid} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 mb-1 ring-1 ring-black/5">
                    <span className="text-xl shrink-0">{a.emoji}</span>
                    <span className="flex-1 min-w-0 truncate">{a.name}{a.units != null && <span className="text-slate-400 text-xs"> ×{Math.round(a.units)}</span>}</span>
                    <span className="tabular-nums text-slate-600 shrink-0">{formatMoney(a.value)}</span>
                    {(a.monthlyIncome || 0) !== 0 && <span className={'tabular-nums text-xs shrink-0 w-16 text-right ' + (a.monthlyIncome > 0 ? 'text-green-700' : 'text-rose-700')}>{a.monthlyIncome > 0 ? '+' : '−'}{formatMoney(Math.abs(a.monthlyIncome))}</span>}
                  </div>
                ))}
                {(team.assets || []).length === 0 && <p className="text-slate-400">尚無投資資產</p>}
                {debtRows.length > 0 && <>
                  <p className="font-black mt-3 mb-1">負債明細</p>
                  {debtRows.map(([l, v]) => row(l, '−' + formatMoney(v), 'text-rose-700'))}
                </>}
              </>)}

              {tab === 'market' && (<>
                <p className="text-sm text-slate-400 mb-2">目前市場行情（全班一樣，與學生端同步）</p>
                {MKT_ORDER.map((cat) => {
                  const items = (catalog || []).filter((m) => m.category === cat);
                  if (!items.length) return null;
                  return (
                    <div key={cat} className="mb-3">
                      <p className="text-sm font-bold text-slate-500 mb-1">{MKT_LABEL[cat]}</p>
                      <div className="space-y-1.5">
                        {items.map((item) => {
                          const inst = market?.instruments?.[item.id];
                          const hist = inst?.history || [];
                          const price = inst?.price ?? item.price ?? null;
                          const prev = hist.length > 1 ? hist[hist.length - 2] : price;
                          const up = price != null && price >= prev;
                          const chg = prev ? Math.round(((price - prev) / prev) * 100) : 0;
                          return (
                            <div key={item.id} className="bg-white rounded-xl px-3 py-2 ring-1 ring-black/5">
                              <div className="flex items-start gap-2">
                                <span className="text-2xl shrink-0">{item.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold truncate">{item.name}</span>
                                    <span className="text-[0.7rem] rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 shrink-0">風險 {item.risk}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 leading-snug">{item.desc}</p>
                                  <div className="flex items-center gap-2 mt-0.5 text-sm">
                                    {inst ? (<>
                                      <span className="text-slate-400 text-xs">現價</span>
                                      <span className="font-bold tabular-nums text-slate-800">{formatMoney(price)}</span>
                                      <span className={up ? 'text-green-600' : 'text-red-500'}>{up ? '▲' : '▼'}{Math.abs(chg)}%</span>
                                    </>) : item.annualRate != null ? (
                                      <span className="text-slate-500 text-xs">年利率 {(item.annualRate * 100).toFixed(1)}%（每月配息）</span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                              {hist.length > 1 && (
                                <div className="mt-1.5 bg-slate-50 rounded-lg p-1 flex justify-center">
                                  <Sparkline data={hist} width={300} height={40} color={up ? '#16a34a' : '#dc2626'} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {(!catalog || catalog.length === 0) && <p className="text-slate-400">市場資料載入中…</p>}
              </>)}

              {tab === 'history' && (<>
                <p className="text-sm text-slate-400 mb-1">最近的紀錄（新的在上）</p>
                {(team.history || []).map((h, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 mb-1 ring-1 ring-black/5">
                    <span className="text-xs text-slate-400 shrink-0 w-12">第{h.round}回</span>
                    <span className="flex-1 min-w-0 truncate">{h.text}</span>
                    {(h.delta || 0) !== 0 && <span className={'tabular-nums text-sm shrink-0 ' + (h.delta > 0 ? 'text-green-700' : 'text-rose-700')}>{h.delta > 0 ? '+' : '−'}{formatMoney(Math.abs(h.delta))}</span>}
                  </div>
                ))}
                {(team.history || []).length === 0 && <p className="text-slate-400">還沒有紀錄</p>}
              </>)}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-white/45 text-sm">老師端可切分頁、上下捲動；再點一次「投影中」即可關閉</p>
    </div>
  );
}

function Tutorial() {
  const squares = [
    { e: '💰', t: '發薪', d: '每個月初自動領「薪水＋被動收入−支出」' },
    { e: '🎲', t: '機會', d: '抽卡投資：小生意 / 大買賣，買房地產或企業就靠它' },
    { e: '📈', t: '市場', d: '抽市場風雲卡，全班股價、房價一起漲跌' },
    { e: '💸', t: '額外支出', d: '臨時花費，乖乖付錢' },
    { e: '🍀', t: '好運', d: '天上掉錢！撿到錢、中獎、領獎金，小賺一筆' },
    { e: '❤️', t: '慈善', d: '捐 10% 收入，接下來 3 回合可擲兩顆骰' },
    { e: '👶', t: '生小孩', d: '每月支出增加（最多 3 個）' },
    { e: '💼', t: '失業', d: '下個發薪日領不到薪水（不扣現金、不暫停）' },
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
          <p className="text-white/60 text-sm">缺現金可借，但每月要還 10% 利息，別越借越窮</p>
        </div>
      </div>

      <p className="mt-6 text-white/40 text-sm">（老師按「關閉教學」即可開始遊戲）</p>
    </div>
  );
}

// 數字從 0 跑上去的動畫
function CountUp({ value, duration = 700 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, start;
    const step = (ts) => {
      if (start == null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      setV(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{v}</>;
}

// 大事件專屬動畫劇場：依 fx 主題，在月初報告彈窗背後疊一層全螢幕特效
// motion＝粒子動線；tint＝色調覆蓋層；n＝粒子數；dur＝每顆動畫秒數區間
const FX_THEME = {
  circuit:  { emojis: ['⚡', '🤖', '💡', '🔷'], motion: 'bigfx-twinkle', tint: 'bigfx-tint bigfx-tint-blue', n: 16, dur: [0.8, 1.6] },
  boom:     { emojis: ['📈', '🚀', '💹', '🟢'], motion: 'bigfx-rise', tint: 'bigfx-tint bigfx-tint-green', n: 16, dur: [1.6, 3] },
  coinrain: { emojis: ['🪙', '₿', '💰', '🟡'], motion: 'bigfx-fall', tint: 'bigfx-tint bigfx-tint-gold', n: 20, dur: [1.6, 3] },
  gold:     { emojis: ['✨', '🥇', '🌟', '💛'], motion: 'bigfx-twinkle', tint: 'bigfx-tint bigfx-tint-gold', n: 18, dur: [0.9, 1.8] },
  siren:    { emojis: ['🚨', '😱', '⚠️', '❗'], motion: 'bigfx-twinkle', tint: 'bigfx-siren', n: 14, dur: [0.7, 1.4] },
  storm:    { emojis: ['🌀', '🌧️', '💨', '☔'], motion: 'bigfx-blow', tint: 'bigfx-tint bigfx-tint-storm', n: 16, dur: [1.2, 2.4] },
  confetti: { emojis: ['🧧', '💰', '🎉', '🎊'], motion: 'bigfx-fall', tint: 'bigfx-tint bigfx-tint-festive', n: 22, dur: [1.8, 3.4] },
  crash:    { emojis: ['📉', '🔻', '💸', '🔴'], motion: 'bigfx-fall', tint: 'bigfx-tint bigfx-tint-red', n: 18, dur: [0.9, 1.7] },
};
function BigEventFx({ type }) {
  const theme = FX_THEME[type];
  const parts = useMemo(() => {
    if (!theme) return [];
    return Array.from({ length: theme.n }).map((_, i) => ({
      emoji: theme.emojis[i % theme.emojis.length],
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 2,
      dur: theme.dur[0] + Math.random() * (theme.dur[1] - theme.dur[0]),
      size: 1.4 + Math.random() * 1.8,
    }));
  }, [type]);
  if (!theme) return null;
  const usesTop = theme.motion === 'bigfx-twinkle' || theme.motion === 'bigfx-blow';
  const isBlow = theme.motion === 'bigfx-blow';
  return (
    <div className="bigfx-layer">
      <div className={theme.tint} />
      {parts.map((p, i) => (
        <span
          key={i}
          className={'bigfx-p ' + theme.motion}
          style={{
            left: isBlow ? 0 : `${p.left}%`,
            ...(usesTop ? { top: `${p.top}%` } : {}),
            fontSize: `${p.size}rem`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

// 月初彈窗：回顧上個月 + 公布本月突發事件（含動畫）
function MonthReport({ report, onClose }) {
  const { round, prevEvent, thisEvent, moves, scale, cash, cashScope, rumor } = report;
  const scopeLabel = cashScope || '全班每組';
  const isAll = scopeLabel === '全班每組';
  const fx = scale === 'big' ? thisEvent.fx : null;
  const moveRow = (label, emoji, pct, i) => (
    <div className="flex items-center justify-between px-4 py-1.5 fade-in" style={{ animationDelay: `${0.15 + i * 0.12}s`, animationFillMode: 'backwards' }}>
      <span className="text-white/70">{emoji} {label}</span>
      <span className={'font-bold tabular-nums ' + (pct >= 0 ? 'text-green-400' : 'text-red-400')}>
        <span className="report-arrow">{pct >= 0 ? '▲' : '▼'}</span><CountUp value={Math.abs(pct)} />%
      </span>
    </div>
  );
  return (
    <div onClick={onClose} className="fixed inset-0 z-40 flex items-center justify-center bg-zizi-ink/70 backdrop-blur-sm cursor-pointer overflow-hidden">
      {fx && <BigEventFx type={fx} />}
      <span className="absolute bottom-6 inset-x-0 text-center text-white/55 text-sm z-10">👆 點畫面任一處關閉</span>
      <div className={'card-pop relative z-10 bg-gradient-to-b from-zizi-dusk to-zizi-night border-2 border-zizi-gold rounded-3xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] w-[34rem] max-w-[92vw] p-7 text-white' + (fx === 'storm' ? ' bigfx-shake' : '')}>
        <p className="text-center text-white/60">— 第 {round} 回合 —</p>

        {prevEvent ? (
          <div className="mt-3 bg-white/5 rounded-2xl p-4">
            <p className="text-sm text-white/50 mb-1">上回合行情回顧</p>
            <p className="text-lg font-bold">{prevEvent.emoji} {prevEvent.title}</p>
            <div className="mt-2 divide-y divide-white/10 text-sm">
              {moveRow('股票 / ETF', '📈', moves.stock, 0)}
              {moveRow('加密貨幣', '🪙', moves.crypto, 1)}
              {moves.commodity != null && moveRow('原物料', '🥇', moves.commodity, 2)}
              {moveRow('房地產', '🏠', moves.realestate, 3)}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-center text-white/60">遊戲開始！祝大家投資順利 🍀</p>
        )}

        <div className={'mt-4 rounded-2xl p-4 text-center relative overflow-hidden ' + (scale === 'big' ? 'bg-zizi-gold/20 ring-2 ring-zizi-gold' : 'bg-white/5')}>
          {/* 大事件：飄出同款 emoji 分身 */}
          {scale === 'big' && Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="report-drift absolute text-2xl opacity-50" style={{ left: `${8 + i * 15}%`, animationDelay: `${i * 0.45}s` }}>{thisEvent.emoji}</span>
          ))}
          <p className="text-sm text-zizi-gold mb-1 relative">{scale === 'big' ? '🔥 本回合大事件' : '📢 本回合市場'}</p>
          <div className="report-float relative inline-block">
            <span className="report-emoji text-6xl inline-block drop-shadow-lg">{thisEvent.emoji}</span>
          </div>
          <p className="text-2xl font-black text-zizi-gold relative">{thisEvent.title}</p>
          <p className="text-white/70 mt-1 relative">{thisEvent.desc}</p>
        </div>

        {/* 全班共同「搞笑賺賠」：飄錢／飄鈔動畫 + 大數字 */}
        {cash ? (
          <div className={'mt-3 rounded-2xl p-3 text-center relative overflow-hidden ' + (cash > 0 ? 'bg-emerald-500/15 ring-2 ring-emerald-400/60' : 'bg-rose-500/15 ring-2 ring-rose-400/60')}>
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="report-drift absolute text-2xl opacity-60" style={{ left: `${6 + i * 15}%`, animationDelay: `${i * 0.3}s` }}>{cash > 0 ? '🪙' : '💸'}</span>
            ))}
            <p className="relative text-sm text-white/60">
              {cash > 0 ? '💰 ' : '😱 '}
              {isAll ? '全班共同' : scopeLabel}
              {cash > 0 ? '進帳' : '損失'}
            </p>
            <p className={'relative text-4xl font-black tabular-nums drop-shadow ' + (cash > 0 ? 'text-emerald-300' : 'text-rose-300')}>
              {cash > 0 ? '+' : '−'}<CountUp value={Math.abs(cash)} />
            </p>
            <p className="relative text-xs text-white/45">{isAll ? '全班每組' : scopeLabel}現金{cash > 0 ? '增加' : '減少'}</p>
          </div>
        ) : null}

        {rumor && (
          <div className="mt-3 bg-white/5 rounded-xl px-4 py-2 text-sm text-amber-200">
            🔍 小道消息：{rumor.text}
          </div>
        )}
      </div>
    </div>
  );
}

// 跳出老鼠賽跑圈大慶祝（煙火 + 彩帶 + 角色歡呼）
function Celebration({ payload, team, onClose }) {
  const name = payload?.name;
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
      <div className="text-center card-pop relative z-10 flex flex-col items-center">
        {team?.avatar
          ? <Avatar {...team.avatar} profession={team.professionId} mood="excited" size={150} />
          : <div className="text-8xl mb-4">🏆</div>}
        <p className="text-3xl text-white/90 mt-2">恭喜</p>
        <p className="text-6xl font-black text-zizi-gold my-3 drop-shadow-lg">{name}</p>
        <p className="text-4xl font-bold text-white">跳出老鼠賽跑圈！</p>
        <p className="text-2xl text-white/80 mt-3">達成財富自由 🎉</p>
      </div>
    </div>
  );
}

// 破產淘汰動畫（角色暈倒）
function BankruptOverlay({ payload, team, onClose }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-zizi-ink/85 backdrop-blur-sm cursor-pointer">
      <div className="text-center card-pop flex flex-col items-center">
        {team?.avatar
          ? <Avatar {...team.avatar} profession={team.professionId} mood="faint" size={140} />
          : <div className="text-8xl mb-4">💀</div>}
        <p className="text-6xl font-black text-red-500 my-3 drop-shadow-lg">
          {payload.professionEmoji} {payload.name}
        </p>
        <p className="text-4xl font-bold text-white">破產被淘汰！</p>
        <p className="text-xl text-white/60 mt-3">現金歸零、入不敷出 ☠️</p>
      </div>
    </div>
  );
}

// 事件 → 角色情緒 + 標題 + 特效（大螢幕劇場）
function reactionTheme(square, paydays) {
  switch (square) {
    case 'payday': return { mood: 'happy', emoji: '💰', title: '發薪日', sub: `領了 ${paydays || 1} 次薪水！`, fx: 'coins' };
    case 'opportunity': return { mood: 'excited', emoji: '🎲', title: '機會', sub: '投資機會來了！', fx: 'spark' };
    case 'market': return { mood: 'surprised', emoji: '📈', title: '市場', sub: '行情變動，盯緊一點！', fx: 'spark' };
    case 'doodad': return { mood: 'sad', emoji: '💸', title: '額外支出', sub: '臨時花費，嗚嗚…', fx: 'none' };
    case 'charity': return { mood: 'love', emoji: '❤️', title: '慈善', sub: '行善積德，好人有好報！', fx: 'none' };
    case 'baby': return { mood: 'surprised', emoji: '👶', title: '生小孩', sub: '家裡多一張嘴！', fx: 'spark' };
    case 'downsized': return { mood: 'angry', emoji: '💼', title: '失業', sub: '被裁員了…下個發薪日沒薪水', fx: 'none' };
    case 'bonus': return { mood: 'happy', emoji: '🍀', title: '好運', sub: '天上掉錢，小賺一筆！', fx: 'coins' };
    default: return { mood: paydays > 0 ? 'happy' : 'neutral', emoji: '🎲', title: '前進', sub: paydays > 0 ? `領了 ${paydays} 次薪水！` : '', fx: paydays > 0 ? 'coins' : 'none' };
  }
}

// 灑金幣 / 閃亮特效
function Coins() {
  return Array.from({ length: 8 }).map((_, i) => (
    <span key={i} className="coin-fall absolute text-xl" style={{ left: `${5 + i * 11}%`, animationDelay: `${(i % 4) * 0.22}s` }}>🪙</span>
  ));
}
function Sparks() {
  const pos = [[6, 18], [82, 12], [14, 74], [88, 70], [48, 4]];
  return pos.map(([l, t], i) => (
    <span key={i} className="spark-pop absolute text-lg" style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${i * 0.18}s` }}>✨</span>
  ));
}

// 擲骰結果橫幅（頂部滑入）：骰面 + 玩家角色「依事件演喜怒哀樂」+ 特效
const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
function DiceBanner({ payload, team }) {
  const { rolls = [], steps, teamName, professionEmoji, squareEmoji, squareLabel, square, paydays } = payload;
  const th = reactionTheme(square, paydays);
  return (
    <div className="fixed top-14 inset-x-0 z-30 flex justify-center pointer-events-none">
      <div className="toast-pop glass-dark rounded-3xl px-6 py-3 flex items-center gap-4 shadow-2xl relative overflow-visible">
        {th.fx === 'coins' && <Coins />}
        {th.fx === 'spark' && <Sparks />}
        <span className="dice-shake text-4xl leading-none">
          {rolls.map((r, i) => (<span key={i}>{DICE_FACES[r] || '🎲'}</span>))}
        </span>
        <div className="relative w-[64px] flex justify-center shrink-0">
          {team?.avatar
            ? <Avatar {...team.avatar} profession={team.professionId} mood={th.mood} size={60} />
            : <span className="text-5xl">{professionEmoji}</span>}
        </div>
        <div className="leading-tight">
          <p className="text-sm text-white/65">{professionEmoji} {teamName} 擲出 <span className="text-zizi-gold font-bold text-base">{steps}</span></p>
          <p className="text-2xl font-black text-zizi-gold leading-tight">{th.emoji} {th.title}</p>
          <p className="text-white/85 text-sm">{th.sub || `停在 ${squareEmoji} ${squareLabel}`}</p>
        </div>
      </div>
    </div>
  );
}

// 買賣直播：玩家停在機會格後，全班一起看他「選牌庫 → 看卡思考 → 做決定」
// stage: choosing（選小生意/大買賣）→ deciding（看完整卡面思考）→ decided（蓋章公布結果）
// 全螢幕事件「角色面板」：大角色依事件演表情 + 事件標題 + 組名（與卡片並排結合）
function CharacterPanel({ team, professionEmoji, name, mood, badge, title, sub }) {
  return (
    <div className="flex flex-col items-center text-center w-60 shrink-0">
      {team?.avatar
        ? <Avatar {...team.avatar} profession={team.professionId} mood={mood} size={168} />
        : <span className="text-8xl">{professionEmoji}</span>}
      <p className="mt-3 text-3xl font-black text-zizi-gold drop-shadow leading-tight">{badge} {title}</p>
      {sub && <p className="text-white/85 text-lg mt-1">{sub}</p>}
      <p className="text-white/55 text-sm mt-2">{professionEmoji} {name}</p>
    </div>
  );
}

// 買賣直播（機會）：左邊角色演出 + 右邊卡片，全螢幕結合為一體
function DealLiveOverlay({ deal, teamFull, onClose }) {
  const { stage, deck, card, team, offer, accept, loanAmount } = deal;
  const DECK_META = {
    small: { label: '機會 ‧ 小生意', color: 'bg-emerald-500' },
    big: { label: '機會 ‧ 大買賣', color: 'bg-amber-600' },
    acquire: { label: '🤝 房產收購要約', color: 'bg-teal-600' },
  };
  const m = DECK_META[deck] || { label: '機會', color: 'bg-slate-500' };
  const mi = card?.monthlyIncome || 0;
  const roi = card?.cost ? Math.round(((mi * 12) / card.cost) * 100) : 0;

  // 還在選小生意/大買賣
  if (stage === 'choosing') {
    return (
      <div onClick={onClose} className="fixed inset-0 z-40 flex items-center justify-center gap-8 px-6 bg-zizi-ink/60 backdrop-blur-sm cursor-pointer">
        <CharacterPanel team={teamFull} professionEmoji={team.professionEmoji} name={team.teamName} mood="excited" badge="🎲" title="機會" sub="抽哪一疊好呢？" />
        <div className="card-pop glass-dark rounded-3xl p-8 w-[30rem] max-w-[46vw] text-center text-white shadow-2xl">
          <p className="text-white/60 text-sm">現金 {formatMoney(team.cash)}</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-400/50 py-5 animate-pulse">
              <p className="text-3xl">🟢</p>
              <p className="font-bold text-lg mt-1">小生意</p>
              <p className="text-xs text-white/60">便宜、現金少也能玩</p>
            </div>
            <div className="rounded-2xl bg-amber-500/20 ring-1 ring-amber-400/50 py-5 animate-pulse">
              <p className="text-3xl">🔵</p>
              <p className="font-bold text-lg mt-1">大買賣</p>
              <p className="text-xs text-white/60">昂貴、報酬高</p>
            </div>
          </div>
          <p className="mt-5 text-zizi-gold font-semibold text-lg pulse-dots">正在選擇要抽哪一疊</p>
        </div>
      </div>
    );
  }

  // 看卡思考中 / 已做決定（同一張卡面，decided 多蓋一個結果章）
  const isAcquire = deck === 'acquire';
  const decided = stage === 'decided';
  const stampText = !decided
    ? null
    : isAcquire
    ? accept ? '🤝 成交賣出！' : '🙅 不賣！'
    : accept ? (loanAmount > 0 ? '💳 貸款買下！' : '✅ 買下！') : '🙅 放棄！';
  const stampTone = decided && accept ? 'text-emerald-600 ring-emerald-500' : 'text-rose-600 ring-rose-500';
  const panelMood = decided ? (accept ? 'happy' : 'sad') : 'excited';

  return (
    <div onClick={onClose} className="fixed inset-0 z-40 flex items-center justify-center gap-8 px-6 bg-zizi-ink/60 backdrop-blur-sm cursor-pointer">
      {decided && <span className="absolute bottom-6 inset-x-0 text-center text-white/55 text-sm">👆 點畫面任一處關閉</span>}
      <CharacterPanel team={teamFull} professionEmoji={team.professionEmoji} name={team.teamName} mood={panelMood} badge="🎲" title={isAcquire ? '收購要約' : '機會'} sub={!decided ? '思考中…' : (accept ? '成交！' : '放棄')} />
      <div className="card-pop relative bg-white rounded-3xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] w-[26rem] max-w-[46vw] overflow-hidden">
        <div className={'py-2 text-center text-white font-bold ' + m.color}>{m.label}</div>
        <div className="px-6 pt-4 pb-6 text-center">
          <p className="text-sm font-semibold text-slate-500">
            {team.professionEmoji} {team.teamName}
            <span className="text-slate-400 font-normal">（{team.professionName}）‧ 現金 {formatMoney(team.cash)}</span>
          </p>
          <div className="text-6xl mt-2 mb-1">{card.emoji}</div>
          <h3 className="text-2xl font-black text-zizi-ink">{card.name}</h3>
          {card.story && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{card.story}</p>}
          {card.desc && !card.story && <p className="text-sm text-slate-500 mt-1">{card.desc}</p>}

          {/* 關鍵數字：全班一起評估這筆划不划算 */}
          {isAcquire && offer ? (
            <div className="mt-3 bg-emerald-50 rounded-xl p-3 text-sm grid grid-cols-2 gap-y-1 text-left">
              <span className="text-slate-400">買家開價</span>
              <span className="text-right font-semibold">{formatMoney(offer.offerPrice)}</span>
              <span className="text-slate-400">清貸款後淨入</span>
              <span className="text-right font-bold text-emerald-600">{formatMoney(offer.net)}</span>
              {typeof offer.gainPct === 'number' && (<>
                <span className="text-slate-400">相對投入頭期</span>
                <span className={'text-right font-bold ' + (offer.gainPct >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {offer.gainPct >= 0 ? '賺' : '賠'} {Math.abs(offer.gainPct)}%
                </span>
              </>)}
            </div>
          ) : (
            <div className="mt-3 bg-slate-50 rounded-xl p-3 text-sm grid grid-cols-2 gap-y-1 text-left">
              <span className="text-slate-400">需要現金（頭期）</span>
              <span className="text-right font-bold text-zizi-ink">{formatMoney(card.cost)}</span>
              {card.mortgage > 0 && (<>
                <span className="text-slate-400">抵押貸款</span>
                <span className="text-right font-semibold text-red-500">{formatMoney(card.mortgage)}</span>
              </>)}
              <span className="text-slate-400">每月現金流</span>
              <span className={'text-right font-semibold ' + (mi >= 0 ? 'text-green-600' : 'text-red-500')}>
                {mi >= 0 ? '+' : '-'}{formatMoney(Math.abs(mi))}
              </span>
              <span className="text-slate-400">投資報酬率（年）</span>
              <span className={'text-right font-bold ' + (roi >= 0 ? 'text-green-600' : 'text-red-500')}>{roi}%</span>
              {card.priceLow && card.priceHigh && (<>
                <span className="text-slate-400">售價範圍</span>
                <span className="text-right font-semibold text-slate-700">{formatMoney(card.priceLow)}~{formatMoney(card.priceHigh)}</span>
              </>)}
            </div>
          )}

          {!decided ? (
            <p className="mt-4 text-zizi-ink font-bold text-lg pulse-dots">
              🤔 {team.teamName} 思考中{isAcquire ? '：賣還是不賣？' : '：該不該買？'}
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              {accept && loanAmount > 0
                ? `向銀行借 ${formatMoney(loanAmount)} 補頭期（月息 10%）`
                : accept
                ? isAcquire ? `淨入帳 ${formatMoney(offer?.net || 0)} 💰` : '頭期付清，開始收每月現金流'
                : '把機會留給下一個人'}
            </p>
          )}
        </div>

        {/* 決定戳章：斜蓋在「上半部圖示/標題區」，避開下方的關鍵數字，讓大家看得到金額 */}
        {decided && (
          <div className="absolute inset-x-0 top-24 flex justify-center pointer-events-none">
            <span className={'stamp-in bg-white/85 backdrop-blur-sm text-4xl font-black px-8 py-4 rounded-2xl ring-4 shadow-2xl ' + stampTone}>
              {stampText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// 抽牌（市場風雲 / 額外支出）：左邊角色演出 + 右邊卡片，全螢幕結合
function CardOverlay({ payload, teamFull, onClose }) {
  const { deck, card, teamName, professionEmoji } = payload;
  const META = {
    small: { label: '機會・小生意', color: 'bg-emerald-500', mood: 'excited', badge: '🎲', title: '機會' },
    big: { label: '機會・大買賣', color: 'bg-amber-600', mood: 'excited', badge: '🎲', title: '機會' },
    market: { label: '市場風雲', color: 'bg-amber-500', mood: 'surprised', badge: '📈', title: '市場風雲' },
    doodad: { label: '額外支出', color: 'bg-rose-500', mood: 'sad', badge: '💸', title: '額外支出' },
    bonus: { label: '🍀 好運', color: 'bg-lime-500', mood: 'happy', badge: '🍀', title: '好運' },
    acquire: { label: '房產收購要約', color: 'bg-teal-600', mood: 'excited', badge: '🤝', title: '收購' },
  };
  const m = META[deck] || { label: '事件', color: 'bg-slate-500', mood: 'surprised', badge: '🎲', title: '事件' };
  return (
    <div onClick={onClose} className="fixed inset-0 z-40 flex items-center justify-center gap-8 px-6 bg-zizi-ink/55 backdrop-blur-sm cursor-pointer">
      <span className="absolute bottom-6 inset-x-0 text-center text-white/55 text-sm">👆 點畫面任一處關閉</span>
      <CharacterPanel team={teamFull} professionEmoji={professionEmoji} name={teamName} mood={m.mood} badge={m.badge} title={m.title} sub={deck === 'doodad' ? '又要花錢了…' : deck === 'bonus' ? '天上掉錢啦！' : '行情來囉！'} />
      <div className="card-pop bg-white rounded-3xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-black/5 w-80 max-w-[46vw] overflow-hidden">
        <div className={'py-2 text-center text-white font-bold ' + m.color}>{m.label}</div>
        <div className="p-6 text-center">
          <div className="text-7xl mb-3">{card.emoji}</div>
          <h3 className="text-2xl font-black text-zizi-ink">{card.name}</h3>
          {card.desc && <p className="text-slate-500 mt-2">{card.desc}</p>}
          {card.amount != null && deck === 'doodad' && (
            <p className="mt-3 text-rose-500 font-bold text-xl">-{formatMoney(card.amount)}{card.recurring ? ' / 月' : ''}</p>
          )}
          {card.amount != null && deck === 'bonus' && (
            <p className="mt-3 text-green-600 font-bold text-xl">+{formatMoney(card.amount)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// 飄浮金幣：象徵被動收入源源不絕，取代通用場景中的螢火蟲
const LOBBY_COINS = [
  { top: '55%', left: '8%', delay: '0s', dur: '7.5s' },
  { top: '62%', left: '90%', delay: '2s', dur: '9s' },
  { top: '58%', left: '46%', delay: '3.4s', dur: '8s' },
  { top: '68%', left: '22%', delay: '5s', dur: '8.6s' },
  { top: '52%', left: '70%', delay: '1s', dur: '7s' },
  { top: '66%', left: '80%', delay: '4.2s', dur: '9.4s' },
];

// 天際線剪影：財富自由的城市大樓 + 亮燈窗，呼應「跳出老鼠圈」目標，取代通用場景的草地山丘
const SKYLINE_BACK = [
  { x: 0, w: 30, h: 38 }, { x: 34, w: 22, h: 50 }, { x: 60, w: 26, h: 30 },
  { x: 90, w: 20, h: 46 }, { x: 114, w: 34, h: 34 }, { x: 152, w: 24, h: 55 },
  { x: 180, w: 30, h: 32 }, { x: 214, w: 22, h: 48 }, { x: 240, w: 28, h: 36 },
  { x: 272, w: 24, h: 52 }, { x: 300, w: 30, h: 30 }, { x: 334, w: 22, h: 44 }, { x: 360, w: 40, h: 34 },
];
const SKYLINE_FRONT = [
  { x: 10, w: 36, h: 42 }, { x: 50, w: 24, h: 30 }, { x: 78, w: 30, h: 50 },
  { x: 112, w: 22, h: 34 }, { x: 138, w: 34, h: 46 }, { x: 176, w: 26, h: 32 },
  { x: 206, w: 30, h: 52 }, { x: 240, w: 22, h: 38 }, { x: 266, w: 36, h: 46 },
  { x: 306, w: 24, h: 34 }, { x: 334, w: 30, h: 44 }, { x: 368, w: 28, h: 30 },
];

function LobbyHills() {
  return (
    <svg className="lobby-hills" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">
      <g fill="#4a3322" opacity="0.85">
        {SKYLINE_BACK.map((b, i) => <rect key={i} x={b.x} y={100 - b.h} width={b.w} height={b.h} />)}
      </g>
      <g fill="#241811">
        {SKYLINE_FRONT.map((b, i) => <rect key={i} x={b.x} y={100 - b.h} width={b.w} height={b.h} />)}
      </g>
      <g fill="#fde68a">
        {SKYLINE_FRONT.map((b, i) => (
          Array.from({ length: Math.max(1, Math.floor(b.h / 13)) }).map((_, j) => (
            <rect
              key={`${i}-${j}`}
              className="lobby-window"
              x={b.x + b.w * 0.32}
              y={100 - b.h + 7 + j * 12}
              width={2.6}
              height={4}
              style={{ animationDelay: `${((i * 0.35 + j * 0.5) % 3.6).toFixed(2)}s` }}
            />
          ))
        ))}
      </g>
    </svg>
  );
}

// 遊戲進行中常駐的「掃碼加入 / 回到遊戲」小卡（放右欄頂端，讓中途退出的人隨時掃回來）
function JoinQR({ studentUrl }) {
  return (
    <div className="glass-dark rounded-2xl p-3 shrink-0 shadow-lg flex items-center gap-3">
      <div className="bg-white rounded-xl p-1.5 shrink-0">
        <QRCodeSVG value={studentUrl} size={82} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-zizi-gold">📱 掃我加入 ‧ 回到遊戲</p>
        <p className="text-xs text-white/65 leading-snug mt-0.5">不小心退出了？用手機重新掃碼就會自動回到原本的組別；若沒有，輸入你的組別代號即可。</p>
        <p className="text-[0.7rem] font-mono text-white/40 truncate mt-0.5">{studentUrl}</p>
      </div>
    </div>
  );
}

function LobbyView({ studentUrl, teams }) {
  return (
    <div className="lobby-stage h-full flex flex-col items-center justify-between gap-4 py-6 px-8">
      <div className="lobby-stars" />
      {LOBBY_COINS.map((c, i) => (
        <span key={i} className="lobby-coin" style={{ top: c.top, left: c.left, animationDelay: c.delay, animationDuration: c.dur }}>🪙</span>
      ))}
      <LobbyHills />

      {/* 故事 / 規則開場 */}
      <div className="relative max-w-4xl text-center">
        <h1 className="lobby-title text-4xl font-black mb-1 tracking-wide">茲茲財富自由挑戰賽</h1>
        <h2 className="text-xl font-bold text-white/90 mb-2">🐭 你正在「老鼠賽跑」</h2>
        <p className="text-base text-white/75 leading-relaxed">
          多數人每天為錢工作：薪水一進帳，馬上被房貸、車貸、帳單吃光，像老鼠在滾輪上拼命跑卻原地打轉。
        </p>
        <p className="text-xl font-bold text-white mt-2">
          🎯 讓你的<span className="text-zizi-gold">被動收入</span>
          <span className="text-zizi-gold">超過總支出</span>，就能<span className="text-zizi-gold">跳出老鼠圈、財富自由！</span>
        </p>
      </div>

      {/* 站在草地上的角色 */}
      <div className="relative flex flex-col items-center">
        <Avatar hair="short" hairColor="brown" accessory="none" mood="neutral" size={92} />
        <div className="lobby-char-shadow" />
      </div>

      <div className="relative flex items-center justify-center gap-10 flex-wrap">
        <div className="flex flex-col items-center gap-2 bg-white/8 backdrop-blur-sm ring-1 ring-white/15 rounded-2xl px-6 py-5">
          <p className="text-base text-white/80">▸ 掃描 QR Code 加入遊戲</p>
          <div className="bg-white p-3 rounded-xl">
            <QRCodeSVG value={studentUrl} size={170} />
          </div>
          <p className="text-xs font-mono text-zizi-gold">{studentUrl}</p>
        </div>
        <div className="min-w-[18rem] bg-white/8 backdrop-blur-sm ring-1 ring-white/15 rounded-2xl px-5 py-4">
          <p className="text-lg mb-3">
            ▸ 已加入 <span className="text-zizi-gold font-bold">{teams.length}</span> 組
          </p>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            {teams.map((t) => (
              <div key={t.id} className="bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
                {t.avatar
                  ? <Avatar {...t.avatar} profession={t.professionId} size={34} mood="happy" walking />
                  : <span className="text-2xl">{t.professionEmoji}</span>}
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

      <span className="lobby-badge-float relative text-sm font-semibold bg-white/10 ring-1 ring-white/20 rounded-full px-4 py-1.5 text-white/85">
        🏆 財商教育 · 現金流挑戰
      </span>
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

// 老鼠賽跑圈盤面：24 格「長方形」環狀（9×5）+ 各組代幣
function Board({ board, teams, round, timeLeft, phase, currentTurnId, movingId }) {
  const csx = 100 / COLS; // 每格寬（%）
  const csy = 100 / ROWS; // 每格高（%）
  const currentTeam = teams.find((t) => t.id === currentTurnId);
  // 把各組依目前格子分組，方便在同格時錯開排列（避免代幣重疊）
  const byCell = {};
  teams.forEach((t) => {
    const p = t.position || 0;
    (byCell[p] = byCell[p] || []).push(t);
  });

  return (
    <div className="relative" style={{ width: 'min(100%, 168vh)', aspectRatio: `${COLS} / ${ROWS}`, maxHeight: '100%' }}>
      {/* 格子：內容靠「外緣」對齊，把每格的內側留成代幣跑道，代幣就不會蓋住圖示/字 */}
      {board.map((sq) => {
        const { r, c } = cellOf(sq.index);
        const meta = SQUARE_META[sq.type] || {};
        const onTop = r === 0, onBottom = r === ROWS - 1;
        const onLeft = c === 0 && !onTop && !onBottom, onRight = c === COLS - 1 && !onTop && !onBottom;
        const align = onTop
          ? 'items-center justify-start pt-1.5'
          : onBottom
          ? 'items-center justify-end pb-1.5'
          : onLeft
          ? 'items-start justify-center pl-1.5'
          : onRight
          ? 'items-end justify-center pr-1.5'
          : 'items-center justify-center';
        return (
          <div
            key={sq.index}
            className="absolute p-1.5"
            style={{ left: `${c * csx}%`, top: `${r * csy}%`, width: `${csx}%`, height: `${csy}%` }}
          >
            <div className={'w-full h-full rounded-xl flex flex-col text-white shadow-md ring-1 backdrop-blur-[2px] ' + align + ' ' + (meta.screenColor || 'bg-slate-500/30 ring-white/15')}>
              <span className="text-4xl leading-none drop-shadow">{meta.emoji}</span>
              <span className="text-sm font-bold mt-1 leading-none">{meta.label}</span>
            </div>
          </div>
        );
      })}

      {/* 中央資訊（佔內圈 7×3 格） */}
      <div
        className="absolute flex flex-col items-center justify-center text-center"
        style={{ left: `${csx}%`, top: `${csy}%`, width: `${(COLS - 2) * csx}%`, height: `${(ROWS - 2) * csy}%` }}
      >
        <p className="text-white/50 text-xl">🐭 老鼠賽跑圈</p>
        <p className="text-zizi-gold font-black text-6xl my-1">第 {round} 回合</p>
        {(phase === 'running' || phase === 'paused') && (
          <p className="text-white/80 text-3xl tabular-nums">⏱ {formatTime(timeLeft)}</p>
        )}
        {phase === 'running' && (
          <p className="mt-2 text-2xl font-bold text-zizi-gold">
            {currentTeam ? `🎲 輪到 ${currentTeam.professionEmoji} ${currentTeam.name}` : '本回合擲完，等待下一回合'}
          </p>
        )}
        <p className="text-white/40 text-base mt-2">目標：被動收入 ＞ 總支出 → 跳出老鼠圈</p>
      </div>

      {/* 代幣：停在每格「內緣跑道」，避開外緣的圖示/字；同格沿軌道切線排開、不重疊 */}
      {teams.map((t) => {
        const p = t.position || 0;
        const { r, c } = cellOf(p);
        const onTop = r === 0, onBottom = r === ROWS - 1;
        const onLeft = c === 0 && !onTop && !onBottom, onRight = c === COLS - 1 && !onTop && !onBottom;
        // 內側方向（把代幣往跑道內緣推，露出格子圖示）
        const inX = onLeft ? 1 : onRight ? -1 : 0;
        const inY = onTop ? 1 : onBottom ? -1 : 0;
        const horizontalTrack = onTop || onBottom; // 沿水平邊 → 同格往左右排；垂直邊 → 往上下排
        const group = byCell[p] || [];
        const k = group.findIndex((x) => x.id === t.id);
        const n = group.length;
        const lane = 0.28; // 往內緣偏移（佔格子比例）
        const t0 = k - (n - 1) / 2; // 同格錯開序
        const tanX = horizontalTrack ? t0 * 3.0 : 0;
        const tanY = horizontalTrack ? 0 : t0 * 4.4;
        const left = (c + 0.5) * csx + inX * csx * lane + tanX;
        const top = (r + 0.5) * csy + inY * csy * lane + tanY;
        const moving = t.id === movingId && !t.bankrupt;
        const isCurrent = t.id === currentTurnId && !t.bankrupt;
        // 動畫優先序：走動跳躍 > 輪到呼吸跳動 > 靜止
        const animClass = moving ? 'token-hop' : isCurrent ? 'token-idle' : '';
        // 名牌朝「內側」展開（指向中央空白區），避免壓到外圈別的格子
        const tagPos = onTop
          ? 'top-full mt-1 left-1/2 -translate-x-1/2'
          : onBottom
          ? 'bottom-full mb-1 left-1/2 -translate-x-1/2'
          : onLeft
          ? 'left-full ml-1 top-1/2 -translate-y-1/2'
          : 'right-full mr-1 top-1/2 -translate-y-1/2';
        return (
          <div
            key={t.id}
            className={'absolute z-10 transition-all duration-700 ease-out ' + animClass + (t.bankrupt ? ' opacity-40 grayscale' : '')}
            style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}
            title={t.name}
          >
            {isCurrent && (
              <span className="absolute inset-0 -m-1 rounded-full ring-4 ring-zizi-gold animate-ping" />
            )}
            {/* 財富自由玩家：頭上戴皇冠，一眼看出與眾不同 */}
            {t.free && !t.bankrupt && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-lg leading-none z-20 drop-shadow">👑</span>
            )}
            {/* 名牌：只在「輪到的玩家」顯示，減少遮擋；其餘靠代幣圖示與右側總覽辨識 */}
            {isCurrent && (
              <span className={'absolute whitespace-nowrap text-[0.7rem] font-bold px-1.5 py-0.5 rounded-full bg-black/65 text-zizi-gold leading-none shadow ' + tagPos}>
                {t.name}
              </span>
            )}
            <div className={'relative rounded-full w-11 h-11 flex items-center justify-center text-2xl shadow-xl ring-2 ' + (t.bankrupt ? 'bg-slate-600 ring-slate-400' : t.free ? 'bg-green-400 ring-white' : isCurrent ? 'bg-zizi-gold ring-white' : 'bg-white ring-zizi-gold')}>
              {t.avatar ? (
                <Avatar {...t.avatar} profession={t.professionId} size={34} mood={t.bankrupt ? 'faint' : moving ? 'excited' : isCurrent ? 'happy' : 'neutral'} />
              ) : (
                t.bankrupt ? '💀' : t.professionEmoji
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 大螢幕「組別總覽」：每組重點摘要（現金/月現金流/被動），方便老師逐組講解
// 持有資產明細不放這裡（太長），改由老師「投影」細項一目了然
function TeamsOverview({ ranked, ended, currentTurnId }) {
  const medal = ['🥇', '🥈', '🥉'];
  return (
    <div className="glass-dark rounded-2xl p-3 flex-1 min-h-0 overflow-auto shadow-lg">
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h2 className="text-xl font-bold">🏆 組別總覽</h2>
        <span className="text-xs text-white/45">現金 ‧ 持有資產 ‧ 月現金流</span>
      </div>
      <div className="space-y-2">
        {ranked.map((t, i) => {
          const cf = t.cashflow ?? 0;
          const isCurrent = t.id === currentTurnId && !t.bankrupt;
          return (
            <div
              key={t.id}
              className={
                'rounded-xl px-3 py-2 ' +
                (t.bankrupt
                  ? 'bg-red-900/30 ring-1 ring-red-500/40 opacity-75'
                  : t.free
                  ? 'bg-green-500/15 ring-1 ring-green-400/60'
                  : isCurrent
                  ? 'bg-zizi-gold/15 ring-1 ring-zizi-gold/70'
                  : 'bg-white/8 ring-1 ring-white/10')
              }
            >
              {/* 第一行：名次 / 職業 / 組名 / 淨資產 */}
              <div className="flex items-center gap-2">
                <span className="w-6 text-center font-bold">{t.bankrupt ? '💀' : medal[i] || i + 1}</span>
                {t.avatar
                  ? <Avatar {...t.avatar} profession={t.professionId} size={32} mood={t.bankrupt ? 'faint' : t.free ? 'happy' : 'neutral'} />
                  : <span className={'text-2xl ' + (t.bankrupt ? 'grayscale' : '')}>{t.professionEmoji}</span>}
                <div className="flex-1 min-w-0">
                  <p className={'font-bold truncate leading-tight ' + (t.bankrupt ? 'line-through text-white/55' : '')}>
                    {t.name}
                    {t.free && <span className="ml-1 text-[0.65rem] align-middle bg-green-400/25 text-green-200 rounded px-1 py-0.5">👑已自由</span>}
                    {t.free && t.achievementStars > 0 && <span className="ml-1 text-[0.72rem] align-middle bg-amber-400/25 text-amber-200 rounded px-1.5 py-0.5 font-bold">⭐{t.achievementStars}</span>}
                    {isCurrent && <span className="ml-1 text-[0.65rem] align-middle bg-zizi-gold/30 text-zizi-gold rounded px-1 py-0.5">輪到中</span>}
                  </p>
                  <p className="text-[0.7rem] text-white/50 leading-tight truncate">{t.professionName} ‧ 薪 {formatMoney(t.salary)}</p>
                </div>
                <div className="text-right leading-tight shrink-0">
                  <p className="text-[0.6rem] text-white/45">淨資產</p>
                  <span key={t.netWorth} className="num-pop block text-base font-black text-zizi-gold tabular-nums">{formatMoney(t.netWorth)}</span>
                </div>
              </div>

              {t.bankrupt ? (
                <p className="mt-1 text-sm font-bold text-red-300 text-center">已破產淘汰</p>
              ) : (
                <>
                  {/* 只放重點摘要：現金 / 月現金流 / 被動收入（持有資產明細在老師「投影」細項看） */}
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center">
                    <div className="rounded-lg bg-black/20 py-1">
                      <p className="text-[0.6rem] text-white/45">現金</p>
                      <p className={'text-sm font-bold tabular-nums ' + (t.cash < 0 ? 'text-rose-300' : 'text-cyan-300')}>{formatMoney(t.cash)}</p>
                    </div>
                    <div className="rounded-lg bg-black/20 py-1">
                      <p className="text-[0.6rem] text-white/45">月現金流</p>
                      <p className={'text-sm font-bold tabular-nums ' + (cf >= 0 ? 'text-green-300' : 'text-red-300')}>
                        {cf >= 0 ? '+' : '−'}{formatMoney(Math.abs(cf))}
                      </p>
                    </div>
                    <div className="rounded-lg bg-black/20 py-1">
                      <p className="text-[0.6rem] text-white/45">被動收入</p>
                      <p className="text-sm font-bold tabular-nums text-zizi-gold">{formatMoney(t.passiveIncome)}</p>
                    </div>
                  </div>

                  {/* 尚未自由：財富自由進度（被動收入 ÷ 總支出，越接近 100% 越快跳出老鼠圈） */}
                  {!t.free && (() => {
                    const pct = t.expense > 0 ? Math.round((t.passiveIncome / t.expense) * 100) : 0;
                    return (
                      <div className="mt-1.5">
                        <div className="flex items-center justify-between text-[0.62rem] mb-0.5 leading-tight">
                          <span className="text-white/50 truncate">🎯 財富自由進度 <span className="text-white/35">被動{formatMoney(t.passiveIncome)}/支出{formatMoney(t.expense)}</span></span>
                          <span className="font-bold text-zizi-gold tabular-nums shrink-0 ml-1">{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-black/30 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-400 to-zizi-gold transition-all duration-500" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* 財富自由後：目前追求的人生夢想 + 進度（還差多少現金） */}
                  {t.free && t.currentGoal && (
                    <div className="mt-1.5 rounded-lg bg-emerald-500/12 ring-1 ring-emerald-400/30 px-2 py-1.5 flex items-center gap-2">
                      <span className="text-xl shrink-0">{t.currentGoal.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.72rem] text-white/75 truncate leading-tight">🎯 {t.currentGoal.name}</p>
                        <div className="mt-1 h-1.5 rounded-full bg-black/30 overflow-hidden">
                          <div className="h-full bg-zizi-gold transition-all duration-500" style={{ width: `${Math.min(100, Math.round((t.cash / t.currentGoal.cost) * 100))}%` }} />
                        </div>
                      </div>
                      <span className="text-[0.72rem] font-bold text-zizi-gold shrink-0 tabular-nums">
                        {t.cash >= t.currentGoal.cost ? '可達成！' : `差 ${formatMoney(t.currentGoal.cost - t.cash)}`}
                      </span>
                    </div>
                  )}
                  {t.free && !t.currentGoal && (
                    <p className="mt-1.5 text-[0.72rem] text-center text-white/45">👑 財富自由中，尚未選定下一個夢想</p>
                  )}
                </>
              )}
            </div>
          );
        })}
        {ranked.length === 0 && <p className="text-white/40">尚無組別</p>}
      </div>
      {ended && ranked[0] && (
        <div className="mt-3 text-center bg-zizi-gold/20 rounded-2xl py-3">
          <p className="text-sm text-white/70">本場冠軍</p>
          <p className="text-2xl font-black text-zizi-gold">{ranked[0].professionEmoji} {ranked[0].name}</p>
        </div>
      )}
    </div>
  );
}

function FeedPanel({ feed }) {
  return (
    <div className="glass-dark rounded-2xl px-4 py-2.5 h-28 shrink-0 flex flex-col shadow-lg">
      <h2 className="text-sm font-bold mb-1.5 shrink-0">📢 最新動態</h2>
      <div className="flex-1 overflow-auto flex flex-wrap gap-1.5 content-start">
        {feed.map((f, i) => (
          <div key={f.ts ?? i} className={'rounded-lg px-2.5 py-1 text-xs ' + (i === 0 ? 'feed-in bg-zizi-gold/20' : 'bg-white/10 text-white/80')}>
            {f.text}
          </div>
        ))}
        {feed.length === 0 && <p className="text-white/40 text-sm">尚無動態</p>}
      </div>
    </div>
  );
}
