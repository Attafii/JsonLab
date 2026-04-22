'use client';

import type { KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Command as CommandIcon, Search, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface WorkspaceCommand {
  id: string;
  label: string;
  description: string;
  group: string;
  run: () => void;
  shortcut?: string;
  keywords?: string[];
  disabled?: boolean;
}

interface WorkspaceCommandPaletteProps {
  commands: WorkspaceCommand[];
  triggerLabel?: string;
  triggerHint?: string;
  triggerVariant?: ButtonProps['variant'];
  className?: string;
  openSignal?: number;
}

export function WorkspaceCommandPalette({
  commands,
  triggerLabel = 'Command palette',
  triggerHint = 'Ctrl K',
  triggerVariant = 'secondary',
  className,
  openSignal
}: WorkspaceCommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const isCommandShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';

      if (isCommandShortcut) {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof openSignal !== 'number') {
      return;
    }

    setOpen(true);
  }, [openSignal]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery('');
    setActiveIndex(0);
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return commands;
    }

    return commands.filter((command) => {
      const haystack = [command.label, command.description, command.group, command.keywords?.join(' ') ?? '']
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [commands, query]);

  const filteredCommandSignature = useMemo(
    () => filteredCommands.map((command) => `${command.id}:${command.disabled ? '1' : '0'}`).join('|'),
    [filteredCommands]
  );

  useEffect(() => {
    if (!open || filteredCommands.length === 0) {
      setActiveIndex(0);
      return;
    }

    const firstEnabledIndex = filteredCommands.findIndex((command) => !command.disabled);
    setActiveIndex(firstEnabledIndex === -1 ? 0 : firstEnabledIndex);
  }, [filteredCommandSignature, open]);

  const moveSelection = (direction: 1 | -1) => {
    if (filteredCommands.length === 0) {
      return;
    }

    let nextIndex = activeIndex;

    for (let step = 0; step < filteredCommands.length; step += 1) {
      nextIndex = (nextIndex + direction + filteredCommands.length) % filteredCommands.length;
      if (!filteredCommands[nextIndex]?.disabled) {
        setActiveIndex(nextIndex);
        return;
      }
    }
  };

  const runCommand = (command: WorkspaceCommand) => {
    if (command.disabled) {
      return;
    }

    setOpen(false);
    command.run();
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const command = filteredCommands[activeIndex];
      if (command) {
        runCommand(command);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <>
      <Button type="button" variant={triggerVariant} className={cn('rounded-full px-5 shadow-sm', className)} onClick={() => setOpen(true)}>
        <CommandIcon className="h-4 w-4" />
        {triggerLabel}
        <span className="hidden rounded-full border border-border bg-background/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline-flex">
          {triggerHint}
        </span>
      </Button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="workspace-command-palette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-background/60 px-4 py-6 backdrop-blur-md sm:px-6 sm:py-10"
            onMouseDown={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4 sm:px-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-muted/40 text-foreground">
                    <CommandIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight sm:text-lg">Command palette</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Search workspace actions, imports, exports, samples, and views.</p>
                  </div>
                </div>

                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => setOpen(false)} aria-label="Close command palette">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="border-b border-border/60 px-5 py-4 sm:px-6">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Type to search commands"
                    className="h-12 rounded-full border-border/70 bg-background/90 pl-10 pr-4 text-sm"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </div>

              <ScrollArea className="json-scrollbar max-h-[420px]">
                <div className="space-y-2 p-3 sm:p-4" role="listbox" aria-label="Command palette results">
                  {filteredCommands.length > 0 ? (
                    filteredCommands.map((command, index) => {
                      const isActive = index === activeIndex;

                      return (
                        <button
                          key={command.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          aria-disabled={command.disabled}
                          className={cn(
                            'flex w-full items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition duration-200',
                            isActive ? 'border-primary/40 bg-primary/10 shadow-sm' : 'border-border/70 bg-background/70 hover:border-primary/30 hover:bg-muted/50',
                            command.disabled && 'cursor-not-allowed opacity-45'
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => runCommand(command)}
                          disabled={command.disabled}
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{command.label}</span>
                              <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                {command.group}
                              </Badge>
                            </div>
                            <p className="line-clamp-2 text-sm text-muted-foreground">{command.description}</p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                            {command.shortcut ? <span className="rounded-full border border-border bg-background/80 px-2.5 py-1">{command.shortcut}</span> : null}
                            {command.disabled ? <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1">Unavailable</span> : null}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                      No matching commands.
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-4 text-xs text-muted-foreground sm:px-6">
                <span>Use Enter to run a command and Esc to close.</span>
                <span>Ctrl/Cmd + K reopens the palette anywhere in the workspace.</span>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}