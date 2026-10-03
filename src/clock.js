(function () {
  var list = document.getElementById('clock-list')
  if (!list) return

  var zones = [
    { id: 'local', label: 'Here' },
    { id: 'UTC', label: 'UTC' },
    { id: 'America/Los_Angeles', label: 'Los Angeles' },
    { id: 'America/Denver', label: 'Denver' },
    { id: 'America/Chicago', label: 'Chicago' },
    { id: 'America/New_York', label: 'New York' },
    { id: 'Europe/London', label: 'London' },
    { id: 'Europe/Paris', label: 'Paris' },
    { id: 'Asia/Dubai', label: 'Dubai' },
    { id: 'Asia/Singapore', label: 'Singapore' },
    { id: 'Asia/Tokyo', label: 'Tokyo' },
    { id: 'Australia/Sydney', label: 'Sydney' },
  ]

  var localZone = 'UTC'
  try {
    localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch (error) {
    localZone = 'UTC'
  }

  var rows = zones.map(function (zone) {
    var li = document.createElement('li')
    var name = document.createElement('span')
    var when = document.createElement('span')
    var time = document.createElement('span')
    var date = document.createElement('span')
    name.className = 'clock-name'
    when.className = 'clock-when'
    time.className = 'clock-time'
    date.className = 'clock-date'
    var id = zone.id === 'local' ? localZone : zone.id
    name.textContent = zone.id === 'local' ? 'Here · ' + localZone : zone.label
    if (zone.id === 'local') li.className = 'is-here'
    when.append(time, date)
    li.append(name, when)
    list.append(li)
    return { id: id, time: time, date: date }
  })

  function offset(id, now) {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: 'shortOffset' }).formatToParts(now)
      var found = parts.find(function (part) { return part.type === 'timeZoneName' })
      return found ? found.value : ''
    } catch (error) {
      return ''
    }
  }

  function paint() {
    var now = new Date()
    rows.forEach(function (row) {
      var time = ''
      var day = ''
      try {
        time = new Intl.DateTimeFormat('en-US', {
          timeZone: row.id,
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
        }).format(now)
        day = new Intl.DateTimeFormat('en-US', {
          timeZone: row.id,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).format(now)
      } catch (error) {
        time = '—'
        day = row.id
      }
      var off = offset(row.id, now)
      row.time.textContent = time
      row.date.textContent = off ? day + ' · ' + off : day
    })
  }

  paint()
  window.setInterval(paint, 1000)
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) paint()
  })
})()
