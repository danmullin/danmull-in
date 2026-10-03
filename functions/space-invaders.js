export async function onRequest(context) {
  const url = new URL(context.request.url)
  const asset = await context.env.ASSETS.fetch(new URL('/space-invaders/index.html', url.origin))
  const headers = new Headers(asset.headers)
  headers.set('Content-Type', 'text/html; charset=utf-8')
  return new Response(asset.body, { status: asset.status, headers })
}
