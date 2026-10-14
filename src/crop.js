(function () {
  var OUTPUTS = [
    { id: 'png', mime: 'image/png', ext: 'png', lossy: false, label: 'PNG' },
    { id: 'jpeg', mime: 'image/jpeg', ext: 'jpg', lossy: true, label: 'JPEG' },
    { id: 'webp', mime: 'image/webp', ext: 'webp', lossy: true, label: 'WebP' },
  ]

  var form = document.getElementById('crop-form')
  var fileInput = document.getElementById('crop-file')
  var drop = document.getElementById('crop-drop')
  var stage = document.getElementById('crop-stage')
  var image = document.getElementById('crop-image')
  var box = document.getElementById('crop-box')
  var xInput = document.getElementById('crop-x')
  var yInput = document.getElementById('crop-y')
  var widthInput = document.getElementById('crop-width')
  var heightInput = document.getElementById('crop-height')
  var angleInput = document.getElementById('crop-angle')
  var aspectSelect = document.getElementById('crop-aspect')
  var formatSelect = document.getElementById('crop-format')
  var qualityField = document.getElementById('crop-quality-field')
  var qualityInput = document.getElementById('crop-quality')
  var qualityValue = document.getElementById('crop-quality-value')
  var go = document.getElementById('crop-go')
  var statusEl = document.getElementById('crop-status')
  var resultsEl = document.getElementById('crop-results')
  if (!form || !fileInput || !drop || !stage || !image || !box || !xInput || !yInput || !widthInput || !heightInput || !angleInput || !aspectSelect || !formatSelect || !qualityField || !qualityInput || !qualityValue || !go || !statusEl || !resultsEl) return

  var outputs = OUTPUTS.filter(function (format) { return supportsMime(format.mime) })
  var bitmap = null
  var file = null
  var crop = { x: 0, y: 0, w: 1, h: 1, a: 0 }
  var rotateHandle = box.querySelector('[data-handle="rotate"]')
  var previewUrl = ''
  var sourceUrl = ''
  var heicLoader = null
  var drag = null
  var typing = false

  outputs.forEach(function (format) {
    var option = document.createElement('option')
    option.value = format.id
    option.textContent = format.label
    formatSelect.append(option)
  })
  if (outputs.some(function (format) { return format.id === 'png' })) formatSelect.value = 'png'
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
    var imageFile = null
    for (var i = 0; i < files.length; i += 1) {
      if (isImageFile(files[i])) imageFile = files[i]
    }
    if (!imageFile) return
    event.preventDefault()
    loadFile(imageFile)
  })

  ;[xInput, yInput, widthInput, heightInput].forEach(function (input) {
    input.addEventListener('input', function () {
      if (!bitmap || typing) return
      var next = {
        x: Math.round(Number(xInput.value)) || 0,
        y: Math.round(Number(yInput.value)) || 0,
        w: Math.max(1, Math.round(Number(widthInput.value)) || 1),
        h: Math.max(1, Math.round(Number(heightInput.value)) || 1),
        a: crop.a || 0,
      }
      if (next.a) {
        crop = constrainMotion(crop, withAspect(next, currentAspect()))
      } else {
        crop = fitRect(next, currentAspect(), 'se')
        crop.a = 0
      }
      placeBox()
      writeFields()
    })
  })
  angleInput.addEventListener('input', function () {
    if (!bitmap || typing) return
    var deg = Number(angleInput.value)
    if (!Number.isFinite(deg)) return
    crop = clampAngle(crop, deg * Math.PI / 180)
    placeBox()
    writeFields()
  })
  aspectSelect.addEventListener('change', function () {
    if (!bitmap) return
    if (crop.a) crop = constrainMotion(crop, withAspect(crop, currentAspect()))
    else {
      crop = fitRect(crop, currentAspect(), 'se')
      crop.a = 0
    }
    placeBox()
    writeFields()
  })
  formatSelect.addEventListener('change', syncQuality)
  qualityInput.addEventListener('input', function () { qualityValue.textContent = qualityInput.value })
  window.addEventListener('resize', placeBox)
  box.addEventListener('pointerdown', onPointerDown)
  form.addEventListener('submit', function (event) {
    event.preventDefault()
    exportCrop()
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
      window.__cropBitmapWidth = bitmap.width
      window.__cropBitmapHeight = bitmap.height
      decoded.slice(1).forEach(function (extra) { extra.close && extra.close() })
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
      sourceUrl = URL.createObjectURL(next.type && next.type.startsWith('image/') && !isHeic(next) ? next : await bitmapToPng(bitmap))
      image.src = sourceUrl
      await image.decode()
      crop = fitRect({ x: 0, y: 0, w: bitmap.width, h: bitmap.height, a: 0 }, currentAspect(), 'se')
      crop.a = 0
      stage.hidden = false
      placeBox()
      writeFields()
      go.disabled = false
      statusEl.textContent = bitmap.width + '×' + bitmap.height + '. Drag or rotate the box, then crop.'
    } catch (error) {
      file = null
      stage.hidden = true
      statusEl.textContent = errorText(error)
    }
  }

  function onPointerDown(event) {
    if (!bitmap || event.button != null && event.button !== 0) return
    var handle = event.target && event.target.getAttribute && event.target.getAttribute('data-handle')
    drag = {
      pointer: event.pointerId,
      handle: handle || 'move',
      startX: event.clientX,
      startY: event.clientY,
      crop: { x: crop.x, y: crop.y, w: crop.w, h: crop.h, a: crop.a || 0 },
    }
    box.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  box.addEventListener('pointermove', function (event) {
    if (!drag || event.pointerId !== drag.pointer || !bitmap) return
    var scale = displayScale()
    if (!scale) return
    var dx = (event.clientX - drag.startX) / scale
    var dy = (event.clientY - drag.startY) / scale
    var base = drag.crop
    if (drag.handle === 'rotate') {
      var bounds = image.getBoundingClientRect()
      var cx = bounds.left + (base.x + base.w / 2) * scale
      var cy = bounds.top + (base.y + base.h / 2) * scale
      var start = Math.atan2(drag.startY - cy, drag.startX - cx)
      var now = Math.atan2(event.clientY - cy, event.clientX - cx)
      var delta = Math.atan2(Math.sin(now - start), Math.cos(now - start))
      crop = clampAngle(base, (base.a || 0) + delta)
    } else if (base.a) {
      var proposed
      if (drag.handle === 'move') {
        proposed = { x: base.x + dx, y: base.y + dy, w: base.w, h: base.h, a: base.a }
      } else {
        var radians = base.a
        var ldx = dx * Math.cos(radians) + dy * Math.sin(radians)
        var ldy = -dx * Math.sin(radians) + dy * Math.cos(radians)
        proposed = localResize(base, drag.handle, ldx, ldy, currentAspect())
      }
      crop = constrainMotion(base, proposed)
    } else {
      var next = { x: base.x, y: base.y, w: base.w, h: base.h, a: 0 }
      if (drag.handle === 'move') {
        next.x += dx
        next.y += dy
      } else {
        if (drag.handle.indexOf('e') !== -1) next.w += dx
        if (drag.handle.indexOf('s') !== -1) next.h += dy
        if (drag.handle.indexOf('w') !== -1) {
          next.x += dx
          next.w -= dx
        }
        if (drag.handle.indexOf('n') !== -1) {
          next.y += dy
          next.h -= dy
        }
      }
      crop = fitRect(next, currentAspect(), drag.handle)
      crop.a = 0
    }
    placeBox()
    writeFields()
  })
  box.addEventListener('pointerup', endDrag)
  box.addEventListener('pointercancel', endDrag)

  function endDrag(event) {
    if (!drag || event.pointerId !== drag.pointer) return
    drag = null
  }

  async function exportCrop() {
    if (!bitmap || !file) {
      statusEl.textContent = 'Choose an image first.'
      return
    }
    var format = outputs.find(function (item) { return item.id === formatSelect.value }) || outputs[0]
    if (!format) {
      statusEl.textContent = 'This browser cannot write an image from here.'
      return
    }
    var rect = {
      x: Math.round(Number(xInput.value)) || 0,
      y: Math.round(Number(yInput.value)) || 0,
      w: Math.max(1, Math.round(Number(widthInput.value)) || 1),
      h: Math.max(1, Math.round(Number(heightInput.value)) || 1),
      a: crop.a || 0,
    }
    if (rect.a) rect = constrainMotion(crop, withAspect(rect, currentAspect()))
    else {
      rect = fitRect(rect, currentAspect(), 'se')
      rect.a = 0
    }
    crop = rect
    var width = Math.max(1, Math.round(rect.w))
    var height = Math.max(1, Math.round(rect.h))
    var canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    var ctx = canvas.getContext('2d')
    if (format.mime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
    }
    var centerX = rect.x + rect.w / 2
    var centerY = rect.y + rect.h / 2
    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.rotate(-(rect.a || 0))
    ctx.translate(-centerX, -centerY)
    ctx.drawImage(bitmap, 0, 0)
    ctx.restore()
    var blob = await new Promise(function (resolve, reject) {
      canvas.toBlob(function (out) {
        if (out) resolve(out)
        else reject(new Error('This browser cannot write that format.'))
      }, format.mime, Number(qualityInput.value) / 100)
    })
    var name = outputName(file.name, width, height, format.ext)
    render(blob, name, width, height)
    statusEl.textContent = 'Cropped to ' + width + '×' + height + '. Still on this machine.'
  }

  function currentAspect() {
    var value = aspectSelect.value
    if (value === 'free') return 0
    var ratio = Number(value)
    return Number.isFinite(ratio) && ratio > 0 ? ratio : 0
  }

  function displayScale() {
    if (!bitmap || !image.clientWidth) return 0
    return image.clientWidth / bitmap.width
  }

  function placeBox() {
    var scale = displayScale()
    if (!scale) return
    box.style.left = (crop.x * scale) + 'px'
    box.style.top = (crop.y * scale) + 'px'
    box.style.width = Math.max(1, crop.w * scale) + 'px'
    box.style.height = Math.max(1, crop.h * scale) + 'px'
    box.style.transform = 'rotate(' + ((crop.a || 0) * 180 / Math.PI) + 'deg)'
    if (rotateHandle) {
      var room = canRotate(crop)
      rotateHandle.classList.toggle('is-stuck', !room)
      rotateHandle.title = room ? 'Rotate' : 'No room to rotate'
    }
  }

  function writeFields() {
    typing = true
    xInput.value = String(Math.round(crop.x))
    yInput.value = String(Math.round(crop.y))
    widthInput.value = String(Math.max(1, Math.round(crop.w)))
    heightInput.value = String(Math.max(1, Math.round(crop.h)))
    angleInput.value = String(displayDegrees(crop.a || 0))
    typing = false
  }

  function localResize(base, handle, ldx, ldy, aspect) {
    var left = -base.w / 2
    var right = base.w / 2
    var top = -base.h / 2
    var bottom = base.h / 2
    if (handle.indexOf('e') !== -1) right += ldx
    if (handle.indexOf('w') !== -1) left += ldx
    if (handle.indexOf('s') !== -1) bottom += ldy
    if (handle.indexOf('n') !== -1) top += ldy
    if (right - left < 1) {
      if (handle.indexOf('w') !== -1) left = right - 1
      else right = left + 1
    }
    if (bottom - top < 1) {
      if (handle.indexOf('n') !== -1) top = bottom - 1
      else bottom = top + 1
    }
    var w = right - left
    var h = bottom - top
    if (aspect) {
      if (handle === 'n' || handle === 's') {
        w = Math.max(1, h * aspect)
        var midX = (left + right) / 2
        left = midX - w / 2
        right = midX + w / 2
      } else if (handle === 'e' || handle === 'w') {
        h = Math.max(1, w / aspect)
        var midY = (top + bottom) / 2
        top = midY - h / 2
        bottom = midY + h / 2
      } else {
        h = Math.max(1, w / aspect)
        w = h * aspect
        if (handle.indexOf('e') !== -1) left = right - w
        else right = left + w
        if (handle.indexOf('s') !== -1) bottom = top + h
        else top = bottom - h
      }
    }
    var lx = (left + right) / 2
    var ly = (top + bottom) / 2
    var angle = base.a || 0
    var cos = Math.cos(angle)
    var sin = Math.sin(angle)
    var cx = base.x + base.w / 2 + lx * cos - ly * sin
    var cy = base.y + base.h / 2 + lx * sin + ly * cos
    return { x: cx - w / 2, y: cy - h / 2, w: w, h: h, a: angle }
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
    window.__cropBitmapWidth = 0
    window.__cropBitmapHeight = 0
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

  async function bitmapToPng(source) {
    var canvas = document.createElement('canvas')
    canvas.width = source.width
    canvas.height = source.height
    canvas.getContext('2d').drawImage(source, 0, 0)
    return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png') })
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

function fitRect(rect, aspect, handle) {
  var maxW = 8192
  var maxH = 8192
  var limitW = Math.min(bitmapWidth(), maxW)
  var limitH = Math.min(bitmapHeight(), maxH)
  var x = rect.x
  var y = rect.y
  var w = Math.max(1, rect.w)
  var h = Math.max(1, rect.h)
  var anchorRight = handle === 'move' ? false : handle.indexOf('w') !== -1
  var anchorBottom = handle === 'move' ? false : handle.indexOf('n') !== -1
  var right = x + w
  var bottom = y + h

  if (aspect) {
    if (handle === 'n' || handle === 's') w = h * aspect
    else if (handle === 'e' || handle === 'w') h = w / aspect
    else if (handle !== 'move') {
      if (Math.abs(w - h * aspect) > 0) h = w / aspect
    } else if (Math.abs(w / h - aspect) > 0.001) {
      h = w / aspect
    }
    if (w > limitW) {
      w = limitW
      h = w / aspect
    }
    if (h > limitH) {
      h = limitH
      w = h * aspect
    }
  }

  w = Math.max(1, Math.min(w, limitW))
  h = Math.max(1, Math.min(h, limitH))
  if (anchorRight) x = right - w
  if (anchorBottom) y = bottom - h
  x = Math.max(0, Math.min(x, limitW - w))
  y = Math.max(0, Math.min(y, limitH - h))
  if (x + w > limitW) w = limitW - x
  if (y + h > limitH) h = limitH - y
  return { x: x, y: y, w: Math.max(1, w), h: Math.max(1, h), a: rect.a || 0 }
}

function withAspect(rect, aspect) {
  var next = { x: rect.x, y: rect.y, w: Math.max(1, rect.w), h: Math.max(1, rect.h), a: rect.a || 0 }
  if (!aspect) return next
  var cx = rect.x + rect.w / 2
  var cy = rect.y + rect.h / 2
  next.h = next.w / aspect
  next.x = cx - next.w / 2
  next.y = cy - next.h / 2
  return next
}

function rotatedCorners(rect) {
  var angle = rect.a || 0
  var cx = rect.x + rect.w / 2
  var cy = rect.y + rect.h / 2
  var hw = rect.w / 2
  var hh = rect.h / 2
  var cos = Math.cos(angle)
  var sin = Math.sin(angle)
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(function (point) {
    return [cx + point[0] * cos - point[1] * sin, cy + point[0] * sin + point[1] * cos]
  })
}

function cornersFit(rect) {
  var limitW = Math.min(bitmapWidth(), 8192)
  var limitH = Math.min(bitmapHeight(), 8192)
  return rotatedCorners(rect).every(function (point) {
    return point[0] >= -0.25 && point[1] >= -0.25 && point[0] <= limitW + 0.25 && point[1] <= limitH + 0.25
  })
}

function lerpRect(from, to, t) {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    w: from.w + (to.w - from.w) * t,
    h: from.h + (to.h - from.h) * t,
    a: (from.a || 0) + ((to.a || 0) - (from.a || 0)) * t,
  }
}

function constrainMotion(from, to) {
  if (cornersFit(to)) return to
  var best = from
  var lo = 0
  var hi = 1
  for (var i = 0; i < 20; i += 1) {
    var t = (lo + hi) / 2
    var mid = lerpRect(from, to, t)
    if (cornersFit(mid)) {
      best = mid
      lo = t
    } else hi = t
  }
  return best
}

function clampAngle(base, desired) {
  var next = { x: base.x, y: base.y, w: base.w, h: base.h, a: desired }
  if (cornersFit(next)) return next
  var best = base.a || 0
  var lo = 0
  var hi = 1
  for (var i = 0; i < 20; i += 1) {
    var t = (lo + hi) / 2
    var mid = (base.a || 0) + (desired - (base.a || 0)) * t
    if (cornersFit({ x: base.x, y: base.y, w: base.w, h: base.h, a: mid })) {
      best = mid
      lo = t
    } else hi = t
  }
  return { x: base.x, y: base.y, w: base.w, h: base.h, a: best }
}

function canRotate(rect) {
  var step = 2 * Math.PI / 180
  var angle = rect.a || 0
  return cornersFit({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, a: angle + step })
    || cornersFit({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, a: angle - step })
}

function displayDegrees(radians) {
  var degrees = radians * 180 / Math.PI
  degrees = ((degrees + 180) % 360 + 360) % 360 - 180
  return Math.round(degrees)
}

function bitmapWidth() {
  return window.__cropBitmapWidth || 8192
}

function bitmapHeight() {
  return window.__cropBitmapHeight || 8192
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
  return stem + '-crop-' + width + 'x' + height + '.' + ext
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
