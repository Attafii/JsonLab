export interface RecentSnippet {
  id: string;
  title: string;
  content: string;
  savedAt: number;
}

const RECENT_SNIPPETS_KEY = 'jsonlab.recent-snippets.v1';
const MAX_RECENT_SNIPPETS = 12;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function buildTitle(content: string) {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (Array.isArray(parsed)) {
      return `Array(${parsed.length})`;
    }

    if (parsed && typeof parsed === 'object') {
      return `Object(${Object.keys(parsed as Record<string, unknown>).length})`;
    }
  } catch {
    // Ignore parse errors; fall back to text summary.
  }

  return content.length > 32 ? `${content.slice(0, 32)}…` : content;
}

export function loadRecentSnippets(): RecentSnippet[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_SNIPPETS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as RecentSnippet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentSnippets(entries: RecentSnippet[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(RECENT_SNIPPETS_KEY, JSON.stringify(entries.slice(0, MAX_RECENT_SNIPPETS)));
}

export function addRecentSnippet(content: string, existing: RecentSnippet[] = []): RecentSnippet[] {
  const title = buildTitle(content);
  const snippet: RecentSnippet = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    content,
    savedAt: Date.now()
  };

  const combined = [snippet, ...existing.filter((entry) => entry.content !== content)];
  return combined.slice(0, MAX_RECENT_SNIPPETS);
}

export function clearRecentSnippets() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(RECENT_SNIPPETS_KEY);
}