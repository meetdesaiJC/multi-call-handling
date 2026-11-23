import type { ReactNode, SVGProps } from "react";

/**
 * Call-control marks for the webphone and the call bar.
 *
 * The design-system library (`@/components/Icon`) already ships the two the
 * telephony set needs — `IconVoice` (mute) and `IconVoicemailDrop` — so those
 * are imported there rather than redrawn here. Hold, Keypad, Transfer, Notes
 * and Transcript have no library entry yet, so they are drawn on the same
 * 24-unit grid the library uses: 2 units of padding, `currentColor` strokes,
 * round caps and joins, and the library's per-size weights (1 at 16, 1.25 at
 * 20, 1.5 at 24) so a bar mixing both sources reads as one set.
 *
 * Replace these with generated icons once the Figma library carries them.
 */

type CallIconSize = 16 | 20 | 24;

export type CallIconProps = Omit<SVGProps<SVGSVGElement>, "width" | "height"> & {
  /** Matches the library's `IconProps` — 16 / 20 / 24. */
  size?: CallIconSize;
};

/** Library optical weights, held constant across the 24-unit geometry. */
const STROKE: Record<CallIconSize, number> = { 16: 1, 20: 1.25, 24: 1.5 };

function CallIcon({
  size = 24,
  children,
  ...props
}: CallIconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={STROKE[size]}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Hold — the pause pair. */
export function IconCallHold(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M6 5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5Z" />
      <path d="M14 5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V5Z" />
    </CallIcon>
  );
}

/** Keypad — the dialpad, 1–9 over a centred 0. */
export function IconCallKeypad(props: CallIconProps) {
  // Keys are 5 across on 24 with 2 of padding — wide enough that the stroke
  // still leaves a hole at 20 and 16.
  const cells = [
    [2, 2],
    [9.5, 2],
    [17, 2],
    [2, 9.5],
    [9.5, 9.5],
    [17, 9.5],
    [9.5, 17],
  ] as const;

  return (
    <CallIcon {...props}>
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={5} height={5} rx={1.25} />
      ))}
    </CallIcon>
  );
}

/** Transfer — hand the call to someone else. */
export function IconCallTransfer(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4" />
      <path d="M16 19h6M19 16v6" />
    </CallIcon>
  );
}

/**
 * Get help — the library's raised hand (`hand-stop`) at its 24-unit drawing,
 * not the 16 scaled up, so the palm carries the same weight and 2-unit padding
 * as Mute and Transfer beside it.
 */
export function IconCallHelp(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M11 5.5C11 5.102 10.842 4.721 10.561 4.439C10.28 4.158 9.898 4 9.5 4C9.102 4 8.721 4.158 8.44 4.439C8.158 4.721 8 5.102 8 5.5V13L6.53 11.53C6.236 11.236 5.851 11.049 5.438 10.998C5.025 10.947 4.607 11.036 4.25 11.25C3.915 11.451 3.672 11.775 3.572 12.152C3.471 12.53 3.523 12.932 3.714 13.272C5.593 16.612 6.688 18.521 7 19C7.065 19.1 7.131 19.2 7.196 19.3C7.743 20.13 8.487 20.811 9.362 21.282C10.236 21.754 11.215 22 12.208 22H12H14C15.591 22 17.118 21.368 18.243 20.243C19.368 19.117 20 17.591 20 16V7.5C20 7.102 19.842 6.721 19.561 6.439C19.28 6.158 18.898 6 18.5 6C18.102 6 17.721 6.158 17.44 6.439C17.158 6.721 17 7.102 17 7.5M11 5.5V12M11 5.5V3.5C11 3.303 11.039 3.108 11.114 2.926C11.19 2.744 11.3 2.579 11.44 2.439C11.579 2.3 11.744 2.19 11.926 2.114C12.108 2.039 12.303 2 12.5 2C12.697 2 12.892 2.039 13.074 2.114C13.256 2.19 13.422 2.3 13.561 2.439C13.7 2.579 13.811 2.744 13.886 2.926C13.961 3.108 14 3.303 14 3.5V12M14 5.5C14 5.102 14.158 4.721 14.44 4.439C14.721 4.158 15.102 4 15.5 4C15.898 4 16.28 4.158 16.561 4.439C16.842 4.721 17 5.102 17 5.5V12" />
    </CallIcon>
  );
}

