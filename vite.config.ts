import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
export default defineConfig({
  plugins: [vue()],
  root: path.join(__dirname, 'src/frontend'),
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        //rewrite: (path) => path.replace(/^\/api/, '')
      }
    },
  }
}); 