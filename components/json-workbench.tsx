'use client';

import type { ChangeEvent } from 'react';
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ArrowDownToLine, CheckCircle2, Copy, Loader2, Sparkles, Upload } from 'lucide-react';

import { JsonDiffView } from '@/components/json-diff-view';
import { JsonEditor } from '@/components/json-editor';
import { JsonTableView } from '@/components/json-table-view';
import { JsonTreeView } from '@/components/json-tree-view';
import { WorkspaceCommandPalette, type WorkspaceCommand } from '@/components/workspace-command-palette';
import { WorkspaceHistoryTimeline } from '@/components/workspace-history-timeline';
import { WorkspaceOnboarding } from '@/components/workspace-onboarding';
import { WorkspaceSearchPanel } from '@/components/workspace-search-panel';
import { WorkspaceEmptyState } from '@/components/workspace-empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { addRecentSnippet, loadRecentSnippets, saveRecentSnippets, type RecentSnippet, type WorkspaceSnapshot, clearRecentSnippets } from '@/lib/storage';
import { decodeJsonFromUrl, encodeJsonForUrl } from '@/lib/share';
import {
  analyzeJson,
  countLeafValues,
  formatJsonText,
  jsonToCsv,
  jsonToYaml,
  minifyJsonText,
  type JsonAnalysis,
  type JsonValue
} from '@/lib/json-utils';
import { WORKSPACE_SAMPLES, type WorkspaceSample } from '@/lib/samples';
import { generateTypeArtifactsFromJson, generateTypeArtifactsFromSchema, type TypeArtifacts } from '@/lib/type-generation';
import { type WorkspaceSearchMode } from '@/lib/workspace-search';
import { cn } from '@/lib/utils';

type OutputTab = 'tree' | 'table' | 'diff' | 'raw' | 'minified' | 'yaml' | 'csv' | 'types';

interface NoticeState {
  tone: 'success' | 'error' | 'info';
  text: string;
}

const outputTabs: Array<{ value: OutputTab; label: string }> = [
  { value: 'tree', label: 'Tree' },
  { value: 'table', label: 'Table' },
  { value: 'diff', label: 'Diff' },
  { value: 'raw', label: 'Raw' },
  { value: 'minified', label: 'Minified' },
  { value: 'yaml', label: 'YAML' },
  { value: 'csv', label: 'CSV' },
  { value: 'types', label: 'Types' }
];

const ONBOARDING_STORAGE_KEY = 'jsonlab.onboarding.completed.v1';

