export type JsonPrimitive = string | number | boolean | null;
export interface JsonArray extends Array<unknown> {}
export interface JsonObject {
  [key: string]: unknown;
}
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export interface JsonParseIssue {
  message: string;
  position?: number;
  line?: number;
  column?: number;
}

export interface JsonMetrics {
  nodeCount: number;
  leafCount: number;
  objectCount: number;
  arrayCount: number;
  maxDepth: number;
}

export interface JsonAnalysis {
  text: string;
  value: JsonValue | null;
  error: JsonParseIssue | null;
  isValid: boolean;
  byteLength: number;
  lineCount: number;
  formatted: string;
  minified: string;
  metrics: JsonMetrics;
}

export interface FlatJsonRow {
  path: string;
  key: string;
  type: string;
  preview: string;
  value: JsonValue;
  depth: number;
  hasChildren: boolean;
}

export interface JsonDiffRow {
  path: string;
  kind: 'added' | 'removed' | 'changed' | 'unchanged';
  left: JsonValue | undefined;
  right: JsonValue | undefined;
  leftPreview: string;
  rightPreview: string;
  summary: string;
  depth: number;
}

export interface CsvArtifact {
  supported: boolean;
  csv: string;
  headers: string[];
  rows: string[][];
  reason?: string;
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function jsonTypeOf(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  return typeof value;
}

export function safeStringifyJson(value: unknown, space = 2): string {
  return JSON.stringify(value, null, space) ?? '';
}

function lineAndColumnFromPosition(text: string, position: number) {
  let line = 1;
  let column = 1;

  for (let index = 0; index < position && index < text.length; index += 1) {
    if (text[index] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

function parseJsonIssue(text: string, error: unknown): JsonParseIssue {
  const message = error instanceof Error ? error.message : 'Unable to parse JSON.';
  const issue: JsonParseIssue = { message };

  const positionMatch = /position (\d+)/i.exec(message) ?? /char(?:acter)? (\d+)/i.exec(message);
  if (positionMatch?.[1]) {
    const position = Number(positionMatch[1]);
    issue.position = position;
    const coordinates = lineAndColumnFromPosition(text, Math.max(0, position - 1));
    issue.line = coordinates.line;
    issue.column = coordinates.column;
  }

  const lineMatch = /line (\d+)[^\d]+column (\d+)/i.exec(message) ?? /at line (\d+), column (\d+)/i.exec(message);
  if (lineMatch?.[1] && lineMatch?.[2]) {
    issue.line = Number(lineMatch[1]);
    issue.column = Number(lineMatch[2]);
  }

  return issue;
}

export function analyzeJson(text: string): JsonAnalysis {
  const trimmed = text.trim();
  const byteLength = new TextEncoder().encode(text).length;
  const lineCount = text ? text.split(/\r?\n/).length : 0;

  if (!trimmed) {
    return {
      text,
      value: null,
      error: { message: 'Paste JSON to begin.' },
      isValid: false,
      byteLength,
      lineCount,
      formatted: '',
      minified: '',
      metrics: {
        nodeCount: 0,
        leafCount: 0,
        objectCount: 0,
        arrayCount: 0,
        maxDepth: 0
      }
    };
  }

  try {
    const value = JSON.parse(text) as JsonValue;
    const metrics = collectJsonMetrics(value);

    return {
      text,
      value,
      error: null,
      isValid: true,
      byteLength,
      lineCount,
      formatted: safeStringifyJson(value, 2),
      minified: safeStringifyJson(value, 0),
      metrics
    };
  } catch (error) {
    return {
      text,
      value: null,
      error: parseJsonIssue(text, error),
      isValid: false,
      byteLength,
      lineCount,
      formatted: text,
      minified: text,
      metrics: {
        nodeCount: 0,
        leafCount: 0,
        objectCount: 0,
        arrayCount: 0,
        maxDepth: 0
      }
    };
  }
}

export function collectJsonMetrics(value: JsonValue, depth = 1): JsonMetrics {
  const metrics: JsonMetrics = {
    nodeCount: 1,
    leafCount: 0,
    objectCount: 0,
    arrayCount: 0,
    maxDepth: depth
  };

  if (Array.isArray(value)) {
    metrics.arrayCount += 1;

    for (const entry of value) {
      const child = collectJsonMetrics(entry as JsonValue, depth + 1);
      metrics.nodeCount += child.nodeCount;
      metrics.leafCount += child.leafCount;
      metrics.objectCount += child.objectCount;
      metrics.arrayCount += child.arrayCount;
      metrics.maxDepth = Math.max(metrics.maxDepth, child.maxDepth);
    }

    return metrics;
  }

  if (isJsonObject(value)) {
    metrics.objectCount += 1;

    for (const entry of Object.values(value)) {
      const child = collectJsonMetrics(entry as JsonValue, depth + 1);
      metrics.nodeCount += child.nodeCount;
      metrics.leafCount += child.leafCount;
      metrics.objectCount += child.objectCount;
      metrics.arrayCount += child.arrayCount;
      metrics.maxDepth = Math.max(metrics.maxDepth, child.maxDepth);
    }

    return metrics;
  }

  metrics.leafCount += 1;
  return metrics;
}

export function formatJsonText(text: string): string {
  const analysis = analyzeJson(text);
  return analysis.isValid && analysis.value !== null ? safeStringifyJson(analysis.value, 2) : text;
}

export function minifyJsonText(text: string): string {
  const analysis = analyzeJson(text);
  return analysis.isValid && analysis.value !== null ? safeStringifyJson(analysis.value, 0) : text;
}

function pathSegmentForKey(key: string) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`;
}

function joinJsonPath(path: string, key: string | number) {
  if (typeof key === 'number') {
    return `${path}[${key}]`;
  }

  return path === '$' ? `$${pathSegmentForKey(key)}` : `${path}${pathSegmentForKey(key)}`;
}

function previewJsonValue(value: unknown, limit = 88) {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return value.length > limit ? `${JSON.stringify(value.slice(0, limit - 1))}…` : JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[Array(${value.length})]`;
  }

  const keys = Object.keys(value as Record<string, unknown>);
  return `{${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ', …' : ''}}`;
}

export function flattenJsonEntries(value: JsonValue, path = '$'): FlatJsonRow[] {
  const rows: FlatJsonRow[] = [];

  const walk = (current: JsonValue, currentPath: string) => {
    if (Array.isArray(current)) {
      if (current.length === 0) {
        rows.push({
          path: currentPath,
          key: currentPath.split(/[.[\]]/).filter(Boolean).at(-1) ?? '$',
          type: 'array',
          preview: '[]',
          value: current,
          depth: currentPath.split('.').length,
          hasChildren: false
        });
        return;
      }

      current.forEach((entry, index) => walk(entry as JsonValue, joinJsonPath(currentPath, index)));
      return;
    }

    if (isJsonObject(current)) {
      const entries = Object.entries(current);
      if (entries.length === 0) {
        rows.push({
          path: currentPath,
          key: currentPath.split(/[.[\]]/).filter(Boolean).at(-1) ?? '$',
          type: 'object',
          preview: '{}',
          value: current,
          depth: currentPath.split('.').length,
          hasChildren: false
        });
        return;
      }

      for (const [key, entry] of entries) {
        walk(entry as JsonValue, joinJsonPath(currentPath, key));
      }
      return;
    }

    rows.push({
      path: currentPath,
      key: currentPath.split(/[.[\]]/).filter(Boolean).at(-1) ?? '$',
      type: jsonTypeOf(current),
      preview: previewJsonValue(current),
      value: current,
      depth: currentPath.split('.').length,
      hasChildren: false
    });
  };

  walk(value, path);
  return rows;
}

function deepEqualJson(left: JsonValue, right: JsonValue): boolean {
  if (left === right) {
    return true;
  }

  if (typeof left !== typeof right) {
    return false;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((entry, index) => deepEqualJson(entry as JsonValue, right[index] as JsonValue));
  }

  if (isJsonObject(left) && isJsonObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    return leftKeys.every((key) => {
      if (!Object.prototype.hasOwnProperty.call(right, key)) {
        return false;
      }

      return deepEqualJson(left[key] as JsonValue, right[key] as JsonValue);
    });
  }

  return false;
}

function diffSummary(kind: JsonDiffRow['kind'], path: string, left?: JsonValue, right?: JsonValue) {
  switch (kind) {
    case 'added':
      return `${path} was added`;
    case 'removed':
      return `${path} was removed`;
    case 'changed':
      return `${path} changed`;
    default:
      return `${path} is unchanged`;
  }
}

export function diffJsonValues(left: JsonValue, right: JsonValue, path = '$', depth = 1): JsonDiffRow[] {
  if (deepEqualJson(left, right)) {
    return [
      {
        path,
        kind: 'unchanged',
        left,
        right,
        leftPreview: previewJsonValue(left),
        rightPreview: previewJsonValue(right),
        summary: diffSummary('unchanged', path, left, right),
        depth
      }
    ];
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    const rows: JsonDiffRow[] = [];
    const maxLength = Math.max(left.length, right.length);

    for (let index = 0; index < maxLength; index += 1) {
      const nextPath = joinJsonPath(path, index);
      const leftValue = left[index] as JsonValue | undefined;
      const rightValue = right[index] as JsonValue | undefined;

      if (index >= left.length) {
        rows.push({
          path: nextPath,
          kind: 'added',
          left: undefined,
          right: rightValue,
          leftPreview: '—',
          rightPreview: previewJsonValue(rightValue as JsonValue),
          summary: diffSummary('added', nextPath),
          depth: depth + 1
        });
        continue;
      }

      if (index >= right.length) {
        rows.push({
          path: nextPath,
          kind: 'removed',
          left: leftValue,
          right: undefined,
          leftPreview: previewJsonValue(leftValue as JsonValue),
          rightPreview: '—',
          summary: diffSummary('removed', nextPath),
          depth: depth + 1
        });
        continue;
      }

      rows.push(...diffJsonValues(leftValue as JsonValue, rightValue as JsonValue, nextPath, depth + 1));
    }

    return rows;
  }

  if (isJsonObject(left) && isJsonObject(right)) {
    const rows: JsonDiffRow[] = [];
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

    for (const key of keys) {
      const nextPath = joinJsonPath(path, key);
      const leftExists = Object.prototype.hasOwnProperty.call(left, key);
      const rightExists = Object.prototype.hasOwnProperty.call(right, key);

      if (!leftExists && rightExists) {
        const rightValue = right[key] as JsonValue;
        rows.push({
          path: nextPath,
          kind: 'added',
          left: undefined,
          right: rightValue,
          leftPreview: '—',
          rightPreview: previewJsonValue(rightValue),
          summary: diffSummary('added', nextPath),
          depth: depth + 1
        });
        continue;
      }

      if (leftExists && !rightExists) {
        const leftValue = left[key] as JsonValue;
        rows.push({
          path: nextPath,
          kind: 'removed',
          left: leftValue,
          right: undefined,
          leftPreview: previewJsonValue(leftValue),
          rightPreview: '—',
          summary: diffSummary('removed', nextPath),
          depth: depth + 1
        });
        continue;
      }

      const leftValue = left[key];
      const rightValue = right[key];
      const leftJsonValue = leftValue as JsonValue;
      const rightJsonValue = rightValue as JsonValue;

      if (isJsonObject(leftValue) || Array.isArray(leftValue) || isJsonObject(rightValue) || Array.isArray(rightValue)) {
        if (leftValue !== undefined && rightValue !== undefined) {
          rows.push(...diffJsonValues(leftJsonValue, rightJsonValue, nextPath, depth + 1));
        }
      } else if (leftValue !== rightValue) {
        rows.push({
          path: nextPath,
          kind: 'changed',
          left: leftJsonValue,
          right: rightJsonValue,
          leftPreview: previewJsonValue(leftValue),
          rightPreview: previewJsonValue(rightValue),
          summary: diffSummary('changed', nextPath, leftJsonValue, rightJsonValue),
          depth: depth + 1
        });
      } else {
        rows.push({
          path: nextPath,
          kind: 'unchanged',
          left: leftJsonValue,
          right: rightJsonValue,
          leftPreview: previewJsonValue(leftValue),
          rightPreview: previewJsonValue(rightValue),
          summary: diffSummary('unchanged', nextPath, leftJsonValue, rightJsonValue),
          depth: depth + 1
        });
      }
    }

    return rows;
  }

  return [
    {
      path,
      kind: 'changed',
      left,
      right,
      leftPreview: previewJsonValue(left),
      rightPreview: previewJsonValue(right),
      summary: diffSummary('changed', path, left, right),
      depth
    }
  ];
}

function formatYamlKey(key: string) {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(key) ? key : JSON.stringify(key);
}

function formatYamlScalar(value: JsonPrimitive) {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  return String(value);
}

function renderYamlLines(value: JsonValue, indent = 0): string[] {
  const padding = '  '.repeat(indent);

  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [`${padding}${formatYamlScalar(value)}`];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${padding}[]`];
    }

    const lines: string[] = [];
    for (const entry of value) {
      if (entry === null || typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
        lines.push(`${padding}- ${formatYamlScalar(entry)}`);
        continue;
      }

      const childLines = renderYamlLines(entry as JsonValue, indent + 1);
      const [first, ...rest] = childLines;
      lines.push(`${padding}- ${first.trimStart()}`);

      if (rest.length > 0) {
        lines.push(...rest);
      }
    }

    return lines;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return [`${padding}{}`];
  }

  const lines: string[] = [];
  for (const [key, entry] of entries) {
    if (entry === null || typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
      lines.push(`${padding}${formatYamlKey(key)}: ${formatYamlScalar(entry)}`);
      continue;
    }

    const childLines = renderYamlLines(entry as JsonValue, indent + 1);
    const [first, ...rest] = childLines;
    lines.push(`${padding}${formatYamlKey(key)}: ${first.trimStart()}`);

    if (rest.length > 0) {
      lines.push(...rest);
    }
  }

  return lines;
}

export function jsonToYaml(value: JsonValue): string {
  return renderYamlLines(value).join('\n');
}

function flattenCsvRecord(value: JsonValue, prefix = '', record: Record<string, string> = {}) {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    record[prefix || 'value'] = formatCsvValue(value);
    return record;
  }

  if (Array.isArray(value)) {
    record[prefix || 'value'] = value.map((entry) => formatCsvValue(entry as JsonValue)).join(' | ');
    return record;
  }

  for (const [key, entry] of Object.entries(value)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    flattenCsvRecord(entry as JsonValue, nextPrefix, record);
  }

  return record;
}

function formatCsvValue(value: JsonValue) {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return safeStringifyJson(value, 0);
}

function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function jsonToCsv(value: JsonValue): CsvArtifact {
  const rows: Record<string, string>[] = [];

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return {
        supported: true,
        headers: [],
        rows: [],
        csv: '',
        reason: 'Empty arrays do not produce CSV rows.'
      };
    }

    for (const entry of value) {
      rows.push(flattenCsvRecord(entry as JsonValue));
    }
  } else if (isJsonObject(value)) {
    rows.push(flattenCsvRecord(value));
  } else {
    rows.push({ value: formatCsvValue(value) });
  }

  const headers = Array.from(new Set(rows.flatMap((record) => Object.keys(record))));
  const csvRows = rows.map((record) => headers.map((header) => escapeCsvCell(record[header] ?? '')));
  const csv = [headers.map(escapeCsvCell).join(','), ...csvRows.map((row) => row.join(','))].filter(Boolean).join('\n');

  return {
    supported: true,
    headers,
    rows: csvRows,
    csv,
    reason: headers.length === 0 ? 'No tabular fields were found.' : undefined
  };
}

export function deriveTopLevelLabel(value: JsonValue) {
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  if (isJsonObject(value)) {
    return `Object(${Object.keys(value).length})`;
  }

  return jsonTypeOf(value);
}

export function countLeafValues(value: JsonValue): number {
  if (Array.isArray(value)) {
    let total = 0;

    for (const entry of value) {
      total += countLeafValues(entry as JsonValue);
    }

    return total;
  }

  if (isJsonObject(value)) {
    let total = 0;

    for (const entry of Object.values(value)) {
      total += countLeafValues(entry as JsonValue);
    }

    return total;
  }

  return 1;
}