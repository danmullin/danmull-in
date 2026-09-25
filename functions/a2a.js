import { PAGE_ASSETS, formatProjects, readAsset } from './_site.js'

const ORIGIN = 'https://danmull.in'
const HELP = `danmull.in is a public read-only agent. No login, no tasks, no checkout.

Ask for:
- projects — list Dan Mullin's projects
- home, synth, or games — read that page as markdown

Or send a data part:
{"skill":"list-projects"}
{"skill":"read-page","page":"home"|"synth"|"games"}`

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, A2A-Version, A2A-Extensions',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
      ...extra,
    },
  })
}

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result }
}

function rpcError(id, code, message, type) {
  const error = { code, message }
  if (type) error.data = { type }
  return { jsonrpc: '2.0', id: id ?? null, error }
}

function agentMessage(contextId, text, mediaType = 'text/plain') {
  return {
    messageId: crypto.randomUUID(),
    contextId,
    role: 'ROLE_AGENT',
    parts: [{ text, mediaType }],
  }
}

function contextIdFrom(message) {
  return typeof message?.contextId === 'string' && message.contextId
    ? message.contextId
    : crypto.randomUUID()
}

function messageText(message) {
  const parts = Array.isArray(message?.parts) ? message.parts : []
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim()
}

function skillRequest(message) {
  const parts = Array.isArray(message?.parts) ? message.parts : []
  for (const part of parts) {
    const data = part?.data
    if (data && typeof data === 'object' && !Array.isArray(data) && typeof data.skill === 'string') {
      return data
    }
  }
  return null
}

function hasSupportedPart(message) {
  const parts = Array.isArray(message?.parts) ? message.parts : []
  return parts.some(
    (part) =>
      typeof part?.text === 'string' ||
      (part?.data && typeof part.data === 'object' && !Array.isArray(part.data)),
  )
}

function pageFromText(text) {
  const normalized = text.trim().toLowerCase()
  if (!normalized) return null
  if (/^(home|homepage|lobby|index)$/.test(normalized)) return 'home'
  if (/^synth$/.test(normalized)) return 'synth'
  if (/^games?$/.test(normalized)) return 'games'
  const asksToRead = /\b(page|read|show|get|markdown)\b/.test(normalized)
  if (!asksToRead) return null
  if (/\b(home|homepage|lobby)\b/.test(normalized)) return 'home'
  if (/\bsynth\b/.test(normalized)) return 'synth'
  if (/\bgames?\b/.test(normalized)) return 'games'
  return null
}

async function replyFor(message, env, origin) {
  const contextId = contextIdFrom(message)
  const skill = skillRequest(message)
  if (skill?.skill === 'list-projects') {
    return rpcResult(message._id, {
      message: agentMessage(contextId, formatProjects()),
    })
  }
  if (skill?.skill === 'read-page') {
    return readPage(message._id, contextId, skill.page, env, origin)
  }
  if (skill) {
    return rpcError(
      message._id,
      -32602,
      'Unknown skill. Use list-projects or read-page.',
      'InvalidParams',
    )
  }

  const text = messageText(message)
  const page = pageFromText(text)
  if (page) return readPage(message._id, contextId, page, env, origin)
  if (/\bprojects?\b/i.test(text)) {
    return rpcResult(message._id, {
      message: agentMessage(contextId, formatProjects()),
    })
  }
  return rpcResult(message._id, {
    message: agentMessage(contextId, HELP),
  })
}

async function readPage(id, contextId, page, env, origin) {
  const asset = PAGE_ASSETS[page]
  if (!asset) {
    return rpcError(id, -32602, 'Unknown page. Use home, synth, or games.', 'InvalidParams')
  }
  const body = await readAsset(env, origin, asset)
  if (body == null) {
    return rpcError(id, -32603, `Could not read ${asset}`)
  }
  return rpcResult(id, {
    message: agentMessage(contextId, body, 'text/markdown'),
  })
}

function unsupported(id, name, message) {
  const code = name === 'PushNotificationNotSupportedError' ? -32003 : -32004
  return rpcError(id, code, message, name)
}

