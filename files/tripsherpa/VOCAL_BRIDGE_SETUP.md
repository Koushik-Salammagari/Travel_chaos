# Vocal Bridge Agent Setup Guide

This app uses Vocal Bridge's built-in AI agent mode (no Claude API key needed).

## 1. Configure Your Agent in Vocal Bridge Dashboard

Go to https://vocalbridgeai.com/dashboard and select your agent.

### System Prompt

```
You are TripSherpa, a helpful travel assistant for stressed travelers dealing with flight disruptions.

You help with:
- Understanding their trip details
- Checking refund eligibility for cancelled flights
- Searching for alternative flights
- Finding airport services (WiFi, charging, help desks, kids areas)
- Issuing compensation vouchers
- Navigating the airport (baggage claim, ground transport, hotel shuttles)

Keep responses conversational and brief. Speak numbers naturally ("eight fifteen" not "08:15").
Be warm and reassuring - travelers are often stressed with children.

When you need information, call the appropriate tool. Never make up flight numbers or policies.
```

### Enable Custom HTTP API Tools

Add these tools in the Vocal Bridge dashboard:

#### Tool 1: Get Trip Info
- **Name**: `get_trip_info`
- **Description**: Get passenger trip details by PNR/booking reference
- **Method**: POST
- **URL**: `https://your-deployed-url.com/api/tools`
- **Auth**: None (or Bearer token if you add one)
- **Body**:
```json
{
  "tool": "get_trip_info",
  "parameters": {
    "pnr": "{{pnr}}"
  }
}
```
- **Parameters**:
  - `pnr` (string, required): Booking reference number

#### Tool 2: Check Refund
- **Name**: `check_refund`
- **Description**: Check if passenger is eligible for refund and how much
- **Method**: POST
- **URL**: `https://your-deployed-url.com/api/tools`
- **Body**:
```json
{
  "tool": "check_refund",
  "parameters": {
    "pnr": "{{pnr}}",
    "flightNumber": "{{flightNumber}}"
  }
}
```
- **Parameters**:
  - `pnr` (string, required): Booking reference
  - `flightNumber` (string, required): Flight number that was cancelled

#### Tool 3: Process Refund
- **Name**: `process_refund`
- **Description**: Execute the refund after checking eligibility
- **Method**: POST
- **URL**: `https://your-deployed-url.com/api/tools`
- **Body**:
```json
{
  "tool": "process_refund",
  "parameters": {
    "pnr": "{{pnr}}",
    "flightNumber": "{{flightNumber}}",
    "amount": {{amount}}
  }
}
```
- **Parameters**:
  - `pnr` (string, required): Booking reference
  - `flightNumber` (string, required): Flight number
  - `amount` (number, required): Refund amount in USD

#### Tool 4: Search Flights
- **Name**: `search_flights`
- **Description**: Search for alternative flight options
- **Method**: POST
- **URL**: `https://your-deployed-url.com/api/tools`
- **Body**:
```json
{
  "tool": "search_flights",
  "parameters": {
    "origin": "{{origin}}",
    "destination": "{{destination}}",
    "date": "{{date}}",
    "passengers": {{passengers}}
  }
}
```
- **Parameters**:
  - `origin` (string, required): Airport code (e.g., "SFO")
  - `destination` (string, required): Airport code (e.g., "NRT")
  - `date` (string, required): YYYY-MM-DD format
  - `passengers` (number, required): Number of passengers

#### Tool 4: Find Airport Service
- **Name**: `find_airport_service`
- **Description**: Get location and details for airport services
- **Method**: POST
- **URL**: `https://your-deployed-url.com/api/tools`
- **Body**:
```json
{
  "tool": "find_airport_service",
  "parameters": {
    "serviceType": "{{serviceType}}"
  }
}
```
- **Parameters**:
  - `serviceType` (string, required): One of: wifi, supportBooth, chargingStation, kidsPlayZone, cabPickup, hotelShuttle

#### Tool 5: Issue Voucher
- **Name**: `issue_voucher`
- **Description**: Issue compensation voucher via PayPal
- **Method**: POST
- **URL**: `https://your-deployed-url.com/api/tools`
- **Body**:
```json
{
  "tool": "issue_voucher",
  "parameters": {
    "amountUSD": {{amount}},
    "purpose": "{{purpose}}",
    "recipientEmail": "{{email}}"
  }
}
```
- **Parameters**:
  - `amountUSD` (number, required): Dollar amount
  - `purpose` (string, required): meal, hotel, or transport
  - `recipientEmail` (string, required): Recipient's email

#### Tool 6: Get Navigation
- **Name**: `get_navigation`
- **Description**: Get step-by-step navigation within airport
- **Method**: POST
- **URL**: `https://your-deployed-url.com/api/tools`
- **Body**:
```json
{
  "tool": "get_navigation",
  "parameters": {
    "destination": "{{destination}}",
    "currentLocation": "{{currentLocation}}"
  }
}
```
- **Parameters**:
  - `destination` (string, required): One of: baggage_claim, ground_transport, hotel_with_voucher
  - `currentLocation` (string, optional): Where the traveler is now

## 2. Test Locally

Before deploying, test locally:

```bash
npm run dev
```

Open http://localhost:3000 and:
1. Upload a boarding pass (the Landing.AI extraction will work)
2. Click the mic and try:
   - "What's my booking reference?"
   - "Check if I can get a refund"
   - "Find me alternative flights"
   - "Where's the airline help desk?"
   - "Issue me a meal voucher"
   - "How do I get to ground transportation?"

## 3. Deploy

Deploy to Vercel, Netlify, or any hosting platform:

```bash
# Example: Vercel
vercel --prod
```

Then update the tool URLs in Vocal Bridge dashboard to point to your deployed URL.

## 4. Test End-to-End

1. Go to your deployed app
2. Upload a boarding pass
3. Click mic and speak naturally
4. The Vocal Bridge agent will:
   - Understand your intent
   - Call the appropriate tools
   - Speak the results back to you

## Troubleshooting

- **"Agent not responding"**: Check Vocal Bridge dashboard logs
- **"Tool calls failing"**: Check your server logs (`vercel logs` or `netlify logs`)
- **"Landing.AI extraction failing"**: Verify LANDINGAI_API_KEY in environment variables
- **"No audio"**: Check browser microphone permissions

## Architecture

```
User speaks → Vocal Bridge Agent (configured in dashboard)
           ↓
    Decides to call tool
           ↓
    POST /api/tools with tool name + parameters
           ↓
    Your server processes and returns data
           ↓
    Vocal Bridge agent speaks response
```

No Claude API needed! Everything runs through Vocal Bridge's AI.
