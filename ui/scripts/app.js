// ========== Tauri IPC ==========
const tauri = window.__TAURI__;
const invoke = tauri?.invoke ?? tauri?.core?.invoke;

if (!invoke) {
  console.warn('Tauri IPC not available — window controls will not work outside the Tauri shell');
}

// Debug: show __TAURI__ availability in the title bar
const debugTauri = document.getElementById('debug-tauri-status');
if (debugTauri) {
  debugTauri.textContent = tauri ? 'IPC: ok' : 'IPC: no';
  debugTauri.title = tauri ? 'Keys: ' + Object.keys(tauri).join(', ') : '__TAURI__ undefined';
}

// Helper: flash a button to confirm click registered
function flashBtn(el) {
  const orig = el.style.background;
  el.style.background = 'var(--accent-purple)';
  setTimeout(() => el.style.background = orig, 200);
}

// ========== Window Controls ==========
document.getElementById('minimize-btn').addEventListener('click', async (e) => {
  flashBtn(e.currentTarget);
  if (invoke) {
    try {
      await invoke('minimize_window');
    } catch (err) {
      console.error('minimize err:', err);
      e.currentTarget.title = 'Error: ' + err;
    }
  } else {
    console.warn('invoke not available');
    e.currentTarget.title = 'IPC unavailable';
  }
});

document.getElementById('maximize-btn').addEventListener('click', async (e) => {
  flashBtn(e.currentTarget);
  if (invoke) {
    try {
      const maximized = await invoke('toggle_maximize_window');
      updateMaximizeIcon(maximized);
    } catch (err) {
      console.error('maximize err:', err);
      e.currentTarget.title = 'Error: ' + err;
    }
  }
});

document.getElementById('close-btn').addEventListener('click', async (e) => {
  flashBtn(e.currentTarget);
  if (invoke) {
    try {
      await invoke('close_window');
    } catch (err) {
      console.error('close err:', err);
      e.currentTarget.title = 'Error: ' + err;
    }
  }
});

function updateMaximizeIcon(maximized) {
  const maxBtn = document.getElementById('maximize-btn');
  if (maximized) {
    maxBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12"><rect x="2.5" y="2.5" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1"/><rect x="1.5" y="4.5" width="7" height="7" rx="1" fill="var(--bg-secondary)" stroke="currentColor" stroke-width="1"/></svg>`;
  } else {
    maxBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1"/></svg>`;
  }
}

// ========== Navigation ==========
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    if (session.active) {
      showLeaveConfirm();
      return;
    }

    const viewId = item.dataset.view;

    // Sprint and Practice nav items start a session directly
    if (viewId === 'sprint') {
      startSprint();
      return;
    }
    if (viewId === 'practice') {
      startPractice();
      return;
    }

    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById('view-' + viewId);
    if (targetView) {
      targetView.classList.add('active');
    }
  });
});

// ========== Theme ==========
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

setTheme(getSystemTheme());

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  setTheme(e.matches ? 'dark' : 'light');
});

document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

// ========== Session State ==========
const session = {
  active: false,
  mode: 'sprint',
  startTime: null,
  timeoutMs: 5000,
  countdownTimer: null,
  statsTimer: null,
  currentMs: 5000,
  lastCount: { words: 0, chars: 0, wpm: 0, time: 0 },
};

// ========== Sprint Mode ==========
const sprintView = document.getElementById('sprint-view');
const textarea = document.getElementById('sprint-textarea');
const timerEl = document.getElementById('sprint-timer');
const timerSubEl = document.getElementById('sprint-timer-sub');
const progressFill = document.getElementById('sprint-progress-fill');
const statWords = document.getElementById('stat-words');
const statChars = document.getElementById('stat-chars');
const statWpm = document.getElementById('stat-wpm');
const statTime = document.getElementById('stat-time');
const mainLayout = document.getElementById('main-layout');

function startSprint() {
  session.active = true;
  session.mode = 'sprint';
  session.timeoutMs = 5000;
  session.currentMs = 5000;
  session.startTime = Date.now();

  textarea.value = '';
  textarea.disabled = false;
  document.body.classList.add('sprinting');
  sprintView.classList.add('active');

  timerEl.textContent = '00:05';
  timerSubEl.textContent = 'Keep writing...';
  progressFill.style.width = '100%';
  updateStatsDisplay(0, 0, 0, 0);

  session.countdownTimer = setInterval(tickCountdown, 100);
  session.statsTimer = setInterval(updateStats, 500);

  setTimeout(() => textarea.focus(), 100);
}

