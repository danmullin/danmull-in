(function () {
  var display = document.getElementById('watch-time')
  var toggleBtn = document.getElementById('watch-toggle')
  var lapBtn = document.getElementById('watch-lap')
  var resetBtn = document.getElementById('watch-reset')
  var copyBtn = document.getElementById('watch-copy')
  var list = document.getElementById('watch-laps')
  var status = document.getElementById('watch-status')
  if (!display || !toggleBtn || !lapBtn || !resetBtn || !copyBtn || !list || !status) return

  var baseTitle = document.title
  var running = false
  var accumulated = 0
  var startedAt = 0
  var lastMark = 0
  var laps = []
  var frame = 0

  function elapsed() {
    return accumulated + (running ? performance.now() - startedAt : 0)
  }

  function format(ms) {
    var total = Math.max(0, Math.floor(ms))
    var hours = Math.floor(total / 3600000)
    var minutes = Math.floor(total / 60000) % 60
    var seconds = Math.floor(total / 1000) % 60
    var centi = Math.floor(total / 10) % 100
    var body =
      String(minutes).padStart(2, '0') +
      ':' +
      String(seconds).padStart(2, '0') +
      '.' +
      String(centi).padStart(2, '0')
    return hours > 0 ? String(hours) + ':' + body : body
  }

  function paint() {
    var t = elapsed()
    display.textContent = format(t)
    if (running) {
      document.title = format(t) + ' — Stopwatch'
      frame = requestAnimationFrame(paint)
    }
  }

  function say(text) {
    status.textContent = text
  }

  function syncButtons() {
    var t = elapsed()
    lapBtn.disabled = !(running || t > 0)
    resetBtn.disabled = !(running || t > 0 || laps.length > 0)
    copyBtn.hidden = laps.length === 0
  }

  function renderLaps() {
    list.replaceChildren()
    for (var i = laps.length - 1; i >= 0; i--) {
      var row = laps[i]
      var li = document.createElement('li')
      var n = document.createElement('span')
      var split = document.createElement('span')
      var total = document.createElement('span')
      n.className = 'watch-lap-n'
      n.textContent = String(row.n)
      split.className = 'watch-lap-split'
      split.textContent = '+' + format(row.split)
      total.className = 'watch-lap-total'
      total.textContent = format(row.total)
      li.append(n, split, total)
      list.append(li)
    }
    syncButtons()
  }

  function toggle() {
    if (running) {
      accumulated += performance.now() - startedAt
      running = false
      cancelAnimationFrame(frame)
      document.title = baseTitle
      toggleBtn.textContent = 'Start'
      toggleBtn.setAttribute('aria-pressed', 'false')
      paint()
      say('Stopped at ' + format(elapsed()) + '.')
    } else {
      startedAt = performance.now()
      running = true
      toggleBtn.textContent = 'Stop'
      toggleBtn.setAttribute('aria-pressed', 'true')
      say('Running.')
      paint()
    }
    syncButtons()
  }

  function lap() {
    var t = elapsed()
    if (!(running || t > 0)) return
    if (!running && t === lastMark) return
    var split = t - lastMark
    lastMark = t
    laps.push({ n: laps.length + 1, split: split, total: t })
    renderLaps()
    say('Lap ' + laps.length + ', ' + format(split) + ', total ' + format(t) + '.')
  }

  function reset() {
    running = false
    cancelAnimationFrame(frame)
    accumulated = 0
    lastMark = 0
    laps = []
    document.title = baseTitle
    toggleBtn.textContent = 'Start'
    toggleBtn.setAttribute('aria-pressed', 'false')
    renderLaps()
    paint()
    say('Reset.')
  }

  function copyLaps() {
    if (laps.length === 0) return
    var lines = ['lap\tsplit\ttotal']
    for (var i = 0; i < laps.length; i++) {
      lines.push(laps[i].n + '\t' + format(laps[i].split) + '\t' + format(laps[i].total))
    }
    var text = lines.join('\n')
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          say('Copied ' + laps.length + (laps.length === 1 ? ' lap.' : ' laps.'))
        },
        function () {
          say('Could not copy laps.')
        },
      )
      return
    }
    say('Could not copy laps.')
  }

  document.addEventListener('keydown', function (event) {
    var tag = event.target && event.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (event.code === 'Space') {
      if (tag === 'BUTTON' || tag === 'A') return
      event.preventDefault()
      toggle()
      return
    }
    if (event.key === 'l' || event.key === 'L') {
      event.preventDefault()
      lap()
      return
    }
    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault()
      reset()
    }
  })

  toggleBtn.addEventListener('click', toggle)
  lapBtn.addEventListener('click', lap)
  resetBtn.addEventListener('click', reset)
  copyBtn.addEventListener('click', copyLaps)
  paint()
  syncButtons()
})()
