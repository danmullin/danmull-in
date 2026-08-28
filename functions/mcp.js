const PROJECTS = [
  {
    name: 'Synth',
    href: 'https://synth-pl.github.io/synth/',
    page: '/synth',
    tease: 'AI-native language with a real compiler',
  },
  {
    name: 'Penultimate',
    href: 'https://danmullin.github.io/penultimate/',
    tease: 'SVG vector editor',
  },
  {
    name: 'Tileforge',
    href: 'https://danmullin.github.io/tileforge/',
    tease: 'Map authoring and tile studio',
  },
  {
    name: 'Onion Lab',
    href: 'https://danmullin.github.io/onion-lab/',
    tease: 'Spritesheet animation studio',
  },
  {
    name: 'Sunwake',
    href: 'https://danmullin.github.io/sunwake/',
    tease: 'Music visualizer',
  },
  {
    name: 'Games',
    href: '/games',
    page: '/games',
    tease: 'Harborwick, Ledger Bay, and playables',
  },
  {
    name: 'GitHub',
    href: 'https://github.com/danmullin',
    tease: 'Repos and work in the open',
  },
]

const PROTOCOL_VERSION = '2025-03-26'
const SERVER_INFO = { name: 'danmull.in', version: '1.0.0' }

const TOOLS = [
  {
    name: 'list_projects',
    description:
      'List Dan Mullin projects linked from danmull.in, with URLs and short descriptions.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_page',
    description:
      'Return the markdown version of an on-origin page (home, synth, or games).',
    inputSchema: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          enum: ['home', 'synth', 'games'],
          description: 'Which page to read',
        },
      },
      required: ['page'],
      additionalProperties: false,
    },
  },
]

const PAGE_ASSETS = {
  home: '/index.md',
  synth: '/synth.md',
  games: '/games.md',
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id',
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

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

function textResult(text, isError = false) {
  const result = { content: [{ type: 'text', text }] }
  if (isError) result.isError = true
  return result
}

function resourceList() {
  return {
    resources: [
      {
        uri: 'https://danmull.in/llms.txt',
        name: 'llms.txt',
        mimeType: 'text/plain',
        description: 'Short agent overview of danmull.in',
      },
      {
        uri: 'https://danmull.in/llms-full.txt',
        name: 'llms-full.txt',
        mimeType: 'text/plain',
        description: 'Expanded agent copy of danmull.in',
      },
      {
        uri: 'https://danmull.in/index.md',
        name: 'home.md',
        mimeType: 'text/markdown',
        description: 'Markdown homepage',
      },
    ],
  }
}

async function readAsset(env, origin, path) {
  if (!env?.ASSETS) return null
  const res = await env.ASSETS.fetch(new URL(path, origin))
  if (!res.ok) return null
  return res.text()
}

async function handleRequest(message, env, origin) {
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return rpcError(message?.id ?? null, -32600, 'Invalid Request')
  }

  const { id, method, params } = message
  const isNotification = id === undefined

  if (method === 'notifications/initialized' || method.startsWith('notifications/')) {
    return isNotification ? null : rpcResult(id, {})
  }

  if (isNotification) return null

  if (method === 'initialize') {
    const requested = params?.protocolVersion
    return rpcResult(id, {
      protocolVersion: requested || PROTOCOL_VERSION,
      capabilities: { tools: {}, resources: {} },
      serverInfo: SERVER_INFO,
      instructions:
        'Public read-only MCP for danmull.in. Use list_projects and get_page. No authentication.',
    })
  }

  if (method === 'ping') return rpcResult(id, {})

  if (method === 'tools/list') return rpcResult(id, { tools: TOOLS })

  if (method === 'tools/call') {
    const name = params?.name
    const args = params?.arguments || {}
    if (name === 'list_projects') {
      return rpcResult(id, textResult(JSON.stringify({ projects: PROJECTS }, null, 2)))
    }
    if (name === 'get_page') {
      const asset = PAGE_ASSETS[args.page]
      if (!asset) {
        return rpcResult(id, textResult('Unknown page. Use home, synth, or games.', true))
      }
      const body = await readAsset(env, origin, asset)
      if (body == null) {
        return rpcResult(id, textResult(`Could not read ${asset}`, true))
      }
      return rpcResult(id, textResult(body))
    }
    return rpcResult(id, textResult(`Unknown tool: ${name}`, true))
  }

  if (method === 'resources/list') return rpcResult(id, resourceList())

  if (method === 'resources/read') {
    const uri = params?.uri
    const path = typeof uri === 'string' ? new URL(uri, origin).pathname : ''
    const allowed = new Set(['/llms.txt', '/llms-full.txt', '/index.md', '/synth.md', '/games.md'])
    if (!allowed.has(path)) {
      return rpcError(id, -32602, 'Unknown resource')
    }
    const body = await readAsset(env, origin, path)
    if (body == null) return rpcError(id, -32603, 'Resource unavailable')
    return rpcResult(id, {
      contents: [
        {
          uri,
          mimeType: path.endsWith('.md') ? 'text/markdown' : 'text/plain',
          text: body,
        },
      ],
    })
  }

  return rpcError(id, -32601, `Method not found: ${method}`)
}

export async function onRequest(context) {
  const { request, env } = context
  const origin = new URL(request.url).origin

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  if (request.method === 'GET') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'POST, OPTIONS', ...corsHeaders() },
    })
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'POST, OPTIONS', ...corsHeaders() },
    })
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
    const reply = await handleRequest(message, env, origin)
    if (reply) replies.push(reply)
  }

  if (replies.length === 0) {
    return new Response(null, { status: 202, headers: corsHeaders() })
  }

  const body = Array.isArray(payload) ? replies : replies[0]
  const extra = {}
  if (body?.result?.protocolVersion) {
    extra['MCP-Protocol-Version'] = body.result.protocolVersion
  }
  return jsonResponse(body, 200, extra)
}
