import { NextRequest, NextResponse } from "next/server";
import { cachedBoardingPassExtract } from "@/lib/mocks";

/**
 * Handles boarding pass / ticket / hotel confirmation upload.
 * 
 * Integrates with Landing.AI V2 API (two-step: parse → extract)
 * 1. Parse document to markdown
 * 2. Extract structured fields using JSON schema
 * 
 * API: https://api.ade.landing.ai/v2/parse + /v2/extract
 */
export async function POST(req: NextRequest) {
  const USE_MOCKS = process.env.USE_MOCKS === "true";
  const formData = await req.formData();
  const file = formData.get("document") as File | null;

  if (!file) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  // Mock path: return canned data immediately
  if (USE_MOCKS || !process.env.LANDINGAI_API_KEY) {
    console.log("[extract] Using mock data (USE_MOCKS=true or no API key)");
    return NextResponse.json({
      documentId: "doc_cached_boarding_pass",
      extracted: cachedBoardingPassExtract,
    });
  }

  try {
    const apiKey = process.env.LANDINGAI_API_KEY!;
    const headers = {
      Authorization: `Basic ${apiKey}`,
    };

    // Step 1: Parse document to markdown
    console.log("[extract] Step 1: Parsing document to markdown...");
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const parseForm = new FormData();
    parseForm.append("document", new Blob([fileBuffer], { type: file.type }), file.name);
    parseForm.append("model", "dpt-3-pro-latest");

    const parseResponse = await fetch("https://api.ade.landing.ai/v2/parse", {
      method: "POST",
      headers,
      body: parseForm,
    });

    if (!parseResponse.ok) {
      const errorText = await parseResponse.text();
      console.error(`[extract] Parse failed (${parseResponse.status}):`, errorText);
      throw new Error(`Parse failed: ${parseResponse.status}`);
    }

    const parseData = await parseResponse.json();
    const markdown = parseData.markdown;
    console.log("[extract] Parse successful, markdown length:", markdown?.length || 0);

    // Step 2: Extract structured data using schema
    console.log("[extract] Step 2: Extracting structured data...");
    const schema = {
      type: "object",
      properties: {
        passenger: {
          type: "object",
          properties: {
            firstName: { type: "string" },
            lastName: { type: "string" },
          },
          required: ["firstName", "lastName"],
        },
        pnr: { type: "string", description: "Booking reference or PNR code" },
        segments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              flightNumber: { type: "string" },
              carrier: { type: "string" },
              from: { type: "string", description: "Departure airport code (3 letters)" },
              fromName: { type: "string" },
              to: { type: "string", description: "Arrival airport code (3 letters)" },
              toName: { type: "string" },
              departDate: { type: "string", format: "YYYY-MM-DD" },
              departTime: { type: "string", format: "HH:MM" },
              arriveTime: { type: "string", format: "HH:MM" },
              seat: { type: "string" },
              cabin: { type: "string" },
              status: { type: "string" },
            },
            required: ["flightNumber", "carrier", "from", "to", "departTime", "arriveTime"],
          },
        },
        fareClass: { type: "string" },
      },
      required: ["passenger", "segments"],
    };

    const extractResponse = await fetch("https://api.ade.landing.ai/v2/extract", {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        markdown,
        schema,
        model: "extract-latest",
      }),
    });

    if (!extractResponse.ok) {
      const errorText = await extractResponse.text();
      console.error(`[extract] Extract failed (${extractResponse.status}):`, errorText);
      throw new Error(`Extract failed: ${extractResponse.status}`);
    }

    const extractData = await extractResponse.json();
    console.log("[extract] Extract response:", JSON.stringify(extractData, null, 2));

    // Transform to our format
    const extracted = transformExtractResponse(extractData);

    if (extracted && extracted.segments && extracted.segments.length > 0) {
      console.log("[extract] Successfully extracted trip data");
      return NextResponse.json({
        documentId: `doc_${Date.now()}`,
        extracted,
      });
    } else {
      console.log("[extract] No segments found in extraction");
      return NextResponse.json(
        { error: "Could not extract flight information from this document. Please try a different boarding pass or ticket." },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("[extract] Error:", err);
    return NextResponse.json(
      { error: "Failed to process document. Please try again or upload a different file." },
      { status: 500 }
    );
  }
}

/**
 * Transform Landing.AI V2 extract response to our format
 */
function transformExtractResponse(data: any): any {
  if (!data) return null;

  // V2 extract returns data in "extraction" field
  const extracted = data.extraction || data.data || data;

  console.log("[extract] Extracted data:", JSON.stringify(extracted, null, 2));

  if (extracted.passenger && extracted.segments) {
    return extracted;
  }

  // If it's wrapped differently, try to unwrap
  console.warn("[extract] Could not find passenger/segments in extraction");
  return null;
}
