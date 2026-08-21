const KEY = 'db-theme'; // 'light' | 'dark' | null (null = follow system)

export function getStoredTheme() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function apply(theme) {
  const root = document.documentElement;
  if (theme === 'dark' || theme === 'light') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
}

// Called once, synchronously, before the app renders — avoids a flash of
// the wrong theme on load.
export function initTheme() {
  apply(getStoredTheme());
}

export function resolvedTheme() {
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme) {
  try {
    if (theme) localStorage.setItem(KEY, theme);
    else localStorage.removeItem(KEY);
  } catch {
    // ignore — theme just won't persist across reloads
  }
  apply(theme);
}
