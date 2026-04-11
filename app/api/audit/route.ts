import { NextRequest } from "next/server";
import { AuditProfileUseCase } from "../../../application/AuditProfileUseCase";
import { sseStream } from "../../../lib/sseStream";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/audit
// Accepts multipart form data with:
//   - file:    LinkedIn export ZIP (optional)
//   - url:     Personal site URL to audit (optional, used standalone or alongside export)
//   - siteUrl: Personal site URL to include alongside an export audit
// Returns: text/event-stream — streaming Claude analysis
export async function POST(req: NextRequest) {
  try {
    const useCase = new AuditProfileUseCase();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;
    const siteUrl = formData.get("siteUrl") as string | null;

    if (!file && !url) {
      return Response.json(
        { error: "Provide a LinkedIn export ZIP or a URL to audit" },
        { status: 400 },
      );
    }

    const generator = file
      ? useCase.auditFromExport(Buffer.from(await file.arrayBuffer()), siteUrl ?? undefined)
      : useCase.auditFromUrl(url!);

    return sseStream(generator);
  } catch (err) {
    console.error("[/api/audit]", err);
    const message = err instanceof Error ? err.message : "Invalid request";
    return Response.json({ error: message }, { status: 400 });
  }
}
