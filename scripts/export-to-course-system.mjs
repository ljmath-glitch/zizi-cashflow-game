// 匯出腳本：把現金流遊戲打包並複製進課務系統 repo 的 cashflow/ 資料夾
// 用法：node scripts/export-to-course-system.mjs [課務系統路徑]
//   1. 以 VITE_BASE=/cashflow/ 打包前端
//   2. 複製 server/（掛載模組）與 dist/ 到 ../tzutzu-course-system/cashflow/
//   3. 產生 cashflow/package.json（type:module，讓子資料夾內 .js 以 ESM 解析）
// 之後遊戲有更新 → 重跑這支 → 到課務系統 repo commit push 即可
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = path.resolve(__dirname, '..');
const TARGET_ROOT = path.resolve(process.argv[2] || path.join(GAME_ROOT, '..', 'tzutzu-course-system'));
const DEST = path.join(TARGET_ROOT, 'cashflow');

if (!fs.existsSync(path.join(TARGET_ROOT, 'server.js'))) {
  console.error('❌ 找不到課務系統（server.js 不存在）：' + TARGET_ROOT);
  process.exit(1);
}

console.log('📦 1/3 打包前端（VITE_BASE=/cashflow/）…');
execSync('npx vite build', {
  cwd: GAME_ROOT,
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE: '/cashflow/' },
});

console.log('📂 2/3 複製到 ' + DEST + ' …');
fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });
fs.cpSync(path.join(GAME_ROOT, 'server'), path.join(DEST, 'server'), { recursive: true });
fs.cpSync(path.join(GAME_ROOT, 'dist'), path.join(DEST, 'dist'), { recursive: true });
// 獨立進入點不需要帶過去（掛載走 server/app.js）
fs.rmSync(path.join(DEST, 'server', 'index.js'), { force: true });

console.log('📝 3/3 產生 cashflow/package.json 與說明…');
fs.writeFileSync(
  path.join(DEST, 'package.json'),
  JSON.stringify(
    {
      name: 'zizi-cashflow-subproject',
      private: true,
      type: 'module',
      description: '茲茲現金流遊戲（子專案，掛在 /cashflow；原始碼在 zizi-cashflow-game repo）',
    },
    null,
    2
  ) + '\n'
);
fs.writeFileSync(
  path.join(DEST, 'README.md'),
  [
    '# 茲茲現金流遊戲（子專案）',
    '',
    '- 這個資料夾是 **產生物**，請勿直接修改。',
    '- 原始碼： https://github.com/ljmath-glitch/zizi-cashflow-game',
    '- 更新方式：到 zizi-cashflow-game 跑 `npm run export:course`，再回本 repo commit push。',
    '- 掛載點：`server.js` 尾端的 mountCashflow（畫面 /cashflow、API /cashflow/api/*、Socket /cashflow/socket.io）。',
    '',
  ].join('\n')
);

// 把打包後的 dist 還原成獨立版（避免本機 dist 殘留 /cashflow 前綴影響獨立部署測試）
console.log('🔄 還原本機 dist 為獨立版打包…');
execSync('npx vite build', { cwd: GAME_ROOT, stdio: 'inherit' });

console.log('✅ 匯出完成 → ' + DEST);
console.log('   下一步：cd ' + TARGET_ROOT + ' && git add cashflow && git commit && git push');
