import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function apiError(err: unknown, fallback = "Request failed"): Response {
  console.error(err);
  const message = err instanceof Error ? err.message : fallback;
  return Response.json({ error: message }, { status: 500 });
}
