# auth.md

This file is for AI agents. **danmull.in is a public static site.** There is no agent registration, no login, and no access tokens to collect.

Resource server: `https://danmull.in`
Authorization server issuer: `https://danmull.in` (same origin; it does not issue tokens)

## 1. Discover

If a request ever returns `401`, look for:

```
WWW-Authenticate: Bearer resource_metadata="https://danmull.in/.well-known/oauth-protected-resource"
```

Otherwise fetch [Protected Resource Metadata](https://danmull.in/.well-known/oauth-protected-resource) directly.

Read `resource`, `authorization_servers`, `scopes_supported` (`public` only; unused because no tokens are issued), and `bearer_methods_supported`.

Then fetch [Authorization Server Metadata](https://danmull.in/.well-known/oauth-authorization-server). The `issuer` matches `authorization_servers[0]`. The `agent_auth` block points back here (`skill`) and names `register_uri`. Those registration URLs return `422 anonymous_not_enabled`.

## 2. Pick a method

None. `identity_types_supported` lists `anonymous` only so the discovery document is complete. Registration is not enabled.

If you only need to read the site, stop here. Use HTTPS GET, `Accept: text/markdown`, or POST JSON-RPC to [`/mcp`](https://danmull.in/mcp). Do not send `Authorization` headers.

## 3. Register

Do not POST to `/agent/auth`. The handler answers:

```json
{
  "error": "anonymous_not_enabled",
  "error_uri": "https://danmull.in/auth.md"
}
```

`/oauth/authorize` and `/oauth/token` return HTTP 501.

## 4. Credentials

There are none. Public pages, discovery files, and MCP tools are unauthenticated.

## Related

- Protected resource: `/.well-known/oauth-protected-resource`
- OAuth discovery: `/.well-known/oauth-authorization-server`
- MCP server card: `/.well-known/mcp/server-card.json`
- API catalog: `/.well-known/api-catalog`
- Site overview: `/llms.txt`
