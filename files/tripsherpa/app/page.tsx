"use client";

import { useCallback, useEffect, useReducer, useRef, useState, useMemo } from "react";
import { Plane, Upload, Mic, MicOff, MapPin, Clock, Users, AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import {
  VocalBridgeProvider,
  useAIAgent,
  useAgentActions,
  useTranscript,
  useVocalBridge,
} from "@vocalbridgeai/react";

// ============================================================ types
type Segment = {
  flightNumber: string;
  carrier: string;
  from: string;
  fromName?: string;
  to: string;
  toName?: string;
  departDate?: string;
  departTime: string;
  arriveTime: string;
  seat?: string;
  cabin?: string;
  status?: "ON_TIME" | "CANCELLED" | "DELAYED" | "REBOOKED" | "REFUNDED";
  disruptionCode?: string;
};

type Passenger = { firstName: string; lastName: string; type?: string; age?: number };

type Trip = {
  pnr?: string;
  passenger?: Passenger;
  additionalPassengers?: Passenger[];
  segments: Segment[];
};

type Voucher = { amountUSD: number; purpose: string; status: string; recipient: string };
type AirportInfo = { serviceType: string; location?: string; walkTimeMinutes?: number; network?: string; note?: string };
type RebookOption = {
  id: string;
  flightNumber: string;
  carrier: string;
  from: string;
  to: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  stops: number;
  fareUSD: number;
  note?: string;
};

// ============================================================ ui state reducer
type UiState = {
  trip: Trip | null;
  voucher: Voucher | null;
  airportInfo: AirportInfo | null;
  rebookOptions: RebookOption[];
  callTranscript: { role: string; text: string }[] | null;
  notes: string[];
};

const initialUi: UiState = {
  trip: null,
  voucher: null,
  airportInfo: null,
  rebookOptions: [],
  callTranscript: null,
  notes: [],
};

type UiAction =
  | { action: "load_itinerary"; payload: Trip }
  | { action: "replace_segment"; segmentIndex: number; payload: Segment }
  | { action: "mark_refunded"; segmentIndex: number }
  | { action: "mark_confirmed"; segmentIndex: number }
  | { action: "add_note"; payload: { text: string } }
  | { action: "show_voucher"; payload: Voucher }
  | { action: "show_airport_service"; payload: AirportInfo }
  | { action: "show_rebook_options"; payload: RebookOption[] }
  | { action: "show_call_transcript"; payload: { transcript: { role: string; text: string }[] } };

function uiReducer(state: UiState, action: UiAction): UiState {
  console.log("[uiReducer] Action:", action.action, "Payload:", action.payload);
  
  switch (action.action) {
    case "load_itinerary":
      console.log("[uiReducer] Loading itinerary into state");
      return { ...state, trip: action.payload };
    case "replace_segment": {
      if (!state.trip) return state;
      const segments = [...state.trip.segments];
      segments[action.segmentIndex] = { ...action.payload, status: "REBOOKED" };
      return { ...state, trip: { ...state.trip, segments } };
    }
    case "mark_refunded": {
      if (!state.trip) return state;
      const segments = state.trip.segments.map((s, i) =>
        i === action.segmentIndex ? { ...s, status: "REFUNDED" as const } : s
      );
      return { ...state, trip: { ...state.trip, segments } };
    }
    case "mark_confirmed": {
      if (!state.trip) return state;
      const segments = state.trip.segments.map((s, i) =>
        i === action.segmentIndex ? { ...s, status: "ON_TIME" as const } : s
      );
      return { ...state, trip: { ...state.trip, segments } };
    }
    case "add_note":
      return { ...state, notes: [...state.notes, action.payload.text] };
    case "show_voucher":
      return { ...state, voucher: action.payload };
    case "show_airport_service":
      return { ...state, airportInfo: action.payload };
    case "show_rebook_options":
      return { ...state, rebookOptions: action.payload };
    case "show_call_transcript":
      return { ...state, callTranscript: action.payload.transcript };
    default:
      return state;
  }
}

// ============================================================ page
export default function Page() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const options = useMemo(
    () => ({ auth: { tokenUrl: "/api/token" }, participantName: "Traveler" }),
    []
  );

  if (!mounted) return null;

  return (
    <VocalBridgeProvider options={options}>
      <TripSherpaShell />
    </VocalBridgeProvider>
  );
}

