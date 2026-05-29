# 部署到網路（讓任何人用網址連線）

這個遊戲需要一台「持續運行的 Node + Socket.IO 伺服器」，
所以 **GitHub Pages / Netlify 不適用**（它們只能放靜態網頁）。
請用支援 Node 長連線的平台，推薦 **Render**（免費、支援 WebSocket）。

## 步驟

### 1. 把程式碼推上 GitHub
在專案資料夾執行（第一次）：
```
git init
git add .
git commit -m "茲茲現金流遊戲"
```
到 GitHub 建一個新的 repo（例如 `zizi-cashflow-game`），照它畫面上的指示：
```
git remote add origin https://github.com/你的帳號/zizi-cashflow-game.git
git branch -M main
git push -u origin main
```

### 2. 在 Render 部署
1. 到 https://render.com 註冊 / 登入（可用 GitHub 帳號登入）。
2. 點 **New** → **Blueprint**，選剛剛那個 GitHub repo。
   （repo 內已附 `render.yaml`，會自動帶入設定。）
3. 按 **Apply / Create**，等它跑完 build（約 2–4 分鐘）。
4. 完成後會得到一個網址，例如 `https://zizi-cashflow-game.onrender.com`。

> 若不想用 Blueprint，也可手動：New → **Web Service** → 選 repo →
> Build Command 填 `npm install --include=dev && npm run build`、
> Start Command 填 `npm start`，其餘預設即可。

### 3. 開始使用
- 老師端：`https://你的網址/teacher`
- 大螢幕：`https://你的網址/screen`（會顯示學生掃描用的 QR Code）
- 學生端：`https://你的網址/student`（或掃大螢幕 QR）

## 注意事項（免費方案）
- **會休眠**：一段時間沒人用後，第一個連入的人需等約 30–50 秒喚醒，之後就順了。
  上課前先自己開一次網址把它「喚醒」。
- **存檔不會永久保留**：雲端重啟會清掉 `saves/` 資料夾。
  遊戲進行中的 autosave 仍有效；若伺服器重啟，請用各組的「組別代號 / 重連 QR」還原。
- 想要不休眠 / 永久存檔，可改用付費方案或自架（帶筆電 + 同一 Wi-Fi 也能跑）。

## 本機 / 區網（不上雲）的用法
帶筆電到現場，連同一個 Wi-Fi（或自己開熱點），執行：
```
npm install
npm run build
npm start
```
大螢幕 `/screen` 會自動顯示區網 IP 的 QR Code 給學生掃描。
