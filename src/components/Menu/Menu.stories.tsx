import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  IconArchive,
  IconCopy,
  IconDotsVertical,
  IconDownload,
  IconPencil,
} from "@/components/Icon";
import { Menu, type MenuItem } from "./Menu";

const meta: Meta<typeof Menu> = {
  title: "Components/Menu",
  component: Menu,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof Menu>;

const Trigger = (
  <button
    type="button"
    aria-label="More actions"
    className="flex size-9 items-center justify-center rounded-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg"
  >
    <IconDotsVertical size={20} />
  </button>
);

const ITEMS: MenuItem[] = [
  { key: "edit", label: "Edit campaign", icon: <IconPencil size={16} /> },
  { key: "duplicate", label: "Duplicate", icon: <IconCopy size={16} /> },
  { key: "export", label: "Download report", icon: <IconDownload size={16} /> },
  {
    key: "archive",
    label: "Archive",
    icon: <IconArchive size={16} />,
    destructive: true,
    separatorBefore: true,
  },
];

/** A row's ⋮ menu: verbs only, choosing one closes it. */
export const Default: Story = {
  render: () => <Menu label="Campaign actions" trigger={Trigger} items={ITEMS} />,
};

/** License-blocked rows stay listed, muted, and explain themselves on hover. */
export const WithLockedRows: Story = {
  render: () => (
    <Menu
      label="Campaign actions"
      trigger={Trigger}
      items={ITEMS.map((item) =>
        item.key === "edit" || item.key === "duplicate" ? { ...item, locked: {} } : item
      )}
    />
  ),
};
