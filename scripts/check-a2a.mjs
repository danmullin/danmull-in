import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { handleRpc } from '../functions/a2a.js'

const card = JSON.parse(readFileSync('public/.well-known/agent-card.json', 'utf8'))
assert.equal(card.name, 'danmull.in')
assert.equal(typeof card.description, 'string')
assert.ok(card.description.length > 0)
assert.equal(card.version, '1.0.0')
assert.equal(card.supportedInterfaces[0].url, 'https://danmull.in/a2a')
assert.equal(card.supportedInterfaces[0].protocolBinding, 'JSONRPC')
assert.equal(card.supportedInterfaces[0].protocolVersion, '1.0')
assert.equal(typeof card.capabilities, 'object')
for (const skill of card.skills) {
  assert.equal(typeof skill.id, 'string')
  assert.equal(typeof skill.name, 'string')
  assert.equal(typeof skill.description, 'string')
  assert.ok(skill.tags.length > 0)
}

const pages = {
  '/index.md': '# Home\nLobby',
  '/synth.md': '# Synth\nCompiler',
  '/games.md': '# Games\nHarborwick',
}

const env = {
  ASSETS: {
    async fetch(url) {
      const body = pages[new URL(url).pathname]
      if (body == null) return new Response('missing', { status: 404 })
      return new Response(body, { status: 200 })
    },
  },
}

async function call(method, params) {
  return handleRpc(
    { jsonrpc: '2.0', id: 't1', method, params },
    env,
    'https://danmull.in',
  )
}

function textOf(reply) {
  return reply.result.message.parts.map((part) => part.text).join('\n')
}

const projects = await call('SendMessage', {
  message: { messageId: 'm1', role: 'ROLE_USER', parts: [{ text: 'projects' }] },
})
assert.match(textOf(projects), /Synth/)
assert.match(textOf(projects), /Penultimate/)
assert.equal(projects.result.message.role, 'ROLE_AGENT')
assert.equal(typeof projects.result.message.contextId, 'string')

const synth = await call('message/send', {
  message: {
    messageId: 'm2',
    role: 'ROLE_USER',
    contextId: 'ctx-keep',
    parts: [{ data: { skill: 'read-page', page: 'synth' } }],
  },
})
assert.equal(textOf(synth), '# Synth\nCompiler')
assert.equal(synth.result.message.contextId, 'ctx-keep')
assert.equal(synth.result.message.parts[0].mediaType, 'text/markdown')

const help = await call('SendMessage', {
  message: { messageId: 'm3', role: 'ROLE_USER', parts: [{ text: 'hello' }] },
})
assert.match(textOf(help), /list-projects/)

const missing = await call('SendMessage', {
  message: {
    messageId: 'm4',
    role: 'ROLE_USER',
    parts: [{ data: { skill: 'read-page', page: 'nope' } }],
  },
})
assert.equal(missing.error.code, -32602)

const binary = await call('SendMessage', {
  message: { messageId: 'm5', role: 'ROLE_USER', parts: [{ raw: 'aGVsbG8=' }] },
})
assert.equal(binary.error.data.type, 'ContentTypeNotSupportedError')

const stream = await call('SendStreamingMessage', {})
assert.equal(stream.error.code, -32004)

const task = await call('GetTask', { id: 'nope' })
assert.equal(task.error.code, -32001)

const list = await call('ListTasks', {})
assert.deepEqual(list.result.tasks, [])
assert.equal(list.result.totalSize, 0)

const unknown = await call('Dance', {})
assert.equal(unknown.error.code, -32601)

console.log('a2a agent card and SendMessage ok')
