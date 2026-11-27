import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Keep long-lived third-party code cacheable across app updates. */
// Cross-origin isolation enables SharedArrayBuffer, which multi-threaded Stockfish needs.
// Production hosting must send the same two headers; without them the app falls back to one thread.
const isolation = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' };

export default defineConfig({
  // Relative base: the same build works at a domain root or under a GitHub Pages subpath.
  base: './',
  plugins: [react()],
  server: { headers: isolation },
  preview: { headers: isolation },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/@mlc-ai/')) return 'webllm';
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
