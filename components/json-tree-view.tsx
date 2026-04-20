'use client';

import { ChevronDown, ChevronRight, FolderTree, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type JsonAnalysis, type JsonValue, deriveTopLevelLabel, isJsonObject, jsonTypeOf, safeStringifyJson } from '@/lib/json-utils';
import { cn } from '@/lib/utils';

interface JsonTreeViewProps {
  analysis: JsonAnalysis;
  selectedPath?: string | null;
  onSelectPath?: (path: string) => void;
}

export function JsonTreeView({ analysis, selectedPath, onSelectPath }: JsonTreeViewProps) {
  const [query, setQuery] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['$']));

  useEffect(() => {
    setExpandedPaths(new Set(['$']));
  }, [analysis.text]);

  const autoExpandedPaths = useMemo(() => {
    const paths = new Set<string>();
    if (!analysis.isValid || !query.trim() || analysis.value === null) {
      return paths;
    }

    collectMatchingPaths(analysis.value as JsonValue, query.trim().toLowerCase(), '$', paths);
    return paths;
  }, [analysis.isValid, analysis.value, query]);

  const rootExpandedPaths = useMemo(() => new Set([...expandedPaths, ...autoExpandedPaths]), [autoExpandedPaths, expandedPaths]);

  const togglePath = (path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  };

  if (!analysis.isValid) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-border bg-card p-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <FolderTree className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold tracking-tight">Tree view waits for valid JSON</h3>
          <p className="mt-2 text-sm text-muted-foreground">Fix the primary JSON input to render the structure here.</p>
          <p className="mt-4 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-left text-sm text-muted-foreground">{analysis.error?.message ?? 'The document is invalid.'}</p>
        </div>
      </div>
    );
  }

  const rootValue = analysis.value as JsonValue;

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <FolderTree className="h-4 w-4 text-primary" />
            JSON Tree
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Browse nested data, select a path, and keep ancestors open while searching.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="rounded-full px-2.5 py-1">{deriveTopLevelLabel(rootValue)}</Badge>
          <Badge variant="outline" className="rounded-full px-2.5 py-1">{analysis.metrics.maxDepth} levels</Badge>
        </div>
      </div>

      <div className="border-b border-border/60 px-5 py-4 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search keys, values, or paths"
            className="h-10 rounded-full pl-10"
          />
        </div>
      </div>

      <ScrollArea className="json-scrollbar flex-1">
        <div className="p-4 sm:p-6">
          <TreeNode
            value={rootValue}
            path="$"
            label="$"
            depth={0}
            query={query.trim().toLowerCase()}
            expandedPaths={rootExpandedPaths}
            selectedPath={selectedPath}
            onSelectPath={onSelectPath}
            onTogglePath={togglePath}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

interface TreeNodeProps {
  value: JsonValue;
  path: string;
  label: string;
  depth: number;
  query: string;
  expandedPaths: Set<string>;
  selectedPath?: string | null;
  onSelectPath?: (path: string) => void;
  onTogglePath: (path: string) => void;
}

function TreeNode({ value, path, label, depth, query, expandedPaths, selectedPath, onSelectPath, onTogglePath }: TreeNodeProps) {
  const isContainer = Array.isArray(value) || isJsonObject(value);
  const isExpanded = expandedPaths.has(path);
  const matches = matchesQuery(value, path, label, query);

  if (!matches) {
    return null;
  }

  const indentStyle = { paddingLeft: `${depth * 18}px` };
  const isSelected = selectedPath === path;

  const preview = isContainer ? (Array.isArray(value) ? `[Array(${value.length})]` : `{${Object.keys(value).length} keys}`) : previewValue(value);

  return (
    <div className="relative">
      {depth > 0 ? <div className="absolute bottom-0 left-0 top-0 w-px bg-border/60" style={{ left: `${depth * 18 - 10}px` }} /> : null}

      <div
        role="button"
        tabIndex={0}
        className={cn(
          'group flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-all duration-200 hover:border-primary/50 hover:bg-muted/40',
          isSelected ? 'border-primary/60 bg-primary/10 shadow-sm' : 'border-transparent'
        )}
        style={indentStyle}
        onClick={() => onSelectPath?.(path)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectPath?.(path);
          }
        }}
      >
        <button
          type="button"
          className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
          onClick={(event) => {
            event.stopPropagation();
            if (isContainer) {
              onTogglePath(path);
            }
          }}
          aria-label={isExpanded ? 'Collapse node' : 'Expand node'}
        >
          {isContainer ? (isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{label}</span>
            <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-[0.2em]">
              {jsonTypeOf(value)}
            </Badge>
            <span className="text-xs text-muted-foreground">{path}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{preview}</p>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isContainer && isExpanded ? (
          <motion.div
            key={`${path}-children`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 py-2">
              {Array.isArray(value)
                ? value.map((entry, index) => (
                    <TreeNode
                      key={`${path}[${index}]`}
                      value={entry as JsonValue}
                      path={`${path}[${index}]`}
                      label={`[${index}]`}
                      depth={depth + 1}
                      query={query}
                      expandedPaths={expandedPaths}
                      selectedPath={selectedPath}
                      onSelectPath={onSelectPath}
                      onTogglePath={onTogglePath}
                    />
                  ))
                : Object.entries(value).map(([key, entry]) => (
                    <TreeNode
                      key={`${path}.${key}`}
                      value={entry as JsonValue}
                      path={path === '$' ? `$.${key}` : `${path}.${key}`}
                      label={key}
                      depth={depth + 1}
                      query={query}
                      expandedPaths={expandedPaths}
                      selectedPath={selectedPath}
                      onSelectPath={onSelectPath}
                      onTogglePath={onTogglePath}
                    />
                  ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function matchesQuery(value: JsonValue, path: string, label: string, query: string): boolean {
  if (!query) {
    return true;
  }

  const haystack = [path, label, jsonTypeOf(value), previewValue(value)].join(' ').toLowerCase();
  if (haystack.includes(query)) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((entry, index) => matchesQuery(entry as JsonValue, `${path}[${index}]`, `[${index}]`, query));
  }

  if (isJsonObject(value)) {
    return Object.entries(value).some(([key, entry]) => matchesQuery(entry as JsonValue, path === '$' ? `$.${key}` : `${path}.${key}`, key, query));
  }

  return false;
}

function collectMatchingPaths(value: JsonValue, query: string, path: string, accumulator: Set<string>): boolean {
  const haystack = [path, jsonTypeOf(value), previewValue(value)].join(' ').toLowerCase();
  let matched = haystack.includes(query);

  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      if (collectMatchingPaths(entry as JsonValue, query, `${path}[${index}]`, accumulator)) {
        matched = true;
      }
    }
  } else if (isJsonObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (collectMatchingPaths(entry as JsonValue, query, path === '$' ? `$.${key}` : `${path}.${key}`, accumulator)) {
        matched = true;
      }
    }
  }

  if (matched) {
    accumulator.add(path);
    const parentPath = path.includes('[') ? path.slice(0, path.lastIndexOf('[')) || '$' : path.includes('.') ? path.slice(0, path.lastIndexOf('.')) || '$' : '$';
    accumulator.add(parentPath);
  }

  return matched;
}

function previewValue(value: JsonValue) {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return value.length > 96 ? `${value.slice(0, 93)}…` : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return safeStringifyJson(value.length > 4 ? value.slice(0, 4) : value, 0);
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return '{}';
  }

  return safeStringifyJson(Object.fromEntries(entries.slice(0, 3)), 0);
}