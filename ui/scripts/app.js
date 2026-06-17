// ========== Tauri IPC ==========
const tauri = window.__TAURI__;

// ========== Window Controls ==========
function getWin() {
  if (!tauri?.window?.getCurrentWindow) {
    console.warn('window.getCurrentWindow not available');
    return null;
  }
  return tauri.window.getCurrentWindow();
}

// Drag the window by the title bar (excluding buttons)
document.getElementById('titlebar').addEventListener('mousedown', async (e) => {
  if (e.target.closest('button')) return;
  const win = getWin();
  if (win) {
    try { await win.startDragging(); }
    catch (err) { console.error('drag err:', err); }
  }
});

function flashBtn(el) {
  const orig = el.style.background;
  el.style.background = 'var(--accent-purple)';
  setTimeout(() => el.style.background = orig, 200);
}

document.getElementById('minimize-btn').addEventListener('click', async (e) => {
  flashBtn(e.currentTarget);
  const win = getWin();
  if (!win) { e.currentTarget.title = 'No window API'; return; }
  try {
    await win.minimize();
  } catch (err) {
    console.error('minimize err:', err);
    e.currentTarget.title = String(err);
  }
});

document.getElementById('maximize-btn').addEventListener('click', async (e) => {
  flashBtn(e.currentTarget);
  const win = getWin();
  if (!win) { e.currentTarget.title = 'No window API'; return; }
  try {
    const wasMaximized = await win.isMaximized();
    await win.toggleMaximize();
    updateMaximizeIcon(!wasMaximized);
  } catch (err) {
    console.error('maximize err:', err);
    e.currentTarget.title = String(err);
  }
});

document.getElementById('close-btn').addEventListener('click', async (e) => {
  flashBtn(e.currentTarget);
  const win = getWin();
  if (!win) { e.currentTarget.title = 'No window API'; return; }
  try {
    await win.close();
  } catch (err) {
    console.error('close err:', err);
    e.currentTarget.title = String(err);
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

function exitAllSetup() {
  document.body.classList.remove('surviving', 'creativing', 'practicing');
  survivalView.classList.remove('active');
  creativeView.classList.remove('active');
  practiceView.classList.remove('active');
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    if (session.active) {
      showLeaveConfirm();
      return;
    }

    const viewId = item.dataset.view;

    exitAllSetup();

    if (viewId === 'survival') {
      startSurvival();
      return;
    }
    if (viewId === 'creative') {
      startCreative();
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
    if (viewId === 'home') loadHomeStats();
    if (viewId === 'statistics') loadStatistics();
  });
});

// ========== Theme ==========
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('brainsprint-theme', theme); } catch(e) {}
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
}

const savedTheme = (() => { try { return localStorage.getItem('brainsprint-theme'); } catch(e) { return null; } })();
setTheme(savedTheme || getSystemTheme());

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('brainsprint-theme')) {
    setTheme(e.matches ? 'dark' : 'light');
  }
});

document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

// ========== Session State ==========
const session = {
  active: false,
  mode: 'survival',
  startTime: null,
  timeoutMs: 5000,
  countdownTimer: null,
  statsTimer: null,
  currentMs: 5000,
  lastCount: { words: 0, chars: 0, wpm: 0, time: 0 },
};
let lastSessionData = null;
let recoveryTimer = null;

function startRecoveryAutoSave(textarea) {
  stopRecoveryAutoSave();
  recoveryTimer = setInterval(async () => {
    if (!session.active) return;
    const content = textarea.value;
    if (content.trim() && window.__TAURI__?.core?.invoke) {
      try {
        await window.__TAURI__.core.invoke('save_recovery_draft', { content });
      } catch (e) {}
    }
  }, 30000); // every 30s
}

function stopRecoveryAutoSave() {
  if (recoveryTimer) {
    clearInterval(recoveryTimer);
    recoveryTimer = null;
  }
}

function clearRecoveryDraft() {
  stopRecoveryAutoSave();
  if (window.__TAURI__?.core?.invoke) {
    window.__TAURI__.core.invoke('clear_recovery_draft').catch(() => {});
  }
}

// ========== Shared Utilities ==========
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

function showSessionComplete(time, words, wpm, chars) {
  lastSessionData = { time, words, wpm, chars, topic: currentTopic || null };
  document.getElementById('sc-stat-time').textContent = formatTime(time);
  document.getElementById('sc-stat-words').textContent = words.toLocaleString();
  document.getElementById('sc-stat-wpm').textContent = wpm;
  document.getElementById('sc-stat-chars').textContent = chars.toLocaleString();

  const titleEl = document.getElementById('sc-title');
  const subtitleEl = document.getElementById('sc-subtitle');
  const saveBtn = document.getElementById('sc-save-btn');
  const badge = document.getElementById('sc-badge');

  if (session.mode === 'survival') {
    titleEl.textContent = 'You Did Not Survive!';
    subtitleEl.textContent = 'Your writing was lost. Keep practicing to survive longer!';
    saveBtn.style.display = 'none';
    badge.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    autoSaveStats();
  } else {
    titleEl.textContent = 'Session Complete!';
    subtitleEl.textContent = 'Great job! Keep pushing forward.';
    saveBtn.style.display = '';
    badge.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  }

  document.getElementById('session-complete-overlay').classList.add('active');
}

// ========== Survival Mode ==========
const survivalView = document.getElementById('survival-view');
const sTextarea = document.getElementById('survival-textarea');
const survivalTimerEl = document.getElementById('survival-timer');
const survivalTimerSubEl = document.getElementById('survival-timer-sub');
const survivalProgressFill = document.getElementById('survival-progress-fill');
const survivalSetup = document.getElementById('survival-setup');
const survivalActive = document.getElementById('survival-active');
const survivalBeginBtn = document.getElementById('survival-begin-btn');
const sStatWords = document.getElementById('s-stat-words');
const sStatChars = document.getElementById('s-stat-chars');
const sStatWpm = document.getElementById('s-stat-wpm');
const sStatTime = document.getElementById('s-stat-time');
const sTopicEl = document.getElementById('survival-prompt-topic');
const sPromptEl = document.getElementById('survival-prompt-text');

let survivalTimeoutMs = 5000;
let survivalCurrentMs = 5000;

