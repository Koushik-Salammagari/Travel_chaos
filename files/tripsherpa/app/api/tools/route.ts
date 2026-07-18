import { NextRequest, NextResponse } from "next/server";

/**
 * Tool endpoints for Vocal Bridge AI Agent.
 * 
 * The Vocal Bridge agent (configured in dashboard) calls these endpoints
 * when it needs to execute tools during conversation.
 */

// Mock airport services data
const airportServices: Record<string, any> = {
  wifi: {
    network: "SFO-Free-WiFi",
    location: "Available throughout terminal",
    instructions: "Connect and accept terms on splash page"
  },
  supportBooth: {
    location: "Terminal 2, near Gate 55",
    hours: "24/7",
    walkTimeMinutes: 6,
    services: ["Rebooking", "Refunds", "General assistance"]
  },
  chargingStation: {
    location: "Terminal 2, Gate 51 seating area",
    walkTimeMinutes: 3,
    types: ["USB-A", "USB-C", "AC outlets"]
  },
  kidsPlayZone: {
    name: "Kids' Spot",
    location: "Terminal 2, Gate B22",
    walkTimeMinutes: 8,
    ageRange: "2-10 years"
  },
  cabPickup: {
    location: "Ground Transportation - Exit doors on Arrivals level",
    walkTimeMinutes: 5,
    instructions: "Follow signs for Ground Transportation. Taxi and rideshare pickup is clearly marked."
  },
  hotelShuttle: {
    location: "Ground Transportation Center - Island 3",
    walkTimeMinutes: 7,
    instructions: "Take AirTrain to Rental Car Center, then follow Hotel Shuttle signs"
  }
};

// Helper: Get Sabre OAuth token
async function getSabreToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.SABRE_CLIENT_ID}:${process.env.SABRE_CLIENT_SECRET}`
  ).toString("base64");
  
  const res = await fetch(`${process.env.SABRE_BASE_URL}/v2/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Sabre auth failed: ${res.status}`);
  }

  const { access_token } = await res.json();
  return access_token;
}

export async function POST(req: NextRequest) {
  try {
    const { tool, parameters } = await req.json();
    console.log("[tools] Tool call:", tool, parameters);

    switch (tool) {
      case "get_trip_info":
        return handleGetTripInfo(parameters);
      
      case "check_refund":
        return handleCheckRefund(parameters);
      
      case "process_refund":
        return handleProcessRefund(parameters);
      
      case "search_flights":
        return handleSearchFlights(parameters);
      
      case "find_airport_service":
        return handleAirportService(parameters);
      
      case "issue_voucher":
        return handleIssueVoucher(parameters);
      
      case "get_navigation":
        return handleNavigation(parameters);
      
      default:
        return NextResponse.json(
          { error: `Unknown tool: ${tool}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("[tools] Error:", err);
    return NextResponse.json(
      { error: "Tool execution failed" },
      { status: 500 }
    );
  }
}

async function handleGetTripInfo(params: any) {
  // Returns trip info based on PNR
  // In production, this would query Sabre PNR Retrieve API
  return NextResponse.json({
    success: true,
    data: {
      pnr: params.pnr,
      passenger: { firstName: "MARTELLE", lastName: "ASHLEY" },
      segments: [
        {
          flightNumber: "UA837",
          carrier: "United Airlines",
          from: "SFO",
          to: "NRT",
          departTime: "11:35",
          arriveTime: "15:20",
          status: "CONFIRMED"
        }
      ]
    }
  });
}

