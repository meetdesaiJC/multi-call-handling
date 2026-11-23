/**
 * Fixtures for the Live Monitoring page — Figma "Live monitoring" (node
 * 2002:25123). A frozen snapshot: the page is here to show that a Lite
 * license can reach live monitoring, not to simulate a call centre.
 */

export type LiveCallDirection = "inbound" | "outbound";
export type LiveCallStatus = "ringing" | "ivr" | "in-progress";

export interface LiveCall {
  id: string;
  direction: LiveCallDirection;
  status: LiveCallStatus;
  /** Absent while the call is still in the IVR — nobody has picked it up. */
  member?: string;
  phoneNumber: string;
  contact: string;
  /** Campaign the call came through, if any. */
  channel?: string;
  timeInSystem: string;
}

export const LIVE_CALLS: LiveCall[] = [
  { id: "c1", direction: "outbound", status: "ringing", member: "Olivia Rhye", phoneNumber: "UK Support", contact: "James Smith", channel: "New Campaign", timeInSystem: "1m 14s" },
  { id: "c2", direction: "outbound", status: "ivr", phoneNumber: "CS Netherlands", contact: "Michael Wilson", timeInSystem: "2m 4s" },
  { id: "c3", direction: "inbound", status: "in-progress", member: "Zara Ali", phoneNumber: "UK Support", contact: "+1 9100-200-2929", timeInSystem: "2m 24s" },
  { id: "c4", direction: "inbound", status: "in-progress", member: "Sofia Martinez", phoneNumber: "CS Italy", contact: "+1 929-393-9404", timeInSystem: "3m 9s" },
  { id: "c5", direction: "outbound", status: "in-progress", member: "Liam Chen", phoneNumber: "UK Sale Number", contact: "Maria Johnson", timeInSystem: "4m 8s" },
  { id: "c6", direction: "outbound", status: "in-progress", member: "Ethan Nguyen", phoneNumber: "+1 8339-292-8392", contact: "+1 7531-486-9235", channel: "Dental Follow-Up", timeInSystem: "6m 11s" },
  { id: "c7", direction: "outbound", status: "in-progress", member: "Ava Patel", phoneNumber: "UK Sale Number", contact: "Sophia Taylor", channel: "Flash Sale Campaign", timeInSystem: "7m 12s" },
  { id: "c8", direction: "inbound", status: "in-progress", member: "Noah Johnson", phoneNumber: "Canada Sales", contact: "Emily Davis", timeInSystem: "8m 13s" },
];

export const CALLERS_IN_QUEUE = 5;

export const SLA = {
  /** Percent of calls answered inside the SLA window. */
  rate: 80,
  deltaVsLastHour: "14%",
  missedCalls: 100,
  window: "30 secs",
};

export const LIVE_CALL_BREAKDOWN = [
  { label: "Inbound", value: "3" },
  { label: "Outbound", value: "2" },
  { label: "Sales Dialer", value: "3" },
];

export const QUEUE_SUMMARY = {
  total: 20,
  rows: [
    { label: "Max Wait Time", value: "4m 10s" },
    { label: "Avg Wait Time", value: "1m 20s" },
  ],
};

export const TEAM_SUMMARY = {
  total: 7,
  rows: [
    { label: "Available", value: "4", tone: "success" },
    { label: "In Call", value: "1", tone: "warning" },
    { label: "Unavailable", value: "2", tone: "error" },
  ] as const,
};
