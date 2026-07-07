// 部署基底路徑工具
// 獨立部署時 BASE = '/'；掛在課務系統下時（VITE_BASE=/cashflow/ 打包）BASE = '/cashflow/'
// 所有 fetch 路徑與頁面連結都要經過這裡，兩種部署才都能動
export const BASE = import.meta.env.BASE_URL || '/';

// api('api/rooms') → '/api/rooms' 或 '/cashflow/api/rooms'
export function api(p) {
  return BASE + String(p).replace(/^\//, '');
}

// page('student?room=X') → '/student?room=X' 或 '/cashflow/student?room=X'
export function page(p) {
  return BASE + String(p).replace(/^\//, '');
}

// React Router 的 basename（不含結尾斜線；根路徑時為 ''）
export const ROUTER_BASENAME = BASE.replace(/\/$/, '');
