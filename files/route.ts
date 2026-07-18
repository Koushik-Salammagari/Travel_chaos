import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { TOOL_SCHEMAS, runTool } from "@/lib/tools";

/**
 * Voice query comes in from Vocal Bridge's onQuery callback:
 *   POST /api/agent  { query: string, itineraryState?: any }
 *
 * We run Claude in a tool-use loop. Every tool result may include a `uiUpdate`
 * that we ship back to the client so the itinerary/voucher/service cards mutate
 * on screen. The final `text` becomes what Vocal Bridge speaks out loud.
 */
export async function POST(req: NextRequest) {
  const { query, itineraryState } = await req.json();
  const client = new Anthropic();

  // Give Claude the current itinerary state so it can reason about "our flight"
  // and "the kids" without having to re-extract every turn.
  const userTurn = {
    role: "user" as const,
    content: itineraryState
      ? `Current trip context:\n${JSON.stringify(itineraryState, null, 2)}\n\nTraveler said: "${query}"`
      : `Traveler said: "${query}"`,
  };

  const messages: Anthropic.MessageParam[] = [userTurn];
  const uiUpdates: unknown[] = [];

  // Tool-use loop, max 6 iterations (defense in depth against runaway loops).
  for (let i = 0; i < 6; i++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOL_SCHEMAS as Anthropic.Tool[],
      messages,
    });

    if (response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join(" ")
        .trim();
      return NextResponse.json({ text, uiUpdates });
    }

    if (response.stop_reason !== "tool_use") {
      // Unexpected — bail with whatever text we have.
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join(" ")
        .trim();
      return NextResponse.json({ text: text || "One second.", uiUpdates });
    }

    // Run every tool_use block in this response.
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const result = await runTool(block.name, block.input as Record<string, unknown>);
      if (result.uiUpdate) uiUpdates.push(result.uiUpdate);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result.data),
        is_error: !result.ok,
      });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  return NextResponse.json({
    text: "Hmm, I'm having trouble finishing that up. Let me try again.",
    uiUpdates,
  });
}
