import * as React from "react";
import type { IntegrationId } from "./actionsData";

/**
 * Call state for the production webphone once a rep can hold more than one
 * call — the PRD's "Rep experience", "Hold & swap", "Merge into a
 * conference", "Transfer the active call" and "Logging & reporting".
 *
 * One list of calls, plus which of them has the rep's ear (`focusedId`). A
 * focused call can still be on hold — the rep pressed Hold on it — so focus
 * and hold are separate, the way production's single-call Hold already is.
 * Every call that ends, however it ends, leaves a wrap-up behind: each call
 * is logged on its own, with its own notes and its own hold time.
 *
 * Time is passed in on every action rather than read inside the reducer, so
 * the reducer stays pure and the demo can be driven from a test.
 */

/** Our own lines — what a caller dialled, shown on every call. */
export const LINES = {
  sales: { label: "Sales", number: "(712) 625-7333" },
  support: { label: "Support", number: "(888) 555-0142" },
} as const;
export type Line = (typeof LINES)[keyof typeof LINES];

/**
 * The PRD leaves the per-rep limit to engineering. The prototype holds two —
 * one talking, one on hold — which is the floor every competitor in the PRD
 * supports. A call beyond it stays in the queue and never rings this rep.
 */
export const CONCURRENT_CALL_LIMIT = 2;
/**
 * The queue-chip approach lets the rep keep pulling callers from the queue
 * list past that: one talking and two on hold. Nothing rings them, so the
 * rep only ever takes on a third call on purpose.
 */
export const QUEUE_CALL_LIMIT = 3;

export interface Caller {
  number: string;
  name?: string;
  line: Line;
  /** Where the number is from, as production prints it under the caller. */
  location?: string;
  /** The CRM record the number matched — production's contact pill. */
  crm?: { id: IntegrationId; contact: string };
}

export interface Call extends Caller {
  id: string;
  inbound: boolean;
  startedAt: number;
  /** Set while the caller hears hold music. */
  heldSince: number | null;
  /** Hold time already banked, so a call held twice reports both stretches. */
  heldMs: number;
  muted: boolean;
  recording: boolean;
}

export interface WrapUpDraft {
  rating: number;
  outcome: string;
  note: string;
}

export interface WrapUp extends Caller {
  id: string;
  inbound: boolean;
  talkMs: number;
  heldMs: number;
  /** How the call left the rep's list, when it wasn't a plain hang-up. */
  endedBy?: string;
  draft: WrapUpDraft;
}

export interface TransferTarget {
  kind: "agent" | "group" | "number";
  label: string;
  detail?: string;
}

export interface WebphoneState {
  calls: Call[];
  focusedId: string | null;
  conference: boolean;
  /** A call ringing while the rep is already on one. */
  ringing: (Caller & { arrivedAt: number }) | null;
  /** A call ringing while the rep is free: production's full-screen offer. */
  offer: Caller | null;
  /** A warm transfer in progress: the rep is talking to the target first. */
  consult: { callId: string; target: TransferTarget; startedAt: number } | null;
  wrapUps: WrapUp[];
  /** The last call that rang and went back to the queue unanswered. */
  missed: (Caller & { at: number }) | null;
}

export const INITIAL_STATE: WebphoneState = {
  calls: [],
  focusedId: null,
  conference: false,
  ringing: null,
  offer: null,
  consult: null,
  wrapUps: [],
  missed: null,
};

type Action =
  | { type: "offer"; caller: Caller }
  | { type: "decline-offer" }
  | { type: "start"; caller: Caller; inbound: boolean; at: number }
  | { type: "ring"; caller: Caller; at: number }
  | { type: "ring-timeout"; at: number }
  | { type: "answer-ringing"; at: number }
  | { type: "decline-ringing"; at: number }
  | { type: "connect"; caller: Caller; at: number }
  | { type: "toggle-hold"; at: number }
  | { type: "toggle-mute" }
  | { type: "toggle-record" }
  | { type: "swap"; at: number }
  | { type: "resume"; id: string; at: number }
  | { type: "merge"; at: number }
  | { type: "remove-participant"; id: string; at: number }
  | { type: "leave-conference"; at: number }
  | { type: "hang-up"; at: number }
  | { type: "transfer"; target: TransferTarget; at: number }
  | { type: "consult"; target: TransferTarget; at: number }
  | { type: "complete-consult"; at: number }
  | { type: "cancel-consult"; at: number }
  | { type: "draft"; id: string; draft: WrapUpDraft }
  | { type: "done"; id: string }
  | { type: "clear-missed" };

let nextId = 0;
const newId = () => `call-${++nextId}`;

const EMPTY_DRAFT: WrapUpDraft = { rating: 0, outcome: "", note: "" };

function hold(call: Call, at: number): Call {
  return call.heldSince === null ? { ...call, heldSince: at } : call;
}

function unhold(call: Call, at: number): Call {
  if (call.heldSince === null) return call;
  return { ...call, heldMs: call.heldMs + (at - call.heldSince), heldSince: null };
}

/** Takes a call off the rep's list and leaves its wrap-up behind. */
function end(state: WebphoneState, id: string, at: number, endedBy?: string): WebphoneState {
  const call = state.calls.find((c) => c.id === id);
  if (!call) return state;
  const settled = unhold(call, at);
  const calls = state.calls.filter((c) => c.id !== id);
  return {
    ...state,
    calls,
    // The other call stays exactly as it was — on hold, waiting for one
    // click — rather than being picked up on the rep's behalf. The PRD asks
    // for "resume in one click", not an automatic reconnect to a caller the
    // rep may not be ready for.
    focusedId: state.focusedId === id ? null : state.focusedId,
    conference: calls.length > 1 && state.conference,
    wrapUps: [
      ...state.wrapUps,
      {
        id: call.id,
        number: call.number,
        name: call.name,
        line: call.line,
        inbound: call.inbound,
        talkMs: at - call.startedAt - settled.heldMs,
        heldMs: settled.heldMs,
        endedBy,
        draft: EMPTY_DRAFT,
      },
    ],
  };
}

