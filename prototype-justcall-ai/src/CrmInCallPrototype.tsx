import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { IconClose, IconSearch, IconVoice, IconVoicemailDrop } from "@/components/Icon";
import { Tabs } from "@/components/Tabs";
import { DURATION } from "@/lib/motion";
import { useDragPosition } from "@/lib/useDragPosition";
import { usePresence } from "@/lib/usePresence";
import { cn } from "@/lib/utils";
import { AgentAssistCallSheet } from "./AgentAssistCallSheet";
import hangupIcon from "./assets/dialer/hangup.svg";
import justcallMark from "./assets/justcall-mark.svg";
import { BarControl } from "./CallBarControl";
import { voicemailLibrary } from "./callDeviceData";
import {
  KEYPAD_COPY,
  KeypadBody,
  TransferBody,
  VoicemailBody,
  transferCopy,
  useKeypad,
  useTransferFlow,
  useVoicemailDrop,
  voicemailCopy,
  type KeypadFlow,
  type TransferFlow,
  type VoicemailFlow,
} from "./CallLineControls";
import { CALL_SCENARIOS } from "./callSimulation";
import { LiveAgentAssistPanel } from "./LiveAgentAssistPanel";
import { NotesEditor, type NotesEditorValue } from "./NotesEditor";
import {
  IconCallHold,
  IconCallKeypad,
  IconCallMuted,
  IconCallNotes,
  IconCallTransfer,
} from "./icons/CallControlIcons";

/**
 * Agent Assist as it appears inside a CRM record — the same guidance the full
 * workspace gives, in the 430px the CRM leaves beside a contact.
 *
 * Two tabs, not three. Notes used to sit up here as a peer of Guidance and
 * Script, which said the wrong thing about it: Guidance and Script are what
 * Agent Assist is *reading out* of the call, and the agent moves between them
 * as the conversation moves. Notes is a thing they *do to* the call, the same
 * way muting or transferring is — so it lives on the call controls with the
 * rest of them, and the tab row is left holding only the two views.
 */

/** The two views. Everything else the panel can show is a control's surface. */
type AssistTab = "script" | "guidance";

/**
 * What a call control can open over the tabs — the dialer's own three, and
 * Notes, which joins them for the reason above.
 */
type CallSurface = "keypad" | "transfer" | "voicemail";
type CallPanel = CallSurface | "notes";

/**
 * The call on the line. Which script the agent runs is a choice made *on top*
 * of it, so switching scripts must never swap who is on the other end — the
 * caller, the number and the transfer flow's customer all read from here.
 */
const CALL = CALL_SCENARIOS[0]!;

/**
 * The widget's box. Width is the design's; the height is capped rather than
 * stretched to the viewport, because a panel pinned top and bottom has nowhere
 * to go vertically — and a panel the agent cannot move down is the complaint
 * this height answers.
 */
const PANEL_WIDTH = 430;
const PANEL_MAX_HEIGHT = 760;
const PANEL_MARGIN = 16;

/** Where the agent left it last time. */
const PANEL_POSITION_KEY = "justcall.crm-panel.position";

function HubSpotMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className={className}>
      <path d="M8 6v7m0 0 7 4m-7-4-4 5m11-1 4-7m-4 7 5 5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="8" cy="5" r="2.3" fill="currentColor" />
      <circle cx="4" cy="19" r="2.3" fill="currentColor" />
      <circle cx="20" cy="8" r="2.3" fill="currentColor" />
      <circle cx="21" cy="23" r="3" fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

