import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const skillPath = 'public/.well-known/agent-skills/browse-danmull-in/SKILL.md'
const indexPath = 'public/.well-known/agent-skills/index.json'

const digest = `sha256:${createHash('sha256').update(readFileSync(skillPath)).digest('hex')}`
const index = JSON.parse(readFileSync(indexPath, 'utf8'))
if (!index.skills?.[0]) throw new Error('agent-skills index is missing skills[0]')
index.skills[0].digest = digest
writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`)
console.log(`updated ${indexPath} digest ${digest}`)
