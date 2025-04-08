import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite'
import { serviceWorkerPlugin } from '@gautemo/vite-plugin-service-worker'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    serviceWorkerPlugin({
      filename: 'service-worker.ts',
    }),
  ],
  base: '/razerqdhid/',
  worker: {
    format: "es"
  },
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  build: {
    rollupOptions: {
      input: {
        app: './index.html',
        'service-worker': './service-worker.ts',
      },
      output: {
        entryFileNames: '[name].js'
      },
    },
  },
});
