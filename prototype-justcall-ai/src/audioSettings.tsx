import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AUDIO_INPUTS,
  AUDIO_OUTPUTS,
  RINGER_OUTPUTS,
  type AudioDevice,
} from "./callDeviceData";

/**
 * Audio device selection for the webphone's Settings tab.
 *
 * The state is held apart from the page that renders it because it outlasts
 * that page: an agent picks a headset once a morning, and closing Settings —
 * or the dialer — must not put them back on the laptop speakers.
 */

export interface AudioDeviceSelection {
  input: string;
  output: string;
  ringer: string;
  /** 0–4. See `VOLUME_STEPS` — nobody tunes a ringer to 63%. */
  ringVolume: number;
  setInput: (id: string) => void;
  setOutput: (id: string) => void;
  setRinger: (id: string) => void;
  setRingVolume: (step: number) => void;
  /** The picked devices, resolved — for a summary line. */
  current: { input: AudioDevice; output: AudioDevice; ringer: AudioDevice };
}

export function useAudioDevices(): AudioDeviceSelection {
  const [input, setInput] = useState(AUDIO_INPUTS[0].id);
  const [output, setOutput] = useState(AUDIO_OUTPUTS[0].id);
  const [ringer, setRinger] = useState(RINGER_OUTPUTS[0].id);
  const [ringVolume, setRingVolume] = useState(3);

  const current = useMemo(
    () => ({
      input: AUDIO_INPUTS.find((d) => d.id === input) ?? AUDIO_INPUTS[0],
      output: AUDIO_OUTPUTS.find((d) => d.id === output) ?? AUDIO_OUTPUTS[0],
      ringer: RINGER_OUTPUTS.find((d) => d.id === ringer) ?? RINGER_OUTPUTS[0],
    }),
    [input, output, ringer]
  );

  return {
    input,
    output,
    ringer,
    ringVolume,
    setInput,
    setOutput,
    setRinger,
    setRingVolume,
    current,
  };
}

/** Device lists as options. The label is already the browser's own name. */
export function deviceOptions(devices: AudioDevice[]) {
  return devices.map((device) => ({ value: device.id, label: device.label }));
}

/* ── Input level ───────────────────────────────────────────────────────── */

const METER_SEGMENTS = 14;

/**
 * Input level, as a travelling sweep across fourteen segments.
 *
 * Driven by a CSS loop rather than by the microphone, for the same reason
 * `WaveformLoader` is: this renders inside preview panes, which are
 * permanently hidden pages, and a `requestAnimationFrame` meter is a dead
 * strip there. `CallWaveform` does take a real mic because it is reporting
 * live audio on an active call; a settings meter is not, and a meter that
 * asks for microphone permission to render a settings page is a bad trade.
 *
 * `active` is what makes it honest: it only moves while the agent has asked it
 * to, so it is never claiming to hear something it isn't.
 */
export function MicLevelMeter({
  active,
  tone = "light",
  className,
}: {
  active: boolean;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-active={active ? "true" : undefined}
      className={cn("mic-level flex h-4 items-end gap-[3px]", className)}
    >
      {Array.from({ length: METER_SEGMENTS }, (_, index) => (
        <span
          key={index}
          className={cn(
            "mic-level-bar h-full w-[3px] shrink-0 rounded-[2px]",
            active
              ? "bg-success"
              : tone === "dark"
                ? "bg-white/20"
                : "bg-disabled-bg"
          )}
        />
      ))}
    </span>
  );
}

/**
 * "Test microphone" / "Testing…". Held here rather than in each surface so the
 * test runs for the same length wherever it is started, and so neither copy
 * has to re-derive when it stops.
 */
export const MIC_TEST_MS = 4000;

export function useMicTest() {
  const [testing, setTesting] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const start = useCallback(() => {
    window.clearTimeout(timer.current);
    setTesting(true);
    timer.current = window.setTimeout(() => setTesting(false), MIC_TEST_MS);
  }, []);

  return { testing, start };
}

/* ── Ring volume ───────────────────────────────────────────────────────── */

/**
 * Five steps as five buttons rather than a slider. A slider on a 300px panel
 * is a 20px target with no labels; five taps are five targets that say what
 * they set. Off is a step, not a separate mute toggle — the agent thinks of it
 * as the bottom of the same scale.
 */
export function RingVolumeSteps({
  value,
  onChange,
  tone = "light",
}: {
  value: number;
  onChange: (step: number) => void;
  tone?: "light" | "dark";
}) {
  return (
    <div
      role="group"
      aria-label="Ring volume"
      className="flex items-end gap-1"
    >
      {[0, 1, 2, 3, 4].map((step) => {
        const on = step <= value;
        const label = step === 0 ? "Off" : `Level ${step}`;
        return (
          <button
            key={step}
            type="button"
            aria-label={label}
            aria-pressed={value === step}
            onClick={() => onChange(step)}
            className={cn(
              "w-6 rounded-[3px] outline-none transition-colors duration-base",
              // Height carries the scale, so the row reads as a volume ramp
              // before anything is selected.
              step === 0 && "h-2",
              step === 1 && "h-3",
              step === 2 && "h-4",
              step === 3 && "h-5",
              step === 4 && "h-6",
              tone === "dark"
                ? on
                  ? "bg-white focus-visible:ring-2 focus-visible:ring-white/50"
                  : "bg-white/20 hover:bg-white/35 focus-visible:ring-2 focus-visible:ring-white/40"
                : on
                  ? "bg-brand focus-visible:ring-2 focus-visible:ring-brand/24"
                  : "bg-disabled-bg hover:bg-control-border focus-visible:ring-2 focus-visible:ring-brand/24"
            )}
          />
        );
      })}
    </div>
  );
}
