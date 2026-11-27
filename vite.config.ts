import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Keep long-lived third-party code cacheable across app updates. */
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'react';
          if (id.includes('/chess.js/') || id.includes('/chessground/')) return 'chess';
          if (id.includes('/peerjs/') || id.includes('/ws/')) return 'collaboration';
          if (id.includes('/zustand/')) return 'state';
          return 'vendor';
        },
      },
    },
  },
});
