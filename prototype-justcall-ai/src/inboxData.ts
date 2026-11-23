/**
 * SMS Inbox fixtures — the content of Figma "SMS Inbox – Handoff", node
 * 14329:100284. Each thread's last message is the preview; a thread with
 * `unread` shows the count badge, otherwise the delivery ticks.
 */

export interface InboxMessage {
  id: string;
  text: string;
  time: string;
  /** Inbound from the contact (left, with their avatar) or outbound (right). */
  direction: "in" | "out";
  /** Date divider shown above this message, e.g. "Today". */
  day?: string;
}

export interface InboxTag {
  label: string;
  tone: "success" | "warning";
}

export interface InboxThread {
  id: string;
  name: string;
  number: string;
  time: string;
  /** Unread count; when absent the row shows delivery ticks instead. */
  unread?: number;
  tags: InboxTag[];
  messages: InboxMessage[];
}

/** A thread whose only message is the one in its preview. */
function thread(
  id: string,
  name: string,
  number: string,
  time: string,
  text: string,
  opts: { unread?: number; direction?: "in" | "out"; tags?: InboxTag[] } = {}
): InboxThread {
  return {
    id,
    name,
    number,
    time,
    unread: opts.unread,
    tags: opts.tags ?? [],
    messages: [{ id: "m1", text, time, direction: opts.direction ?? "in", day: "Today" }],
  };
}

export const INBOX_THREADS: InboxThread[] = [
  thread(
    "t1",
    "Martin Culhane",
    "(246) 555-0115",
    "2:03 PM",
    "Sounds great! Could you set me up for this afternoon?",
    {
      unread: 1,
      tags: [
        { label: "Interested", tone: "success" },
        { label: "Repair", tone: "warning" },
      ],
    }
  ),
  thread("t2", "Ethan Caldwell", "(312) 555-0142", "1:47 PM", "Sure, thanks. Please send me this", {
    unread: 3,
    tags: [{ label: "Interested", tone: "success" }],
  }),
  thread(
    "t3",
    "Sophia Harrington",
    "(415) 555-0198",
    "1:29 PM",
    "Awesome! Yes, I’d love to be scheduled for this afternoon.",
    { unread: 2, tags: [{ label: "Follow Up", tone: "warning" }] }
  ),
  thread("t4", "+91 9660500274", "+91 9660500274", "1:12 PM", "Perfect timing! I’ll arrange this for you.", {
    direction: "out",
  }),
  thread("t5", "Liam Thompson", "(646) 555-0187", "1:05 PM", "Ok, noted", { direction: "out" }),
  thread(
    "t6",
    "+1 415 555 0123",
    "+1 415 555 0123",
    "12:48 PM",
    "Great! I’d appreciate it if you could set me up for this afternoon."
  ),
  thread("t7", "+44 20 7946 0958", "+44 20 7946 0958", "12:32 PM", "Sure, thanks"),
  thread("t8", "+44 20 3451 0958", "+44 20 3451 0958", "12:17 PM", "Yes, that sounds perfect!", {
    direction: "out",
  }),
  thread("t9", "+41 36 3211 0850", "+41 36 3211 0850", "12:02 PM", "Will send you the update soon!", {
    direction: "out",
  }),
];

/** The account number whose inbox is open. */
export const INBOX_NUMBER = { name: "Sales Contact", number: "+91 9660500274" };

export const INBOX_SEGMENTS = { left: "1,000 left", usedRatio: 56 / 230 };
