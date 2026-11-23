import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const CHECKLIST_MOTION = {
  detectMs: 160,
  completeMs: 200,
  glowMs: 360,
  staggerMs: 120,
} as const;

export type CheckPhase = "idle" | "detecting" | "completing" | "done";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function completedIndexes(playhead: number | undefined, completed: ReadonlySet<number> | undefined): Set<number> {
  if (completed) return new Set(completed);
  const target = new Set<number>();
  const count = playhead ?? 0;
  for (let index = 0; index < count; index += 1) target.add(index);
  return target;
}

export function useScriptChecklistMotion({
  playhead,
  completed,
  stepCount,
  reduced,
}: {
  playhead?: number;
  completed?: ReadonlySet<number>;
  stepCount: number;
  reduced: boolean;
}) {
  const [phases, setPhases] = useState<CheckPhase[]>(() =>
    Array.from({ length: stepCount }, () => "idle")
  );
  const [glowing, setGlowing] = useState<Set<number>>(() => new Set());

  const settledRef = useRef<Set<number>>(new Set());
  const itemTimers = useRef<Map<number, number[]>>(new Map());

  const cancelItem = (index: number) => {
    const timers = itemTimers.current.get(index);
    if (!timers) return;
    timers.forEach((id) => window.clearTimeout(id));
    itemTimers.current.delete(index);
  };

  useEffect(
    () => () => {
      itemTimers.current.forEach((timers) =>
        timers.forEach((id) => window.clearTimeout(id))
      );
      itemTimers.current.clear();
      settledRef.current = new Set();
    },
    []
  );

  useEffect(() => {
    const target = completedIndexes(playhead, completed);

    const toRevert: number[] = [];
    for (const index of settledRef.current) {
      if (!target.has(index)) toRevert.push(index);
    }

    const toComplete: number[] = [];
    for (const index of target) {
      if (!settledRef.current.has(index)) toComplete.push(index);
    }
    toComplete.sort((a, b) => a - b);

    if (toRevert.length > 0) {
      for (const index of toRevert) {
        cancelItem(index);
        settledRef.current.delete(index);
      }
      setPhases((current) => {
        const next =
          current.length === stepCount
            ? [...current]
            : Array.from({ length: stepCount }, (_, i) => current[i] ?? "idle");
        toRevert.forEach((index) => {
          next[index] = "idle";
        });
        return next;
      });
      setGlowing((current) => {
        const next = new Set(current);
        toRevert.forEach((index) => next.delete(index));
        return next;
      });
    }

    if (toComplete.length === 0) return;

    if (reduced) {
      toComplete.forEach((index) => settledRef.current.add(index));
      setPhases((current) => {
        const next =
          current.length === stepCount
            ? [...current]
            : Array.from({ length: stepCount }, (_, i) => current[i] ?? "idle");
        toComplete.forEach((index) => {
          next[index] = "done";
        });
        return next;
      });
      return;
    }

    toComplete.forEach((index, order) => {
      settledRef.current.add(index);
      const start = order * CHECKLIST_MOTION.staggerMs;
      const timers: number[] = [];

      timers.push(
        window.setTimeout(() => {
          setPhases((current) => {
            const next = [...current];
            next[index] = "detecting";
            return next;
          });
        }, start)
      );

      timers.push(
        window.setTimeout(() => {
          setPhases((current) => {
            const next = [...current];
            next[index] = "completing";
            return next;
          });
        }, start + CHECKLIST_MOTION.detectMs)
      );

      timers.push(
        window.setTimeout(() => {
          setPhases((current) => {
            const next = [...current];
            next[index] = "done";
            return next;
          });
          setGlowing((current) => new Set(current).add(index));
        }, start + CHECKLIST_MOTION.detectMs + CHECKLIST_MOTION.completeMs)
      );

      timers.push(
        window.setTimeout(() => {
          setGlowing((current) => {
            const next = new Set(current);
            next.delete(index);
            return next;
          });
        }, start + CHECKLIST_MOTION.detectMs + CHECKLIST_MOTION.completeMs + CHECKLIST_MOTION.glowMs)
      );

      itemTimers.current.set(index, timers);
    });
  }, [playhead, completed, stepCount, reduced]);

  return { phases, glowing };
}

function ScriptCheckMark({
  phase,
  glow,
}: {
  phase: CheckPhase;
  glow: boolean;
}) {
  return (
    <span
      className={cn(
        "relative flex size-4 shrink-0 items-center justify-center",
        glow && "script-check-glow"
      )}
    >
      <svg
        viewBox="0 0 16 16"
        width={16}
        height={16}
        fill="none"
        aria-hidden="true"
        data-phase={phase}
        className={cn(
          "script-check size-4 overflow-visible",
          phase === "completing" || phase === "done"
            ? "text-success"
            : "text-disabled-fg"
        )}
      >
        <circle className="script-check-fill" cx="8" cy="8" r="6" />
        <circle
          className="script-check-dash"
          cx="8"
          cy="8"
          r="6"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeDasharray="1.55 2.4"
          strokeLinecap="round"
        />
        <path
          className="script-check-mark"
          d="M5.15 8.2 L7.1 10.15 L10.95 5.85"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function ScriptStepRow({
  title,
  wording,
  phase,
  glow,
  reduced,
}: {
  title: string;
  wording?: string;
  phase: CheckPhase;
  glow: boolean;
  reduced: boolean;
}) {
  const complete = phase === "completing" || phase === "done";

  return (
    <div className="px-1 py-1.5">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center overflow-visible">
          <ScriptCheckMark phase={phase} glow={glow} />
        </span>
        <div className="min-w-0 flex-1">
          {/* Spoken lines step back a shade — the title still leads the
              wording, so the hierarchy holds in both states. The check is
              what says "said"; no strikethrough. */}
          <p
            className={cn(
              "script-step-title min-w-0 text-pretty text-[13px] leading-5 font-medium",
              complete ? "text-muted-foreground" : "text-foreground",
              reduced && "transition-none"
            )}
          >
            {title}
            {complete ? <span className="sr-only"> — spoken</span> : null}
          </p>
          {wording ? (
            <p
              className={cn(
                "script-step-wording mt-0.5 text-pretty text-[13px] leading-5",
                complete ? "text-disabled-fg" : "text-muted-foreground",
                reduced && "transition-none"
              )}
            >
              “{wording}”
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
