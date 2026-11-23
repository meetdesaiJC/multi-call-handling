import * as React from "react";

/**
 * The PRD asks for an audio cue that "doesn't interrupt the ongoing call":
 * the classic call-waiting tone — two short, quiet beeps, repeated — rather
 * than a ringtone, which would talk over the caller the rep is listening to.
 *
 * Built on Web Audio so there is no asset to ship. The browser only lets a
 * page make sound after the user has interacted with it; by the time a second
 * call rings, the rep has already clicked Call or Accept, so it plays.
 */
const REPEAT_EVERY_MS = 3000;
const BEEP_HZ = 440;
const BEEP_SECONDS = 0.18;
const GAP_SECONDS = 0.12;
const VOLUME = 0.06;

export function useCallWaitingTone(playing: boolean) {
  React.useEffect(() => {
    if (!playing) return;
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();

    const beepPair = () => {
      const start = context.currentTime;
      [0, BEEP_SECONDS + GAP_SECONDS].forEach((offset) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = BEEP_HZ;
        // Ramp in and out so each beep starts and stops without a click.
        gain.gain.setValueAtTime(0, start + offset);
        gain.gain.linearRampToValueAtTime(VOLUME, start + offset + 0.01);
        gain.gain.linearRampToValueAtTime(0, start + offset + BEEP_SECONDS);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start + offset);
        oscillator.stop(start + offset + BEEP_SECONDS);
      });
    };

    beepPair();
    const repeat = window.setInterval(beepPair, REPEAT_EVERY_MS);
    return () => {
      window.clearInterval(repeat);
      void context.close();
    };
  }, [playing]);
}
