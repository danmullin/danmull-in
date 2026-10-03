(function () {
  var form = document.getElementById('count-form')
  var hours = document.getElementById('count-h')
  var minutes = document.getElementById('count-m')
  var seconds = document.getElementById('count-s')
  var display = document.getElementById('count-time')
  var toggleBtn = document.getElementById('count-toggle')
  var resetBtn = document.getElementById('count-reset')
  var chimeBox = document.getElementById('count-chime')
  var status = document.getElementById('count-status')
  if (!form || !hours || !minutes || !seconds || !display || !toggleBtn || !resetBtn || !chimeBox || !status) return

  var baseTitle = document.title
  var running = false
  var paused = false
  var remaining = 0
  var endsAt = 0
  var timer = 0

  function clamp(input, max) {
    var n = Math.floor(Number(input.value))
    if (!Number.isFinite(n) || n < 0) n = 0
    if (n > max) n = max
    input.value = String(n)
    return n
  }

  function duration() {
    return (clamp(hours, 99) * 3600 + clamp(minutes, 59) * 60 + clamp(seconds, 59)) * 1000
  }

  function format(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000))
    var h = Math.floor(total / 3600)
    var m = Math.floor(total / 60) % 60
    var s = total % 60
    return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
  }

  function left() {
    if (!running) return remaining
    return Math.max(0, endsAt - Date.now())
  }

  function paint() {
    var ms = left()
    display.textContent = format(ms)
    if (running) document.title = format(ms) + ' — Countdown'
  }

  function setFieldsDisabled(disabled) {
    hours.disabled = disabled
    minutes.disabled = disabled
    seconds.disabled = disabled
  }

  function chime() {
    if (!chimeBox.checked) return
    try {
    var ctx = new AudioContext()
    var osc = ctx.createOscillator()
    var gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
    osc.onended = function () { ctx.close() }
    } catch (error) {}
  }

  function finish() {
    running = false
    paused = false
    remaining = 0
    window.clearInterval(timer)
    document.title = baseTitle
    toggleBtn.textContent = 'Start'
    toggleBtn.setAttribute('aria-pressed', 'false')
    setFieldsDisabled(false)
    resetBtn.disabled = false
    paint()
    status.textContent = "Time's up."
    chime()
  }

  function tick() {
    if (running && left() <= 0) finish()
    else paint()
  }

  function start() {
    if (running) {
      remaining = left()
      running = false
      paused = true
      window.clearInterval(timer)
      document.title = baseTitle
      toggleBtn.textContent = 'Resume'
      toggleBtn.setAttribute('aria-pressed', 'false')
      status.textContent = 'Paused at ' + format(remaining) + '.'
      paint()
      return
    }
    if (!paused) remaining = duration()
    if (remaining <= 0) {
      status.textContent = 'Set a time first.'
      return
    }
    endsAt = Date.now() + remaining
    running = true
    paused = false
    toggleBtn.textContent = 'Pause'
    toggleBtn.setAttribute('aria-pressed', 'true')
    setFieldsDisabled(true)
    resetBtn.disabled = false
    status.textContent = 'Running.'
    window.clearInterval(timer)
    timer = window.setInterval(tick, 200)
    tick()
  }

  function reset() {
    running = false
    paused = false
    remaining = 0
    window.clearInterval(timer)
    document.title = baseTitle
    toggleBtn.textContent = 'Start'
    toggleBtn.setAttribute('aria-pressed', 'false')
    setFieldsDisabled(false)
    resetBtn.disabled = true
    display.textContent = format(duration())
    status.textContent = 'Reset.'
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault()
    if (!running) start()
  })
  hours.addEventListener('input', function () { if (!running && !paused) display.textContent = format(duration()) })
  minutes.addEventListener('input', function () { if (!running && !paused) display.textContent = format(duration()) })
  seconds.addEventListener('input', function () { if (!running && !paused) display.textContent = format(duration()) })
  toggleBtn.addEventListener('click', start)
  resetBtn.addEventListener('click', reset)

  document.addEventListener('keydown', function (event) {
    var tag = event.target && event.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (event.code === 'Space') {
      if (tag === 'BUTTON' || tag === 'A') return
      event.preventDefault()
      start()
    } else if (event.key === 'r' || event.key === 'R') {
      event.preventDefault()
      reset()
    }
  })
})()
