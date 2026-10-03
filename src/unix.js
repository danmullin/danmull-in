(function () {
  var secEl = document.getElementById('unix-sec')
  var msEl = document.getElementById('unix-ms')
  var copyNow = document.getElementById('unix-copy-now')
  var stamp = document.getElementById('unix-stamp')
  var mode = document.getElementById('unix-mode')
  var local = document.getElementById('unix-local')
  var utc = document.getElementById('unix-utc')
  var when = document.getElementById('unix-when')
  var fromDate = document.getElementById('unix-from-date')
  var status = document.getElementById('unix-status')
  if (!secEl || !msEl || !copyNow || !stamp || !mode || !local || !utc || !when || !fromDate || !status) return

  function paintNow() {
    var ms = Date.now()
    secEl.textContent = String(Math.floor(ms / 1000))
    msEl.textContent = String(ms)
  }

  function asMs(n) {
    if (mode.value === 'ms') return n
    if (mode.value === 's') return n * 1000
    return Math.abs(n) >= 1e11 ? n : n * 1000
  }

  function fromStamp() {
    var raw = stamp.value.trim()
    if (!raw) {
      local.textContent = ''
      utc.textContent = ''
      status.textContent = ''
      return
    }
    var n = Number(raw)
    if (!Number.isFinite(n)) {
      local.textContent = ''
      utc.textContent = ''
      status.textContent = 'That is not a number.'
      return
    }
    var date = new Date(asMs(n))
    if (Number.isNaN(date.getTime())) {
      local.textContent = ''
      utc.textContent = ''
      status.textContent = 'That is not a time.'
      return
    }
    local.textContent = date.toLocaleString()
    utc.textContent = date.toISOString()
    status.textContent = ''
  }

  function fromWhen() {
    if (!when.value) {
      fromDate.textContent = ''
      return
    }
    var date = new Date(when.value)
    if (Number.isNaN(date.getTime())) {
      fromDate.textContent = ''
      status.textContent = 'That is not a time.'
      return
    }
    var ms = date.getTime()
    fromDate.textContent = Math.floor(ms / 1000) + ' seconds · ' + ms + ' ms'
    status.textContent = ''
  }

  copyNow.addEventListener('click', function () {
    if (!navigator.clipboard) {
      status.textContent = 'Could not copy.'
      return
    }
    navigator.clipboard.writeText(secEl.textContent).then(function () {
      status.textContent = 'Copied ' + secEl.textContent + '.'
    }, function () {
      status.textContent = 'Could not copy.'
    })
  })
  stamp.addEventListener('input', fromStamp)
  mode.addEventListener('change', fromStamp)
  when.addEventListener('input', fromWhen)

  paintNow()
  window.setInterval(paintNow, 1000)
})()
