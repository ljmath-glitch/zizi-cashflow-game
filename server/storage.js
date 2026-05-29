// 存檔讀寫（寫入老師筆電本機 ./saves/ 資料夾，JSON 格式）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAVES_DIR = path.resolve(__dirname, '..', 'saves');

export function ensureSavesDir() {
  if (!fs.existsSync(SAVES_DIR)) {
    fs.mkdirSync(SAVES_DIR, { recursive: true });
  }
}

// 寫入指定檔名（覆蓋）
export function saveToFile(filename, data) {
  ensureSavesDir();
  const file = path.join(SAVES_DIR, filename);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return filename;
}

// 讀取指定檔名；失敗回傳 null
export function loadFromFile(filename) {
  const file = path.join(SAVES_DIR, filename);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// 產生帶時間戳的存檔檔名：save_YYYYMMDD_HHMMSS.json
export function timestampName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `save_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(
    d.getHours()
  )}${p(d.getMinutes())}${p(d.getSeconds())}.json`;
}

// 列出所有存檔（依修改時間新到舊）
export function listSaves() {
  ensureSavesDir();
  return fs
    .readdirSync(SAVES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const st = fs.statSync(path.join(SAVES_DIR, f));
      return { name: f, mtime: st.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}
