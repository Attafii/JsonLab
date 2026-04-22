'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type JsonAnalysis } from '@/lib/json-utils';
import { searchJsonValue, type WorkspaceSearchMode } from '@/lib/workspace-search';

interface WorkspaceSearchPanelProps {
  analysis: JsonAnalysis;
  selectedPath: string | null;
  onJumpToPath: (path: string) => void;
  focusToken?: number;
  defaultMode?: WorkspaceSearchMode;
  onModeChange?: (mode: WorkspaceSearchMode) => void;
}

const modeLabels: Record<WorkspaceSearchMode, string> = {
  all: 'All',
  keys: 'Keys',
  values: 'Values',
  paths: 'Paths'
};

const modeHints: Record<WorkspaceSearchMode, string> = {
  all: 'Search keys, values, and paths together.',
  keys: 'Match object keys only.',
  values: 'Match scalar values and previews.',
  paths: 'Search exact or partial paths like $.user.email.'
};

export function WorkspaceSearchPanel({ analysis, selectedPath, onJumpToPath, focusToken, defaultMode = 'all', onModeChange }: WorkspaceSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<WorkspaceSearchMode>(defaultMode);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    if (typeof focusToken !== 'number') {
      return;
    }

    requestAnimationFrame(() => inputRef.current?.focus());
  }, [focusToken]);

  const results = useMemo(() => {
    if (!analysis.isValid || !analysis.value) {
      return [];
    }

    return searchJsonValue(analysis.value, query, mode).slice(0, 24);
  }, [analysis.isValid, analysis.value, mode, query]);

  const handleModeChange = (nextMode: WorkspaceSearchMode) => {
    setMode(nextMode);
    onModeChange?.(nextMode);
  };

  return (
    <Card className="border-border/70 bg-card/95 shadow-soft">
      <CardHeader className="space-y-3 border-b border-border/60 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Search and jump</CardTitle>
            <CardDescription>Search the primary JSON by key, value, or path, then jump straight into the tree.</CardDescription>
          </div>
          <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]">
            {analysis.isValid ? `${results.length} results` : 'No JSON'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={mode === 'paths' ? 'Type a path like $.owner.email' : 'Search keys, values, or paths'}
            className="h-11 rounded-full pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          {Object.keys(modeLabels).map((key) => {
            const value = key as WorkspaceSearchMode;
            const active = mode === value;

            return (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={active ? 'default' : 'secondary'}
                className="rounded-full px-3"
                onClick={() => handleModeChange(value)}
              >
                {modeLabels[value]}
              </Button>
            );
          })}
        </div>

        <p className="text-xs leading-5 text-muted-foreground">{modeHints[mode]}</p>

        {!analysis.isValid ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            Search becomes available when the primary JSON is valid.
          </div>
        ) : results.length > 0 ? (
          <ScrollArea className="json-scrollbar max-h-[290px] pr-2">
            <div className="space-y-2">
              {results.map((result) => {
                const isSelected = selectedPath === result.path;

                return (
                  <button
                    key={result.path}
                    type="button"
                    className={[
                      'w-full rounded-2xl border px-4 py-3 text-left transition duration-200',
                      isSelected ? 'border-primary/60 bg-primary/10 shadow-sm' : 'border-border/70 bg-muted/20 hover:border-primary/40 hover:bg-muted/40'
                    ].join(' ')}
                    onClick={() => onJumpToPath(result.path)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{result.key}</span>
                          <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-[0.18em]">
                            {result.type}
                          </Badge>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">{result.path}</p>
                        <p className="line-clamp-2 text-sm text-muted-foreground">{result.preview}</p>
                      </div>
                      <span className="rounded-full border border-border bg-background/80 p-2 text-primary">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            {query.trim() ? 'No matches for the current search.' : 'Start typing to search the document.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
