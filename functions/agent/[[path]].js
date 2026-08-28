function jsonError(status, error, description) {
  return new Response(
    JSON.stringify({
      error,
      error_description: description,
      error_uri: 'https://danmull.in/auth.md',
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}

export async function onRequest() {
  return jsonError(
    422,
    'anonymous_not_enabled',
    'danmull.in does not register agents or issue credentials. Public pages and /mcp need no login. See https://danmull.in/auth.md',
  )
}
