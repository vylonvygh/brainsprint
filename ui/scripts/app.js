// ========== Window Controls ==========
const appWindow = window.__TAURI__?.window?.getCurrentWindow();

document.getElementById('minimize-btn').addEventListener('click', () => {
  appWindow?.minimize();
});

document.getElementById('maximize-btn').addEventListener('click', async () => {
  if (appWindow) {
    const maximized = await appWindow.isMaximized();
    if (maximized) {
      appWindow.unmaximize();
    } else {
      appWindow.maximize();
    }
  }
});

document.getElementById('close-btn').addEventListener('click', () => {
  appWindow?.close();
});

// Update maximize icon on state change
appWindow?.onResized(async () => {
  if (appWindow) {
    const maximized = await appWindow.isMaximized();
    const maxBtn = document.getElementById('maximize-btn');
    if (maximized) {
      maxBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12"><rect x="2.5" y="2.5" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1"/><rect x="1.5" y="4.5" width="7" height="7" rx="1" fill="var(--bg-secondary)" stroke="currentColor" stroke-width="1"/></svg>`;
    } else {
      maxBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1"/></svg>`;
    }
  }
});

// ========== Navigation ==========
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');

    const viewId = item.dataset.view;
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

// Initialize: use system theme by default
setTheme(getSystemTheme());

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  setTheme(e.matches ? 'dark' : 'light');
});

// Manual toggle
document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

// ========== Startup ==========
console.log('BrainSprint v1.0 — running in', document.documentElement.getAttribute('data-theme'), 'mode');
