import type { Meta, StoryObj } from "@storybook/react-vite";

import { DotsLoader } from "./DotsLoader";

const meta = {
  title: "Components/DotsLoader",
  component: DotsLoader,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: { label: { control: "text" } },
} satisfies Meta<typeof DotsLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };

/** Standing in for a value that hasn't arrived — the Live Monitoring IVR row. */
export const InATableCell: Story = {
  args: { label: "Waiting for a team member" },
  render: (args) => (
    <div className="flex w-[360px] items-center justify-between rounded-md border border-line px-3 py-4 text-paragraph-md text-foreground">
      <span>Playing IVR</span>
      <DotsLoader {...args} />
    </div>
  ),
};

/** Dots are `bg-current`: the loader takes its container's colour. */
export const Colour: Story = {
  args: {},
  render: () => (
    <div className="flex items-center gap-6">
      {["text-border", "text-muted-foreground", "text-brand"].map((tone) => (
        <DotsLoader key={tone} className={tone} />
      ))}
    </div>
  ),
};
