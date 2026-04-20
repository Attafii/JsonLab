'use client';

import { useMemo, useState } from 'react';
import { Database, Filter, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type JsonAnalysis, flattenJsonEntries } from '@/lib/json-utils';

interface JsonTableViewProps {
  analysis: JsonAnalysis;
}

export function JsonTableView({ analysis }: JsonTableViewProps) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    if (!analysis.isValid) {
      return [];
    }

    return flattenJsonEntries(analysis.value as never);
  }, [analysis.isValid, analysis.value]);

  const filteredRows = useMemo(() => {
    if (!query.trim()) {
      return rows;
    }

    const lowered = query.trim().toLowerCase();
    return rows.filter((row) => [row.path, row.key, row.type, row.preview].join(' ').toLowerCase().includes(lowered));
  }, [query, rows]);

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Database className="h-4 w-4 text-primary" />
            Flattened Table
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Every leaf node becomes a searchable row for quick inspection and copy-friendly review.</p>
        </div>
        <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs">
          {filteredRows.length} rows
        </Badge>
      </div>

      <div className="border-b border-border/60 px-5 py-4 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by path, key, type, or preview" className="h-10 rounded-full pl-10" />
        </div>
      </div>

      <ScrollArea className="json-scrollbar flex-1">
        <div className="p-4 sm:p-6">
          {analysis.isValid ? (
            <div className="overflow-hidden rounded-2xl border border-border/70">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-card/95 backdrop-blur">
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Path</th>
                    <th className="px-4 py-3 font-medium">Key</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row) => (
                      <tr key={row.path} className="border-b border-border/50 last:border-b-0 hover:bg-muted/30">
                        <td className="px-4 py-3 align-top font-mono text-xs text-foreground">{row.path}</td>
                        <td className="px-4 py-3 align-top">{row.key}</td>
                        <td className="px-4 py-3 align-top">
                          <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-[0.18em]">
                            {row.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 align-top text-muted-foreground">{row.preview}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No matching rows found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
              Validate the JSON to populate the table.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}