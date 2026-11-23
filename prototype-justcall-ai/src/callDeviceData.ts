/**
 * Fixtures for the webphone's own state — the parts of a call that are about
 * the line and the hardware rather than about the conversation.
 *
 * `callSimulation.ts` authors what is *said* on a call. This authors what the
 * phone knows while it is said: which mic is picked up, how the connection is
 * holding, who a call could be handed to, which greeting gets dropped. The two
 * are kept apart because they change for different reasons — a new demo script
 * shouldn't touch the device list.
 */

/* ── Audio devices ─────────────────────────────────────────────────────── */

export interface AudioDevice {
  id: string;
  label: string;
}

/**
 * The device lists the webphone actually shows, named the way the browser names
 * them: a `Default - …` pseudo-device that follows whatever the OS is set to,
 * then the real devices behind it, then anything virtual a meeting app has
 * installed. The `Default - ` prefix is part of the label rather than a flag,
 * because that is the string the agent reads in the OS sound panel too — a
 * "(system default)" suffix we invent is a second name for the same thing.
 */
export const AUDIO_OUTPUTS: AudioDevice[] = [
  { id: "output-default", label: "Default - MacBook Pro Speakers (Built-in)" },
  { id: "output-builtin", label: "MacBook Pro Speakers (Built-in)" },
  { id: "output-zoom", label: "ZoomAudioDevice (Virtual)" },
];

export const AUDIO_INPUTS: AudioDevice[] = [
  { id: "input-default", label: "Default - MacBook Pro Microphone (Built-in)" },
  { id: "input-builtin", label: "MacBook Pro Microphone (Built-in)" },
  { id: "input-zoom", label: "ZoomAudioDevice (Virtual)" },
];

/**
 * Where the *ringer* plays, kept separate from where call audio plays. An
 * agent wearing a headset still wants the ring out loud, which is the only
 * reason this is a third list rather than a second use of the output one.
 */
export const RINGER_OUTPUTS: AudioDevice[] = [
  { id: "ringer-default", label: "Default - MacBook Pro Speakers (Built-in)" },
  { id: "ringer-builtin", label: "MacBook Pro Speakers (Built-in)" },
  { id: "ringer-zoom", label: "ZoomAudioDevice (Virtual)" },
];

/** Four steps, not a continuous slider — nobody tunes a ringer to 63%. */
export const VOLUME_STEPS = [0, 1, 2, 3, 4] as const;

/* ── Connection quality ────────────────────────────────────────────────── */

export type NetworkTier = "good" | "fair" | "poor";

export interface NetworkReading {
  tier: NetworkTier;
  /** Round-trip to the media server. */
  latencyMs: number;
  jitterMs: number;
  packetLossPct: number;
  /** How the machine is reaching the network right now. */
  connection: string;
}

export const NETWORK_TIERS: Record<
  NetworkTier,
  {
    /** Spelled out, for the bar's degraded caption and the trigger's label. */
    label: string;
    bars: number;
    /**
     * The one word both the popover header and the modal banner report. Held
     * lower case because the banner reads it mid-sentence ("…quality is
     * good"); the popover capitalises it in CSS.
     */
    word: string;
  }
> = {
  good: { label: "Good connection", bars: 4, word: "good" },
  fair: { label: "Weak connection", bars: 2, word: "fair" },
  poor: { label: "Poor connection", bars: 1, word: "poor" },
};

const READINGS: Record<NetworkTier, Omit<NetworkReading, "tier">> = {
  good: {
    latencyMs: 42,
    jitterMs: 6,
    packetLossPct: 0,
    connection: "Wi-Fi · JC-Office-5G",
  },
  fair: {
    latencyMs: 138,
    jitterMs: 34,
    packetLossPct: 1.8,
    connection: "Wi-Fi · JC-Office-5G",
  },
  poor: {
    latencyMs: 310,
    jitterMs: 71,
    packetLossPct: 6.4,
    connection: "Wi-Fi · JC-Office-5G",
  },
};

/**
 * The connection dips mid-call and recovers, on an authored arc rather than at
 * random — a demo has to be able to show the degraded bar on cue, and a random
 * walk means the one state worth showing might never appear. 45s in it drops to
 * `fair`, and by 1:15 it is back.
 *
 * Deliberately not per-scenario: this is the line, not the conversation, so it
 * plays the same way whichever script is running.
 */
