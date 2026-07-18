# Quick Start - TripSherpa with Vocal Bridge AI

## What Changed

Your app now uses **Vocal Bridge's built-in AI agent** instead of Claude. This means:
- ✅ No Anthropic API key needed
- ✅ No `/api/agent` route needed
- ✅ Configure everything in Vocal Bridge dashboard
- ✅ Simpler architecture

## Setup Steps

### 1. Configure Vocal Bridge Agent

Go to https://vocalbridgeai.com/dashboard → Your Agent

**Add System Prompt:**
```
You are TripSherpa, a travel assistant helping stressed travelers with flight disruptions.

You help with: trip info, refunds, rebooking, airport services, vouchers, and navigation.

Keep responses brief and conversational. Be warm and reassuring.
Call tools when you need information - never make up details.
```

**Add Tools** (see `VOCAL_BRIDGE_SETUP.md` for full details):
1. `get_trip_info` - Get booking details
2. `check_refund` - Check refund eligibility  
3. `search_flights` - Find alternative flights
4. `find_airport_service` - Airport WiFi, help desks, etc.
5. `issue_voucher` - Send compensation via PayPal
6. `get_navigation` - Navigate airport (baggage, transport, hotel)

All tools POST to: `https://your-app-url.com/api/tools`

### 2. Test Locally

```bash
npm run dev
```

Open http://localhost:3000

1. **Upload** a boarding pass PDF
2. **Click mic** and try:
   - "What's my booking reference?"
   - "Am I eligible for a refund?"
   - "Find me another flight"
   - "Where's the help desk?"
   - "Send me a meal voucher to my email"
   - "How do I get to ground transportation?"

### 3. Deploy

```bash
vercel --prod
# or
netlify deploy --prod
```

Update tool URLs in Vocal Bridge dashboard to your deployed URL.

## What Each Tool Does

| Tool | What it does | Example use |
|------|--------------|-------------|
| `get_trip_info` | Fetches trip by PNR | "Look up my booking ABC123" |
| `check_refund` | Checks refund eligibility + amount | "Can I get a refund for my cancelled flight?" |
| `process_refund` | Executes the refund (Sabre API) | "Process my refund" |
| `search_flights` | Finds alternative flights (Sabre BFM) | "Find me a flight to Tokyo tomorrow" |
| `find_airport_service` | Locates services (WiFi, desks, charging) | "Where's the airline help desk?" |
| `issue_voucher` | Sends PayPal voucher | "Send me a $50 meal voucher" |
| `get_navigation` | Airport directions | "How do I get a cab?" |

## Demo Flow

1. **Upload document** → Landing.AI extracts trip → Shows on screen
2. **User speaks**: "My flight was cancelled, what can I do?"
3. **Agent thinks**: Calls `check_refund` tool
4. **Tool returns**: $428 refund eligible
5. **Agent speaks**: "You're eligible for a four hundred twenty eight dollar refund. Processing takes five to seven days. Would you like me to help find an alternative flight?"
6. **User**: "Yes, find me another flight"
7. **Agent calls**: `search_flights` tool
8. **Shows options** on screen, speaks them out
9. And so on...

## Troubleshooting

**Mic not working?**
- Check browser permissions
- Try HTTPS (required for mic access)

**Agent not responding?**
- Check Vocal Bridge dashboard logs
- Verify tools are configured correctly

**Tools failing?**
- Check server console: `npm run dev` logs
- Verify `/api/tools` is accessible
- Check tool URL in Vocal Bridge config

**Landing.AI extraction failing?**
- Verify `LANDINGAI_API_KEY` in `.env`
- Check server logs for API errors

## Next Steps

1. ✅ Configure agent in Vocal Bridge dashboard (see `VOCAL_BRIDGE_SETUP.md`)
2. ✅ Test locally with sample boarding pass
3. ✅ Deploy to Vercel/Netlify
4. ✅ Update tool URLs to deployed URL
5. ✅ Test end-to-end with real voice

## Architecture Diagram

```
┌─────────┐
│ User    │ speaks
└────┬────┘
     │
     ▼
┌─────────────────┐
│ Vocal Bridge AI │  (configured in dashboard)
└────┬────────────┘
     │ calls tools
     ▼
┌─────────────────┐
│ /api/tools      │  (your Next.js app)
└────┬────────────┘
     │
     ├──▶ Sabre (flight search, refunds)
     ├──▶ PayPal (vouchers)
     ├──▶ Landing.AI (document extraction)
     └──▶ Airport data (local)
```

Simple, clean, no Claude needed!
