import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import {
  Avatar,
  AvatarAddButton,
  AvatarGroup,
  AvatarLabelGroup,
  Thumbnail,
  avatarColorFromId,
  initialsFromName,
  type AvatarColor,
  type AvatarSize,
  type AvatarStatus,
} from "./index";
import portrait from "./assets/portrait.jpg";

const SIZES: Exclude<AvatarSize, "xxl">[] = ["xs", "sm", "md", "lg"];
const ALL_SIZES: AvatarSize[] = ["xs", "sm", "md", "lg", "xxl"];
const COLORS: AvatarColor[] = [
  "indigo",
  "purple",
  "pink",
  "orange",
  "grey",
  "bluegrey",
];
const STATUSES: AvatarStatus[] = [
  "available",
  "ooo",
  "on-call",
  "wrap-up",
  "dnd",
];

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    size: { control: "select", options: ALL_SIZES },
    color: { control: "select", options: COLORS },
    status: { control: "select", options: [...STATUSES, undefined] },
    disabled: { control: "boolean" },
    outline: { control: "boolean" },
    initials: { control: "text" },
    src: { control: "text" },
  },
  args: { size: "lg", initials: "OR", color: "indigo" },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const Image: Story = {
  args: { src: portrait, alt: "Annie Stanley", initials: undefined },
};

export const Placeholder: Story = {
  args: { initials: undefined, src: undefined },
};

export const WithStatus: Story = {
  args: { status: "available" },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const ProfileUpload: Story = {
  args: {
    size: "xxl",
    initials: "OR",
    action: "upload",
  },
};

export const ProfileEdit: Story = {
  args: {
    size: "xxl",
    src: portrait,
    alt: "Annie Stanley",
    action: "edit",
  },
};

/** Every size × type from the Figma Avatar matrix. */
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(["Text", "Image", "Placeholder"] as const).map((type) => (
        <Row key={type} label={type}>
          {ALL_SIZES.map((size) => (
            <Avatar
              key={size}
              size={size}
              color="indigo"
              initials={type === "Text" ? "OR" : undefined}
              src={type === "Image" ? portrait : undefined}
              alt={type === "Image" ? "Annie Stanley" : undefined}
              action={size === "xxl" ? (type === "Image" ? "edit" : "upload") : false}
            />
          ))}
        </Row>
      ))}
    </div>
  ),
};

/** Soft tag-color pairs for initials. */
export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {COLORS.map((color) => (
        <Row key={color} label={color}>
          {SIZES.map((size) => (
            <Avatar key={size} size={size} color={color} initials="OR" />
          ))}
        </Row>
      ))}
    </div>
  ),
};

/** Presence indicators across sizes. */
export const StatusIndicators: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {STATUSES.map((status) => (
        <Row key={status} label={status}>
          {SIZES.map((size) => (
            <Avatar
              key={size}
              size={size}
              src={portrait}
              alt="Annie Stanley"
              status={status}
            />
          ))}
        </Row>
      ))}
    </div>
  ),
};

/** Hover / focus / disabled for each type. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(["Initials", "Image", "Placeholder"] as const).map((type) => (
        <div key={type} className="flex flex-col gap-2">
          <span className="text-paragraph-sm text-muted-foreground">{type}</span>
          <div className="flex items-center gap-6">
            <Label text="Default">
              <Avatar
                size="lg"
                color="indigo"
                initials={type === "Initials" ? "OR" : undefined}
                src={type === "Image" ? portrait : undefined}
              />
            </Label>
            <Label text="Disabled">
              <Avatar
                size="lg"
                color="indigo"
                disabled
                initials={type === "Initials" ? "OR" : undefined}
                src={type === "Image" ? portrait : undefined}
              />
            </Label>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Group: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <AvatarGroup max={3} showAddButton>
        <Avatar color="indigo" initials="OR" />
        <Avatar color="pink" initials="OR" />
        <Avatar color="orange" initials="OR" />
        <Avatar color="purple" initials="OR" />
        <Avatar color="bluegrey" initials="OR" />
        <Avatar color="grey" initials="OR" />
        <Avatar color="indigo" initials="OR" />
      </AvatarGroup>
      <AvatarGroup max={3} showAddButton>
        <Avatar color="indigo" initials="OR" />
        <Avatar color="pink" initials="OR" />
        <Avatar color="orange" initials="OR" />
      </AvatarGroup>
      <AvatarGroup max={3} showAddButton>
        <Avatar color="indigo" initials="OR" />
        <Avatar color="pink" initials="OR" />
      </AvatarGroup>
      <AvatarGroup max={3} showAddButton>
        <Avatar color="indigo" initials="OR" />
      </AvatarGroup>
    </div>
  ),
};

export const AddButton: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <AvatarAddButton size="xsm" />
      <AvatarAddButton size="sm" />
      <AvatarAddButton size="md" />
      <AvatarAddButton size="lg" />
      <AvatarAddButton size="md" disabled />
    </div>
  ),
};

export const LabelGroup: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <AvatarLabelGroup
        name="Olivia Rhye"
        description="olivia@untitledui.com"
        avatarProps={{ color: "indigo", initials: "OR" }}
      />
      <AvatarLabelGroup
        name="Olivia Rhye"
        description="olivia@untitledui.com"
        avatarProps={{ src: portrait, alt: "Olivia Rhye" }}
      />
      <AvatarLabelGroup
        name="Olivia Rhye"
        description="olivia@untitledui.com"
        disabled
        avatarProps={{ color: "indigo", initials: "OR" }}
      />
    </div>
  ),
};

export const Thumbnails: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(["Text", "Image", "Placeholder"] as const).map((type) => (
        <Row key={type} label={type}>
          {ALL_SIZES.map((size) => (
            <Thumbnail
              key={size}
              size={size}
              color="indigo"
              initials={type === "Text" ? "OR" : undefined}
              src={type === "Image" ? portrait : undefined}
              alt={type === "Image" ? "Annie Stanley" : undefined}
            />
          ))}
        </Row>
      ))}
    </div>
  ),
};

/**
 * `initialsFromName` + `avatarColorFromId` — what a list of people gets when
 * nobody has uploaded a photo or picked a fill by hand.
 *
 * The colour is keyed on the *id*, so it survives a rename; the initials are
 * keyed on the name, so they follow one. Seven people over five fills have to
 * collide — what the hash buys is that the repeats are never neighbours.
 */
export const Derived: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex max-w-sm flex-col">
      {[
        { id: "priya", name: "Priya Nair" },
        { id: "diego", name: "Diego Ramos" },
        { id: "henry", name: "Henry Beachy" },
        { id: "saurabh", name: "Saurabh Bhardwaj" },
        { id: "amara", name: "Amara Okafor" },
        { id: "tom", name: "Tom Whitfield" },
        { id: "mohit", name: "Mohit Singh" },
      ].map((person) => (
        <div
          key={person.id}
          className="flex items-center gap-3 border-b border-line py-2.5"
        >
          <Avatar
            size="md"
            initials={initialsFromName(person.name)}
            color={avatarColorFromId(person.id)}
          />
          <span className="text-label-sm text-foreground">{person.name}</span>
          <span className="ml-auto text-paragraph-sm text-muted-foreground">
            {avatarColorFromId(person.id)}
          </span>
        </div>
      ))}
    </div>
  ),
};

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-28 text-paragraph-sm text-muted-foreground capitalize">
        {label}
      </span>
      <div className="flex items-end gap-3">{children}</div>
    </div>
  );
}

function Label({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      <span className="text-paragraph-sm text-muted-foreground">{text}</span>
    </div>
  );
}
