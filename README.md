# danmull.in

Personal site for **Dan Mullin** — tools, games, and systems you can play with.

## Local

```bash
npm install
npm run dev
```

```bash
npm run build
```

Output: `dist/`. Hosted on Cloudflare Pages from this repo.

## DNS-AID

Agent discovery over DNS ([draft-mozleywilliams-dnsop-dnsaid](https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/)) is two HTTPS records in the Cloudflare zone, not files in this repo. Intended records are in `dns/dns-aid.zone`.

In [Cloudflare DNS](https://dash.cloudflare.com/) → **danmull.in** → **DNS** → **Records** → **Add record**:

| Type | Name | Priority | Target | Value |
| --- | --- | --- | --- | --- |
| HTTPS | `_index._agents` | 1 | `danmull.in` | `alpn="h2" port=443` |
| HTTPS | `_mcp._agents` | 1 | `danmull.in` | `alpn="h2" port=443` |

Do not add `_a2a._agents` — this origin has no A2A agent.

Optional: **DNS** → **Settings** → enable **DNSSEC**, then add the DS record at the registrar if Cloudflare is not already the parent. There is currently no DS at `.in`, so validating resolvers will not treat the answers as authenticated until that chain exists.

With a token that can edit Zone DNS:

```bash
CLOUDFLARE_API_TOKEN=... ./scripts/publish-dns-aid.sh
```

## Web Bot Auth

This origin publishes an HTTP Message Signatures directory ([draft-meunier-http-message-signatures-directory](https://datatracker.ietf.org/doc/draft-meunier-http-message-signatures-directory/)) at `/.well-known/http-message-signatures-directory`. Receiving sites can use that JWKS to verify requests this origin signs as a bot or agent.

danmull.in is not a crawler. The directory is public key material only — the Ed25519 private key is not in this repo. To rotate keys before signing outbound requests:

```bash
node scripts/generate-web-bot-auth-key.mjs
```

That rewrites the public JWKS and writes a private JWK to `/tmp/web-bot-auth-private.jwk.json`. Store the private JWK as a secret if you start signing; never commit `d`.