function startSurvival() {
  pickFreshPrompt();
  session.mode = 'survival';
  session.active = false;

  sTextarea.value = '';
  sTextarea.disabled = true;
  survivalSetup.classList.remove('hidden');
  survivalActive.classList.add('hidden');
  sTopicEl.textContent = currentTopic || 'Free Writing';
  sPromptEl.textContent = currentPrompt || 'Write freely about whatever comes to mind.';

  document.body.classList.add('surviving');
  survivalView.classList.add('active');
}

function beginSurvivalSession() {
  session.active = true;
  session.startTime = Date.now();
  survivalTimeoutMs = 5000;
  survivalCurrentMs = 5000;

  sTextarea.disabled = false;
  survivalSetup.classList.add('hidden');
  survivalActive.classList.remove('hidden');

  survivalTimerEl.textContent = '00:05';
  survivalTimerSubEl.textContent = 'Keep writing...';
  survivalProgressFill.style.width = '100%';
  updateSStatsDisplay(0, 0, 0, 0);

  document.getElementById('s-game-info').textContent = 'Survival Mode  •  5s countdown';

  session.countdownTimer = setInterval(tickSurvivalCountdown, 100);
  session.statsTimer = setInterval(updateSurvivalStats, 500);

  setTimeout(() => sTextarea.focus(), 100);
}

function endSurvival() {
  if (!session.active) return;
  session.active = false;
  clearInterval(session.countdownTimer);
  clearInterval(session.statsTimer);
  sTextarea.disabled = true;

  const finalText = sTextarea.value;
  const words = countWords(finalText);
  const chars = finalText.length;
  const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  const wpm = elapsed > 0 ? Math.round(words / (elapsed / 60)) : 0;

  sTextarea.value = '';

  document.body.classList.remove('surviving');
  survivalView.classList.remove('active');

  showSessionComplete(elapsed, words, wpm, chars);
}

function tickSurvivalCountdown() {
  if (!session.active || session.mode !== 'survival') return;
  survivalCurrentMs -= 100;
  if (survivalCurrentMs <= 0) {
    survivalCurrentMs = 0;
    survivalTimerEl.textContent = '00:00';
    survivalProgressFill.style.width = '0%';
    endSurvival();
    return;
  }
  survivalTimerEl.textContent = formatCountdown(survivalCurrentMs);
  const pct = (survivalCurrentMs / survivalTimeoutMs) * 100;
  survivalProgressFill.style.width = pct + '%';
}

function resetSurvivalCountdown() {
  if (!session.active || session.mode !== 'survival') return;
  survivalCurrentMs = survivalTimeoutMs;
  survivalTimerEl.textContent = formatCountdown(survivalTimeoutMs);
  survivalProgressFill.style.width = '100%';
}

function updateSurvivalStats() {
  if (!session.active || session.mode !== 'survival') return;
  const text = sTextarea.value;
  const words = countWords(text);
  const chars = text.length;
  const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  const wpm = elapsed > 0 ? Math.round(words / (elapsed / 60)) : 0;
  updateSStatsDisplay(words, chars, wpm, elapsed);
}

function updateSStatsDisplay(words, chars, wpm, elapsed) {
  sStatWords.textContent = words.toLocaleString();
  sStatChars.textContent = chars.toLocaleString();
  sStatWpm.textContent = wpm;
  sStatTime.textContent = formatTime(elapsed);
}

// Survival events
survivalBeginBtn.addEventListener('click', beginSurvivalSession);
sTextarea.addEventListener('input', resetSurvivalCountdown);
document.getElementById('survival-end-btn').addEventListener('click', endSurvival);
document.getElementById('survival-leave-btn').addEventListener('click', () => {
  if (session.active && session.mode === 'survival') showLeaveConfirm();
  else {
    document.body.classList.remove('surviving');
    survivalView.classList.remove('active');
  }
});
document.getElementById('survival-new-prompt-btn').addEventListener('click', () => {
  if (session.active) return;
  pickFreshPrompt();
  sTopicEl.textContent = currentTopic || 'Free Writing';
  sPromptEl.textContent = currentPrompt || 'Write freely about whatever comes to mind.';
});

// ========== Creative Mode ==========
const creativeView = document.getElementById('creative-view');
const cTextarea = document.getElementById('creative-textarea');
const cTimerEl = document.getElementById('creative-timer');
const cTimerSubEl = document.getElementById('creative-timer-sub');
const cProgressFill = document.getElementById('creative-progress-fill');
const cSetup = document.getElementById('creative-setup');
const cActive = document.getElementById('creative-active');
const cBeginBtn = document.getElementById('creative-begin-btn');
const cStatWords = document.getElementById('c-stat-words');
const cStatChars = document.getElementById('c-stat-chars');
const cStatWpm = document.getElementById('c-stat-wpm');
const cStatTime = document.getElementById('c-stat-time');
const cTopicEl = document.getElementById('creative-prompt-topic');
const cPromptEl = document.getElementById('creative-prompt-text');
const cCdOpts = document.getElementById('creative-cd-display').parentElement.querySelectorAll('.timer-opt');
const cTmOpts = document.getElementById('creative-tm-display').parentElement.querySelectorAll('.timer-opt');
const cPromptCard = document.getElementById('creative-prompt-card');
const cCdDisplay = document.getElementById('creative-cd-display');
const cTmDisplay = document.getElementById('creative-tm-display');
const cSessionTimer = document.getElementById('creative-session-timer');
const cGameInfo = document.getElementById('c-game-info');
let creativeShowTopic = true;

let creativeCdSec = 5;        // countdown seconds (per-keystroke)
let creativeTmMin = 10;       // timer minutes (session limit)
let creativeCdMs = 5000;      // countdown in ms (current)
let creativeCdMaxMs = 5000;   // countdown max ms
let creativeTmRemSec = null;  // timer remaining seconds
let creativeCdTimer = null;   // countdown interval
let creativeTmTimer = null;   // timer interval
let creativeStatsTimer = null;

cCdOpts.forEach(btn => {
  btn.addEventListener('click', () => {
    if (session.active) return;
    cCdOpts.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    creativeCdSec = parseInt(btn.dataset.seconds, 10);
    creativeCdMaxMs = creativeCdSec * 1000;
    updateCreativeCdDisplay();
  });
});

cTmOpts.forEach(btn => {
  btn.addEventListener('click', () => {
    if (session.active) return;
    cTmOpts.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    creativeTmMin = parseInt(btn.dataset.seconds, 10);
    updateCreativeTmDisplay();
  });
});

