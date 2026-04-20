'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, FileJson2, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type WorkspaceSample } from '@/lib/samples';
import { cn } from '@/lib/utils';

interface WorkspaceEmptyStateProps {
  samples: WorkspaceSample[];
  onLoadSample: (sample: WorkspaceSample) => void;
  onImport: () => void;
}

const accentClasses: Record<WorkspaceSample['accent'], { icon: string; badge: string }> = {
  sky: {
    icon: 'border-sky-500/20 bg-sky-500/10 text-sky-500',
    badge: 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300'
  },
  emerald: {
    icon: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
  },
  violet: {
    icon: 'border-violet-500/20 bg-violet-500/10 text-violet-500',
    badge: 'border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300'
  }
};

function sampleIcon(sampleId: WorkspaceSample['id']) {
  if (sampleId === 'api-payload') {
    return <Sparkles className="h-5 w-5" />;
  }

  if (sampleId === 'nested-config') {
    return <FileJson2 className="h-5 w-5" />;
  }

  return <CheckCircle2 className="h-5 w-5" />;
}

export function WorkspaceEmptyState({ samples, onLoadSample, onImport }: WorkspaceEmptyStateProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
      <Card className="border-border/70 bg-card/95 shadow-soft">
        <CardHeader className="space-y-3 border-b border-border/60 pb-5">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em]">
              Sample library
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em]">
              One click each
            </Badge>
          </div>
          <CardTitle className="text-2xl tracking-tight sm:text-3xl">Start with a guided example</CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-6 sm:text-base">
            Pick a sample to instantly populate the editor and supporting panels. API payloads focus on diffs, nested config shows the tree view, and schema validation demonstrates contract checks plus type output.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {samples.map((sample, index) => (
              <motion.div
                key={sample.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.06 }}
                className="group flex h-full flex-col rounded-3xl border border-border/70 bg-background/80 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft"
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em]', accentClasses[sample.accent].badge)}>
                    {sample.badge}
                  </Badge>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{sample.outputTab}</span>
                </div>

                <div className={cn('mt-4 flex h-12 w-12 items-center justify-center rounded-2xl border', accentClasses[sample.accent].icon)}>
                  {sampleIcon(sample.id)}
                </div>

                <h3 className="mt-4 text-base font-semibold tracking-tight">{sample.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{sample.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {sample.highlights.map((highlight) => (
                    <span key={highlight} className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {highlight}
                    </span>
                  ))}
                </div>

                <Button type="button" className="mt-5 rounded-full shadow-glow" onClick={() => onLoadSample(sample)}>
                  Load sample
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-soft">
        <CardHeader className="space-y-3 border-b border-border/60 pb-5">
          <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em]">
            Guided start
          </Badge>
          <CardTitle className="text-2xl tracking-tight sm:text-3xl">What happens next</CardTitle>
          <CardDescription className="text-sm leading-6 sm:text-base">
            The workspace is designed to feel immediate. As soon as a sample is loaded, the JSON editor, tree view, table, diff, and schema tools all react together.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-5 sm:p-6">
          {[
            'Load API payload to compare versions and inspect deltas.',
            'Load nested config to browse deep object and array structures.',
            'Load schema validation to validate contracts and generate types.'
          ].map((item, index) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-muted-foreground">{item}</p>
            </div>
          ))}

          <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-4 py-4 text-sm leading-6 text-muted-foreground">
            Prefer your own data? Use Import JSON and the workspace will switch from guided examples to your file immediately.
          </div>

          <Button type="button" variant="secondary" className="w-full rounded-full" onClick={onImport}>
            Import JSON
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
