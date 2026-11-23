import type { AvatarColor, AvatarStatus } from "@/components/Avatar";

/**
 * Where a live call can go, and what the agent can leave behind.
 *
 * Transfer targets are deliberately not the Live Assist supervisors: asking a
 * supervisor for help keeps the customer on your line, handing the call over
 * gives them away. Mixing the two lists would suggest they are the same act.
 */

export type TransferTargetKind = "agent" | "team";

export interface TransferTarget {
  id: string;
  kind: TransferTargetKind;
  name: string;
  /** Used in the bar's status line, where the full name would crowd the clock. */
  shortName: string;
  /** The one line under the name — a role for a person, a queue depth for a team. */
  detail: string;
  /** Agents only. */
  initials?: string;
  color?: AvatarColor;
  status?: AvatarStatus;
}

/**
 * Ordered the way an agent picks: the people they know first, then the queues
 * they fall back to when nobody named is free.
 */
export const TRANSFER_TARGETS: TransferTarget[] = [
  {
    id: "dana",
    kind: "agent",
    name: "Dana Whitfield",
    shortName: "Dana",
    detail: "Account Executive",
    initials: "DW",
    color: "indigo",
    status: "available",
  },
  {
    id: "priya",
    kind: "agent",
    name: "Priya Raghavan",
    shortName: "Priya",
    detail: "Solutions Engineer",
    initials: "PR",
    color: "purple",
    status: "available",
  },
  {
    id: "marcus",
    kind: "agent",
    name: "Marcus Lee",
    shortName: "Marcus",
    detail: "Billing Specialist",
    initials: "ML",
    color: "orange",
    status: "on-call",
  },
  {
    id: "tomas",
    kind: "agent",
    name: "Tomás Herrera",
    shortName: "Tomás",
    detail: "Onboarding",
    initials: "TH",
    color: "pink",
    status: "dnd",
  },
  {
    id: "support-tier-2",
    kind: "team",
    name: "Support · Tier 2",
    shortName: "Tier 2",
    detail: "4 agents available · ~40s wait",
  },
  {
    id: "billing-queue",
    kind: "team",
    name: "Billing",
    shortName: "Billing",
    detail: "2 agents available · ~2m wait",
  },
];

export function transferTargetById(id: string): TransferTarget {
  return TRANSFER_TARGETS.find((item) => item.id === id) ?? TRANSFER_TARGETS[0];
}

/** A target the agent cannot hand a live customer to. */
export function targetUnavailable(target: TransferTarget): boolean {
  return target.status === "dnd";
}

export interface VoicemailGreeting {
  id: string;
  label: string;
  /** Shown under the name so the agent knows what is about to play. */
  preview: string;
  durationLabel: string;
}

export const VOICEMAIL_GREETINGS: VoicemailGreeting[] = [
  {
    id: "callback",
    label: "Callback request",
    preview:
      "Hi, this is Sam from JustCall — I was hoping to catch you about your team's call workflow. I'll try again tomorrow, or reach me on this number.",
    durationLabel: "0:14",
  },
  {
    id: "follow-up",
    label: "Follow-up on last call",
    preview:
      "Hi, Sam from JustCall following up on our conversation. I've sent the summary over by email — take a look and let me know what you think.",
    durationLabel: "0:11",
  },
  {
    id: "intro",
    label: "First touch",
    preview:
      "Hi, this is Sam from JustCall. We help support teams stop losing calls to voicemail — ironically. Happy to show you in ten minutes if that's useful.",
    durationLabel: "0:16",
  },
];
