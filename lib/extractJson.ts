/**
 * Parse JSON, returning the original value on failure instead of throwing.
 * Useful for DB fields stored as JSON strings where the value might be raw text.
 */
export function tryParseJson<T = unknown>(value: string | null | undefined): T | string | null {
  if (value == null || value === "") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
}

/**
 * Extract and parse the first JSON object from an LLM response string.
 *
 * Handles:
 * - Responses wrapped in ```json ... ``` code fences
 * - Responses with leading/trailing prose before/after the JSON object
 * - Plain JSON strings
 *
 * Throws if no valid JSON object is found.
 */
export function extractJson<T = Record<string, unknown>>(text: string): T {
  // Strip markdown code fences
  const stripped = text
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  // Try direct parse first (response is already clean JSON)
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // Fall back to extracting the outermost {...} block
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in response");
    return JSON.parse(match[0]) as T;
  }
}
