const ID_KEY = 'drawbuilder.editorId.v1';
const NAME_KEY = 'drawbuilder.editorName.v1';

function randomId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'e-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// A stable per-browser identity so we can tell "my own edit echoing back"
// apart from "someone else changed this" — and so presence can show names.
export function getEditorId() {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

export function getEditorName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function setEditorName(name) {
  const v = (name || '').trim().slice(0, 40);
  try {
    if (v) localStorage.setItem(NAME_KEY, v);
    else localStorage.removeItem(NAME_KEY);
  } catch {
    // storage unavailable — name just won't persist across reloads
  }
  return v;
}
