import { NextResponse } from "next/server";

/**
 * Vocal Bridge session token endpoint.
 *
 * The VB SDK in the browser calls this URL to get a short-lived token, which
 * it then uses to open the WebRTC voice channel. Your VOCAL_BRIDGE_API_KEY
 * NEVER touches the browser — that's the whole point of doing this server-side.
 *
 * The exact request shape depends on your VB dashboard setup — check the
 * `vocal-bridge` PyPI page or docs.vocalbridgeai.com for the current path.
 */
export async function POST() {
  const res = await fetch("https://api.vocalbridgeai.com/v1/session-tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOCAL_BRIDGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agentId: process.env.VOCAL_BRIDGE_AGENT_ID,
      // Optional: pass a participant name so it shows up in your VB dashboard logs.
      participantName: "TripSherpa demo user",
    }),
  });

  if (!res.ok) {
    console.error("VB token issuance failed:", await res.text());
    return NextResponse.json({ error: "token_failed" }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
