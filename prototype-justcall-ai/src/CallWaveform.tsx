import * as React from "react";
import { DURATION } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Compact voice-activity indicator on the call bar.
 *
 * It sits between connection status and the call controls and reports whether
 * live audio is being heard — not whether the call is being recorded (that is
 * the Recording pill) and not whether the line is healthy (that is the
 * network control). Muted, the bars freeze and dim so the microphone control
 * stays the primary signal.
 */

const BAR_COUNT = 7;
const BAR_MIN_PX = 4;
const BAR_MAX_PX = 16;
/** Uneven on purpose: a flat row at rest would read as muted, not silent. */
const SILENCE_HEIGHTS = [5, 4, 6, 4, 5, 6, 4];
/** Centre-weighted, like a voice, not a volume slider. */
const BAR_WEIGHTS = [0.42, 0.68, 0.9, 1, 0.86, 0.64, 0.4];
/** One new reading on this beat. Paired with a `fast` height transition. */
const SAMPLE_MS = DURATION.base;
/** Below this the stream is room tone, not speech. */
const AUDIO_THRESHOLD = 0.08;

type AudioContextCtor = typeof AudioContext;
type VoiceVisual = "audio" | "silence" | "muted";

function audioContextCtor(): AudioContextCtor | null {
  const audioWindow = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A turn in the call. The prototype has no far-end audio, so this stands in
 * for detected call audio: speech, then a real pause — long enough that
 * silence can be read as silence, not as a dip in a decorative loop.
 */
type Turn = { endsAt: number; rate: number; drive: number; floor: number };

function nextTurn(nowMs: number, speaking: boolean): Turn {
  return speaking
    ? {
        endsAt: nowMs + 1400 + Math.random() * 2200,
        rate: 5.2 + Math.random() * 2.8,
        drive: 0.62 + Math.random() * 0.2,
        floor: 0.3,
      }
    : {
        endsAt: nowMs + 900 + Math.random() * 1600,
        rate: 1,
        drive: 0,
        floor: 0,
      };
}

function turnLevel(nowMs: number, turn: Turn): number {
  if (turn.drive <= 0) return 0;
  const t = nowMs / 1000;
  const syllables =
    Math.abs(Math.sin(t * turn.rate)) * 0.7 +
    Math.abs(Math.sin(t * turn.rate * 1.63)) * 0.3;
  const stress = 0.7 + 0.3 * Math.abs(Math.sin(t * 1.7));
  return Math.min(1, Math.max(turn.floor, turn.drive * syllables * stress));
}

function heightsForLevel(level: number, now: number): number[] {
  return BAR_WEIGHTS.map((weight, index) => {
    const wobble = 0.92 + 0.08 * Math.abs(Math.sin(now / 280 + index * 0.85));
    const t = Math.min(1, Math.max(0, level * weight * wobble));
    return BAR_MIN_PX + t * (BAR_MAX_PX - BAR_MIN_PX);
  });
}

function scaleFromHeight(px: number) {
  return px / BAR_MAX_PX;
}

export function CallWaveform({
  active,
  muted,
  onHold,
  reduced,
  className,
}: {
  active: boolean;
  muted: boolean;
  onHold: boolean;
  reduced: boolean;
  className?: string;
}) {
  const [liveAudio, setLiveAudio] = React.useState(false);
  const [heights, setHeights] = React.useState(SILENCE_HEIGHTS);
  const silentRef = React.useRef(false);
  silentRef.current = muted || onHold;

  React.useEffect(() => {
    if (reduced || !active || prefersReducedMotion()) {
      setLiveAudio(false);
      setHeights(SILENCE_HEIGHTS);
      return;
    }

    let stopped = false;
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let timeDomain: Uint8Array<ArrayBuffer> | null = null;

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((granted) => {
        if (stopped) {
          granted.getTracks().forEach((track) => track.stop());
          return;
        }
        const Ctor = audioContextCtor();
        if (!Ctor) {
          granted.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = granted;
        context = new Ctor();
        const source = context.createMediaStreamSource(granted);
        analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        timeDomain = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      })
      .catch(() => {
        /* No mic — the synthesised far-end envelope still represents the call. */
      });

    const readMic = () => {
      if (!analyser || !timeDomain) return 0;
      analyser.getByteTimeDomainData(timeDomain);
      let sum = 0;
      for (let index = 0; index < timeDomain.length; index += 1) {
        const value = (timeDomain[index]! - 128) / 128;
        sum += value * value;
      }
      return Math.min(1, Math.sqrt(sum / timeDomain.length) * 3.4);
    };

    let smoothed = 0;
    let lastSample = performance.now();
    let speaking = true;
    let turn = nextTurn(lastSample, speaking);
    let frame = 0;

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - lastSample < SAMPLE_MS) return;
      lastSample = now;

      if (silentRef.current) {
        setLiveAudio(false);
        setHeights(SILENCE_HEIGHTS);
        return;
      }

      if (now >= turn.endsAt) {
        speaking = !speaking;
        turn = nextTurn(now, speaking);
      }

      const conversation = turnLevel(now, turn);
      const mic = readMic();
      const raw = Math.max(conversation, mic > AUDIO_THRESHOLD ? mic : 0);
      smoothed += (raw - smoothed) * 0.4;

      if (smoothed < AUDIO_THRESHOLD) {
        setLiveAudio(false);
        setHeights(SILENCE_HEIGHTS);
        return;
      }

      setLiveAudio(true);
      setHeights(heightsForLevel(smoothed, now));
    };

    frame = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      void context?.close();
    };
  }, [active, reduced]);

  const visual: VoiceVisual = muted
    ? "muted"
    : onHold || !liveAudio || reduced || !active
      ? "silence"
      : "audio";
  const bars = visual === "audio" ? heights : SILENCE_HEIGHTS;

  return (
    <span
      aria-hidden="true"
      data-voice={visual}
      className={cn(
        "call-voice-activity pointer-events-none flex h-5 w-12 shrink-0 items-center justify-center gap-[3px]",
        visual === "muted" && "opacity-25",
        visual === "silence" && "opacity-40",
        visual === "audio" && "opacity-75",
        className
      )}
    >
      {Array.from({ length: BAR_COUNT }, (_, index) => (
        <span
          key={index}
          className="call-voice-bar h-4 w-0.5 rounded-[2px] bg-white"
          style={
            {
              "--voice-bar-scale": scaleFromHeight(bars[index] ?? BAR_MIN_PX),
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}