export function networkTierAt(elapsedMs: number): NetworkTier {
  const s = elapsedMs / 1000;
  if (s >= 45 && s < 75) return "fair";
  return "good";
}

export function networkReadingAt(elapsedMs: number): NetworkReading {
  const tier = networkTierAt(elapsedMs);
  return { tier, ...READINGS[tier] };
}

/* ── Check your network ────────────────────────────────────────────────── */

/**
 * The popover the reception bars open — step one of the two-step flow the
 * design draws: read the verdict here, and only if the agent says the call is
 * actually suffering does the Call Quality modal open behind `action`.
 *
 * The wording is the design's, verbatim, including the missing "r" in "You
 * network" — it is the copy that shipped in Figma and the flow was signed off
 * on it.
 */
export const NETWORK_CHECK_COPY = {
  title: "Check your network",
  message: "You network is capable of handling VOIP calls.",
  prompt: "Having issues with the call?",
  action: "Troubleshoot",
} as const;

/* ── Call quality ──────────────────────────────────────────────────────── */

/**
 * Step two: the advice, as a modal over the phone. Two tabs, because the two
 * halves answer different questions — *what do I try now* and *what do I go
 * read* — and an agent mid-call only ever wants the first.
 */
export const CALL_QUALITY_COPY = {
  title: "Call Quality",
  /** The banner completes itself with the tier's own word. */
  banner: "Your network quality is ",
} as const;

export type QualityTipIcon =
  | "headphones"
  | "mic"
  | "levels"
  | "feedback"
  | "signal"
  | "network-test";

export interface QualityTip {
  icon: QualityTipIcon;
  text: string;
}

export interface QualityTipGroup {
  label: string;
  tips: QualityTip[];
}

/**
 * Grouped by *whose* problem it is. The agent's own devices come first
 * because they are the half the agent can act on without asking the customer
 * for anything.
 */
export const QUALITY_TIP_GROUPS: QualityTipGroup[] = [
  {
    label: "Audio device issues",
    tips: [
      {
        icon: "headphones",
        text: "Use high-quality audio devices such as headsets or handsets specifically designed for voice communication.",
      },
      {
        icon: "mic",
        text: "Position the microphone close to your mouth and adjust the volume to an appropriate level to ensure clear and audible voice transmission.",
      },
      {
        icon: "levels",
        text: "Adjust the volume settings on your audio devices and VoIP software to prevent audio feedback caused by high volume levels.",
      },
      {
        icon: "feedback",
        text: "Avoid placing your microphone too close to your speaker, as it can create a feedback loop.",
      },
      {
        icon: "headphones",
        text: "Regularly clean and maintain your audio devices to prevent any physical obstructions or audio quality degradation.",
      },
      {
        icon: "levels",
        text: "Reduce ambient noise, such as nearby speakers or fans.",
      },
    ],
  },
  {
    label: "Customer's network",
    tips: [
      {
        icon: "signal",
        text: "Check if the network is stable on your customer's end. If not, try contacting them on an alternate number.",
      },
      {
        icon: "network-test",
        text: "If customer is using internet for the call, help them troubleshoot by taking a network test and following the guidelines the network test suggests.",
      },
    ],
  },
];

export interface QualityHelpLink {
  title: string;
  href: string;
}

/**
 * The longer answers, which live in the help centre. They open in a new tab
 * deliberately — the one thing this modal must never do is take the agent off
 * the call they are on.
 */
export const QUALITY_HELP_LINKS: QualityHelpLink[] = [
  {
    title: "What does call quality mean for VOIP calls?",
    href: "https://help.justcall.io/en/articles/call-quality-voip",
  },
  {
    title:
      "How to configure your audio settings in the dialer for noise-free calls?",
    href: "https://help.justcall.io/en/articles/audio-settings",
  },
  {
    title: "How to configure your network settings for optimal call quality?",
    href: "https://help.justcall.io/en/articles/network-settings",
  },
];

/* ── Availability ──────────────────────────────────────────────────────── */

export type AvailabilityId = "available" | "busy" | "on-call" | "wrap-up";

export interface AvailabilityStatus {
  id: AvailabilityId;
  label: string;
  /** Tailwind background utility for the status dot. */
  dot: string;
  /** Says what it does to the queue — the only thing an agent needs from it. */
  hint: string;
  /**
   * Set by the phone rather than by the agent. `on-call` and `wrap-up` are
   * consequences of a call, so they never appear in the picker.
   *
   * Neither is what the agent's *own* phone reports any more — a call and its
   * wrap-up both collapse to Unavailable there, because the queue does one
   * thing with both (see `effectiveAvailability`). They survive here for the
   * floor and transfer views, where the whole question is *how* a colleague is
   * off the queue.
   */
  automatic?: boolean;
}