function endSession() {
  session.active = false;
  clearInterval(session.countdownTimer);
  clearInterval(session.statsTimer);
  textarea.disabled = true;

  const finalText = textarea.value;
  const words = countWords(finalText);
  const chars = finalText.length;
  const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  const wpm = elapsed > 0 ? Math.round(words / (elapsed / 60)) : 0;

  document.body.classList.remove('sprinting');
  sprintView.classList.remove('active');
  mainLayout.style.display = '';

  document.getElementById('sc-stat-time').textContent = formatTime(elapsed);
  document.getElementById('sc-stat-words').textContent = words.toLocaleString();
  document.getElementById('sc-stat-wpm').textContent = wpm;
  document.getElementById('sc-stat-chars').textContent = chars.toLocaleString();

  document.getElementById('session-complete-overlay').classList.add('active');
}

function tickCountdown() {
  if (!session.active) return;
  session.currentMs -= 100;
  if (session.currentMs <= 0) {
    session.currentMs = 0;
    timerEl.textContent = '00:00';
    progressFill.style.width = '0%';
    endSession();
    return;
  }
  timerEl.textContent = formatCountdown(session.currentMs);
  const pct = (session.currentMs / session.timeoutMs) * 100;
  progressFill.style.width = pct + '%';
}

function resetCountdown() {
  if (!session.active) return;
  session.currentMs = session.timeoutMs;
  timerEl.textContent = formatCountdown(session.timeoutMs);
  progressFill.style.width = '100%';
}

function updateStats() {
  if (!session.active) return;
  const text = textarea.value;
  const words = countWords(text);
  const chars = text.length;
  const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  const wpm = elapsed > 0 ? Math.round(words / (elapsed / 60)) : 0;
  updateStatsDisplay(words, chars, wpm, elapsed);
}

function updateStatsDisplay(words, chars, wpm, elapsed) {
  statWords.textContent = words.toLocaleString();
  statChars.textContent = chars.toLocaleString();
  statWpm.textContent = wpm;
  statTime.textContent = formatTime(elapsed);
}

function countWords(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function formatCountdown(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// Reset countdown on keystroke
textarea.addEventListener('input', resetCountdown);

// End Session button
document.getElementById('sprint-end-btn').addEventListener('click', endSession);

// Leave Session
document.getElementById('sprint-leave-btn').addEventListener('click', () => {
  if (session.active) {
    showLeaveConfirm();
  }
});

// ========== Leave Confirmation ==========
const leaveOverlay = document.getElementById('leave-confirm-overlay');

function showLeaveConfirm() {
  leaveOverlay.classList.add('active');
}

function hideLeaveConfirm() {
  leaveOverlay.classList.remove('active');
}

document.getElementById('leave-stay-btn').addEventListener('click', () => {
  hideLeaveConfirm();
  setTimeout(() => textarea.focus(), 100);
});

document.getElementById('leave-leave-btn').addEventListener('click', () => {
  hideLeaveConfirm();
  session.active = false;
  clearInterval(session.countdownTimer);
  clearInterval(session.statsTimer);
  textarea.disabled = true;
  document.body.classList.remove('sprinting');
  sprintView.classList.remove('active');
});

// ========== Session Complete ==========
const scOverlay = document.getElementById('session-complete-overlay');

document.getElementById('sc-close-btn').addEventListener('click', () => {
  scOverlay.classList.remove('active');
  navItems.forEach(n => n.classList.remove('active'));
  document.querySelector('.nav-item[data-view="home"]')?.classList.add('active');
  views.forEach(v => v.classList.remove('active'));
  document.getElementById('view-home')?.classList.add('active');
});

document.getElementById('sc-redo-btn').addEventListener('click', () => {
  scOverlay.classList.remove('active');
  startSprint();
});

document.getElementById('sc-discard-btn').addEventListener('click', () => {
  scOverlay.classList.remove('active');
});

// Save is placeholder for Milestone 8
document.getElementById('sc-save-btn').addEventListener('click', () => {
  scOverlay.classList.remove('active');
});

// Start Sprint from Home
document.querySelector('.start-sprint-btn').addEventListener('click', startSprint);

// Practice Mode placeholder
function startPractice() {
  startSprint(); // Same as sprint for now — will differ in Milestone 4
}
document.querySelector('.start-practice-btn')?.addEventListener('click', startPractice);

// ========== Startup ==========
console.log('BrainSprint v1.0 — running in', document.documentElement.getAttribute('data-theme'), 'mode');
