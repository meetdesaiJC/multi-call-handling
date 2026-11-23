/**
 * Fixture for Sales Dialer › Campaigns, mirroring the live account's Active
 * tab. Totals are the account's real scale (1,737 active), so the pager reads
 * like production even though only one page of rows exists.
 */
export type DialingMode = "Power" | "Predictive" | "Dynamic";
export type CampaignStatus = "active" | "completed" | "archived";

/** Who a campaign dials for: a named agent, or a team / group (no initials). */
export interface CampaignAssignee {
  id: string;
  name: string;
  /** Teams and groups have no initials; they render the person glyph. */
  kind: "agent" | "group";
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  completed: number;
  total: number;
  mode: DialingMode;
  /** Callbacks past their scheduled time. 0 shows a dash. */
  overdue: number;
  /** Percent of dials that connected; null before any dial has gone out. */
  connectRate: number | null;
  assignees: CampaignAssignee[];
  createdBy: string;
}

const agent = (id: string, name: string): CampaignAssignee => ({ id, name, kind: "agent" });
const group = (id: string, name: string): CampaignAssignee => ({ id, name, kind: "group" });

/** Big rosters, spelled out so the "+N" overflow is the real count. */
function roster(prefix: string, count: number): CampaignAssignee[] {
  return Array.from({ length: count }, (_, i) => group(`${prefix}-${i}`, `Group ${i + 1}`));
}

export const CAMPAIGNS: Campaign[] = [
  { id: "3415600", name: "Test oct 27", status: "active", completed: 1, total: 1, mode: "Power", overdue: 0, connectRate: null, assignees: [agent("a1", "Johnn Smith")], createdBy: "Johnn Smith" },
  { id: "3411765", name: "New Campaign", status: "active", completed: 0, total: 3, mode: "Predictive", overdue: 0, connectRate: null, assignees: [agent("a2", "Alex Brown")], createdBy: "Johnn Smith" },
  { id: "3396594", name: "New Campaign", status: "active", completed: 2, total: 2, mode: "Predictive", overdue: 1, connectRate: 40, assignees: [agent("a1", "Johnn Smith"), group("g1", "Inbound Sales"), group("g2", "SDR West")], createdBy: "Johnn Smith" },
  { id: "3396568", name: "New Campaign", status: "active", completed: 2, total: 2, mode: "Dynamic", overdue: 0, connectRate: 50, assignees: roster("r1", 81), createdBy: "Johnn Smith" },
  { id: "3396067", name: "Re2: Re: New Campaign", status: "active", completed: 3, total: 3, mode: "Power", overdue: 0, connectRate: 80, assignees: [agent("a1", "Johnn Smith")], createdBy: "Johnn Smith" },
  { id: "3395760", name: "TEST Claude UX scan - renewals Q4", status: "active", completed: 0, total: 2, mode: "Dynamic", overdue: 0, connectRate: null, assignees: [agent("a2", "Alex Brown")], createdBy: "Johnn Smith" },
  { id: "3395755", name: "New Campaign", status: "active", completed: 2, total: 2, mode: "Predictive", overdue: 1, connectRate: 33, assignees: [agent("a1", "Johnn Smith"), agent("a3", "Jane Smith"), agent("a4", "John Nolan"), ...roster("r2", 144)], createdBy: "Johnn Smith" },
  { id: "3395402", name: "New Campaign", status: "active", completed: 15, total: 49, mode: "Power", overdue: 0, connectRate: 27, assignees: [agent("a3", "Jane Smith"), agent("a4", "John Nolan")], createdBy: "Johnn Smith" },
  { id: "3394011", name: "Webinar follow-ups", status: "active", completed: 88, total: 120, mode: "Dynamic", overdue: 4, connectRate: 46, assignees: [group("g3", "Webinar Team"), ...roster("r3", 6)], createdBy: "John Nolan" },
  { id: "3392870", name: "Trial expiring – EMEA", status: "active", completed: 12, total: 64, mode: "Predictive", overdue: 2, connectRate: 21, assignees: [agent("a5", "Saurabh Bhardwaj"), agent("a6", "Mohit Singh")], createdBy: "Saurabh Bhardwaj" },
  { id: "3388120", name: "Q3 renewals", status: "completed", completed: 210, total: 210, mode: "Power", overdue: 0, connectRate: 58, assignees: [agent("a4", "John Nolan")], createdBy: "John Nolan" },
  { id: "3381004", name: "Event leads – SaaStr", status: "completed", completed: 96, total: 96, mode: "Dynamic", overdue: 0, connectRate: 41, assignees: roster("r4", 3), createdBy: "Johnn Smith" },
  { id: "3370777", name: "Old pilot list", status: "archived", completed: 4, total: 40, mode: "Predictive", overdue: 0, connectRate: 12, assignees: [agent("a2", "Alex Brown")], createdBy: "Alex Brown" },
];

/** What the live account reports per tab — the pager reads these, not the fixture length. */
export const CAMPAIGN_TOTALS: Record<CampaignStatus, number> = {
  active: 1737,
  completed: 412,
  archived: 96,
};

/** The spam-risk nudge above the list. */
export const ANSWER_RATE_INSIGHT = { atRiskNumbers: 73, fixes: 3 };
