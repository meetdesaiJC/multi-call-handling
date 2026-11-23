/**
 * Contacts › All Contacts fixtures — Figma node 9:41256. The design shows
 * page 3 of a 103-contact book; these are the eight rows it draws.
 */

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export const CONTACTS: Contact[] = [
  { id: "c1", name: "Olivia Rhye", phone: "(843) 461-5941", email: "stephanienicol@outlook.com" },
  { id: "c2", name: "Kathy Pacheco", phone: "(602) 309-9604", email: "iva838@outlook.com" },
  { id: "c3", name: "Ricky Smith", phone: "(830) 556-6651", email: "katie63@aol.com" },
  { id: "c4", name: "Lorri Warf", phone: "(618) 474-9169", email: "david291@gmail.com" },
  { id: "c5", name: "Rhonda Rhodes", phone: "(256) 289-9707", email: "paula611@gmail.com" },
  { id: "c6", name: "John Dukes", phone: "(920) 948-1722", email: "david291@gmail.com" },
  { id: "c7", name: "Iva Ryan", phone: "(303) 420-4261", email: "kurt_bates@outlook.com" },
  { id: "c8", name: "James Hall", phone: "(303) 569-1279", email: "patricia651@outlook.com" },
];

/** The address book the pagination describes, not just the rows on screen. */
export const CONTACTS_TOTAL = 103;
export const CONTACTS_PAGE = 3;
export const CONTACTS_PAGE_COUNT = 6;
