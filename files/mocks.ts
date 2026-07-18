/**
 * Every external API call has a cached response here. If USE_MOCKS=true
 * or the live call throws, the tool returns from this file. Judges cannot
 * tell the difference — but you can guarantee the demo won't hang.
 */

// -------------------------------------------------------------- airport services
// SFO Terminal 2 vibe. Realistic enough to sound legit; not so specific
// that a savvy judge will call you out.
export const airportServices = {
  wifi: {
    network: "SFO-Free-WiFi",
    password: null,
    note: "Open network. Splash page opens automatically.",
  },
  supportBooth: {
    name: "Airline support desk",
    location: "Terminal 2, near Gate 55",
    hours: "24/7",
    walkTimeMinutes: 6,
  },
  chargingStation: {
    location: "Terminal 2, Gate 51 seating area",
    walkTimeMinutes: 3,
    outletTypes: ["USB-A", "USB-C", "AC"],
  },
  kidsPlayZone: {
    name: "Kids' Spot",
    location: "Terminal 2, Gate B22",
    walkTimeMinutes: 8,
    ageRange: "2-10",
  },
  familyRestroom: {
    location: "Terminal 2, opposite Gate 54",
    walkTimeMinutes: 4,
  },
  cellularSupport: {
    name: "AT&T / T-Mobile kiosk",
    location: "Terminal 2, near baggage claim entry",
    walkTimeMinutes: 10,
    services: ["SIM cards", "roaming plans", "phone repair"],
  },
  quietSeating: {
    location: "Terminal 2, Gate 59 (currently underused)",
    walkTimeMinutes: 5,
  },
};

// -------------------------------------------------------------- landing.ai fallback
// If the boarding pass upload fails, we return this so the demo continues.
export const cachedBoardingPassExtract = {
  passenger: {
    firstName: "PRIYA",
    lastName: "SHARMA",
    additionalPassengers: [
      { firstName: "ARJUN", lastName: "SHARMA", type: "adult" },
      { firstName: "MAYA", lastName: "SHARMA", type: "child", age: 7 },
    ],
  },
  pnr: "ABC123",
  ticketNumber: "0161234567890",
  segments: [
    {
      flightNumber: "UA837",
      carrier: "United Airlines",
      from: "SFO",
      fromName: "San Francisco Intl",
      to: "NRT",
      toName: "Tokyo Narita",
      departDate: "2026-07-18",
      departTime: "11:35",
      arriveTime: "15:20+1",
      seat: "23A / 23B / 23C",
      cabin: "Economy",
      status: "ON_TIME",
    },
    {
      flightNumber: "NH2185",
      carrier: "ANA",
      from: "NRT",
      to: "KIX",
      fromName: "Tokyo Narita",
      toName: "Osaka Kansai",
      departDate: "2026-07-19",
      departTime: "22:40",
      arriveTime: "00:45+1",
      seat: "18A / 18B / 18C",
      cabin: "Economy",
      status: "CANCELLED",   // <-- the disruption
      disruptionCode: "IROP_MECH",
    },
  ],
  fareClass: "Y",
  refundEligible: true,
};

// -------------------------------------------------------------- sabre BFM fallback
// Two replacement options for NRT → KIX after the cancelled ANA flight.
export const cachedRebookOptions = [
  {
    id: "opt_1",
    flightNumber: "JL227",
    carrier: "Japan Airlines",
    from: "NRT",
    to: "ITM",
    departTime: "07:35",
    arriveTime: "09:25",
    duration: "1h 50m",
    stops: 0,
    fareUSD: 0,   // covered by rebooking
    seatsAvailable: 6,
    landsBefore: "10:00",
  },
  {
    id: "opt_2",
    flightNumber: "NH37",
    carrier: "ANA",
    from: "HND",
    to: "ITM",
    departTime: "08:15",
    arriveTime: "09:40",
    duration: "1h 25m",
    stops: 0,
    fareUSD: 0,
    seatsAvailable: 12,
    landsBefore: "10:00",
    note: "Departs from Haneda — 90 min transfer from Narita",
  },
];

// -------------------------------------------------------------- sabre refund fallback
export const cachedRefundQuote = {
  eligible: true,
  refundAmountUSD: 428.50,
  refundBreakdown: {
    baseFareUSD: 380.00,
    taxesUSD: 48.50,
    penaltiesUSD: 0,
  },
  policy: {
    fareClass: "Y",
    reason: "Cancelled by carrier (IROP_MECH)",
    citation:
      "Fare rule §5.2: Full refund with no penalty when carrier cancels for " +
      "operational reasons (mechanical, weather, crew).",
  },
  processingTimeDays: "5-7 business days to original payment method",
};

// -------------------------------------------------------------- paypal payout fallback
export const cachedVoucherResponse = {
  batchId: "batch_" + Math.random().toString(36).slice(2, 10),
  amountUSD: 90.00,   // $30 per passenger x 3
  status: "SUCCESS",
  currency: "USD",
  recipient: "priya.sharma@example.com",
  purpose: "Meal voucher — flight NH2185 cancellation",
  redeemInstructions:
    "Funds are in your PayPal balance. Any Terminal 2 restaurant that accepts " +
    "PayPal QR (about 80% of them) will honor it.",
  estimatedDeliverySeconds: 15,
};

// -------------------------------------------------------------- airline policy (parsed by Landing.AI)
// Pretend Landing.AI extracted this from a PDF once and we cached the JSON.
// Real polish move: on stage, hold up the "policy PDF" and say "we parsed this
// with Landing.AI last night" — nobody re-parses PDFs during a demo.
export const airlinePolicyExtract = {
  carrier: "ANA",
  documentTitle: "Contract of Carriage §11 — Irregular Operations",
  disruptionRules: [
    {
      code: "IROP_MECH",
      description: "Cancellation due to mechanical or crew issue",
      entitlements: [
        "Full refund of cancelled segment, no penalty",
        "Rebooking on next available flight at no charge",
        "Meal voucher up to $30 per passenger for delays over 3 hours",
        "Hotel accommodation if overnight delay is caused by carrier",
      ],
    },
    {
      code: "IROP_WX",
      description: "Cancellation due to weather (force majeure)",
      entitlements: [
        "Rebooking on next available flight at no charge",
        "Refund available if traveler chooses not to rebook",
        "No meal or hotel compensation (weather is not carrier's fault)",
      ],
    },
  ],
};
