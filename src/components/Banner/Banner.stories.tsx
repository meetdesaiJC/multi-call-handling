import type { Meta, StoryObj } from "@storybook/react-vite";
import { Banner } from "./Banner";
import { Button } from "@/components/Button";

const meta = {
  title: "Components/Banner",
  component: Banner,
  parameters: { layout: "padded" },
  argTypes: {
    variant: {
      control: "select",
      options: ["warning", "info", "error", "success"],
    },
    width: {
      control: "select",
      options: ["full", "page"],
    },
    title: { control: "text" },
    children: { control: "text" },
  },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

const LinkCta = (
  <a href="#" className="font-medium whitespace-nowrap">
    Button CTA
  </a>
);

const PageActions = (
  <>
    <Button variant="grey-outline" size="xs">
      View plans
    </Button>
    <Button variant="primary" size="xs">
      Explore feature
    </Button>
  </>
);

const COPY = {
  warning: {
    title: "Some services may be slow right now!",
    body: "You might notice delays while we resolve issues.",
  },
  info: {
    title: "A new update is now available!",
    body: "We've introduced improvements to calling and messaging.",
  },
  error: {
    title: "We're having trouble loading data!",
    body: "Some information may be unavailable. Please try again shortly.",
  },
  success: {
    title: "Some services may be slow right now!",
    body: "Everything is up and working as expected.",
  },
} as const;

export const WarningFull: Story = {
  args: {
    variant: "warning",
    width: "full",
    title: COPY.warning.title,
    children: COPY.warning.body,
    action: LinkCta,
    onClose: () => {},
  },
};

export const InfoFull: Story = {
  args: {
    variant: "info",
    width: "full",
    title: COPY.info.title,
    children: COPY.info.body,
    action: LinkCta,
    onClose: () => {},
  },
};

export const ErrorFull: Story = {
  args: {
    variant: "error",
    width: "full",
    title: COPY.error.title,
    children: COPY.error.body,
    action: LinkCta,
    onClose: () => {},
  },
};

export const SuccessFull: Story = {
  args: {
    variant: "success",
    width: "full",
    title: COPY.success.title,
    children: COPY.success.body,
    action: LinkCta,
    onClose: () => {},
  },
};

export const WarningPage: Story = {
  args: {
    variant: "warning",
    width: "page",
    title: COPY.warning.title,
    children: COPY.warning.body,
    actions: PageActions,
    onClose: () => {},
  },
};

export const InfoPage: Story = {
  args: {
    variant: "info",
    width: "page",
    title: COPY.info.title,
    children: COPY.info.body,
    actions: PageActions,
    onClose: () => {},
  },
};

export const ErrorPage: Story = {
  args: {
    variant: "error",
    width: "page",
    title: COPY.error.title,
    children: COPY.error.body,
    actions: PageActions,
    onClose: () => {},
  },
};

export const SuccessPage: Story = {
  args: {
    variant: "success",
    width: "page",
    title: COPY.success.title,
    children: COPY.success.body,
    actions: PageActions,
    onClose: () => {},
  },
};

/** Full matrix — every status × both widths, matching the Figma set. */
export const AllVariants: Story = {
  render: () => {
    const rows = (
      ["warning", "info", "error", "success"] as const
    ).map((variant) => ({
      variant,
      ...COPY[variant],
    }));

    return (
      <div className="grid w-full max-w-[1200px] grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {rows.map((r) => (
            <Banner
              key={`full-${r.variant}`}
              variant={r.variant}
              width="full"
              title={r.title}
              action={LinkCta}
              onClose={() => {}}
            >
              {r.body}
            </Banner>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          {rows.map((r) => (
            <Banner
              key={`page-${r.variant}`}
              variant={r.variant}
              width="page"
              title={r.title}
              actions={PageActions}
              onClose={() => {}}
            >
              {r.body}
            </Banner>
          ))}
        </div>
      </div>
    );
  },
};
