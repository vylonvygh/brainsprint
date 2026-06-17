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
  document.body.classList.remove('sprinting', 'topicking', 'practicing');
  sprintView.classList.remove('active');
  topicView.classList.remove('active');
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

    if (viewId === 'sprint') {
      startSprint();
      return;
    }
    if (viewId === 'topic') {
      startTopic();
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
  mode: 'sprint',
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
  document.getElementById('session-complete-overlay').classList.add('active');
}

// ========== Sprint Mode ==========
const sprintView = document.getElementById('sprint-view');
const textarea = document.getElementById('sprint-textarea');
const sprintTimerEl = document.getElementById('sprint-timer');
const sprintTimerSubEl = document.getElementById('sprint-timer-sub');
const sprintProgressFill = document.getElementById('sprint-progress-fill');
const sprintSetup = document.getElementById('sprint-setup');
const sprintActive = document.getElementById('sprint-active');
const sprintBeginBtn = document.getElementById('sprint-begin-btn');
const statWords = document.getElementById('stat-words');
const statChars = document.getElementById('stat-chars');
const statWpm = document.getElementById('stat-wpm');
const statTime = document.getElementById('stat-time');

let sprintTimeoutMs = 5000;
let sprintCurrentMs = 5000;

function startSprint() {
  session.mode = 'sprint';
  session.active = false;

  textarea.value = '';
  textarea.disabled = true;
  sprintSetup.classList.remove('hidden');
  sprintActive.classList.add('hidden');

  document.body.classList.add('sprinting');
  sprintView.classList.add('active');
}

function beginSprintSession() {
  session.active = true;
  session.startTime = Date.now();
  sprintTimeoutMs = 5000;
  sprintCurrentMs = 5000;

  textarea.disabled = false;
  sprintSetup.classList.add('hidden');
  sprintActive.classList.remove('hidden');

  sprintTimerEl.textContent = '00:05';
  sprintTimerSubEl.textContent = 'Keep writing...';
  sprintProgressFill.style.width = '100%';
  updateStatsDisplay(0, 0, 0, 0);

  session.countdownTimer = setInterval(tickSprintCountdown, 100);
  session.statsTimer = setInterval(updateSprintStats, 500);

  setTimeout(() => textarea.focus(), 100);
}

function endSprint() {
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

  showSessionComplete(elapsed, words, wpm, chars);
}

function tickSprintCountdown() {
  if (!session.active || session.mode !== 'sprint') return;
  sprintCurrentMs -= 100;
  if (sprintCurrentMs <= 0) {
    sprintCurrentMs = 0;
    sprintTimerEl.textContent = '00:00';
    sprintProgressFill.style.width = '0%';
    endSprint();
    return;
  }
  sprintTimerEl.textContent = formatCountdown(sprintCurrentMs);
  const pct = (sprintCurrentMs / sprintTimeoutMs) * 100;
  sprintProgressFill.style.width = pct + '%';
}

function resetSprintCountdown() {
  if (!session.active || session.mode !== 'sprint') return;
  sprintCurrentMs = sprintTimeoutMs;
  sprintTimerEl.textContent = formatCountdown(sprintTimeoutMs);
  sprintProgressFill.style.width = '100%';
}

