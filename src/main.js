const PROJECTS = [
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

function registerWebMcpTools() {
  const mc = navigator.modelContext
  if (!mc) return

  const tools = [
    {
      name: 'list_projects',
      description:
        'List Dan Mullin projects linked from danmull.in, with URLs and short descriptions.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      execute: async () => ({ projects: PROJECTS }),
    },
    {
      name: 'open_page',
      description:
        'Navigate this tab to a danmull.in page. Allowed names: home, synth, games.',
      inputSchema: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: ['home', 'synth', 'games'],
            description: 'Which on-origin page to open',
          },
        },
        required: ['page'],
        additionalProperties: false,
      },
      execute: async ({ page }) => {
        const href = page === 'synth' ? '/synth' : page === 'games' ? '/games' : '/'
        window.location.assign(href)
        return { ok: true, href }
      },
    },
  ]

  try {
    if (typeof mc.provideContext === 'function') {
      mc.provideContext({ tools })
    } else if (typeof mc.registerTool === 'function') {
      const controller = new AbortController()
      for (const tool of tools) mc.registerTool(tool, { signal: controller.signal })
    }
  } catch (_) {
    /* WebMCP is optional; browsers without the API should still load the page. */
  }
}

registerWebMcpTools()

function loadAnalytics() {
  if (window.__danmullGtag) return
  window.__danmullGtag = true
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', 'G-GC14PWTVPZ')
  const script = document.createElement('script')
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-GC14PWTVPZ'
  script.async = true
  document.head.appendChild(script)
}

function armAnalytics() {
  const start = () => loadAnalytics()
  ;['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((type) => {
    window.addEventListener(type, start, { once: true, passive: true })
  })
}

if (document.readyState === 'complete') armAnalytics()
else window.addEventListener('load', armAnalytics, { once: true })

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href')
    if (!id || id === '#') return
    const el = document.querySelector(id)
    if (!el) return
    e.preventDefault()
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
})

function setBrandMetrics(brand) {
  const swap = brand.querySelector('.lobby-brand-swap')
  const period = brand.querySelector('.lobby-period')
  const to = brand.querySelector('.lobby-to')
  if (!swap || !period || !to) return

  const swapRect = swap.getBoundingClientRect()
  const periodRect = period.getBoundingClientRect()
  const dx =
    swapRect.left + swapRect.width / 2 - (periodRect.left + periodRect.width / 2)
  period.style.setProperty('--nudge-x', `${dx}px`)

  // Measure final name width (to is opacity 0 but still laid out)
  const nameWidth = to.getBoundingClientRect().width
  const ruleWidth = Math.max(72, Math.min(nameWidth * 0.72, 200))
  period.style.setProperty('--rule-width', `${ruleWidth.toFixed(1)}px`)
}

const brand = document.querySelector('.lobby-brand')
if (brand) {
  const layout = () => setBrandMetrics(brand)
  layout()
  brand.classList.add('is-morphed')
  window.addEventListener('resize', layout, { passive: true })
}

const THEME_KEY = 'danmull.in-lobby-theme'

function currentLobbyTheme() {
  const theme = document.documentElement.getAttribute('data-lobby-theme')
  return theme === 'albums' ? 'albums' : 'stickers'
}

function applyLobbyTheme(theme, { persist = true } = {}) {
  const next = theme === 'albums' ? 'albums' : 'stickers'
  document.documentElement.setAttribute('data-lobby-theme', next)

  document.querySelectorAll('.door-art').forEach((img) => {
    const src =
      next === 'albums'
        ? img.getAttribute('data-art-album')
        : img.getAttribute('data-art-sticker')
    const srcset =
      next === 'albums'
        ? img.getAttribute('data-art-album-srcset')
        : img.getAttribute('data-art-sticker-srcset')
    if (src && img.getAttribute('src') !== src) {
      img.setAttribute('src', src)
    }
    if (srcset) img.setAttribute('srcset', srcset)
  })

  const toggle = document.getElementById('lobby-theme-toggle')
  if (toggle) {
    const albums = next === 'albums'
    toggle.setAttribute('aria-pressed', albums ? 'true' : 'false')
    toggle.textContent = albums ? 'Stickers' : 'Album covers'
    toggle.title = albums
      ? 'Switch to neon sticker doors'
      : 'Switch to album-cover doors'
  }

  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch (_) {
      /* ignore */
    }
  }
}

