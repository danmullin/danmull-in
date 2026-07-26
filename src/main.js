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
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  setBrandMetrics(brand)
  if (reduce) {
    brand.classList.add('is-morphed')
  } else {
    window.setTimeout(() => {
      setBrandMetrics(brand)
      brand.classList.add('is-morphing')
      window.setTimeout(() => {
        brand.classList.add('is-morphed')
        brand.classList.remove('is-morphing')
      }, 1200)
    }, 900)
  }
}

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
