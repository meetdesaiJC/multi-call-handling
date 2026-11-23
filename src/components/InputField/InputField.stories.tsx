import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Fragment,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { InputField, TextArea } from "./InputField";
import {
  IconCircleDashed,
  IconPhoneNumber,
  IconSearch,
} from "@/components/Icon";

const meta = {
  title: "Components/InputField",
  component: InputField,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "prefix", "suffix", "date", "time", "password"],
    },
    label: { control: "text" },
    helpText: { control: "text" },
    helpTone: { control: "select", options: ["default", "error", "info"] },
    error: { control: "boolean" },
    disabled: { control: "boolean" },
    required: { control: "boolean" },
    labelIcon: { control: "boolean" },
    placeholder: { control: "text" },
  },
  args: {
    label: "Label",
    labelIcon: true,
    placeholder: "Placeholder text",
    className: "w-[320px]",
    wrapperClassName: "w-[320px]",
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InputField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHelpText: Story = {
  args: { helpText: "Help Text" },
};

export const Filled: Story = {
  args: { defaultValue: "Placeholder text" },
};

export const ErrorState: Story = {
  args: {
    error: true,
    helpText: "This team name is already taken",
    defaultValue: "Filled",
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Placeholder text" },
};

export const Required: Story = {
  args: { required: true, label: "Team name" },
};

export const Prefix: Story = {
  args: {
    variant: "prefix",
    prefix: "https://",
    defaultValue: "example@you.com",
  },
};

export const Suffix: Story = {
  args: {
    variant: "suffix",
    suffix: "mins",
    defaultValue: "15",
  },
};

export const Date: Story = {
  args: {
    variant: "date",
    placeholder: "MM/DD/YYYY",
    defaultValue: "MM/DD/YYYY",
  },
};

export const Time: Story = {
  args: {
    variant: "time",
    placeholder: "12:00 PM",
    defaultValue: "12:00 PM",
  },
};

export const Password: Story = {
  args: {
    variant: "password",
    forgotPassword: true,
    placeholder: "Placeholder text",
  },
};

/** Prefix addon carrying an icon + dial code, e.g. a phone-number field. */
export const PhonePrefix: Story = {
  args: {
    variant: "prefix",
    label: "Phone number",
    prefix: (
      <span className="inline-flex items-center gap-1.5">
        <IconPhoneNumber size={16} />
        +353
      </span>
    ),
    defaultValue: "6789 1234",
  },
};

/**
 * Help-text tones from the Figma board: the default gray hint, and the
 * brand-blue "info" tone with a spinning icon for an async "checking…" state.
 */
export const HelpTextStates: Story = {
  render: () => (
    <div className="flex w-[320px] flex-col gap-6">
      <InputField
        label="Label"
        labelIcon
        placeholder="Placeholder text"
        helpText="Help Text"
      />
      <InputField
        label="Team name"
        labelIcon
        defaultValue="acme"
        helpText="Checking availability"
        helpTone="info"
        helpIcon={<IconCircleDashed size={16} className="animate-spin" />}
      />
    </div>
  ),
};

export const WithLeadingIcon: Story = {
  args: {
    leadingIcon: <IconSearch size={16} />,
    placeholder: "Search…",
    label: "Search",
    labelIcon: false,
  },
};

export const NoLabel: Story = {
  args: { label: undefined, labelIcon: false, placeholder: "Placeholder text" },
};

/** Controlled field with clear. */
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState("Placeholder text");
    return (
      <InputField
        {...args}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onClear={() => setValue("")}
      />
    );
  },
};

export const TextAreaDefault: Story = {
  render: () => (
    <TextArea
      label="Label"
      labelIcon
      helpText="Help Text"
      defaultValue="Lorem ipsum dolor sit amet consectetur. Cras fusce tellus nisi risus felis suspendisse gravida quam eget."
      wrapperClassName="w-[320px]"
    />
  ),
};

export const TextAreaError: Story = {
  render: () => (
    <TextArea
      label="Label"
      labelIcon
      error
      helpText="Help Text"
      defaultValue="Lorem ipsum dolor sit amet consectetur."
      wrapperClassName="w-[320px]"
    />
  ),
};

