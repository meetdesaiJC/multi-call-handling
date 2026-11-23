import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Dropdown, type DropdownListItem } from "./Dropdown";
import { IconContacts, IconInfoCircleFilled } from "@/components/Icon";

const TEAM: DropdownListItem[] = [
  { value: "olivia", label: "Olivia Rhye" },
  { value: "phoenix", label: "Phoenix Baker" },
  { value: "lana", label: "Lana Steiner" },
  { value: "demi", label: "Demi Wilkinson" },
  { value: "candice", label: "Candice Wu" },
  { value: "natali", label: "Natali Craig" },
  { value: "drew", label: "Drew Cano" },
];

const TEAM_WITH_ICONS: DropdownListItem[] = TEAM.map((item) =>
  item.type
    ? item
    : {
        ...item,
        icon: <IconContacts size={20} className="size-5" />,
      }
);

const GROUPED: DropdownListItem[] = [
  { type: "heading", label: "Engineering" },
  { value: "olivia", label: "Olivia Rhye" },
  { value: "phoenix", label: "Phoenix Baker" },
  { type: "separator" },
  { type: "heading", label: "Design" },
  { value: "lana", label: "Lana Steiner" },
  { value: "demi", label: "Demi Wilkinson", disabled: true },
];

const meta = {
  title: "Components/Dropdown",
  component: Dropdown,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    variant: { control: "select", options: ["border", "borderless"] },
    multiple: { control: "boolean" },
    disabled: { control: "boolean" },
    searchable: { control: "boolean" },
  },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Team member",
    labelIcon: <IconInfoCircleFilled size={20} className="size-5" />,
    placeholder: "Select team member",
    options: TEAM,
    searchable: true,
  },
};

export const WithValue: Story = {
  args: {
    ...Default.args,
    defaultValue: "lana",
  },
};

export const WithLeftIcon: Story = {
  args: {
    ...Default.args,
    leftIcon: <IconContacts size={20} className="size-5" />,
    options: TEAM_WITH_ICONS,
    defaultValue: "olivia",
  },
};

export const WithPrefix: Story = {
  args: {
    label: "Amount currency",
    prefix: "USD",
    placeholder: "Select team member",
    options: TEAM,
    defaultValue: "lana",
  },
};

export const Borderless: Story = {
  args: {
    variant: "borderless",
    placeholder: "Select team member",
    options: TEAM,
    defaultValue: "lana",
    searchable: false,
  },
  decorators: [
    (Story) => (
      <div className="w-[200px]">
        <Story />
      </div>
    ),
  ],
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
    defaultValue: "lana",
  },
};

export const Open: Story = {
  args: {
    ...Default.args,
    defaultOpen: true,
    defaultValue: "olivia",
  },
  decorators: [
    (Story) => (
      <div className="h-[420px] w-[320px]">
        <Story />
      </div>
    ),
  ],
};

export const MultiSelect: Story = {
  args: {
    label: "Team member",
    labelIcon: <IconInfoCircleFilled size={20} className="size-5" />,
    placeholder: "Select team member",
    multiple: true,
    options: TEAM,
    defaultValue: ["olivia", "phoenix", "lana", "demi", "candice", "natali", "drew"],
    defaultOpen: true,
  },
  decorators: [
    (Story) => (
      <div className="h-[420px] w-[320px]">
        <Story />
      </div>
    ),
  ],
};

export const GroupedOptions: Story = {
  args: {
    label: "Team member",
    placeholder: "Select team member",
    options: GROUPED,
    defaultOpen: true,
  },
  decorators: [
    (Story) => (
      <div className="h-[380px] w-[320px]">
        <Story />
      </div>
    ),
  ],
};

export const NoResults: Story = {
  args: {
    label: "Team member",
    placeholder: "Select team member",
    options: TEAM,
    defaultOpen: true,
    searchable: true,
  },
  render: (args) => {
    const [open, setOpen] = useState(true);
    // Empty options simulates a search that returned nothing.
    return (
      <div className="h-[380px] w-[320px]">
        <Dropdown {...args} open={open} onOpenChange={setOpen} options={[]} />
      </div>
    );
  },
};

/** Controlled single-select usage. */
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | string[]>("");
    return (
      <Dropdown
        {...args}
        value={value}
        onValueChange={setValue}
        options={TEAM}
      />
    );
  },
  args: {
    label: "Team member",
    placeholder: "Select team member",
    options: TEAM,
  },
};

/** Controlled multi-select usage. */
export const InteractiveMulti: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | string[]>([]);
    return (
      <Dropdown
        {...args}
        multiple
        value={value}
        onValueChange={setValue}
        options={TEAM}
      />
    );
  },
  args: {
    label: "Team member",
    placeholder: "Select team member",
    options: TEAM,
  },
};

/** Trigger state matrix matching Figma `.Dropdown Input`. */
export const TriggerStates: Story = {
  args: { options: TEAM },
  render: () => (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-label-md text-muted-foreground">Border</p>
        <Dropdown placeholder="Select team member" options={TEAM} searchable={false} />
        <Dropdown
          placeholder="Select team member"
          options={TEAM}
          defaultValue="lana"
          searchable={false}
        />
        <Dropdown
          placeholder="Select team member"
          options={TEAM}
          defaultValue="lana"
          defaultOpen
          searchable={false}
        />
        <Dropdown
          placeholder="Select team member"
          options={TEAM}
          defaultValue="lana"
          disabled
          searchable={false}
        />
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-label-md text-muted-foreground">Multi-select tags</p>
        <Dropdown
          multiple
          options={TEAM}
          defaultValue={["olivia", "phoenix", "lana", "demi", "candice"]}
          searchable={false}
        />
        <Dropdown
          multiple
          options={TEAM}
          defaultValue={["olivia", "phoenix", "lana", "demi", "candice"]}
          disabled
          searchable={false}
        />
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-label-md text-muted-foreground">With prefix</p>
        <Dropdown
          prefix="USD"
          placeholder="Select team member"
          options={TEAM}
          searchable={false}
        />
        <Dropdown
          prefix="USD"
          options={TEAM}
          defaultValue="lana"
          searchable={false}
        />
      </div>
      <div className="flex w-[200px] flex-col gap-3">
        <p className="text-label-md text-muted-foreground">Borderless</p>
        <Dropdown
          variant="borderless"
          placeholder="Select team member"
          options={TEAM}
          searchable={false}
        />
        <Dropdown
          variant="borderless"
          options={TEAM}
          defaultValue="lana"
          searchable={false}
        />
      </div>
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="w-[360px] pb-[280px]">
        <Story />
      </div>
    ),
  ],
};

/**
 * The menu is absolutely positioned, so a scrolling panel clips it rather than
 * letting it hang out — which is how a field near the bottom of a phone-sized
 * settings page ended up with its menu drawn under the bottom nav.
 *
 * Open the last field: the menu flips above its trigger. Open the first: it
 * still hangs below. Scroll the panel so a trigger sits mid-list and the menu
 * keeps to the room it has, scrolling its own list instead.
 */
export const InAScrollContainer: Story = {
  args: { options: TEAM },
  render: () => (
    <div className="flex h-[320px] w-[320px] flex-col overflow-hidden rounded-[16px] border border-line bg-white">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {["First", "Second", "Third", "Fourth", "Last"].map((name) => (
          <Dropdown key={name} label={`${name} field`} options={TEAM} />
        ))}
      </div>
      <div className="flex h-12 shrink-0 items-center justify-center bg-brand text-label-sm text-white">
        Bottom nav
      </div>
    </div>
  ),
  decorators: [(Story) => <Story />],
};
