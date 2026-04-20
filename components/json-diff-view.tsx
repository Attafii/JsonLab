'use client';

import { useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, MinusCircle, PlusCircle, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type JsonAnalysis, diffJsonValues } from '@/lib/json-utils';
import { cn } from '@/lib/utils';

interface JsonDiffViewProps {
  leftAnalysis: JsonAnalysis;
  rightAnalysis: JsonAnalysis;
}

type DiffKindFilter = 'all' | 'added' | 'removed' | 'changed' | 'unchanged';

export function JsonDiffView({ leftAnalysis, rightAnalysis }: JsonDiffViewProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DiffKindFilter>('all');

  const rows = useMemo(() => {
    if (!leftAnalysis.isValid || !rightAnalysis.isValid) {
      return [];
    }

    return diffJsonValues(leftAnalysis.value as never, rightAnalysis.value as never);
  }, [leftAnalysis.isValid, leftAnalysis.value, rightAnalysis.isValid, rightAnalysis.value]);

  const counts = useMemo(() => {
    const summary = { added: 0, removed: 0, changed: 0, unchanged: 0 };
    for (const row of rows) {
      summary[row.kind] += 1;
    }

    return summary;
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesFilter = filter === 'all' || row.kind === filter;
      const matchesQuery = !query.trim() || [row.path, row.leftPreview, row.rightPreview, row.summary].join(' ').toLowerCase().includes(query.trim().toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, rows]);

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            Structural Diff
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Compare the primary JSON with the secondary document and review exact value changes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="success" className="rounded-full px-2.5 py-1">{counts.added} added</Badge>
          <Badge variant="destructive" className="rounded-full px-2.5 py-1">{counts.removed} removed</Badge>
          <Badge variant="warning" className="rounded-full px-2.5 py-1">{counts.changed} changed</Badge>
          <Badge variant="secondary" className="rounded-full px-2.5 py-1">{counts.unchanged} unchanged</Badge>
        </div>
      </div>

      <div className="border-b border-border/60 px-5 py-4 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by path or value preview" className="h-10 rounded-full pl-10" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'added', 'removed', 'changed', 'unchanged'] as DiffKindFilter[]).map((kind) => (
              <Button
                key={kind}
                type="button"
                variant={filter === kind ? 'default' : 'secondary'}
                size="sm"
                className={cn('rounded-full px-4 capitalize', filter === kind && 'shadow-glow')}
                onClick={() => setFilter(kind)}
              >
                {kind}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <ScrollArea className="json-scrollbar flex-1">
        <div className="p-4 sm:p-6">
          {!leftAnalysis.isValid || !rightAnalysis.isValid ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
              Load valid JSON into both editors to see the diff.
            </div>
          ) : filteredRows.length > 0 ? (
            <div className="space-y-3">
              {filteredRows.map((row) => (
                <div
                  key={`${row.path}-${row.kind}`}
                  className={cn(
                    'rounded-2xl border px-4 py-4 transition-colors',
                    row.kind === 'added' && 'border-success/30 bg-success/10',
                    row.kind === 'removed' && 'border-destructive/30 bg-destructive/10',
                    row.kind === 'changed' && 'border-warning/30 bg-warning/10',
                    row.kind === 'unchanged' && 'border-border/70 bg-muted/20'
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={row.kind === 'added' ? 'success' : row.kind === 'removed' ? 'destructive' : row.kind === 'changed' ? 'warning' : 'secondary'}
                          className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]"
                        >
                          {row.kind}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">{row.path}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">{row.summary}</p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]">
                      depth {row.depth}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <ValuePanel label="Before" value={row.leftPreview} kind={row.kind === 'removed' ? 'destructive' : 'secondary'} />
                    <ValuePanel label="After" value={row.rightPreview} kind={row.kind === 'added' ? 'success' : row.kind === 'changed' ? 'warning' : 'secondary'} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
              {query || filter !== 'all' ? 'No diff rows matched the current filters.' : 'No structural differences were found.'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ValuePanel({ label, value, kind }: { label: string; value: string; kind: 'success' | 'destructive' | 'warning' | 'secondary' }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {kind === 'success' ? <PlusCircle className="h-3.5 w-3.5 text-success" /> : kind === 'destructive' ? <MinusCircle className="h-3.5 w-3.5 text-destructive" /> : <CheckCircle2 className="h-3.5 w-3.5 text-warning" />}
        {label}
      </div>
      <div className="rounded-xl bg-muted/40 px-3 py-3 font-mono text-xs leading-5 text-foreground">{value}</div>
    </div>
  );
}