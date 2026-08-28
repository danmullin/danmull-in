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

Do not send `Authorization` headers. They are ignored. This origin does not issue tokens.

OAuth 2.0 Authorization Server Metadata is published at
[`/.well-known/oauth-authorization-server`](https://danmull.in/.well-known/oauth-authorization-server)
so agents can discover that fact. `/oauth/authorize` and `/oauth/token` return HTTP 501.

## Related

- OAuth discovery: `/.well-known/oauth-authorization-server`
- MCP server card: `/.well-known/mcp/server-card.json`
- API catalog: `/.well-known/api-catalog`
- Site overview: `/llms.txt`
