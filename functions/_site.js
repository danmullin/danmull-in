export const PROJECTS = [
  {
    name: 'Synth',
    href: 'https://synth-pl.github.io/synth/',
    page: '/synth',
    tease: 'AI-native language with a real compiler',
  },
  {
    name: 'Penultimate',
    href: 'https://danmullin.github.io/penultimate/',
    tease: 'SVG vector editor',
  },
  {
    name: 'Tileforge',
    href: 'https://danmullin.github.io/tileforge/',
    tease: 'Map authoring and tile studio',
  },
  {
    name: 'Onion Lab',
    href: 'https://danmullin.github.io/onion-lab/',
    tease: 'Spritesheet animation studio',
  },
  {
    name: 'Sunwake',
    href: 'https://danmullin.github.io/sunwake/',
    tease: 'Music visualizer',
  },
  {
    name: 'Games',
    href: '/games',
    page: '/games',
    tease: 'Harborwick, Ledger Bay, and playables',
  },
  {
    name: 'GitHub',
    href: 'https://github.com/danmullin',
    tease: 'Repos and work in the open',
  },
]

export const PAGE_ASSETS = {
  home: '/index.md',
  synth: '/synth.md',
  games: '/games.md',
}

export function formatProjects() {
  return PROJECTS.map((project) => `- ${project.name}: ${project.tease} (${project.href})`).join('\n')
}

export async function readAsset(env, origin, path) {
  if (!env?.ASSETS) return null
  const res = await env.ASSETS.fetch(new URL(path, origin))
  if (!res.ok) return null
  return res.text()
}
