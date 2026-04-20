import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';

import { SiteHeader } from '@/components/site-header';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const interSans = Inter({ variable: '--font-sans', subsets: ['latin'] });
const robotoMono = Roboto_Mono({ variable: '--font-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JsonLab',
  description: 'A polished JSON workbench for inspection, validation, diffing, and model generation.',
  metadataBase: new URL('http://localhost:3000')
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${interSans.variable} ${robotoMono.variable} min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="min-h-screen">
            <SiteHeader />
            <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}