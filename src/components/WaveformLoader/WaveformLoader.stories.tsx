import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { Button } from "@/components/Button";

import { WaveformLoader } from "./WaveformLoader";

const meta = {
  title: "Components/WaveformLoader",
  component: WaveformLoader,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    show: { control: "boolean" },
    label: { control: "text" },
  },
} satisfies Meta<typeof WaveformLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  render: () => (
    <span className="text-ai">
      <WaveformLoader />
    </span>
  ),
};

/**
 * The bars are `bg-current`, so the indicator takes the colour of whatever it
 * sits in rather than carrying one of its own.
 */
export const Colour: Story = {
  args: {},
  render: () => (
    <div className="flex items-center gap-6">
      {["text-ai", "text-muted-foreground", "text-brand", "text-foreground"].map(
        (tone) => (
          <span key={tone} className={tone}>
            <WaveformLoader />
          </span>
        )
      )}
    </div>
  ),
};

/**
 * How it reads in place: the in-call guidance panel, waiting on its first
 * card. The copy carries the announcement, so the bars stay `aria-hidden`.
 */
export const InContext: Story = {
  args: {},
  render: () => (
    <div className="w-[320px] rounded-lg border border-line bg-white p-4">
      <div className="flex items-center gap-1.5" aria-live="polite">
        <span className="text-ai">
          <WaveformLoader />
        </span>
        <span className="text-paragraph-sm text-muted-foreground">
          Listening to the conversation…
        </span>
      </div>
    </div>
  ),
};

/**
 * Presence. The exit plays before the bars unmount, so the caller keeps this
 * rendered until `onExited` — dropping it on the state change alone would cut
 * the exit off mid-fade.
 */
export const Presence: Story = {
  args: {},
  render: () => {
    const [show, setShow] = React.useState(true);
    const [mounted, setMounted] = React.useState(true);

    return (
      <div className="flex w-[280px] flex-col items-start gap-4">
        <div className="flex h-5 items-center text-ai">
          {mounted ? (
            <WaveformLoader show={show} onExited={() => setMounted(false)} />
          ) : (
            <span className="text-paragraph-sm text-muted-foreground">
              Guidance ready.
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (show) {
              setShow(false);
            } else {
              setMounted(true);
              setShow(true);
            }
          }}
        >
          {show ? "Finish loading" : "Wait again"}
        </Button>
      </div>
    );
  },
};

/**
 * A row of them at the same phase, to check the loop really is uninterrupted
 * by neighbouring renders — the counter below re-renders the whole story and
 * the bars keep their stride.
 */
export const Uninterrupted: Story = {
  args: {},
  render: () => {
    const [ticks, setTicks] = React.useState(0);

    React.useEffect(() => {
      const id = window.setInterval(() => setTicks((n) => n + 1), 300);
      return () => window.clearInterval(id);
    }, []);

    return (
      <div className="flex flex-col items-center gap-3">
        <span className="text-ai">
          <WaveformLoader />
        </span>
        <span className="text-label-sm text-muted-foreground tabular-nums">
          re-rendered {ticks}×
        </span>
      </div>
    );
  },
};
