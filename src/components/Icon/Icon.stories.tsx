import type { Meta, StoryObj } from "@storybook/react-vite";
import type * as React from "react";
import * as Icons from "./icons";
import type { IconProps } from "./icons";

function IconGallery() {
  const entries = Object.entries(Icons).filter(
    ([name]) => name.startsWith("Icon")
  ) as [string, React.ComponentType<IconProps>][];

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 p-2">
      {entries.map(([name, Icon]) => (
        <div
          key={name}
          className="flex flex-col items-center gap-2 rounded-md border border-line p-3 text-center"
        >
          <Icon size={24} className="size-6 shrink-0 text-foreground" />
          <span className="text-paragraph-sm text-muted-foreground break-all">
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}

const meta = {
  title: "Components/Icon",
  component: IconGallery,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof IconGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllIcons: Story = {};

export const Sizes: Story = {
  render: () => {
    const Icon = Icons.IconSearch;
    return (
      <div className="flex items-end gap-6 p-6 text-foreground">
        <div className="flex flex-col items-center gap-2">
          <Icon size={16} className="size-4" />
          <span className="text-paragraph-sm">16</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon size={20} className="size-5" />
          <span className="text-paragraph-sm">20</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon size={24} className="size-6" />
          <span className="text-paragraph-sm">24</span>
        </div>
      </div>
    );
  },
};
