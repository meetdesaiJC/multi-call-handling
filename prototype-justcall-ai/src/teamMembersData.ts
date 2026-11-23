import type { AvatarStatus } from "@/components/Avatar";

/** Fixture for the Team Members page, mirroring the live JustCall account. */
export type TeamMemberState = "active" | "invited" | "locked";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  timeZone: string;
  extension: string;
  /** Presence dot; omitted means offline (no dot). */
  status?: AvatarStatus;
  state: TeamMemberState;
}

const SEED: TeamMember[] = [
  { id: "m1", name: "Johnn Smith", email: "hubspot@saaslabs.co", role: "Owner", timeZone: "Etc/GMT+10", extension: "304", status: "available", state: "active" },
  { id: "m2", name: "Johnn 1 Smith", email: "samkdedit@justcall.io", role: "Migrated Team Member", timeZone: "Asia/Kolkata", extension: "5070", state: "active" },
  { id: "m3", name: "John Nolan", email: "alok@saaslabs.co", role: "Admin", timeZone: "America/New_York", extension: "1996", state: "active" },
  { id: "m4", name: "vicasso", email: "vicasso@whatastory.in", role: "Admin _234ae", timeZone: "Asia/Kolkata", extension: "5112", state: "invited" },
  { id: "m5", name: "Tanc Dan", email: "tanmaydayal@gmail.com", role: "Workflow Test Role", timeZone: "Asia/Hong_Kong", extension: "517", status: "available", state: "active" },
  { id: "m6", name: "Saurabh Bhardwaj", email: "saurabh@justcall.io", role: "SMS test", timeZone: "Asia/Kolkata", extension: "789", status: "available", state: "active" },
  { id: "m7", name: "Sourav Das", email: "sourav+2@justcall.io", role: "Admin _234ae", timeZone: "Pacific/Midway", extension: "532", status: "available", state: "active" },
  { id: "m8", name: "Mohit Singh", email: "mohit@justcall.io", role: "Team Member", timeZone: "Asia/Kolkata", extension: "535", state: "active" },
  { id: "m9", name: "Shashank Prasad", email: "shashank@saaslabs.co", role: "Migrated Team Member", timeZone: "Asia/Kolkata", extension: "536", state: "locked" },
  { id: "m10", name: "nazareth fernandez", email: "nazareth@saaslabs.co", role: "AEs - Team lead", timeZone: "America/New_York", extension: "538", state: "active" },
];

const FIRST = ["Aarav", "Priya", "Daniel", "Meera", "Lucas", "Sana", "Kabir", "Emma", "Rohan", "Olivia", "Arjun", "Nina", "Vikram", "Chloe", "Dev", "Isha"];
const LAST = ["Mehta", "Rao", "Walker", "Iyer", "Martin", "Khan", "Kapoor", "Brown", "Nair", "Davis", "Shah", "Lopez", "Reddy", "Clark", "Gupta", "Bose"];
const ROLES = ["Team Member", "Admin", "Migrated Team Member", "AEs - Team lead", "Supervisor"];
const ZONES = ["Asia/Kolkata", "America/New_York", "Europe/London", "Asia/Singapore", "America/Los_Angeles"];

/**
 * 211 members, matching the live page's "1-10 of 211 items". The first ten
 * are the real rows from the screenshot; the rest are generated
 * deterministically so pagination always shows the same people.
 */
export const TEAM_MEMBERS: TeamMember[] = [
  ...SEED,
  ...Array.from({ length: 201 }, (_, i): TeamMember => {
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 7) % LAST.length];
    return {
      id: `g${i}`,
      name: `${first} ${last}`,
      email: `${first}.${last}${i}@justcall.io`.toLowerCase(),
      role: ROLES[i % ROLES.length],
      timeZone: ZONES[(i * 3) % ZONES.length],
      extension: String(600 + i),
      status: i % 3 === 0 ? "available" : undefined,
      state: "active",
    };
  }),
];

/**
 * Custom roles defined on the account — the ones in use above that aren't the
 * built-in Owner / Admin / Team Member. Offered when an invite picks "Custom role".
 */
