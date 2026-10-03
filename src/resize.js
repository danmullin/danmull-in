(function () {
  var OUTPUTS = [
    { id: 'png', mime: 'image/png', ext: 'png', lossy: false, label: 'PNG' },
    { id: 'jpeg', mime: 'image/jpeg', ext: 'jpg', lossy: true, label: 'JPEG' },
    { id: 'webp', mime: 'image/webp', ext: 'webp', lossy: true, label: 'WebP' },
  ]

  var form = document.getElementById('resize-form')
  var fileInput = document.getElementById('resize-file')
  var drop = document.getElementById('resize-drop')
  var widthInput = document.getElementById('resize-width')
  var heightInput = document.getElementById('resize-height')
  var lock = document.getElementById('resize-lock')
  var formatSelect = document.getElementById('resize-format')
  var qualityField = document.getElementById('resize-quality-field')
  var qualityInput = document.getElementById('resize-quality')
  var qualityValue = document.getElementById('resize-quality-value')
  var go = document.getElementById('resize-go')
  var statusEl = document.getElementById('resize-status')
  var resultsEl = document.getElementById('resize-results')
  if (!form || !fileInput || !drop || !widthInput || !heightInput || !lock || !formatSelect || !qualityField || !qualityInput || !qualityValue || !go || !statusEl || !resultsEl) return

  var outputs = OUTPUTS.filter(function (format) { return supportsMime(format.mime) })
  var bitmap = null
  var file = null
  var aspect = 1
  var syncing = false
  var previewUrl = ''
  var heicLoader = null

  outputs.forEach(function (format) {
    var option = document.createElement('option')
    option.value = format.id
    option.textContent = format.label
    formatSelect.append(option)
  })
  if (outputs.some(function (format) { return format.id === 'webp' })) formatSelect.value = 'webp'
  syncQuality()

  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) loadFile(fileInput.files[0])
  })
  drop.addEventListener('dragover', function (event) {
    event.preventDefault()
    drop.classList.add('is-hot')
  })
  drop.addEventListener('dragleave', function () { drop.classList.remove('is-hot') })
  drop.addEventListener('drop', function (event) {
    event.preventDefault()
    drop.classList.remove('is-hot')
    var dropped = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]
    if (dropped) loadFile(dropped)
  })
  window.addEventListener('paste', function (event) {
    var files = event.clipboardData && event.clipboardData.files
    if (!files || !files.length) return
    var image = null
    for (var i = 0; i < files.length; i += 1) {
      if (isImageFile(files[i])) image = files[i]
    }
    if (!image) return
    event.preventDefault()
    loadFile(image)
  })

  widthInput.addEventListener('input', function () {
    if (syncing || !lock.checked || !aspect) return
    syncing = true
    var width = clamp(widthInput.value)
    if (width) heightInput.value = String(clamp(Math.round(width / aspect)))
    syncing = false
  })
  heightInput.addEventListener('input', function () {
    if (syncing || !lock.checked || !aspect) return
    syncing = true
    var height = clamp(heightInput.value)
    if (height) widthInput.value = String(clamp(Math.round(height * aspect)))
    syncing = false
  })
  formatSelect.addEventListener('change', syncQuality)
  qualityInput.addEventListener('input', function () { qualityValue.textContent = qualityInput.value })
  form.addEventListener('submit', function (event) {
    event.preventDefault()
    resize()
  })

  async function loadFile(next) {
    if (!isImageFile(next)) {
      statusEl.textContent = 'That file is not an image.'
      return
    }
    closeBitmap()
    file = next
    go.disabled = true
    statusEl.textContent = 'Reading…'
    try {
      var decoded = await decodeFile(next)
      bitmap = decoded[0]
      decoded.slice(1).forEach(function (extra) { extra.close && extra.close() })
      aspect = bitmap.width / bitmap.height
      widthInput.value = String(bitmap.width)
      heightInput.value = String(bitmap.height)
      go.disabled = false
      statusEl.textContent = bitmap.width + '×' + bitmap.height + '. Set a size, then resize.'
    } catch (error) {
      file = null
      statusEl.textContent = errorText(error)
    }
  }

  async function resize() {
    if (!bitmap || !file) {
      statusEl.textContent = 'Choose an image first.'
      return
    }
    var width = clamp(widthInput.value)
    var height = clamp(heightInput.value)
    if (!width || !height) {
      statusEl.textContent = 'Width and height need to be at least 1.'
      return
    }
    var format = outputs.find(function (item) { return item.id === formatSelect.value }) || outputs[0]
    if (!format) {
      statusEl.textContent = 'This browser cannot write an image from here.'
      return
    }
    var canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    var ctx = canvas.getContext('2d')
    if (format.mime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    var blob = await new Promise(function (resolve, reject) {
      canvas.toBlob(function (out) {
        if (out) resolve(out)
        else reject(new Error('This browser cannot write that format.'))
      }, format.mime, Number(qualityInput.value) / 100)
    })
    var name = outputName(file.name, width, height, format.ext)
    render(blob, name, width, height)
    var capped = Number(widthInput.value) > 8192 || Number(heightInput.value) > 8192
    statusEl.textContent = (capped ? 'Capped at 8192 px on a side. ' : '') + 'Still on this machine.'
  }

  function render(blob, name, width, height) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = URL.createObjectURL(blob)
    resultsEl.replaceChildren()
    var item = document.createElement('li')
    item.className = 'convert-result'
    var preview = document.createElement('img')
    preview.className = 'convert-preview'
    preview.alt = ''
    preview.src = previewUrl
    var copy = document.createElement('div')
    copy.className = 'convert-result-copy'
    var title = document.createElement('p')
    title.className = 'convert-result-name'
    title.textContent = name
    var meta = document.createElement('p')
    meta.className = 'convert-result-meta'
    meta.textContent = width + '×' + height + ' · ' + formatBytes(file.size) + ' → ' + formatBytes(blob.size)
    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'btn btn-ghost'
    button.textContent = 'Download'
    button.addEventListener('click', function () { saveBlob(blob, name) })
    copy.append(title, meta, button)
    item.append(preview, copy)
    resultsEl.append(item)
  }

  function syncQuality() {
    var format = outputs.find(function (item) { return item.id === formatSelect.value })
    qualityField.hidden = !format || !format.lossy
    qualityValue.textContent = qualityInput.value
  }

  function closeBitmap() {
    if (bitmap && bitmap.close) bitmap.close()
    bitmap = null
  }

  function loadHeic() {
    if (!heicLoader) {
      heicLoader = new Promise(function (resolve, reject) {
        var script = document.createElement('script')
        script.src = '/vendor/heic2any.js'
        script.async = true
        script.onload = function () {
          if (typeof window.heic2any === 'function') resolve(window.heic2any)
          else reject(new Error('HEIC decoder loaded without a converter.'))
        }
        script.onerror = function () { reject(new Error('HEIC decoder did not load.')) }
        document.head.append(script)
      }).catch(function (error) {
        heicLoader = null
        throw error
      })
    }
    return heicLoader
  }

  async function decodeFile(next) {
    if (isHeic(next)) {
      var heic2any = await loadHeic()
      var decoded = await heic2any({ blob: next, toType: 'image/png', multiple: true })
      var blobs = Array.isArray(decoded) ? decoded : [decoded]
      return Promise.all(blobs.map(function (blob) { return createImageBitmap(blob) }))
    }
    return [await createImageBitmap(next)]
  }
})()

