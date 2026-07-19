# DNS for danmull.in

**Preferred path:** Cloudflare DNS as the nameserver (best for apex `danmull.in` + Pages).

## Before you start

- **Registrar:** GoDaddy (confirmed 2026-07-19)
- **Email on this domain?** Ask before moving NS — keep MX/TXT if yes.

## Path A — Point nameservers to Cloudflare (recommended)

1. Cloudflare Dashboard → **Add a site** → `danmull.in` → Free plan.
2. Let Cloudflare scan records. **Keep** any MX/TXT you still need for email.
3. Cloudflare shows **two nameservers** like:
   - `ada.ns.cloudflare.com`
   - `bob.ns.cloudflare.com`
   (yours will differ — copy exactly from the dashboard.)
4. At your **registrar** → domain management → **Nameservers** → change from “registrar default” to **Custom** → paste Cloudflare’s two NS only. Remove old NS.
5. Wait for propagation (often minutes to a few hours; up to 24–48h).
6. Back in **Pages → Custom domains**, finish setup for `danmull.in` / `www`. SSL should become **Active**.

### Registrar cheatsheet (nameserver UI)

| Registrar | Typical path |
|-----------|----------------|
| Namecheap | Domain List → Manage → Nameservers → Custom DNS |
| Porkbun | Domain → Authoritative Nameservers → Edit |
| GoDaddy | DNS → Nameservers → Change → Enter my own |
| Squarespace Domains | DNS → Nameservers → Use custom nameservers |
| Cloudflare Registrar | Already on CF — skip NS change; just add Pages domain |

## Path B — Keep registrar DNS (only if you cannot change NS)

- `www` → **CNAME** to your Pages hostname (`something.pages.dev`).
- Apex `@` → only if the registrar supports **ALIAS/ANAME** to that hostname. Many do not; prefer Path A for `.in`.

## Verify

```bash
nslookup danmull.in
nslookup -type=ns danmull.in
```

Nameservers should show Cloudflare once Path A has propagated. Then open https://danmull.in.
