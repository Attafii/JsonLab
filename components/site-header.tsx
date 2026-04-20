'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Code2, Cpu, Sparkles, WandSparkles } from 'lucide-react';

import { GithubStarsButton } from '@/components/github-stars-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const navigation = [
  { href: '/', label: 'Workspace', icon: Code2 },
  { href: '/ai', label: 'AI Assistant', icon: Sparkles },
  { href: '/mock-data', label: 'Mock Data', icon: WandSparkles }
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500 text-white shadow-glow"
          >
            <Cpu className="h-5 w-5" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">JsonLab</h1>
            </div>
            <p className="text-xs text-muted-foreground">A focused JSON workbench with validation, diffing, and generators.</p>
          </div>
        </div>

        <nav className="hidden items-center gap-2 lg:flex">
          {navigation.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Button
                key={item.href}
                asChild
                variant={active ? 'default' : 'ghost'}
                className={cn('h-10 rounded-full px-4 transition duration-200 hover:-translate-y-0.5', active && 'shadow-glow')}
              >
                <Link href={item.href}>
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <GithubStarsButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}