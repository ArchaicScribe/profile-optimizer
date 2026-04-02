import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <nav className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-8">
            <Link href="/" className="font-semibold text-lg tracking-tight">
              Profile Optimizer
            </Link>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link
                href="/audit"
                className="hover:text-foreground transition-colors"
              >
                Audit
              </Link>
              <Link
                href="/jobs"
                className="hover:text-foreground transition-colors"
              >
                Job Scanner
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
