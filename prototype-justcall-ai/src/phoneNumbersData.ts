/**
 * Phone Numbers fixtures — the Active tab of the live JustCall page. The first
 * nine are the real rows from the screenshot; the rest are generated
 * deterministically so pagination always shows the same numbers.
 */

export type Capability = "call" | "sms" | "mms";

/** Someone a number is shared with: a member (initials) or a whole team. */
export interface NumberShare {
  kind: "member" | "team";
  name: string;
}

export interface PhoneNumber {
  id: string;
  /** The friendly name set in number settings; absent shows the number alone. */
  label?: string;
  /** Display form, e.g. "(812) 994-4916". */
  number: string;
  /** E.164 digits, shown under a label. */
  digits: string;
  country: "us" | "uk";
  type: "Local" | "Mobile" | "Toll-free";
  /** What the number offers, in display order. */
  capabilities: Capability[];
  /** The subset still waiting on registration — shown greyed with an info icon. */
  pending: Capability[];
  owner: string;
  sharedWith: NumberShare[];
}

const m = (name: string): NumberShare => ({ kind: "member", name });
const t = (name: string): NumberShare => ({ kind: "team", name });

const SEED: PhoneNumber[] = [
  { id: "n1", number: "(812) 994-4916", digits: "18129944916", country: "us", type: "Local", capabilities: ["call", "sms", "mms"], pending: ["sms", "mms"], owner: "Anshu Prabhat", sharedWith: [] },
  { id: "n2", number: "(385) 406-3263", digits: "13854063263", country: "us", type: "Local", capabilities: ["call", "sms", "mms"], pending: ["sms", "mms"], owner: "Johnn Smith", sharedWith: [m("Anshu Prabhat"), t("Support")] },
  { id: "n3", number: "(270) 440-4017", digits: "12704404017", country: "us", type: "Local", capabilities: ["call", "sms", "mms"], pending: ["sms", "mms"], owner: "Johnn Smith", sharedWith: [] },
  { id: "n4", label: "some num test", number: "(540) 584-8749", digits: "15405848749", country: "us", type: "Local", capabilities: ["call", "sms", "mms"], pending: ["sms", "mms"], owner: "Biren Goyal", sharedWith: [m("Aditi Desai"), m("Arjun Chopra")] },
  { id: "n5", label: "same number 101", number: "(856) 567-5552", digits: "18565675552", country: "us", type: "Local", capabilities: ["call", "sms", "mms"], pending: ["sms", "mms"], owner: "Johnn Smith", sharedWith: [m("Saurabh Bhardwaj"), m("John Nolan"), t("Sales"), m("Mohit Singh"), m("Sourav Das"), t("Onboarding"), m("Tanc Dan"), m("Priya Rao")] },
  { id: "n6", label: "Test 101---", number: "(405) 786-8780", digits: "14057868780", country: "us", type: "Local", capabilities: ["call", "sms", "mms"], pending: [], owner: "Johnn Smith", sharedWith: [m("Mohit Singh"), m("Priya Rao"), t("Sales"), m("Daniel Walker"), m("Emma Brown"), m("Kabir Shah")] },
  { id: "n7", label: "dcc", number: "+44 7366 278701", digits: "447366278701", country: "uk", type: "Mobile", capabilities: ["call", "sms"], pending: [], owner: "Johnn Smith", sharedWith: [m("Priya Rao"), m("Bhavesh Gupta"), m("Aditi Desai"), m("Rohan Nair")] },
  { id: "n8", label: "test-ni", number: "(989) 709-3611", digits: "19897093611", country: "us", type: "Local", capabilities: ["call", "sms", "mms"], pending: ["sms", "mms"], owner: "Johnn Smith", sharedWith: [m("Priya Rao"), m("Bhavesh Gupta"), m("Aditi Desai"), m("Rohan Nair")] },
  { id: "n9", label: "test workflow v1", number: "(978) 547-9829", digits: "19785479829", country: "us", type: "Local", capabilities: ["call", "sms", "mms"], pending: ["sms", "mms"], owner: "Johnn Smith", sharedWith: [m("Priya Rao"), m("Bhavesh Gupta"), m("Aditi Desai"), m("Rohan Nair")] },
];

const AREA = ["212", "415", "646", "305", "617", "312", "702", "512", "206", "303", "404", "213"];
const OWNERS = ["Johnn Smith", "Anshu Prabhat", "Biren Goyal", "John Nolan", "Saurabh Bhardwaj"];
const LABELS = ["Support line", "Sales East", "Billing", "Campaign Q4", "Onboarding", "Front desk"];
const PEOPLE = ["Priya Rao", "Daniel Walker", "Meera Iyer", "Lucas Martin", "Sana Khan", "Emma Brown"];
const TEAMS = ["Sales", "Support", "Onboarding"];

function generated(i: number): PhoneNumber {
  const area = AREA[i % AREA.length];
  const mid = String(200 + ((i * 37) % 800));
  const end = String(1000 + ((i * 7919) % 9000));
  const shares: NumberShare[] = [];
  for (let s = 0; s < i % 5; s += 1) {
    shares.push(s === 2 ? t(TEAMS[i % TEAMS.length]) : m(PEOPLE[(i + s) % PEOPLE.length]));
  }
  return {
    id: `n${i + 1}`,
    label: i % 3 === 0 ? undefined : LABELS[i % LABELS.length],
    number: `(${area}) ${mid}-${end}`,
    digits: `1${area}${mid}${end}`,
    country: "us",
    type: i % 7 === 0 ? "Toll-free" : "Local",
    capabilities: ["call", "sms", "mms"],
    pending: i % 4 === 0 ? [] : ["sms", "mms"],
    owner: OWNERS[i % OWNERS.length],
    sharedWith: shares,
  };
}

/** 199 numbers, matching the live page's "1-10 of 199 items". */
export const PHONE_NUMBERS: PhoneNumber[] = [
  ...SEED,
  ...Array.from({ length: 199 - SEED.length }, (_, k) => generated(SEED.length + k)),
];

/** Tab counts from the live page — the Pending and Porting lists aren't modelled. */
export const PENDING_COUNT = "99+";
export const PORTING_COUNT = 28;
