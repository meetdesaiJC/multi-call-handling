import { LINES, type Caller } from "./webphoneCalls";

/**
 * A full queue, for reviewing how the queue list holds up past the one or two
 * callers the live demo produces. The ten callers of Figma 164:904, each with
 * how long they had been waiting when the frame was drawn, so the wait column
 * reads as a real queue — longest first — rather than ten identical clocks.
 */
const SAMPLE_QUEUE: (Caller & { waitedSeconds: number })[] = [
  {
    name: "Marcus Chen",
    number: "+1 (628) 555-0199",
    line: LINES.support,
    location: "San Francisco, US",
    crm: { id: "hubspot", contact: "Marcus Chen" },
    integrations: [
      { id: "hubspot", contact: "Marcus Chen" },
      { id: "salesforce", contact: "Marcus Chen (Northwind)" },
      { id: "zendesk", contact: "M. Chen" },
    ],
    waitedSeconds: 192,
  },
  {
    name: "Priya Raman",
    number: "+1 (312) 555-0187",
    line: LINES.support,
    location: "Chicago, IL",
    crm: { id: "hubspot", contact: "Priya Raman" },
    waitedSeconds: 168,
  },
  {
    number: "+1 (415) 555-0132",
    line: LINES.support,
    location: "San Francisco, CA",
    waitedSeconds: 125,
  },
  {
    name: "Daniel Okafor",
    number: "+44 20 7946 0958",
    line: LINES.support,
    location: "London, England",
    crm: { id: "hubspot", contact: "Daniel Okafor" },
    integrations: [
      { id: "hubspot", contact: "Daniel Okafor" },
      { id: "pipedrive", contact: "Dan Okafor" },
    ],
    waitedSeconds: 111,
  },
  {
    name: "Sofia Alvarez",
    number: "+1 (646) 555-0110",
    line: LINES.support,
    location: "New York, NY",
    crm: { id: "salesforce", contact: "Sofia Alvarez" },
    waitedSeconds: 90,
  },
  {
    number: "+1 (702) 555-0164",
    line: LINES.support,
    location: "Las Vegas, NV",
    waitedSeconds: 62,
  },
  {
    name: "Liam Becker",
    number: "+49 30 555 0143",
    line: LINES.support,
    location: "Berlin, BE",
    crm: { id: "hubspot", contact: "Liam Becker" },
    integrations: [
      { id: "hubspot", contact: "Liam Becker" },
      { id: "salesforce", contact: "Liam Becker (Kessler GmbH)" },
    ],
    waitedSeconds: 47,
  },
  {
    name: "Aisha Khan",
    number: "+1 (212) 555-0178",
    line: LINES.support,
    location: "New York, NY",
    crm: { id: "zendesk", contact: "Aisha Khan" },
    waitedSeconds: 31,
  },
  {
    number: "+1 (305) 555-0121",
    line: LINES.support,
    location: "Miami, FL",
    waitedSeconds: 18,
  },
  {
    name: "Noah Patel",
    number: "+1 (408) 555-0156",
    line: LINES.support,
    location: "San Jose, CA",
    crm: { id: "hubspot", contact: "Noah Patel" },
    integrations: [
      { id: "hubspot", contact: "Noah Patel" },
      { id: "salesforce", contact: "Noah R. Patel" },
      { id: "zendesk", contact: "Noah P." },
    ],
    waitedSeconds: 6,
  },
];

export const SAMPLE_QUEUE_MAX = SAMPLE_QUEUE.length;

/** The first `count` sample callers, their arrivals backdated from `now`. */
export function sampleQueue(count: number, now: number) {
  return SAMPLE_QUEUE.slice(0, count).map(({ waitedSeconds, ...caller }) => ({
    ...caller,
    arrivedAt: now - waitedSeconds * 1000,
  }));
}
