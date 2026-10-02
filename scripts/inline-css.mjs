import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const files = [
  'index.html',
  'synth.html',
  'games.html',
  'utilities.html',
  'utilities/image.html',
]

function canInline(code) {
  return !/\bimport\s*(?:\(|["'])/.test(code) && !/^\s*import\s+/m.test(code)
}

for (const file of files) {
  const path = join(dist, file)
  let html = readFileSync(path, 'utf8')
  const link = html.match(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/)
  if (!link) throw new Error(`stylesheet link not found in ${file}`)
  const cssFile = link[1].slice('/assets/'.length)
  const css = readFileSync(join(dist, 'assets', cssFile), 'utf8')
  html = html.replace(link[0], `<style>${css}</style>`)

  let inlined = 0
  html = html.replace(
    /<script type="module"[^>]*src="(\/assets\/[^"]+\.js)"[^>]*><\/script>/g,
    (tag, src) => {
      const name = src.slice('/assets/'.length)
      const code = readFileSync(join(dist, 'assets', name), 'utf8')
      if (!canInline(code)) return tag
      inlined += 1
      return `<script type="module">${code.replaceAll('</script', '<\\/script')}</script>`
    },
  )
  if (!inlined) throw new Error(`no module script inlined in ${file}`)
  writeFileSync(path, html)
  console.log(`inlined assets into ${file} (${inlined} script${inlined === 1 ? '' : 's'})`)
}
