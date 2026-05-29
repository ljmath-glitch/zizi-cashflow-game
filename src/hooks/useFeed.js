import { useEffect, useState } from 'react';
import { socket } from '../socket.js';

// 共用 Hook：訂閱「最新動態」清單（大螢幕用）
export function useFeed() {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    function onFeed(list) {
      setFeed(Array.isArray(list) ? list : []);
    }
    socket.on('feed:list', onFeed);
    return () => socket.off('feed:list', onFeed);
  }, []);

  return feed;
}
