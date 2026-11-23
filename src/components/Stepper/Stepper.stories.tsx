import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Stepper, type StepperStep } from "./Stepper";

const ADD_MEMBERS_STEPS: StepperStep[] = [
  { key: "invite", label: "Invite Member" },
  { key: "roles", label: "Assign Roles" },
  { key: "numbers", label: "Assign Phone Numbers" },
];

const meta: Meta<typeof Stepper> = {
  title: "Components/Stepper",
  component: Stepper,
  parameters: { layout: "padded" },
  args: { steps: ADD_MEMBERS_STEPS },
  decorators: [
    (Story) => (
      <div className="w-[288px]">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Stepper>;

export const FirstStep: Story = { args: { current: "invite" } };

export const MidFlow: Story = { args: { current: "roles" } };

export const LastStep: Story = { args: { current: "numbers" } };

/** Completed steps become clickable when `onStepSelect` is passed. */
export const Interactive: Story = {
  render: (args) => {
    const [index, setIndex] = useState(0);
    return (
      <div className="flex flex-col gap-6">
        <Stepper
          {...args}
          current={ADD_MEMBERS_STEPS[index].key}
          onStepSelect={(key) => setIndex(ADD_MEMBERS_STEPS.findIndex((s) => s.key === key))}
        />
        <div className="flex gap-2">
          <Button variant="grey-outline" size="sm" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            Back
          </Button>
          <Button
            size="sm"
            disabled={index === ADD_MEMBERS_STEPS.length - 1}
            onClick={() => setIndex(index + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    );
  },
};

/** A step an earlier answer made moot stays in the rail, struck through. */
export const WithSkippedStep: Story = {
  args: {
    current: "roles",
    steps: [
      { key: "invite", label: "Invite Member" },
      { key: "roles", label: "License Type & Role" },
      { key: "numbers", label: "Assign Phone Numbers", skipped: true },
    ],
  },
};
