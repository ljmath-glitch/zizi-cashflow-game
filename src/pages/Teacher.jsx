import { useState } from 'react';
import { socket, ROOM } from '../socket.js';
import { useConnection } from '../hooks/useConnection.js';
import { useGameState } from '../hooks/useGameState.js';
import { useTeams } from '../hooks/useTeams.js';
import { formatTime, PHASE_LABEL } from '../util/format.js';
import { page } from '../base.js';
import ConnectionBadge from '../components/ConnectionBadge.jsx';

// 測試工具開關：正式上課請保持 false（隱藏「🧪 測試自由」按鈕）；
// 之後想在本機測試人生成就流程時，改成 true 重新打包即可。
const TEST_TOOLS = false;

// 難度選項（需與 server/game.js 的 DIFFICULTY 一致）
// 三階分級（取代舊難度；需與 server/game.js 的 STAGES 一致）
const STAGES = [
  { key: 'basic', emoji: '🟢', label: '初階', desc: '第一次玩：只教「買資產養被動收入→財富自由」。極簡報表、只有定存+ETF、無市場波動/貸款/失業/成就（最寬鬆）' },
  { key: 'mid', emoji: '🟡', label: '中階', desc: '加入市場漲跌、貸款、失業、慈善、房產收購、人生成就；市場含股票/黃金（無加密）' },
  { key: 'full', emoji: '🔴', label: '高階', desc: '全部機制：加密貨幣、超級生意、黑天鵝…最完整也最有挑戰' },
];

