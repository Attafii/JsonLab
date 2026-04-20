'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Github, Loader2, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const repoUrl = 'https://github.com/Attafii/JsonLab';

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

export function GithubStarsButton() {
  const [stars, setStars] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStars() {
      try {
        const response = await fetch('/api/github-stars', { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Failed to load GitHub stars.');
        }

        const payload = (await response.json()) as { stars?: number | null };
        setStars(typeof payload.stars === 'number' ? payload.stars : null);
      } catch {
        setStars(null);
      } finally {
        setLoading(false);
      }
    }

    loadStars();

    return () => controller.abort();
  }, []);

  const starLabel = loading ? 'Stars' : stars === null ? 'Repo' : formatCompactNumber(stars);

  return (
    <Button
      asChild
      variant="secondary"
      className="h-10 rounded-full border border-border/80 bg-background/80 px-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-glow"
    >
      <Link
        href={repoUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Open the JsonLab GitHub repository"
        title="Open the JsonLab GitHub repository"
      >
        <Github className="h-4 w-4" />
        <span className="hidden sm:inline">GitHub</span>
        <span className="hidden sm:inline text-muted-foreground">·</span>
        <span className={cn('inline-flex items-center gap-1 font-medium', loading && 'text-muted-foreground')}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5 text-warning" />}
          {starLabel}
        </span>
      </Link>
    </Button>
  );
}