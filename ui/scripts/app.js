// ========== Tauri IPC ==========
const tauri = window.__TAURI__;

// Debug: show __TAURI__ availability in the title bar
const debugTauri = document.getElementById('debug-tauri-status');
if (debugTauri) {
  debugTauri.textContent = tauri ? 'IPC: ok' : 'IPC: no';
  if (tauri) {
    const topKeys = Object.keys(tauri);
    const winKeys = tauri.window ? Object.keys(tauri.window) : [];
    debugTauri.title = 'Top: ' + topKeys.join(', ') + ' | Window: ' + winKeys.join(', ');
  } else {
    debugTauri.title = '__TAURI__ undefined';
  }
}

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
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
}

setTheme(getSystemTheme());

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  setTheme(e.matches ? 'dark' : 'light');
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

  session.countdownTimer = setInterval(tickSurvivalCountdown, 100);
  session.statsTimer = setInterval(updateSurvivalStats, 500);

  setTimeout(() => sTextarea.focus(), 100);
}

function endSurvival() {
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
const cTimerOpts = document.querySelectorAll('#creative-setup .timer-opt');
const cPromptCard = document.getElementById('creative-prompt-card');
const cTimerDisplay = document.getElementById('creative-timer-display');
let creativeShowTopic = true;

let creativeTimerMinutes = 10;
let creativeRemainingSec = null;
let creativeCountdownTimer = null;
let creativeStatsTimer = null;

cTimerOpts.forEach(btn => {
  btn.addEventListener('click', () => {
    if (session.active) return;
    cTimerOpts.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    creativeTimerMinutes = parseInt(btn.dataset.seconds, 10);
    updateCreativeTimerDisplay();
  });
});

function updateCreativeTimerDisplay() {
  if (creativeRemainingSec !== null) {
    const m = Math.floor(creativeRemainingSec / 60);
    const s = creativeRemainingSec % 60;
    cTimerDisplay.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  } else if (creativeTimerMinutes > 0) {
    cTimerDisplay.textContent = String(creativeTimerMinutes).padStart(2, '0') + ':00';
  } else {
    cTimerDisplay.textContent = '--:--';
  }
}

function startCreative() {
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
  creativeRemainingSec = null;
  updateCreativeTimerDisplay();

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

  if (creativeTimerMinutes > 0) {
    creativeRemainingSec = creativeTimerMinutes * 60;
  } else {
    creativeRemainingSec = null;
  }
  updateCreativeTimerDisplay();
  cTimerEl.textContent = cTimerDisplay.textContent;
  cTimerSubEl.textContent = 'Write freely...';
  cProgressFill.style.width = '100%';
  updateCStatsDisplay(0, 0, 0, 0);

  if (creativeRemainingSec !== null) {
    creativeCountdownTimer = setInterval(tickCreativeCountdown, 1000);
  }
  creativeStatsTimer = setInterval(updateCreativeStats, 500);

  setTimeout(() => cTextarea.focus(), 100);
}

function endCreative() {
  session.active = false;
  if (creativeCountdownTimer) {
    clearInterval(creativeCountdownTimer);
    creativeCountdownTimer = null;
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

function tickCreativeCountdown() {
  if (!session.active || session.mode !== 'creative') return;
  if (creativeRemainingSec === null) return;
  creativeRemainingSec -= 1;
  if (creativeRemainingSec <= 0) {
    creativeRemainingSec = 0;
    updateCreativeTimerDisplay();
    cTimerEl.textContent = '00:00';
    cProgressFill.style.width = '0%';
    clearInterval(creativeCountdownTimer);
    creativeCountdownTimer = null;
    endCreative();
    return;
  }
  updateCreativeTimerDisplay();
  cTimerEl.textContent = cTimerDisplay.textContent;
  const total = creativeTimerMinutes * 60;
  const pct = (creativeRemainingSec / total) * 100;
  cProgressFill.style.width = pct + '%';
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
  session.active = false;
  clearInterval(session.countdownTimer);
  clearInterval(session.statsTimer);
  if (creativeCountdownTimer) {
    clearInterval(creativeCountdownTimer);
    creativeCountdownTimer = null;
  }
  if (creativeStatsTimer) {
    clearInterval(creativeStatsTimer);
    creativeStatsTimer = null;
  }
  if (practiceCountdownTimer) {
    clearInterval(practiceCountdownTimer);
    practiceCountdownTimer = null;
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
  scOverlay.classList.remove('active');
  document.querySelector('.nav-item[data-view="home"]')?.click();
});

// Save is placeholder for Milestone 8
document.getElementById('sc-save-btn').addEventListener('click', () => {
  scOverlay.classList.remove('active');
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
const pTimerDisplay = document.getElementById('practice-timer-display');
const pStatWords = document.getElementById('p-stat-words');
const pStatChars = document.getElementById('p-stat-chars');
const pStatWpm = document.getElementById('p-stat-wpm');
const pStatTime = document.getElementById('p-stat-time');
const pTimerOpts = document.querySelectorAll('#practice-body .timer-opt');
const pBeginBtn = document.getElementById('practice-begin-btn');

let practiceTimerMinutes = 10;
let practiceRemainingSec = null;
let practiceCountdownTimer = null;
let practiceStatsTimer = null;

pTimerOpts.forEach(btn => {
  btn.addEventListener('click', () => {
    if (session.active) return;
    pTimerOpts.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    practiceTimerMinutes = parseInt(btn.dataset.seconds, 10);
    updatePracticeTimerDisplay();
  });
});

function updatePracticeTimerDisplay() {
  if (practiceRemainingSec !== null) {
    const m = Math.floor(practiceRemainingSec / 60);
    const s = practiceRemainingSec % 60;
    pTimerDisplay.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  } else if (practiceTimerMinutes > 0) {
    pTimerDisplay.textContent = String(practiceTimerMinutes).padStart(2, '0') + ':00';
  } else {
    pTimerDisplay.textContent = '--:--';
  }
}

function startPractice() {
  pickFreshPrompt();
  session.mode = 'practice';
  session.active = false;

  pTextarea.value = '';
  pTextarea.disabled = true;
  pBeginBtn.classList.remove('hidden');
  pTopicEl.textContent = currentTopic || 'Free Writing';
  pPromptEl.textContent = currentPrompt || 'Write freely about whatever comes to mind.';

  practiceRemainingSec = null;
  updatePracticeTimerDisplay();

  document.body.classList.add('practicing');
  practiceView.classList.add('active');
  updatePStatsDisplay(0, 0, 0, 0);
}

function beginPracticeSession() {
  session.active = true;
  session.startTime = Date.now();

  pTextarea.disabled = false;
  pBeginBtn.classList.add('hidden');

  if (practiceTimerMinutes > 0) {
    practiceRemainingSec = practiceTimerMinutes * 60;
  } else {
    practiceRemainingSec = null;
  }
  updatePracticeTimerDisplay();

  if (practiceRemainingSec !== null) {
    practiceCountdownTimer = setInterval(tickPracticeCountdown, 1000);
  }
  practiceStatsTimer = setInterval(updatePStats, 500);

  setTimeout(() => pTextarea.focus(), 100);
}

function tickPracticeCountdown() {
  if (!session.active || session.mode !== 'practice') return;
  if (practiceRemainingSec === null) return;
  practiceRemainingSec -= 1;
  if (practiceRemainingSec <= 0) {
    practiceRemainingSec = 0;
    updatePracticeTimerDisplay();
    clearInterval(practiceCountdownTimer);
    practiceCountdownTimer = null;
    endPractice();
    return;
  }
  updatePracticeTimerDisplay();
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
  session.active = false;
  if (practiceCountdownTimer) {
    clearInterval(practiceCountdownTimer);
    practiceCountdownTimer = null;
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
document.getElementById('practice-end-btn').addEventListener('click', () => {
  if (session.active) endPractice();
});
document.getElementById('practice-leave-btn').addEventListener('click', () => {
  if (session.active) {
    showLeaveConfirm();
  } else {
    document.body.classList.remove('practicing');
    practiceView.classList.remove('active');
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

// ========== Startup ==========
console.log('BrainSprint v1.0 — running in', document.documentElement.getAttribute('data-theme'), 'mode');
