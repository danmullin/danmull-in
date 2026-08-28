import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const cssName = readdirSync(join(dist, 'assets')).find((name) => name.endsWith('.css'))
if (!cssName) throw new Error('no hashed CSS in dist/assets')

const css = readFileSync(join(dist, 'assets', cssName), 'utf8')
const linkPattern = new RegExp(
  `<link rel="stylesheet"[^>]*href="/assets/${cssName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`,
)

for (const file of ['index.html', 'synth.html', 'games.html']) {
  const path = join(dist, file)
  const html = readFileSync(path, 'utf8')
  if (!linkPattern.test(html)) throw new Error(`stylesheet link not found in ${file}`)
  writeFileSync(path, html.replace(linkPattern, `<style>${css}</style>`))
  console.log(`inlined ${cssName} into ${file}`)
}