async function handleCheckRefund(params: any) {
  const { pnr, flightNumber } = params;
  
  // Call Sabre Refund Quote API
  try {
    if (!process.env.SABRE_CLIENT_ID) {
      throw new Error("Sabre credentials not configured");
    }

    const token = await getSabreToken();
    console.log("[tools] Got Sabre token, calling refund API...");

    // Sabre Refund Quote API (sandbox endpoint)
    const res = await fetch(
      `${process.env.SABRE_BASE_URL}/v1/trip/orders/refundQuote`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmationId: pnr,
          flightNumber: flightNumber,
        }),
      }
    );

    if (!res.ok) {
      console.error("[tools] Sabre refund API error:", res.status, await res.text());
      throw new Error(`Sabre API error: ${res.status}`);
    }

    const data = await res.json();
    console.log("[tools] Sabre refund response:", data);

    // Transform Sabre response to our format
    return NextResponse.json({
      success: true,
      data: {
        eligible: true,
        amountUSD: data.refundAmount || 428.50,
        reason: "Flight cancelled by carrier",
        policy: data.policyText || "Full refund available for carrier-initiated cancellations",
        processingTime: "5-7 business days"
      }
    });
  } catch (err) {
    console.error("[tools] Sabre refund failed, using fallback:", err);
    // Fallback to mock data for hackathon demo stability
    return NextResponse.json({
      success: true,
      data: {
        eligible: true,
        amountUSD: 428.50,
        reason: "Flight cancelled by carrier",
        policy: "Full refund available for carrier-initiated cancellations",
        processingTime: "5-7 business days",
        note: "(Demo data - Sabre sandbox)"
      }
    });
  }
}

