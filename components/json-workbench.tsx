'use client';

import type { ChangeEvent } from 'react';
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ArrowDownToLine, CheckCircle2, Copy, FileJson2, Loader2, Minimize2, Share2, Sparkles, Upload } from 'lucide-react';

import { JsonDiffView } from '@/components/json-diff-view';
import { JsonEditor } from '@/components/json-editor';
import { JsonTableView } from '@/components/json-table-view';
import { JsonTreeView } from '@/components/json-tree-view';
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
import { addRecentSnippet, loadRecentSnippets, saveRecentSnippets, type RecentSnippet, clearRecentSnippets } from '@/lib/storage';
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

export function JsonLabWorkspace() {
  const [primaryText, setPrimaryText] = useState('');
  const [compareText, setCompareText] = useState('');
  const [schemaText, setSchemaText] = useState('');
  const [outputTab, setOutputTab] = useState<OutputTab>('tree');
  const [recentSnippets, setRecentSnippets] = useState<RecentSnippet[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    startTransition(() => {
      setPrimaryText(sample.primaryText);
      setCompareText(sample.compareText ?? '');
      setSchemaText(sample.schemaText ?? '');
      setOutputTab(sample.outputTab);
      setSelectedPath(null);
    });

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

  useEffect(() => {
    if (!primaryAnalysis.isValid) {
      return;
    }

    const normalized = primaryAnalysis.formatted;
    if (normalized === lastSavedRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setRecentSnippets((current) => {
        const next = addRecentSnippet(normalized, current);
        saveRecentSnippets(next);
        lastSavedRef.current = normalized;
        return next;
      });
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

  const currentNotice = notice ?? (isBlankWorkspace ? { tone: 'info', text: 'Choose a sample below to populate the editor, tree, diff, and schema panels in one click.' } : { tone: validationTone, text: validationMessage });

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

  return (
    <div className="space-y-6 pb-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-panel relative overflow-hidden rounded-[2rem] p-6 shadow-soft"
      >
        <div className="absolute inset-0 bg-grid-fade bg-[length:22px_22px] opacity-[0.08]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.26em] text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              JsonLab workspace
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {isBlankWorkspace ? 'Start with a guided sample or paste your own JSON.' : 'Explore, validate, and reshape JSON in one fluid workspace.'}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {isBlankWorkspace
                  ? 'Pick a one-click example to load an API payload, nested config, or schema pair. The editor, tree, diff, and type outputs all update together.'
                  : 'JsonLab keeps the input editor, tree explorer, schema validation, type generation, and diff view visible together so the work never feels fragmented.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isBlankWorkspace ? (
                <>
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">Guided start</Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">3 sample paths</Badge>
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isBlankWorkspace ? (
              <>
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
                <Button type="button" variant="secondary" onClick={handleValidate} className="rounded-full px-5 shadow-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Validate
                </Button>
                <Button type="button" variant="secondary" onClick={handleFormat} className="rounded-full px-5 shadow-sm">
                  <FileJson2 className="h-4 w-4" />
                  Format
                </Button>
                <Button type="button" variant="secondary" onClick={handleMinify} className="rounded-full px-5 shadow-sm">
                  <Minimize2 className="h-4 w-4" />
                  Minify
                </Button>
                <Button type="button" variant="secondary" onClick={handleShare} className="rounded-full px-5 shadow-sm">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button type="button" variant="secondary" onClick={handleImportClick} className="rounded-full px-5 shadow-sm">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
                <Button type="button" variant="secondary" onClick={resetWorkspace} className="rounded-full px-5 shadow-sm">
                  Samples
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

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {isBlankWorkspace ? (
            <>
              <Metric label="Samples" value="3" />
              <Metric label="Click path" value="API, config, schema" />
              <Metric label="State" value="Ready to explore" />
              <Metric label="Import" value="Also supported" />
            </>
          ) : (
            <>
              <Metric label="Bytes" value={`${stats.bytes.toLocaleString()}`} />
              <Metric label="Lines" value={`${stats.lines.toLocaleString()}`} />
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

      {isBlankWorkspace ? (
        <WorkspaceEmptyState samples={WORKSPACE_SAMPLES} onLoadSample={loadSample} onImport={handleImportClick} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_360px]">
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
                <CardDescription>Schema validation is applied when a valid schema is loaded on the right.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <StatusPill label="JSON" tone={primaryAnalysis.isValid ? 'success' : 'destructive'} value={primaryAnalysis.isValid ? 'Valid' : 'Invalid'} />
                <StatusPill label="Schema" tone={schemaValidation.compileError || (schemaAnalysis.isValid && schemaAnalysis.value && !schemaValidation.valid) ? 'destructive' : 'success'} value={schemaValidation.compileError ? 'Compile error' : schemaAnalysis.isValid && schemaAnalysis.value ? schemaValidation.valid ? 'Passes' : 'Fails' : 'Not loaded'} />
                <StatusPill label="Leaves" tone="secondary" value={primaryAnalysis.isValid ? countLeafValues(primaryAnalysis.value as JsonValue) : 'N/A'} />
                <StatusPill label="Compare" tone={compareAnalysis.isValid ? 'success' : 'secondary'} value={compareAnalysis.isValid ? `${stats.compareLeaves} leaves` : 'Not ready'} />
              </CardContent>
            </Card>
          </div>

          <section className="space-y-4">
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

          <aside className="space-y-6">
            <Card className="border-border/70 bg-card/95 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Secondary Inputs</CardTitle>
                <CardDescription>Comparison JSON and schema validation stay one click away.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="compare" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 rounded-full">
                    <TabsTrigger value="compare" className="rounded-full text-xs uppercase tracking-[0.18em]">Compare</TabsTrigger>
                    <TabsTrigger value="schema" className="rounded-full text-xs uppercase tracking-[0.18em]">Schema</TabsTrigger>
                  </TabsList>

                  <TabsContent value="compare" className="space-y-3">
                    <JsonEditor
                      label="Comparison JSON"
                      helperText="The diff panel compares this document with the primary JSON."
                      value={compareText}
                      onChange={(value) => setCompareText(value)}
                      error={compareAnalysis.isValid ? null : compareAnalysis.error?.message ?? 'Invalid JSON'}
                      height={280}
                      compact
                    />
                    <StatusPill label="Compare nodes" tone={compareAnalysis.isValid ? 'success' : 'secondary'} value={compareAnalysis.isValid ? stats.compareNodes : 'N/A'} />
                  </TabsContent>

                  <TabsContent value="schema" className="space-y-3">
                    <JsonEditor
                      label="JSON Schema"
                      helperText="Schema validation also powers type generation when it is valid."
                      value={schemaText}
                      onChange={(value) => setSchemaText(value)}
                      error={schemaAnalysis.isValid ? null : schemaAnalysis.error?.message ?? 'Invalid schema'}
                      height={280}
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
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/95 shadow-soft">
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Recent Snippets</CardTitle>
                  <CardDescription>Stored locally in the browser for quick recall.</CardDescription>
                </div>
                <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => { clearRecentSnippets(); setRecentSnippets([]); setNotice({ tone: 'success', text: 'Recent snippets cleared.' }); }}>
                  Clear
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentSnippets.length > 0 ? (
                  <ScrollArea className="json-scrollbar max-h-[280px] pr-2">
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
                            <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-[0.18em]">{new Date(snippet.savedAt).toLocaleDateString()}</Badge>
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
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/95 shadow-soft">
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Status</CardTitle>
                  <CardDescription>Current workspace health and selection details.</CardDescription>
                </div>
                <Badge variant={primaryAnalysis.isValid ? 'success' : 'destructive'} className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]">
                  {primaryAnalysis.isValid ? 'Healthy' : 'Needs attention'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <StatusRow label="Selected path" value={selectedPath ?? 'None selected'} />
                <StatusRow label="Validation" value={validationMessage} muted={!primaryAnalysis.isValid || Boolean(schemaValidation.compileError) || Boolean(schemaAnalysis.isValid && schemaAnalysis.value && !schemaValidation.valid)} />
                <StatusRow label="Line / column" value={primaryAnalysis.error?.line ? `${primaryAnalysis.error.line}:${primaryAnalysis.error.column ?? 1}` : 'No parse issue'} />
                <StatusRow label="Leaf count" value={`${stats.leaves.toLocaleString()}`} />
                <StatusRow label="Schema rules" value={schemaAnalysis.isValid && schemaAnalysis.value ? `${schemaValidation.errors.length} error(s)` : 'Not active'} />
              </CardContent>
            </Card>
          </aside>
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