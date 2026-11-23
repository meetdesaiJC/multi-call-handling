import * as React from "react";
import { cn } from "@/lib/utils";
import { WebphoneCallEnd, WebphoneCaret, WebphoneStar } from "./icons/WebphoneIcons";
import { HeldRow } from "./WebphoneCallScreens";
import { formatClock, type Call, type WrapUp, type WrapUpDraft } from "./webphoneCalls";

/**
 * Production's post-call wrap-up, one per call. The PRD logs every call on its
 * own — notes, outcome, rating, hold time — so two calls mean two wrap-ups,
 * never one merged record.
 *
 * The draft lives in the call state, not here: a rep who leaves a half-written
 * note to resume a held caller finds it waiting when they come back.
 */

/** Production's outcome list is per-account; these stand in for a typical one. */
const CALL_OUTCOMES = [
  "Interested",
  "Not interested",
  "Call back later",
  "Left voicemail",
  "Wrong number",
];
const NOTE_LIMIT = 1500;

export function WrapUpScreen({
  wrapUp,
  held,
  now,
  queued,
  onDraft,
  onDone,
  onResumeHeld,
}: {
  wrapUp: WrapUp;
  held: Call | null;
  now: number;
  /** Further wrap-ups waiting behind this one. */
  queued: number;
  onDraft: (draft: WrapUpDraft) => void;
  onDone: () => void;
  onResumeHeld: () => void;
}) {
  const [hovered, setHovered] = React.useState(0);
  const { draft } = wrapUp;
  const shown = hovered || draft.rating;
  const update = (patch: Partial<WrapUpDraft>) => onDraft({ ...draft, ...patch });

  return (
    <div className="flex h-full flex-col bg-webphone-live text-white">
      <div className="flex h-[35px] shrink-0 items-end justify-between bg-webphone-wrapup-header px-[10px] pb-[3px]">
        <span className="text-[11px] leading-[16px] text-webphone-incoming-muted">
          {queued > 0 ? `${queued} more call${queued === 1 ? "" : "s"} to wrap up` : ""}
        </span>
        <button
          type="button"
          onClick={onDone}
          className="text-[12px] leading-[16px] tracking-[0.4px] text-webphone-incoming-muted underline outline-none hover:text-white"
        >
          Dismiss
        </button>
      </div>

      {held ? <HeldRow call={held} now={now} action="Resume" onAction={onResumeHeld} /> : null}

      {/* The call that just ended: production's red ring, not a live control. */}
      <div className="flex h-[74px] shrink-0 items-center gap-[14px] bg-webphone-wrapup-summary pl-[31px]">
        <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full border-2 border-webphone-ended text-webphone-ended">
          <WebphoneCallEnd className="size-[30px]" />
        </span>
        <span className="flex min-w-0 flex-col pr-[12px]">
          <span className="truncate text-[15px] leading-[20px] font-thin">
            {wrapUp.name ? `${wrapUp.name} · ${wrapUp.number}` : wrapUp.number}
          </span>
          <span className="text-[13px] leading-[19px] font-thin">
            {wrapUp.inbound ? `Line - ${wrapUp.line.number}` : `Calling via - ${wrapUp.line.number}`}
          </span>
          {/* The PRD captures hold time on the call that was held; showing it
              here is the rep's first sight of that number. */}
          <span className="text-[11px] leading-[15px] text-webphone-incoming-muted tabular-nums">
            Talk {formatClock(wrapUp.talkMs)}
            {wrapUp.heldMs >= 1000 ? ` · On hold ${formatClock(wrapUp.heldMs)}` : ""}
            {wrapUp.endedBy ? ` · ${wrapUp.endedBy}` : ""}
          </span>
        </span>
      </div>

      <div className="flex h-[42px] shrink-0 items-center justify-between border-b-2 border-webphone-wrapup-rule px-[15px]">
        <span className="text-[15px] leading-[20px] font-thin">Rate this call</span>
        <span className="flex" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              aria-pressed={draft.rating === star}
              onMouseEnter={() => setHovered(star)}
              onClick={() => update({ rating: star })}
              className={cn(
                "outline-none transition-colors",
                star <= shown ? "text-webphone-quality" : "text-webphone-star"
              )}
            >
              <WebphoneStar className="size-[19px]" />
            </button>
          ))}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center pt-[15px]">
        <p className="text-[15px] leading-[20px] font-thin">Add a note</p>

        <label className="relative mt-[12px] w-[250px]">
          <span className="sr-only">Call outcome</span>
          <select
            value={draft.outcome}
            onChange={(event) => update({ outcome: event.target.value })}
            className="h-[28px] w-full appearance-none rounded-[3px] bg-white pr-6 pl-[10px] text-[12px] text-foreground outline-none"
          >
            <option value="" disabled>
              Select call outcome
            </option>
            {CALL_OUTCOMES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <WebphoneCaret className="pointer-events-none absolute top-[6px] right-[4px] size-4 text-webphone-star" />
        </label>

        <label className="mt-[6px] w-[250px]">
          <span className="sr-only">Notes</span>
          <textarea
            value={draft.note}
            maxLength={NOTE_LIMIT}
            onChange={(event) => update({ note: event.target.value })}
            placeholder="Notes"
            className={cn(
              "block w-full resize-none bg-webphone-wrapup-field px-[4px] py-[6px] text-[12px] leading-[17px] text-white outline-none placeholder:text-webphone-placeholder",
              // The held row costs the form its height, not the Save button.
              held ? "h-[62px]" : "h-[102px]"
            )}
          />
        </label>
        <span className="mt-[3px] w-[250px] text-right text-[10px] leading-[14px] font-medium text-webphone-caller">
          {draft.note.length}/{NOTE_LIMIT}
        </span>

        <button
          type="button"
          onClick={onDone}
          className={cn(
            "h-[39px] w-[180px] rounded-full bg-webphone-save text-[15px] text-white outline-none active:scale-[0.98]",
            held ? "mt-[14px]" : "mt-[26px]"
          )}
        >
          Save
        </button>
        {/* Both stay inert: the prototype has no SMS composer or scheduler. */}
        <span className="mt-[9px] text-[14px] leading-[22px] font-medium">Send a text message</span>
        <span className="mt-auto mb-[17px] text-[14px] leading-[20px] font-medium underline">
          Schedule follow up call
        </span>
      </div>
    </div>
  );
}
