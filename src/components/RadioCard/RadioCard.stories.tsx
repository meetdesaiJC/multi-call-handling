import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Tag } from "@/components/Tag";
import { IconAIVoiceAgent, IconEye, IconIVR, IconPhone } from "@/components/Icon";
import { RadioCard } from "./RadioCard";

const meta: Meta<typeof RadioCard> = {
  title: "Components/RadioCard",
  component: RadioCard,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof RadioCard>;

export const Default: Story = {
  args: {
    name: "single",
    title: "Standard",
    icon: <IconPhone size={24} />,
    description: "For people who call and message. Includes the dialer, SMS, and campaigns.",
  },
  decorators: [(Story) => <div className="w-[260px]"><Story /></div>],
};

export const Checked: Story = {
  args: { ...Default.args, defaultChecked: true },
  decorators: Default.decorators,
};

export const WithBadge: Story = {
  args: {
    name: "single",
    title: "Lite",
    badge: <Tag size="sm" color="blue-grey">3 licenses left</Tag>,
    description: "For people who set up and manage. No dialer, SMS, or campaigns.",
  },
  decorators: Default.decorators,
};

export const Disabled: Story = {
  args: {
    name: "single",
    title: "View-only",
    icon: <IconEye size={24} />,
    disabled: true,
    badge: <Tag size="sm" color="blue-grey">0 licenses left</Tag>,
    description: "View team activity and export reports. Editing is disabled.",
  },
  decorators: Default.decorators,
};

/** Without an icon, the check sits on the title line. */
export const WithoutIcon: Story = {
  args: { ...Default.args, icon: undefined, defaultChecked: true },
  decorators: Default.decorators,
};

/** Cards in a row so the options can be compared before choosing (Figma node 1:47). */
export const Group: Story = {
  render: () => {
    const [value, setValue] = useState<string>("workflow");
    const options = [
      {
        key: "workflow",
        title: "Call workflow",
        icon: <IconIVR size={24} />,
        description: "Build custom rules to route and handle every incoming call",
      },
      {
        key: "ai",
        title: "AI Voice Agent",
        icon: <IconAIVoiceAgent size={24} />,
        description: "Let an AI assistant answer, route, and log calls 24 × 7",
      },
      {
        key: "sip",
        title: "SIP Deskphone",
        icon: <IconPhone size={24} />,
        description: "Link your existing SIP desk phone to place and receive calls",
      },
    ];
    return (
      <div role="radiogroup" aria-label="Call handling" className="grid w-[720px] grid-cols-3 gap-4">
        {options.map((o) => (
          <RadioCard
            key={o.key}
            name="license"
            title={o.title}
            icon={o.icon}
            description={o.description}
            checked={value === o.key}
            onCheckedChange={(checked) => checked && setValue(o.key)}
          />
        ))}
      </div>
    );
  },
};
