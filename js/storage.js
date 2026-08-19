// All persistence is localStorage only — nothing ever leaves the browser.

const VERSION = 'v1';
const stateKey = (typeId) => `fsai:${VERSION}:state:${typeId}`;
const SUGGESTIONS_KEY = `fsai:${VERSION}:suggestions`;
const LAST_GENERAL_KEY = `fsai:${VERSION}:last-general`;

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
    return true;
  } catch {
    // Storage full or unavailable (e.g. private browsing) — the app still
    // works, it just won't persist between reloads. Caller surfaces this to
    // the user rather than failing silently, since otherwise there's no way
    // to know an edit was never actually saved until it's already lost.
    return false;
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

// Company/Location as last set in ANY asset type's Shared Defaults — used
// to prefill a type the first time it's visited (see emptyState() in
// app.js), so a multi-type import session doesn't mean re-picking the same
// site on every tab. Only read when a type has no saved state of its own
// yet; once a type has been touched, its own saved defaults always win.
export function loadLastGeneral() {
  try {
    const raw = localStorage.getItem(LAST_GENERAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLastGeneral(general) {
  try {
    localStorage.setItem(LAST_GENERAL_KEY, JSON.stringify(general));
  } catch {
    /* ignore */
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
