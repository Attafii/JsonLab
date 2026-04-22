'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BookOpenText, History, Search, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface WorkspaceOnboardingProps {
  open: boolean;
  onDismiss: () => void;
  onOpenSearch: () => void;
  onOpenHistory: () => void;
  onOpenPalette: () => void;
}

const steps = [
  {
    title: 'Load or paste JSON',
    description: 'Use a sample, import a file, or paste your own payload into the primary editor.',
    icon: Sparkles,
    actionLabel: 'Load a sample'
  },
  {
    title: 'Search and jump',
    description: 'Once the workspace has data, open Search & Jump to find keys, values, and paths, then jump straight into the tree.',
    icon: Search,
    actionLabel: 'Open search'
  },
  {
    title: 'Review history',
    description: 'Use the timeline to restore previous edits, imports, and sample loads, or compare versions.',
    icon: History,
    actionLabel: 'View history'
  }
];

export function WorkspaceOnboarding({ open, onDismiss, onOpenSearch, onOpenHistory, onOpenPalette }: WorkspaceOnboardingProps) {
  if (!open) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22 }}
      className="rounded-[1.75rem] border border-border/70 bg-card/95 shadow-soft"
    >
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="space-y-3 border-b border-border/60 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em]">
                First-run walkthrough
              </Badge>
              <CardTitle className="text-xl tracking-tight sm:text-2xl">A quick way to understand the workspace</CardTitle>
            </div>
            <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
          <CardDescription className="max-w-3xl text-sm leading-6 sm:text-base">
            JsonLab is centered around one primary JSON document, with search, history, and command palette actions nearby so you can move quickly without losing context.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.06 }}
                  className="rounded-3xl border border-border/70 bg-background/80 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-muted/40 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step {index + 1}</p>
                      <h3 className="mt-1 text-base font-semibold tracking-tight">{step.title}</h3>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="grid gap-3 rounded-3xl border border-dashed border-border bg-muted/20 p-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-background/70 px-4 py-3 text-sm text-muted-foreground">
              Tip: <span className="font-medium text-foreground">Ctrl/Cmd + K</span> opens the command palette anywhere.
            </div>
            <div className="rounded-2xl bg-background/70 px-4 py-3 text-sm text-muted-foreground">
              Tip: use <span className="font-medium text-foreground">Search & Jump</span> to find a path and focus the tree.
            </div>
            <div className="rounded-2xl bg-background/70 px-4 py-3 text-sm text-muted-foreground">
              Tip: the <span className="font-medium text-foreground">history timeline</span> stores sample loads, imports, and edits.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" className="rounded-full shadow-glow" onClick={onOpenPalette}>
              Open command palette
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="secondary" className="rounded-full" onClick={onOpenSearch}>
              <Search className="h-4 w-4" />
              Open search
            </Button>
            <Button type="button" variant="secondary" className="rounded-full" onClick={onOpenHistory}>
              <History className="h-4 w-4" />
              View history
            </Button>
            <Button type="button" variant="ghost" className="rounded-full" onClick={onDismiss}>
              <BookOpenText className="h-4 w-4" />
              Not now
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}
