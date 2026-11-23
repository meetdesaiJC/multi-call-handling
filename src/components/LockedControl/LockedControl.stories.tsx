import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/Button";
import { IconPhone } from "@/components/Icon";
import { LockedControl } from "./LockedControl";

const meta: Meta<typeof LockedControl> = {
  title: "Components/LockedControl",
  component: LockedControl,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof LockedControl>;

/** License-blocked actions: still there, muted, with the one generic reason on hover, focus or tap. */
export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-3 p-10">
      <LockedControl>
        <Button size="xs" leftIcon={<IconPhone size={16} />}>
          Dialer
        </Button>
      </LockedControl>
      <LockedControl>
        <Button variant="grey-outline">New Campaign</Button>
      </LockedControl>
    </div>
  ),
};

/** `locked={false}` renders the control untouched, for conditional locking. */
export const Unlocked: Story = {
  render: () => (
    <LockedControl locked={false}>
      <Button size="xs" leftIcon={<IconPhone size={16} />}>
        Dialer
      </Button>
    </LockedControl>
  ),
};
