import type { Meta, StoryObj } from "@storybook/react-vite";

type Style = { token: string; className: string; sample?: string };

const GROUPS: { group: string; styles: Style[] }[] = [
  {
    group: "Heading — SemiBold",
    styles: [
      { token: "text-heading-xxxl", className: "text-heading-xxxl" },
      { token: "text-heading-xxl", className: "text-heading-xxl" },
      { token: "text-heading-xl", className: "text-heading-xl" },
      { token: "text-heading-lg", className: "text-heading-lg" },
    ],
  },
  {
    group: "Paragraph — Regular",
    styles: [
      { token: "text-paragraph-lg", className: "text-paragraph-lg" },
      { token: "text-paragraph-md", className: "text-paragraph-md" },
      { token: "text-paragraph-sm", className: "text-paragraph-sm" },
    ],
  },
  {
    group: "Label — Medium / SemiBold / Bold",
    styles: [
      { token: "text-label-lg", className: "text-label-lg" },
      { token: "text-label-md", className: "text-label-md" },
      { token: "text-label-md-semi", className: "text-label-md-semi" },
      { token: "text-label-md-bold", className: "text-label-md-bold" },
      { token: "text-label-sm", className: "text-label-sm" },
      { token: "text-label-xs", className: "text-label-xs" },
    ],
  },
];

const SAMPLE = "The quick brown fox jumps over the lazy dog";

function TypeScale() {
  return (
    <div className="flex flex-col gap-10 p-8">
      {GROUPS.map(({ group, styles }) => (
        <section key={group} className="flex flex-col gap-5">
          <h3 className="text-label-sm text-gray-500 uppercase">{group}</h3>
          {styles.map((s) => (
            <div key={s.token} className="flex flex-col gap-1">
              <span className="text-paragraph-sm text-gray-500">{s.token}</span>
              <span className={`${s.className} text-gray-900`}>{SAMPLE}</span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

const meta = {
  title: "Tokens/Typography",
  component: TypeScale,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TypeScale>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllStyles: Story = {};
