import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Checkbox } from "./Checkbox";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  parameters: { layout: "centered" },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    controlPosition: { control: "select", options: ["start", "end"] },
    label: { control: "text" },
    description: { control: "text" },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Remember me", size: "sm" },
};

export const WithDescription: Story = {
  args: {
    label: "Remember me",
    description: "Save my login details for next time.",
  },
};

export const Indeterminate: Story = {
  args: { label: "Select all", indeterminate: true, checked: false },
};

export const Disabled: Story = {
  args: { label: "Remember me", disabled: true },
};

export const ControlAtEnd: Story = {
  args: { label: "Remember me", controlPosition: "end" },
  decorators: [
    (Story) => (
      <div className="w-[286px]">
        <Story />
      </div>
    ),
  ],
};

/** Uncontrolled usage — clicking toggles its own state. */
export const Interactive: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(false);
    return <Checkbox {...args} checked={checked} onCheckedChange={setChecked} />;
  },
  args: { label: "Remember me" },
};

/** The full matrix — every size crossed with every state. */
export const AllVariants: Story = {
  render: () => {
    const sizes = ["sm", "md", "lg"] as const;
    return (
      <div className="flex flex-col gap-4">
        {sizes.map((size) => (
          <div key={size} className="flex items-center gap-6">
            <Checkbox size={size} />
            <Checkbox size={size} defaultChecked />
            <Checkbox size={size} indeterminate />
            <Checkbox size={size} disabled />
            <Checkbox size={size} defaultChecked disabled />
          </div>
        ))}
      </div>
    );
  },
};