export function JsonLabWorkspace() {
  const router = useRouter();
  const [primaryText, setPrimaryText] = useState('');
  const [compareText, setCompareText] = useState('');
  const [schemaText, setSchemaText] = useState('');
  const [outputTab, setOutputTab] = useState<OutputTab>('tree');
  const [recentSnippets, setRecentSnippets] = useState<RecentSnippet[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [searchMode, setSearchMode] = useState<WorkspaceSearchMode>('all');
  const [searchFocusToken, setSearchFocusToken] = useState(0);
  const [paletteOpenToken, setPaletteOpenToken] = useState(0);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const historyPanelRef = useRef<HTMLDivElement | null>(null);
  const outputSectionRef = useRef<HTMLDivElement | null>(null);
  const suppressNextEditHistoryRef = useRef(false);
  const lastSavedRef = useRef('');

  const deferredPrimaryText = useDeferredValue(primaryText);
  const deferredCompareText = useDeferredValue(compareText);
  const deferredSchemaText = useDeferredValue(schemaText);

  const primaryAnalysis = useMemo<JsonAnalysis>(() => analyzeJson(deferredPrimaryText), [deferredPrimaryText]);
  const compareAnalysis = useMemo<JsonAnalysis>(() => analyzeJson(deferredCompareText), [deferredCompareText]);
  const schemaAnalysis = useMemo<JsonAnalysis>(() => analyzeJson(deferredSchemaText), [deferredSchemaText]);

  const schemaValidation = useMemo(() => {
    if (!schemaAnalysis.isValid || !schemaAnalysis.value || !primaryAnalysis.isValid) {
      return { valid: false, errors: [] as Array<{ message?: string; instancePath?: string; schemaPath?: string }>, compileError: null as string | null };
    }

    try {
      const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
      addFormats(ajv);
      const validate = ajv.compile(schemaAnalysis.value as Record<string, unknown>);
      const valid = validate(primaryAnalysis.value as JsonValue);
      return { valid: Boolean(valid), errors: validate.errors ?? [], compileError: null as string | null };
    } catch (error) {
      return {
        valid: false,
        errors: [],
        compileError: error instanceof Error ? error.message : 'Unable to compile schema.'
      };
    }
  }, [primaryAnalysis.isValid, primaryAnalysis.value, schemaAnalysis.isValid, schemaAnalysis.value]);

  /* return (
    <div className="space-y-6">
            <section className="space-y-4">
              <JsonEditor
                label="Primary JSON"
                helperText="This document drives the tree, table, YAML, CSV, and type outputs."
                value={primaryText}
                onChange={(value) => setPrimaryText(value)}
                error={primaryAnalysis.isValid ? null : primaryAnalysis.error?.message ?? 'Invalid JSON'}
                height={620}
              />

              <Card className="border-border/70 bg-card/95 shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Primary summary</CardTitle>
                  <CardDescription>Quick checks for the document you are editing right now.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatusPill label="JSON" tone={primaryAnalysis.isValid ? 'success' : 'destructive'} value={primaryAnalysis.isValid ? 'Valid' : 'Invalid'} />
                  <StatusPill label="Schema" tone={schemaValidation.compileError || (schemaAnalysis.isValid && schemaAnalysis.value && !schemaValidation.valid) ? 'destructive' : 'success'} value={schemaValidation.compileError ? 'Compile error' : schemaAnalysis.isValid && schemaAnalysis.value ? schemaValidation.valid ? 'Passes' : 'Fails' : 'Not loaded'} />
                  <StatusPill label="Leaves" tone="secondary" value={primaryAnalysis.isValid ? countLeafValues(primaryAnalysis.value as JsonValue) : 'N/A'} />
                  <StatusPill label="Compare" tone={compareAnalysis.isValid ? 'success' : 'secondary'} value={compareAnalysis.isValid ? `${stats.compareLeaves} leaves` : 'Not ready'} />
                </CardContent>
              </Card>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_360px]">
              <section className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">Output Studio</h3>
                    <p className="text-sm text-muted-foreground">Use this area to inspect structure, diffs, and exports.</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">{outputTab}</Badge>
                </div>

                <Tabs value={outputTab} onValueChange={(value) => setOutputTab(value as OutputTab)} className="space-y-4">
                  <TabsList className="json-scrollbar flex w-full items-center justify-start gap-1 overflow-x-auto rounded-full border border-border/70 bg-card/90 p-1 shadow-sm">
                    {outputTabs.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value} className="rounded-full px-4 text-xs uppercase tracking-[0.18em]">
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={outputTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.22 }}
                    >
                      <TabsContent value={outputTab} forceMount className="mt-0">
                        {renderOutputTab(outputTab, {
                          primaryAnalysis,
                          compareAnalysis,
                          schemaValidation,
                          schemaAnalysis,
                          yamlText,
                          csvArtifact,
                          typeArtifacts,
                          selectedPath,
                          setSelectedPath
                        })}
                      </TabsContent>
                    </motion.div>
                  </AnimatePresence>
                </Tabs>

                  <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
                    <StatusRow label="Selected path" value={selectedPath ?? 'None selected'} />
                    <StatusRow label="Validation" value={validationMessage} muted={!primaryAnalysis.isValid || Boolean(schemaValidation.compileError) || Boolean(schemaAnalysis.isValid && schemaAnalysis.value && !schemaValidation.valid)} />
                    <StatusRow label="Line / column" value={primaryAnalysis.error?.line ? `${primaryAnalysis.error.line}:${primaryAnalysis.error.column ?? 1}` : 'No parse issue'} />
                    <StatusRow label="Schema rules" value={schemaAnalysis.isValid && schemaAnalysis.value ? `${schemaValidation.errors.length} error(s)` : 'Not active'} />
                  </div>
              </section>

              <aside className="space-y-6">
              <div ref={historyPanelRef} className="scroll-mt-24">
                <WorkspaceHistoryTimeline
                  entries={recentSnippets}
                  onRestore={handleRestoreHistoryEntry}
                  onCompare={handleCompareHistoryEntry}
                  onClear={handleClearHistory}
                />
              </div>
            </aside>

                          <TabsContent value="schema" className="space-y-3">
                            <JsonEditor
                              label="JSON Schema"
                              helperText="Schema validation also powers type generation when it is valid."
                              value={schemaText}
                              onChange={(value) => setSchemaText(value)}
                              error={schemaAnalysis.isValid ? null : schemaAnalysis.error?.message ?? 'Invalid schema'}
                              height={240}
                              compact
                            />
                            {schemaAnalysis.isValid && schemaAnalysis.value ? (
                              <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
                                <StatusPill label="Schema" tone={schemaValidation.compileError || !schemaValidation.valid ? 'destructive' : 'success'} value={schemaValidation.compileError ? 'Compile error' : schemaValidation.valid ? 'Passes' : 'Fails'} />
                                {!schemaValidation.compileError && schemaValidation.errors.length > 0 ? (
                                  <div className="space-y-2 text-xs text-muted-foreground">
                                    {schemaValidation.errors.slice(0, 3).map((error, index) => (
                                      <div key={`${error.instancePath ?? 'schema'}-${index}`} className="rounded-xl border border-border bg-card px-3 py-2">
                                        <p className="font-medium text-foreground">{error.instancePath || '/'}</p>
                                        <p>{error.message}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </TabsContent>
                        </Tabs>
                      </TabsContent>

                      <TabsContent value="history" className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold tracking-tight">Recent snippets</h3>
                            <p className="text-xs text-muted-foreground">Stored locally in the browser for quick recall.</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-full"
                            onClick={() => {
                              clearRecentSnippets();
                              setRecentSnippets([]);
                              setNotice({ tone: 'success', text: 'Recent snippets cleared.' });
                            }}
                          >
                            Clear
                          </Button>
                        </div>

                        {recentSnippets.length > 0 ? (
                          <ScrollArea className="json-scrollbar max-h-[260px] pr-2">
                            <div className="space-y-2">
                              {recentSnippets.map((snippet) => (
                                <button
                                  key={snippet.id}
                                  type="button"
                                  className="group w-full rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-muted/40"
                                  onClick={() => {
                                    startTransition(() => setPrimaryText(snippet.content));
                                    setNotice({ tone: 'info', text: `Loaded ${snippet.title} from history.` });
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-medium text-foreground">{snippet.title}</span>
                                    <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-[0.18em]">
                                      {new Date(snippet.savedAt).toLocaleDateString()}
                                    </Badge>
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{snippet.content.slice(0, 120)}</p>
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                            Recent snippets will appear here after the primary JSON settles.
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="status" className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold tracking-tight">Workspace status</h3>
                            <p className="text-xs text-muted-foreground">Current selection and validation details.</p>
                          </div>
                          <Badge variant={primaryAnalysis.isValid ? 'success' : 'destructive'} className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]">
                            {primaryAnalysis.isValid ? 'Healthy' : 'Needs attention'}
                          </Badge>
                        </div>

                        <div className="space-y-3 text-sm">
                          <StatusRow label="Selected path" value={selectedPath ?? 'None selected'} />
                          <StatusRow label="Validation" value={validationMessage} muted={!primaryAnalysis.isValid || Boolean(schemaValidation.compileError) || Boolean(schemaAnalysis.isValid && schemaAnalysis.value && !schemaValidation.valid)} />
                          <StatusRow label="Line / column" value={primaryAnalysis.error?.line ? `${primaryAnalysis.error.line}:${primaryAnalysis.error.column ?? 1}` : 'No parse issue'} />
                          <StatusRow label="Leaf count" value={`${stats.leaves.toLocaleString()}`} />
                          <StatusRow label="Schema rules" value={schemaAnalysis.isValid && schemaAnalysis.value ? `${schemaValidation.errors.length} error(s)` : 'Not active'} />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
  */

  const typeArtifacts = useMemo<TypeArtifacts>(() => {
    if (schemaAnalysis.isValid && schemaAnalysis.value && schemaValidation.valid) {
      return generateTypeArtifactsFromSchema(schemaAnalysis.value as Record<string, unknown>, 'JsonLabItem');
    }

    if (primaryAnalysis.isValid) {
      return generateTypeArtifactsFromJson(primaryAnalysis.value as JsonValue, 'JsonLabItem');
    }

    return { typescript: '', dart: '', rootName: 'JsonLabItem' };
  }, [primaryAnalysis.isValid, primaryAnalysis.value, schemaAnalysis.isValid, schemaAnalysis.value, schemaValidation.valid]);

  const yamlText = useMemo(() => {
    if (!primaryAnalysis.isValid) {
      return '';
    }

    return jsonToYaml(primaryAnalysis.value as JsonValue);
  }, [primaryAnalysis.isValid, primaryAnalysis.value]);

  const csvArtifact = useMemo(() => {
    if (!primaryAnalysis.isValid) {
      return null;
    }

    return jsonToCsv(primaryAnalysis.value as JsonValue);
  }, [primaryAnalysis.isValid, primaryAnalysis.value]);

  const isBlankWorkspace = !primaryText.trim() && !compareText.trim() && !schemaText.trim();

  useEffect(() => {
    setRecentSnippets(loadRecentSnippets());

    if (typeof window === 'undefined') {
      return;
    }

    if (!window.localStorage.getItem(ONBOARDING_STORAGE_KEY)) {
      setShowOnboarding(true);
    }

    const encodedJson = new URLSearchParams(window.location.search).get('data');
    if (!encodedJson) {
      return;
    }

    try {
      const decoded = decodeJsonFromUrl(encodedJson);
      setPrimaryText(decoded);
      setNotice({ tone: 'success', text: 'Loaded shared JSON from the current URL.' });
    } catch {
      setNotice({ tone: 'error', text: 'The shared URL payload could not be decoded.' });
    }
  }, []);

  const loadSample = (sample: WorkspaceSample) => {
    suppressNextEditHistoryRef.current = true;
    startTransition(() => {
      setPrimaryText(sample.primaryText);
      setCompareText(sample.compareText ?? '');
      setSchemaText(sample.schemaText ?? '');
      setOutputTab(sample.outputTab);
      setSelectedPath(null);
    });

    recordHistoryEntry(
      'sample',
      sample.primaryText,
      {
        primaryText: sample.primaryText,
        compareText: sample.compareText ?? '',
        schemaText: sample.schemaText ?? '',
        outputTab: sample.outputTab,
        selectedPath: null
      },
      sample.title,
      `Loaded ${sample.title} sample.`
    );

    setNotice({ tone: 'success', text: `Loaded ${sample.title}.` });
  };

  const resetWorkspace = () => {
    startTransition(() => {
      setPrimaryText('');
      setCompareText('');
      setSchemaText('');
      setOutputTab('tree');
      setSelectedPath(null);
    });

    setNotice({ tone: 'info', text: 'Workspace cleared. Choose another sample to continue.' });
  };

  const createSnapshot = (overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot => ({
    primaryText: overrides.primaryText ?? primaryText,
    compareText: overrides.compareText ?? compareText,
    schemaText: overrides.schemaText ?? schemaText,
    outputTab: overrides.outputTab ?? outputTab,
    selectedPath: overrides.selectedPath ?? selectedPath
  });

  const recordHistoryEntry = (
    kind: NonNullable<RecentSnippet['kind']>,
    content: string,
    snapshot: WorkspaceSnapshot,
    title?: string,
    summary?: string
  ) => {
    setRecentSnippets((current) => {
      const next = addRecentSnippet(content, current, {
        kind,
        title,
        summary,
        snapshot
      });

      saveRecentSnippets(next);
      return next;
    });

    lastSavedRef.current = content;
  };

  const handleClearHistory = () => {
    clearRecentSnippets();
    setRecentSnippets([]);
    setNotice({ tone: 'success', text: 'History timeline cleared.' });
  };

  const handleOpenPalette = () => {
    setPaletteOpenToken((current) => current + 1);
  };

  const handleOpenOnboarding = () => {
    setShowOnboarding(true);

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    }
  };

  const handleOpenSearch = (mode: WorkspaceSearchMode = 'all') => {
    if (isBlankWorkspace) {
      setNotice({ tone: 'info', text: 'Load a sample or import JSON to unlock search and history.' });
      return;
    }

    setSearchMode(mode);
    setSearchFocusToken((current) => current + 1);
    searchPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setNotice({ tone: 'info', text: mode === 'paths' ? 'Search is ready in path mode.' : 'Search is ready.' });
  };

  const handleOpenHistory = () => {
    if (isBlankWorkspace) {
      setNotice({ tone: 'info', text: 'History appears after the first sample, import, or edit.' });
      return;
    }

    historyPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setNotice({ tone: 'info', text: 'History timeline opened.' });
  };

  const handleJumpToPath = (path: string) => {
    if (isBlankWorkspace) {
      setNotice({ tone: 'info', text: 'Load a sample or import JSON before jumping to a path.' });
      return;
    }

    setSelectedPath(path);
    setOutputTab('tree');
    outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setNotice({ tone: 'info', text: `Jumped to ${path}.` });
  };

  const handleRestoreHistoryEntry = (entry: RecentSnippet) => {
    const snapshot = entry.snapshot ?? {
      primaryText: entry.content,
      compareText: '',
      schemaText: '',
      outputTab: 'tree',
      selectedPath: null
    };

    suppressNextEditHistoryRef.current = true;
    recordHistoryEntry(
      'restore',
      snapshot.primaryText,
      snapshot,
      entry.title,
      `Restored ${entry.title} from history.`
    );

    startTransition(() => {
      setPrimaryText(snapshot.primaryText);
      setCompareText(snapshot.compareText);
      setSchemaText(snapshot.schemaText);
      setOutputTab(snapshot.outputTab as OutputTab);
      setSelectedPath(snapshot.selectedPath);
    });

    setNotice({ tone: 'success', text: `Restored ${entry.title}.` });
  };

  const handleCompareHistoryEntry = (entry: RecentSnippet) => {
    if (isBlankWorkspace) {
      setNotice({ tone: 'info', text: 'Load a sample or import JSON before comparing versions.' });
      return;
    }

    const compareValue = entry.snapshot?.primaryText ?? entry.content;

    startTransition(() => {
      setCompareText(compareValue);
      setOutputTab('diff');
    });

    outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setNotice({ tone: 'info', text: `Comparing against ${entry.title}.` });
  };

  useEffect(() => {
    if (!primaryAnalysis.isValid) {
      return;
    }

    if (suppressNextEditHistoryRef.current) {
      suppressNextEditHistoryRef.current = false;
      return;
    }

    const normalized = primaryAnalysis.formatted;
    if (normalized === lastSavedRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (normalized === lastSavedRef.current) {
        return;
      }

      recordHistoryEntry('edit', normalized, createSnapshot({ primaryText: normalized }), undefined, 'Edited the primary JSON.');
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [primaryAnalysis.formatted, primaryAnalysis.isValid]);

  const fileAccept = '.json,application/json,text/plain';

  const stats = {
    bytes: primaryAnalysis.byteLength,
    lines: primaryAnalysis.lineCount,
    nodes: primaryAnalysis.metrics.nodeCount,
    leaves: primaryAnalysis.metrics.leafCount,
    depth: primaryAnalysis.metrics.maxDepth,
    compareNodes: compareAnalysis.metrics.nodeCount,
    compareLeaves: compareAnalysis.metrics.leafCount
  };

  const validationMessage = primaryAnalysis.isValid
    ? schemaValidation.compileError
      ? schemaValidation.compileError
      : schemaAnalysis.isValid && schemaAnalysis.value
        ? schemaValidation.valid
          ? 'Schema validation passed.'
          : schemaValidation.errors.length > 0
            ? `Schema validation failed with ${schemaValidation.errors.length} issue(s).`
            : 'Schema validation failed.'
        : 'Primary JSON is valid.'
    : primaryAnalysis.error?.message ?? 'JSON is invalid.';

  const validationTone: NoticeState['tone'] = primaryAnalysis.isValid
    ? schemaValidation.compileError || (schemaAnalysis.isValid && schemaAnalysis.value && !schemaValidation.valid)
      ? 'error'
      : 'success'
    : 'error';

  const currentNotice = notice ?? (isBlankWorkspace ? { tone: 'info', text: 'Load a sample or import JSON to unlock search, history, and output views.' } : { tone: validationTone, text: validationMessage });

  const handleFormat = () => {
    if (!primaryAnalysis.isValid) {
      setNotice({ tone: 'error', text: 'Fix the JSON before formatting it.' });
      return;
    }

    startTransition(() => setPrimaryText(formatJsonText(primaryText)));
    setNotice({ tone: 'success', text: 'JSON formatted into a consistent, readable structure.' });
  };

  const handleMinify = () => {
    if (!primaryAnalysis.isValid) {
      setNotice({ tone: 'error', text: 'Fix the JSON before minifying it.' });
      return;
    }

    startTransition(() => setPrimaryText(minifyJsonText(primaryText)));
    setNotice({ tone: 'success', text: 'JSON minified for transport or storage.' });
  };

  const handleValidate = () => {
    if (!primaryAnalysis.isValid) {
      setNotice({ tone: 'error', text: primaryAnalysis.error?.message ?? 'JSON is invalid.' });
      return;
    }

    setNotice({ tone: 'success', text: validationMessage });
  };

  const handleShare = async () => {
    if (!primaryAnalysis.isValid) {
      setNotice({ tone: 'error', text: 'Fix the JSON before generating a shareable link.' });
      return;
    }

    try {
      const encoded = encodeJsonForUrl(primaryAnalysis.formatted);
      const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
      await navigator.clipboard.writeText(url);
      setNotice({ tone: 'success', text: 'Shareable link copied to the clipboard.' });
    } catch {
      setNotice({ tone: 'error', text: 'Unable to copy the shareable link.' });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      suppressNextEditHistoryRef.current = true;
      recordHistoryEntry(
        'import',
        text,
        {
          primaryText: text,
          compareText,
          schemaText,
          outputTab: 'tree',
          selectedPath: null
        },
        file.name,
        `Imported ${file.name}.`
      );
      startTransition(() => setPrimaryText(text));
      setNotice({ tone: 'success', text: `Imported ${file.name}.` });
    } catch {
      setNotice({ tone: 'error', text: 'The file could not be read.' });
    } finally {
      event.target.value = '';
    }
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setNotice({ tone: 'success', text: `${filename} downloaded.` });
  };

  const exportItems = [
    { label: 'Formatted JSON', filename: 'jsonlab-formatted.json', content: primaryAnalysis.formatted },
    { label: 'Minified JSON', filename: 'jsonlab-minified.json', content: primaryAnalysis.minified },
    { label: 'YAML', filename: 'jsonlab.yaml', content: yamlText },
    { label: 'CSV', filename: 'jsonlab.csv', content: csvArtifact?.csv ?? '' },
    { label: 'TypeScript', filename: 'jsonlab.ts', content: typeArtifacts.typescript },
    { label: 'Dart', filename: 'jsonlab.dart', content: typeArtifacts.dart }
  ];

  const downloadEnabled = primaryAnalysis.isValid || Boolean(yamlText) || Boolean(typeArtifacts.typescript);

  const workspaceCommands: WorkspaceCommand[] = [
    {
      id: 'validate-json',
      label: 'Validate JSON',
      description: 'Check the primary document and surface schema feedback.',
      group: 'Actions',
      shortcut: 'Enter',
      run: handleValidate,
      keywords: ['verify', 'schema', 'check']
    },
    {
      id: 'format-json',
      label: 'Format JSON',
      description: 'Pretty-print the primary document.',
      group: 'Actions',
      shortcut: 'Shift F',
      run: handleFormat,
      disabled: !primaryAnalysis.isValid,
      keywords: ['pretty', 'indent', 'normalize']
    },
    {
      id: 'minify-json',
      label: 'Minify JSON',
      description: 'Compress the primary document for transport or storage.',
      group: 'Actions',
      shortcut: 'Shift M',
      run: handleMinify,
      disabled: !primaryAnalysis.isValid,
      keywords: ['compact', 'compress', 'small']
    },
    {
      id: 'share-link',
      label: 'Copy share link',
      description: 'Copy a URL with the current JSON embedded.',
      group: 'Actions',
      shortcut: 'Shift S',
      run: handleShare,
      disabled: !primaryAnalysis.isValid,
      keywords: ['share', 'url', 'copy']
    },
    {
      id: 'import-json',
      label: 'Import JSON',
      description: 'Load a JSON file from disk into the workspace.',
      group: 'Actions',
      shortcut: 'I',
      run: handleImportClick,
      keywords: ['upload', 'open', 'file']
    },
    {
      id: 'reset-workspace',
      label: 'Reset workspace',
      description: 'Clear the editors and return to a blank canvas.',
      group: 'Actions',
      shortcut: 'R',
      run: resetWorkspace,
      disabled: isBlankWorkspace,
      keywords: ['clear', 'blank', 'start over']
    },
    {
      id: 'open-search',
      label: 'Open search panel',
      description: 'Focus Search & Jump and search the current JSON.',
      group: 'Navigation',
      run: () => handleOpenSearch('all'),
      disabled: isBlankWorkspace,
      keywords: ['search', 'find', 'jump', 'filter']
    },
    {
      id: 'jump-to-path',
      label: 'Jump to path',
      description: 'Open Search & Jump in path mode and focus the input.',
      group: 'Navigation',
      run: () => handleOpenSearch('paths'),
      disabled: isBlankWorkspace,
      keywords: ['path', 'tree', 'locate', 'select']
    },
    {
      id: 'open-history',
      label: 'Open history timeline',
      description: 'Scroll to the history timeline with restore and compare actions.',
      group: 'Navigation',
      run: handleOpenHistory,
      disabled: isBlankWorkspace,
      keywords: ['history', 'timeline', 'restore', 'compare']
    },
    {
      id: 'show-onboarding',
      label: 'Show onboarding',
      description: 'Replay the first-run walkthrough and workspace hints.',
      group: 'Help',
      run: handleOpenOnboarding,
      keywords: ['tour', 'walkthrough', 'help', 'guide']
    },
    {
      id: 'sample-api',
      label: 'Load API sample',
      description: 'Populate the workspace with an API payload diff example.',
      group: 'Samples',
      run: () => loadSample(WORKSPACE_SAMPLES[0]),
      keywords: ['api', 'payload', 'response', 'diff']
    },
    {
      id: 'sample-config',
      label: 'Load nested config',
      description: 'Explore a layered settings object and tree view.',
      group: 'Samples',
      run: () => loadSample(WORKSPACE_SAMPLES[1]),
      keywords: ['nested', 'config', 'tree', 'settings']
    },
    {
      id: 'sample-schema',
      label: 'Load schema validation',
      description: 'Load JSON plus schema to preview validation and types.',
      group: 'Samples',
      run: () => loadSample(WORKSPACE_SAMPLES[2]),
      keywords: ['schema', 'validation', 'types', 'contract']
    },
    {
      id: 'view-tree',
      label: 'Switch to Tree view',
      description: 'Browse nested objects and arrays structurally.',
      group: 'Views',
      shortcut: '1',
      run: () => setOutputTab('tree'),
      keywords: ['tree', 'structure', 'hierarchy']
    },
    {
      id: 'view-table',
      label: 'Switch to Table view',
      description: 'Project object arrays into a tabular view.',
      group: 'Views',
      shortcut: '2',
      run: () => setOutputTab('table'),
      keywords: ['table', 'grid', 'rows']
    },
    {
      id: 'view-diff',
      label: 'Switch to Diff view',
      description: 'Compare the primary JSON with the secondary document.',
      group: 'Views',
      shortcut: '3',
      run: () => setOutputTab('diff'),
      keywords: ['compare', 'changes', 'delta']
    },
    {
      id: 'view-raw',
      label: 'Switch to Raw view',
      description: 'Inspect the original JSON source text.',
      group: 'Views',
      shortcut: '4',
      run: () => setOutputTab('raw'),
      keywords: ['raw', 'source', 'text']
    },
    {
      id: 'view-minified',
      label: 'Switch to Minified view',
      description: 'Inspect the compact JSON output.',
      group: 'Views',
      shortcut: '5',
      run: () => setOutputTab('minified'),
      keywords: ['compact', 'minified', 'small']
    },
    {
      id: 'view-yaml',
      label: 'Switch to YAML view',
      description: 'Preview the YAML projection of the primary document.',
      group: 'Views',
      shortcut: '6',
      run: () => setOutputTab('yaml'),
      keywords: ['yaml', 'conversion']
    },
    {
      id: 'view-csv',
      label: 'Switch to CSV view',
      description: 'Preview a CSV projection when the JSON is tabular.',
      group: 'Views',
      shortcut: '7',
      run: () => setOutputTab('csv'),
      keywords: ['csv', 'table', 'spreadsheet']
    },
    {
      id: 'view-types',
      label: 'Switch to Types view',
      description: 'Preview generated TypeScript and Dart models.',
      group: 'Views',
      shortcut: '8',
      run: () => setOutputTab('types'),
      keywords: ['types', 'codegen', 'models']
    },
    {
      id: 'export-json',
      label: 'Export formatted JSON',
      description: 'Download the normalized primary JSON as a file.',
      group: 'Export',
      run: () => handleDownload('jsonlab-formatted.json', primaryAnalysis.formatted),
      disabled: !primaryAnalysis.isValid || !primaryAnalysis.formatted,
      keywords: ['download', 'pretty', 'json']
    },
    {
      id: 'export-minified',
      label: 'Export minified JSON',
      description: 'Download a compact JSON file.',
      group: 'Export',
      run: () => handleDownload('jsonlab-minified.json', primaryAnalysis.minified),
      disabled: !primaryAnalysis.isValid || !primaryAnalysis.minified,
      keywords: ['download', 'compact', 'json']
    },
    {
      id: 'export-yaml',
      label: 'Export YAML',
      description: 'Download the YAML conversion of the active document.',
      group: 'Export',
      run: () => handleDownload('jsonlab.yaml', yamlText),
      disabled: !yamlText,
      keywords: ['download', 'yaml']
    },
    {
      id: 'export-csv',
      label: 'Export CSV',
      description: 'Download a CSV view when the JSON is tabular.',
      group: 'Export',
      run: () => handleDownload('jsonlab.csv', csvArtifact?.csv ?? ''),
      disabled: !csvArtifact?.csv,
      keywords: ['download', 'csv']
    },
    {
      id: 'export-typescript',
      label: 'Export TypeScript',
      description: 'Download generated TypeScript types.',
      group: 'Export',
      run: () => handleDownload('jsonlab.ts', typeArtifacts.typescript),
      disabled: !typeArtifacts.typescript,
      keywords: ['download', 'typescript', 'types']
    },
    {
      id: 'export-dart',
      label: 'Export Dart',
      description: 'Download generated Dart models.',
      group: 'Export',
      run: () => handleDownload('jsonlab.dart', typeArtifacts.dart),
      disabled: !typeArtifacts.dart,
      keywords: ['download', 'dart', 'models']
    },
    {
      id: 'navigate-ai',
      label: 'Open AI Assistant',
      description: 'Jump to the AI workspace.',
      group: 'Navigation',
      run: () => router.push('/ai'),
      keywords: ['ai', 'assistant', 'chat']
    },
    {
      id: 'navigate-mock-data',
      label: 'Open Mock Data',
      description: 'Jump to the mock data generator.',
      group: 'Navigation',
      run: () => router.push('/mock-data'),
      keywords: ['mock', 'generator', 'faker']
    }
  ];

  return (
    <div className="space-y-6 pb-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-panel relative overflow-hidden rounded-[1.85rem] p-5 shadow-soft sm:p-6"
      >
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              JsonLab workspace
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {isBlankWorkspace ? 'Start with a sample or paste JSON.' : 'Inspect, validate, and reshape JSON in one place.'}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {isBlankWorkspace
                  ? 'Use the command palette to load samples or import files first. Search and history appear once the workspace has data.'
                  : 'The editor, tree, diff, schema, and export tools stay in one workspace so the flow stays focused.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isBlankWorkspace ? (
                <>
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">Guided start</Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">Blank canvas</Badge>
                </>
              ) : (
                <>
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">Live parsing</Badge>
                  <Badge variant={primaryAnalysis.isValid ? 'success' : 'destructive'} className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
                    {primaryAnalysis.isValid ? 'Valid JSON' : 'Invalid JSON'}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">{outputTabs.find((tab) => tab.value === outputTab)?.label}</Badge>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5">Ctrl / Cmd + K opens the command palette</span>
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5">Search &amp; jump highlights paths in the tree</span>
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5">History keeps edits, imports, and samples</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:max-w-[30rem] lg:justify-end">
            {isBlankWorkspace ? (
              <>
                <WorkspaceCommandPalette commands={workspaceCommands} triggerVariant="secondary" openSignal={paletteOpenToken} />
                <Button type="button" onClick={() => loadSample(WORKSPACE_SAMPLES[0])} className="rounded-full px-5 shadow-glow">
                  <Sparkles className="h-4 w-4" />
                  Load API sample
                </Button>
                <Button type="button" variant="secondary" onClick={handleImportClick} className="rounded-full px-5 shadow-sm">
                  <Upload className="h-4 w-4" />
                  Import JSON
                </Button>
              </>
            ) : (
              <>
                <WorkspaceCommandPalette commands={workspaceCommands} triggerVariant="secondary" openSignal={paletteOpenToken} />
                <Button type="button" variant="secondary" onClick={handleValidate} className="rounded-full px-5 shadow-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Validate
                </Button>
                <Button type="button" variant="secondary" onClick={handleImportClick} className="rounded-full px-5 shadow-sm">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" className="rounded-full px-5 shadow-glow" disabled={!downloadEnabled || isPending}>
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {exportItems.map((item) => (
                      <DropdownMenuItem
                        key={item.filename}
                        onClick={() => handleDownload(item.filename, item.content || '')}
                        className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5"
                      >
                        {item.label}
                        <span className="text-xs text-muted-foreground">{item.filename.split('.').pop()}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        const plainLink = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'http://localhost:3000';
                        handleDownload('jsonlab-share-link.txt', plainLink);
                      }}
                      className="rounded-xl px-3 py-2.5"
                    >
                      Plain link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          {isBlankWorkspace ? (
            <>
              <Metric label="Samples" value="3 curated paths" />
              <Metric label="Shortcut" value="Ctrl / Cmd + K" />
              <Metric label="Import" value="Ready" />
            </>
          ) : (
            <>
              <Metric label="Bytes" value={`${stats.bytes.toLocaleString()}`} />
              <Metric label="Nodes" value={`${stats.nodes.toLocaleString()}`} />
              <Metric label="Depth" value={`${stats.depth.toLocaleString()}`} />
            </>
          )}
        </div>

        <AnimatePresence mode="wait">
          {currentNotice ? (
            <motion.div
              key={currentNotice.text}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={cn(
                'relative mt-5 rounded-2xl border px-4 py-3 text-sm shadow-sm',
                currentNotice.tone === 'success' && 'border-success/30 bg-success/10 text-success',
                currentNotice.tone === 'error' && 'border-destructive/30 bg-destructive/10 text-destructive',
                currentNotice.tone === 'info' && 'border-primary/20 bg-primary/10 text-primary'
              )}
            >
              {currentNotice.text}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.section>

      <AnimatePresence initial={false}>
        {showOnboarding ? (
          <WorkspaceOnboarding
            open={showOnboarding}
            onDismiss={handleDismissOnboarding}
            onOpenSearch={() => handleOpenSearch('all')}
            onOpenHistory={handleOpenHistory}
            onOpenPalette={handleOpenPalette}
          />
        ) : null}
      </AnimatePresence>

      {isBlankWorkspace ? (
        <WorkspaceEmptyState samples={WORKSPACE_SAMPLES} onLoadSample={loadSample} onImport={handleImportClick} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_420px]">
            <div className="space-y-6">
              <JsonEditor
                label="Primary JSON"
                helperText="This document drives the tree, table, YAML, CSV, and type outputs."
                value={primaryText}
                onChange={(value) => setPrimaryText(value)}
                error={primaryAnalysis.isValid ? null : primaryAnalysis.error?.message ?? 'Invalid JSON'}
                height={640}
              />

              <Card className="border-border/70 bg-card/95 shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Validation Summary</CardTitle>
                  <CardDescription>Schema validation is applied when a valid schema is loaded in the inspector.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <StatusPill label="JSON" tone={primaryAnalysis.isValid ? 'success' : 'destructive'} value={primaryAnalysis.isValid ? 'Valid' : 'Invalid'} />
                  <StatusPill label="Schema" tone={schemaValidation.compileError || (schemaAnalysis.isValid && schemaAnalysis.value && !schemaValidation.valid) ? 'destructive' : 'success'} value={schemaValidation.compileError ? 'Compile error' : schemaAnalysis.isValid && schemaAnalysis.value ? schemaValidation.valid ? 'Passes' : 'Fails' : 'Not loaded'} />
                  <StatusPill label="Leaves" tone="secondary" value={primaryAnalysis.isValid ? countLeafValues(primaryAnalysis.value as JsonValue) : 'N/A'} />
                  <StatusPill label="Compare" tone={compareAnalysis.isValid ? 'success' : 'secondary'} value={compareAnalysis.isValid ? `${stats.compareLeaves} leaves` : 'Not ready'} />
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold tracking-tight">Inspector</h3>
                <p className="text-sm text-muted-foreground">Search, compare, and history stay in separate cards so each task reads clearly.</p>
              </div>

              <div ref={searchPanelRef} className="scroll-mt-24">
                <WorkspaceSearchPanel
                  analysis={primaryAnalysis}
                  selectedPath={selectedPath}
                  onJumpToPath={handleJumpToPath}
                  focusToken={searchFocusToken}
                  defaultMode={searchMode}
                  onModeChange={setSearchMode}
                />
              </div>

              <Card className="border-border/70 bg-card/95 shadow-soft">
                <CardHeader className="space-y-2 border-b border-border/60 pb-4">
                  <CardTitle className="text-base">Comparison and schema</CardTitle>
                  <CardDescription>Switch between the secondary JSON and schema without leaving the inspector.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <Tabs defaultValue="compare" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2 rounded-full">
                      <TabsTrigger value="compare" className="rounded-full text-xs uppercase tracking-[0.18em]">Compare</TabsTrigger>
                      <TabsTrigger value="schema" className="rounded-full text-xs uppercase tracking-[0.18em]">Schema</TabsTrigger>
                    </TabsList>

                    <TabsContent value="compare" className="space-y-3">
                      <JsonEditor
                        label="Comparison JSON"
                        helperText="This drives the diff view and lets you compare two documents quickly."
                        value={compareText}
                        onChange={(value) => setCompareText(value)}
                        error={compareAnalysis.isValid ? null : compareAnalysis.error?.message ?? 'Invalid JSON'}
                        height={240}
                        compact
                      />
                      <StatusPill label="Compare nodes" tone={compareAnalysis.isValid ? 'success' : 'secondary'} value={compareAnalysis.isValid ? stats.compareNodes : 'N/A'} />
                    </TabsContent>

                    <TabsContent value="schema" className="space-y-3">
                      <JsonEditor
                        label="JSON Schema"
                        helperText="Valid schema also powers type generation."
                        value={schemaText}
                        onChange={(value) => setSchemaText(value)}
                        error={schemaAnalysis.isValid ? null : schemaAnalysis.error?.message ?? 'Invalid schema'}
                        height={240}
                        compact
                      />
                      {schemaAnalysis.isValid && schemaAnalysis.value ? (
                        <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
                          <StatusPill label="Schema" tone={schemaValidation.compileError || !schemaValidation.valid ? 'destructive' : 'success'} value={schemaValidation.compileError ? 'Compile error' : schemaValidation.valid ? 'Passes' : 'Fails'} />
                          {!schemaValidation.compileError && schemaValidation.errors.length > 0 ? (
                            <div className="space-y-2 text-xs text-muted-foreground">
                              {schemaValidation.errors.slice(0, 3).map((error, index) => (
                                <div key={`${error.instancePath ?? 'schema'}-${index}`} className="rounded-xl border border-border bg-card px-3 py-2">
                                  <p className="font-medium text-foreground">{error.instancePath || '/'}</p>
                                  <p>{error.message}</p>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </TabsContent>
                  </Tabs>

                  <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
                    <StatusRow label="Selected path" value={selectedPath ?? 'None selected'} />
                    <StatusRow label="Validation" value={validationMessage} muted={!primaryAnalysis.isValid || Boolean(schemaValidation.compileError) || Boolean(schemaAnalysis.isValid && schemaAnalysis.value && !schemaValidation.valid)} />
                    <StatusRow label="Line / column" value={primaryAnalysis.error?.line ? `${primaryAnalysis.error.line}:${primaryAnalysis.error.column ?? 1}` : 'No parse issue'} />
                    <StatusRow label="Schema rules" value={schemaAnalysis.isValid && schemaAnalysis.value ? `${schemaValidation.errors.length} error(s)` : 'Not active'} />
                  </div>
                </CardContent>
              </Card>

              <div ref={historyPanelRef} className="scroll-mt-24">
                <WorkspaceHistoryTimeline
                  entries={recentSnippets}
                  onRestore={handleRestoreHistoryEntry}
                  onCompare={handleCompareHistoryEntry}
                  onClear={handleClearHistory}
                />
              </div>
            </aside>
          </div>

          <section ref={outputSectionRef} className="space-y-4 scroll-mt-24">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Output Studio</h3>
                <p className="text-sm text-muted-foreground">Switch between structural, tabular, raw, transformed, and generated views.</p>
              </div>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">{outputTab}</Badge>
            </div>

            <Tabs value={outputTab} onValueChange={(value) => setOutputTab(value as OutputTab)} className="space-y-4">
              <TabsList className="json-scrollbar flex w-full items-center justify-start gap-1 overflow-x-auto rounded-full border border-border/70 bg-card/90 p-1 shadow-sm">
                {outputTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="rounded-full px-4 text-xs uppercase tracking-[0.18em]">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={outputTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                >
                  <TabsContent value={outputTab} forceMount className="mt-0">
                    {renderOutputTab(outputTab, {
                      primaryAnalysis,
                      compareAnalysis,
                      schemaValidation,
                      schemaAnalysis,
                      yamlText,
                      csvArtifact,
                      typeArtifacts,
                      selectedPath,
                      setSelectedPath
                    })}
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </section>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept={fileAccept} className="hidden" onChange={handleImportFile} />
    </div>
  );
}

function renderOutputTab(
  tab: OutputTab,
  {
    primaryAnalysis,
    compareAnalysis,
    schemaValidation,
    schemaAnalysis,
    yamlText,
    csvArtifact,
    typeArtifacts,
    selectedPath,
    setSelectedPath
  }: {
    primaryAnalysis: JsonAnalysis;
    compareAnalysis: JsonAnalysis;
    schemaValidation: { valid: boolean; errors: Array<{ message?: string; instancePath?: string }> ; compileError: string | null };
    schemaAnalysis: JsonAnalysis;
    yamlText: string;
    csvArtifact: ReturnType<typeof jsonToCsv> | null;
    typeArtifacts: TypeArtifacts;
    selectedPath: string | null;
    setSelectedPath: (path: string | null) => void;
  }
) {
  if (tab === 'tree') {
    return <JsonTreeView analysis={primaryAnalysis} selectedPath={selectedPath} onSelectPath={setSelectedPath} />;
  }

  if (tab === 'table') {
    return <JsonTableView analysis={primaryAnalysis} />;
  }

  if (tab === 'diff') {
    return <JsonDiffView leftAnalysis={primaryAnalysis} rightAnalysis={compareAnalysis} />;
  }

  if (tab === 'raw') {
    return <CodeOutputPanel label="Raw JSON" description="The original source text remains available for direct copy operations." code={primaryAnalysis.text} language="json" tone={primaryAnalysis.isValid ? 'success' : 'destructive'} />;
  }

  if (tab === 'minified') {
    return <CodeOutputPanel label="Minified JSON" description="Compact output for transport, hashing, or URL payloads." code={primaryAnalysis.minified} language="json" tone={primaryAnalysis.isValid ? 'success' : 'destructive'} />;
  }

  if (tab === 'yaml') {
    return <CodeOutputPanel label="YAML" description="A readable YAML projection of the primary JSON value." code={yamlText || 'Valid JSON is required to generate YAML.'} language="yaml" tone={primaryAnalysis.isValid ? 'success' : 'secondary'} />;
  }

  if (tab === 'csv') {
    return (
      <CodeOutputPanel
        label="CSV"
        description={csvArtifact?.reason || 'Tabular structures produce a CSV representation when possible.'}
        code={csvArtifact?.csv || 'Valid JSON is required to generate CSV output.'}
        language="csv"
        tone={primaryAnalysis.isValid ? 'success' : 'secondary'}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <CodeOutputPanel label={`TypeScript ${schemaAnalysis.isValid && schemaAnalysis.value && schemaValidation.valid ? '(schema)' : '(json)'}`} description="Generated from the active source with nested object support." code={typeArtifacts.typescript || 'Validate JSON or schema to generate TypeScript types.'} language="typescript" tone={primaryAnalysis.isValid ? 'success' : 'secondary'} compact />
        <CodeOutputPanel label={`Dart ${schemaAnalysis.isValid && schemaAnalysis.value && schemaValidation.valid ? '(schema)' : '(json)'}`} description="Generated models for Flutter-friendly consumption." code={typeArtifacts.dart || 'Validate JSON or schema to generate Dart models.'} language="dart" tone={primaryAnalysis.isValid ? 'success' : 'secondary'} compact />
      </div>
    </div>
  );
}

function CodeOutputPanel({
  label,
  description,
  code,
  language,
  tone,
  compact = false
}: {
  label: string;
  description: string;
  code: string;
  language: string;
  tone: 'success' | 'secondary' | 'destructive';
  compact?: boolean;
}) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // No-op: copy buttons are a convenience, not a hard requirement.
    }
  };

  return (
    <div className={cn('overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft', compact && 'h-full')}>
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Badge variant={tone === 'success' ? 'success' : tone === 'destructive' ? 'destructive' : 'secondary'} className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]">
              {language}
            </Badge>
            {label}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
          Copy
        </Button>
      </div>
      <ScrollArea className="json-scrollbar max-h-[520px]">
        <pre className="overflow-x-auto p-5 font-mono text-xs leading-6 text-foreground sm:p-6">{code}</pre>
      </ScrollArea>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 shadow-sm">
      <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function StatusPill({ label, value, tone }: { label: string; value: string | number; tone: 'success' | 'destructive' | 'secondary' }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 shadow-sm">
      <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-sm font-medium', tone === 'success' && 'text-success', tone === 'destructive' && 'text-destructive', tone === 'secondary' && 'text-foreground')}>
        {value}
      </p>
    </div>
  );
}

function StatusRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className={cn('max-w-[65%] text-right text-sm', muted && 'text-muted-foreground')}>{value}</span>
    </div>
  );
}