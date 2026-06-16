import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'src/views',
  publicDir: '../public',
  
  plugins: [
    tailwindcss(),
  ],

  optimizeDeps: {
    include: ['@tailwindcss/vite'],
    esbuildOptions: {
      loader: {
        '.node': 'file',
      },
    },
  },
  esbuild: {
    loader: {
      '.node': 'file',
    },
  },
  assetsInclude: ['**/*.node'],

  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/views/index.html'),
        round: resolve(__dirname, 'src/views/round/index.html'),
        ranking: resolve(__dirname, 'src/views/ranking/index.html'),
        podium: resolve(__dirname, 'src/views/podium/index.html'),
        room: resolve(__dirname, 'src/views/room/index.html'),
        configureRoom: resolve(__dirname, 'src/views/configureRoom/index.html'),
        createOrJoinRoom: resolve(__dirname, 'src/views/createOrJoinRoom/index.html'),
        answersVotes: resolve(__dirname, 'src/views/answersVotes/index.html'),
      },
    },
  },

  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
      ignored: ['**/node_modules/**', '**/.vite/**'],
    },
    fs: {
      allow: ['..']
    }
  }
})