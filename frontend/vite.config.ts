import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    // ✅ Cho frontend chạy ở 5173 (mặc định của Vite)
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    // ✅ Inject env an toàn (không dùng process.env nữa)
    define: {
      __GEMINI_API_KEY__: JSON.stringify(env.GEMINI_API_KEY),
    },
  }
})