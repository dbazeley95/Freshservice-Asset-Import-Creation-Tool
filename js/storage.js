// All persistence is localStorage only — nothing ever leaves the browser.

const VERSION = 'v1';
const stateKey = (typeId) => `fsai:${VERSION}:state:${typeId}`;
const SUGGESTIONS_KEY = `fsai:${VERSION}:suggestions`;

export function loadState(typeId) {
  try {
    const raw = localStorage.getItem(stateKey(typeId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveState(typeId, state) {
  try {
    localStorage.setItem(stateKey(typeId), JSON.stringify(state));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — fail silently,
    // the app still works, it just won't persist between reloads.
  }
}

export function clearState(typeId) {
  try {
    localStorage.removeItem(stateKey(typeId));
  } catch {
    /* ignore */
  }
}

export function loadSuggestions() {
  try {
    const raw = localStorage.getItem(SUGGESTIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function addSuggestion(field, value) {
  if (!value) return;
  const suggestions = loadSuggestions();
  const list = suggestions[field] || [];
  if (!list.includes(value)) {
    list.unshift(value);
    suggestions[field] = list.slice(0, 25);
    try {
      localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions));
    } catch {
      /* ignore */
    }
  }
}
