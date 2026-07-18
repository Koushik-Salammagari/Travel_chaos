import { NextRequest, NextResponse } from "next/server";
import { cachedBoardingPassExtract } from "@/lib/mocks";

/**
 * Handles boarding pass / ticket / hotel confirmation upload.
 * The frontend calls this immediately when the user drops a file, then the
 * agent's next voice turn triggers `extract_travel_document` with the returned
 * documentId (in this simplified version we just return the parsed JSON inline).
 *
 * Live path: multipart POST to Landing.AI ADE
 *   https://api.va.landing.ai/v1/tools/agentic-document-analysis
 * See docs.landing.ai/ade for schema-driven extraction.
 */
export async function POST(req: NextRequest) {
  const USE_MOCKS = process.env.USE_MOCKS === "true";
  const formData = await req.formData();
  const file = formData.get("document") as File | null;

  if (!file) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  if (USE_MOCKS || !process.env.LANDINGAI_API_KEY) {
    // Return canned extraction so the demo works without the network.
    return NextResponse.json({
      documentId: "doc_cached_boarding_pass",
      extracted: cachedBoardingPassExtract,
    });
  }

  try {
    const ladeForm = new FormData();
    ladeForm.append("pdf", file);   // or "image" if it's a JPG/PNG

    const res = await fetch(
      "https://api.va.landing.ai/v1/tools/agentic-document-analysis",
      {
        method: "POST",
        headers: {
          // Landing.AI uses Basic auth with the key as the username.
          Authorization: `Basic ${Buffer.from(process.env.LANDINGAI_API_KEY + ":").toString("base64")}`,
        },
        body: ladeForm,
      }
    );

    if (!res.ok) throw new Error(`Landing.AI extract failed: ${res.status}`);
    const raw = await res.json();

    // TODO: transform `raw` (Landing.AI's chunk hierarchy) into the shape the
    // UI expects — see cachedBoardingPassExtract for the target. On hack day,
    // do this by defining a Pydantic-like JSON schema and using ADE's
    // schema-driven extraction endpoint (much cleaner than post-processing).
    return NextResponse.json({
      documentId: `doc_${Date.now()}`,
      extracted: raw,
    });
  } catch (err) {
    console.error("[extract] falling back:", err);
    return NextResponse.json({
      documentId: "doc_cached_boarding_pass",
      extracted: cachedBoardingPassExtract,
    });
  }
}
