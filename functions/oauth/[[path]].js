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
    501,
    'server_error',
    'danmull.in does not operate an OAuth authorization server. Public pages and /mcp need no credentials. See https://danmull.in/auth.md',
  )
}