function updateCreativeCdDisplay() {
  if (creativeCdSec > 0) {
    cCdDisplay.textContent = String(creativeCdSec).padStart(2, '0') + ':00';
  } else {
    cCdDisplay.textContent = '--:--';
  }
}

function updateCreativeTmDisplay() {
  if (creativeTmMin > 0) {
    cTmDisplay.textContent = String(creativeTmMin).padStart(2, '0') + ':00';
  } else {
    cTmDisplay.textContent = '--:--';
  }
}

function startCreative() {
  applyPrefsToSetup();
  pickFreshPrompt();
  session.mode = 'creative';
  session.active = false;
  creativeShowTopic = true;

  cTextarea.value = '';
  cTextarea.disabled = true;
  cSetup.classList.remove('hidden');
  cActive.classList.add('hidden');
  cTopicEl.textContent = currentTopic || 'Free Writing';
  cPromptEl.textContent = currentPrompt || 'Write freely about whatever comes to mind.';
  cPromptCard.classList.remove('hidden');
  creativeTmRemSec = null;
  updateCreativeCdDisplay();
  updateCreativeTmDisplay();
  cTimerEl.textContent = '--:--';

  document.body.classList.add('creativing');
  creativeView.classList.add('active');
  updateCStatsDisplay(0, 0, 0, 0);
}

function beginCreativeSession() {
  session.active = true;
  session.startTime = Date.now();

  cTextarea.disabled = false;
  cSetup.classList.add('hidden');
  cActive.classList.remove('hidden');

  if (creativeCdSec > 0) {
    creativeCdMs = creativeCdSec * 1000;
    creativeCdMaxMs = creativeCdMs;
  } else {
    creativeCdMs = 0;
    creativeCdMaxMs = 0;
  }

  if (creativeTmMin > 0) {
    creativeTmRemSec = creativeTmMin * 60;
  } else {
    creativeTmRemSec = null;
  }

  cTimerEl.textContent = formatCountdown(creativeCdMaxMs || 0);
  cTimerSubEl.textContent = 'Keep writing...';
  cProgressFill.style.width = creativeCdMaxMs > 0 ? '100%' : '0%';
  if (creativeTmRemSec !== null) {
    cSessionTimer.textContent = 'Timer: ' + formatTime(creativeTmRemSec) + ' remaining';
  } else {
    cSessionTimer.textContent = '';
  }
  updateCStatsDisplay(0, 0, 0, 0);

  // Set game info
  const diffMap = { 0: 'Off', 10: 'Easy', 5: 'Normal', 3: 'Hard' };
  cGameInfo.textContent = 'Creative Mode  \u2022  Difficulty: ' + (diffMap[creativeCdSec] || 'Off') + '  \u2022  Timer: ' + (creativeTmMin > 0 ? creativeTmMin + 'm' : 'Off');

  if (creativeCdMaxMs > 0) {
    creativeCdTimer = setInterval(tickCreativeCd, 100);
  }
  if (creativeTmRemSec !== null) {
    creativeTmTimer = setInterval(tickCreativeTm, 1000);
  }
  creativeStatsTimer = setInterval(updateCreativeStats, 500);

  setTimeout(() => cTextarea.focus(), 100);
  startRecoveryAutoSave(cTextarea);
}

function tickCreativeCd() {
  if (!session.active || session.mode !== 'creative') return;
  if (creativeCdMaxMs <= 0) return;
  creativeCdMs -= 100;
  if (creativeCdMs <= 0) {
    creativeCdMs = 0;
    cTimerEl.textContent = '00:00';
    cProgressFill.style.width = '0%';
    clearInterval(creativeCdTimer);
    creativeCdTimer = null;
    clearInterval(creativeTmTimer);
    creativeTmTimer = null;
    endCreative();
    return;
  }
  cTimerEl.textContent = formatCountdown(creativeCdMs);
  const pct = (creativeCdMs / creativeCdMaxMs) * 100;
  cProgressFill.style.width = pct + '%';
  updateCreativeSessionTimer();
}

function updateCreativeSessionTimer() {
  if (creativeTmRemSec !== null && creativeTmRemSec > 0) {
    cSessionTimer.textContent = 'Timer: ' + formatTime(creativeTmRemSec) + ' remaining';
  } else if (creativeTmRemSec !== null && creativeTmRemSec === 0) {
    cSessionTimer.textContent = 'Timer: 00:00';
  } else {
    cSessionTimer.textContent = '';
  }
}

function resetCreativeCd() {
  if (!session.active || session.mode !== 'creative') return;
  if (creativeCdMaxMs <= 0) return;
  creativeCdMs = creativeCdMaxMs;
  cTimerEl.textContent = formatCountdown(creativeCdMaxMs);
  cProgressFill.style.width = '100%';
  updateCreativeSessionTimer();
}

function tickCreativeTm() {
  if (!session.active || session.mode !== 'creative') return;
  if (creativeTmRemSec === null) return;
  creativeTmRemSec -= 1;
  if (creativeTmRemSec <= 0) {
    creativeTmRemSec = 0;
    clearInterval(creativeCdTimer);
    creativeCdTimer = null;
    clearInterval(creativeTmTimer);
    creativeTmTimer = null;
    endCreative();
    return;
  }
  updateCreativeSessionTimer();
}

function endCreative() {
  if (!session.active) return;
  session.active = false;
  if (creativeCdTimer) {
    clearInterval(creativeCdTimer);
    creativeCdTimer = null;
  }
  if (creativeTmTimer) {
    clearInterval(creativeTmTimer);
    creativeTmTimer = null;
  }
  clearInterval(creativeStatsTimer);
  cTextarea.disabled = true;

  const finalText = cTextarea.value;
  const words = countWords(finalText);
  const chars = finalText.length;
  const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  const wpm = elapsed > 0 ? Math.round(words / (elapsed / 60)) : 0;

  document.body.classList.remove('creativing');
  creativeView.classList.remove('active');

  showSessionComplete(elapsed, words, wpm, chars);
}

function updateCreativeStats() {
  if (!session.active || session.mode !== 'creative') return;
  const text = cTextarea.value;
  const words = countWords(text);
  const chars = text.length;
  const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  const wpm = elapsed > 0 ? Math.round(words / (elapsed / 60)) : 0;
  updateCStatsDisplay(words, chars, wpm, elapsed);
}

