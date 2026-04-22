export interface RecentSnippet {
  id: string;
  title: string;
  content: string;
  savedAt: number;
  kind?: 'edit' | 'import' | 'sample' | 'restore';
  summary?: string;
  snapshot?: WorkspaceSnapshot;
}

export interface WorkspaceSnapshot {
  primaryText: string;
  compareText: string;
  schemaText: string;
  outputTab: string;
  selectedPath: string | null;
}

interface AddRecentSnippetOptions {
  title?: string;
  summary?: string;
  kind?: RecentSnippet['kind'];
  snapshot?: WorkspaceSnapshot;
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

function buildSummary(kind: RecentSnippet['kind'], title: string) {
  if (kind === 'import') {
    return `Imported ${title}.`;
  }

  if (kind === 'sample') {
    return `Loaded ${title} sample.`;
  }

  if (kind === 'restore') {
    return `Restored ${title} from history.`;
  }

  return `Edited ${title}.`;
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

export function addRecentSnippet(content: string, existing: RecentSnippet[] = [], options: AddRecentSnippetOptions = {}): RecentSnippet[] {
  const title = options.title ?? buildTitle(content);
  const kind = options.kind ?? 'edit';
  const snippet: RecentSnippet = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    content,
    savedAt: Date.now(),
    kind,
    summary: options.summary ?? buildSummary(kind, title),
    snapshot: options.snapshot
  };

  const combined = [snippet, ...existing.filter((entry) => entry.content !== content || entry.kind !== kind)];
  return combined.slice(0, MAX_RECENT_SNIPPETS);
}

export function clearRecentSnippets() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(RECENT_SNIPPETS_KEY);
}