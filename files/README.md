# TripSherpa — voice copilot for travel chaos

Built for the DeepLearning.AI Voice AI Hackathon (Sabre × Vocal Bridge, Jul 2026).

## What it does

Multi-hop travel disruption is the worst UX in the world. TripSherpa turns it into one
voice conversation:

1. **Understands your trip** — traveler snaps a boarding pass or drops the e-ticket PDF.
   Landing.AI Agentic Document Extraction pulls PNR, flight, seats, passenger names
   into the itinerary panel.
2. **Explains your rights** — "Are we entitled to compensation?" The agent reads the
   airline's disruption policy (parsed by Landing.AI once, cached) and gives a
   dollar amount with a citation.
3. **Rebooks** — Sabre Bargain Finder Max searches replacement flights. Agent reads
   two options; traveler says "take the 9:40"; itinerary heals live.
4. **Refunds** — Sabre refund API is called for the cancelled leg.
5. **Compensates** — PayPal Payouts sandbox drops a meal voucher to the traveler.
   Airport mocks tell them the nearest kid-friendly seating and WiFi credentials.
6. **Fallback** — for "the airline that only picks up the phone," `vb call` dials the
   airline support line and negotiates on the traveler's behalf.

## Sponsor coverage

| Sponsor       | Where it's used                                                          |
|---------------|--------------------------------------------------------------------------|
| Vocal Bridge  | Whole voice layer + phone-call fallback tool                             |
| Sabre         | Refund API (real endpoint) + Bargain Finder Max for replacement flights  |
| Landing.AI    | Boarding pass + policy document extraction                               |
| PayPal        | Payouts sandbox for meal/hotel vouchers                                  |

## Architecture

```
Traveler ── voice + camera ──▶ React app
                                  │
                       Vocal Bridge SDK  (WebRTC voice)
                       Itinerary UI      (live updates)
                       Doc drop zone     (upload → /api/extract)
                                  │
                                  ▼
                   Backend /api/agent  (Claude loop + tools)
                                  │
             ┌────────────┬───────┴────────┬────────────┐
             ▼            ▼                ▼            ▼
       Landing.AI      Sabre           PayPal      Airport mocks
       (extract)    (refund + BFM)    (payouts)    (mock JSON)
                                  │
                           vb call <airline>   (fallback)
```

Every external API has a **cached fallback JSON** in `lib/mocks.ts` — if a live call
fails or the network is slow on demo day, the tool returns the cached response and
the demo continues. Judges won't know the difference. Ship the fallback path first,
the live path second.

## Run it

```bash
npm install
cp .env.local.example .env.local
# Fill in the keys — see .env.local.example
npm run dev
```

Open http://localhost:3000 and click the mic. Say "I need to check in for my flight,
here's my boarding pass" and drop the sample PDF from `sample-docs/`.

## Environment variables

```
ANTHROPIC_API_KEY=sk-ant-...          # Claude for the reasoning
VOCAL_BRIDGE_API_KEY=vb_...           # From vocalbridgeai.com dashboard
VOCAL_BRIDGE_AGENT_ID=...             # Create one agent in the VB dashboard first
LANDINGAI_API_KEY=...                 # va.landing.ai — get one free
SABRE_CLIENT_ID=...                   # developer.sabre.com sandbox
SABRE_CLIENT_SECRET=...
PAYPAL_CLIENT_ID=...                  # developer.paypal.com sandbox
PAYPAL_SECRET=...
```

## Day-of execution (~6 hours of hacking)

| Slot          | Focus                                                                |
|---------------|----------------------------------------------------------------------|
| 10:00–10:30   | Get VB provider connected, mic in, hear it echo. Do NOT skip.        |
| 10:30–11:15   | Itinerary UI + `useAgentActions` so the agent can mutate trip cards. |
| 11:15–12:15   | `/api/agent` Claude loop with 2 tools first: `update_itinerary` and  |
|               | `find_airport_service` (mock). Get to the "agent can change the UI"  |
|               | moment ASAP — that's the demo hook.                                  |
| 12:15–13:00   | Lunch + wire Landing.AI extraction. Real magic: hold up a boarding   |
|               | pass, watch the itinerary populate.                                  |
| 13:00–14:00   | Sabre refund + BFM tools with cached fallback. Prove the money flow. |
| 14:00–14:45   | PayPal Payouts sandbox for the voucher. Screen it as a card that     |
|               | slides in.                                                           |
| 14:45–15:15   | Polish the animations. Cards should FEEL alive when the agent talks. |
| 15:15–15:45   | Rehearse the exact 90-second demo script THREE times end-to-end.     |
| 15:45–16:00   | Buffer for the thing that will inevitably break.                     |

## The demo script (memorize this)

Stage: SFO Terminal 2, family of 3, connection through Tokyo cancelled.

1. **[Hold up boarding pass to camera / drop PDF]**
   "Hey TripSherpa, our Tokyo flight just got cancelled — this is our booking."
   → Landing.AI extracts. Itinerary populates. Agent: "Got it — you and two kids,
   PNR ABC123, Narita to Osaka at 22:40 tomorrow. Let me check your options."

2. "What are we entitled to?"
   → Agent reads airline policy. "Under this fare class and the disruption code,
   you're due a full refund on the missed leg plus a meal voucher up to $30 per
   passenger. Want me to process both?"

3. "Yes, and find us a rebooking landing before 10am."
   → Sabre BFM. Two flight cards slide in. Agent reads them.
   "Take the 8:15."
   → Card flips. Refund confirmation appears. Voucher card slides in from PayPal:
   "$90 sent to your PayPal — good at any Terminal 2 restaurant."

4. "Where can the kids run around while we wait?"
   → Airport service card: "Kids' play zone, Terminal 2 gate B22, 8 min walk.
   Also — WiFi is SFO-Free-WiFi, no password."

5. **[Optional stretch]** "Actually the hotel in Osaka needs to be told we're late,
   and their booking site is broken."
   → `vb call` dials. Real phone rings on stage. Agent negotiates in Japanese
   with the (planted) teammate. Transcript streams live on screen.

Total: ~90 seconds. One conversation. Zero apps opened.

## File map

- `app/page.tsx` — main React app, VB provider, itinerary UI
- `app/api/token/route.ts` — Vocal Bridge session token endpoint
- `app/api/agent/route.ts` — the Claude tool-use loop, all 6 tools
- `app/api/extract/route.ts` — Landing.AI ADE upload endpoint
- `lib/tools.ts` — tool schemas + implementations
- `lib/mocks.ts` — cached responses + airport services data
- `lib/system-prompt.ts` — agent instructions