function updateCStatsDisplay(words, chars, wpm, elapsed) {
  cStatWords.textContent = words.toLocaleString();
  cStatChars.textContent = chars.toLocaleString();
  cStatWpm.textContent = wpm;
  cStatTime.textContent = formatTime(elapsed);
}

// Creative events
cBeginBtn.addEventListener('click', beginCreativeSession);
cTextarea.addEventListener('input', resetCreativeCd);
document.getElementById('creative-end-btn').addEventListener('click', endCreative);
document.getElementById('creative-leave-btn').addEventListener('click', () => {
  if (session.active && session.mode === 'creative') showLeaveConfirm();
  else {
    document.body.classList.remove('creativing');
    creativeView.classList.remove('active');
  }
});
document.getElementById('creative-new-prompt-btn').addEventListener('click', () => {
  if (session.active) return;
  pickFreshPrompt();
  cTopicEl.textContent = currentTopic || 'Free Writing';
  cPromptEl.textContent = currentPrompt || 'Write freely about whatever comes to mind.';
});
document.getElementById('creative-toggle-topic-btn').addEventListener('click', () => {
  if (session.active) return;
  creativeShowTopic = !creativeShowTopic;
  const btn = document.getElementById('creative-toggle-topic-btn');
  if (creativeShowTopic) {
    cPromptCard.classList.remove('hidden');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Hide Topic';
  } else {
    cPromptCard.classList.add('hidden');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Show Topic';
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
  const target = {
    survival: sTextarea,
    creative: cTextarea,
    practice: pTextarea,
  }[session.mode] || sTextarea;
  setTimeout(() => target.focus(), 100);
});

document.getElementById('leave-leave-btn').addEventListener('click', () => {
  hideLeaveConfirm();
  clearRecoveryDraft();
  session.active = false;
  clearInterval(session.countdownTimer);
  clearInterval(session.statsTimer);
  if (creativeCdTimer) {
    clearInterval(creativeCdTimer);
    creativeCdTimer = null;
  }
  if (creativeTmTimer) {
    clearInterval(creativeTmTimer);
    creativeTmTimer = null;
  }
  if (creativeStatsTimer) {
    clearInterval(creativeStatsTimer);
    creativeStatsTimer = null;
  }
  if (practiceTmTimer) {
    clearInterval(practiceTmTimer);
    practiceTmTimer = null;
  }
  if (practiceStatsTimer) {
    clearInterval(practiceStatsTimer);
    practiceStatsTimer = null;
  }
  sTextarea.disabled = true;
  cTextarea.disabled = true;
  pTextarea.disabled = true;
  document.body.classList.remove('surviving', 'creativing', 'practicing');
  survivalView.classList.remove('active');
  creativeView.classList.remove('active');
  practiceView.classList.remove('active');
});

// ========== Session Complete ==========
const scOverlay = document.getElementById('session-complete-overlay');

document.getElementById('sc-close-btn').addEventListener('click', () => {
  clearRecoveryDraft();
  scOverlay.classList.remove('active');
  navItems.forEach(n => n.classList.remove('active'));
  document.querySelector('.nav-item[data-view="home"]')?.classList.add('active');
  views.forEach(v => v.classList.remove('active'));
  document.getElementById('view-home')?.classList.add('active');
});

document.getElementById('sc-redo-btn').addEventListener('click', () => {
  scOverlay.classList.remove('active');
  if (session.mode === 'practice') startPractice();
  else if (session.mode === 'creative') startCreative();
  else startSurvival();
});

document.getElementById('sc-discard-btn').addEventListener('click', () => {
  clearRecoveryDraft();
  scOverlay.classList.remove('active');
  document.querySelector('.nav-item[data-view="home"]')?.click();
});

// Recovery overlay
document.getElementById('recovery-discard-btn').addEventListener('click', () => {
  document.getElementById('recovery-overlay').classList.remove('active');
  clearRecoveryDraft();
});

// Auto-save stats without writing content (used by survival mode)
async function autoSaveStats() {
  if (!lastSessionData || !window.__TAURI__?.core?.invoke) return;
  try {
    await window.__TAURI__.core.invoke('save_session', {
      mode: 'survival',
      topic: null,
      difficulty: null,
      durationSecs: Math.min(lastSessionData.time, 86400),
      words: lastSessionData.words,
      characters: lastSessionData.chars,
      wpm: lastSessionData.wpm,
      survived: false,
      writingContent: null,
    });
  } catch (e) {
    console.error('Auto-save failed:', e);
  }
}

document.getElementById('sc-save-btn').addEventListener('click', async () => {
  if (!lastSessionData) return;
  const mode = session.mode;
  const textareaMap = { survival: sTextarea, creative: cTextarea, practice: pTextarea };
  const content = textareaMap[mode]?.value || '';
  const diffMap = { 0: null, 10: 'Easy', 5: 'Normal', 3: 'Hard' };
  const difficulty = mode === 'creative' ? diffMap[creativeCdSec] : null;
  const survived = mode !== 'survival' || false;

  if (window.__TAURI__?.core?.invoke) {
    try {
      await window.__TAURI__.core.invoke('save_session', {
        mode,
        topic: lastSessionData.topic,
        difficulty,
        durationSecs: Math.min(lastSessionData.time, 86400),
        words: lastSessionData.words,
        characters: lastSessionData.chars,
        wpm: lastSessionData.wpm,
        survived,
        writingContent: (mode !== 'survival' && content.trim()) ? content : null,
      });
      clearRecoveryDraft();
    } catch (e) {
      console.error('Save failed:', e);
      alert('Failed to save: ' + e);
      return;
    }
  }

  scOverlay.classList.remove('active');
  // Brief success feedback
  document.querySelector('.nav-item[data-view="home"]')?.click();
});

// ========== Prompts ==========
const PROMPTS = {
  'Life & Philosophy': [
    'What does a meaningful life look like to you, and how close are you to living it?',
    'If you could change one fundamental belief you hold, what would it be and why?',
    'What is something you once believed that you now disagree with?',
    'Is happiness a choice, a circumstance, or something else entirely?',
    'What would you do if you were not afraid of failure?',
    'Describe a time when you changed your mind about something important.',
    'What does it mean to live authentically?',
    'If you could ask one question and receive an honest answer, what would it be?',
    'How do you define success, and has that definition changed over time?',
    'What is the most important lesson you have learned so far?',
  ],
  'Science & Technology': [
    'How has technology changed the way you think and remember?',
    'What technological advancement excites you most, and what worries you?',
    'If you could invent something to solve a daily problem, what would it be?',
    'How do you think artificial intelligence will affect creative professions?',
    'What is a scientific concept that fascinates you?',
    'Describe how a piece of technology has significantly impacted your life.',
    'What is your relationship with social media?',
    'If you could travel 100 years into the future, what would you want to see?',
    'How do you balance the benefits and risks of new technology?',
    'What everyday technology would you most like to improve?',
  ],
  'Creative Writing': [
    'Write about a world where people communicate only through written stories.',
    'Describe a character who discovers they are part of a story being written by someone else.',
    'Write the first page of a story set in a library at midnight.',
    'Describe a color to someone who has never seen it before.',
    'Start a story with the line: "The last thing I expected to find was..."',
    'Write about an object that holds memories of its previous owners.',
    'Describe a city that exists only in dreams.',
    'Write a conversation between two strangers on a train.',
    'What if silence was a physical substance? Describe it.',
    'Write about someone who can hear the thoughts of books.',
  ],
  'Daily Reflections': [
    'What was the best part of your day today, and why?',
    'What is something you noticed today that you usually overlook?',
    'Describe a moment today that made you feel something unexpected.',
    'What is one thing you could have done differently today?',
    'What made you smile today?',
    'Describe a challenge you faced today and how you handled it.',
    'What is something you learned today?',
    'How did you take care of yourself today?',
    'What are you grateful for right now?',
    'If you could redo one moment from today, what would it be?',
  ],
  'Problem Solving': [
    'Describe a problem you are currently facing. Write down three possible solutions.',
    'Think of a recurring issue in your life. What small change could reduce it?',
    'What is a decision you have been postponing? Write the pros and cons.',
    'If you could delegate one task forever, what would it be?',
    'Describe a situation that seems complex. Break it down into smaller parts.',
    'What is a goal that feels overwhelming? What is the smallest first step?',
    'Think of someone you admire. How would they approach your biggest challenge?',
    'What is a rule you follow that might no longer serve you?',
    'Describe a time when a simple solution solved a complex problem.',
    'What problem, if solved, would make the biggest difference in your life?',
  ],
  'Learning & Memory': [
    'What is the most interesting thing you have learned recently?',
    'Describe a skill you would like to learn and why.',
    'What is something you remember vividly from your childhood?',
    'How do you learn best: reading, doing, listening, or teaching?',
    'What is a subject you would study if you had unlimited time?',
    'Describe a lesson that took you longer than expected to learn.',
    'What memory do you associate with a specific smell or sound?',
    'If you could learn any language instantly, which would you choose?',
    'What is a piece of advice you wish you had learned earlier?',
    'How has your understanding of a topic changed as you learned more about it?',
  ],
  'Goals & Productivity': [
    'What is one goal you want to achieve this month? Why does it matter?',
    'Describe your ideal morning routine.',
    'What is something you have been procrastinating on? Why?',
    'If you had an extra hour each day, how would you use it?',
    'What does productivity mean to you beyond just being busy?',
    'What is a habit you want to build, and what is a habit you want to break?',
    'Describe a time when you were in a state of deep focus. What made it possible?',
    'What is your biggest distraction, and how could you reduce it?',
    'What would you attempt if you knew you could not fail?',
    'Reflect on a goal you achieved. What strategies helped you succeed?',
  ],
  'Free Writing': [
    'Write whatever comes to mind. Do not stop. Do not edit. Just write.',
    'Describe the room you are in using all five senses.',
    'Write a letter to your future self.',
    'What is on your mind right now? Let the words flow.',
    'Write about the first thing you see when you look up from your screen.',
    'Describe your current mood as a weather pattern.',
    'What questions are you asking yourself these days?',
    'Write a list of everything you can hear right now.',
    'If your thoughts were a river, where would they be flowing?',
    'Write without purpose. Let the words take you somewhere unexpected.',
  ],
};

let currentTopic = null;
let currentPrompt = '';

function pickRandomTopic() {
  const names = Object.keys(PROMPTS);
  return names[Math.floor(Math.random() * names.length)];
}

function pickPromptForTopic(topicName) {
  const prompts = PROMPTS[topicName];
  if (!prompts) return 'Write freely about whatever comes to mind.';
  return prompts[Math.floor(Math.random() * prompts.length)];
}

function pickFreshPrompt() {
  currentTopic = pickRandomTopic();
  currentPrompt = pickPromptForTopic(currentTopic);
}

// ========== Practice Mode ==========
const practiceView = document.getElementById('practice-view');
const pTextarea = document.getElementById('practice-textarea');
const pTopicEl = document.getElementById('practice-prompt-topic');
const pPromptEl = document.getElementById('practice-prompt-text');
const pSetup = document.getElementById('practice-setup');
const pActive = document.getElementById('practice-active');
const pSessionTimer = document.getElementById('practice-timer-display');
const pStatWords = document.getElementById('p-stat-words');
const pStatChars = document.getElementById('p-stat-chars');
const pStatWpm = document.getElementById('p-stat-wpm');
const pStatTime = document.getElementById('p-stat-time');
const pTmOpts = document.querySelectorAll('#practice-setup .timer-opt');
const pBeginBtn = document.getElementById('practice-begin-btn');

let practiceTmMin = 10;
let practiceTmRemSec = null;
let practiceTmTimer = null;
let practiceStatsTimer = null;

pTmOpts.forEach(btn => {
  btn.addEventListener('click', () => {
    if (session.active) return;
    pTmOpts.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    practiceTmMin = parseInt(btn.dataset.seconds, 10);
    updatePracticeTmDisplay();
  });
});

function updatePracticeTmDisplay() {
  const el = document.getElementById('practice-tm-display');
  if (practiceTmMin > 0) {
    el.textContent = String(practiceTmMin).padStart(2, '0') + ':00';
  } else {
    el.textContent = '--:--';
  }
}

function startPractice() {
  applyPrefsToSetup();
  pickFreshPrompt();
  session.mode = 'practice';
  session.active = false;

  pTextarea.value = '';
  pTextarea.disabled = true;
  pSetup.classList.remove('hidden');
  pActive.classList.add('hidden');
  pTopicEl.textContent = currentTopic || 'Free Writing';
  pPromptEl.textContent = currentPrompt || 'Write freely about whatever comes to mind.';
  document.getElementById('practice-prompt-card').classList.remove('hidden');
  practiceTmRemSec = null;
  updatePracticeTmDisplay();
  pSessionTimer.textContent = '';

  document.body.classList.add('practicing');
  practiceView.classList.add('active');
  updatePStatsDisplay(0, 0, 0, 0);
}

function beginPracticeSession() {
  session.active = true;
  session.startTime = Date.now();

  pTextarea.disabled = false;
  pSetup.classList.add('hidden');
  pActive.classList.remove('hidden');

  document.getElementById('p-game-info').textContent = 'Practice Mode  •  Timer: ' + (practiceTmMin > 0 ? practiceTmMin + 'm' : 'Off');

  if (practiceTmMin > 0) {
    practiceTmRemSec = practiceTmMin * 60;
    pSessionTimer.textContent = 'Timer: ' + formatTime(practiceTmRemSec) + ' remaining';
  } else {
    practiceTmRemSec = null;
    pSessionTimer.textContent = '';
  }

  if (practiceTmRemSec !== null) {
    practiceTmTimer = setInterval(tickPracticeTm, 1000);
  }
  practiceStatsTimer = setInterval(updatePStats, 500);

  setTimeout(() => pTextarea.focus(), 100);
  startRecoveryAutoSave(pTextarea);
}

function tickPracticeTm() {
  if (!session.active || session.mode !== 'practice') return;
  if (practiceTmRemSec === null) return;
  practiceTmRemSec -= 1;
  if (practiceTmRemSec <= 0) {
    practiceTmRemSec = 0;
    pSessionTimer.textContent = 'Timer: 00:00';
    clearInterval(practiceTmTimer);
    practiceTmTimer = null;
    endPractice();
    return;
  }
  pSessionTimer.textContent = 'Timer: ' + formatTime(practiceTmRemSec) + ' remaining';
}

function updatePStats() {
  if (!session.active || session.mode !== 'practice') return;
  const text = pTextarea.value;
  const words = countWords(text);
  const chars = text.length;
  const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  const wpm = elapsed > 0 ? Math.round(words / (elapsed / 60)) : 0;
  updatePStatsDisplay(words, chars, wpm, elapsed);
}

function updatePStatsDisplay(words, chars, wpm, elapsed) {
  pStatWords.textContent = words.toLocaleString();
  pStatChars.textContent = chars.toLocaleString();
  pStatWpm.textContent = wpm;
  pStatTime.textContent = formatTime(elapsed);
}

function endPractice() {
  if (!session.active) return;
  session.active = false;
  if (practiceTmTimer) {
    clearInterval(practiceTmTimer);
    practiceTmTimer = null;
  }
  clearInterval(practiceStatsTimer);
  pTextarea.disabled = true;

  const finalText = pTextarea.value;
  const words = countWords(finalText);
  const chars = finalText.length;
  const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  const wpm = elapsed > 0 ? Math.round(words / (elapsed / 60)) : 0;

  document.body.classList.remove('practicing');
  practiceView.classList.remove('active');

  showSessionComplete(elapsed, words, wpm, chars);
}

pBeginBtn.addEventListener('click', beginPracticeSession);
document.getElementById('practice-new-prompt-btn').addEventListener('click', () => {
  if (session.active) return;
  pickFreshPrompt();
  pTopicEl.textContent = currentTopic || 'Free Writing';
  pPromptEl.textContent = currentPrompt || 'Write freely about whatever comes to mind.';
});
document.getElementById('practice-end-btn').addEventListener('click', endPractice);
document.getElementById('practice-leave-btn').addEventListener('click', () => {
  if (session.active) {
    showLeaveConfirm();
  } else {
    document.body.classList.remove('practicing');
    practiceView.classList.remove('active');
  }
});
document.getElementById('practice-toggle-topic-btn').addEventListener('click', () => {
  if (session.active) return;
  const card = document.getElementById('practice-prompt-card');
  const btn = document.getElementById('practice-toggle-topic-btn');
  const hidden = card.classList.toggle('hidden');
  if (hidden) {
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Show Topic';
  } else {
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Hide Topic';
  }
});

// ========== Start buttons ==========
document.querySelector('.start-survival-btn').addEventListener('click', () => {
  exitAllSetup();
  startSurvival();
});
document.querySelector('.start-creative-btn')?.addEventListener('click', () => {
  exitAllSetup();
  startCreative();
});
document.querySelector('.start-practice-btn')?.addEventListener('click', () => {
  exitAllSetup();
  startPractice();
});

// ========== Settings ==========
function loadPrefs() {
  try {
    const raw = localStorage.getItem('brainsprint-prefs');
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function savePrefs(prefs) {
  try {
    const existing = loadPrefs();
    Object.assign(existing, prefs);
    localStorage.setItem('brainsprint-prefs', JSON.stringify(existing));
  } catch(e) {}
}

function applyPrefsToSetup() {
  const prefs = loadPrefs();

  // Creative difficulty
  if (prefs.creativeDiff !== undefined) {
    creativeCdSec = prefs.creativeDiff;
    creativeCdMaxMs = creativeCdSec * 1000;
    cCdOpts.forEach(b => b.classList.remove('active'));
    cCdOpts.forEach(b => { if (parseInt(b.dataset.seconds, 10) === prefs.creativeDiff) b.classList.add('active'); });
    updateCreativeCdDisplay();
  }
  // Creative timer
  if (prefs.creativeTimer !== undefined) {
    creativeTmMin = prefs.creativeTimer;
    cTmOpts.forEach(b => b.classList.remove('active'));
    cTmOpts.forEach(b => { if (parseInt(b.dataset.seconds, 10) === prefs.creativeTimer) b.classList.add('active'); });
    updateCreativeTmDisplay();
  }
  // Practice timer
  if (prefs.practiceTimer !== undefined) {
    practiceTmMin = prefs.practiceTimer;
    pTmOpts.forEach(b => b.classList.remove('active'));
    pTmOpts.forEach(b => { if (parseInt(b.dataset.seconds, 10) === prefs.practiceTimer) b.classList.add('active'); });
    updatePracticeTmDisplay();
  }
}

// Save preferences when setup options change
cCdOpts.forEach(btn => {
  btn.addEventListener('click', () => {
    if (session.active) return;
    savePrefs({ creativeDiff: parseInt(btn.dataset.seconds, 10) });
  });
});
cTmOpts.forEach(btn => {
  btn.addEventListener('click', () => {
    if (session.active) return;
    savePrefs({ creativeTimer: parseInt(btn.dataset.seconds, 10) });
  });
});
pTmOpts.forEach(btn => {
  btn.addEventListener('click', () => {
    if (session.active) return;
    savePrefs({ practiceTimer: parseInt(btn.dataset.seconds, 10) });
  });
});

// Settings page UI
document.getElementById('settings-theme-btn').addEventListener('click', () => {
  toggleTheme();
  updateSettingsThemeUI();
});

function updateSettingsThemeUI() {
  const theme = document.documentElement.getAttribute('data-theme');
  document.getElementById('settings-theme-label').textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
  document.getElementById('settings-theme-icon').innerHTML = theme === 'dark'
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
}

document.getElementById('settings-creative-diff').addEventListener('change', (e) => {
  const val = parseInt(e.target.value, 10);
  savePrefs({ creativeDiff: val });
  // Also update the setup buttons if creative setup is visible
  creativeCdSec = val;
  creativeCdMaxMs = val * 1000;
  cCdOpts.forEach(b => b.classList.remove('active'));
  cCdOpts.forEach(b => { if (parseInt(b.dataset.seconds, 10) === val) b.classList.add('active'); });
  updateCreativeCdDisplay();
});

document.getElementById('settings-creative-timer').addEventListener('change', (e) => {
  const val = parseInt(e.target.value, 10);
  savePrefs({ creativeTimer: val });
  creativeTmMin = val;
  cTmOpts.forEach(b => b.classList.remove('active'));
  cTmOpts.forEach(b => { if (parseInt(b.dataset.seconds, 10) === val) b.classList.add('active'); });
  updateCreativeTmDisplay();
});

document.getElementById('settings-practice-timer').addEventListener('change', (e) => {
  const val = parseInt(e.target.value, 10);
  savePrefs({ practiceTimer: val });
  practiceTmMin = val;
  pTmOpts.forEach(b => b.classList.remove('active'));
  pTmOpts.forEach(b => { if (parseInt(b.dataset.seconds, 10) === val) b.classList.add('active'); });
  updatePracticeTmDisplay();
});

// Data management
document.getElementById('settings-export-btn').addEventListener('click', () => {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('brainsprint-')) {
        data[key] = localStorage.getItem(key);
      }
    }
  } catch(e) {}
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'brainsprint-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('settings-import-btn').addEventListener('click', () => {
  document.getElementById('settings-file-input').click();
});