// ============================================================ shell (inside VB provider)
function TripSherpaShell() {
  const [ui, dispatch] = useReducer(uiReducer, initialUi);
  const uiRef = useRef(ui);
  useEffect(() => { uiRef.current = ui; }, [ui]);

  // Vocal Bridge AI Agent mode: The agent in the dashboard handles conversation
  // and calls our tools via agentAction events. We don't need useAIAgent callback.
  
  // Listen for tool calls from the Vocal Bridge agent
  useAgentActions({
    onAction: (action: string, payload: Record<string, unknown>) => {
      console.log("[VB Agent Action]", action, payload);
      
      // Handle tool responses
      switch (action) {
        case "load_itinerary":
          dispatch({ action: "load_itinerary", payload: payload as Trip });
          break;
        case "show_rebook_options":
          dispatch({ action: "show_rebook_options", payload: payload as RebookOption[] });
          break;
        case "show_voucher":
          dispatch({ action: "show_voucher", payload: payload as Voucher });
          break;
        case "show_airport_service":
          dispatch({ action: "show_airport_service", payload: payload as AirportInfo });
          break;
        case "add_note":
          dispatch({ action: "add_note", payload: payload as { text: string } });
          break;
        case "replace_segment":
          if (typeof payload.segmentIndex === "number") {
            dispatch({ 
              action: "replace_segment", 
              segmentIndex: payload.segmentIndex,
              payload: payload.segment as Segment 
            });
          }
          break;
        case "mark_refunded":
          if (typeof payload.segmentIndex === "number") {
            dispatch({ action: "mark_refunded", segmentIndex: payload.segmentIndex });
          }
          break;
        case "mark_confirmed":
          if (typeof payload.segmentIndex === "number") {
            dispatch({ action: "mark_confirmed", segmentIndex: payload.segmentIndex });
          }
          break;
        default:
          console.warn("[VB Agent Action] Unknown action:", action);
      }
    },
  });

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_380px]">
      <div className="p-8 lg:p-12 space-y-8 max-w-3xl">
        <Header />
        {!ui.trip && <DropZone onLoaded={(trip) => dispatch({ action: "load_itinerary", payload: trip })} />}
        {ui.trip && <ItineraryPanel trip={ui.trip} />}
        {ui.rebookOptions.length > 0 && <RebookPanel options={ui.rebookOptions} />}
        {ui.airportInfo && <AirportInfoCard info={ui.airportInfo} />}
        {ui.voucher && <VoucherCard voucher={ui.voucher} />}
        {ui.callTranscript && <CallTranscriptCard transcript={ui.callTranscript} />}
        {ui.notes.map((n, i) => (
          <div key={i} className="card-in text-paper/70 border-l-2 border-amber px-4 py-2">
            {n}
          </div>
        ))}
      </div>
      <SidePanel />
    </main>
  );
}

// ============================================================ header
function Header() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-gradient-to-br from-amber to-amber-2 p-3 rounded-xl shadow-lg">
          <Plane className="w-6 h-6 text-ink" />
        </div>
        <div>
          <div className="text-amber tracking-widest text-xs font-semibold">TRIP SHERPA</div>
          <div className="text-paper/50 text-xs">AI Travel Assistant</div>
        </div>
      </div>
      <h1 className="font-display text-4xl lg:text-5xl leading-tight">
        A calm hand on your <em className="text-amber not-italic">chaotic day</em>.
      </h1>
      <p className="text-paper/70 mt-3 max-w-lg flex items-start gap-2">
        <Mic className="w-5 h-5 text-amber mt-0.5 flex-shrink-0" />
        <span>Tap the mic. Tell me what's wrong. I'll handle the paperwork.</span>
      </p>
    </div>
  );
}

