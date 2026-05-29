import { useEffect, useState } from 'react';
import { socket } from '../socket.js';

// 共用 Hook：訂閱伺服器廣播的遊戲狀態（回合、階段、計時等）
export function useGameState() {
  const [game, setGame] = useState(null);

  useEffect(() => {
    function onState(s) {
      setGame(s);
    }
    socket.on('game:state', onState);
    return () => socket.off('game:state', onState);
  }, []);

  return game;
}