function HubSpotPlaceholder() {
  return (
    <div className="absolute inset-0 flex min-w-[980px] flex-col overflow-hidden bg-secondary-bg text-foreground" aria-label="HubSpot contact record placeholder">
      <div className="flex h-12 shrink-0 items-center gap-5 bg-gray-800 px-4 text-white">
        <HubSpotMark className="size-7 shrink-0 text-warning" />
        <div className="flex h-8 w-[350px] items-center gap-2 rounded-[6px] bg-gray-600 px-3 text-[13px] text-white/85">
          <IconSearch size={16} />
          Search HubSpot
        </div>
        <div className="ml-auto flex items-center gap-5 text-[12px] text-white/75">
          <span>Upgrade</span><span>☎</span><span>▣</span><span>?</span><span>⚙</span>
          <Avatar size="sm" initials="SL" color="indigo" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <nav className="flex w-14 shrink-0 flex-col items-center gap-5 bg-gray-700 py-5 text-white/65">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} className={cn("flex size-7 items-center justify-center rounded-[5px] text-[12px]", index === 1 && "bg-gray-500 text-white")}>◇</span>
          ))}
        </nav>
        <aside className="w-[300px] shrink-0 border-r border-line bg-white">
          <div className="border-b border-line p-5">
            <p className="text-[13px] font-semibold text-info">‹ Contacts</p>
            <div className="mt-8 flex items-center gap-4">
              <span className="flex size-16 items-center justify-center rounded-full bg-warning text-xl font-semibold text-white">MJ</span>
              <div><h2 className="text-[22px] font-medium">Maria Johnson</h2><p className="mt-1 text-[13px]">Salesperson at HubSpot</p><p className="text-[13px]">maria@hubspot.com</p></div>
            </div>
            <div className="mt-7 flex justify-between text-center text-[11px]">
              {['Note','Email','Call','Task','Meeting'].map((item) => <span key={item}><i className="mx-auto mb-1 flex size-8 items-center justify-center rounded-full border border-control-border bg-secondary-bg not-italic">○</i>{item}</span>)}
            </div>
          </div>
          {['About this contact','Communication subscriptions','Website activity','Recent activity'].map((item, index) => (
            <div key={item} className="border-b border-line p-5">
              <p className="text-[13px] font-semibold">⌄ &nbsp;{item}</p>
              <div className="mt-5 space-y-2"><span className="block h-2 w-2/3 rounded bg-gray-200" /><span className="block h-2 w-1/2 rounded bg-gray-100" />{index > 1 ? <span className="block h-2 w-4/5 rounded bg-gray-100" /> : null}</div>
            </div>
          ))}
        </aside>
        <main className="min-w-0 flex-1 p-4">
          <div className="grid h-12 grid-cols-3 border border-line bg-white text-center text-[13px]"><span className="flex items-center justify-center font-semibold">Overview</span><span className="flex items-center justify-center border-x border-line">Activities</span><span className="flex items-center justify-center">Intelligence</span></div>
          <section className="mt-4 rounded-[4px] bg-white p-5 shadow-sm"><h3 className="font-semibold">Data highlights</h3><div className="mt-6 grid grid-cols-3 gap-8 text-center text-[12px]"><div><b>CREATE DATE</b><p className="mt-2">08/01/2025 1:57 PM</p></div><div><b>LIFECYCLE STAGE</b><p className="mt-2">Lead</p></div><div><b>LAST ACTIVITY DATE</b><p className="mt-2">08/19/2025 12:08 PM</p></div></div></section>
          <section className="mt-4 rounded-[4px] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-semibold">Recent activities</h3><span className="text-[13px] font-semibold text-info">Collapse all⌄</span></div><div className="mt-4 flex h-9 w-[300px] items-center gap-2 border border-control-border px-3 text-[13px] text-muted-foreground"><IconSearch size={16}/> Search activities</div><div className="mt-5 space-y-3">{['Sam Lee created a note','Task created via HubSpot Processing','Logged call to Maria Johnson','Meeting with Maria Johnson'].map((item, index) => <div key={item} className="rounded-[4px] border border-line p-4"><p className="text-[13px] font-semibold text-foreground">› &nbsp; {item}</p><p className="mt-3 text-[12px] text-muted-foreground">{index === 0 ? 'Will need a discussion!' : 'Activity details and contact history recorded in HubSpot.'}</p></div>)}</div></section>
        </main>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-white/25 backdrop-blur-[1.5px]" />
    </div>
  );
}

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * How the call left the agent's hands, once it has. A transfer that completed
 * and a voicemail that finished playing both end the line, and the panel has
 * to say so — a live clock still ticking under a call that has moved on is the
 * one thing worse than no readout at all.
 */
type CallOutcome = { label: string; detail: string };