document.getElementById('settings-file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      Object.keys(data).forEach(key => {
        if (key.startsWith('brainsprint-')) {
          localStorage.setItem(key, data[key]);
        }
      });
      alert('Data imported successfully. Reload to apply.');
    } catch(err) {
      alert('Invalid backup file.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('settings-clear-btn').addEventListener('click', () => {
  if (!confirm('Are you sure you want to clear all saved data? This cannot be undone.')) return;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('brainsprint-')) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
  // Reset to defaults
  location.reload();
});

// Danger Zone
document.getElementById('settings-delete-data-btn').addEventListener('click', async () => {
  if (!confirm('Delete all saved session data and writing files? This cannot be undone.')) return;
  if (window.__TAURI__?.core?.invoke) {
    try {
      await window.__TAURI__.core.invoke('delete_all_data');
      alert('Saved data deleted.');
    } catch (e) {
      alert('Failed to delete data: ' + e);
    }
  } else {
    alert('Data deletion is available in the desktop app.');
  }
});

document.getElementById('settings-reset-btn').addEventListener('click', async () => {
  if (!confirm('Reset everything to factory defaults? All saved data, files, and settings will be permanently deleted.')) return;
  if (window.__TAURI__?.core?.invoke) {
    try {
      await window.__TAURI__.core.invoke('delete_all_data');
    } catch (e) {}
  }
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('brainsprint-')) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
  location.reload();
});

