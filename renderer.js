// ---------- Element refs ----------
const editorView = document.getElementById('editor-view');
const prompterView = document.getElementById('prompter-view');
const controlbar = document.getElementById('controlbar');
const scriptInput = document.getElementById('script-input');
const prompterText = document.getElementById('prompter-text');
const prompterWrap = document.getElementById('prompter-text-wrap');
const settingsPanel = document.getElementById('settings-panel');
const meterFill = document.getElementById('meter-fill');
const dot = document.getElementById('dot');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownNumber = document.getElementById('countdown-number');

const btnEdit = document.getElementById('btn-edit');
const btnSettings = document.getElementById('btn-settings');
const btnSettingsClose = document.getElementById('btn-settings-close');
const btnClickthrough = document.getElementById('btn-clickthrough');
const btnMinimize = document.getElementById('btn-minimize');
const btnClose = document.getElementById('btn-close');
const btnToPrompt = document.getElementById('btn-to-prompt');
const btnPlayPause = document.getElementById('btn-playpause');
const btnFontMinus = document.getElementById('btn-font-minus');
const btnFontPlus = document.getElementById('btn-font-plus');
const btnMirror = document.getElementById('btn-mirror');
const btnTimer = document.getElementById('btn-timer');
const chkVoice = document.getElementById('chk-voice');
const rngSpeed = document.getElementById('rng-speed');

const setColor = document.getElementById('set-color');
const setBgOpacity = document.getElementById('set-bg-opacity');
const setSensitivity = document.getElementById('set-sensitivity');
const setFontSize = document.getElementById('set-fontsize');

const resizeGrip = document.getElementById('resize-grip');

// ---------- Persisted state ----------
const state = Object.assign({
  script: '',
  fontSize: 32,
  textColor: '#ffffff',
  bgOpacity: 55,
  sensitivity: 5,
  speed: 4,
  mirrored: false,
  voiceActivated: true,
}, JSON.parse(localStorage.getItem('moody-state') || '{}'));

function saveState() {
  localStorage.setItem('moody-state', JSON.stringify(state));
}

function applyStateToUI() {
  scriptInput.value = state.script;
  document.documentElement.style.setProperty('--font-size', state.fontSize + 'px');
  document.documentElement.style.setProperty('--text-color', state.textColor);
  document.documentElement.style.setProperty('--bg-opacity', (state.bgOpacity / 100).toString());
  prompterText.classList.toggle('mirrored', state.mirrored);
  setColor.value = state.textColor;
  setBgOpacity.value = state.bgOpacity;
  setSensitivity.value = state.sensitivity;
  setFontSize.value = state.fontSize;
  rngSpeed.value = state.speed;
  chkVoice.checked = state.voiceActivated;
}
applyStateToUI();

// ---------- View switching ----------
function showEditor() {
  editorView.classList.remove('hidden');
  prompterView.classList.add('hidden');
  controlbar.classList.add('hidden');
  stopScrolling();
}
function showPrompter() {
  state.script = scriptInput.value;
  saveState();
  prompterText.textContent = state.script || '(Your script will appear here)';
  editorView.classList.add('hidden');
  prompterView.classList.remove('hidden');
  controlbar.classList.remove('hidden');
  prompterWrap.scrollTop = 0;
}

btnEdit.addEventListener('click', showEditor);
btnToPrompt.addEventListener('click', showPrompter);

// ---------- Settings panel ----------
btnSettings.addEventListener('click', () => settingsPanel.classList.toggle('hidden'));
btnSettingsClose.addEventListener('click', () => settingsPanel.classList.add('hidden'));

setColor.addEventListener('input', () => {
  state.textColor = setColor.value;
  document.documentElement.style.setProperty('--text-color', state.textColor);
  saveState();
});
setBgOpacity.addEventListener('input', () => {
  state.bgOpacity = Number(setBgOpacity.value);
  document.documentElement.style.setProperty('--bg-opacity', (state.bgOpacity / 100).toString());
  saveState();
});
setSensitivity.addEventListener('input', () => {
  state.sensitivity = Number(setSensitivity.value);
  saveState();
});
setFontSize.addEventListener('input', () => {
  state.fontSize = Number(setFontSize.value);
  document.documentElement.style.setProperty('--font-size', state.fontSize + 'px');
  saveState();
});

// ---------- Font +/- and mirror ----------
btnFontMinus.addEventListener('click', () => {
  state.fontSize = Math.max(16, state.fontSize - 4);
  document.documentElement.style.setProperty('--font-size', state.fontSize + 'px');
  saveState();
});
btnFontPlus.addEventListener('click', () => {
  state.fontSize = Math.min(72, state.fontSize + 4);
  document.documentElement.style.setProperty('--font-size', state.fontSize + 'px');
  saveState();
});
btnMirror.addEventListener('click', () => {
  state.mirrored = !state.mirrored;
  prompterText.classList.toggle('mirrored', state.mirrored);
  saveState();
});

chkVoice.addEventListener('change', () => {
  state.voiceActivated = chkVoice.checked;
  saveState();
});
rngSpeed.addEventListener('input', () => {
  state.speed = Number(rngSpeed.value);
  saveState();
});

