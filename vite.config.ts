import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const disableHmr = process.env.DISABLE_HMR === 'true';
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // In middlewareMode, do not set port/strictPort since Express handles port 3000.
      // Disable HMR WebSocket in iframe preview to prevent connection error loops.
      hmr: false,
      watch: disableHmr ? null : {},
    },
  };
});
