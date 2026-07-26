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

function setPeriodNudge(brand) {
  const swap = brand.querySelector('.lobby-brand-swap')
  const period = brand.querySelector('.lobby-period')
  if (!swap || !period) return
  const swapRect = swap.getBoundingClientRect()
  const periodRect = period.getBoundingClientRect()
  const dx =
    swapRect.left + swapRect.width / 2 - (periodRect.left + periodRect.width / 2)
  period.style.setProperty('--nudge-x', `${dx}px`)
}

const brand = document.querySelector('.lobby-brand')
if (brand) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  setPeriodNudge(brand)
  if (reduce) {
    brand.classList.add('is-morphed')
  } else {
    window.setTimeout(() => {
      setPeriodNudge(brand)
      brand.classList.add('is-morphing')
      window.setTimeout(() => {
        brand.classList.add('is-morphed')
        brand.classList.remove('is-morphing')
      }, 1200)
    }, 900)
  }
}
