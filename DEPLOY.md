# Deploy danmull.in (Cloudflare Pages)

## 0. Auth note

If `gh` says you are not logged in:

```bash
gh auth login --hostname github.com --git-protocol https --web
```

Then continue from step 1.

## 1. Push this repo to GitHub


From this folder (after `gh auth login` if needed):

```bash
gh repo create danmull-in --public --source=. --remote=origin --push
```

Or create an empty repo on github.com, then:

```bash
git remote add origin https://github.com/<you>/danmull-in.git
git branch -M main
git add .
git commit -m "Initial danmull.in site"
git push -u origin main
```

Suggested GitHub owner: your personal account (not `synth-pl` unless you prefer that).

## 2. Cloudflare Pages

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select the `danmull-in` repository.
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (repo root)
4. Save and deploy. You’ll get a `*.pages.dev` URL first — confirm the site loads.

## 3. Custom domain

1. Pages project → **Custom domains** → **Set up a domain**.
2. Add `danmull.in` and `www.danmull.in` (redirect www → apex if offered).
3. Follow [DNS.md](./DNS.md) so Cloudflare can verify and issue HTTPS.

## Build note

Multi-page inputs: `index.html`, `synth.html`, `games.html` (see `vite.config.js`).
