import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

// A couple of inline icons so the icon stories are self-contained.
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 12h14M13 6l6 6-6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const VARIANTS = [
  "primary",
  "primary-outline",
  "grey-outline",
  "link",
  "error",
  "error-secondary",
  "error-grey-outline",
] as const;

const SIZES = ["xs", "sm", "md", "lg"] as const;

const meta = {
  title: "Components/Button",
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    size: { control: "select", options: SIZES },
    iconOnly: { control: "boolean" },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: { children: "Button CTA", variant: "primary", size: "md" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const PrimaryOutline: Story = { args: { variant: "primary-outline" } };
export const GreyOutline: Story = { args: { variant: "grey-outline" } };
export const Link: Story = { args: { variant: "link" } };
export const Error: Story = { args: { variant: "error" } };
export const ErrorSecondary: Story = { args: { variant: "error-secondary" } };
export const ErrorGreyOutline: Story = {
  args: { variant: "error-grey-outline" },
};

export const WithLeadingIcon: Story = {
  args: { leftIcon: <PlusIcon /> },
};
export const WithTrailingIcon: Story = {
  args: { rightIcon: <ArrowIcon /> },
};
export const IconOnly: Story = {
  args: { iconOnly: true, children: <PlusIcon /> },
};
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };

/** Every hierarchy at the default (md) size. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map((variant) => (
        <Button key={variant} variant={variant}>
          Button CTA
        </Button>
      ))}
    </div>
  ),
};

/** All four sizes (28 / 36 / 40 / 54px tall). */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      {SIZES.map((size) => (
        <Button key={size} size={size}>
          Button CTA
        </Button>
      ))}
    </div>
  ),
};

/** Leading icon, trailing icon, and icon-only for each size. */
export const Icons: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {SIZES.map((size) => (
        <div key={size} className="flex items-center gap-3">
          <Button size={size} leftIcon={<PlusIcon />}>
            Button CTA
          </Button>
          <Button size={size} rightIcon={<ArrowIcon />}>
            Button CTA
          </Button>
          <Button size={size} iconOnly>
            <PlusIcon />
          </Button>
        </div>
      ))}
    </div>
  ),
};

/** The full Figma matrix: every hierarchy across every size. */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {VARIANTS.map((variant) => (
        <div key={variant} className="flex flex-col gap-2">
          <span className="text-label-sm text-muted-foreground">{variant}</span>
          <div className="flex items-center gap-3">
            {SIZES.map((size) => (
              <Button key={size} variant={variant} size={size}>
                Button CTA
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};