function supportsMime(mime) {
  try {
    var canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL(mime).startsWith('data:' + mime)
  } catch (error) {
    return false
  }
}

function clamp(value) {
  var n = Math.round(Number(value))
  if (!Number.isFinite(n) || n < 1) return 0
  return Math.min(8192, n)
}

function isHeic(file) {
  var type = (file.type || '').toLowerCase()
  return type === 'image/heic' || type === 'image/heif' || /\.heic$|\.heif$/i.test(file.name)
}

function isImageFile(file) {
  if (isHeic(file)) return true
  if ((file.type || '').startsWith('image/')) return true
  return /\.(png|jpe?g|webp|gif|bmp|avif|ico|tiff?)$/i.test(file.name)
}

function outputName(filename, width, height, ext) {
  var stem = filename.replace(/\.[^.]+$/, '') || 'image'
  return stem + '-' + width + 'x' + height + '.' + ext
}

function formatBytes(size) {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}

function errorText(error) {
  var raw = !error ? 'Could not read that file.' : typeof error === 'string' ? error : error.message || 'Could not read that file.'
  if (/ERR_LIBHEIF|format not supported/i.test(raw)) return 'Could not read that HEIC file.'
  return raw
}

function saveBlob(blob, name) {
  var url = URL.createObjectURL(blob)
  var link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(function () { URL.revokeObjectURL(url) }, 1500)
}
