import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const targetApi = env.VITE_API_BASE_URL || env.VITE_API_URL || 'http://localhost:3001';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: targetApi,
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      chunkSizeWarningLimit: 1200
    }
  };
});
