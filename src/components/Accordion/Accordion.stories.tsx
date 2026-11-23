import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Tag } from "@/components/Tag";
import { Toggle } from "@/components/Toggle";
import {
  IconAccountDetails,
  IconPhone,
  IconVoicemailMessage,
} from "@/components/Icon";

import { Accordion, AccordionItem } from "./Accordion";

const meta = {
  title: "Components/Accordion",
  component: Accordion,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    type: { control: "inline-radio", options: ["single", "multiple"] },
  },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>;
}

/**
 * The shape it was built for: a settings list on a surface too narrow to show
 * every group at once. One row open at a time, so the open one is never pushed
 * below the fold by the one above it.
 */
export const Default: Story = {
  args: { type: "single", children: null },
  render: (args) => (
    <div className="w-[360px] overflow-hidden rounded-lg border border-line bg-white">
      <Accordion {...args} defaultValue={["dialer"]}>
        <AccordionItem
          value="dialer"
          icon={<IconPhone size={20} />}
          label="Dialer Settings"
        >
          <Panel>
            <Toggle size="sm" label="Auto-answer inbound calls" />
            <Toggle size="sm" defaultChecked label="Play keypad tones" />
          </Panel>
        </AccordionItem>

        <AccordionItem
          value="voicemail"
          icon={<IconVoicemailMessage size={20} />}
          label="Voicemail Settings"
        >
          <Panel>
            <Toggle size="sm" defaultChecked label="Send me an email" />
          </Panel>
        </AccordionItem>

        <AccordionItem
          value="account"
          icon={<IconAccountDetails size={20} />}
          label="Account Settings"
        >
          <Panel>
            <p className="text-paragraph-md text-muted-foreground">
              sarah.johnson@justcall.io
            </p>
          </Panel>
        </AccordionItem>
      </Accordion>
    </div>
  ),
};

/**
 * `badge` sits between the label and the chevron. Reach for it when the badge
 * is the reason the row exists — an offer, an unread count, a "New" tag — not
 * to restate what the row already says.
 */
export const WithBadge: Story = {
  args: { type: "single", children: null },
  render: (args) => (
    <div className="w-[360px] overflow-hidden rounded-lg border border-line bg-white">
      <Accordion {...args}>
        <AccordionItem
          value="refer"
          label="Refer & Earn"
          badge={
            <Tag color="purple" size="sm">
              upto $200 gift card
            </Tag>
          }
        >
          <Panel>
            <p className="text-paragraph-md text-muted-foreground">
              Share your link and you both get credit on the first invoice.
            </p>
          </Panel>
        </AccordionItem>
      </Accordion>
    </div>
  ),
};

/**
 * `type="multiple"` keeps every opened row open. Worth it on a wide page where
 * two panels can be read side by side; on a narrow one it buries the second.
 */
export const Multiple: Story = {
  args: { type: "multiple", children: null },
  render: (args) => (
    <div className="w-[420px] overflow-hidden rounded-lg border border-line bg-white">
      <Accordion {...args} defaultValue={["one", "two"]}>
        {["one", "two", "three"].map((value, index) => (
          <AccordionItem
            key={value}
            value={value}
            label={`Section ${index + 1}`}
          >
            <Panel>
              <p className="text-paragraph-md text-muted-foreground">
                Panel {index + 1}. Opening a sibling leaves this one alone.
              </p>
            </Panel>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  ),
};
