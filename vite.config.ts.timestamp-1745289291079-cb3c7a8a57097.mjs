// vite.config.ts
import { fileURLToPath, URL } from "url";
import { defineConfig } from "file:///F:/Temp/razerqdhid-main/razerqdhid-main/node_modules/vite/dist/node/index.js";
import { serviceWorkerPlugin } from "file:///F:/Temp/razerqdhid-main/razerqdhid-main/node_modules/@gautemo/vite-plugin-service-worker/dist/index.js";
import vue from "file:///F:/Temp/razerqdhid-main/razerqdhid-main/node_modules/@vitejs/plugin-vue/dist/index.mjs";
var __vite_injected_original_import_meta_url = "file:///F:/Temp/razerqdhid-main/razerqdhid-main/vite.config.ts";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    serviceWorkerPlugin({
      filename: "service-worker.ts"
    })
  ],
  base: process.env.NODE_ENV === "production" ? "/webhid/" : "./",
  worker: {
    format: "es"
  },
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url)) }
    ]
  },
  build: {
    rollupOptions: {
      input: {
        app: "./index.html",
        "service-worker": "./service-worker.ts"
      },
      output: {
        entryFileNames: "[name].js"
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJGOlxcXFxUZW1wXFxcXHJhemVycWRoaWQtbWFpblxcXFxyYXplcnFkaGlkLW1haW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkY6XFxcXFRlbXBcXFxccmF6ZXJxZGhpZC1tYWluXFxcXHJhemVycWRoaWQtbWFpblxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRjovVGVtcC9yYXplcnFkaGlkLW1haW4vcmF6ZXJxZGhpZC1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHtmaWxlVVJMVG9QYXRoLCBVUkx9IGZyb20gJ3VybCc7XG5pbXBvcnQge2RlZmluZUNvbmZpZ30gZnJvbSAndml0ZSdcbmltcG9ydCB7c2VydmljZVdvcmtlclBsdWdpbn0gZnJvbSAnQGdhdXRlbW8vdml0ZS1wbHVnaW4tc2VydmljZS13b3JrZXInXG5pbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSdcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gICAgcGx1Z2luczogW1xuICAgICAgICB2dWUoKSxcbiAgICAgICAgc2VydmljZVdvcmtlclBsdWdpbih7XG4gICAgICAgICAgICBmaWxlbmFtZTogJ3NlcnZpY2Utd29ya2VyLnRzJyxcbiAgICAgICAgfSksXG4gICAgXSxcbiAgICBiYXNlOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nXG4gICAgICAgID8gJy93ZWJoaWQvJ1xuICAgICAgICA6ICcuLycsXG4gICAgd29ya2VyOiB7XG4gICAgICAgIGZvcm1hdDogXCJlc1wiXG4gICAgfSxcbiAgICByZXNvbHZlOiB7XG4gICAgICAgIGFsaWFzOiBbXG4gICAgICAgICAgICB7ZmluZDogJ0AnLCByZXBsYWNlbWVudDogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYycsIGltcG9ydC5tZXRhLnVybCkpfSxcbiAgICAgICAgXSxcbiAgICB9LFxuICAgIGJ1aWxkOiB7XG4gICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICAgICAgYXBwOiAnLi9pbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgICAnc2VydmljZS13b3JrZXInOiAnLi9zZXJ2aWNlLXdvcmtlci50cycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdbbmFtZV0uanMnXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1MsU0FBUSxlQUFlLFdBQVU7QUFDaFYsU0FBUSxvQkFBbUI7QUFDM0IsU0FBUSwyQkFBMEI7QUFDbEMsT0FBTyxTQUFTO0FBSDZLLElBQU0sMkNBQTJDO0FBTTlPLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLFNBQVM7QUFBQSxJQUNMLElBQUk7QUFBQSxJQUNKLG9CQUFvQjtBQUFBLE1BQ2hCLFVBQVU7QUFBQSxJQUNkLENBQUM7QUFBQSxFQUNMO0FBQUEsRUFDQSxNQUFNLFFBQVEsSUFBSSxhQUFhLGVBQ3pCLGFBQ0E7QUFBQSxFQUNOLFFBQVE7QUFBQSxJQUNKLFFBQVE7QUFBQSxFQUNaO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDTCxPQUFPO0FBQUEsTUFDSCxFQUFDLE1BQU0sS0FBSyxhQUFhLGNBQWMsSUFBSSxJQUFJLFNBQVMsd0NBQWUsQ0FBQyxFQUFDO0FBQUEsSUFDN0U7QUFBQSxFQUNKO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDSCxlQUFlO0FBQUEsTUFDWCxPQUFPO0FBQUEsUUFDSCxLQUFLO0FBQUEsUUFDTCxrQkFBa0I7QUFBQSxNQUN0QjtBQUFBLE1BQ0EsUUFBUTtBQUFBLFFBQ0osZ0JBQWdCO0FBQUEsTUFDcEI7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUNKLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
