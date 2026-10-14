export const PROJECTS = [
  {
    name: 'Synth',
    href: 'https://synth-pl.github.io/synth/landing.html',
    tease: 'Self-hosted AI-native language. You compile and run it yourself',
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
    tease: 'Professor Vector and browser arcade games',
  },
  {
    name: 'Browser games',
    href: '/browser-games',
    page: '/browser-games',
    tease: 'Arcade classics in the tab',
  },
  {
    name: 'Utilities',
    href: '/utilities',
    page: '/utilities',
    tease: 'Clocks, images, video, and tools',
  },
  {
    name: 'GitHub',
    href: 'https://github.com/danmullin',
    tease: 'Repos and work in the open',
  },
]

export const PAGE_ASSETS = {
  home: '/index.md',
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