/** Notes — the sticky note with its corner turned. */
export function IconCallNotes(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M21 13V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8l8-8Z" />
      <path d="M13 21v-7a1 1 0 0 1 1-1h7" />
    </CallIcon>
  );
}

/** Transcript — the same waveform the transcript panel's header wears. */
export function IconCallTranscript(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M4 10v4M8 6v12M12 4v16M16 7v10M20 10v4" />
    </CallIcon>
  );
}

/**
 * Mute, engaged — the library's `IconVoice` mic with the line through it.
 * A separate drawing rather than an overlaid slash: the diagonal has to cut
 * the mic's own strokes to read at 20, and a pseudo-element on top of an
 * `<svg>` cannot do that.
 */
export function IconCallMuted(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2" />
      <path d="M19 10v2a7 7 0 0 1-.11 1.23" />
      <path d="M12 19v3" />
      <path d="M3 3l18 18" />
    </CallIcon>
  );
}

/** Merge — two legs of a call folding into one. */
export function IconCallMerge(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M4 4h2l5 6v10" />
      <path d="M20 4h-2l-4 4.8" />
      <path d="M8 17l3 3 3-3" />
    </CallIcon>
  );
}

/** Two people already on the line — the 3-way state. */
export function IconCallUsers(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
      <path d="M17 3.5a4 4 0 0 1 0 7.75" />
      <path d="M19 15.2A4 4 0 0 1 22 19v2" />
    </CallIcon>
  );
}

/**
 * Pin — the drawing-pin seen from the side, head to the upper right. Two
 * strokes: the head-and-shaft, and the crossbar that keeps it from reading as
 * a balloon at 16.
 */
export function IconCallPin(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M9 15l-5.5 5.5M14.5 3.5l6 6M16.5 5.5l-7 2-3 3 5.5 5.5 3-3 2-7" />
    </CallIcon>
  );
}

/**
 * Recording, running. Filled on purpose — every other mark in this set is a
 * stroke, so the one control that means "this is capturing right now" is the
 * one the eye finds first.
 */
export function IconCallRecord(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <circle cx={12} cy={12} r={8.5} />
      <circle cx={12} cy={12} r={4} fill="currentColor" stroke="none" />
    </CallIcon>
  );
}

/** Stop — the recording is finished, and for this call that is final. */
export function IconCallStop(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <rect x={5.5} y={5.5} width={13} height={13} rx={2} />
    </CallIcon>
  );
}

/** Speaker — audio out, and the whole Audio settings group. */
export function IconCallSpeaker(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
      <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" />
    </CallIcon>
  );
}

/**
 * Speaker, quiet. The low end of a volume scale, paired with `IconCallSpeaker`
 * at the high end — the cone alone, with none of the arcs, so the two read as
 * one control's two limits rather than as two different marks.
 */
export function IconCallSpeakerLow(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
    </CallIcon>
  );
}

/** Network — the reception arc, which is what the bar's signal bars stand for. */
export function IconCallNetwork(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M2.5 8.5a13.5 13.5 0 0 1 19 0" />
      <path d="M6 12a8.5 8.5 0 0 1 12 0" />
      <path d="M9.5 15.5a3.5 3.5 0 0 1 5 0" />
      <path d="M12 19.5h.01" />
    </CallIcon>
  );
}

/** Backspace — take back the last tone sent, not the whole string. */
export function IconCallBackspace(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" />
      <path d="M17 9.5l-5 5M12 9.5l5 5" />
    </CallIcon>
  );
}

/** Run the checks again. */
export function IconCallRetry(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M20 12a8 8 0 1 1-2.7-6" />
      <path d="M20 4v4.5h-4.5" />
    </CallIcon>
  );
}

/**
 * Drop one leg of the call — Transfer's figure with the plus turned into a
 * minus. Deliberately the same drawing: the two are opposites on the same
 * participant, and a hangup handset here would read as ending the whole call
 * rather than removing one person from it.
 */
export function IconCallDrop(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4" />
      <path d="M16 19h6" />
    </CallIcon>
  );
}

/**
 * Pin, driven home — the same geometry filled, so a pinned card's control
 * reads as "already done" without changing shape or size.
 */
export function IconCallPinFilled(props: CallIconProps) {
  return (
    <CallIcon {...props} fill="currentColor">
      <path d="M9 15l-5.5 5.5" fill="none" />
      <path d="M14.5 3.5l6 6M16.5 5.5l-7 2-3 3 5.5 5.5 3-3 2-7" />
    </CallIcon>
  );
}
