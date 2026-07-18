import { NextRequest, NextResponse } from "next/server";

/**
 * Vocal Bridge session token endpoint.
 *
 * The VB SDK calls this from the browser to get a short-lived LiveKit token.
 * Your VOCAL_BRIDGE_API_KEY never touches the browser.
 *
 * Docs: https://vocalbridgeai.com — Authentication section
 * - Agent-scoped keys work without X-Agent-Id header
 * - Auth via X-API-Key header
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch("https://vocalbridgeai.com/api/v1/token", {
      method: "POST",
      headers: {
        "X-API-Key": process.env.VOCAL_BRIDGE_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        participant_name: body.participant_name || "TripSherpa traveler",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("VB token issuance failed:", response.status, errorText);
      return NextResponse.json({ error: "token_failed" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("VB token route error:", error);
    return NextResponse.json({ error: "token_failed" }, { status: 500 });
  }
}
