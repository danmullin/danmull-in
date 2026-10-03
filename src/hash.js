(function () {
  var text = document.getElementById('hash-text')
  var textBtn = document.getElementById('hash-text-btn')
  var fileInput = document.getElementById('hash-file')
  var drop = document.getElementById('hash-drop')
  var label = document.getElementById('hash-label')
  var out = document.getElementById('hash-out')
  var copyBtn = document.getElementById('hash-copy')
  var status = document.getElementById('hash-status')
  if (!text || !textBtn || !fileInput || !drop || !label || !out || !copyBtn || !status) return

  textBtn.addEventListener('click', function () { hashBytes(new TextEncoder().encode(text.value), 'Text · UTF-8') })
  text.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      hashBytes(new TextEncoder().encode(text.value), 'Text · UTF-8')
    }
  })
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) hashFile(fileInput.files[0])
  })
  drop.addEventListener('dragover', function (event) {
    event.preventDefault()
    drop.classList.add('is-hot')
  })
  drop.addEventListener('dragleave', function () { drop.classList.remove('is-hot') })
  drop.addEventListener('drop', function (event) {
    event.preventDefault()
    drop.classList.remove('is-hot')
    var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]
    if (file) hashFile(file)
  })
  copyBtn.addEventListener('click', function () {
    if (!out.textContent || !navigator.clipboard) {
      status.textContent = 'Could not copy.'
      return
    }
    navigator.clipboard.writeText(out.textContent).then(function () {
      status.textContent = 'Copied.'
    }, function () {
      status.textContent = 'Could not copy.'
    })
  })

  async function hashFile(file) {
    status.textContent = 'Hashing…'
    var bytes = new Uint8Array(await file.arrayBuffer())
    await hashBytes(bytes, file.name + ' · ' + bytes.length + ' bytes')
  }

  async function hashBytes(bytes, caption) {
    var digest = await crypto.subtle.digest('SHA-256', bytes)
    var hex = [].map.call(new Uint8Array(digest), function (byte) {
      return byte.toString(16).padStart(2, '0')
    }).join('')
    label.textContent = caption
    out.textContent = hex
    copyBtn.hidden = false
    status.textContent = 'SHA-256. Still on this machine.'
  }
})()
