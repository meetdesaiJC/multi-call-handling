import * as React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import { QueueCrmPill } from "./QueueCrmPill";
import { QUEUE_CALL_LIMIT, callerLabel, type Caller } from "./webphoneCalls";

export type QueuedCaller = Caller & { arrivedAt: number };

/**
 * The sheet's clock, with its units spelled out: a bare "05:54" could be
 * minutes or hours, and a rep deciding who to take next shouldn't have to
 * guess. Two units at most so it still fits the tight cells.
 */
function formatWait(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * The redesign's queue, from Figma 164:1066. Production's list makes the rep
 * press Connect, then answer a second question on another screen — what
 * happens to the call they're on. Here that question is asked on the row:
 * every caller carries both answers, so taking someone is one decision, made
 * while the rep can still see who else is waiting and for how long.
 *
 * It drops down from the rail the rep clicked and takes the card's full
 * height, so the list gets every row it can; the call is still live
 * underneath, and the rail's "Hide" puts it back. Down, not up — this is a web app, and a panel that
 * rises from the bottom edge reads as a mobile sheet that came from nowhere.
 */
export function QueueSheet({
  callers,
  now,
  talking,
  linesFull,
  onHoldAndConnect,
  onEndAndConnect,
  onClose,
  closing = false,
}: {
  callers: QueuedCaller[];
  now: number;
  /** The rep is talking to someone, so there is a call to hold or end. */
  talking: boolean;
  /** Every line is busy: holding one more isn't possible, ending one is. */
  linesFull: boolean;
  onHoldAndConnect: (caller: QueuedCaller) => void;
  onEndAndConnect: (caller: QueuedCaller) => void;
  onClose: () => void;
  /** The rep asked to hide it: play the exit, then the parent unmounts it. */
  closing?: boolean;
}) {
  const waits = callers.map((c) => now - c.arrivedAt);
  const stats = [
    { label: "Longest wait", value: formatWait(Math.max(...waits)) },
    {
      label: "Avg wait",
      value: formatWait(waits.reduce((sum, w) => sum + w, 0) / waits.length),
    },
  ];

  return (
    <div
      data-state={closing ? "closed" : "open"}
      className={cn("absolute inset-0 z-40", closing && "pointer-events-none")}
    >
      <button
        type="button"
        aria-label="Close queue"
        tabIndex={-1}
        onClick={onClose}
        className="webphone-dim-in absolute inset-0 bg-webphone-sheet-dim outline-none"
      />
      <div
        role="dialog"
        aria-label="Callers in queue"
        className="webphone-queue-drop-in absolute inset-x-0 top-0 bottom-0 flex flex-col overflow-clip bg-webphone-sheet text-white shadow-webphone-sheet"
      >

        {/* No close button: the rail above already says "Hide", and a
            second way out in the same corner was just noise. */}
        <div className="pt-[14px] pr-[12px] pb-[10px] pl-[16px]">
          <h2 className="text-[15px] font-bold">Callers in queue</h2>
        </div>

        <div className="flex gap-[8px] px-[12px] pb-[8px]">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-1 flex-col gap-[2px] rounded-[10px] border border-webphone-sheet-line bg-webphone-sheet-well px-[12px] py-[10px] font-bold"
            >
              <span className="text-[9px] text-webphone-sheet-fg-label uppercase">
                {stat.label}
              </span>
              <span className="text-[20px] tabular-nums">{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="relative min-h-0 flex-1">
          <ol className="h-full overflow-y-auto border-t border-webphone-sheet-line pb-[28px]">
            {/* Newest first: the caller who just joined is the one the rep
                hasn't seen yet. No position numbers — the wait time already
                says who has been holding longest. */}
            {[...callers]
              .sort((a, b) => b.arrivedAt - a.arrivedAt)
              .map((caller) => (
                <QueueSheetRow
                  key={`${caller.number}-${caller.arrivedAt}`}
                  caller={caller}
                  wait={formatWait(now - caller.arrivedAt)}
                  talking={talking}
                  linesFull={linesFull}
                  onHoldAndConnect={() => onHoldAndConnect(caller)}
                  onEndAndConnect={() => onEndAndConnect(caller)}
                />
              ))}
          </ol>
          {/* The list runs under this fade rather than stopping at a hard
              edge, so a long queue reads as "more below". */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[28px] bg-linear-to-b from-transparent to-webphone-sheet"
          />
        </div>
      </div>
    </div>
  );
}

function QueueSheetRow({
  caller,
  wait,
  talking,
  linesFull,
  onHoldAndConnect,
  onEndAndConnect,
}: {
  caller: QueuedCaller;
  wait: string;
  talking: boolean;
  linesFull: boolean;
  onHoldAndConnect: () => void;
  onEndAndConnect: () => void;
}) {
  const where = [caller.number, caller.location].filter(Boolean).join("  ·  ");
  return (
    <li className="flex flex-col gap-[10px] border-b border-webphone-sheet-line py-[12px] pr-[12px] pl-[16px] last:border-b-0">
      <div className="flex items-center gap-[10px]">
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="flex min-w-0 items-center gap-[6px]">
            <span className="truncate text-[13px] font-semibold">
              {caller.name ? callerLabel(caller) : "Unknown caller"}
            </span>
            {caller.crm ? (
              <QueueCrmPill records={caller.integrations ?? [caller.crm]} />
            ) : null}
          </span>
          <span className="truncate text-[11px] whitespace-pre text-webphone-sheet-fg-muted">
            {where}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-px">
          <span className="text-[9px] font-medium text-webphone-sheet-fg-faint">
            Wait time
          </span>
          <span className="text-[13px] font-semibold tabular-nums">{wait}</span>
        </span>
      </div>

      <div className="flex gap-[8px]">
        {/* Each button says what it does to the call the rep is on — the
            half of the action its two-word label can't carry. */}
        {talking ? (
          <>
            <ActionTip
              disabled={linesFull}
              text={
                linesFull
                  ? `You're on ${QUEUE_CALL_LIMIT} calls. End one to connect ${firstName(caller)}.`
                  : `Your call goes on hold. ${firstName(caller)} connects now.`
              }
            >
              <SheetButton
                tone="connect"
                onClick={onHoldAndConnect}
                disabled={linesFull}
              >
                Hold &amp; connect
              </SheetButton>
            </ActionTip>
            <ActionTip
              text={`End the current call. ${firstName(caller)} will connect automatically once you complete the wrap-up.`}
            >
              <SheetButton tone="end" onClick={onEndAndConnect}>
                End &amp; wrap up
              </SheetButton>
            </ActionTip>
          </>
        ) : (
          // Nothing to hold or end: the rep is between calls, so the row
          // offers the one thing left to do — and only needs explaining when
          // it can't be done.
          <ActionTip
            disabled={linesFull}
            text={
              linesFull
                ? `You're on ${QUEUE_CALL_LIMIT} calls. End one to connect ${firstName(caller)}.`
                : null
            }
          >
            <SheetButton tone="connect" onClick={onHoldAndConnect} disabled={linesFull}>
              Connect
            </SheetButton>
          </ActionTip>
        )}
      </div>
    </li>
  );
}

/** "this caller" for an unknown number, the first name for a known one. */
function firstName(caller: Caller) {
  return caller.name ? caller.name.split(" ")[0] : "this caller";
}

/**
 * The design system's light tooltip, stretched to its button's half of the
 * row. The button already names the action, so the tip only says what it
 * does to the call the rep is on.
 * Light, because on the navy sheet a dark bubble reads as more sheet. Narrow
 * enough to stay inside the phone, and pointing down at its own button.
 *
 * The tooltip listens on a span around the button, not the button: a disabled
 * button fires no mouse events, so a tip bound to it would go silent exactly
 * when it has the most to explain. The disabled button lets the pointer
 * through to the span, and the span takes keyboard focus in its place.
 */
function ActionTip({
  text,
  disabled = false,
  children,
}: {
  /** null: nothing to explain, so no tooltip. */
  text: string | null;
  disabled?: boolean;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  return (
    <TooltipTrigger
      className="flex min-w-0 flex-1"
      disabled={text === null}
      content={
        <Tooltip theme="light" arrow="bottom-center" className="max-w-[200px]">
          <p className="text-paragraph-sm text-foreground">{text}</p>
        </Tooltip>
      }
    >
      <span
        className="flex min-w-0 flex-1 rounded-[6px] outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        tabIndex={disabled ? 0 : undefined}
        aria-label={disabled && text ? text : undefined}
      >
        {children}
      </span>
    </TooltipTrigger>
  );
}

function SheetButton({
  tone,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone: "connect" | "end";
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex flex-1 items-center justify-center rounded-[6px] py-[7px] text-[11px] font-semibold outline-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        tone === "connect"
          ? "bg-webphone-queue-rail text-white"
          : "border border-webphone-sheet-end-border text-webphone-sheet-end-fg",
        className,
      )}
      {...props}
    />
  );
}