function updateSprintStats() {
  if (!session.active || session.mode !== 'sprint') return;
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

// Sprint events
sprintBeginBtn.addEventListener('click', beginSprintSession);
textarea.addEventListener('input', resetSprintCountdown);
document.getElementById('sprint-end-btn').addEventListener('click', endSprint);
document.getElementById('sprint-leave-btn').addEventListener('click', () => {
  if (session.active && session.mode === 'sprint') showLeaveConfirm();
});

// ========== Topic Mode ==========
const topicView = document.getElementById('topic-view');
const tTextarea = document.getElementById('topic-textarea');
const tTimerEl = document.getElementById('topic-timer');
const tTimerSubEl = document.getElementById('topic-timer-sub');
const tProgressFill = document.getElementById('topic-progress-fill');
const tSetup = document.getElementById('topic-setup');
const tActive = document.getElementById('topic-active');
const tBeginBtn = document.getElementById('topic-begin-btn');
const tStatWords = document.getElementById('t-stat-words');
const tStatChars = document.getElementById('t-stat-chars');
const tStatWpm = document.getElementById('t-stat-wpm');
const tStatTime = document.getElementById('t-stat-time');
const tTopicEl = document.getElementById('topic-prompt-topic');
const tPromptEl = document.getElementById('topic-prompt-text');
const tTimerOpts = document.querySelectorAll('#topic-setup .timer-opt');

let topicTimeoutMs = 5000;
let topicCurrentMs = 5000;
let topicCountdownTimer = null;
let topicStatsTimer = null;

tTimerOpts.forEach(btn => {
  btn.addEventListener('click', () => {
    if (session.active) return;
    tTimerOpts.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    topicTimeoutMs = parseInt(btn.dataset.seconds, 10) * 1000;
    tTimerEl.textContent = formatCountdown(topicTimeoutMs);
  });
});

function startTopic() {
  pickFreshPrompt();
  session.mode = 'topic';
  session.active = false;

  tTextarea.value = '';
  tTextarea.disabled = true;
  tSetup.classList.remove('hidden');
  tActive.classList.add('hidden');
  tTopicEl.textContent = currentTopic || 'Free Writing';
  tPromptEl.textContent = currentPrompt || 'Write freely about whatever comes to mind.';

  document.body.classList.add('topicking');
  topicView.classList.add('active');
  updateTopicStatsDisplay(0, 0, 0, 0);
}

function beginTopicSession() {
  session.active = true;
  session.startTime = Date.now();
  topicCurrentMs = topicTimeoutMs;

  tTextarea.disabled = false;
  tSetup.classList.add('hidden');
  tActive.classList.remove('hidden');

  tTimerEl.textContent = formatCountdown(topicTimeoutMs);
  tTimerSubEl.textContent = 'Keep writing...';
  tProgressFill.style.width = '100%';
  updateTopicStatsDisplay(0, 0, 0, 0);

  topicCountdownTimer = setInterval(tickTopicCountdown, 100);
  topicStatsTimer = setInterval(updateTopicStats, 500);

  setTimeout(() => tTextarea.focus(), 100);
}

function endTopic() {
  session.active = false;
  if (topicCountdownTimer) {
    clearInterval(topicCountdownTimer);
    topicCountdownTimer = null;
  }
  clearInterval(topicStatsTimer);
  tTextarea.disabled = true;

  const finalText = tTextarea.value;
  const words = countWords(finalText);
  const chars = finalText.length;
  const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  const wpm = elapsed > 0 ? Math.round(words / (elapsed / 60)) : 0;

  document.body.classList.remove('topicking');
  topicView.classList.remove('active');

  showSessionComplete(elapsed, words, wpm, chars);
}

function tickTopicCountdown() {
  if (!session.active || session.mode !== 'topic') return;
  topicCurrentMs -= 100;
  if (topicCurrentMs <= 0) {
    topicCurrentMs = 0;
    tTimerEl.textContent = '00:00';
    tProgressFill.style.width = '0%';
    endTopic();
    return;
  }
  tTimerEl.textContent = formatCountdown(topicCurrentMs);
  const pct = (topicCurrentMs / topicTimeoutMs) * 100;
  tProgressFill.style.width = pct + '%';
}

function resetTopicCountdown() {
  if (!session.active || session.mode !== 'topic') return;
  topicCurrentMs = topicTimeoutMs;
  tTimerEl.textContent = formatCountdown(topicTimeoutMs);
  tProgressFill.style.width = '100%';
}

function updateTopicStats() {
  if (!session.active || session.mode !== 'topic') return;
  const text = tTextarea.value;
  const words = countWords(text);
  const chars = text.length;
  const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  const wpm = elapsed > 0 ? Math.round(words / (elapsed / 60)) : 0;
  updateTopicStatsDisplay(words, chars, wpm, elapsed);
}

function updateTopicStatsDisplay(words, chars, wpm, elapsed) {
  tStatWords.textContent = words.toLocaleString();
  tStatChars.textContent = chars.toLocaleString();
  tStatWpm.textContent = wpm;
  tStatTime.textContent = formatTime(elapsed);
}

// Topic events
tBeginBtn.addEventListener('click', beginTopicSession);
tTextarea.addEventListener('input', resetTopicCountdown);
document.getElementById('topic-end-btn').addEventListener('click', endTopic);
document.getElementById('topic-leave-btn').addEventListener('click', () => {
  if (session.active && session.mode === 'topic') showLeaveConfirm();
});
document.getElementById('topic-new-prompt-btn').addEventListener('click', () => {
  if (session.active) return;
  pickFreshPrompt();
  tTopicEl.textContent = currentTopic || 'Free Writing';
  tPromptEl.textContent = currentPrompt || 'Write freely about whatever comes to mind.';
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
    sprint: textarea,
    topic: tTextarea,
    practice: pTextarea,
  }[session.mode] || textarea;
  setTimeout(() => target.focus(), 100);
});

document.getElementById('leave-leave-btn').addEventListener('click', () => {
  hideLeaveConfirm();
  session.active = false;
  clearInterval(session.countdownTimer);
  clearInterval(session.statsTimer);
  if (topicCountdownTimer) {
    clearInterval(topicCountdownTimer);
    topicCountdownTimer = null;
  }
  if (topicStatsTimer) {
    clearInterval(topicStatsTimer);
    topicStatsTimer = null;
  }
  if (practiceCountdownTimer) {
    clearInterval(practiceCountdownTimer);
    practiceCountdownTimer = null;
  }
  if (practiceStatsTimer) {
    clearInterval(practiceStatsTimer);
    practiceStatsTimer = null;
  }
  textarea.disabled = true;
  tTextarea.disabled = true;
  pTextarea.disabled = true;
  document.body.classList.remove('sprinting', 'topicking', 'practicing');
  sprintView.classList.remove('active');
  topicView.classList.remove('active');
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
  else if (session.mode === 'topic') startTopic();
  else startSprint();
});

document.getElementById('sc-discard-btn').addEventListener('click', () => {
  scOverlay.classList.remove('active');
  document.querySelector('.nav-item[data-view="home"]')?.click();
});

// Save is placeholder for Milestone 8
document.getElementById('sc-save-btn').addEventListener('click', () => {
  scOverlay.classList.remove('active');
});

// ========== Topics / Prompts ==========
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
document.querySelector('.start-sprint-btn').addEventListener('click', () => {
  exitAllSetup();
  startSprint();
});
document.querySelector('.start-topic-btn')?.addEventListener('click', () => {
  exitAllSetup();
  startTopic();
});
document.querySelector('.start-practice-btn')?.addEventListener('click', () => {
  exitAllSetup();
  startPractice();
});

// ========== Startup ==========
console.log('BrainSprint v1.0 — running in', document.documentElement.getAttribute('data-theme'), 'mode');
