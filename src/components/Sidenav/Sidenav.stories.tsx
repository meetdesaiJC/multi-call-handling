import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sidenav } from "./Sidenav";

const meta = {
  title: "Components/Sidenav",
  component: Sidenav,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Sidenav>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [activeKey, setActiveKey] = useState("dashboard");
  return (
    <div className="flex h-screen">
      <Sidenav activeKey={activeKey} onItemSelect={setActiveKey} />
      <div className="flex flex-1 items-center justify-center bg-gray-25 text-gray-500">
        Active: {activeKey}
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <Demo />,
};