// ============================================================ drop zone
function DropZone({ onLoaded }: { onLoaded: (trip: Trip) => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("document", file);
    try {
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      
      if (!res.ok || data.error) {
        alert(data.error || "Failed to process document. Please try again.");
        setUploading(false);
        return;
      }
      
      console.log("[UI] Extracted trip data:", data.extracted);
      setUploading(false);
      onLoaded(data.extracted);
    } catch (err) {
      console.error("[UI] Upload error:", err);
      alert("Failed to upload document. Please try again.");
      setUploading(false);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) upload(file);
      }}
      className={`card-in rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300
        ${dragging ? "border-amber bg-ink-2 scale-[1.02]" : "border-line bg-ink-2/40 hover:border-amber/50"}`}
    >
      <div className="flex justify-center mb-4">
        <div className={`p-4 rounded-full transition-all duration-300 ${
          uploading ? "bg-amber/20 animate-pulse" : dragging ? "bg-amber/30" : "bg-amber/10"
        }`}>
          {uploading ? (
            <RefreshCw className="w-8 h-8 text-amber animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-amber" />
          )}
        </div>
      </div>
      <div className="text-paper/60 text-sm mb-1">Start here</div>
      <div className="text-2xl font-display mt-2">Drop a boarding pass or ticket</div>
      <div className="text-paper/50 mt-2 flex items-center justify-center gap-2">
        {uploading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Reading it...</span>
          </>
        ) : (
          <span>PDF, DOC, DOCX, or photo. I'll pull out your trip in a second.</span>
        )}
      </div>
      <label className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-amber to-amber-2 text-ink font-medium rounded-full cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200">
        <Upload className="w-4 h-4" />
        Choose a file
        <input
          type="file"
          className="hidden"
          accept="application/pdf,image/*,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/msword,.doc"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>
    </div>
  );
}

// ============================================================ itinerary
function ItineraryPanel({ trip }: { trip: Trip }) {
  const passengerLine = trip.passenger
    ? [trip.passenger, ...(trip.additionalPassengers ?? [])]
        .map((p) => `${p.firstName} ${p.lastName}${p.age ? ` (${p.age})` : ""}`)
        .join(" · ")
    : null;

  return (
    <section className="space-y-4 card-in">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl">Your trip</h2>
        {trip.pnr && (
          <span className="text-paper/50 text-sm tracking-widest">PNR {trip.pnr}</span>
        )}
      </div>
      {passengerLine && <div className="text-paper/70 text-sm">{passengerLine}</div>}

      <div className="space-y-3">
        {trip.segments.map((seg, i) => <SegmentCard key={i} segment={seg} />)}
      </div>
    </section>
  );
}

function SegmentCard({ segment: s }: { segment: Segment }) {
  const status = s.status ?? "ON_TIME";
  const statusStyles: Record<string, string> = {
    ON_TIME: "text-sage",
    CANCELLED: "text-coral",
    DELAYED: "text-amber",
    REBOOKED: "text-amber-2",
    REFUNDED: "text-paper/50",
  };
  const statusText: Record<string, string> = {
    ON_TIME: "On time",
    CANCELLED: "Cancelled",
    DELAYED: "Delayed",
    REBOOKED: "Rebooked",
    REFUNDED: "Refunded",
  };

  return (
    <div className="card-in bg-ink-2 rounded-2xl p-5 flex items-center gap-6">
      <div className="text-center min-w-[64px]">
        <div className="text-paper/50 text-xs">{s.carrier}</div>
        <div className="text-lg font-medium">{s.flightNumber}</div>
      </div>
      <div className="flex-1 flex items-center gap-4">
        <div>
          <div className="font-display text-2xl">{s.from}</div>
          <div className="text-paper/60 text-sm">{s.departTime}</div>
        </div>
        <div className="flex-1 border-t border-dashed border-line" />
        <div className="text-right">
          <div className="font-display text-2xl">{s.to}</div>
          <div className="text-paper/60 text-sm">{s.arriveTime}</div>
        </div>
      </div>
      <div className={`text-sm min-w-[80px] text-right ${statusStyles[status]}`}>
        {statusText[status]}
      </div>
    </div>
  );
}

// ============================================================ rebook
function RebookPanel({ options }: { options: RebookOption[] }) {
  return (
    <section className="card-in space-y-3">
      <h3 className="font-display text-xl">Replacement options</h3>
      {options.map((o) => (
        <div key={o.id} className="bg-ink-2 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="min-w-[64px]">
              <div className="text-paper/50 text-xs">{o.carrier}</div>
              <div className="font-medium">{o.flightNumber}</div>
            </div>
            <div className="flex-1 flex items-center gap-3">
              <div>
                <div className="font-display text-xl">{o.from}</div>
                <div className="text-paper/60 text-sm">{o.departTime}</div>
              </div>
              <div className="flex-1 border-t border-dashed border-line" />
              <div className="text-right">
                <div className="font-display text-xl">{o.to}</div>
                <div className="text-paper/60 text-sm">{o.arriveTime}</div>
              </div>
            </div>
            <div className="text-right text-sm text-paper/70">{o.duration}</div>
          </div>
          {o.note && <div className="mt-2 text-sm text-amber">{o.note}</div>}
        </div>
      ))}
    </section>
  );
}

