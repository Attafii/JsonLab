'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Code2, Copy, Loader2, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type AiMode = 'chat' | 'code-fix';

export function AiWorkbench() {
  const [mode, setMode] = useState<AiMode>('chat');
  const [message, setMessage] = useState('How does JsonLab keep tree, diff, and schema validation in sync?');
  const [snippet, setSnippet] = useState(`function parseJson(text) {
  return JSON.parse(text)
}`);
  const [instruction, setInstruction] = useState('Make the snippet safer and more concise.');
  const [response, setResponse] = useState('');
  const [provider, setProvider] = useState<'local' | 'remote'>('local');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePayload = useMemo(() => {
    if (mode === 'chat') {
      return { mode, message };
    }

    return { mode, snippet, instruction };
  }, [instruction, message, mode, snippet]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const apiResponse = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(activePayload)
      });

      const payload = (await apiResponse.json()) as { response?: string; provider?: 'local' | 'remote'; error?: string };
      setResponse(payload.response ?? 'No response was returned.');
      setProvider(payload.provider ?? 'local');
      if (payload.error) {
        setError(payload.error);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'AI request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response);
    } catch {
      // Copy is optional; the response still stays visible.
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel relative overflow-hidden rounded-[2rem] p-6 shadow-soft">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_30%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              AI assistant
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ask about the app or repair a code snippet without leaving JsonLab.</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              The route can connect to a remote provider when configured, and it falls back to a local helper so the workflow still functions in every environment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">{provider}</Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">{mode}</Badge>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="border-border/70 bg-card/95 shadow-soft">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Prompt Builder</CardTitle>
                <CardDescription>Switch between natural-language chat and focused code-fix mode.</CardDescription>
              </div>
              <Tabs value={mode} onValueChange={(value) => setMode(value as AiMode)}>
                <TabsList className="grid grid-cols-2 rounded-full">
                  <TabsTrigger value="chat" className="rounded-full text-xs uppercase tracking-[0.18em]">Chat</TabsTrigger>
                  <TabsTrigger value="code-fix" className="rounded-full text-xs uppercase tracking-[0.18em]">Code fix</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'chat' ? (
                <motion.div key="chat" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                  <Textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="min-h-[220px] rounded-3xl border-border/70 bg-muted/15 text-sm leading-6"
                    placeholder="Ask a question about JsonLab, JSON workflows, schema validation, or the codebase."
                  />
                </motion.div>
              ) : (
                <motion.div key="fix" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                  <div className="grid gap-3">
                    <Textarea
                      value={instruction}
                      onChange={(event) => setInstruction(event.target.value)}
                      className="min-h-[92px] rounded-3xl border-border/70 bg-muted/15 text-sm leading-6"
                      placeholder="Describe the change you want."
                    />
                    <Textarea
                      value={snippet}
                      onChange={(event) => setSnippet(event.target.value)}
                      className="min-h-[220px] rounded-3xl border-border/70 bg-muted/15 font-mono text-sm leading-6"
                      placeholder="Paste the code snippet to repair."
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={handleSubmit} className="rounded-full px-5 shadow-glow" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                Run assistant
              </Button>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
                Remote source optional
              </Badge>
            </div>

            {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-soft">
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div>
              <CardTitle className="text-base">Assistant Response</CardTitle>
              <CardDescription>Results stay visible and can be copied or refined immediately.</CardDescription>
            </div>
            <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={handleCopy} disabled={!response}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </CardHeader>
          <CardContent>
            {response ? (
              <ScrollArea className="json-scrollbar max-h-[620px]">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={provider === 'remote' ? 'success' : 'secondary'} className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
                      {provider}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">{mode}</Badge>
                  </div>
                  <pre className="whitespace-pre-wrap rounded-3xl border border-border/70 bg-muted/20 px-4 py-4 text-sm leading-6 text-foreground">{response}</pre>
                </motion.div>
              </ScrollArea>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Run a prompt to populate the response panel.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}