/**
 * Two statuses the agent owns, two the phone does.
 *
 * The pair the agent picks between is deliberately binary. A longer list looks
 * more expressive and reports worse: "On a break", "Lunch" and "Training" all
 * mean exactly one thing to the queue — don't ring this person — so anything
 * routing on status has to collapse them again. Splitting the question in two,
 * *are you taking calls* and then *why not*, keeps the status a routing fact
 * and moves the detail to the admin's reason list, where it is a label
 * for humans.
 */
export const AVAILABILITY_STATUSES: AvailabilityStatus[] = [
  {
    id: "available",
    label: "Available",
    dot: "bg-status-available",
    hint: "Taking calls from the queue",
  },
  {
    id: "busy",
    label: "Unavailable",
    // Red rather than amber: this is a stop, not a caution. Amber reads as
    // "still partly on the queue", and nothing rings through at all.
    //
    // Painted straight from the semantic error role. A `--color-status-busy`
    // that is only ever `var(--color-error)` paints a frozen copy of it
    // rather than following it (CLAUDE.md §3).
    dot: "bg-error",
    hint: "Nothing will ring through",
  },
  {
    id: "on-call",
    label: "On a call",
    dot: "bg-status-on-call",
    hint: "The queue will hold your next call",
    automatic: true,
  },
  {
    id: "wrap-up",
    label: "Wrap-up time",
    dot: "bg-status-wrap-up",
    hint: "Filing the last call before the next one",
    automatic: true,
  },
];

export function availabilityById(id: AvailabilityId): AvailabilityStatus {
  return (
    AVAILABILITY_STATUSES.find((status) => status.id === id) ??
    AVAILABILITY_STATUSES[0]
  );
}

/** The two the agent may pick between. The phone owns the other two. */
export const SELECTABLE_AVAILABILITY = AVAILABILITY_STATUSES.filter(
  (status) => !status.automatic
);

/* ── Unavailability reasons ────────────────────────────────────────────── */

/**
 * Why the agent is Unavailable — picked from a list rather than typed,
 * because the reason is what a supervisor reads on the floor view, and forty
 * spellings of "lunch" is not a floor view.
 *
 * The list belongs to the *admin*, not to the phone. JustCall names the
 * setting Unavailability Reasons, and every account authors its own: a support
 * floor tracks "Outage" and "Technical error", an outbound team tracks
 * "Travelling", a small team tracks neither. So the id is an open string
 * rather than a union — a union would claim the six below are the only reasons
 * that can exist, which is the one thing an admin-authored list disproves.
 *
 * Going Unavailable from the dialer requires one *when the account has any*:
 * an agent who is off the queue without a reason is a state a floor lead can
 * do nothing with. An account whose admin has set none up asks for nothing,
 * because there is nothing to ask.
 */
export type BusyReasonId = string;

export interface BusyReason {
  id: BusyReasonId;
  label: string;
  /**
   * Retired rather than deleted. A reason an agent picked this morning is
   * still on this morning's floor view, so an admin who stops offering
   * "Training" switches it off — deleting it would leave those calls naming
   * something the account no longer defines.
   */
  enabled: boolean;
}

/** What the account ships with, before an admin edits the list. */
export const SEED_BUSY_REASONS: BusyReason[] = [
  { id: "break", label: "On a break", enabled: true },
  { id: "lunch", label: "Lunch", enabled: true },
  { id: "meeting", label: "In a meeting", enabled: true },
  { id: "training", label: "Training", enabled: true },
  { id: "admin", label: "Admin work", enabled: true },
  { id: "dnd", label: "Do not disturb", enabled: true },
];

/**
 * Resolved against the whole list rather than the offered one, so a status set
 * before its reason was retired still reads by name.
 */
export function busyReasonById(
  reasons: BusyReason[],
  id: BusyReasonId | null
): BusyReason | null {
  if (!id) return null;
  return reasons.find((reason) => reason.id === id) ?? null;
}

/** The ones an agent may pick right now. */
export function offeredBusyReasons(reasons: BusyReason[]): BusyReason[] {
  return reasons.filter((reason) => reason.enabled);
}

let busyReasonCounter = 0;

