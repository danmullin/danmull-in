---
name: browse-danmull-in
description: Navigate danmull.in — Dan Mullin's personal lobby for tools, games, and the Synth language. Use when an agent needs the project map, canonical URLs, or machine-readable discovery files.
---

# Browse danmull.in

danmull.in is a static personal site on Cloudflare Pages plus a **public read-only MCP** at `/mcp` and a **public read-only A2A agent** at `/a2a`. There is no OAuth and no checkout on this origin.

## Canonical pages

| Path | What it is |
| --- | --- |
| `/` | Project lobby |
| `/synth` | Synth language overview (links out to the compiler site) |
| `/games` | Harborwick, Ledger Bay, and tooling notes |

## Projects (most live off-origin)

- Synth language home: https://synth-pl.github.io/synth/
- Synth source: https://github.com/synth-pl/synth
- Penultimate (SVG editor): https://danmullin.github.io/penultimate/
- Tileforge: https://danmullin.github.io/tileforge/
- Onion Lab: https://danmullin.github.io/onion-lab/
- Sunwake: https://danmullin.github.io/sunwake/
- GitHub: https://github.com/danmullin

## Discovery files

- `/llms.txt` — short agent overview
- `/llms-full.txt` — expanded page text
- `/.well-known/api-catalog` — RFC 9727 linkset for `/mcp`
- `/.well-known/mcp/server-card.json` — MCP discovery
- `/mcp` — Streamable HTTP JSON-RPC (`list_projects`, `get_page`)
- `/.well-known/agent-card.json` — A2A agent card
- `/a2a` — A2A JSON-RPC (`SendMessage`: `list-projects`, `read-page`)
- `/auth.md` — no credentials; do not register
- `/.well-known/ai-catalog.json` — ARD capability manifest
- `/.well-known/agent-skills/index.json` — this skill index

## Content negotiation

Request any HTML page with `Accept: text/markdown` to receive the matching `.md` body (`/index.md`, `/synth.md`, `/games.md`).

## Contact

The homepage contact form posts to a third-party form endpoint. Do not invent an on-origin mail API.