// ============================================================ airport info
function AirportInfoCard({ info }: { info: AirportInfo }) {
  const labels: Record<string, string> = {
    wifi: "WiFi",
    supportBooth: "Support desk",
    chargingStation: "Charging",
    kidsPlayZone: "Kids' area",
    familyRestroom: "Family restroom",
    cellularSupport: "Cellular help",
    quietSeating: "Quiet seating",
  };
  return (
    <section className="card-in bg-ink-2 rounded-2xl p-5">
      <div className="text-amber text-xs tracking-widest mb-2">
        {labels[info.serviceType] ?? "Airport"}
      </div>
      {info.network && (
        <div className="font-display text-2xl">{info.network}</div>
      )}
      {info.location && (
        <div className="text-paper/80 mt-1">{info.location}</div>
      )}
      {info.walkTimeMinutes && (
        <div className="text-paper/60 text-sm mt-2">
          About {info.walkTimeMinutes} minutes on foot
        </div>
      )}
      {info.note && (
        <div className="text-paper/60 text-sm mt-2 italic">{info.note}</div>
      )}
    </section>
  );
}

// ============================================================ voucher
function VoucherCard({ voucher }: { voucher: Voucher }) {
  return (
    <section className="card-in rounded-2xl p-6 bg-paper text-ink relative overflow-hidden">
      <div className="absolute right-6 top-6 text-ink/40 text-xs tracking-widest">PAYPAL</div>
      <div className="text-ink/60 text-xs tracking-widest">Compensation</div>
      <div className="font-display text-5xl mt-2">
        ${voucher.amountUSD.toFixed(2)}
      </div>
      <div className="mt-2 text-ink/70 capitalize">{voucher.purpose} voucher</div>
      <div className="mt-3 text-ink/60 text-sm">
        Sent to {voucher.recipient} · {voucher.status}
      </div>
    </section>
  );
}

// ============================================================ call transcript
function CallTranscriptCard({ transcript }: { transcript: { role: string; text: string }[] }) {
  return (
    <section className="card-in bg-ink-2 rounded-2xl p-5">
      <div className="text-amber text-xs tracking-widest mb-3">LIVE CALL TRANSCRIPT</div>
      <div className="space-y-2">
        {transcript.map((line, i) => (
          <div key={i} className="text-sm">
            <span className="text-paper/50 uppercase tracking-widest text-xs mr-2">
              {line.role}
            </span>
            <span>{line.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================ side panel — mic + transcript
function SidePanel() {
  const { state, connect, disconnect } = useVocalBridge();
  const { transcript } = useTranscript();
  const listening = state === "connected";

  return (
    <aside className="border-l border-line p-6 bg-ink-2/40 flex flex-col min-h-screen sticky top-0">
      <div className="flex-1">
        <div className="text-paper/50 text-xs tracking-widest mb-3">SESSION</div>
        <div className="space-y-3 text-sm max-h-[65vh] overflow-y-auto">
          {transcript.length === 0 ? (
            <div className="text-paper/40 italic">
              Tap the mic and start talking. I hear everything you say.
            </div>
          ) : (
            transcript.map((line: { role: string; text: string }, i: number) => (
              <div key={i}>
                <div className="text-paper/40 uppercase tracking-widest text-[10px]">
                  {line.role}
                </div>
                <div className="text-paper/90">{line.text}</div>
              </div>
            ))
          )}
        </div>
      </div>
      <button
        onClick={listening ? disconnect : connect}
        className={`mt-6 w-full py-4 rounded-full font-medium transition-colors
          ${listening ? "bg-coral text-paper mic-listening" : "bg-amber text-ink"}`}
      >
        {listening ? "Stop" : "Tap to talk"}
      </button>
    </aside>
  );
}
