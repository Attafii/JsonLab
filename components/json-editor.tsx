'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center rounded-3xl border border-border bg-background/70">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading editor...
      </div>
    </div>
  )
});

interface JsonEditorProps {
  label?: string;
  helperText?: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: number | string;
  language?: string;
  error?: string | null;
  className?: string;
  compact?: boolean;
}

export function JsonEditor({
  label,
  helperText,
  value,
  onChange,
  readOnly = false,
  height = 420,
  language = 'json',
  error,
  className,
  compact = false
}: JsonEditorProps) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === 'dark' ? 'vs-dark' : 'vs';

  return (
    <div className={cn('overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft', className)}>
      {(label || helperText) && (
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4 sm:px-6">
          <div>
            {label ? <h3 className="text-sm font-semibold tracking-tight sm:text-base">{label}</h3> : null}
            {helperText ? <p className="mt-1 text-xs text-muted-foreground">{helperText}</p> : null}
          </div>
          <Badge variant={error ? 'destructive' : 'secondary'} className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.22em]">
            {error ? 'Error' : readOnly ? 'Read only' : 'Live'}
          </Badge>
        </div>
      )}

      <div className={cn('relative', compact ? 'min-h-[260px]' : 'min-h-[360px]')} style={{ height }}>
        <MonacoEditor
          language={language}
          value={value}
          theme={theme}
          options={{
            readOnly,
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            renderLineHighlight: 'all',
            automaticLayout: true,
            fontSize: 14,
            fontFamily: 'var(--font-mono)',
            wordWrap: 'on',
            smoothScrolling: true,
            tabSize: 2,
            roundedSelection: true,
            padding: { top: 16, bottom: 16 },
            overviewRulerBorder: false,
            guides: { indentation: true }
          }}
          onChange={(nextValue) => onChange?.(nextValue ?? '')}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme('jsonlab-dark', {
              base: 'vs-dark',
              inherit: true,
              rules: [],
              colors: {
                'editor.background': '#0f172a',
                'editorLineNumber.foreground': '#64748b'
              }
            });
          }}
          className="h-full"
          loading={<EditorLoading />}
        />
      </div>

      {error ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border-t border-destructive/20 bg-destructive/10 px-5 py-3 text-sm text-destructive sm:px-6">
          {error}
        </motion.div>
      ) : null}
    </div>
  );
}

function EditorLoading() {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center rounded-3xl border border-border bg-background/70">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading Monaco...
      </div>
    </div>
  );
}