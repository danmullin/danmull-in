import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        synth: resolve(__dirname, 'synth.html'),
        games: resolve(__dirname, 'games.html'),
      },
    },
  },
})
