import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Tooltip, TooltipTrigger } from "./Tooltip";
import { Badge, PremiumIcon } from "@/components/Badge";
import { Button } from "@/components/Button";
import { IconInfoCircleFilled, IconPhoneNumber } from "@/components/Icon";

const ARROWS = [
  "top-center",
  "top-left",
  "top-right",
  "bottom-center",
  "bottom-left",
  "bottom-right",
  "left",
  "right",
  "none",
] as const;

const SUPPORTING =
  "Tooltips are used to describe or identify an element. In most scenarios, tooltips help the user understand the meaning, function or alt-text of an element.";

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    theme: { control: "select", options: ["dark", "light"] },
    arrow: { control: "select", options: [...ARROWS] },
    title: { control: "text" },
    description: { control: "text" },
  },
  args: {
    theme: "dark",
    arrow: "top-center",
    title: "This is a tooltip",
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = {
  args: {
    theme: "dark",
    title: "This is a tooltip",
    description: SUPPORTING,
    arrow: "bottom-center",
  },
};

export const Light: Story = {
  args: {
    theme: "light",
    title: "This is a tooltip",
    description: SUPPORTING,
    arrow: "bottom-center",
  },
};

export const TextOnly: Story = {
  args: {
    theme: "dark",
    arrow: "top-center",
    title: "This is a tooltip",
  },
};

export const TextWithIcon: Story = {
  args: {
    theme: "dark",
    arrow: "top-center",
    title: "This is a tooltip",
    icon: <IconInfoCircleFilled size={16} className="size-4" />,
    onClose: () => {},
  },
};

export const TextWithBadge: Story = {
  args: {
    theme: "dark",
    arrow: "top-center",
    title: "This is a tooltip",
    badge: <Badge variant="new" />,
    onClose: () => {},
  },
};

export const TextSubtextBadge: Story = {
  name: "Text + Subtext + Badge",
  args: {
    theme: "dark",
    arrow: "top-center",
    title: "This is a tooltip",
    description: SUPPORTING,
    badge: <Badge variant="new" />,
    onClose: () => {},
  },
};

export const TextSubtextIcon: Story = {
  name: "Text + Subtext + Icon",
  args: {
    theme: "dark",
    arrow: "top-center",
    title: "This is a tooltip",
    description: SUPPORTING,
    icon: <IconInfoCircleFilled size={16} className="size-4" />,
    onClose: () => {},
  },
};

export const WithCta: Story = {
  name: "Text + CTA + Icon",
  args: {
    theme: "dark",
    arrow: "top-center",
    title: "This is a tooltip",
    description: SUPPORTING,
    icon: <IconInfoCircleFilled size={16} className="size-4" />,
    action: <a href="#">Button CTA</a>,
    onClose: () => {},
  },
};

export const WithMedia: Story = {
  name: "Media + Text + CTA",
  args: {
    theme: "dark",
    arrow: "top-center",
    title: "This is a tooltip",
    description: SUPPORTING,
    badge: <Badge variant="new" />,
    media: (
      <div className="flex h-[154px] w-full items-center justify-center bg-gray-100 text-muted-foreground">
        <span className="text-paragraph-sm">Media</span>
      </div>
    ),
    action: <a href="#">Button CTA</a>,
    onClose: () => {},
  },
};

/** Avatar-group hover list — paragraph-md names, one per line. */
export const AvatarList: Story = {
  args: {
    theme: "dark",
    arrow: "bottom-center",
    children: [
      "Carla Lubin",
      "Abram Ross",
      "Terry Herwitz",
      "Tatiana Schleifer",
      "Tatiana Dias",
      "and 10 more",
    ].join("\n"),
  },
};

export const InlineUpgradeLink: Story = {
  name: "Inline upgrade link",
  render: () => (
    <Tooltip theme="dark" arrow="top-center" className="max-w-[280px]">
      <span className="text-paragraph-sm text-tooltip-dark-fg">
        Available in Team plan and above. Toll free numbers are available on our
        higher plans.{" "}
        <a href="#" className="text-badge-premium font-medium hover:underline">
          Upgrade now
        </a>
        .
      </span>
    </Tooltip>
  ),
};

export const AllArrows: Story = {
  render: () => (
    <div className="flex flex-col gap-10">
      <Section title="Dark">
        <div className="grid grid-cols-3 gap-8">
          {ARROWS.filter((a) => a !== "none").map((arrow) => (
            <div key={arrow} className="flex flex-col items-center gap-2">
              <Tooltip
                theme="dark"
                arrow={arrow}
                title="This is a tooltip"
                description={SUPPORTING}
              />
              <span className="text-label-xs text-muted-foreground">{arrow}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-2">
            <Tooltip theme="dark" arrow="none" title="This is a tooltip" />
            <span className="text-label-xs text-muted-foreground">none</span>
          </div>
        </div>
      </Section>
      <Section title="Light">
        <div className="grid grid-cols-3 gap-8">
          {(
            [
              "top-center",
              "bottom-center",
              "bottom-left",
              "bottom-right",
              "left",
              "right",
              "none",
            ] as const
          ).map((arrow) => (
            <div key={arrow} className="flex flex-col items-center gap-2">
              <Tooltip
                theme="light"
                arrow={arrow}
                title="This is a tooltip"
                description={SUPPORTING}
              />
              <span className="text-label-xs text-muted-foreground">{arrow}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  ),
};

export const ContentVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-10">
      <Section title="Text + icon">
        <Tooltip
          theme="dark"
          arrow="top-center"
          title="This is a tooltip"
          icon={<IconInfoCircleFilled size={16} className="size-4" />}
          onClose={() => {}}
        />
        <Tooltip
          theme="dark"
          arrow="top-center"
          title="This is a tooltip"
          badge={<Badge variant="new" />}
          onClose={() => {}}
        />
        <Tooltip
          theme="dark"
          arrow="top-center"
          title="This is a tooltip"
          description={SUPPORTING}
          badge={<Badge variant="new" />}
          onClose={() => {}}
        />
        <Tooltip
          theme="dark"
          arrow="top-center"
          title="This is a tooltip"
          description={SUPPORTING}
          icon={<IconInfoCircleFilled size={16} className="size-4" />}
          onClose={() => {}}
        />
      </Section>

      <Section title="Text + CTA + icon">
        <Tooltip theme="dark" arrow="top-center" title="This is a tooltip" />
        <Tooltip
          theme="dark"
          arrow="top-center"
          title="This is a tooltip"
          icon={<IconInfoCircleFilled size={16} className="size-4" />}
          action={<a href="#">Button CTA</a>}
          onClose={() => {}}
        />
        <Tooltip
          theme="dark"
          arrow="top-center"
          title="This is a tooltip"
          description={SUPPORTING}
        />
        <Tooltip
          theme="dark"
          arrow="top-center"
          title="This is a tooltip"
          description={SUPPORTING}
          icon={<IconInfoCircleFilled size={16} className="size-4" />}
          action={<a href="#">Button CTA</a>}
          onClose={() => {}}
        />
      </Section>
    </div>
  ),
};

/** Hover the icon button — tooltip appears above after a brief delay. */
export const WithTrigger: Story = {
  render: () => (
    <div className="flex items-center gap-8 py-16">
      <TooltipTrigger
        content={
          <Tooltip theme="dark" arrow="bottom-center" title="Add number" />
        }
        placement="top"
      >
        <Button variant="grey-outline" size="sm" iconOnly aria-label="Phone number">
          <IconPhoneNumber size={16} className="size-4" />
        </Button>
      </TooltipTrigger>

      <TooltipTrigger
        content={
          <Tooltip theme="dark" arrow="bottom-center" className="max-w-[240px]">
            <span className="text-paragraph-sm text-tooltip-dark-fg">
              Available in Team plan and above.{" "}
              <a
                href="#"
                className="text-badge-premium font-medium hover:underline"
              >
                Upgrade now
              </a>
            </span>
          </Tooltip>
        }
        placement="top"
        delay={150}
      >
        <button
          type="button"
          className="inline-flex size-5 items-center justify-center"
          aria-label="Premium"
        >
          <PremiumIcon size={20} />
        </button>
      </TooltipTrigger>
    </div>
  ),
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-label-sm text-muted-foreground">{title}</p>
      <div className="flex flex-wrap items-end gap-6">{children}</div>
    </div>
  );
}
