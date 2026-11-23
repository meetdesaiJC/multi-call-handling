import calendlyLogo from "./assets/integrations/calendly.svg";
import firefliesLogo from "./assets/integrations/fireflies.svg";
import salesmateLogo from "./assets/integrations/salesmate.svg";
import slackLogo from "./assets/integrations/slack.svg";
import teamwaveLogo from "./assets/integrations/teamwave.svg";

/**
 * Integrations › My Integrations — fixtures from Figma "Integrations - Active
 * Integrations" (node 9:64392).
 */

export type ConnectionStatus = "enabled" | "disabled" | "disconnected";

export interface ConnectionField {
  label: string;
  value: string;
  /** Shows the copy control. */
  copyable?: boolean;
  /**
   * Long values fill the row and truncate, with the copy control pinned to
   * the card's right edge; short ones keep it right after the value.
   */
  fill?: boolean;
}

export interface ConnectedIntegration {
  id: string;
  name: string;
  category: string;
  /** Brand mark, drawn at its own size inside the 40px monogram tile. */
  logo: { src: string; width: number; height: number };
  status: ConnectionStatus;
  fields: ConnectionField[];
}

const DEMO_FIELDS: ConnectionField[] = [
  { label: "Email ID", value: "demo@justcall.io", copyable: true },
  {
    label: "Account",
    value: "dev-5576442-justcall-enterprise-test-dev-5576442",
    copyable: true,
    fill: true,
  },
  { label: "Channel", value: "demodev-1", copyable: true },
];

const SLACK_LOGO = { src: slackLogo, width: 24, height: 24 };

export const CONNECTED_INTEGRATIONS: ConnectedIntegration[] = [
  {
    id: "slack-1",
    name: "Slack",
    category: "Productivity",
    logo: SLACK_LOGO,
    status: "enabled",
    fields: DEMO_FIELDS,
  },
  {
    id: "slack-2",
    name: "Slack",
    category: "Productivity",
    logo: SLACK_LOGO,
    status: "enabled",
    fields: DEMO_FIELDS,
  },
  {
    id: "salesmate",
    name: "Salesmate",
    category: "Productivity",
    logo: { src: salesmateLogo, width: 25, height: 12 },
    status: "enabled",
    fields: DEMO_FIELDS,
  },
  {
    id: "teamwave",
    name: "TeamWave",
    category: "Productivity",
    logo: { src: teamwaveLogo, width: 18, height: 23 },
    status: "disabled",
    fields: DEMO_FIELDS,
  },
  {
    id: "fireflies",
    name: "Fireflies",
    category: "Productivity",
    logo: { src: firefliesLogo, width: 20, height: 20 },
    status: "disconnected",
    fields: DEMO_FIELDS,
  },
  {
    id: "calendly",
    name: "Calendly",
    category: "Productivity",
    logo: { src: calendlyLogo, width: 23, height: 23 },
    status: "enabled",
    fields: [
      { label: "Email ID", value: "demo@justcall.io", copyable: true },
      { label: "Name", value: "Dev account base" },
    ],
  },
];
