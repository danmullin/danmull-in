import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const assets = readdirSync(join(dist, 'assets'))
const cssName = assets.find((name) => name.endsWith('.css'))
const jsName = assets.find((name) => name.endsWith('.js'))
if (!cssName) throw new Error('no hashed CSS in dist/assets')
if (!jsName) throw new Error('no hashed JS in dist/assets')

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const css = readFileSync(join(dist, 'assets', cssName), 'utf8')
const js = readFileSync(join(dist, 'assets', jsName), 'utf8').replaceAll(
  '</script',
  '<\\/script',
)

const linkPattern = new RegExp(
  `<link rel="stylesheet"[^>]*href="/assets/${escapeRegExp(cssName)}"[^>]*>`,
)
const scriptPattern = new RegExp(
  `<script type="module"[^>]*src="/assets/${escapeRegExp(jsName)}"[^>]*></script>`,
)

for (const file of ['index.html', 'synth.html', 'games.html']) {
  const path = join(dist, file)
  let html = readFileSync(path, 'utf8')
  if (!linkPattern.test(html)) throw new Error(`stylesheet link not found in ${file}`)
  if (!scriptPattern.test(html)) throw new Error(`module script not found in ${file}`)
  html = html.replace(linkPattern, `<style>${css}</style>`)
  html = html.replace(scriptPattern, `<script type="module">${js}</script>`)
  writeFileSync(path, html)
  console.log(`inlined ${cssName} and ${jsName} into ${file}`)
}
