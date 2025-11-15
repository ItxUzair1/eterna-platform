import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    allowedHosts: [
      'miyoko-unincreasable-evan.ngrok-free.dev'  // allows all ngrok subdomains
      // or use your specific one:
      // 'miyoko-unincreasable-evan.ngrok-free.dev'
    ],
  },
})
