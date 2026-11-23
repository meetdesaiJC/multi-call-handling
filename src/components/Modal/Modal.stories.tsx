import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Modal } from "./Modal";
import { Button } from "../Button";

const meta = {
  title: "Components/Modal",
  component: Modal,
  parameters: { layout: "centered" },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
  },
  args: { open: false, onClose: () => {} },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

function SuccessIcon() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

/** Interactive template with a trigger button. */
function Demo({
  size,
  title,
  description,
  icon,
  body,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  title: string;
  description?: string;
  icon?: boolean;
  body: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open {size} modal</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size={size}
        icon={icon ? <SuccessIcon /> : undefined}
        title={title}
        description={description}
        footer={
          <>
            <Button variant="grey-outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Confirm
            </Button>
          </>
        }
      >
        {body}
      </Modal>
    </>
  );
}

export const Small: Story = {
  render: () => (
    <Demo
      size="sm"
      icon
      title="Changes saved"
      description="Your changes have been saved successfully."
      body="Use the small (400px) modal for short, informational messages — save, exit, or delete confirmations."
    />
  ),
};

export const Medium: Story = {
  render: () => (
    <Demo
      size="md"
      title="Edit member"
      description="Update the details for this team member."
      body={
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-label-sm text-gray-700">Full name</span>
            <input
              className="h-10 rounded-lg border border-gray-300 px-3 text-paragraph-md focus:border-blue-500 focus:outline-none"
              placeholder="Jane Doe"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label-sm text-gray-700">Email</span>
            <input
              className="h-10 rounded-lg border border-gray-300 px-3 text-paragraph-md focus:border-blue-500 focus:outline-none"
              placeholder="jane@company.com"
            />
          </label>
        </div>
      }
    />
  ),
};

export const Large: Story = {
  render: () => (
    <Demo
      size="lg"
      title="Upgrade your plan"
      description="Unlock advanced features for your team."
      body={
        <div className="h-64 rounded-lg bg-gray-25" />
      }
    />
  ),
};

export const XLarge: Story = {
  render: () => (
    <Demo
      size="xl"
      title="Workflow templates"
      description="Browse and select a template to get started."
      body={<div className="h-80 rounded-lg bg-gray-25" />}
    />
  ),
};

export const WithoutFooter: Story = {
  render: () => {
    function Inner() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Open modal</Button>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            size="sm"
            title="Notification"
            description="A simple modal with no footer actions."
          >
            This modal only has a header and body.
          </Modal>
        </>
      );
    }
    return <Inner />;
  },
};
