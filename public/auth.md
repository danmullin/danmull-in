# auth.md

danmull.in is a **public static site**. Agents do not register, and they do not need credentials to read pages, discovery files, or the MCP endpoint.

## Audience

Any browser, crawler, or AI agent fetching public resources on `https://danmull.in`.

## Registration

None. There is no agent registration, provisioning, or onboarding endpoint on this origin.

Do not POST to `/agent/auth` or similar paths; they are not implemented.

## Methods

Unauthenticated HTTPS GET (and `Accept: text/markdown` content negotiation) for published pages and well-known files.

Unauthenticated HTTPS POST JSON-RPC to [`/mcp`](https://danmull.in/mcp) for the public Model Context Protocol server.

## Credentials

Do not send `Authorization` headers. They are ignored. There is no OAuth authorization server, no bearer tokens, and no API keys for this origin.

## Related

- MCP server card: `/.well-known/mcp/server-card.json`
- API catalog: `/.well-known/api-catalog`
- Site overview: `/llms.txt`
