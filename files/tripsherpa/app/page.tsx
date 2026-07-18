"use client";

import { useCallback, useEffect, useReducer, useRef, useState, useMemo } from "react";
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
  switch (action.action) {
    case "load_itinerary":
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

  // The one hook that turns Claude into a voice agent. Vocal Bridge captures
  // the user's speech, transcribes it, and hands us the text via onQuery.
  // Whatever we return is spoken back out loud.
  useAIAgent({
    onQuery: async (query: string) => {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, itineraryState: uiRef.current.trip }),
      });
      const { text, uiUpdates } = await res.json();
      (uiUpdates ?? []).forEach((u: UiAction) => dispatch(u));
      return text || "One moment.";
    },
  });

  // Optional: listen for actions the agent fires directly through the VB data
  // channel (bypassing our /api/agent route). Not used in the base flow but
  // available if you want the agent to nudge the UI mid-utterance.
  useAgentActions({
    onAction: (action: string, payload: Record<string, unknown>) => {
      dispatch({ action, payload } as unknown as UiAction);
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
      <div className="text-amber tracking-widest text-xs mb-2">TRIP SHERPA</div>
      <h1 className="font-display text-4xl lg:text-5xl leading-tight">
        A calm hand on your <em className="text-amber not-italic">chaotic day</em>.
      </h1>
      <p className="text-paper/70 mt-3 max-w-lg">
        Tap the mic. Tell me what's wrong. I'll handle the paperwork.
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
    const res = await fetch("/api/extract", { method: "POST", body: fd });
    const { extracted } = await res.json();
    setUploading(false);
    onLoaded(extracted);
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
      className={`card-in rounded-2xl border-2 border-dashed p-10 text-center transition-colors
        ${dragging ? "border-amber bg-ink-2" : "border-line bg-ink-2/40"}`}
    >
      <div className="text-paper/60 text-sm">Start here</div>
      <div className="text-2xl font-display mt-2">Drop a boarding pass or ticket</div>
      <div className="text-paper/50 mt-2">
        {uploading ? "Reading it..." : "PDF or photo. I'll pull out your trip in a second."}
      </div>
      <label className="inline-block mt-6 px-5 py-2 bg-amber text-ink font-medium rounded-full cursor-pointer">
        Choose a file
        <input
          type="file"
          className="hidden"
          accept="application/pdf,image/*"
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