/** Full matrix matching the Figma Input Field component set. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-10">
      <Section title="States">
        <InputField label="Label" labelIcon placeholder="Placeholder text" />
        <InputField
          label="Label"
          labelIcon
          defaultValue="Placeholder text"
        />
        <InputField
          label="Label"
          labelIcon
          error
          helpText="Help Text"
          defaultValue="Placeholder text"
        />
        <InputField
          label="Label"
          labelIcon
          disabled
          defaultValue="Placeholder text"
        />
      </Section>

      <Section title="Types">
        <InputField label="Label" labelIcon defaultValue="Placeholder text" />
        <InputField
          label="Label"
          labelIcon
          variant="prefix"
          prefix="https://"
          defaultValue="example@you.com"
        />
        <InputField
          label="Label"
          labelIcon
          variant="suffix"
          suffix="mins"
          defaultValue="15"
        />
        <InputField
          label="Label"
          labelIcon
          variant="date"
          defaultValue="MM/DD/YYYY"
        />
        <InputField
          label="Label"
          labelIcon
          variant="time"
          defaultValue="12:00 PM"
        />
        <InputField
          label="Label"
          labelIcon
          variant="password"
          forgotPassword
          placeholder="Placeholder text"
        />
      </Section>

      <Section title="Text area">
        <TextArea
          label="Label"
          labelIcon
          helpText="Help Text"
          defaultValue="Lorem ipsum dolor sit amet consectetur."
          wrapperClassName="w-[320px]"
        />
        <TextArea
          label="Label"
          labelIcon
          error
          helpText="Help Text"
          defaultValue="Lorem ipsum dolor sit amet consectetur."
          wrapperClassName="w-[320px]"
          disabled
        />
      </Section>
    </div>
  ),
};

/* ------------------------------------------------------------------ */
/* Variant matrix — mirrors the Figma "Input Field Variants" board     */
/* (node 605:57834): 6 types × (5 states, Filled + Placeholder).       */
/*                                                                     */
/* Hover and Focus are runtime CSS pseudo-states, so — as the Chip     */
/* stories do with `bg-surface-hover` — they're simulated statically   */
/* by forcing the same border tokens the component applies live:       */
/*   hover  → border-control-border   focus → border-brand             */
/* ------------------------------------------------------------------ */

type FieldProps = ComponentProps<typeof InputField>;

const MATRIX_TYPES: {
  header: string;
  extra: Partial<FieldProps>;
  /** Value shown in the "Filled" block. */
  value: string;
  /** Placeholder shown in the "Placeholder" block. */
  placeholder: string;
}[] = [
  {
    header: "Standard",
    extra: {},
    value: "Placeholder text",
    placeholder: "Placeholder text",
  },
  {
    header: "Prefix",
    extra: { variant: "prefix", prefix: "https://" },
    value: "example@you.com",
    placeholder: "example@you.com",
  },
  {
    header: "Suffix",
    extra: { variant: "suffix", suffix: "mins" },
    value: "15",
    placeholder: "15",
  },
  {
    header: "Date picker",
    extra: { variant: "date" },
    value: "MM/DD/YYYY",
    placeholder: "MM/DD/YYYY",
  },
  {
    header: "Time (12 Hours)",
    extra: { variant: "time" },
    value: "12:00 PM",
    placeholder: "12:00 PM",
  },
  {
    header: "Password",
    extra: { variant: "password", forgotPassword: true },
    value: "Placeholder text",
    placeholder: "Placeholder text",
  },
];

const MATRIX_STATES: {
  name: string;
  /** Class forced onto the field shell to simulate a CSS pseudo-state. */
  shellClass?: string;
  props?: Partial<FieldProps>;
}[] = [
  { name: "Default" },
  { name: "Hover", shellClass: "border-control-border" },
  { name: "Focus", shellClass: "border-brand" },
  { name: "Disabled", props: { disabled: true } },
  { name: "Error", props: { error: true } },
];

function MatrixCell({
  type,
  state,
  filled,
}: {
  type: (typeof MATRIX_TYPES)[number];
  state: (typeof MATRIX_STATES)[number];
  filled: boolean;
}) {
  return (
    <InputField
      label="Label"
      labelIcon
      wrapperClassName="w-full"
      {...type.extra}
      {...state.props}
      className={state.shellClass}
      {...(filled
        ? { defaultValue: type.value }
        : { placeholder: type.placeholder })}
    />
  );
}

/** Full type × state specimen, matching the Figma "Input Field Variants" frame. */
export const VariantMatrix: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="inline-grid grid-cols-[132px_repeat(6,248px)] items-start gap-x-6 gap-y-6">
      {/* Column headers */}
      <div />
      {MATRIX_TYPES.map((t) => (
        <div key={t.header} className="text-label-sm text-foreground">
          {t.header}
        </div>
      ))}

      {/* Filled block, then Placeholder block */}
      {([true, false] as const).map((filled) =>
        MATRIX_STATES.map((state) => (
          <Fragment key={`${filled ? "filled" : "placeholder"}-${state.name}`}>
            <div className="pt-8 text-label-sm text-foreground">
              {state.name}
              <span className="block text-paragraph-sm text-muted-foreground">
                {filled ? "Filled" : "Placeholder"}
              </span>
            </div>
            {MATRIX_TYPES.map((t) => (
              <MatrixCell
                key={t.header}
                type={t}
                state={state}
                filled={filled}
              />
            ))}
          </Fragment>
        ))
      )}
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
      <div className="flex flex-wrap items-start gap-6">{children}</div>
    </div>
  );
}
