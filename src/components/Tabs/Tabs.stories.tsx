import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Tabs, type TabItem } from "./Tabs";
import { IconPhone, IconVoicemailMessage } from "@/components/Icon";

const CALL_LOG_TABS: TabItem[] = [
  { key: "all", label: "All" },
  { key: "missed", label: "Missed" },
  { key: "voicemail", label: "Voicemail" },
];

const CALL_LOG_TABS_WITH_BADGES: TabItem[] = [
  { key: "all", label: "All" },
  { key: "missed", label: "Missed", badge: 12 },
  { key: "voicemail", label: "Voicemail", badge: "122+" },
];

const CALL_LOG_TABS_WITH_ICONS: TabItem[] = [
  { key: "all", label: "All", icon: <IconPhone size={20} /> },
  {
    key: "voicemail",
    label: "Voicemail",
    icon: <IconVoicemailMessage size={20} />,
    badge: 3,
  },
];

const ICON_ONLY_TABS: TabItem[] = [
  { key: "all", icon: <IconPhone size={20} /> },
  { key: "voicemail", icon: <IconVoicemailMessage size={20} />, badge: 3 },
];

function TabsDemo(props: React.ComponentProps<typeof Tabs>) {
  const [value, setValue] = useState(props.value ?? props.items[0]?.key);
  return <Tabs {...props} value={value} onValueChange={setValue} />;
}

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  render: (args) => <TabsDemo {...args} />,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    items: CALL_LOG_TABS,
    value: "all",
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Trailing count rendered with the DS error `Badge`. */
export const WithBadge: Story = {
  args: { items: CALL_LOG_TABS_WITH_BADGES },
};

/** Leading 20px icon plus label, with an optional badge. */
export const WithIcon: Story = {
  args: { items: CALL_LOG_TABS_WITH_ICONS, value: "voicemail" },
};

/** Icon-only tabs — label omitted entirely. */
export const IconOnly: Story = {
  args: { items: ICON_ONLY_TABS },
};

/** All three states side by side for design QA. */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <Label text="Default / Hover (hover a tab) / Selected">
        <Tabs
          items={CALL_LOG_TABS_WITH_BADGES}
          value="all"
          onValueChange={() => {}}
        />
      </Label>
      <Label text="Icon + label + badge">
        <Tabs
          items={CALL_LOG_TABS_WITH_ICONS}
          value="all"
          onValueChange={() => {}}
        />
      </Label>
      <Label text="Icon only">
        <Tabs items={ICON_ONLY_TABS} value="voicemail" onValueChange={() => {}} />
      </Label>
    </div>
  ),
};

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <span className="text-paragraph-sm text-muted-foreground">{text}</span>
      {children}
    </div>
  );
}
