import os from 'node:os';

// 偵測本機區網 IPv4 位址（給學生手機掃描連線用）
// 會略過 127.x（內部）與非 IPv4 的介面
export function getLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        candidates.push(net.address);
      }
    }
  }

  // 優先選常見家用/教室網段（192.168.x、10.x、172.x），降低選到虛擬網卡的機率
  const preferred = candidates.find(
    (ip) =>
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.')
  );

  return preferred || candidates[0] || 'localhost';
}
