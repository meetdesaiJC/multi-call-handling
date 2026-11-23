import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Radio } from "./Radio";

const meta = {
  title: "Components/Radio",
  component: Radio,
  parameters: { layout: "centered" },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    controlPosition: { control: "select", options: ["start", "end"] },
    label: { control: "text" },
    description: { control: "text" },
  },
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Remember me", name: "story-default" },
};

export const WithDescription: Story = {
  args: {
    label: "Remember me",
    description: "Save my login details for next time.",
    name: "story-description",
  },
};

export const Disabled: Story = {
  args: { label: "Remember me", disabled: true, name: "story-disabled" },
};

export const ControlAtEnd: Story = {
  args: { label: "Remember me", controlPosition: "end", name: "story-end" },
  decorators: [
    (Story) => (
      <div className="w-[286px]">
        <Story />
      </div>
    ),
  ],
};

/** A real group — arrow keys move the selection, only one can be checked. */
export const Group: Story = {
  render: () => {
    const [value, setValue] = useState("email");
    const options = [
      { value: "email", label: "Email" },
      { value: "sms", label: "SMS" },
      { value: "push", label: "Push notification" },
    ];
    return (
      <div className="flex flex-col gap-3">
        {options.map((option) => (
          <Radio
            key={option.value}
            name="story-group"
            label={option.label}
            checked={value === option.value}
            onCheckedChange={() => setValue(option.value)}
          />
        ))}
      </div>
    );
  },
};

/** The full matrix — every size crossed with every state. */
export const AllVariants: Story = {
  render: () => {
    const sizes = ["sm", "md", "lg"] as const;
    return (
      <div className="flex flex-col gap-4">
        {sizes.map((size) => (
          <div key={size} className="flex items-center gap-6">
            <Radio size={size} name={`matrix-${size}-a`} />
            <Radio size={size} name={`matrix-${size}-b`} defaultChecked />
            <Radio size={size} name={`matrix-${size}-c`} disabled />
            <Radio size={size} name={`matrix-${size}-d`} defaultChecked disabled />
          </div>
        ))}
      </div>
    );
  },
};
