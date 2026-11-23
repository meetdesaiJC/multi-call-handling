import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { DURATION, type DurationName } from "@/lib/motion";

/**
 * Motion has no static swatch — a duration you can only read as a number
 * tells you nothing about whether it feels right. So this page plays the
 * scale instead of listing it, and draws the curves rather than printing
 * their control points.
 */

const SCALE: { name: DurationName; use: string }[] = [
  { name: "instant", use: "Reduced motion, deliberate snaps" },
  { name: "micro", use: "Hover tint on a dense row" },
  { name: "fast", use: "Small overlay exits, checks, chevrons" },
  { name: "base", use: "Default — colour state, indicators, small enters" },
  { name: "moderate", use: "Content swaps, panel-internal movement" },
  { name: "slow", use: "Large travel — sidesheet, drawer" },
  { name: "emphasis", use: "One-shot attention pulse — not a transition" },
  {
    name: "settle",
    use: "One-shot arrival highlight — holds, then lets go. Not a transition",
  },
];

const EASES = [
  {
    name: "ease-entrance",
    points: [0, 0, 0.38, 0.9] as const,
    use: "Arriving — starts fast, settles into place",
  },
  {
    name: "ease-exit",
    points: [0.2, 0, 1, 0.9] as const,
    use: "Leaving — starts slow, accelerates away",
  },
  {
    name: "ease-standard",
    points: [0.2, 0, 0.38, 0.9] as const,
    use: "Moving in place — an indicator sliding, a knob travelling",
  },
];

/** Enter/exit pairs. Exit is one step down the scale: leaving should not
 *  take as long as arriving, or dismissing feels like the UI is arguing. */
const PAIRS = [
  { what: "Dropdown, popover", enter: "base", exit: "fast" },
  { what: "Toast, inline banner", enter: "moderate", exit: "base" },
  { what: "Sidesheet, drawer", enter: "slow", exit: "moderate" },
] as const;

function Ruler({
  token,
  ms,
  run,
  onPlay,
}: {
  token: string;
  ms: number;
  run: number;
  onPlay: () => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onPlay}
        className="w-36 shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        {token}
      </button>
      <span className="w-14 shrink-0 text-xs tabular-nums text-gray-400">{ms}ms</span>
      <div className="relative h-6 flex-1 overflow-hidden rounded bg-gray-100">
        {/* `key` remounts the bar so a second click restarts the animation
            instead of being ignored as a no-op style change. No fill mode:
            the bar snaps back to the start rather than parking off-screen,
            so the row stays ready to replay. */}
        <div
          key={run}
          className="absolute inset-y-0 left-0 w-1/3 rounded bg-brand"
          style={{
            animation:
              run > 0
                ? `motion-doc-sweep ${ms}ms var(--ease-standard)`
                : undefined,
          }}
        />
      </div>
    </div>
  );
}

function Curve({ points, name }: { points: readonly number[]; name: string }) {
  const [x1, y1, x2, y2] = points;
  // Progress runs up the y axis, so flip it for SVG's top-left origin.
  const path = `M 0 100 C ${x1 * 100} ${100 - y1 * 100} ${x2 * 100} ${100 - y2 * 100} 100 0`;
  return (
    <svg viewBox="-6 -6 112 112" className="h-28 w-28 shrink-0">
      <rect x="0" y="0" width="100" height="100" className="fill-gray-50" rx="2" />
      <line x1="0" y1="0" x2="100" y2="100" className="stroke-gray-200" strokeWidth="1" />
      <path d={path} fill="none" className="stroke-brand" strokeWidth="2.5" />
      <title>{name}</title>
    </svg>
  );
}

function Motion() {
  const [runs, setRuns] = React.useState<Partial<Record<DurationName, number>>>({});
  const play = (name: DurationName) =>
    setRuns((r) => ({ ...r, [name]: (r[name] ?? 0) + 1 }));
  const playAll = () =>
    setRuns((r) =>
      Object.fromEntries(SCALE.map(({ name }) => [name, (r[name] ?? 0) + 1])),
    );

  return (
    <div className="flex flex-col gap-14 bg-gray-25 p-10">
      <style>{`@keyframes motion-doc-sweep { from { transform: translateX(0) } to { transform: translateX(200%) } }`}</style>

      <section>
        <div className="mb-1 flex items-baseline gap-4">
          <h3 className="text-sm font-medium text-gray-900">Duration</h3>
          <button
            onClick={playAll}
            className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Play all
          </button>
        </div>
        <p className="mb-6 max-w-xl text-xs text-gray-500">
          Pick by how far the element travels, not by how important it feels.
          Play the scale — the difference between 120 and 200ms is obvious in
          motion and invisible on paper, and only visible at all side by side.
        </p>
        <div className="flex max-w-2xl flex-col gap-3">
          {SCALE.map(({ name, use }) => (
            <div key={name} className="flex flex-col gap-1">
              <Ruler
                token={`duration-${name}`}
                ms={DURATION[name]}
                run={runs[name] ?? 0}
                onPlay={() => play(name)}
              />
              <p className="pl-40 text-xs text-gray-400">{use}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-medium text-gray-900">Easing</h3>
        <p className="mb-6 max-w-xl text-xs text-gray-500">
          Three curves, chosen by direction rather than by component. The
          asymmetry is the point — the eye reads decelerating-in and
          accelerating-out as weight.
        </p>
        <div className="flex flex-wrap gap-10">
          {EASES.map((e) => (
            <div key={e.name} className="flex items-start gap-4">
              <Curve points={e.points} name={e.name} />
              <div className="max-w-48 pt-2">
                <p className="text-xs font-medium text-gray-900">{e.name}</p>
                <p className="mt-1 text-xs text-gray-500">{e.use}</p>
                <p className="mt-2 font-mono text-[10px] text-gray-400">
                  cubic-bezier({e.points.join(", ")})
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-medium text-gray-900">Pairing</h3>
        <p className="mb-6 max-w-xl text-xs text-gray-500">
          An exit takes one step less than its enter. Every overlay in the
          library already followed this before it was written down.
        </p>
        <table className="max-w-xl text-left text-xs">
          <thead className="text-gray-400">
            <tr>
              <th className="pb-2 pr-8 font-medium">Element</th>
              <th className="pb-2 pr-8 font-medium">Enter</th>
              <th className="pb-2 font-medium">Exit</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {PAIRS.map((p) => (
              <tr key={p.what} className="border-t border-gray-100">
                <td className="py-2 pr-8">{p.what}</td>
                <td className="py-2 pr-8 font-mono text-[11px]">
                  {p.enter} · entrance
                </td>
                <td className="py-2 font-mono text-[11px]">{p.exit} · exit</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const meta = {
  title: "Tokens/Motion",
  component: Motion,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Motion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllMotion: Story = {};
