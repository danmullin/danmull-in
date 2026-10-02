const OUTPUTS = [
  { id: 'png', mime: 'image/png', ext: 'png', lossy: false, label: 'PNG' },
  { id: 'jpeg', mime: 'image/jpeg', ext: 'jpg', lossy: true, label: 'JPEG' },
  { id: 'webp', mime: 'image/webp', ext: 'webp', lossy: true, label: 'WebP' },
  { id: 'avif', mime: 'image/avif', ext: 'avif', lossy: true, label: 'AVIF' },
]

const form = document.querySelector('#convert-form')
const fileInput = document.querySelector('#convert-files')
const drop = document.querySelector('#convert-drop')
const formatSelect = document.querySelector('#convert-format')
const qualityField = document.querySelector('#convert-quality-field')
const qualityInput = document.querySelector('#convert-quality')
const qualityValue = document.querySelector('#convert-quality-value')
const statusEl = document.querySelector('#convert-status')
const resultsEl = document.querySelector('#convert-results')
const downloadAll = document.querySelector('#convert-download-all')

if (form && fileInput && drop && formatSelect && qualityField && qualityInput && qualityValue && statusEl && resultsEl && downloadAll) {
  const outputs = OUTPUTS.filter((format) => supportsMime(format.mime))
  if (!outputs.length) {
    setStatus('This browser cannot write an image from here.')
  } else {
  let files = []
  let previews = []
  let downloads = []
  let job = 0
  let qualityTimer = 0
  let heicLoader = null

  for (const format of outputs) {
    const option = document.createElement('option')
    option.value = format.id
    option.textContent = format.label
    formatSelect.append(option)
  }
  formatSelect.value = outputs.some((format) => format.id === 'webp') ? 'webp' : outputs[0].id
  syncQuality()

  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) setFiles([...fileInput.files])
  })

  drop.addEventListener('dragover', (event) => {
    event.preventDefault()
    drop.classList.add('is-hot')
  })
  drop.addEventListener('dragleave', () => drop.classList.remove('is-hot'))
  drop.addEventListener('drop', (event) => {
    event.preventDefault()
    drop.classList.remove('is-hot')
    const dropped = [...(event.dataTransfer?.files || [])]
    if (dropped.length) setFiles(dropped)
  })

  window.addEventListener('paste', (event) => {
    const pasted = [...(event.clipboardData?.files || [])].filter(isImageFile)
    if (!pasted.length) return
    event.preventDefault()
    setFiles(pasted)
  })

  formatSelect.addEventListener('change', () => {
    syncQuality()
    convert()
  })

  qualityInput.addEventListener('input', () => {
    qualityValue.textContent = qualityInput.value
    window.clearTimeout(qualityTimer)
    qualityTimer = window.setTimeout(convert, 180)
  })

  downloadAll.addEventListener('click', () => {
    for (const item of downloads) saveBlob(item.blob, item.name)
  })

  function setFiles(next) {
    files = next.filter(isImageFile)
    const skipped = next.length - files.length
    if (!files.length) {
      setStatus(skipped ? 'Those files are not images.' : 'Choose an image to convert.')
      render([])
      return
    }
    if (skipped) setStatus(`Skipped ${skipped} file${skipped === 1 ? '' : 's'} that ${skipped === 1 ? 'is' : 'are'} not an image.`)
    convert()
  }

  async function convert() {
    const current = ++job
    const format = outputs.find((item) => item.id === formatSelect.value) || outputs[0]
    const quality = Number(qualityInput.value) / 100
    const rows = []
    if (!files.length) return

    for (let index = 0; index < files.length; index += 1) {
      if (current !== job) return
      const file = files[index]
      setStatus(`Converting ${index + 1} of ${files.length}…`)
      try {
        const bitmaps = await decodeFile(file)
        bitmaps.forEach((bitmap, bitmapIndex) => {
          rows.push({ file, bitmap, bitmapIndex, bitmapCount: bitmaps.length, format, quality })
        })
      } catch (error) {
        rows.push({ file, error: errorText(error) })
      }
    }

    const ready = []
    for (const row of rows) {
      if (current !== job) {
        releaseBitmaps(rows)
        return
      }
      if (row.error) {
        ready.push(row)
        continue
      }
      try {
        const blob = await encodeBitmap(row.bitmap, row.format.mime, row.quality)
        const name = outputName(row.file.name, row.format.ext, row.bitmapIndex, row.bitmapCount)
        ready.push({
          ...row,
          blob,
          name,
          width: row.bitmap.width,
          height: row.bitmap.height,
        })
      } catch (error) {
        ready.push({ ...row, error: errorText(error) })
      }
    }
    if (current !== job) {
      releaseBitmaps(rows)
      return
    }
    releaseBitmaps(rows)
    render(ready)
    const failed = ready.filter((row) => row.error).length
    const done = ready.length - failed
    if (!done) setStatus(failed === 1 ? ready[0].error : 'Nothing converted.')
    else if (failed) setStatus(`${done} converted. ${failed} could not.`)
    else setStatus(`${done} converted. Still on this machine.`)
  }

  function render(rows) {
    for (const url of previews) URL.revokeObjectURL(url)
    previews = []
    downloads = []
    resultsEl.replaceChildren()
    downloadAll.hidden = true

    for (const row of rows) {
      const item = document.createElement('li')
      item.className = 'convert-result'
      if (row.error) {
        item.innerHTML = `<p class="convert-result-name"></p><p class="convert-result-meta convert-result-error"></p>`
        item.querySelector('.convert-result-name').textContent = row.file.name
        item.querySelector('.convert-result-meta').textContent = row.error
        resultsEl.append(item)
        continue
      }
      const url = URL.createObjectURL(row.blob)
      previews.push(url)
      downloads.push({ blob: row.blob, name: row.name })
      const preview = document.createElement('img')
      preview.className = 'convert-preview'
      preview.alt = ''
      preview.src = url
      const copy = document.createElement('div')
      copy.className = 'convert-result-copy'
      const name = document.createElement('p')
      name.className = 'convert-result-name'
      name.textContent = row.name
      const meta = document.createElement('p')
      meta.className = 'convert-result-meta'
      meta.textContent = `${row.width}×${row.height} · ${formatBytes(row.file.size)} → ${formatBytes(row.blob.size)}`
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'btn btn-ghost'
      button.textContent = 'Download'
      button.addEventListener('click', () => saveBlob(row.blob, row.name))
      copy.append(name, meta, button)
      item.append(preview, copy)
      resultsEl.append(item)
    }
    downloadAll.hidden = downloads.length < 2
  }

  function syncQuality() {
    const format = outputs.find((item) => item.id === formatSelect.value)
    const lossy = Boolean(format?.lossy)
    qualityField.hidden = !lossy
    qualityValue.textContent = qualityInput.value
  }

  function loadHeic() {
    if (!heicLoader) {
      heicLoader = new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = '/vendor/heic2any.js'
        script.async = true
        script.onload = () => {
          if (typeof window.heic2any === 'function') resolve(window.heic2any)
          else reject(new Error('HEIC decoder loaded without a converter.'))
        }
        script.onerror = () => reject(new Error('HEIC decoder did not load.'))
        document.head.append(script)
      }).catch((error) => {
        heicLoader = null
        throw error
      })
    }
    return heicLoader
  }

  async function decodeFile(file) {
    if (isHeic(file)) {
      const heic2any = await loadHeic()
      const decoded = await heic2any({ blob: file, toType: 'image/png', multiple: true })
      const blobs = Array.isArray(decoded) ? decoded : [decoded]
      return Promise.all(blobs.map((blob) => createImageBitmap(blob)))
    }
    return [await createImageBitmap(file)]
  }
  }
}

