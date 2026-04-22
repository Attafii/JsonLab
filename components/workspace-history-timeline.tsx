'use client';

import { motion } from 'framer-motion';
import { ArrowLeftRight, Clock3, RotateCcw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type RecentSnippet } from '@/lib/storage';

interface WorkspaceHistoryTimelineProps {
  entries: RecentSnippet[];
  onRestore: (entry: RecentSnippet) => void;
  onCompare: (entry: RecentSnippet) => void;
  onClear: () => void;
}

const kindLabels: Record<NonNullable<RecentSnippet['kind']>, string> = {
  edit: 'Edit',
  import: 'Import',
  sample: 'Sample',
  restore: 'Restore'
};

const kindClasses: Record<NonNullable<RecentSnippet['kind']>, string> = {
  edit: 'border-primary/20 bg-primary/10 text-primary',
  import: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  sample: 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300',
  restore: 'border-warning/20 bg-warning/10 text-warning'
};

export function WorkspaceHistoryTimeline({ entries, onRestore, onCompare, onClear }: WorkspaceHistoryTimelineProps) {
  return (
    <Card className="border-border/70 bg-card/95 shadow-soft">
      <CardHeader className="space-y-3 border-b border-border/60 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">History timeline</CardTitle>
            <CardDescription>Track edits, imports, and sample loads. Restore a state or compare it with the current JSON.</CardDescription>
          </div>
          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onClear}>
            Clear history
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-5">
        {entries.length > 0 ? (
          <ScrollArea className="json-scrollbar max-h-[290px] pr-2">
            <div className="space-y-3">
              {entries.map((entry, index) => {
                const kind = entry.kind ?? 'edit';

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="relative overflow-hidden rounded-3xl border border-border/70 bg-background/80 p-4"
                  >
                    <div className="absolute left-5 top-4 bottom-4 w-px bg-border/60" />
                    <div className="relative flex gap-3 pl-1">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                        <Clock3 className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${kindClasses[kind]}`}>
                            {kindLabels[kind]}
                          </Badge>
                          <span className="text-sm font-medium text-foreground">{entry.title}</span>
                          <span className="text-xs text-muted-foreground">{new Date(entry.savedAt).toLocaleString()}</span>
                        </div>

                        <p className="text-sm leading-6 text-muted-foreground">{entry.summary ?? entry.content.slice(0, 120)}</p>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => onRestore(entry)}>
                            <RotateCcw className="h-4 w-4" />
                            Restore
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => onCompare(entry)}>
                            <ArrowLeftRight className="h-4 w-4" />
                            Compare
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            Your edits, imports, and sample loads will appear here.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
