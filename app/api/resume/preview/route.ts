import { NextRequest } from "next/server";

export const runtime = "nodejs";

// POST /api/resume/preview
// Converts a DOCX file to HTML for in-browser preview.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file?.name.endsWith(".docx")) {
      return Response.json({ error: "DOCX only" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const mammoth = await import("mammoth");
    const { value: html } = await mammoth.convertToHtml({ buffer });
    return Response.json({ html });
  } catch {
    return Response.json({ error: "Preview failed" }, { status: 500 });
  }
}
