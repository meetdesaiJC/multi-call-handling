import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Counter } from "./Counter";

const meta = {
  title: "Components/Counter",
  component: Counter,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    value: { control: "number" },
    min: { control: "number" },
    max: { control: "number" },
    step: { control: "number" },
    disabled: { control: "boolean" },
    editable: { control: "boolean" },
  },
  args: { defaultValue: 10, min: 0, max: 1000, step: 1 },
} satisfies Meta<typeof Counter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Value at the lower bound — the − control is disabled. */
export const Min: Story = { args: { defaultValue: 0 } };

/** Value at the upper bound — the + control is disabled. */
export const Max: Story = { args: { defaultValue: 1000, max: 1000 } };

/** Greyed out and non-interactive. */
export const Disabled: Story = { args: { disabled: true } };

/** Steppers only — the field can't be typed into. */
export const ReadOnlyField: Story = { args: { editable: false } };

/** All five Figma states side by side. */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <Label text="Default">
        <Counter defaultValue={10} min={0} max={1000} />
      </Label>
      <Label text="Min (− disabled)">
        <Counter defaultValue={0} min={0} max={1000} />
      </Label>
      <Label text="Max (+ disabled)">
        <Counter defaultValue={1000} min={0} max={1000} />
      </Label>
      <Label text="Editable — type a value">
        <Counter defaultValue={10} min={0} max={1000} />
      </Label>
      <Label text="Disabled">
        <Counter defaultValue={10} disabled />
      </Label>
    </div>
  ),
};

/** Controlled usage — the value lives in the parent. */
export const Controlled: Story = {
  render: () => {
    const [qty, setQty] = useState(3);
    return (
      <div className="flex flex-col items-center gap-3">
        <Counter value={qty} onChange={setQty} min={1} max={10} />
        <p className="text-paragraph-sm text-muted-foreground">
          Licenses: {qty}
        </p>
      </div>
    );
  },
};

function Label({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-[180px] text-paragraph-sm text-muted-foreground">
        {text}
      </span>
      {children}
    </div>
  );
}
