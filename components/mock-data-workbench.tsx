'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sparkles, WandSparkles } from 'lucide-react';

import { JsonEditor } from '@/components/json-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { generateMockJsonCollection, generateMockJsonText } from '@/lib/mock-data';

const defaultTemplate = `{
  "id": "user-1",
  "name": "Avery Carter",
  "email": "avery@example.com",
  "status": "active",
  "profile": {
    "role": "Frontend Engineer",
    "city": "Portland"
  },
  "tags": ["json", "dashboard", "design"]
}`;

export function MockDataWorkbench() {
  const [template, setTemplate] = useState(defaultTemplate);
  const [prompt, setPrompt] = useState('Create polished mock records for a modern product dashboard.');
  const [useAi, setUseAi] = useState(true);
  const [count, setCount] = useState(3);
  const [result, setResult] = useState(() => generateMockJsonText(defaultTemplate));
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<'local' | 'remote'>('local');
  const [error, setError] = useState<string | null>(null);

  const recordLabel = useMemo(() => `${count} record${count === 1 ? '' : 's'}`, [count]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!useAi) {
        const payload = JSON.parse(template) as unknown;
        const generated = count > 1 ? generateMockJsonCollection(payload as never, count) : JSON.parse(generateMockJsonText(template));
        setResult(JSON.stringify(generated, null, 2));
        setProvider('local');
        return;
      }

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: 'mock-data',
          template,
          prompt,
          count
        })
      });

      const payload = (await response.json()) as { response?: string; provider?: 'local' | 'remote'; error?: string };
      setResult(payload.response ?? '');
      setProvider(payload.provider ?? 'local');
      if (payload.error) {
        setError(payload.error);
      }
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
    } catch {
      // Copy is optional.
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel relative overflow-hidden rounded-[2rem] p-6 shadow-soft">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_30%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-muted-foreground">
              <WandSparkles className="h-4 w-4 text-primary" />
              Mock data generator
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Shape realistic JSON examples from a template, with or without AI.</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Deterministic generation keeps demos and tests stable, while the AI path can embellish the content when you need richer sample data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={provider === 'remote' ? 'success' : 'secondary'} className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
              {provider}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
              {recordLabel}
            </Badge>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <Card className="border-border/70 bg-card/95 shadow-soft">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Generator Settings</CardTitle>
                <CardDescription>Switch between local generation and the AI-backed workflow.</CardDescription>
              </div>
              <div className="flex items-center gap-3 rounded-full border border-border/70 bg-muted/20 px-4 py-2">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AI</span>
                <Switch checked={useAi} onCheckedChange={setUseAi} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Prompt</p>
              <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-[120px] rounded-3xl border-border/70 bg-muted/15" />
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Count</p>
                <Input type="number" min={1} max={20} value={count} onChange={(event) => setCount(Number(event.target.value) || 1)} className="rounded-2xl" />
              </div>
              <Button type="button" onClick={handleGenerate} className="mt-auto rounded-full shadow-glow" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate
              </Button>
            </div>

            <div className="rounded-3xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              Paste a valid JSON template, set the record count, and use the switch to choose between deterministic and AI-assisted generation.
            </div>

            {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-soft">
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div>
              <CardTitle className="text-base">Template and Output</CardTitle>
              <CardDescription>The generated JSON stays syntax highlighted and ready to copy or download.</CardDescription>
            </div>
            <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={handleCopy} disabled={!result}>
              Copy
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <JsonEditor
              label="Template"
              helperText="The template defines the shape of the generated records."
              value={template}
              onChange={(value) => setTemplate(value)}
              error={null}
              height={300}
              compact
            />

            <JsonEditor label="Generated JSON" helperText="The output updates after each generation run." value={result} readOnly height={420} compact />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}