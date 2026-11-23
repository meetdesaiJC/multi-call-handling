/**
 * Notes' analytics surface.
 *
 * The prototype has no analytics client, and inventing one would be the wrong
 * kind of fidelity. What it can carry is the *event contract* — the six names
 * the interaction is meant to report and the moments they fire at — so the
 * production wiring is a change of transport rather than a re-reading of the
 * flow. Every call goes through `trackNotes`, so there is one place to point
 * at a real client.
 *
 * Events land as a `window` event as well, which is what makes them checkable
 * in a demo without a network tab:
 *
 *   window.addEventListener("jcai:notes-telemetry", (e) => console.table(e.detail))
 */

export type NotesTelemetryEvent =
  /** The intro panel is on screen — written when it opens, not when it is scheduled. */
  | "notes_intro_shown"
  /** The dwell elapsed untouched and the panel is putting itself away. */
  | "notes_intro_auto_collapsed"
  /** The agent reached for Notes during the intro, so it stopped being one. */
  | "notes_intro_cancelled_by_interaction"
  /** The call-bar control was pressed — either direction. */
  | "notes_icon_clicked"
  /** Notes came back after the intro had put it away. */
  | "notes_panel_reopened"
  /** First keystroke of the call, however Notes was opened. */
  | "notes_first_input_started";

export const NOTES_TELEMETRY_EVENT = "jcai:notes-telemetry";

export type NotesTelemetryDetail = {
  event: NotesTelemetryEvent;
  /** Milliseconds since the page loaded — enough to read the sequence back. */
  at: number;
  [key: string]: unknown;
};

export function trackNotes(
  event: NotesTelemetryEvent,
  data?: Record<string, unknown>
) {
  const detail: NotesTelemetryDetail = {
    event,
    at: Math.round(performance.now()),
    ...data,
  };
  console.debug("[notes]", event, detail);
  window.dispatchEvent(new CustomEvent(NOTES_TELEMETRY_EVENT, { detail }));
}