export const CUSTOM_ROLES = [
  "Admin _234ae",
  "AEs - Team lead",
  "Migrated Team Member",
  "SMS test",
  "Workflow Test Role",
];

/**
 * The account's contract, per "Non Calling Licenses — JC Lite and View-only".
 * Modelled on the doc's own example: a SalesPro plan discounted to $140 per
 * user per month, with 10 Full licenses. Everything below derives from these
 * two numbers, so changing the plan re-prices and re-caps the whole flow.
 */
export const ACCOUNT_PLAN = {
  name: "SalesPro",
  /** Discounted price of the regular plan, per user per month. */
  fullPrice: 140,
  /** Full (calling) licenses on the contract. */
  fullLicenses: 10,
} as const;

/** Lite: 50% of the discounted plan price, never below the $25 floor. */
export const LITE_PRICE = Math.max(25, ACCOUNT_PLAN.fullPrice * 0.5);
/** View-only: $10 default (sales may set it anywhere from $0 up). */
export const VIEW_ONLY_PRICE = 10;

/**
 * Allowances without special approval: Lite up to 50% of Full licenses,
 * View-only 1 per every 10 Full. The flow shows what's left of each.
 *
 * View-only is raised past that rule for the demo — at 1 of 1 the card
 * reads "0 licenses left" and the license can't be picked. Three allowed
 * with one in use leaves two, alongside Lite's three.
 */
export const LICENSE_SEATS = {
  lite: { total: Math.floor(ACCOUNT_PLAN.fullLicenses * 0.5), used: 2 },
  "view-only": { total: 3, used: 1 },
} as const;

/** Numbers already on the account, offered when an invite shares numbers. */
export const ACCOUNT_NUMBERS = [
  { value: "+14155550132", label: "+1 (415) 555-0132 · Sales Main" },
  { value: "+14155550178", label: "+1 (415) 555-0178 · Support Line" },
  { value: "+12125550199", label: "+1 (212) 555-0199 · NY Office" },
  { value: "+442079460321", label: "+44 20 7946 0321 · London" },
  { value: "+918045670012", label: "+91 80 4567 0012 · Bengaluru" },
];

/**
 * Billing for the review-and-pay step. Prices are per member per month, from
 * the license rules above. Dates are fixed rather than read from the clock so the
 * proration in the demo reads the same on every run.
 */
export const LICENSE_PRICING = {
  standard: { label: `${ACCOUNT_PLAN.name} license`, monthly: ACCOUNT_PLAN.fullPrice },
  lite: { label: "Lite license", monthly: LITE_PRICE },
  "view-only": { label: "View-only license", monthly: VIEW_ONLY_PRICE },
} as const;

export const BILLING = {
  /** Today, in the prototype's world. */
  today: "November 19, 2026",
  /** Last day of the current cycle, and the day the next one starts. */
  cycleEnds: "December 1, 2026",
  renewsOn: "December 2, 2026",
  taxRate: 0.08875,
  /** Days left in the cycle, and the cycle's length, for proration. */
  daysLeft: 13,
  cycleDays: 30,
  card: { brand: "VISA", last4: "6311", expires: "07-2026", nameOnCard: "Aryan" },
  address: "101, tapasya enclave, ddd, Karnataka, KA 201010, in",
  /** The account's Customer Success Manager — plan and billing changes go through them. */
  csm: { name: "Chaitanya", email: "chaitanya@saaslabs.co" },
} as const;

export type PlanChargeKey = "team-members" | "phone-numbers" | "add-ons" | "a2p-10dlc";

export interface PlanChargeRow {
  id: string;
  name: string;
  /** Second line under the name — an email, a phone number. */
  detail?: string;
  /** License type, shown in its own column on the team members tab. */
  license?: "Standard" | "Lite" | "View-only";
  /** What a phone number can do, shown as tags. */
  capabilities?: string[];
  monthly: number;
}

const BILLED_MEMBERS = TEAM_MEMBERS.filter((m) => m.state === "active");

