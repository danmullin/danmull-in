import './main.js'
import {
  ALL_FORMATS,
  AdtsOutputFormat,
  BlobSource,
  BufferTarget,
  Conversion,
  FlacOutputFormat,
  Input,
  MovOutputFormat,
  Mp3OutputFormat,
  Mp4OutputFormat,
  OggOutputFormat,
  Output,
  WavOutputFormat,
  WebMOutputFormat,
} from 'mediabunny'

const VIDEO = [
  { id: 'mp4', label: 'MP4', ext: 'mp4', mime: 'video/mp4', create: () => new Mp4OutputFormat() },
  { id: 'webm', label: 'WebM', ext: 'webm', mime: 'video/webm', create: () => new WebMOutputFormat() },
  { id: 'mov', label: 'MOV', ext: 'mov', mime: 'video/quicktime', create: () => new MovOutputFormat() },
]

const AUDIO = [
  { id: 'm4a', label: 'M4A', ext: 'm4a', mime: 'audio/mp4', create: () => new Mp4OutputFormat() },
  { id: 'aac', label: 'AAC', ext: 'aac', mime: 'audio/aac', create: () => new AdtsOutputFormat() },
  { id: 'mp3', label: 'MP3', ext: 'mp3', mime: 'audio/mpeg', create: () => new Mp3OutputFormat() },
  { id: 'wav', label: 'WAV', ext: 'wav', mime: 'audio/wav', create: () => new WavOutputFormat() },
  { id: 'flac', label: 'FLAC', ext: 'flac', mime: 'audio/flac', create: () => new FlacOutputFormat() },
  { id: 'ogg', label: 'Ogg', ext: 'ogg', mime: 'audio/ogg', create: () => new OggOutputFormat() },
  { id: 'weba', label: 'WebM', ext: 'webm', mime: 'audio/webm', create: () => new WebMOutputFormat() },
]

const form = document.querySelector('#split-form')
const fileInput = document.querySelector('#split-file')
const drop = document.querySelector('#split-drop')
const summary = document.querySelector('#split-summary')
const groups = document.querySelector('#split-groups')
const videoGroup = document.querySelector('#split-video')
const audioGroup = document.querySelector('#split-audio')
const videoButtons = document.querySelector('#split-video-buttons')
const audioButtons = document.querySelector('#split-audio-buttons')
const statusEl = document.querySelector('#split-status')

if (form && fileInput && drop && summary && groups && videoGroup && audioGroup && videoButtons && audioButtons && statusEl) {
  let file = null
  let job = 0
  let busy = false

  fileInput.addEventListener('change', () => {
    if (fileInput.files?.[0]) setFile(fileInput.files[0])
  })
  drop.addEventListener('dragover', (event) => {
    event.preventDefault()
    drop.classList.add('is-hot')
  })
  drop.addEventListener('dragleave', () => drop.classList.remove('is-hot'))
  drop.addEventListener('drop', (event) => {
    event.preventDefault()
    drop.classList.remove('is-hot')
    const dropped = event.dataTransfer?.files?.[0]
    if (dropped) setFile(dropped)
  })

  async function setFile(next) {
    const current = ++job
    file = next
    busy = true
    groups.hidden = true
    videoButtons.replaceChildren()
    audioButtons.replaceChildren()
    summary.textContent = next.name
    statusEl.textContent = 'Reading tracks…'

    let videoCount = 0
    let audioCount = 0
    try {
      const input = openInput(next)
      try {
        ;[videoCount, audioCount] = await Promise.all([
          input.getVideoTracks().then((tracks) => tracks.length),
          input.getAudioTracks().then((tracks) => tracks.length),
        ])
      } finally {
        input.dispose()
      }
    } catch {
      if (current !== job) return
      busy = false
      statusEl.textContent = 'Could not read that file.'
      return
    }

    if (current !== job) return
    if (!videoCount && !audioCount) {
      busy = false
      statusEl.textContent = 'No video or audio track in that file.'
      return
    }

    const [videoOk, audioOk] = await Promise.all([
      videoCount ? available(next, VIDEO, 'video') : [],
      audioCount ? available(next, AUDIO, 'audio') : [],
    ])
    if (current !== job) return

    for (const spec of videoOk) videoButtons.append(button(spec, 'video'))
    for (const spec of audioOk) audioButtons.append(button(spec, 'audio'))
    videoGroup.hidden = videoOk.length === 0
    audioGroup.hidden = audioOk.length === 0
    groups.hidden = videoOk.length === 0 && audioOk.length === 0
    busy = false

    const parts = []
    if (videoCount) parts.push(`${videoCount} video`)
    if (audioCount) parts.push(`${audioCount} audio`)
    if (!videoOk.length && !audioOk.length) {
      statusEl.textContent = 'This browser cannot write a split of that file.'
      return
    }
    statusEl.textContent = `${parts.join(', ')}. Still on this machine.`
  }

  function button(spec, kind) {
    const control = document.createElement('button')
    control.type = 'button'
    control.className = 'btn btn-primary'
    control.textContent = spec.label
    control.addEventListener('click', () => exportTrack(spec, kind))
    return control
  }

  async function exportTrack(spec, kind) {
    if (!file || busy) return
    busy = true
    setDisabled(true)
    statusEl.textContent = `Writing ${spec.label}…`
    try {
      const input = openInput(file)
      const target = new BufferTarget()
      const output = new Output({ format: spec.create(), target })
      const conversion = await Conversion.init({
        input,
        output,
        video: kind === 'audio' ? { discard: true } : undefined,
        audio: kind === 'video' ? { discard: true } : undefined,
        showWarnings: false,
      })
      if (!conversion.isValid) {
        input.dispose()
        statusEl.textContent = `Could not write ${spec.label}.`
        return
      }
      conversion.onProgress = (progress) => {
        statusEl.textContent = `Writing ${spec.label}… ${Math.round(progress * 100)}%`
      }
      await conversion.execute()
      input.dispose()
      if (!target.buffer) {
        statusEl.textContent = `Could not write ${spec.label}.`
        return
      }
      save(target.buffer, downloadName(file.name, kind, spec.ext), spec.mime)
      statusEl.textContent = `${spec.label} downloaded. Still on this machine.`
    } catch {
      statusEl.textContent = `Could not write ${spec.label}.`
    } finally {
      busy = false
      setDisabled(false)
    }
  }

  function setDisabled(value) {
    for (const control of groups.querySelectorAll('button')) control.disabled = value
  }
}

function openInput(file) {
  return new Input({ source: new BlobSource(file), formats: ALL_FORMATS })
}

async function available(file, specs, kind) {
  const checks = await Promise.all(specs.map(async (spec) => {
    const input = openInput(file)
    try {
      const conversion = await Conversion.init({
        input,
        output: new Output({ format: spec.create(), target: new BufferTarget() }),
        video: kind === 'audio' ? { discard: true } : undefined,
        audio: kind === 'video' ? { discard: true } : undefined,
        showWarnings: false,
      })
      return conversion.isValid && conversion.utilizedTracks.length > 0 ? spec : null
    } catch {
      return null
    } finally {
      input.dispose()
    }
  }))
  return checks.filter(Boolean)
}

function downloadName(name, kind, ext) {
  const stem = name.replace(/\.[^.]+$/, '') || 'clip'
  return `${stem}-${kind}.${ext}`
}

function save(buffer, name, mime) {
  const url = URL.createObjectURL(new Blob([buffer], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}
