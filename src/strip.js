(function () {
  var OUTPUTS = [
    { id: 'jpeg', mime: 'image/jpeg', ext: 'jpg', lossy: true, label: 'JPEG' },
    { id: 'png', mime: 'image/png', ext: 'png', lossy: false, label: 'PNG' },
    { id: 'webp', mime: 'image/webp', ext: 'webp', lossy: true, label: 'WebP' },
  ]

  var form = document.getElementById('strip-form')
  var fileInput = document.getElementById('strip-files')
  var drop = document.getElementById('strip-drop')
  var formatSelect = document.getElementById('strip-format')
  var qualityField = document.getElementById('strip-quality-field')
  var qualityInput = document.getElementById('strip-quality')
  var qualityValue = document.getElementById('strip-quality-value')
  var statusEl = document.getElementById('strip-status')
  var resultsEl = document.getElementById('strip-results')
  var downloadAll = document.getElementById('strip-download-all')
  if (!form || !fileInput || !drop || !formatSelect || !qualityField || !qualityInput || !qualityValue || !statusEl || !resultsEl || !downloadAll) return

  var outputs = OUTPUTS.filter(function (format) { return supportsMime(format.mime) })
  var files = []
  var previews = []
  var downloads = []
  var job = 0
  var heicLoader = null

  outputs.forEach(function (format) {
    var option = document.createElement('option')
    option.value = format.id
    option.textContent = format.label
    formatSelect.append(option)
  })
  if (outputs.some(function (format) { return format.id === 'jpeg' })) formatSelect.value = 'jpeg'
  syncQuality()

  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files.length) setFiles([].slice.call(fileInput.files))
  })
  drop.addEventListener('dragover', function (event) {
    event.preventDefault()
    drop.classList.add('is-hot')
  })
  drop.addEventListener('dragleave', function () { drop.classList.remove('is-hot') })
  drop.addEventListener('drop', function (event) {
    event.preventDefault()
    drop.classList.remove('is-hot')
    var dropped = [].slice.call((event.dataTransfer && event.dataTransfer.files) || [])
    if (dropped.length) setFiles(dropped)
  })
  window.addEventListener('paste', function (event) {
    var pasted = [].slice.call((event.clipboardData && event.clipboardData.files) || []).filter(isImageFile)
    if (!pasted.length) return
    event.preventDefault()
    setFiles(pasted)
  })
  formatSelect.addEventListener('change', function () {
    syncQuality()
    strip()
  })
  var qualityTimer = 0
  qualityInput.addEventListener('input', function () {
    qualityValue.textContent = qualityInput.value
    window.clearTimeout(qualityTimer)
    qualityTimer = window.setTimeout(strip, 180)
  })
  downloadAll.addEventListener('click', function () {
    downloads.forEach(function (item) { saveBlob(item.blob, item.name) })
  })

  function setFiles(next) {
    files = next.filter(isImageFile)
    if (!files.length) {
      statusEl.textContent = 'Those files are not images.'
      render([])
      return
    }
    strip()
  }

  async function strip() {
    var current = ++job
    var format = outputs.find(function (item) { return item.id === formatSelect.value }) || outputs[0]
    if (!format || !files.length) return
    var ready = []
    for (var index = 0; index < files.length; index += 1) {
      if (current !== job) return
      var file = files[index]
      statusEl.textContent = 'Redrawing ' + (index + 1) + ' of ' + files.length + '…'
      try {
        var decoded = await decodeFile(file)
        var bitmap = decoded[0]
        var width = bitmap.width
        var height = bitmap.height
        var canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        var ctx = canvas.getContext('2d')
        if (format.mime === 'image/jpeg') {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, width, height)
        }
        ctx.drawImage(bitmap, 0, 0)
        decoded.forEach(function (item) { item.close && item.close() })
        var blob = await new Promise(function (resolve, reject) {
          canvas.toBlob(function (out) {
            if (out) resolve(out)
            else reject(new Error('This browser cannot write that format.'))
          }, format.mime, Number(qualityInput.value) / 100)
        })
        ready.push({
          file: file,
          blob: blob,
          name: cleanName(file.name, format.ext),
          width: width,
          height: height,
        })
      } catch (error) {
        ready.push({ file: file, error: errorText(error) })
      }
    }
    if (current !== job) return
    render(ready)
    var failed = ready.filter(function (row) { return row.error }).length
    var done = ready.length - failed
    if (!done) statusEl.textContent = failed === 1 ? ready[0].error : 'Nothing redrawn.'
    else statusEl.textContent = done + ' redrawn. Metadata was left behind.'
  }

  function render(rows) {
    previews.forEach(function (url) { URL.revokeObjectURL(url) })
    previews = []
    downloads = []
    resultsEl.replaceChildren()
    downloadAll.hidden = true
    rows.forEach(function (row) {
      var item = document.createElement('li')
      item.className = 'convert-result'
      if (row.error) {
        var name = document.createElement('p')
        name.className = 'convert-result-name'
        name.textContent = row.file.name
        var meta = document.createElement('p')
        meta.className = 'convert-result-meta convert-result-error'
        meta.textContent = row.error
        item.append(name, meta)
        resultsEl.append(item)
        return
      }
      var url = URL.createObjectURL(row.blob)
      previews.push(url)
      downloads.push({ blob: row.blob, name: row.name })
      var preview = document.createElement('img')
      preview.className = 'convert-preview'
      preview.alt = ''
      preview.src = url
      var copy = document.createElement('div')
      copy.className = 'convert-result-copy'
      var title = document.createElement('p')
      title.className = 'convert-result-name'
      title.textContent = row.name
      var info = document.createElement('p')
      info.className = 'convert-result-meta'
      info.textContent = row.width + '×' + row.height + ' · ' + formatBytes(row.file.size) + ' → ' + formatBytes(row.blob.size)
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'btn btn-ghost'
      button.textContent = 'Download'
      button.addEventListener('click', function () { saveBlob(row.blob, row.name) })
      copy.append(title, info, button)
      item.append(preview, copy)
      resultsEl.append(item)
    })
    downloadAll.hidden = downloads.length < 2
  }

  function syncQuality() {
    var format = outputs.find(function (item) { return item.id === formatSelect.value })
    qualityField.hidden = !format || !format.lossy
    qualityValue.textContent = qualityInput.value
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

  async function decodeFile(file) {
    if (isHeic(file)) {
      var heic2any = await loadHeic()
      var decoded = await heic2any({ blob: file, toType: 'image/png', multiple: true })
      var blobs = Array.isArray(decoded) ? decoded : [decoded]
      return Promise.all(blobs.map(function (blob) { return createImageBitmap(blob) }))
    }
    return [await createImageBitmap(file)]
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

function isHeic(file) {
  var type = (file.type || '').toLowerCase()
  return type === 'image/heic' || type === 'image/heif' || /\.heic$|\.heif$/i.test(file.name)
}

function isImageFile(file) {
  if (isHeic(file)) return true
  if ((file.type || '').startsWith('image/')) return true
  return /\.(png|jpe?g|webp|gif|bmp|avif|ico|tiff?)$/i.test(file.name)
}

function cleanName(filename, ext) {
  var stem = filename.replace(/\.[^.]+$/, '') || 'image'
  return stem + '-clean.' + ext
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
