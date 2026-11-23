import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconArrowRight } from "@/components/Icon";

/**
 * Multi-call handling. Two prototypes: the admin who turns on "Ring agents
 * who are on a live call" for a queue, and the rep who then gets a second
 * call while already on one. A card passed no `onClick` stays inert (no hover
 * lift, no arrow).
 *
 * For now both cards open the non-calling license screens as the base the
 * multi-call screens get built on.
 */
type PrototypeLauncherProps = {
  onStartQueueSettings?: () => void;
  onStartMultiCall?: () => void;
};

function PrototypeCard({
  index,
  title,
  onClick,
}: {
  index: string;
  title: string;
  onClick?: () => void;
}) {
  const ready = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!ready}
      className={cn(
        "group relative flex min-h-[179px] w-full flex-col justify-end overflow-hidden rounded-lg border border-line bg-avatar-indigo-bg p-[19px] text-left",
        // `translate` and `scale`, not `transform` — Tailwind v4 emits the
        // standalone properties, so a transform-named transition matches
        // nothing and the lift snaps.
        "transition-[translate,scale,box-shadow,border-color,background-color] duration-moderate ease-entrance",
        "outline-none focus-visible:ring-4 focus-visible:ring-brand/24",
        ready &&
          "hover:-translate-y-1 hover:border-brand hover:bg-brand-subtle hover:shadow-200 active:scale-[0.98] active:duration-micro active:ease-exit motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        !ready && "cursor-default"
      )}
    >
      <div className="flex w-full items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-heading-xl text-disabled-fg transition-colors duration-moderate ease-entrance group-hover:group-enabled:text-brand">
            {index}
          </p>
          <p className="text-heading-xl text-foreground">{title}</p>
        </div>
        {ready && (
          <IconArrowRight
            size={24}
            className="shrink-0 text-foreground transition-[translate] duration-moderate ease-entrance group-hover:translate-x-1.5 motion-reduce:group-hover:translate-x-0"
          />
        )}
      </div>
    </button>
  );
}

function PrototypeGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-3">
      <h3 className="text-label-sm uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </h3>
      {children}
    </div>
  );
}

export function PrototypeLauncher({
  onStartQueueSettings,
  onStartMultiCall,
}: PrototypeLauncherProps) {
  return (
    <div className="h-screen overflow-y-auto bg-white">
      <main className="flex flex-col items-start gap-10 px-6 pb-[42px] pt-[42px] md:px-[75px]">
        <div className="flex flex-col items-start gap-2">
          <h1 className="text-heading-xxxl text-foreground">Multi-Call Handling</h1>
        </div>

        {/* More air between the groups than between a group's own cards, so
            the admin flow reads as its own thing. */}
        <div className="flex w-full flex-col items-start gap-10 sm:w-[400px]">
          {/* Admin first: the toggle is off by default, so a busy rep never
              rings until an admin turns it on for the queue. */}
          <PrototypeGroup label="Admin">
            <PrototypeCard
              index="01"
              title="Queue Settings: Ring busy agents"
              onClick={onStartQueueSettings}
            />
          </PrototypeGroup>

          <PrototypeGroup label="Rep experience">
            <PrototypeCard
              index="02"
              title="Handling Multiple Calls"
              onClick={onStartMultiCall}
            />
          </PrototypeGroup>
        </div>
      </main>
    </div>
  );
}