/**
 * Everything the plan bills each month, one list per Plan details line item.
 * The line item totals are the sums of these rows, so the Billing card and the
 * breakdown modal can never disagree.
 *
 * Team members are the first active people on the account: as many Standard
 * as the contract has, then the Lite and View-only seats in use.
 */
export const PLAN_CHARGES: Record<
  PlanChargeKey,
  { label: string; column: string; rows: PlanChargeRow[] }
> = {
  "team-members": {
    label: "Team members",
    column: "Team members",
    rows: [
      ...BILLED_MEMBERS.slice(0, ACCOUNT_PLAN.fullLicenses).map((m) => ({
        id: m.id,
        name: m.name,
        license: "Standard" as const,
        monthly: ACCOUNT_PLAN.fullPrice,
      })),
      ...BILLED_MEMBERS.slice(
        ACCOUNT_PLAN.fullLicenses,
        ACCOUNT_PLAN.fullLicenses + LICENSE_SEATS.lite.used
      ).map((m) => ({ id: m.id, name: m.name, license: "Lite" as const, monthly: LITE_PRICE })),
      ...BILLED_MEMBERS.slice(
        ACCOUNT_PLAN.fullLicenses + LICENSE_SEATS.lite.used,
        ACCOUNT_PLAN.fullLicenses + LICENSE_SEATS.lite.used + LICENSE_SEATS["view-only"].used
      ).map((m) => ({ id: m.id, name: m.name, license: "View-only" as const, monthly: VIEW_ONLY_PRICE })),
    ],
  },
  "phone-numbers": {
    label: "Phone numbers",
    column: "Phone numbers",
    // Labels read "number · name"; the modal leads with the name, as Figma does.
    rows: ACCOUNT_NUMBERS.slice(0, 3).map((n, i) => {
      const [number, name] = n.label.split(" · ");
      return {
        id: n.value,
        name,
        detail: number,
        capabilities: [["Voice", "SMS", "Fax"], ["Voice", "SMS"], ["Voice"]][i],
        monthly: 15,
      };
    }),
  },
  "add-ons": {
    label: "Add-ons",
    column: "Add-ons",
    rows: [
      { id: "ai-review-assist", name: "AI Review Assist", monthly: 150 },
      { id: "recording-storage", name: "Extended call recording storage", monthly: 100 },
    ],
  },
  "a2p-10dlc": {
    label: "A2P 10DLC",
    column: "Registrations",
    rows: [
      { id: "brand", name: "Brand registration", monthly: 4 },
      { id: "campaign", name: "Sales outreach campaign", monthly: 10 },
    ],
  },
};

export const PLAN_CHARGE_KEYS = Object.keys(PLAN_CHARGES) as PlanChargeKey[];

export function planChargeTotal(key: PlanChargeKey): number {
  return PLAN_CHARGES[key].rows.reduce((sum, row) => sum + row.monthly, 0);
}

/**
 * A member's license, read off the billed team-member rows so the members
 * table, Edit Member and Billing can never disagree. Anyone not billed
 * (invited, locked) is Standard.
 */
export function memberLicense(id: string): NonNullable<PlanChargeRow["license"]> {
  return PLAN_CHARGES["team-members"].rows.find((row) => row.id === id)?.license ?? "Standard";
}

/**
 * The role a member shows. Lite and View-only carry fixed access rather than
 * a role picked from the list, so their role reads as the license itself —
 * a "Supervisor" next to "View-only" would claim powers the license doesn't
 * have.
 */
export function memberRole(member: TeamMember): string {
  const license = memberLicense(member.id);
  return license === "Standard" ? member.role : license;
}

/** The account's user groups, for the Team Members filter. */
export const USER_GROUPS = ["Sales", "Support", "Onboarding", "Collections"];

/**
 * Which group a member sits in. Derived from the id rather than stored on
 * every row, so the 211 fixtures stay one line each and always land in the
 * same group between reloads.
 */
export function memberGroup(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 9973;
  return USER_GROUPS[hash % USER_GROUPS.length];
}
