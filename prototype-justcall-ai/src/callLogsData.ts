/**
 * Call Logs fixtures — Figma "Call Logs", node 9:65151 (file aWdav5WH0bPWLz5fdXAUWb).
 * Rows 1–9 are the design's content verbatim. The frame's tenth row is cut
 * off mid-render, so its content is filled in from the row above it.
 */

export type CallDirection = "outgoing" | "incoming";
export type CallKind = "answered" | "missed" | "voicemail";

export interface CallLog {
  id: string;
  direction: CallDirection;
  kind: CallKind;
  /** Saved contact name; absent when the caller isn't in contacts. */
  contactName?: string;
  contactNumber: string;
  justCallName: string;
  justCallNumber: string;
  agent: string;
  status: "Completed";
  duration: string;
  when: string;
  disposition?: string;
}

export const CALL_LOGS: CallLog[] = [
  {
    id: "c1",
    direction: "outgoing",
    kind: "answered",
    contactName: "Manisha Somal",
    contactNumber: "+447498442259",
    justCallName: "Rishabh B UK",
    justCallNumber: "+447727800839",
    agent: "Rishabh Bhushan",
    status: "Completed",
    duration: "23s",
    when: "2 minutes ago",
  },
  {
    id: "c2",
    direction: "outgoing",
    kind: "answered",
    contactNumber: "+971552004604",
    justCallName: "Psrea UK",
    justCallNumber: "+447883316005",
    agent: "Psrea Singh",
    status: "Completed",
    duration: "1m 47s",
    when: "40 minutes ago",
  },
  {
    id: "c3",
    direction: "outgoing",
    kind: "answered",
    contactName: "Phil Birss",
    contactNumber: "+447834819139",
    justCallName: "Aditya UK",
    justCallNumber: "+447588688058",
    agent: "Aditya Raj",
    status: "Completed",
    duration: "12s",
    when: "Today, 01:25 PM",
  },
  {
    id: "c4",
    direction: "outgoing",
    kind: "answered",
    contactName: "070 3099 2996",
    contactNumber: "+447030992996",
    justCallName: "Aditya UK",
    justCallNumber: "+447588688058",
    agent: "Aditya Raj",
    status: "Completed",
    duration: "39s",
    when: "Today, 01:21 PM",
  },
  {
    id: "c5",
    direction: "outgoing",
    kind: "answered",
    contactName: "070 3099 2996",
    contactNumber: "+447030992996",
    justCallName: "Aditya UK",
    justCallNumber: "+447588688058",
    agent: "Aditya Raj",
    status: "Completed",
    duration: "2s",
    when: "Today, 01:19 PM",
  },
  {
    id: "c6",
    direction: "outgoing",
    kind: "answered",
    contactName: "070 3090 0571",
    contactNumber: "+447030900571",
    justCallName: "Aditya UK",
    justCallNumber: "+447588688058",
    agent: "Aditya Raj",
    status: "Completed",
    duration: "37s",
    when: "Today, 01:17 PM",
  },
  {
    id: "c7",
    direction: "outgoing",
    kind: "answered",
    contactName: "070 3099 3057",
    contactNumber: "+447030993057",
    justCallName: "Aditya UK",
    justCallNumber: "+447588688058",
    agent: "Aditya Raj",
    status: "Completed",
    duration: "8s",
    when: "Today, 01:17 PM",
  },
  {
    id: "c8",
    direction: "incoming",
    kind: "answered",
    contactNumber: "+12292070322",
    justCallName: "Anmol AU",
    justCallNumber: "+61468031198",
    agent: "Anmol Multani",
    status: "Completed",
    duration: "44s",
    when: "Today, 01:07 PM",
    disposition: "Call outcome",
  },
  {
    id: "c9",
    direction: "incoming",
    kind: "answered",
    contactName: "Ananya Pani",
    contactNumber: "+919019450325",
    justCallName: "Anmol AU",
    justCallNumber: "+61468031198",
    agent: "Anmol Multani",
    status: "Completed",
    duration: "4s",
    when: "Today, 12:59 PM",
    disposition: "Call outcome",
  },
  {
    id: "c10",
    direction: "incoming",
    kind: "answered",
    contactName: "Ananya Pani",
    contactNumber: "+919019450325",
    justCallName: "Anmol AU",
    justCallNumber: "+61468031198",
    agent: "Anmol Multani",
    status: "Completed",
    duration: "1m 02s",
    when: "Today, 12:41 PM",
    disposition: "Call outcome",
  },
];

/** The footer's totals — the design shows page 1 of a long log. */
export const CALL_LOGS_TOTAL = 2804;
export const CALL_LOGS_PAGE_COUNT = 281;
