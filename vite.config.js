import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 設定：開發時前端跑在 5173，並把 socket.io / api 轉發到後端 Express(3000)
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 允許區網其他裝置（學生手機）連入開發伺服器
    port: 5173,
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
      '/api': { target: 'http://localhost:3000' },
    },
  },
  build: {
    outDir: 'dist',
  },
});