export function newBusyReasonId(): BusyReasonId {
  busyReasonCounter += 1;
  return `bzr-${Date.now().toString(36)}-${busyReasonCounter.toString(36)}`;
}

/* ── Transfer targets ──────────────────────────────────────────────────── */

export type TransferKind = "agent" | "external";

export interface TransferTarget {
  id: string;
  name: string;
  kind: TransferKind;
  /** What they do — the role for a teammate, the relationship for a contact. */
  meta: string;
  /** Internal extension. A teammate has one; a saved contact does not. */
  extension?: string;
  /** The number that gets dialled, for somebody off the phone system. */
  number?: string;
  availability: AvailabilityId;
  /**
   * Available on paper, away from the desk. Exactly one target rings out, so
   * the failure Figma draws as a banner over the call has somewhere to come
   * from — a demo that can only ever show the happy path can't show what
   * happens when the second leg never picks up.
   */
  ringsOut?: true;
}

/**
 * Who a call can be handed to: a named teammate, or a saved contact. The two
 * tabs the picker offers, and nothing else.
 *
 * Not a queue, deliberately. Routing *into* a queue is what the IVR does
 * before the call ever reaches an agent; by the time somebody is on the line,
 * "let me put you through to Billing" only tells the customer they are about
 * to wait again. A name is a promise the agent can make out loud before they
 * hand the call over, which is why the design lists people.
 */
export const TRANSFER_TARGETS: TransferTarget[] = [
  // My Team — everyone on the phone system, in directory order. Teammates who
  // can't take the call stay on the list rather than being filtered out: an
  // agent hunting for Diego needs to learn he is on a call, not to wonder
  // whether he still works here.
  {
    id: "priya",
    name: "Priya Nair",
    kind: "agent",
    meta: "Billing specialist",
    extension: "5070",
    availability: "available",
  },
  {
    id: "diego",
    name: "Diego Ramos",
    kind: "agent",
    meta: "Senior support",
    extension: "5112",
    availability: "available",
    ringsOut: true,
  },
  {
    id: "henry",
    name: "Henry Beachy",
    kind: "agent",
    meta: "Retention",
    extension: "5044",
    availability: "available",
  },
  {
    id: "saurabh",
    name: "Saurabh Bhardwaj",
    kind: "agent",
    meta: "Technical support",
    extension: "5203",
    availability: "available",
  },
  {
    id: "amara",
    name: "Amara Okafor",
    kind: "agent",
    meta: "Account manager",
    extension: "5081",
    availability: "on-call",
  },
  {
    id: "tom",
    name: "Tom Whitfield",
    kind: "agent",
    meta: "Solutions engineer",
    extension: "5129",
    availability: "busy",
  },
  {
    id: "mohit",
    name: "Mohit Singh",
    kind: "agent",
    meta: "Onboarding",
    extension: "5155",
    availability: "on-call",
  },

  // Contacts — saved numbers. Always reachable, because there is no presence
  // to read on the far end of one.
  {
    id: "ext-onboarding",
    name: "Onboarding line",
    kind: "external",
    meta: "Shared line",
    number: "+1 (415) 555-0188",
    availability: "available",
  },
  {
    id: "ext-sarah",
    name: "Sarah Kim",
    kind: "external",
    meta: "Implementation partner",
    number: "+1 (415) 328-9174",
    availability: "available",
  },
  {
    id: "ext-james",
    name: "James Rodriguez",
    kind: "external",
    meta: "Reseller — West",
    number: "+1 (628) 455-2081",
    availability: "available",
  },
  {
    id: "ext-aisha",
    name: "Aisha Patel",
    kind: "external",
    meta: "Escalation manager",
    number: "+1 (510) 773-6492",
    availability: "available",
  },
];

/** What the row shows under the name — the extension, or the number. */
export function transferTargetLine(target: TransferTarget): string {
  return target.extension ? `Ext: ${target.extension}` : (target.number ?? target.meta);
}

/** How long the second leg takes to pick up, so the warm transfer has a beat. */
export const TRANSFER_ANSWER_MS = 2200;
/** Handing over and dropping off — the caller is passed, not put on hold. */
export const TRANSFER_COMPLETE_MS = 900;

/* ── Voicemail drop ────────────────────────────────────────────────────── */

export interface VoicemailGreeting {
  id: string;
  label: string;
  /** Playback length, and how long the drop takes to run. */
  seconds: number;
  description: string;
}