function mapFocused(state: WebphoneState, fn: (call: Call) => Call): WebphoneState {
  return {
    ...state,
    calls: state.calls.map((c) => (c.id === state.focusedId ? fn(c) : c)),
  };
}

export function reducer(state: WebphoneState, action: Action): WebphoneState {
  switch (action.type) {
    case "offer":
      return { ...state, offer: action.caller };
    case "decline-offer":
      return { ...state, offer: null };

    case "start": {
      const call: Call = {
        ...action.caller,
        id: newId(),
        inbound: action.inbound,
        startedAt: action.at,
        heldSince: null,
        heldMs: 0,
        muted: false,
        recording: true,
      };
      return { ...state, offer: null, calls: [...state.calls, call], focusedId: call.id };
    }

    case "ring":
      // At the limit, or in a conference (which already holds both lines),
      // the call stays in the queue and this rep never hears it.
      if (state.calls.length >= CONCURRENT_CALL_LIMIT || state.conference || state.ringing) {
        return state;
      }
      return { ...state, ringing: { ...action.caller, arrivedAt: action.at } };

    // Declining is the rep saying no before the timeout would: either way the
    // caller goes back to the queue, and the notice says so.
    case "decline-ringing":
    case "ring-timeout":
      if (!state.ringing) return state;
      return { ...state, ringing: null, missed: { ...state.ringing, at: action.at } };

    case "answer-ringing": {
      if (!state.ringing) return state;
      // Answering holds whatever the rep was on — the PRD's one rule for
      // the second call — before connecting the new one.
      const held = { ...state, calls: state.calls.map((c) => hold(c, action.at)) };
      const { arrivedAt: _arrivedAt, ...caller } = state.ringing;
      return reducer({ ...held, ringing: null }, {
        type: "start",
        caller,
        inbound: true,
        at: action.at,
      });
    }

    case "connect": {
      // Pulling a caller from the queue list (the queue-chip approach). Same
      // rule as answering a ring: whatever the rep was on goes on hold first.
      // At the limit it does nothing — the list says so and disables Connect.
      if (state.calls.length >= QUEUE_CALL_LIMIT || state.conference) return state;
      const held = { ...state, calls: state.calls.map((c) => hold(c, action.at)) };
      return reducer(held, { type: "start", caller: action.caller, inbound: true, at: action.at });
    }

    case "toggle-hold":
      return mapFocused(state, (c) =>
        c.heldSince === null ? hold(c, action.at) : unhold(c, action.at)
      );
    case "toggle-mute":
      return mapFocused(state, (c) => ({ ...c, muted: !c.muted }));
    case "toggle-record":
      return mapFocused(state, (c) => ({ ...c, recording: !c.recording }));

    case "swap": {
      const other = state.calls.find((c) => c.id !== state.focusedId);
      if (!other) return state;
      return reducer(state, { type: "resume", id: other.id, at: action.at });
    }

    case "resume":
      // Swapping always holds the call being left, so two callers never hear
      // each other by accident — that is what Merge is for.
      return {
        ...state,
        calls: state.calls.map((c) =>
          c.id === action.id ? unhold(c, action.at) : hold(c, action.at)
        ),
        focusedId: action.id,
      };

    case "merge":
      if (state.calls.length < 2) return state;
      return {
        ...state,
        calls: state.calls.map((c) => unhold(c, action.at)),
        conference: true,
        focusedId: null,
      };

    case "remove-participant": {
      const next = end(state, action.id, action.at, "Removed from conference");
      // One caller left is an ordinary call again, and it is the one the
      // rep is talking to.
      const remaining = next.calls[0];
      return { ...next, conference: false, focusedId: remaining?.id ?? null };
    }

    case "leave-conference":
      return state.calls.reduce<WebphoneState>(
        (acc, call) => end(acc, call.id, action.at, "Left conference"),
        { ...state, conference: false }
      );

    case "hang-up":
      if (!state.focusedId) return state;
      return end(state, state.focusedId, action.at);

    case "transfer":
      if (!state.focusedId) return state;
      return end(state, state.focusedId, action.at, `Transferred to ${action.target.label}`);

    case "consult":
      if (!state.focusedId) return state;
      return {
        ...mapFocused(state, (c) => hold(c, action.at)),
        consult: { callId: state.focusedId, target: action.target, startedAt: action.at },
      };

    case "complete-consult": {
      if (!state.consult) return state;
      const { callId, target } = state.consult;
      return end({ ...state, consult: null }, callId, action.at, `Transferred to ${target.label}`);
    }

    case "cancel-consult": {
      if (!state.consult) return state;
      const { callId } = state.consult;
      return {
        ...state,
        consult: null,
        calls: state.calls.map((c) => (c.id === callId ? unhold(c, action.at) : c)),
      };
    }

    case "draft":
      return {
        ...state,
        wrapUps: state.wrapUps.map((w) => (w.id === action.id ? { ...w, draft: action.draft } : w)),
      };
    case "done":
      return { ...state, wrapUps: state.wrapUps.filter((w) => w.id !== action.id) };
    case "clear-missed":
      return { ...state, missed: null };
  }
}

/** Ticks once a second while mounted, for the call clocks. */
export function useNow() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);
  return now;
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** Hold time so far, counting the stretch still running. */
export function heldFor(call: Call, now: number) {
  return call.heldMs + (call.heldSince === null ? 0 : now - call.heldSince);
}

export function callerLabel(caller: Caller) {
  return caller.name ?? caller.number;
}