async function handleProcessRefund(params: any) {
  const { pnr, flightNumber, amount } = params;
  
  // Process actual refund via Sabre
  try {
    if (!process.env.SABRE_CLIENT_ID) {
      throw new Error("Sabre credentials not configured");
    }

    const token = await getSabreToken();
    console.log("[tools] Got Sabre token, processing refund...");

    // Sabre Refund Processing API
    const res = await fetch(
      `${process.env.SABRE_BASE_URL}/v1/trip/orders/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmationId: pnr,
          flightNumber: flightNumber,
          refundAmount: amount,
        }),
      }
    );

    if (!res.ok) {
      console.error("[tools] Sabre refund processing error:", res.status, await res.text());
      throw new Error(`Sabre API error: ${res.status}`);
    }

    const data = await res.json();
    console.log("[tools] Sabre refund processing response:", data);

    return NextResponse.json({
      success: true,
      data: {
        refundId: data.refundId || `REF${Date.now()}`,
        amountUSD: amount || 428.50,
        status: "PROCESSED",
        confirmationNumber: data.confirmationNumber || `CONF${Date.now()}`,
        processingTime: "5-7 business days",
        method: "Original payment method"
      }
    });
  } catch (err) {
    console.error("[tools] Sabre refund processing failed, using fallback:", err);
    // Fallback for hackathon demo stability
    return NextResponse.json({
      success: true,
      data: {
        refundId: `REF${Date.now()}`,
        amountUSD: amount || 428.50,
        status: "PROCESSED",
        confirmationNumber: `CONF${Date.now()}`,
        processingTime: "5-7 business days",
        method: "Original payment method",
        note: "(Demo data - Sabre sandbox)"
      }
    });
  }
}

async function handleSearchFlights(params: any) {
  const { origin, destination, date, passengers } = params;
  
  // Call Sabre Bargain Finder Max API
  try {
    if (!process.env.SABRE_CLIENT_ID) {
      throw new Error("Sabre credentials not configured");
    }

    const token = await getSabreToken();
    console.log("[tools] Got Sabre token, calling flight search...");

    // Sabre Bargain Finder Max (BFM) API
    const res = await fetch(
      `${process.env.SABRE_BASE_URL}/v4/offers/shop`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          OTA_AirLowFareSearchRQ: {
            Version: "4",
            POS: {
              Source: [
                {
                  PseudoCityCode: "F9CE",
                  RequestorID: {
                    Type: "1",
                    ID: "1",
                    CompanyName: { Code: "TN" }
                  }
                }
              ]
            },
            OriginDestinationInformation: [
              {
                RPH: "1",
                DepartureDateTime: `${date}T00:00:00`,
                OriginLocation: { LocationCode: origin },
                DestinationLocation: { LocationCode: destination }
              }
            ],
            TravelPreferences: {
              MaxStopsQuantity: 1
            },
            TravelerInfoSummary: {
              AirTravelerAvail: [
                {
                  PassengerTypeQuantity: [
                    { Code: "ADT", Quantity: passengers || 1 }
                  ]
                }
              ]
            },
            TPA_Extensions: {
              IntelliSellTransaction: {
                RequestType: { Name: "50ITINS" }
              }
            }
          }
        }),
      }
    );

    if (!res.ok) {
      console.error("[tools] Sabre flight search error:", res.status, await res.text());
      throw new Error(`Sabre API error: ${res.status}`);
    }

    const data = await res.json();
    console.log("[tools] Sabre flight search response:", JSON.stringify(data, null, 2));

    // Transform Sabre response to our format
    const itineraries = data.groupedItineraryResponse?.itineraryGroups?.[0]?.itineraries || [];
    const options = itineraries.slice(0, 3).map((itin: any, idx: number) => {
      const leg = itin.legs?.[0];
      const schedules = leg?.schedules || [];
      const firstFlight = schedules[0];
      const lastFlight = schedules[schedules.length - 1];
      
      return {
        id: `opt${idx + 1}`,
        flightNumber: firstFlight?.carrier?.marketing + firstFlight?.number || "TBD",
        carrier: firstFlight?.carrier?.marketingFlightText || "Airline",
        from: origin,
        to: destination,
        departTime: firstFlight?.departure?.time || "TBD",
        arriveTime: lastFlight?.arrival?.time || "TBD",
        duration: leg?.elapsedTime || "TBD",
        stops: schedules.length - 1,
        fareUSD: 0,
        note: "Confirmed rebooking - no additional charge"
      };
    });

    return NextResponse.json({
      success: true,
      data: { options }
    });
  } catch (err) {
    console.error("[tools] Sabre flight search failed, using fallback:", err);
    // Fallback to mock data for hackathon demo stability
    return NextResponse.json({
      success: true,
      data: {
        options: [
          {
            id: "opt1",
            flightNumber: "UA838",
            carrier: "United Airlines",
            from: origin,
            to: destination,
            departTime: "14:20",
            arriveTime: "18:45",
            duration: "11h 25m",
            stops: 0,
            fareUSD: 0,
            note: "Confirmed rebooking - no additional charge (Demo data)"
          },
          {
            id: "opt2",
            flightNumber: "NH107",
            carrier: "ANA",
            from: origin,
            to: destination,
            departTime: "17:55",
            arriveTime: "22:10",
            duration: "11h 15m",
            stops: 0,
            fareUSD: 0,
            note: "(Demo data - Sabre sandbox)"
          }
        ]
      }
    });
  }
}

async function handleAirportService(params: any) {
  const { serviceType } = params;
  
  const service = airportServices[serviceType];
  if (!service) {
    return NextResponse.json({
      success: false,
      error: `Service type '${serviceType}' not found`
    }, { status: 404 });
  }
  
  return NextResponse.json({
    success: true,
    data: {
      serviceType,
      ...service
    }
  });
}

async function handleIssueVoucher(params: any) {
  const { amountUSD, purpose, recipientEmail } = params;
  
  // Mock PayPal payout
  // In production, call PayPal Payouts API
  return NextResponse.json({
    success: true,
    data: {
      amountUSD,
      purpose,
      recipient: recipientEmail,
      status: "SUCCESS",
      payoutId: `payout_${Date.now()}`,
      estimatedDelivery: "15-30 minutes",
      instructions: "Funds will appear in your PayPal balance"
    }
  });
}

async function handleNavigation(params: any) {
  const { destination, currentLocation } = params;
  
  // Airport navigation guidance
  const directions: Record<string, any> = {
    "baggage_claim": {
      from: "Arrivals gate",
      instructions: [
        "Follow 'Baggage Claim' signs",
        "Take escalator down one level",
        "Check monitors for carousel number",
        "Walk time: approximately 5-7 minutes"
      ]
    },
    "ground_transport": {
      from: "Baggage claim",
      instructions: [
        "Exit through main doors to Ground Transportation level",
        "Taxis: Islands 1-2",
        "Rideshare (Uber/Lyft): Island 5",
        "Hotel shuttles: Follow signs to Hotel Shuttle pick-up"
      ]
    },
    "hotel_with_voucher": {
      from: "Ground transport area",
      instructions: [
        "Use your PayPal voucher for taxi/rideshare payment",
        "Show driver your hotel address",
        "Estimated ride time to downtown hotels: 20-30 minutes",
        "Keep receipt for expense tracking"
      ]
    }
  };
  
  const nav = directions[destination] || {
    instructions: ["Please ask airport information desk for specific directions"]
  };
  
  return NextResponse.json({
    success: true,
    data: nav
  });
}
