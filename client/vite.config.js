import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // 🔧 백엔드 주소
        changeOrigin: true,
        rewrite: (path) => path, // ✅ /api 경로 유지 (삭제 안함!)
      },
    },
  },
});
