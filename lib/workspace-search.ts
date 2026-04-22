import { flattenJsonEntries, type JsonValue } from '@/lib/json-utils';

export type WorkspaceSearchMode = 'all' | 'keys' | 'values' | 'paths';

export interface WorkspaceSearchResult {
  path: string;
  key: string;
  type: string;
  preview: string;
  depth: number;
  score: number;
}

function normalize(query: string) {
  return query.trim().toLowerCase();
}

export function searchJsonValue(value: JsonValue, query: string, mode: WorkspaceSearchMode = 'all'): WorkspaceSearchResult[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return [];
  }

  const rows = flattenJsonEntries(value);
  const results = rows
    .map((row) => {
      const haystack = {
        key: row.key.toLowerCase(),
        path: row.path.toLowerCase(),
        type: row.type.toLowerCase(),
        preview: row.preview.toLowerCase(),
        value: JSON.stringify(row.value).toLowerCase()
      };

      const matches =
        (mode === 'all' || mode === 'keys') && haystack.key.includes(normalizedQuery) ||
        (mode === 'all' || mode === 'paths') && haystack.path.includes(normalizedQuery) ||
        (mode === 'all' || mode === 'values') && (haystack.preview.includes(normalizedQuery) || haystack.value.includes(normalizedQuery));

      if (!matches) {
        return null;
      }

      const score =
        (haystack.path === normalizedQuery ? 0 : 0) +
        (haystack.path.startsWith(normalizedQuery) ? 0 : 1) +
        (haystack.key.startsWith(normalizedQuery) ? 0 : 2) +
        (haystack.preview.includes(normalizedQuery) ? 0 : 4) +
        row.depth;

      return {
        path: row.path,
        key: row.key,
        type: row.type,
        preview: row.preview,
        depth: row.depth,
        score
      };
    })
    .filter((entry): entry is WorkspaceSearchResult => Boolean(entry))
    .sort((left, right) => left.score - right.score || left.path.localeCompare(right.path));

  return results;
}
