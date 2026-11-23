import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Toast } from "./Toast";

const meta: Meta<typeof Toast> = {
  title: "Components/Toast",
  component: Toast,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof Toast>;

/** Fire it, watch it rise in, then lift away after the dwell or on ✕. */
export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="relative h-[240px] p-6">
        <Button onClick={() => setOpen(true)}>Invite member</Button>
        <Toast
          open={open}
          onClose={() => setOpen(false)}
          title="1 team member invited"
          className="absolute"
        />
      </div>
    );
  },
};

export const WithDescription: Story = {
  render: () => (
    <div className="relative h-[240px] p-6">
      <Toast
        open
        persistent
        onClose={() => {}}
        title="3 team members invited"
        className="absolute"
      >
        They'll get an email to join your workspace.
      </Toast>
    </div>
  ),
};