// ---------- Window chrome buttons ----------
btnMinimize.addEventListener('click', () => window.moody.minimizeApp());
btnClose.addEventListener('click', () => window.moody.closeApp());

let clickThroughActive = false;
btnClickthrough.addEventListener('click', () => {
  clickThroughActive = !clickThroughActive;
  window.moody.setClickThrough(clickThroughActive);
  btnClickthrough.style.color = clickThroughActive ? '#4c8dff' : '';
});
window.moody.onClickThroughChanged((v) => {
  clickThroughActive = v;
  btnClickthrough.style.color = clickThroughActive ? '#4c8dff' : '';
});

// ---------- Scrolling engine ----------
let scrolling = false;
let rafId = null;
let currentVolume = 0; // 0..1 smoothed
let hovering = false;

prompterWrap.addEventListener('mouseenter', () => { hovering = true; });
prompterWrap.addEventListener('mouseleave', () => { hovering = false; });

function scrollTick() {
  if (!scrolling) return;
  if (!hovering) {
    let pxPerFrame;
    if (state.voiceActivated) {
      // Scroll speed driven by mic volume; silence pauses it.
      const sensitivity = state.sensitivity / 5; // 0.2..2
      pxPerFrame = currentVolume > 0.02 ? currentVolume * 14 * sensitivity + 0.3 : 0;
    } else {
      pxPerFrame = state.speed * 0.5;
    }
    prompterWrap.scrollTop += pxPerFrame;

    // Reached the end -> stop.
    if (prompterWrap.scrollTop + prompterWrap.clientHeight >= prompterWrap.scrollHeight - 2) {
      pausePrompting();
    }
  }
  rafId = requestAnimationFrame(scrollTick);
}

function startScrolling() {
  scrolling = true;
  btnPlayPause.textContent = '❚❚';
  if (!rafId) rafId = requestAnimationFrame(scrollTick);
  ensureMic();
}
function stopScrolling() {
  scrolling = false;
  btnPlayPause.textContent = '▶';
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}
function pausePrompting() { stopScrolling(); }

btnPlayPause.addEventListener('click', () => {
  if (scrolling) stopScrolling(); else startScrolling();
});

btnTimer.addEventListener('click', () => {
  runCountdown(3, () => startScrolling());
});

function runCountdown(seconds, done) {
  countdownOverlay.classList.remove('hidden');
  let n = seconds;
  countdownNumber.textContent = n;
  const id = setInterval(() => {
    n -= 1;
    if (n <= 0) {
      clearInterval(id);
      countdownOverlay.classList.add('hidden');
      done();
    } else {
      countdownNumber.textContent = n;
    }
  }, 1000);
}

// ---------- Keyboard shortcuts (window-focused) ----------
window.addEventListener('keydown', (e) => {
  if (prompterView.classList.contains('hidden')) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (scrolling) stopScrolling(); else startScrolling();
  } else if (e.code === 'ArrowUp') {
    state.speed = Math.min(10, state.speed + 1);
    rngSpeed.value = state.speed;
    saveState();
  } else if (e.code === 'ArrowDown') {
    state.speed = Math.max(1, state.speed - 1);
    rngSpeed.value = state.speed;
    saveState();
  } else if (e.code === 'Escape') {
    stopScrolling();
  }
});

// ---------- Mic volume analysis (voice-activated scrolling) ----------
let audioCtx, analyser, micStream, dataArray;
let micReady = false;

async function ensureMic() {
  if (micReady || !state.voiceActivated) return;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    micReady = true;
    dot.classList.remove('dot-idle');
    dot.classList.add('dot-listening');
    monitorVolume();
  } catch (err) {
    console.error('Mic access failed:', err);
    dot.title = 'Mic access failed: ' + err.message;
  }
}

function monitorVolume() {
  if (!analyser) return;
  analyser.getByteTimeDomainData(dataArray);
  let sumSquares = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const v = (dataArray[i] - 128) / 128;
    sumSquares += v * v;
  }
  const rms = Math.sqrt(sumSquares / dataArray.length);
  // Smooth attack/decay.
  currentVolume = currentVolume * 0.7 + rms * 0.3;
  meterFill.style.width = Math.min(100, currentVolume * 300) + '%';
  requestAnimationFrame(monitorVolume);
}

// ---------- Resize grip ----------
let resizing = false;
let startBounds = null;
let startScreenX = 0, startScreenY = 0;

resizeGrip.addEventListener('mousedown', async (e) => {
  resizing = true;
  startScreenX = e.screenX;
  startScreenY = e.screenY;
  startBounds = await window.moody.getBounds();
  e.preventDefault();
});
window.addEventListener('mousemove', (e) => {
  if (!resizing || !startBounds) return;
  const dx = e.screenX - startScreenX;
  const dy = e.screenY - startScreenY;
  window.moody.resizeTo(startBounds, startBounds.width + dx, startBounds.height + dy);
});
window.addEventListener('mouseup', () => {
  resizing = false;
  startBounds = null;
});

// Persist script text as the user types.
scriptInput.addEventListener('input', () => {
  state.script = scriptInput.value;
  saveState();
});
