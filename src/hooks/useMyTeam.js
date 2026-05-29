import { useEffect, useState, useCallback } from 'react';
import { socket } from '../socket.js';

const STORE_KEY = 'zizi_teamId';

// 學生端的「我這組」狀態：加入、重連還原、接收財務更新
export function useMyTeam() {
  const [team, setTeam] = useState(null);
  // 若 localStorage 有 teamId，初始顯示「還原中」避免閃登入畫面
  const [resuming, setResuming] = useState(
    Boolean(localStorage.getItem(STORE_KEY))
  );

  useEffect(() => {
    function onTeam(t) {
      setTeam(t);
    }
    socket.on('student:team', onTeam);

    // 嘗試用 localStorage 的 teamId 還原（首次載入與每次重連都會跑）
    function tryResume() {
      const teamId = localStorage.getItem(STORE_KEY);
      if (!teamId) {
        setResuming(false);
        return;
      }
      socket.emit('student:resume', { teamId }, (res) => {
        if (res?.ok) {
          setTeam(res.team);
        } else {
          // 該組已不存在（例如伺服器重啟），清掉舊代號
          localStorage.removeItem(STORE_KEY);
        }
        setResuming(false);
      });
    }

    if (socket.connected) tryResume();
    socket.on('connect', tryResume);

    return () => {
      socket.off('student:team', onTeam);
      socket.off('connect', tryResume);
    };
  }, []);

  // 開局抽兩張職業卡（二選一）
  const offerProfessions = useCallback(() => {
    return new Promise((resolve) => {
      socket.emit('student:offerProfessions', {}, (res) => resolve(res?.options || []));
    });
  }, []);

  // 加入遊戲（建立組別，使用選定的職業）
  const join = useCallback((name, professionId) => {
    return new Promise((resolve) => {
      socket.emit('student:join', { name, professionId }, (res) => {
        if (res?.ok) {
          localStorage.setItem(STORE_KEY, res.team.id);
          setTeam(res.team);
        }
        resolve(res);
      });
    });
  }, []);

  // 用組別代號手動重新登入（換手機 / 清掉快取後）
  const resume = useCallback((teamId) => {
    return new Promise((resolve) => {
      socket.emit('student:resume', { teamId: (teamId || '').trim() }, (res) => {
        if (res?.ok) {
          localStorage.setItem(STORE_KEY, res.team.id);
          setTeam(res.team);
        }
        resolve(res);
      });
    });
  }, []);

  return { team, resuming, join, resume, offerProfessions };
}
