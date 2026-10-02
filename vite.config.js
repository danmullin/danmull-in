import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'

const heicSrc = resolve(__dirname, 'node_modules/heic2any/dist/heic2any.js')

function vendorFiles() {
  const files = [
    { src: heicSrc, url: '/vendor/heic2any.js', dest: resolve(__dirname, 'dist/vendor/heic2any.js') },
    {
      src: resolve(__dirname, 'src/image-convert.js'),
      url: '/image-convert.js',
      dest: resolve(__dirname, 'dist/image-convert.js'),
    },
  ]
  return {
    name: 'vendor-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0]
        const file = files.find((item) => item.url === path)
        if (!file) return next()
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
        res.end(readFileSync(file.src))
      })
    },
    closeBundle() {
      for (const file of files) {
        mkdirSync(dirname(file.dest), { recursive: true })
        copyFileSync(file.src, file.dest)
      }
    },
  }
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [vendorFiles()],
  build: {
    outDir: 'dist',
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        synth: resolve(__dirname, 'synth.html'),
        games: resolve(__dirname, 'games.html'),
        utilities: resolve(__dirname, 'utilities.html'),
        image: resolve(__dirname, 'utilities/image.html'),
      },
    },
  },
})
