import { useState } from 'react';
import { socket } from '../socket.js';
import { useConnection } from '../hooks/useConnection.js';
import { useGameState } from '../hooks/useGameState.js';
import { useTeams } from '../hooks/useTeams.js';
import { formatTime, PHASE_LABEL } from '../util/format.js';
import ConnectionBadge from '../components/ConnectionBadge.jsx';

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
  const [minutes, setMinutes] = useState(4);
  const [totalRounds, setTotalRounds] = useState(12);

  function applyConfig() {
    socket.emit('teacher:setConfig', {
      maxRounds: Number(totalRounds),
      roundSeconds: Math.round(Number(minutes) * 60),
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
    <div className="min-h-full bg-slate-100 flex flex-col">
      <header className="bg-zizi-blue text-white px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold">老師控制台</h1>
        <ConnectionBadge connected={connected} />
      </header>

      <main className="flex-1 p-5 space-y-5 max-w-md w-full mx-auto">
        {/* 狀態卡 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{PHASE_LABEL[phase]}</p>
            <p className="text-lg font-semibold text-zizi-blue">
              {phase === 'lobby' ? '尚未開始' : `第 ${round} / ${maxRounds} 回合`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">本回合剩餘</p>
            <p
              className={
                'text-2xl font-bold tabular-nums ' +
                (phase === 'running' && timeLeft <= 30
                  ? 'text-red-500'
                  : 'text-zizi-blue')
              }
            >
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>

        {/* 目前輪到誰擲骰（依序輪流） */}
        {phase === 'running' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">目前輪到擲骰</p>
              {(() => {
                const cur = teams.find((t) => t.id === game?.currentTurnId);
                return (
                  <p className="text-lg font-semibold text-zizi-blue">
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

        {/* 已加入組別 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-2">
            已加入 <span className="font-bold text-zizi-blue">{teams.length}</span> 組
          </p>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <span
                key={t.id}
                className="text-sm bg-slate-100 rounded-full px-3 py-1"
              >
                {t.professionEmoji} {t.name}
              </span>
            ))}
            {teams.length === 0 && (
              <span className="text-sm text-slate-400">尚無組別加入</span>
            )}
          </div>
        </div>

        {/* 新手教學開關（大螢幕顯示說明書） */}
        <button
          onClick={() => socket.emit('teacher:tutorial', { show: !game?.showTutorial })}
          className={
            'w-full rounded-2xl py-2.5 font-medium shadow-sm ' +
            (game?.showTutorial ? 'bg-zizi-gold text-white' : 'bg-white text-zizi-blue')
          }
        >
          📖 {game?.showTutorial ? '關閉教學說明（大螢幕）' : '在大螢幕顯示新手教學'}
        </button>

        {/* lobby 階段：參數設定 */}
        {phase === 'lobby' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-sm font-medium text-slate-600">遊戲設定</p>
            <div className="flex gap-3">
              <label className="flex-1">
                <span className="text-xs text-slate-500">每回合分鐘</span>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-zizi-blue focus:outline-none"
                />
              </label>
              <label className="flex-1">
                <span className="text-xs text-slate-500">總回合數</span>
                <input
                  type="number"
                  min="1"
                  value={totalRounds}
                  onChange={(e) => setTotalRounds(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-zizi-blue focus:outline-none"
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
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
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

      {msg && <p className="text-center text-sm text-zizi-blue">{msg}</p>}

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
                className="text-sm text-zizi-blue font-medium px-2"
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
        'rounded-2xl p-4 shadow-sm flex flex-col items-center gap-1 font-semibold transition ' +
        (primary
          ? 'bg-zizi-gold text-white hover:brightness-105 '
          : 'bg-white text-zizi-blue hover:bg-slate-50 ') +
        (full ? 'col-span-2' : '')
      }
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}
