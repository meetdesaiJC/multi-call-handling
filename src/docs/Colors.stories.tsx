import type { Meta, StoryObj } from "@storybook/react-vite";

const PALETTES: Record<string, { name: string; value: string }[]> = {
  Blue: [200, 400, 500, 600, 700, 800, 900].map((s) => ({
    name: `blue-${s}`,
    value: `var(--color-blue-${s})`,
  })),
  Indigo: [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((s) => ({
    name: `indigo-${s}`,
    value: `var(--color-indigo-${s})`,
  })),
  Purple: [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((s) => ({
    name: `purple-${s}`,
    value: `var(--color-purple-${s})`,
  })),
  Pink: [50, 100, 200, 300, 400, 500, 700, 800, 900].map((s) => ({
    name: `pink-${s}`,
    value: `var(--color-pink-${s})`,
  })),
  "Blue Gray": [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((s) => ({
    name: `bluegray-${s}`,
    value: `var(--color-bluegray-${s})`,
  })),
  Gray: [25, 100, 300, 500, 600, 700, 800, 900].map((s) => ({
    name: `gray-${s}`,
    value: `var(--color-gray-${s})`,
  })),
  Neutral: [100, 700, 800, 900].map((s) => ({
    name: `neutral-${s}`,
    value: `var(--color-neutral-${s})`,
  })),
};

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-14 w-full rounded-md border border-gray-300"
        style={{ backgroundColor: value }}
      />
      <span className="text-xs text-gray-700">{name}</span>
    </div>
  );
}

function Palette() {
  return (
    <div className="flex flex-col gap-8 p-2">
      {Object.entries(PALETTES).map(([group, swatches]) => (
        <section key={group}>
          <h3 className="mb-3 text-sm font-medium text-gray-900">{group}</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3">
            {swatches.map((s) => (
              <Swatch key={s.name} {...s} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const meta = {
  title: "Tokens/Colors",
  component: Palette,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Palette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllColors: Story = {};
