/**
 * Fixtures for Workflows — Figma "Workflows", node 9:66132. Copy is the
 * design's, row for row, so the prototype reads like the frame it came from.
 */

export type WorkflowStatus = "Active" | "Default" | "Draft";

export interface Workflow {
  id: string;
  name: string;
  status: WorkflowStatus;
  /** First number the workflow answers, and how many more beyond it. */
  number?: { value: string; more?: number };
  /** Null for the account's default workflow, which nobody authored. */
  updated: string | null;
  createdBy: { name: string; initials: string } | null;
  /**
   * Open for viewing only: the design shows this row with a disabled checkbox
   * and an eye in place of the pencil.
   */
  viewOnly?: boolean;
}

const JC_SALES = { name: "JC Sales", initials: "JS" };

export const WORKFLOWS: Workflow[] = [
  {
    id: "direct-line",
    name: "Direct Line",
    status: "Active",
    number: { value: "13157586007" },
    updated: "Yesterday, 05:31 PM",
    createdBy: JC_SALES,
    viewOnly: true,
  },
  {
    id: "nikhil-us",
    name: "DO NOT DELETE-Nikhil - US Number",
    status: "Default",
    number: { value: "12029333785", more: 487 },
    updated: null,
    createdBy: null,
  },
  {
    id: "wf-19168238566",
    name: "Workflow for 19168238566 & 32 more",
    status: "Active",
    number: { value: "13156057902" },
    updated: "Fri, 07 Aug 11:58 PM",
    createdBy: JC_SALES,
  },
  {
    id: "direct-line-copy",
    name: "Direct Line-copy-2719",
    status: "Draft",
    updated: "Fri, 07 Aug 01:22 PM",
    createdBy: JC_SALES,
  },
  {
    id: "untitled-xyz",
    name: "Untitled Workflow-xyz",
    status: "Draft",
    updated: "Fri, 07 Aug 01:19 PM",
    createdBy: { name: "Anand Bhagat", initials: "AB" },
  },
  {
    id: "test-tr050601",
    name: "Test TR050601",
    status: "Draft",
    updated: "Fri, 07 Aug 01:18 PM",
    createdBy: JC_SALES,
  },
  {
    id: "workflow-sample",
    name: "Workflow Sample",
    status: "Draft",
    updated: "Fri, 07 Aug 01:06 PM",
    createdBy: JC_SALES,
  },
  {
    id: "assignment-rohit",
    name: "Workflow Assignment- Rohit",
    status: "Draft",
    updated: "Wed, 05 Aug 08:21 PM",
    createdBy: { name: "Rohit Lakhanpal", initials: "RL" },
  },
  {
    id: "joel-assignment",
    name: "Joel - Assignment",
    status: "Active",
    number: { value: "18333530006" },
    updated: "Wed, 05 Aug 04:29 PM",
    createdBy: { name: "Joel Philip", initials: "JP" },
  },
  {
    id: "wf-15169903874",
    name: "Workflow for 15169903874",
    status: "Draft",
    updated: "Tue, 04 Aug 09:03 PM",
    createdBy: JC_SALES,
  },
];

/** The table's footer: the frame shows page 1 of 257 workflows. */
export const WORKFLOWS_TOTAL = 257;
