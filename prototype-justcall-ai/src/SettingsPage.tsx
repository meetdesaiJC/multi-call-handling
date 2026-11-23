import * as React from "react";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import { Toggle } from "@/components/Toggle";
import { IconClose, IconUnavailabilityReason } from "@/components/Icon";
import { AdminPageHeader } from "./AgentAssistAdmin";
import {
  SEED_BUSY_REASONS,
  newBusyReasonId,
  offeredBusyReasons,
  type BusyReason,
} from "./callDeviceData";

/**
 * Account settings — the admin side of the phone.
 *
 * One section today: the unavailability reasons an agent picks from when they
 * go Unavailable. It lives here rather than in the webphone's own Settings tab
 * because it is set once for a whole floor and read by everyone on it, and a
 * list an agent could edit between calls is not a list a supervisor can report
 * on. That split is the reason this page exists: the phone's Settings hold the
 * agent's own choices — devices, wrap-up, which number they dial out on — and
 * anything the account decides for them belongs up here.
 *
 * Deliberately not padded out with the rest of JustCall's account settings.
 * Working hours, team management and the rest are real pages in the product
 * and none of them are what this prototype is about; a screen of controls that
 * do nothing teaches a reviewer to stop trusting the ones that do.
 */

export interface SettingsPageProps {
  reasons: BusyReason[];
  onReasonsChange: (next: BusyReason[]) => void;
}

export function SettingsPage({ reasons, onReasonsChange }: SettingsPageProps) {
  return (
    <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <AdminPageHeader
        title="Settings"
        description="What this account decides on every agent's behalf. Agents set their own devices and wrap-up time in the webphone."
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
        <UnavailabilityReasons
          reasons={reasons}
          onReasonsChange={onReasonsChange}
        />
      </div>
    </main>
  );
}

/**
 * The reason list, as an admin maintains it.
 *
 * Every row is an input rather than a label with a pencil beside it. There are
 * two edits an admin makes here — adding a reason and fixing the wording of
 * one — and a mode to enter before the second is a click spent on nothing. The
 * cost is a column of borders, which is what a settings list looks like
 * anyway.
 *
 * Off, not gone, is the primary way to retire one: a reason agents picked this
 * morning is on this morning's floor view, so switching it off stops offering
 * it without unnaming those calls. Removing is there for the reason that was a
 * mistake, and it says what it costs.
 */
function UnavailabilityReasons({
  reasons,
  onReasonsChange,
}: {
  reasons: BusyReason[];
  onReasonsChange: (next: BusyReason[]) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const [duplicate, setDuplicate] = React.useState(false);
  const offered = offeredBusyReasons(reasons);

  const taken = (label: string, exceptId?: string) =>
    reasons.some(
      (item) =>
        item.id !== exceptId &&
        item.label.trim().toLowerCase() === label.trim().toLowerCase()
    );

  const add = () => {
    const label = draft.trim();
    if (!label) return;
    if (taken(label)) {
      setDuplicate(true);
      return;
    }
    onReasonsChange([
      ...reasons,
      { id: newBusyReasonId(), label, enabled: true },
    ]);
    setDraft("");
    setDuplicate(false);
  };

  const rename = (id: string, label: string) => {
    onReasonsChange(
      reasons.map((item) => (item.id === id ? { ...item, label } : item))
    );
  };

  const setEnabled = (id: string, enabled: boolean) => {
    onReasonsChange(
      reasons.map((item) => (item.id === id ? { ...item, enabled } : item))
    );
  };

  const remove = (id: string) => {
    onReasonsChange(reasons.filter((item) => item.id !== id));
  };

  return (
    // Held to the same measure as the page description above it. A reason is
    // two words, and a field stretched to a 1440px column reads as a place to
    // write a sentence.
    <section className="flex max-w-[720px] flex-col rounded-lg border border-line bg-white">
      <header className="flex min-h-[52px] items-center gap-3 border-b border-line px-4 py-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-secondary-bg text-muted-foreground">
          <IconUnavailabilityReason size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-label-md-semi text-foreground">
            Unavailability reasons
          </h2>
          <p className="text-paragraph-sm text-muted-foreground">
            An agent going Unavailable picks one of these. Their team sees it
            beside their name, and reporting groups their off-queue time by it.
          </p>
        </div>
        <p className="shrink-0 text-paragraph-sm text-muted-foreground">
          {reasons.length === 0
            ? "None set up"
            : `${offered.length} of ${reasons.length} offered`}
        </p>
      </header>

      {reasons.length === 0 ? (
        <div className="flex flex-col items-start gap-3 px-4 py-5">
          <p className="max-w-[520px] text-paragraph-md text-muted-foreground">
            Until one exists, going Unavailable asks the agent for nothing —
            they drop off the queue and their team is told only that they are
            unavailable.
          </p>
          <Button
            size="sm"
            variant="grey-outline"
            onClick={() => onReasonsChange(SEED_BUSY_REASONS)}
          >
            Start from the default set
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 p-4">
          {reasons.map((item) => {
            // Flagged rather than blocked. A rename is typed a letter at a
            // time, and a field that refuses the keystroke that collides is a
            // field you cannot type "Training" into to get to "Training day".
            const blank = item.label.trim().length === 0;
            const clash = !blank && taken(item.label, item.id);
            return (
            <li key={item.id} className="flex items-start gap-3">
              <InputField
                value={item.label}
                onChange={(event) => rename(item.id, event.target.value)}
                error={blank || clash}
                helpText={
                  blank
                    ? "A reason agents can't read is a reason nobody picks."
                    : clash
                      ? "Another reason already has this name."
                      : undefined
                }
                helpTone={blank || clash ? "error" : "default"}
                clearable={false}
                aria-label={`Reason name: ${item.label}`}
                wrapperClassName="min-w-0 flex-1"
              />
              {/* The switch says whether agents can pick it, so it is labelled
                  with the state rather than with the reason's name — the name
                  is already in the field it sits beside. */}
              <Toggle
                checked={item.enabled}
                onCheckedChange={(next) => setEnabled(item.id, next)}
                aria-label={`Offer ${item.label} to agents`}
                label={item.enabled ? "Offered" : "Retired"}
                controlPosition="start"
                wrapperClassName="h-10 w-[104px] shrink-0 justify-center"
              />
              <button
                type="button"
                aria-label={`Remove ${item.label}`}
                onClick={() => remove(item.id)}
                className="flex size-8 shrink-0 items-center justify-center self-start rounded-[4px] mt-1 text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
              >
                <IconClose size={16} />
              </button>
            </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-start gap-3 border-t border-line px-4 py-4">
        <InputField
          placeholder="Add a reason — Commuting, Outage, Technical error…"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (duplicate) setDuplicate(false);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            add();
          }}
          error={duplicate}
          helpText={duplicate ? "That reason already exists." : undefined}
          helpTone={duplicate ? "error" : "default"}
          clearable={false}
          aria-label="Add a reason"
          wrapperClassName="min-w-0 flex-1"
        />
        <Button size="md" disabled={!draft.trim()} onClick={add}>
          Add reason
        </Button>
      </div>
    </section>
  );
}