export function CrmInCallPrototype() {
  const [tab, setTab] = useState<AssistTab>("script");
  /* Which script is running. The picker lives in the Script pane's own header,
     so both panes read the choice off one piece of state. */
  const [scriptId, setScriptId] = useState(CALL.id);
  const scenario =
    CALL_SCENARIOS.find((item) => item.id === scriptId) ?? CALL;
  const [elapsedMs, setElapsedMs] = useState(14_000);
  const [notes, setNotes] = useState<NotesEditorValue>({ html: "", text: "" });

  /** Which control owns the region over the tabs. One at a time, like the bar. */
  const [panel, setPanel] = useState<CallPanel | null>(null);

  /* The box has to know the room it is in, so it can be capped and clamped. */
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const panelSize = {
    width: Math.min(PANEL_WIDTH, viewport.width - PANEL_MARGIN * 2),
    height: Math.min(PANEL_MAX_HEIGHT, viewport.height - PANEL_MARGIN * 2),
  };

  const drag = useDragPosition({
    size: panelSize,
    initial: "top-right",
    margin: PANEL_MARGIN,
    storageKey: PANEL_POSITION_KEY,
  });

  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);

  const live = !outcome;

  /**
   * Who the call went to, caught as the hand-off begins. The flow reports
   * completion without naming the target and has moved its stage on by then,
   * so the name has to be taken on the way past for the outcome line to say
   * anything more useful than "a colleague".
   */
  const handedTo = useRef<string | null>(null);

  /**
   * The three flows are the dialer's own, out of `CallLineControls`.
   *
   * This is what mirroring the live bar actually costs: running its logic and
   * saying its words, not standing up a second implementation that agrees with
   * it on the day it is written. The panel had its own transfer state and its
   * own copy before, and the two rows had already drifted — the dialer asked
   * "Transfer to" over My Team and Contacts while this said "Search people or
   * teams".
   */
  const keypad = useKeypad();
  const transfer = useTransferFlow({
    customerName: CALL.contactName,
    elapsedMs,
    customerHeld: onHold,
    onCustomerHoldChange: setOnHold,
    onCallHandedOff: () =>
      setOutcome({
        label: "Call transferred",
        detail: `Handed to ${handedTo.current ?? "a colleague"}`,
      }),
  });
  const voicemail = useVoicemailDrop({
    greetings: voicemailLibrary(),
    onDropped: () =>
      setOutcome({
        label: "Voicemail dropped",
        detail: "The greeting finished playing",
      }),
  });

  useEffect(() => {
    if (!live) return;
    const startedAt = Date.now() - elapsedMs;
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => window.clearInterval(timer);
    // elapsedMs is the seed, not a dependency — re-running on every tick would
    // rebuild the interval each second and drift the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  /**
   * The line is on its way somewhere else. Nothing else may touch it — a mute
   * toggled while a blind transfer is completing applies to a call the agent
   * no longer has.
   */
  const busy = transfer.stage.kind === "handing-off" || voicemail.running;

  /* Catch the target while the stage still carries it — see `handedTo`. */
  useEffect(() => {
    if (transfer.stage.kind === "handing-off") {
      handedTo.current = transfer.stage.target.name;
    }
  }, [transfer.stage]);

  /* A call that has ended has no panel to keep open. */
  useEffect(() => {
    if (!live) setPanel(null);
  }, [live]);

  /**
   * Clicking a control that is already showing puts it away — the same gesture
   * opened it, so the same gesture should close it. The ✕ in the panel header
   * is the other way out, for when the agent's attention is on the panel
   * rather than on the row of controls above it.
   */
  const togglePanel = (next: CallPanel) =>
    setPanel((current) => (current === next ? null : next));

  const closePanel = () => setPanel(null);

  const statusLabel = live
    ? lineStatusLabel(transfer, voicemail, onHold)
    : outcome!.detail;

  return (
    <div className="relative h-screen min-h-[640px] overflow-hidden bg-secondary-bg">
      <HubSpotPlaceholder />
      {/* Positioned by `translate` off the top-left rather than by `inset`, so
          a drag never touches layout — see `useDragPosition`. The lift while
          dragging is the only feedback that the box has come off its resting
          place; travel itself is the cursor's job, so it carries no transition
          mid-gesture and a short one for the keyboard's steps. */}
      <aside
        ref={drag.ref}
        aria-label="JustCall Agent Assist inside HubSpot"
        style={{
          width: panelSize.width,
          height: panelSize.height,
          translate: `${drag.position.x}px ${drag.position.y}px`,
        }}
        className={cn(
          "absolute top-0 left-0 z-10 flex flex-col overflow-hidden rounded-xl border border-line bg-white",
          drag.dragging
            ? "shadow-500 transition-none"
            : "shadow-400 transition-[translate] duration-fast ease-standard motion-reduce:transition-none"
        )}
      >
        {/* The title bar is the grip. */}
        <header
          {...drag.handleProps}
          className={cn(
            "flex h-12 shrink-0 touch-none items-center justify-between border-b border-line px-4 outline-none select-none focus-visible:ring-2 focus-visible:ring-brand/24",
            drag.dragging ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          <div className="flex items-center gap-1">
            {/* The mark carries its own padding from the favicon export, so the
                gap to the wordmark is one step tighter than it looks. */}
            <img src={justcallMark} alt="" aria-hidden="true" className="size-7 shrink-0" />
            <span className="text-label-md-semi text-foreground">JustCall</span>
          </div>
          <button type="button" aria-label="Close panel" className="text-muted-foreground hover:text-foreground">
            <IconClose size={20} />
          </button>
        </header>

        <section className="shrink-0 bg-dialer-surface px-4 py-3 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-label-md-semi">Elena Vasquez</p>
              {/* One line under the name, and the line that matters most: a
                  transfer or a drop is about to take the call away, which
                  outranks the hold it put the customer on to get there. */}
              <p className="mt-0.5 truncate text-[12px] text-white/70">
                +1 (415) 555-0142 · {live ? formatDuration(elapsedMs) : outcome!.label}
                {statusLabel ? ` · ${statusLabel}` : ""}
              </p>
            </div>
            {/* Recording and the signal meter both report on the line rather
                than on the call, so they share the row the caller's name is
                on. The pill used to hold a 38px row of its own, which in a
                430px panel is a row of the script the agent could have been
                reading instead. */}
            {live ? (
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-white px-2 text-[11px] font-medium text-error">
                  <i className="size-2 rounded-full bg-error not-italic" />
                  Recording
                </span>
                <div className="flex items-end gap-[3px]" aria-label="Strong connection">
                  {[8, 12, 16, 20].map((height) => (
                    <span key={height} className="w-[3px] rounded-full bg-success" style={{ height }} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {live ? (
            <>
              {/* The dialer's live bar, in the order the dialer has it: the two
                  toggles that interrupt the line, then the four controls that
                  open a surface, then End call. `BarControl` rather than a
                  local circle — this row and the workspace's row are the same
                  control, and a second implementation is how they drift. */}
              <div className="mt-3 flex items-center gap-2">
                <BarControl
                  label="Mute"
                  tone="interrupt"
                  pressed={muted}
                  disabled={busy}
                  onClick={() => setMuted((value) => !value)}
                >
                  {muted ? <IconCallMuted size={20} /> : <IconVoice size={20} />}
                </BarControl>
                <BarControl
                  label="Hold"
                  tone="interrupt"
                  pressed={onHold}
                  disabled={busy || transfer.stage.kind !== "picking"}
                  onClick={() => setOnHold((value) => !value)}
                >
                  <IconCallHold size={20} />
                </BarControl>
                <BarControl
                  label="Keypad"
                  pressed={panel === "keypad"}
                  tooltipDisabled={panel === "keypad"}
                  disabled={busy}
                  onClick={() => togglePanel("keypad")}
                >
                  <IconCallKeypad size={20} />
                </BarControl>
                <BarControl
                  label="Transfer"
                  pressed={panel === "transfer" || transfer.active}
                  tooltipDisabled={panel === "transfer"}
                  disabled={busy}
                  onClick={() => togglePanel("transfer")}
                >
                  <IconCallTransfer size={20} />
                </BarControl>
                <BarControl
                  label="Voicemail drop"
                  pressed={panel === "voicemail" || voicemail.running}
                  tooltipDisabled={panel === "voicemail"}
                  disabled={busy}
                  onClick={() => togglePanel("voicemail")}
                >
                  <IconVoicemailDrop size={20} />
                </BarControl>
                {/* Notes carries a dot when there is something in it, so the
                    agent can tell a shut panel from an empty one. */}
                <BarControl
                  label="Notes"
                  pressed={panel === "notes"}
                  tooltipDisabled={panel === "notes"}
                  badge={Boolean(notes.text.trim()) && panel !== "notes"}
                  onClick={() => togglePanel("notes")}
                >
                  <IconCallNotes size={20} />
                </BarControl>
                {/* The dialer's End call button, not a smaller relative of
                    it: same white pill, same hangup mark off the same asset,
                    same label type. It read as a different button before
                    because it was one — a text glyph and an ad-hoc 11px. */}
                <button
                  type="button"
                  onClick={() =>
                    setOutcome({ label: "Call ended", detail: "Ended by you" })
                  }
                  className="ml-auto flex h-10 shrink-0 items-center gap-2 rounded-full bg-white pr-4 pl-3 outline-none transition-colors duration-base hover:bg-surface-hover focus-visible:ring-4 focus-visible:ring-white/30 active:scale-[0.97]"
                >
                  <span className="relative size-6 shrink-0 overflow-clip">
                    <img src={hangupIcon} alt="" className="size-full object-contain" />
                  </span>
                  <span className="text-label-sm whitespace-nowrap text-error">
                    End call
                  </span>
                </button>
              </div>
            </>
          ) : null}
        </section>

        {/* The tabs and everything a control can open share one region, so a
            surface arrives *over* the tab row rather than pushing it up: the
            panel is a detour, and the view the agent was reading is exactly
            where they left it when the panel goes away. */}
        <div className="relative min-h-0 flex-1">
          <div className="flex h-full min-h-0 flex-col">
            <Tabs
              items={[{ key: "script", label: "Script" }, { key: "guidance", label: "Guidance" }]}
              value={tab}
              onValueChange={(key) => setTab(key as AssistTab)}
              className="grid h-11 w-full shrink-0 grid-cols-2 gap-0 border-b border-line px-1 [&>button]:items-center"
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              {/* The Script pane keeps its header here — hidden everywhere
                  else in this panel — because that header is where the script
                  picker lives. Its title is dropped: the tab above already
                  says "Script". */}
              {tab === "script" ? <AgentAssistCallSheet elapsedMs={elapsedMs} scenario={scenario} onScenarioChange={setScriptId} scope="v1" guidanceDetached titleHidden transcriptDetached className="h-full [&>header]:h-9" /> : null}
              {tab === "guidance" ? <LiveAgentAssistPanel elapsedMs={elapsedMs} scenario={scenario} scope="v1" className="h-full [&>header]:hidden" /> : null}
            </div>
          </div>

          <CallPanelLayer
            panel={panel}
            notes={notes}
            onNotesChange={setNotes}
            keypad={keypad}
            transfer={transfer}
            voicemail={voicemail}
            onClose={closePanel}
          />
        </div>
      </aside>
    </div>
  );
}

/**
 * What the line is doing, under the caller's name.
 *
 * One line, and the one the agent needs most: a transfer or a drop is about to
 * take the call away, which outranks the hold it put the customer on to get
 * there. Null when there is nothing to say and the clock should stand alone.
 *
 * Local rather than imported because it reads the dialer's flows, which report
 * a richer set of stages than a single bar caption should try to narrate — a
 * consult and a merged call are both "3 participants" to the panel, and only
 * one of them is worth saying here.
 */
function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

function lineStatusLabel(
  transfer: TransferFlow,
  voicemail: VoicemailFlow,
  onHold: boolean
): string | null {
  if (voicemail.running) return "Dropping voicemail";
  const stage = transfer.stage;
  // First name only: the bar's line shares its row with the clock, and the
  // full name is what pushes the two apart.
  if (stage.kind === "handing-off") return `Transferring to ${firstName(stage.target.name)}`;
  if (transfer.merged) return "3-way call";
  if (stage.kind !== "picking") return `Consulting ${firstName(stage.target.name)}`;
  if (onHold) return "On hold";
  return null;
}

/** What each surface is called, for the dialog wrapper's accessible name. */
const PANEL_LABELS: Record<CallPanel, string> = {
  keypad: "Keypad",
  transfer: "Transfer call",
  voicemail: "Voicemail drop",
  notes: "Call notes",
};

/**
 * The surface a control opened, kept mounted through its exit.
 *
 * Reuses `.phone-sheet` for the enter and exit rather than declaring a second
 * set of keyframes: the dialer's sheets travel up 12px into place and leave in
 * one step less, and a panel that behaves differently here would read as a
 * different kind of object in the same product.
 */
function CallPanelLayer({
  panel,
  notes,
  onNotesChange,
  keypad,
  transfer,
  voicemail,
  onClose,
}: {
  panel: CallPanel | null;
  notes: NotesEditorValue;
  onNotesChange: (value: NotesEditorValue) => void;
  keypad: KeypadFlow;
  transfer: TransferFlow;
  voicemail: VoicemailFlow;
  onClose: () => void;
}) {
  const { mounted, state } = usePresence(Boolean(panel), DURATION.base);

  /**
   * The panel being animated out is the panel that was open, not the null that
   * replaced it — reading `panel` during the exit would blank the card for the
   * length of its own animation.
   */
  const [shown, setShown] = useState<CallPanel | null>(panel);
  useEffect(() => {
    if (panel) setShown(panel);
  }, [panel]);

  if (!mounted || !shown) return null;

  return (
    <div
      role="dialog"
      aria-label={PANEL_LABELS[shown]}
      data-state={state}
      className="phone-sheet absolute inset-0 z-20 flex flex-col bg-background p-2"
    >
      {shown === "keypad" ? (
        <SurfaceCard
          icon={<IconCallKeypad size={16} />}
          title={KEYPAD_COPY.title}
          closeLabel="Close keypad"
          onClose={onClose}
        >
          {/* `fill` because this card is a whole panel tall, like the aside
              column the dialer puts the same body in. */}
          <KeypadBody keypad={keypad} fill active={state === "open"} />
        </SurfaceCard>
      ) : null}
      {shown === "transfer" ? (
        <SurfaceCard
          icon={<IconCallTransfer size={16} />}
          {...transferCopy(transfer)}
          closeLabel="Close transfer"
          onClose={onClose}
        >
          <TransferBody flow={transfer} />
        </SurfaceCard>
      ) : null}
      {shown === "voicemail" ? (
        <SurfaceCard
          icon={<IconVoicemailDrop size={16} />}
          {...voicemailCopy(voicemail)}
          closeLabel="Close voicemail drop"
          onClose={onClose}
        >
          <VoicemailBody flow={voicemail} />
        </SurfaceCard>
      ) : null}
      {shown === "notes" ? (
        <SurfaceCard
          icon={<IconCallNotes size={16} />}
          title="Call notes"
          description="Saved to this HubSpot contact."
          closeLabel="Close call notes"
          onClose={onClose}
        >
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <NotesEditor
              value={notes}
              onChange={onNotesChange}
              placeholder="Add notes from this call…"
              ariaLabel="Call notes"
              wrapperClassName="min-h-0 flex-1"
              className="h-full min-h-[200px]"
            />
          </div>
        </SurfaceCard>
      ) : null}
    </div>
  );
}

/**
 * The card all four surfaces wear: header, optional subtext, and the ✕ that is
 * the other way out when the agent's attention is on the panel rather than on
 * the row of controls above it.
 *
 * The three call surfaces take their titles from `CallLineControls`' own copy
 * helpers, so a stage the dialer renames is renamed here in the same commit
 * rather than the next time somebody notices.
 *
 * Notes is written here rather than beside them because its destination is
 * this CRM's contact record — the workspace's Notes panel saves somewhere else.
 */
function SurfaceCard({
  icon,
  title,
  description,
  closeLabel,
  onClose,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[16px] border border-line bg-white">
      <header className="flex h-11 shrink-0 items-center justify-between gap-1.5 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
            {icon}
          </span>
          <p className="truncate text-label-md-semi text-foreground">{title}</p>
        </div>
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="flex size-6 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={16} />
        </button>
      </header>
      {description ? (
        <p className="shrink-0 border-b border-line px-4 py-2.5 text-paragraph-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
