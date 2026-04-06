"use client";

import { useState } from "react";
import { Copy, CheckCheck } from "lucide-react";

interface CopyButtonProps {
  text: string;
  /** compact=true renders icon-only, compact=false (default) shows "Copy" label */
  compact?: boolean;
}

export function CopyButton({ text, compact = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <button
        onClick={handleCopy}
        className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
        title="Copy"
      >
        {copied ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shrink-0"
    >
      {copied ? (
        <>
          <CheckCheck size={13} className="text-green-500" />
          Copied
        </>
      ) : (
        <>
          <Copy size={13} />
          Copy
        </>
      )}
    </button>
  );
}
