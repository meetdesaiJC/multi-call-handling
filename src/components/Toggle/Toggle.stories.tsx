import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Toggle } from "./Toggle";

const meta = {
  title: "Components/Toggle",
  component: Toggle,
  parameters: { layout: "centered" },
  argTypes: {
    size: { control: "select", options: ["sm", "md"] },
    controlPosition: { control: "select", options: ["start", "end"] },
    label: { control: "text" },
    description: { control: "text" },
  },
} satisfies Meta<typeof Toggle>;

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

export const Disabled: Story = {
  args: { label: "Remember me", disabled: true },
};

export const ControlAtEnd: Story = {
  args: { label: "Remember me", controlPosition: "end" },
  decorators: [
    (Story) => (
      <div className="w-[327px]">
        <Story />
      </div>
    ),
  ],
};

/** Uncontrolled usage — clicking toggles its own state. */
export const Interactive: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(false);
    return <Toggle {...args} checked={checked} onCheckedChange={setChecked} />;
  },
  args: { label: "Remember me" },
};

/** The full matrix — every size crossed with every state. */
export const AllVariants: Story = {
  render: () => {
    const sizes = ["sm", "md"] as const;
    return (
      <div className="flex flex-col gap-4">
        {sizes.map((size) => (
          <div key={size} className="flex items-center gap-6">
            <Toggle size={size} />
            <Toggle size={size} defaultChecked />
            <Toggle size={size} disabled />
            <Toggle size={size} defaultChecked disabled />
          </div>
        ))}
      </div>
    );
  },
};
