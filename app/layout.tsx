import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLinks } from "@/components/NavLinks";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Profile Optimizer",
  description: "AI-powered LinkedIn profile auditor and job scanner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <header className="sticky top-0 z-50 border-b border-border/60 backdrop-blur-md bg-background/80">
            <nav className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-6">
              <Link
                href="/"
                className="font-bold text-base tracking-tight flex items-center gap-2 shrink-0"
              >
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[oklch(0.6_0.2_280/15%)] border border-[oklch(0.6_0.2_280/30%)] text-[oklch(0.7_0.18_280)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </span>
                <span className="gradient-text">Profile Optimizer</span>
              </Link>

              <NavLinks />

              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </nav>
          </header>

          <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