applyLobbyTheme(currentLobbyTheme(), { persist: false })

document.getElementById('lobby-theme-toggle')?.addEventListener('click', () => {
  const next = currentLobbyTheme() === 'albums' ? 'stickers' : 'albums'
  applyLobbyTheme(next)
  try {
    const url = new URL(window.location.href)
    if (next === 'stickers') url.searchParams.delete('theme')
    else url.searchParams.set('theme', next)
    window.history.replaceState({}, '', url)
  } catch (_) {
    /* ignore */
  }
})

const lobby = document.querySelector('.lobby')
if (lobby && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let targetX = 0
  let targetY = 0
  let currentX = 0
  let currentY = 0
  let raf = 0

  const maxShift = 18

  const tick = () => {
    currentX += (targetX - currentX) * 0.08
    currentY += (targetY - currentY) * 0.08
    lobby.style.setProperty('--parallax-x', `${currentX.toFixed(2)}px`)
    lobby.style.setProperty('--parallax-y', `${currentY.toFixed(2)}px`)
    if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
      raf = requestAnimationFrame(tick)
    } else {
      raf = 0
    }
  }

  const requestTick = () => {
    if (!raf) raf = requestAnimationFrame(tick)
  }

  lobby.addEventListener(
    'pointermove',
    (e) => {
      const r = lobby.getBoundingClientRect()
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1
      targetX = nx * maxShift
      targetY = ny * maxShift
      requestTick()
    },
    { passive: true },
  )

  lobby.addEventListener(
    'pointerleave',
    () => {
      targetX = 0
      targetY = 0
      requestTick()
    },
    { passive: true },
  )
}

const yearEl = document.getElementById('y')
if (yearEl) yearEl.textContent = String(new Date().getFullYear())

const contactModal = document.getElementById('contact-modal')
const contactForm = document.getElementById('contact-form')
const contactStatus = document.getElementById('contact-status')
const contactSubmit = document.getElementById('contact-submit')
const CONTACT_ENDPOINT = 'https://formsubmit.co/ajax/danmullin@gmail.com'

function setContactStatus(message, isError = false) {
  if (!contactStatus) return
  contactStatus.hidden = !message
  contactStatus.textContent = message || ''
  contactStatus.classList.toggle('is-error', Boolean(isError))
}

function openContact() {
  if (!contactModal) return
  setContactStatus('')
  if (typeof contactModal.showModal === 'function') {
    contactModal.showModal()
  } else {
    contactModal.setAttribute('open', '')
  }
  const first = contactForm?.querySelector('input[name="email"]')
  first?.focus()
}

function closeContact() {
  if (!contactModal) return
  if (typeof contactModal.close === 'function') {
    contactModal.close()
  } else {
    contactModal.removeAttribute('open')
  }
}

document.querySelectorAll('[data-open-contact]').forEach((el) => {
  el.addEventListener('click', openContact)
})

document.querySelectorAll('[data-close-contact]').forEach((el) => {
  el.addEventListener('click', closeContact)
})

contactModal?.addEventListener('click', (e) => {
  if (e.target === contactModal) closeContact()
})

contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault()
  if (!contactForm || !contactSubmit) return

  const data = new FormData(contactForm)
  if (String(data.get('_honey') || '').trim()) {
    setContactStatus('Thanks — message sent.')
    contactForm.reset()
    return
  }

  const payload = {
    name: String(data.get('name') || '').trim(),
    email: String(data.get('email') || '').trim(),
    message: String(data.get('message') || '').trim(),
    _subject: 'danmull.in contact',
    _captcha: 'false',
    _template: 'table',
  }

  contactSubmit.disabled = true
  setContactStatus('Sending…')

  try {
    const res = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(body.message || 'Send failed')
    }
    setContactStatus('Sent — thanks.')
    contactForm.reset()
  } catch (err) {
    setContactStatus(
      err instanceof Error ? err.message : 'Could not send. Try again in a moment.',
      true,
    )
  } finally {
    contactSubmit.disabled = false
  }
})