// 老師端（手機/筆電）— 模組 2：開始/暫停/下一回合/重置 + 調整回合參數
export default function Teacher() {
  const { connected } = useConnection();
  const game = useGameState();
  const teams = useTeams();

  const phase = game?.phase ?? 'lobby';
  const round = game?.round ?? 0;
  const maxRounds = game?.maxRounds ?? 12;
  const timeLeft = game?.timeLeft ?? 0;

  // lobby 階段可調整的參數（以分鐘輸入，較直覺）
  const [minutes, setMinutes] = useState(60); // 遊戲總時長（分鐘）
  const [totalRounds, setTotalRounds] = useState(30);

  function applyConfig() {
    socket.emit('teacher:setConfig', {
      maxRounds: Number(totalRounds),
      gameSeconds: Math.round(Number(minutes) * 60),
    });
  }

  function confirmReset() {
    if (window.confirm('確定要重置遊戲嗎？回合歸零、各組財務還原到起始，但保留隊名與職業。')) {
      socket.emit('teacher:reset');
    }
  }

  function confirmClear() {
    if (window.confirm('確定要開始全新遊戲嗎？所有已加入的組別都會被清除（無法復原）。')) {
      socket.emit('teacher:clear');
    }
  }

  return (
    <div className="min-h-full app-bg flex flex-col">
      <header className="relative bg-gradient-to-r from-zizi-dusk via-zizi-plum to-zizi-dusk text-white px-4 py-3 flex items-center justify-between shadow-lg overflow-hidden">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zizi-amber to-transparent" />
        <h1 className="font-bold flex items-center gap-1.5 drop-shadow-md">
          <span className="drop-shadow">🎛️</span>老師控制台
        </h1>
        <div className="flex items-center gap-2">
          <a
            href={page(`screen?room=${ROOM}`)}
            target="_blank"
            rel="noopener"
            className="text-xs font-semibold bg-white/15 hover:bg-white/25 ring-1 ring-white/25 rounded-full px-3 py-1.5"
          >
            📺 開大螢幕
          </a>
          <ConnectionBadge connected={connected} />
        </div>
      </header>

      <main className="flex-1 p-5 space-y-5 max-w-md w-full mx-auto">
        {/* 狀態卡 */}
        <div className="glass ring-1 ring-white/50 rounded-2xl p-4 shadow-soft flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">
              {PHASE_LABEL[phase]}
              {(() => {
                const s = STAGES.find((x) => x.key === (game?.stage || 'basic'));
                return s ? <span className="ml-2 text-xs bg-slate-100 rounded-full px-2 py-0.5">{s.emoji} {s.label}</span> : null;
              })()}
            </p>
            <p className="text-lg font-semibold text-zizi-ink">
              {phase === 'lobby' ? '尚未開始' : `第 ${round} 回合`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">本回合剩餘</p>
            <p
              className={
                'text-2xl font-bold tabular-nums ' +
                (phase === 'running' && timeLeft <= 30
                  ? 'text-red-500'
                  : 'text-zizi-ink')
              }
            >
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>

        {/* 目前輪到誰擲骰（依序輪流） */}
        {phase === 'running' && (
          <div className="glass ring-1 ring-white/50 rounded-2xl p-4 shadow-soft flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">目前輪到擲骰</p>
              {(() => {
                const cur = teams.find((t) => t.id === game?.currentTurnId);
                return (
                  <p className="text-lg font-semibold text-zizi-ink">
                    {cur ? `${cur.professionEmoji} ${cur.name}` : '本回合都擲完了'}
                    {game?.turnTotal ? (
                      <span className="text-sm text-slate-400 ml-2">({Math.min(game.turnIndex + 1, game.turnTotal)}/{game.turnTotal})</span>
                    ) : null}
                  </p>
                );
              })()}
            </div>
            {teams.find((t) => t.id === game?.currentTurnId) && (
              <button
                onClick={() => socket.emit('teacher:skipTurn')}
                className="rounded-xl border border-slate-300 text-slate-600 text-sm font-medium px-3 py-2 hover:bg-slate-50"
              >
                ⏭️ 跳過此組
              </button>
            )}
          </div>
        )}

        {/* 已加入組別（點「投影」把該組財務投到大螢幕教學） */}
        <div className="glass ring-1 ring-white/50 rounded-2xl p-4 shadow-soft">
          <p className="text-sm text-slate-500 mb-2">
            已加入 <span className="font-bold text-zizi-ink">{teams.length}</span> 組
            <span className="text-xs text-slate-400 ml-1">（點「投影」可在大螢幕分析該組）</span>
          </p>
          <div className="space-y-1.5">
            {teams.map((t) => {
              const on = game?.spotlight?.id === t.id;
              const curTab = game?.spotlightTab || 'finance';
              const curScroll = game?.spotlightScroll || 0;
              return (
                <div key={t.id} className={on ? 'bg-zizi-gold/10 ring-1 ring-zizi-gold/40 rounded-xl p-1.5' : ''}>
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-1.5">
                    <span className="text-sm">{t.professionEmoji} {t.name}{t.bankrupt ? ' 💀' : ''}{t.free ? ' 👑' : ''}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {TEST_TOOLS && !t.free && !t.bankrupt && (
                        <button
                          onClick={() => {
                            socket.timeout(3000).emit('teacher:grantFreedom', { teamId: t.id }, (err, res) => {
                              if (err) alert('❌ 沒收到伺服器回應（可能未連線或房間不符），請重新整理頁面');
                              else if (!res?.ok) alert('❌ 測試自由失敗：' + (res?.reason || '未知原因'));
                            });
                          }}
                          className="text-xs font-medium rounded-lg px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300"
                          title="測試用：讓這組直接財富自由＋給 300 萬現金"
                        >
                          🧪 測試自由
                        </button>
                      )}
                      <button
                        onClick={() => socket.emit('teacher:spotlight', { teamId: t.id })}
                        className={'text-xs font-medium rounded-lg px-3 py-1 ' + (on ? 'bg-zizi-gold text-white' : 'bg-white text-zizi-ink border border-zizi-gold/40')}
                      >
                        {on ? '投影中 ✕' : '📽️ 投影'}
                      </button>
                    </div>
                  </div>
                  {/* 投影中：控制大螢幕手機鏡像的分頁與捲動 */}
                  {on && (
                    <div className="px-1 pt-1.5">
                      <div className="flex gap-1 mb-1">
                        {[['finance', '💰損益'], ['market', '🛒市場'], ['assets', '📊資產'], ['history', '📜歷史']].map(([k, lb]) => (
                          <button
                            key={k}
                            onClick={() => socket.emit('teacher:spotlightNav', { tab: k })}
                            className={'flex-1 text-xs font-bold rounded-lg py-1 ' + (curTab === k ? 'bg-zizi-gold text-white' : 'bg-white text-zizi-ink border border-zizi-gold/40')}
                          >{lb}</button>
                        ))}
                      </div>
                      <div className="flex gap-1 items-center">
                        <button onClick={() => socket.emit('teacher:spotlightNav', { scroll: Math.max(0, curScroll - 1) })} className="flex-1 text-sm font-bold rounded-lg py-1 bg-white text-zizi-ink border border-zizi-gold/40">▲ 上捲</button>
                        <span className="text-xs text-slate-400 w-8 text-center tabular-nums">{curScroll}</span>
                        <button onClick={() => socket.emit('teacher:spotlightNav', { scroll: curScroll + 1 })} className="flex-1 text-sm font-bold rounded-lg py-1 bg-white text-zizi-ink border border-zizi-gold/40">▼ 下捲</button>
                      </div>
                      <p className="text-[0.65rem] text-slate-400 mt-1 text-center">切分頁／上下捲，畫面會同步到大螢幕（只看、不會動到學生操作）</p>
                    </div>
                  )}
                </div>
              );
            })}
            {teams.length === 0 && (
              <span className="text-sm text-slate-400">尚無組別加入</span>
            )}
          </div>
        </div>

        {/* 新手教學開關（大螢幕顯示說明書） */}
        <button
          onClick={() => socket.emit('teacher:tutorial', { show: !game?.showTutorial })}
          className={
            'w-full rounded-2xl py-2.5 font-medium shadow-soft ' +
            (game?.showTutorial
              ? 'bg-gradient-to-r from-zizi-gold to-amber-500 text-white shadow-glow'
              : 'glass ring-1 ring-white/50 text-zizi-ink')
          }
        >
          📖 {game?.showTutorial ? '關閉教學說明（大螢幕）' : '在大螢幕顯示新手教學'}
        </button>

        {/* lobby 階段：參數設定 */}
        {phase === 'lobby' && (
          <div className="glass ring-1 ring-white/50 rounded-2xl p-4 shadow-soft space-y-3">
            <p className="text-sm font-medium text-slate-600">遊戲設定</p>

            {/* 分級：初階/中階/高階（只能在開始前選；含難易與機制多寡） */}
            <div>
              <span className="text-xs text-slate-500">分級（初階→高階，難度與內容一起加深）</span>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {STAGES.map((s) => {
                  const on = (game?.stage || 'basic') === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => socket.emit('teacher:setConfig', { stage: s.key })}
                      className={
                        'rounded-xl py-2 text-sm font-semibold ring-1 transition ' +
                        (on
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white ring-emerald-400 shadow-glow'
                          : 'bg-white/70 text-slate-600 ring-slate-200 hover:ring-emerald-400/50')
                      }
                    >
                      {s.emoji} {s.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                {STAGES.find((s) => s.key === (game?.stage || 'basic'))?.desc}
              </p>
            </div>

            <div className="flex gap-3">
              <label className="flex-1">
                <span className="text-xs text-slate-500">遊戲時長（分鐘）</span>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white/70 px-3 py-2 focus:border-zizi-gold focus:ring-2 focus:ring-zizi-gold/30 focus:outline-none transition"
                />
              </label>
              <label className="flex-1">
                <span className="text-xs text-slate-500">回合上限</span>
                <input
                  type="number"
                  min="1"
                  value={totalRounds}
                  onChange={(e) => setTotalRounds(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white/70 px-3 py-2 focus:border-zizi-gold focus:ring-2 focus:ring-zizi-gold/30 focus:outline-none transition"
                />
              </label>
            </div>
            <button
              onClick={applyConfig}
              className="w-full rounded-xl bg-slate-200 text-slate-700 font-medium py-2 hover:bg-slate-300"
            >
              套用設定
            </button>
          </div>
        )}

        {/* 控制按鈕 */}
        <div className="grid grid-cols-2 gap-3">
          {phase === 'lobby' && (
            <ControlButton
              emoji="▶️"
              label="開始遊戲"
              primary
              full
              onClick={() => socket.emit('teacher:start')}
            />
          )}

          {phase === 'running' && (
            <>
              <ControlButton
                emoji="⏸️"
                label="暫停"
                onClick={() => socket.emit('teacher:pause')}
              />
              <ControlButton
                emoji="⏭️"
                label="下一回合"
                primary
                onClick={() => socket.emit('teacher:nextRound')}
              />
            </>
          )}

          {phase === 'paused' && (
            <>
              <ControlButton
                emoji="▶️"
                label="繼續"
                primary
                onClick={() => socket.emit('teacher:start')}
              />
              <ControlButton
                emoji="⏭️"
                label="下一回合"
                onClick={() => socket.emit('teacher:nextRound')}
              />
            </>
          )}

          {phase === 'ended' && (
            <ControlButton
              emoji="🔄"
              label="重新開始"
              primary
              full
              onClick={() => socket.emit('teacher:start')}
            />
          )}
        </div>

        {/* 結束遊戲：提早進入結算（時間到會自動結束，這是老師手動提早結束） */}
        {(phase === 'running' || phase === 'paused') && (
          <button
            onClick={() => { if (window.confirm('確定要結束遊戲、進入結算嗎？')) socket.emit('teacher:end'); }}
            className="w-full rounded-2xl py-2 font-medium text-rose-600 bg-rose-50 ring-1 ring-rose-200 hover:bg-rose-100"
          >
            🏁 結束遊戲（進入結算）
          </button>
        )}

        {/* 重置：回合歸零、各組財務還原（保留隊名與職業） */}
        {phase !== 'lobby' && (
          <button
            onClick={confirmReset}
            className="w-full rounded-xl border border-amber-300 text-amber-600 font-medium py-2.5 hover:bg-amber-50"
          >
            🔄 重置遊戲（保留組別，回合歸零）
          </button>
        )}

        {/* 全新遊戲：清空所有組別，回到最初空白狀態 */}
        <button
          onClick={confirmClear}
          className="w-full rounded-xl border border-red-300 text-red-600 font-medium py-2.5 hover:bg-red-50"
        >
          🆕 全新遊戲（清空所有組別）
        </button>

        <SaveLoadPanel />

        {!connected && (
          <p className="text-center text-xs text-slate-400">連線中…</p>
        )}
      </main>
    </div>
  );
}

// 存檔 / 載入
function SaveLoadPanel() {
  const [msg, setMsg] = useState(null);
  const [saves, setSaves] = useState(null); // null＝未展開

  function manualSave() {
    socket.emit('teacher:save', {}, (res) => {
      setMsg(res?.ok ? `已存檔：${res.filename}` : `存檔失敗：${res?.reason || ''}`);
      setTimeout(() => setMsg(null), 3000);
      if (saves) refreshList();
    });
  }

  function refreshList() {
    socket.emit('teacher:listSaves', {}, (res) => {
      setSaves(res?.saves || []);
    });
  }

  function load(name) {
    if (!window.confirm(`載入「${name}」？目前進度會被覆蓋。`)) return;
    socket.emit('teacher:load', { name }, (res) => {
      setMsg(res?.ok ? `已載入：${name}` : `載入失敗：${res?.reason || ''}`);
      setTimeout(() => setMsg(null), 3000);
    });
  }

  return (
    <div className="glass ring-1 ring-white/50 rounded-2xl p-4 shadow-soft space-y-3">
      <div className="flex gap-3">
        <button
          onClick={manualSave}
          className="flex-1 rounded-xl bg-slate-200 text-slate-700 font-medium py-2 hover:bg-slate-300"
        >
          💾 手動存檔
        </button>
        <button
          onClick={() => (saves === null ? refreshList() : setSaves(null))}
          className="flex-1 rounded-xl bg-slate-200 text-slate-700 font-medium py-2 hover:bg-slate-300"
        >
          📂 {saves === null ? '載入存檔' : '收起'}
        </button>
      </div>

      {msg && <p className="text-center text-sm text-zizi-ink">{msg}</p>}

      {saves !== null && (
        <div className="space-y-2 max-h-60 overflow-auto">
          {saves.length === 0 && (
            <p className="text-center text-sm text-slate-400">尚無存檔</p>
          )}
          {saves.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2"
            >
              <span className="text-sm text-slate-600 truncate">{s.name}</span>
              <button
                onClick={() => load(s.name)}
                className="text-sm text-zizi-ink font-medium px-2"
              >
                載入
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 控制按鈕（primary＝金色強調；full＝佔滿整列）
function ControlButton({ emoji, label, onClick, primary, full }) {
  return (
    <button
      onClick={onClick}
      className={
        'rounded-2xl p-4 flex flex-col items-center gap-1 font-semibold transition ' +
        (primary
          ? 'bg-gradient-to-r from-zizi-gold to-amber-500 text-white shadow-glow hover:brightness-105 '
          : 'glass ring-1 ring-white/50 text-zizi-ink shadow-soft hover:bg-white/90 ') +
        (full ? 'col-span-2' : '')
      }
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}
