import { useEffect, useState } from "react";
import { type AgentAssistScope } from "./agentAssistScope";
import { SEED_BUSY_REASONS, type BusyReason } from "./callDeviceData";

/**
 * V1 pops the webphone out into its own tab instead of swapping it over the
 * page behind it. That is how the shipped webphone behaves — the agent keeps
 * the JustCall tab they were reading, and the call gets a window of its own —
 * and it is why the popped-out dialer has no close cross: there is nothing
 * behind it to return to, so closing the tab is the browser's job, not ours.
 *
 * The new tab is a second mount of the same SPA, so it is told what it is
 * through the URL. The one thing too big for a query string is the admin's
 * unavailability list, which is account config the shell holds in state; that
 * crosses over through `localStorage`, and the dialer tab keeps listening so a
 * reason authored on Settings still reaches a webphone that is already open.
 */

const VIEW_PARAM = "view";
const DIALER_VIEW = "dialer";
const SCOPE_PARAM = "scope";
const ASSIST_PARAM = "assist";
/** "0" is today's dialer, from before Agent Assist existed (multi-call). */
const AGENT_ASSIST_PARAM = "aa";
const BUSY_REASONS_KEY = "justcall-ai:busy-reasons";
/** Named, so a second Dialer click finds the tab instead of stacking another. */
const WINDOW_NAME = "justcall-webphone";

export interface DialerWindowParams {
  scope: AgentAssistScope;
  assistConfigured: boolean;
  assistAvailable: boolean;
  agentAssist: boolean;
}

/**
 * Reads the current tab's own URL. Non-null only in the popped-out webphone,
 * and constant for that tab's lifetime — this decides what the tab *is*, not
 * what it is currently showing.
 */
export function readDialerWindowParams(search: string): DialerWindowParams | null {
  const params = new URLSearchParams(search);
  if (params.get(VIEW_PARAM) !== DIALER_VIEW) return null;
  return {
    scope: params.get(SCOPE_PARAM) === "v1" ? "v1" : "v2",
    assistConfigured: !["0", "locked"].includes(
      params.get(ASSIST_PARAM) ?? "1"
    ),
    assistAvailable: params.get(ASSIST_PARAM) !== "locked",
    agentAssist: params.get(AGENT_ASSIST_PARAM) !== "0",
  };
}

function writeSharedBusyReasons(reasons: BusyReason[]) {
  try {
    localStorage.setItem(BUSY_REASONS_KEY, JSON.stringify(reasons));
  } catch {
    // Private browsing, or a quota that a demo has no business fighting.
    // The dialer falls back to the seed list, which is what a fresh account
    // would have shown anyway.
  }
}

function readSharedBusyReasons(): BusyReason[] {
  try {
    const raw = localStorage.getItem(BUSY_REASONS_KEY);
    if (!raw) return SEED_BUSY_REASONS;
    const parsed = JSON.parse(raw) as BusyReason[];
    return Array.isArray(parsed) ? parsed : SEED_BUSY_REASONS;
  } catch {
    return SEED_BUSY_REASONS;
  }
}

/**
 * Publishes the admin's list for whatever webphone tab is open. Called from
 * the shell that owns the list, so an edit on Settings lands in an already
 * open dialer rather than waiting for it to be reopened.
 */
export function useShareBusyReasons(reasons: BusyReason[], enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    writeSharedBusyReasons(reasons);
  }, [reasons, enabled]);
}

/** The dialer tab's side of the same wire. */
export function useSharedBusyReasons(): BusyReason[] {
  const [reasons, setReasons] = useState<BusyReason[]>(readSharedBusyReasons);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== BUSY_REASONS_KEY) return;
      setReasons(readSharedBusyReasons());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return reasons;
}

/**
 * Held so a second Dialer click focuses the webphone that is already up. A
 * plain `window.open` to the same name would navigate it instead, which
 * reloads the tab and drops a call that is mid-flight.
 */
let openWindow: Window | null = null;

export function openDialerWindow({
  scope,
  assistConfigured = true,
  agentAssist = true,
  busyReasons = SEED_BUSY_REASONS,
}: {
  scope: AgentAssistScope;
  assistConfigured?: boolean;
  agentAssist?: boolean;
  busyReasons?: BusyReason[];
}) {
  writeSharedBusyReasons(busyReasons);

  if (openWindow && !openWindow.closed) {
    openWindow.focus();
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set(VIEW_PARAM, DIALER_VIEW);
  url.searchParams.set(SCOPE_PARAM, scope);
  url.searchParams.set(ASSIST_PARAM, assistConfigured ? "1" : "0");
  if (!agentAssist) url.searchParams.set(AGENT_ASSIST_PARAM, "0");

  openWindow = window.open(url.toString(), WINDOW_NAME);
}
