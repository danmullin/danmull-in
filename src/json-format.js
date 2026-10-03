(function () {
  var text = document.getElementById('json-text')
  var formatBtn = document.getElementById('json-format')
  var minifyBtn = document.getElementById('json-minify')
  var copyBtn = document.getElementById('json-copy')
  var status = document.getElementById('json-status')
  if (!text || !formatBtn || !minifyBtn || !copyBtn || !status) return

  formatBtn.addEventListener('click', function () { run(2) })
  minifyBtn.addEventListener('click', function () { run(0) })
  copyBtn.addEventListener('click', function () {
    if (!text.value || !navigator.clipboard) {
      status.textContent = 'Could not copy.'
      return
    }
    navigator.clipboard.writeText(text.value).then(function () {
      status.textContent = 'Copied.'
    }, function () {
      status.textContent = 'Could not copy.'
    })
  })

  function run(space) {
    var raw = text.value
    if (!raw.trim()) {
      status.textContent = 'Paste some JSON first.'
      copyBtn.disabled = true
      return
    }
    try {
      var value = JSON.parse(raw)
      text.value = space ? JSON.stringify(value, null, space) : JSON.stringify(value)
      copyBtn.disabled = false
      status.textContent = space ? 'Formatted.' : 'Minified.'
    } catch (error) {
      copyBtn.disabled = true
      status.textContent = error && error.message ? error.message : 'That is not JSON.'
    }
  }
})()
