/** Convert a File to a base64-encoded string. */
export async function fileToBase64(file: File): Promise<string> {
  return Buffer.from(await file.arrayBuffer()).toString("base64");
}

/** Build an Anthropic PDF document content block from a File. */
export async function pdfContentBlock(file: File): Promise<object> {
  const data = await fileToBase64(file);
  return {
    type: "document",
    source: { type: "base64", media_type: "application/pdf", data },
  };
}
