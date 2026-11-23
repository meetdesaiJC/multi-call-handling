import type { Meta, StoryObj } from "@storybook/react-vite";

const LEVELS = [100, 200, 300, 400, 500, 600] as const;

function Card({ label, shadow }: { label: string; shadow: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex h-24 w-40 items-center justify-center rounded-lg bg-white"
        style={{ boxShadow: shadow }}
      >
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
    </div>
  );
}

function Scale({ prefix, varPrefix }: { prefix: string; varPrefix: string }) {
  return (
    <section>
      <h3 className="mb-6 text-sm font-medium text-gray-900">{prefix}</h3>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-10">
        {LEVELS.map((lvl) => (
          <Card
            key={lvl}
            label={`${prefix.toLowerCase().replace(" ", "-")}-${lvl}`}
            shadow={`var(--${varPrefix}-${lvl})`}
          />
        ))}
      </div>
    </section>
  );
}

function Elevation() {
  return (
    <div className="flex flex-col gap-14 bg-gray-25 p-10">
      <Scale prefix="Shadow" varPrefix="shadow" />
      <Scale prefix="AI Shadow" varPrefix="shadow-ai" />
    </div>
  );
}

const meta = {
  title: "Tokens/Elevation",
  component: Elevation,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Elevation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllElevations: Story = {};
