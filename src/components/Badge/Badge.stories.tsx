import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Badge, PremiumIcon } from "./Badge";
import { IconPhoneNumber } from "@/components/Icon";

const VARIANTS = [
  "primary",
  "primary-inverted",
  "success",
  "error",
  "error-inverted",
  "warning",
  "blue-grey",
  "grey-inverted",
  "primary-outline",
  "purple",
  "new",
  "beta",
  "owner",
] as const;

const meta = {
  title: "Components/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: [...VARIANTS] },
    indicator: { control: "boolean" },
    children: { control: "text" },
  },
  args: { children: "Badge", variant: "primary" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Primary: Story = { args: { variant: "primary" } };
export const PrimaryInverted: Story = {
  args: { variant: "primary-inverted" },
};
export const Success: Story = { args: { variant: "success" } };
export const Error: Story = { args: { variant: "error" } };
export const ErrorInverted: Story = { args: { variant: "error-inverted" } };
export const Warning: Story = { args: { variant: "warning" } };
export const BlueGrey: Story = { args: { variant: "blue-grey" } };
export const GreyInverted: Story = { args: { variant: "grey-inverted" } };

/** Pink outline special badge — defaults label to "New". */
export const New: Story = {
  render: () => <Badge variant="new" />,
};

/** Dark special badge — defaults label to "Beta". */
export const Beta: Story = {
  render: () => <Badge variant="beta" />,
};

/** Owner shield mark (no label). */
export const Owner: Story = {
  render: () => <Badge variant="owner" />,
};

/** Live status with a leading indicator dot. */
export const WithIndicator: Story = {
  args: { variant: "success", indicator: true, children: "Online" },
};

/** Contextual badge with a leading icon. */
export const WithIcon: Story = {
  args: {
    variant: "success",
    icon: <IconPhoneNumber />,
    children: "Badge",
  },
};

/** All Figma states side by side. */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <Section title="States">
        <Badge variant="primary">Badge</Badge>
        <Badge variant="error">Badge</Badge>
        <Badge variant="blue-grey">Badge</Badge>
        <Badge variant="primary-inverted">Badge</Badge>
        <Badge variant="error-inverted">Badge</Badge>
        <Badge variant="success">Badge</Badge>
        <Badge variant="warning">Badge</Badge>
        <Badge variant="grey-inverted">Badge</Badge>
      </Section>

      <Section title="With indicator">
        {(
          [
            "primary",
            "primary-inverted",
            "success",
            "error",
            "error-inverted",
            "warning",
            "blue-grey",
            "grey-inverted",
          ] as const
        ).map((variant) => (
          <Badge key={variant} variant={variant} indicator>
            Badge
          </Badge>
        ))}
      </Section>

      <Section title="With icon">
        {(
          [
            "primary",
            "primary-inverted",
            "success",
            "error",
            "error-inverted",
            "warning",
            "blue-grey",
            "grey-inverted",
          ] as const
        ).map((variant) => (
          <Badge key={variant} variant={variant} icon={<IconPhoneNumber />}>
            Badge
          </Badge>
        ))}
      </Section>

      <Section title="Special">
        <Badge variant="new" />
        <Badge variant="beta" />
        <Badge variant="owner" />
      </Section>

      <Section title="Premium / upgrade icon">
        <PremiumIcon size={24} />
        <PremiumIcon size={20} />
        <PremiumIcon size={16} />
      </Section>
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
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