// Update settings UI when view becomes active
document.querySelector('.nav-item[data-view="settings"]').addEventListener('click', () => {
  updateSettingsThemeUI();
  const prefs = loadPrefs();
  document.getElementById('settings-creative-diff').value = prefs.creativeDiff !== undefined ? prefs.creativeDiff : 5;
  document.getElementById('settings-creative-timer').value = prefs.creativeTimer !== undefined ? prefs.creativeTimer : 10;
  document.getElementById('settings-practice-timer').value = prefs.practiceTimer !== undefined ? prefs.practiceTimer : 10;
  renderCustomTopics();
  updateFolderPaths();
});

async function updateFolderPaths() {
  if (!window.__TAURI__?.core?.invoke) return;
  try {
    const paths = await window.__TAURI__.core.invoke('get_display_paths');
    document.getElementById('settings-path-base').textContent = paths[0][1];
    document.getElementById('settings-path-writings').textContent = paths[1][1];
    document.getElementById('settings-path-sessions').textContent = paths[2][1];
  } catch (e) {}
}

// ========== Custom Topics ==========
function loadCustomTopics() {
  try {
    const raw = localStorage.getItem('brainsprint-custom-topics');
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function saveCustomTopics(topics) {
  try {
    localStorage.setItem('brainsprint-custom-topics', JSON.stringify(topics));
  } catch(e) {}
}

function renderCustomTopics() {
  const container = document.getElementById('settings-custom-topics-list');
  const topics = loadCustomTopics();
  const names = Object.keys(topics);
  if (names.length === 0) {
    container.innerHTML = '<p style="font-size:13px;color:var(--text-secondary);text-align:center;padding:12px 0;">No custom topics yet. Add one above.</p>';
    return;
  }
  container.innerHTML = names.map(name => {
    const count = topics[name].length;
    return '<div class="custom-topic-item">' +
      '<div><span class="custom-topic-name">' + escapeHtml(name) + '</span><span class="custom-topic-count"> (' + count + ' prompts)</span></div>' +
      '<button class="custom-topic-delete-btn" data-topic="' + escapeHtml(name) + '">Delete</button>' +
    '</div>';
  }).join('');
  container.querySelectorAll('.custom-topic-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const topic = btn.dataset.topic;
      const topics = loadCustomTopics();
      delete topics[topic];
      saveCustomTopics(topics);
      updatePromptsWithCustom();
      renderCustomTopics();
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.getElementById('settings-add-topic-btn').addEventListener('click', () => {
  const nameInput = document.getElementById('settings-topic-name');
  const promptsInput = document.getElementById('settings-topic-prompts');
  const name = nameInput.value.trim();
  const prompts = promptsInput.value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  if (!name) { alert('Please enter a topic name.'); return; }
  if (prompts.length < 3) { alert('Please enter at least 3 prompts.'); return; }
  const topics = loadCustomTopics();
  if (topics[name]) { alert('Topic "' + name + '" already exists.'); return; }
  topics[name] = prompts;
  saveCustomTopics(topics);
  updatePromptsWithCustom();
  renderCustomTopics();
  nameInput.value = '';
  promptsInput.value = '';
});

function updatePromptsWithCustom() {
  const custom = loadCustomTopics();
  Object.keys(custom).forEach(key => {
    PROMPTS[key] = custom[key];
  });
}

// Folder open buttons
async function openAppSubdir(subdir) {
  if (!window.__TAURI__?.core?.invoke) {
    alert('File system access is available in the desktop app.');
    return;
  }
  try {
    await window.__TAURI__.core.invoke('open_app_folder', { subdir });
  } catch(e) {
    console.error('Folder open error:', e);
    alert('Error: ' + (e.message || e));
  }
}

document.getElementById('settings-open-writings-btn').addEventListener('click', () => openAppSubdir('writings'));
document.getElementById('settings-open-sessions-btn').addEventListener('click', () => openAppSubdir('sessions'));

// ========== Statistics ==========
function formatTimeLong(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

async function loadStatistics() {
  if (!window.__TAURI__?.core?.invoke) return;
  try {
    const sessions = await window.__TAURI__.core.invoke('get_sessions');

    const totalSessions = sessions.length;
    const totalWords = sessions.reduce((s, x) => s + x.words, 0);
    const totalTime = sessions.reduce((s, x) => s + x.duration_secs, 0);
    const bestWpm = sessions.reduce((s, x) => Math.max(s, x.wpm), 0);

    document.getElementById('stat-total-sessions').textContent = totalSessions;
    document.getElementById('stat-total-words').textContent = totalWords.toLocaleString();
    document.getElementById('stat-total-time').textContent = formatTimeLong(totalTime);
    document.getElementById('stat-best-wpm').textContent = Math.round(bestWpm);

    // Per-mode breakdown
    const modes = { survival: { sessions: [], words: 0, wpm: 0 }, creative: { sessions: [], words: 0, wpm: 0 }, practice: { sessions: [], words: 0, wpm: 0 } };
    sessions.forEach(s => {
      const m = modes[s.mode];
      if (!m) return;
      m.sessions.push(s);
      m.words += s.words;
      m.wpm = Math.max(m.wpm, s.wpm);
    });

    Object.keys(modes).forEach(mode => {
      const m = modes[mode];
      document.getElementById('stat-' + mode + '-sessions').textContent = m.sessions.length;
      document.getElementById('stat-' + mode + '-words').textContent = m.words.toLocaleString();
      document.getElementById('stat-' + mode + '-wpm').textContent = Math.round(m.wpm);
    });

    // Recent sessions (last 20)
    const recent = sessions.slice(-20).reverse();
    const listEl = document.getElementById('stats-recent-list');
    if (recent.length === 0) {
      listEl.innerHTML = '<p style="font-size:13px;color:var(--text-secondary);text-align:center;padding:20px 0;">No sessions recorded yet.</p>';
      return;
    }
    listEl.innerHTML = recent.map(s => {
      const date = s.date ? new Date(s.date).toLocaleDateString() : '--';
      const mode = s.mode || 'unknown';
      return '<div class="stats-recent-item">' +
        '<div class="stats-recent-left">' +
          '<span class="stats-recent-mode-badge ' + mode + '">' + mode.charAt(0).toUpperCase() + mode.slice(1) + '</span>' +
          '<span class="stats-recent-info">' + s.words + ' words \u2022 ' + Math.round(s.wpm) + ' wpm</span>' +
        '</div>' +
        '<div class="stats-recent-meta">' +
          '<span>' + formatTimeLong(s.duration_secs) + '</span>' +
          '<span class="stats-recent-date">' + date + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (e) {
    console.error('Failed to load statistics:', e);
  }
}

// ========== Home Stats ==========
async function loadHomeStats() {
  if (!window.__TAURI__?.core?.invoke) return;
  try {
    const stats = await window.__TAURI__.core.invoke('get_lifetime_stats');
    const maxReasonable = 86400; // 24 hours — anything above is corrupt
    const longest = stats.longest_session_secs <= maxReasonable ? stats.longest_session_secs : 0;
    document.getElementById('home-longest-session').textContent = longest > 0 ? formatTime(longest) : '--';
    document.getElementById('home-most-words').textContent = stats.most_words_session > 0 ? stats.most_words_session.toLocaleString() : '--';
    document.getElementById('home-highest-wpm').textContent = stats.highest_wpm > 0 ? Math.round(stats.highest_wpm) : '--';
    document.getElementById('home-total-sessions').textContent = stats.total_sessions;
    document.getElementById('home-total-words').textContent = stats.total_words > 0 ? stats.total_words.toLocaleString() : '--';
    const totalTime = stats.total_writing_time_secs <= maxReasonable * 365 ? stats.total_writing_time_secs : 0;
    document.getElementById('home-total-time').textContent = totalTime > 0
      ? Math.floor(totalTime / 3600).toString().padStart(2, '0') + ':' +
        (Math.floor(totalTime / 60) % 60).toString().padStart(2, '0') + ':' +
        (totalTime % 60).toString().padStart(2, '0')
      : '--';
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

// ========== Startup ==========
updatePromptsWithCustom();
applyPrefsToSetup();
loadHomeStats();
loadStatistics();

async function checkRecoveryDraft() {
  if (!window.__TAURI__?.core?.invoke) return;
  try {
    const content = await window.__TAURI__.core.invoke('load_recovery_draft');
    if (content) {
      document.getElementById('recovery-overlay').classList.add('active');
      // Store recovered content for use on Restore
      window.__recoveredContent = content;
    }
  } catch (e) {}
}

document.getElementById('recovery-restore-btn').addEventListener('click', () => {
  document.getElementById('recovery-overlay').classList.remove('active');
  const content = window.__recoveredContent;
  if (!content) return;
  window.__recoveredContent = null;
  clearRecoveryDraft();
  startCreative();
  cTextarea.value = content;
});

checkRecoveryDraft();
console.log('BrainSprint v0.1.0 — running in', document.documentElement.getAttribute('data-theme'), 'mode');
