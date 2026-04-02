// Exposes safe, non-sensitive configuration to the client.
// Env vars are read here server-side so nothing sensitive leaks to the browser.
export async function GET() {
  return Response.json({
    linkedinEnabled: process.env.ENABLE_LINKEDIN_SCRAPER === "true",
  });
}
