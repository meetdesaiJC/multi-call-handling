import type { Meta, StoryObj } from "@storybook/react-vite";
import { GlobalHeader } from "./GlobalHeader";

const meta = {
  title: "Components/GlobalHeader",
  component: GlobalHeader,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof GlobalHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Dashboard",
  },
};

export const Breadcrumb: Story = {
  args: {
    title: [{ label: "Phone Numbers", onClick: () => {} }, { label: "Settings" }],
  },
};

export const WithNotifications: Story = {
  args: {
    title: "Dashboard",
    notificationCount: 132,
  },
};

export const NoLiveCallSupport: Story = {
  args: {
    title: "Dashboard",
    showLiveCallSupport: false,
  },
};

export const AwayStatus: Story = {
  args: {
    title: "Dashboard",
    availabilityLabel: "Do not disturb",
    availabilityStatus: "dnd",
  },
};

export const AvailabilityOpen: Story = {
  args: {
    title: "Dashboard",
    availabilityOpen: true,
  },
};
