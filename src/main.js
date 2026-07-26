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

const brand = document.querySelector('.lobby-brand')
if (brand) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    brand.classList.add('is-morphed')
  } else {
    window.setTimeout(() => {
      brand.classList.add('is-morphing')
      window.setTimeout(() => {
        brand.classList.add('is-morphed')
        brand.classList.remove('is-morphing')
      }, 1100)
    }, 900)
  }
}
