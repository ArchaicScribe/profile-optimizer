import { NextRequest } from "next/server";
import { AuditProfileUseCase } from "../../../application/AuditProfileUseCase";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/audit
// Accepts multipart form data with:
//   - file: LinkedIn export ZIP (optional)
//   - url:  Personal site URL to audit (optional, used standalone or alongside export)
//   - siteUrl: Personal site URL to include alongside an export audit
// Returns: text/event-stream - streaming Claude analysis
export async function POST(req: NextRequest) {
  try {
    const useCase = new AuditProfileUseCase();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;
    const siteUrl = formData.get("siteUrl") as string | null;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let generator: AsyncGenerator<string>;

          if (file) {
            const buffer = Buffer.from(await file.arrayBuffer());
            generator = useCase.auditFromExport(buffer, siteUrl ?? undefined);
          } else if (url) {
            generator = useCase.auditFromUrl(url);
          } else {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "Provide a LinkedIn export ZIP or a URL to audit" })}\n\n`
              )
            );
            controller.close();
            return;
          }

          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Audit failed";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