export async function handleRpc(message, env, origin) {
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return rpcError(message?.id ?? null, -32600, 'Invalid Request')
  }

  const { id, method, params } = message
  if (id === undefined) return null

  const version = params?.configuration?.a2aVersion
  if (typeof version === 'string' && version !== '1.0' && version !== '1.0.0') {
    return rpcError(id, -32009, `Unsupported A2A version: ${version}`, 'VersionNotSupportedError')
  }

  if (method === 'SendMessage' || method === 'message/send') {
    const incoming = params?.message
    if (!incoming || typeof incoming !== 'object') {
      return rpcError(id, -32602, 'SendMessage requires params.message', 'InvalidParams')
    }
    if (!Array.isArray(incoming.parts) || incoming.parts.length === 0) {
      return rpcError(id, -32602, 'Message requires at least one part', 'InvalidParams')
    }
    if (!hasSupportedPart(incoming)) {
      return rpcError(
        id,
        -32005,
        'This agent accepts text parts or a JSON data part',
        'ContentTypeNotSupportedError',
      )
    }
    const accepted = params?.configuration?.acceptedOutputModes
    if (
      Array.isArray(accepted) &&
      accepted.length > 0 &&
      !accepted.includes('text/plain') &&
      !accepted.includes('text/markdown')
    ) {
      return rpcError(
        id,
        -32005,
        'This agent replies with text/plain or text/markdown',
        'ContentTypeNotSupportedError',
      )
    }
    return replyFor({ ...incoming, _id: id }, env, origin)
  }

  if (method === 'ListTasks' || method === 'tasks/list') {
    const pageSize = Number.isInteger(params?.pageSize) ? params.pageSize : 0
    return rpcResult(id, {
      tasks: [],
      nextPageToken: '',
      pageSize,
      totalSize: 0,
    })
  }

  if (method === 'GetTask' || method === 'tasks/get' || method === 'CancelTask' || method === 'tasks/cancel') {
    return rpcError(
      id,
      -32001,
      'This agent answers in a direct message and does not keep tasks',
      'TaskNotFoundError',
    )
  }

  if (method === 'SendStreamingMessage' || method === 'message/stream' || method === 'SubscribeToTask') {
    return unsupported(id, 'UnsupportedOperationError', 'Streaming is not supported')
  }

  if (method === 'GetExtendedAgentCard' || method === 'agent/getAuthenticatedExtendedCard') {
    return unsupported(id, 'UnsupportedOperationError', 'No extended agent card')
  }

  if (
    method === 'CreateTaskPushNotificationConfig' ||
    method === 'GetTaskPushNotificationConfig' ||
    method === 'ListTaskPushNotificationConfigs' ||
    method === 'DeleteTaskPushNotificationConfig'
  ) {
    return unsupported(id, 'PushNotificationNotSupportedError', 'Push notifications are not supported')
  }

  return rpcError(id, -32601, `Method not found: ${method}`)
}

export async function onRequest(context) {
  const { request, env } = context
  const origin = new URL(request.url).origin || ORIGIN

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  if (request.method === 'GET') {
    const card = await readAsset(env, origin, '/.well-known/agent-card.json')
    if (card == null) {
      return jsonResponse({ error: 'agent card unavailable' }, 404)
    }
    return new Response(card, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(),
      },
    })
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET, POST, OPTIONS', ...corsHeaders() },
    })
  }

  const headerVersion = request.headers.get('A2A-Version')
  if (headerVersion && headerVersion !== '1.0' && headerVersion !== '1.0.0') {
    return jsonResponse(
      rpcError(null, -32009, `Unsupported A2A version: ${headerVersion}`, 'VersionNotSupportedError'),
      400,
    )
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return jsonResponse(rpcError(null, -32700, 'Parse error'), 400)
  }

  const messages = Array.isArray(payload) ? payload : [payload]
  const replies = []
  for (const message of messages) {
    const reply = await handleRpc(message, env, origin)
    if (reply) replies.push(reply)
  }

  if (replies.length === 0) {
    return new Response(null, { status: 202, headers: corsHeaders() })
  }

  return jsonResponse(Array.isArray(payload) ? replies : replies[0])
}
