import { useEffect, useState } from 'react';
import { socket } from '../socket.js';

// 共用 Hook：訂閱所有組別的公開摘要（大螢幕排行榜 / 老師端 / 等待室用）
export function useTeams() {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    function onList(list) {
      setTeams(Array.isArray(list) ? list : []);
    }
    socket.on('teams:list', onList);
    return () => socket.off('teams:list', onList);
  }, []);

  return teams;
}
