import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { Alert } from "./Alert";

const meta = {
  title: "Components/Alert",
  component: Alert,
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["success", "info", "warning", "error"],
    },
    title: { control: "text" },
    children: { control: "text" },
  },
  decorators: [
    (Story) => (
      <div className="w-[448px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A brand-styled inline link, matching the Figma "Learn More" CTA. */
const LearnMore = (
  <a href="#" className="font-medium hover:underline">
    Learn More
  </a>
);

export const Success: Story = {
  args: {
    variant: "success",
    title: "Success message",
    children: "Your changes have been saved successfully",
    action: LearnMore,
    onClose: () => {},
  },
};

export const Info: Story = {
  args: {
    variant: "info",
    title: "Info message",
    children: "This is a general update for your reference",
    action: LearnMore,
    onClose: () => {},
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    title: "Warning message",
    children: "Please check the details before proceeding further",
    action: LearnMore,
    onClose: () => {},
  },
};

export const Danger: Story = {
  args: {
    variant: "error",
    title: "Danger message",
    children: "Something went wrong. Please try again later",
    action: LearnMore,
    onClose: () => {},
  },
};

/** Without a `title`, the body renders on a single line in the primary text colour. */
export const NoHeading: Story = {
  args: {
    variant: "info",
    children:
      "Please note that additional charges will apply for new team members based on your current plan.",
    action: LearnMore,
    onClose: () => {},
  },
};

/** The full matrix — every status, with and without a heading. */
export const AllVariants: Story = {
  render: () => {
    const body =
      "Please note that additional charges will apply for new team members based on your current plan.";
    const rows = [
      {
        variant: "success" as const,
        title: "Success message",
        desc: "Your changes have been saved successfully",
      },
      {
        variant: "info" as const,
        title: "Info message",
        desc: "This is a general update for your reference",
      },
      {
        variant: "warning" as const,
        title: "Warning message",
        desc: "Please check the details before proceeding further",
      },
      {
        variant: "error" as const,
        title: "Danger message",
        desc: "Something went wrong. Please try again later",
      },
    ];
    return (
      <div className="grid w-[928px] grid-cols-2 gap-6">
        {rows.map((r) => (
          <Alert
            key={`h-${r.variant}`}
            variant={r.variant}
            title={r.title}
            action={LearnMore}
            onClose={() => {}}
          >
            {r.desc}
          </Alert>
        ))}
        {rows.map((r) => (
          <Alert
            key={`p-${r.variant}`}
            variant={r.variant}
            action={LearnMore}
            onClose={() => {}}
          >
            {body}
          </Alert>
        ))}
      </div>
    );
  },
};

/**
 * Passing `open` hands presence to the Alert, so dismissing plays an exit
 * instead of the node disappearing. Without `open` the consumer mounts and
 * unmounts it and there is no animation — nothing to animate, since React
 * has already removed the node.
 */
export const Dismissible: Story = {
  args: {
    variant: "info",
    title: "Info message",
    children: "Dismiss this and it animates out instead of vanishing.",
  },
  render: (args) => {
    const [open, setOpen] = React.useState(true);
    return (
      <div className="flex flex-col items-start gap-4">
        <Alert {...args} open={open} onClose={() => setOpen(false)} />
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-label-md text-brand hover:underline"
          >
            Bring it back
          </button>
        )}
      </div>
    );
  },
};