function encodeBitmap(bitmap, mime, quality) {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(bitmap, 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('This browser cannot write that format.'))
    }, mime, quality)
  })
}

function supportsMime(mime) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL(mime).startsWith(`data:${mime}`)
  } catch {
    return false
  }
}

function isHeic(file) {
  const type = (file.type || '').toLowerCase()
  return type === 'image/heic' || type === 'image/heif' || /\.heic$|\.heif$/i.test(file.name)
}

function isImageFile(file) {
  if (isHeic(file)) return true
  if ((file.type || '').startsWith('image/')) return true
  return /\.(png|jpe?g|webp|gif|bmp|avif|ico|tiff?)$/i.test(file.name)
}

function outputName(filename, ext, index, count) {
  const stem = filename.replace(/\.[^.]+$/, '') || 'image'
  const suffix = count > 1 ? `-${index + 1}` : ''
  return `${stem}${suffix}.${ext}`
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function errorText(error) {
  const raw = rawError(error)
  if (/ERR_LIBHEIF|format not supported/i.test(raw)) return 'Could not read that HEIC file.'
  return raw
}

function rawError(error) {
  if (!error) return 'Could not convert that file.'
  if (typeof error === 'string') return error
  if (typeof error.message === 'string' && error.message) return error.message
  return 'Could not convert that file.'
}

function releaseBitmaps(rows) {
  for (const row of rows) row.bitmap?.close?.()
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

function setStatus(text) {
  statusEl.textContent = text
}
