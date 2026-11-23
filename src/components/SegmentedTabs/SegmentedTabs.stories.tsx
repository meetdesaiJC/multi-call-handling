import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SegmentedTabs, type SegmentedTabItem } from "./SegmentedTabs";
import { SegmentedPanel } from "./SegmentedPanel";
import {
  IconAnalytics,
  IconCallLogs,
  IconContacts,
  IconVoicemailMessage,
} from "@/components/Icon";

const ACTIVITY_TABS: SegmentedTabItem[] = [
  { key: "calls", label: "Call Logs", icon: <IconCallLogs size={20} /> },
  {
    key: "voicemail",
    label: "Voicemail",
    icon: <IconVoicemailMessage size={20} />,
  },
  { key: "contacts", label: "Contacts", icon: <IconContacts size={20} /> },
  { key: "analytics", label: "Analytics", icon: <IconAnalytics size={20} /> },
];

/**
 * The Figma source set. Its brain / list-check / bolt / adjustments glyphs
 * aren't in the icon library yet, so these run label-only rather than borrowing
 * a DS icon that only roughly resembles them.
 */
const VOICE_AGENT_TABS: SegmentedTabItem[] = [
  { key: "context", label: "Context" },
  { key: "script", label: "Script" },
  { key: "actions", label: "Actions" },
  { key: "advanced", label: "Advanced Settings" },
];

function SegmentedTabsDemo(props: React.ComponentProps<typeof SegmentedTabs>) {
  const [value, setValue] = useState(props.value ?? props.items[0]?.key);
  return <SegmentedTabs {...props} value={value} onValueChange={setValue} />;
}

const meta = {
  title: "Components/SegmentedTabs",
  component: SegmentedTabs,
  render: (args) => <SegmentedTabsDemo {...args} />,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    items: ACTIVITY_TABS,
    value: "calls",
  },
} satisfies Meta<typeof SegmentedTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Four segments, icon plus label — the shape the Figma component set specifies. */
export const Default: Story = {};

/**
 * Billing Overview (Apex) treatment: the card carries a border, inactive
 * labels drop to secondary text, no separators, 54px track.
 */
export const Outlined: Story = {
  args: {
    variant: "outlined",
    items: [
      { key: "team-members", label: "Team members" },
      { key: "phone-numbers", label: "Phone numbers" },
      { key: "add-ons", label: "Add-ons" },
      { key: "a2p-10dlc", label: "A2P 10DLC" },
    ],
    value: "team-members",
  },
};

/** The Voice Agent panel this was drawn for, pending its four icons. */
export const VoiceAgentPanel: Story = {
  args: { items: VOICE_AGENT_TABS, value: "context" },
};

/** Six segments, matching the widest variant in the Figma component set. */
export const SixSegments: Story = {
  args: {
    items: [
      ...ACTIVITY_TABS,
      { key: "fifth", label: "5th item" },
      { key: "sixth", label: "6th item" },
    ],
  },
};

/** Icons alone, for a control that has to survive a narrow column. */
export const IconOnly: Story = {
  args: {
    items: ACTIVITY_TABS.map(({ key, icon }) => ({ key, icon })),
  },
};

/**
 * Two segments — equal-width segments split the track in half rather than
 * hugging their labels, so the control keeps its shape as the copy changes.
 */
export const TwoSegments: Story = {
  args: {
    items: [
      { key: "draft", label: "Draft" },
      { key: "published", label: "Published" },
    ],
    value: "draft",
  },
};

/**
 * Constrained container: the segments stay equal-width and "Advanced Settings"
 * truncates rather than wrapping or shoving its neighbours out of alignment.
 * Figma hard-clips the same label mid-glyph; an ellipsis is the graceful
 * version of that constraint.
 */
export const Truncated: Story = {
  args: { items: VOICE_AGENT_TABS, value: "context" },
  decorators: [
    (Story) => (
      <div className="w-[360px]">
        <Story />
      </div>
    ),
  ],
};

/** Every selected position, the way the Figma component set is laid out. */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {ACTIVITY_TABS.map((item) => (
        <SegmentedTabs key={item.key} items={ACTIVITY_TABS} value={item.key} />
      ))}
    </div>
  ),
};

/**
 * An unavailable source. It keeps its place in the row — hiding it would
 * reflow the control every time an account's plan changed — but the card
 * never travels there, and arrow keys step over it.
 */
export const Disabled: Story = {
  args: {
    items: [
      ...ACTIVITY_TABS.slice(0, 2),
      { key: "contacts", label: "Contacts", icon: <IconContacts size={20} />, disabled: true },
      ACTIVITY_TABS[3],
    ],
    value: "calls",
  },
};

/**
 * The pairing this control is built for: `SegmentedPanel` under the tabs, so
 * the content below softly updates instead of cutting. Switch quickly between
 * three segments — the card redirects toward the newest one mid-flight rather
 * than playing every step it was asked for.
 */
export const WithContent: Story = {
  render: () => {
    const [value, setValue] = useState("calls");
    return (
      <div className="flex flex-col gap-6">
        <SegmentedTabs items={ACTIVITY_TABS} value={value} onValueChange={setValue} />
        <SegmentedPanel activeKey={value}>
          {(key) => {
            const item = ACTIVITY_TABS.find((tab) => tab.key === key)!;
            return (
              <div className="flex flex-col gap-2 rounded-lg border border-line bg-background p-6">
                <p className="text-heading-lg text-foreground">{item.label}</p>
                <p className="text-paragraph-md text-muted-foreground">
                  Whatever this source type shows lives here.
                </p>
              </div>
            );
          }}
        </SegmentedPanel>
      </div>
    );
  },
};

/**
 * A source that has to fetch. The card moves on the click and the segments
 * stay live; only the panel waits. Delaying the selected state until data
 * lands is what makes a control feel unresponsive, so the spinner is scoped
 * to the content and nothing else.
 */
export const Loading: Story = {
  render: () => {
    const [value, setValue] = useState("calls");
    const [ready, setReady] = useState(true);

    return (
      <div className="flex flex-col gap-6">
        <SegmentedTabs
          items={ACTIVITY_TABS}
          value={value}
          onValueChange={(next) => {
            setValue(next);
            setReady(false);
            window.setTimeout(() => setReady(true), 900);
          }}
        />
        <SegmentedPanel activeKey={ready ? value : `${value}:loading`}>
          {(key) => (
            <div className="flex flex-col gap-3 rounded-lg border border-line bg-background p-6">
              {key.endsWith(":loading") ? (
                <>
                  <div className="skeleton h-5 w-40" />
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-2/3" />
                </>
              ) : (
                <p className="text-heading-lg text-foreground">
                  {ACTIVITY_TABS.find((tab) => tab.key === key)?.label}
                </p>
              )}
            </div>
          )}
        </SegmentedPanel>
      </div>
    );
  },
};