export const VOICEMAIL_GREETINGS: VoicemailGreeting[] = [
  {
    id: "vm-followup",
    label: "Follow-up — no answer",
    seconds: 18,
    description: "Names the last touchpoint and asks for a callback.",
  },
  {
    id: "vm-intro",
    label: "First outreach",
    seconds: 24,
    description: "Cold intro with the one-line pitch.",
  },
  {
    id: "vm-renewal",
    label: "Renewal reminder",
    seconds: 15,
    description: "Flags the date and offers to talk it through.",
  },
];

/**
 * The library as the panel last left it, seeded with the drops the account
 * came with.
 *
 * Module-level on purpose. The dialer unmounts every time it is closed, and a
 * recording the agent just uploaded is not the kind of thing that should live
 * exactly as long as a panel — on the real product it is on the account, not
 * on the phone. This is the prototype's stand-in for that, which is why
 * `DialerPanel` seeds its state from here and writes back to it.
 */
let library: VoicemailGreeting[] = VOICEMAIL_GREETINGS;

export function voicemailLibrary() {
  return library;
}

export function setVoicemailLibrary(next: VoicemailGreeting[]) {
  library = next;
}

/* ── Call clock ────────────────────────────────────────────────────────── */

/**
 * The elapsed clock, as every surface that shows it wants it: hh:mm:ss, always
 * padded, so a call crossing a minute doesn't shift the digits beside it.
 *
 * It lives here rather than beside the dialer because the conference view in
 * the transfer panel reads the same clock — and a second copy of this is how
 * the bar and the panel end up disagreeing by a second.
 */
export function formatCallDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

/* ── Caller identity ───────────────────────────────────────────────────── */

/**
 * Numbers the demo directory knows. Anything else the agent dials is a number
 * with no record behind it, which is what puts the phone into its unknown-
 * caller state — the state is reachable by typing rather than by a toggle,
 * because that is how an agent reaches it for real.
 */
export const KNOWN_NUMBERS: Record<string, string> = {
  "919773110910": "discovery",
  "14155550142": "discovery",
  "14155550177": "account-issue",
  "14155550163": "billing",
};

/**
 * +1 (415) 555-0142 for a US number, +91 97731 10910 for the demo's Indian
 * one, and the raw digits for anything that fits neither — a half-typed number
 * should look half-typed, not be forced into a shape it doesn't have.
 */
export function formatPhoneNumber(digits: string): string {
  const clean = digits.replace(/\D/g, "");
  if (clean.length === 11 && clean.startsWith("1")) {
    const n = clean.slice(1);
    return `+1 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  }
  if (clean.length === 10) {
    return `+1 (${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
  }
  if (clean.length === 12 && clean.startsWith("91")) {
    const n = clean.slice(2);
    return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
  }
  return clean ? `+${clean}` : "";
}

/* ── Inbound (transferred) call ────────────────────────────────────────── */

/**
 * A call handed over by a colleague, as the demo offers it.
 *
 * Direction is carried here rather than on the call's phase, because almost
 * nothing about a call cares which way it was placed: once the agent accepts,
 * an inbound call is the same live call as any other and every surface should
 * treat it that way. What is genuinely inbound-only is the attribution — who
 * transferred it, and onto which line — so that is all this holds.
 *
 * `digits` is a directory number on purpose (see `KNOWN_NUMBERS`), so the
 * identity block resolves a name the way it does for a dialled call. The
 * scenario is the support script, which is the conversation a transferred call
 * actually lands in.
 */
export interface InboundCall {
  digits: string;
  scenarioId: string;
  /** The colleague who handed it over — the same roster Transfer picks from. */
  transferredBy: TransferTarget;
  /** Which of the account's numbers the customer rang. */
  lineName: string;
}

export const INBOUND_CALL: InboundCall = {
  digits: "14155550177",
  scenarioId: "account-issue",
  // Amara is `on-call` in the roster, which is exactly why she is handing one
  // over. Picked over Priya Nair, whose first name collides with the caller's.
  transferredBy: TRANSFER_TARGETS.find((target) => target.id === "amara")!,
  lineName: "Line: Support · +1 (415) 555-0100",
};

/**
 * How long the agent sees the keypad before the transfer arrives. An authored
 * demo beat, so it sits beside `TRANSFER_ANSWER_MS` rather than in the motion
 * scale — CLAUDE.md §4 governs how far things travel, not when a fixture fires.
 */
export const INBOUND_ARRIVES_MS = 1400;
