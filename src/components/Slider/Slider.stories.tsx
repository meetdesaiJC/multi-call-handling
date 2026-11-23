import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Slider } from "./Slider";

const meta = {
  title: "Components/Slider",
  component: Slider,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    min: { control: "number" },
    max: { control: "number" },
    step: { control: "number" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Uncontrolled — the input keeps its own value. */
export const Default: Story = {
  args: { defaultValue: 60, "aria-label": "Volume" },
  render: (args) => (
    <div className="w-[320px]">
      <Slider {...args} />
    </div>
  ),
};

/**
 * Controlled, with the value shown beside it. The read-out is the caller's
 * job: a slider with no numbers is the right choice when the reader is aiming
 * rather than choosing, and the wrong one the moment the exact figure matters.
 */
export const WithReadout: Story = {
  args: { "aria-label": "Volume" },
  render: (args) => {
    const [value, setValue] = React.useState(35);
    return (
      <div className="flex w-[320px] items-center gap-3">
        <Slider {...args} value={value} onValueChange={setValue} />
        <span className="w-10 shrink-0 text-right text-label-md text-foreground tabular-nums">
          {value}
        </span>
      </div>
    );
  },
};

/**
 * `startAdornment` / `endAdornment` mark what the two ends mean. Both are
 * `aria-hidden` — they are a picture of the scale, and the accessible name on
 * the input is what actually says what is being set.
 */
export const WithAdornments: Story = {
  args: { defaultValue: 80, "aria-label": "Notification volume" },
  render: (args) => (
    <div className="w-[320px]">
      <Slider
        {...args}
        startAdornment={<span className="text-label-sm">Off</span>}
        endAdornment={<span className="text-label-sm">Max</span>}
      />
    </div>
  ),
};

/** Coarse steps, for a scale whose stops are meaningful on their own. */
export const Stepped: Story = {
  args: { defaultValue: 50, min: 0, max: 100, step: 25, "aria-label": "Quality" },
  render: (args) => (
    <div className="w-[320px]">
      <Slider {...args} />
    </div>
  ),
};

export const Disabled: Story = {
  args: { defaultValue: 40, disabled: true, "aria-label": "Volume" },
  render: (args) => (
    <div className="w-[320px]">
      <Slider {...args} />
    </div>
  ),
};
