const HOME_LINK =
  '</.well-known/api-catalog>; rel="api-catalog", </.well-known/mcp/server-card.json>; rel="service-desc", </llms.txt>; rel="describedby"; type="text/plain", </llms.txt>; rel="service-doc"; type="text/plain"'

function quality(accept, type) {
  const escaped = type.replace('/', '\\/')
  const match = accept.match(new RegExp(`${escaped}\\s*(?:;\\s*q\\s*=\\s*([0-9.]+))?`, 'i'))
  if (!match) return null
  return match[1] === undefined ? 1 : Number(match[1])
}

function prefersMarkdown(accept) {
  if (!accept) return false
  const markdown = quality(accept, 'text/markdown')
  if (markdown === null) return false
  const html = quality(accept, 'text/html')
  if (html === null) return true
  return markdown >= html
}

function markdownAssetPath(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/' || path === '/index' || path === '/index.html') return '/index.md'
  if (path === '/synth' || path === '/synth.html') return '/synth.md'
  if (path === '/games' || path === '/games.html') return '/games.md'
  return null
}

function isHomepage(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  return path === '/' || path === '/index' || path === '/index.html'
}

function estimateTokens(text) {
  return String(Math.max(1, Math.ceil(text.length / 4)))
}

function withHomeLink(response, pathname) {
  if (!isHomepage(pathname) || response.headers.has('Link')) return response
  const headers = new Headers(response.headers)
  headers.set('Link', HOME_LINK)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export async function onRequest(context) {
  const { request, next, env } = context
  const url = new URL(request.url)
  const accept = request.headers.get('Accept') || ''
  const mdPath = markdownAssetPath(url.pathname)

  if (mdPath && prefersMarkdown(accept) && env.ASSETS) {
    const asset = await env.ASSETS.fetch(new URL(mdPath, url.origin))
    if (asset.ok) {
      const body = await asset.text()
      const headers = new Headers()
      headers.set('Content-Type', 'text/markdown; charset=utf-8')
      headers.set('Vary', 'Accept')
      headers.set('x-markdown-tokens', estimateTokens(body))
      if (isHomepage(url.pathname)) headers.set('Link', HOME_LINK)
      return new Response(body, { status: 200, headers })
    }
  }

  const response = await next()
  return withHomeLink(response, url.pathname)
}
