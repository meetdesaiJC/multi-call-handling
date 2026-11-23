/**
 * Bulk SMS/MMS fixtures — Figma "Bulk Messages – Campaigns" (node 126:4939).
 * The first eight rows are the frame's own; the last two fill the page out to
 * the "Show 10" the pager promises, in the same voice.
 */

export type BulkSmsStatus = "completed" | "paused";

export interface BulkSmsCampaign {
  id: string;
  /** Who created it — shown as initials. */
  createdBy: string;
  name: string;
  /** The number the campaign sends from. */
  number: string;
  createdOn: string;
  startDate: string;
  status: BulkSmsStatus;
}

export const BULK_SMS_CAMPAIGNS: BulkSmsCampaign[] = [
  {
    id: "bs-1",
    createdBy: "Olivia Rhye",
    name: "Summer Sale Alert!",
    number: "+1-415-965-0995",
    createdOn: "18 Aug 2025, 07:18",
    startDate: "18 Aug 2025, 00:15",
    status: "completed",
  },
  {
    id: "bs-2",
    createdBy: "Olivia Rhye",
    name: "Exclusive Offer Just for You!",
    number: "+1-614-839-8415",
    createdOn: "14 Aug 2025, 02:18",
    startDate: "15 Aug 2025, 09:00",
    status: "completed",
  },
  {
    id: "bs-3",
    createdBy: "Olivia Rhye",
    name: "Flash Sale: Don't Miss Out!",
    number: "+1-320-314-6589",
    createdOn: "14 Aug 2025, 02:17",
    startDate: "14 Aug 2025, 00:15",
    status: "completed",
  },
  {
    id: "bs-4",
    createdBy: "Olivia Rhye",
    name: "Limited Time Discount!",
    number: "+1-614-839-8415",
    createdOn: "14 Aug 2025, 02:16",
    startDate: "1 Sep 2025, 00:05",
    status: "paused",
  },
  {
    id: "bs-5",
    createdBy: "Olivia Rhye",
    name: "VIP Access: Special Promotion!",
    number: "+1-320-314-6589",
    createdOn: "14 Aug 2025, 02:08",
    startDate: "15 Aug 2025, 09:00",
    status: "completed",
  },
  {
    id: "bs-6",
    createdBy: "Olivia Rhye",
    name: "Last Chance: Grab Your Deal!",
    number: "+1-320-314-6589",
    createdOn: "14 Aug 2025, 02:05",
    startDate: "15 Aug 2025, 09:00",
    status: "completed",
  },
  {
    id: "bs-7",
    createdBy: "Olivia Rhye",
    name: "New Arrivals: Check Them Out!",
    number: "+1-607-325-6200",
    createdOn: "13 Aug 2025, 04:57",
    startDate: "13 Aug 2025, 00:15",
    status: "completed",
  },
  {
    id: "bs-8",
    createdBy: "Olivia Rhye",
    name: "Thank You for Being a Loyal Customer!",
    number: "+1-607-325-6200",
    createdOn: "13 Aug 2025, 04:50",
    startDate: "14 Aug 2025, 09:00",
    status: "completed",
  },
  {
    id: "bs-9",
    createdBy: "Olivia Rhye",
    name: "Weekend Deals Are Here!",
    number: "+1-415-965-0995",
    createdOn: "12 Aug 2025, 11:32",
    startDate: "16 Aug 2025, 09:00",
    status: "completed",
  },
  {
    id: "bs-10",
    createdBy: "Olivia Rhye",
    name: "Back to School Savings",
    number: "+1-614-839-8415",
    createdOn: "11 Aug 2025, 06:40",
    startDate: "12 Aug 2025, 08:30",
    status: "completed",
  },
];

/** The account's campaign count — the fixture is one page of it. */
export const BULK_SMS_TOTAL = 103;
