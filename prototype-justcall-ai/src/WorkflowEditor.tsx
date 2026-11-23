import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBolt,
  IconCheck,
  IconClose,
  IconDotsVertical,
  IconFocusCentered,
  IconMinus,
  IconNote,
  IconPencil,
  IconPhoneIncoming,
  IconPlus,
  IconRinging,
  IconTrash,
  IconVoicemailMessage,
} from "@/components/Icon";
import { InputField } from "@/components/InputField";
import { LockedControl, type Lock } from "@/components/LockedControl";
import { Menu } from "@/components/Menu";
import { Radio } from "@/components/Radio";
import { Sidesheet } from "@/components/Sidesheet";
import { Tag } from "@/components/Tag";
import { Toggle } from "@/components/Toggle";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import type { Workflow } from "./workflowsData";

/**
 * Workflow builder — opened from the Workflows table's pencil.
 *
 * For the non-calling licenses this is how a workflow is *read*: the canvas,
 * zoom and fit all work, and every control that would change the workflow
 * stays where it is, muted, with the same license tooltip as the table. Hiding
 * them would make it look like a different, smaller screen.
 */

const ZOOM_STEP = 10;
const ZOOM_MIN = 30;
const ZOOM_MAX = 200;

/** Locks one control when `lock` is set; renders it untouched otherwise. */
function Gate({
  lock,
  className,
  children,
}: {
  lock?: Lock;
  className?: string;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  return (
    <LockedControl locked={Boolean(lock)} reason={lock?.reason} hint={lock?.hint} triggerClassName={className}>
      {children}
    </LockedControl>
  );
}

/** A plain dark tooltip naming an icon-only control. */
function Named({ title, children }: { title: string; children: React.ReactElement<Record<string, unknown>> }) {
  return (
    <TooltipTrigger placement="bottom" content={<Tooltip theme="dark" arrow="top-center" title={title} />}>
      {children}
    </TooltipTrigger>
  );
}

/** Named when open, locked when not — never both, so it never shows two tooltips. */
function Action({
  title,
  lock,
  children,
}: {
  title: string;
  lock?: Lock;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  return lock ? <Gate lock={lock}>{children}</Gate> : <Named title={title}>{children}</Named>;
}

const ICON_BUTTON =
  "flex size-9 items-center justify-center rounded-[4px] text-foreground transition-colors outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/24 " +
  "data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-transparent";

/* ------------------------------------------------------------------ */
/* Canvas pieces                                                       */
/* ------------------------------------------------------------------ */

/**
 * A stretch of connector. `arrow` ends it with a small head into the next
 * node; no `height` means "fill the rest of the column", so the shorter branch
 * still reaches the merge rail.
 */
function Line({ height, arrow = false }: { height?: number; arrow?: boolean }) {
  return (
    <span className={cn("flex flex-col items-center", height === undefined && "flex-1")} aria-hidden="true">
      <span className={cn("w-px bg-info-border", height === undefined && "flex-1")} style={height ? { height } : undefined} />
      {arrow ? <span className="size-0 border-x-[3px] border-t-4 border-x-transparent border-t-info-border" /> : null}
    </span>
  );
}

/** "Add a step here" on a connector. Adding is editing, so it locks with the rest. */
function AddStep({ lock }: { lock?: Lock }) {
  return (
    <Action title="Add step" lock={lock}>
      <button
        type="button"
        aria-label="Add step"
        className="flex size-[18px] items-center justify-center rounded-full border border-brand bg-white text-brand transition-colors outline-none hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:border-line data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white"
      >
        <IconPlus size={16} className="size-3" />
      </button>
    </Action>
  );
}

/** A step on the canvas. Opening one is reading it, so it opens for every license. */
function StepCard({
  icon,
  iconClassName,
  title,
  subtitle,
  selected,
  onOpen,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={selected}
      className={cn(
        "flex w-[272px] items-center gap-3 rounded-[4px] border bg-white px-3 py-3 text-left shadow-100 transition-colors outline-none hover:border-brand focus-visible:ring-2 focus-visible:ring-brand/24",
        selected ? "border-brand" : "border-line"
      )}
    >
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[4px]", iconClassName)}>{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-label-md text-foreground">{title}</span>
        <span className="truncate text-paragraph-sm text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

function Outcome({ tone, children }: { tone: "answered" | "unanswered"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-label-xs",
        tone === "answered"
          ? "border-success bg-success-secondary text-success-text"
          : "border-info-border bg-brand-subtle text-brand"
      )}
    >
      {children}
    </span>
  );
}

/**
 * The flow from the reference: ring the team, then voicemail if nobody picks
 * up. Fixed for every workflow — the prototype is about what the license can
 * do on this screen, not about workflow content.
 */
function Flow({
  lock,
  openStep,
  onOpenStep,
}: {
  lock?: Lock;
  openStep: StepKey | null;
  onOpenStep: (step: StepKey) => void;
}) {
  // Branch columns sit 296px apart (centre to centre); the split and merge
  // rails span exactly that, so both outcomes hang straight off them.
  const branchGap = 296;
  return (
    <div className="flex flex-col items-center">
      <span className="flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-label-xs text-white">
        <IconBolt size={16} />
        START
      </span>
      <Line height={48} arrow />
      <button
        type="button"
        onClick={() => onOpenStep("incoming")}
        aria-pressed={openStep === "incoming"}
        className={cn(
          "flex items-center gap-2 rounded-full border bg-white py-2 pr-6 pl-3 shadow-100 transition-colors outline-none hover:border-brand focus-visible:ring-2 focus-visible:ring-brand/24",
          openStep === "incoming" ? "border-brand" : "border-line"
        )}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-subtle text-brand">
          <IconPhoneIncoming size={16} />
        </span>
        <span className="text-label-md text-foreground">Incoming call</span>
      </button>
      <Line height={40} />
      <AddStep lock={lock} />
      <Line height={80} arrow />
      <StepCard
        icon={<IconRinging size={20} />}
        iconClassName="bg-avatar-purple-bg text-avatar-purple-fg"
        title="Ring Members/Groups"
        subtitle="80 user group(s)"
        selected={openStep === "ring"}
        onOpen={() => onOpenStep("ring")}
      />
      <Line height={34} />

      {/* Split: one rail, two drops. */}
      <div className="relative flex justify-between" style={{ width: branchGap }}>
        <span className="absolute inset-x-0 top-0 h-3 rounded-t-md border-x border-t border-info-border" aria-hidden="true" />
      </div>

      <div className="flex justify-between" style={{ width: branchGap + 272 }}>
        {/* Answered: straight through to the merge. */}
        <div className="flex w-[272px] flex-col items-center pt-3">
          <Outcome tone="answered">Answered</Outcome>
          <Line height={60} />
          <AddStep lock={lock} />
          <Line />
        </div>
        {/* Unanswered: voicemail, then down to the merge. */}
        <div className="flex w-[272px] flex-col items-center pt-3">
          <Outcome tone="unanswered">Unanswered</Outcome>
          <Line height={60} />
          <AddStep lock={lock} />
          <Line height={80} arrow />
          <StepCard
            icon={<IconVoicemailMessage size={20} />}
            iconClassName="bg-avatar-purple-bg text-avatar-purple-fg"
            title="Voicemail"
            subtitle="Record caller’s message"
            selected={openStep === "voicemail"}
            onOpen={() => onOpenStep("voicemail")}
          />
          <Line height={60} />
          <AddStep lock={lock} />
          <Line height={52} />
        </div>
      </div>

      {/* Merge: the mirror of the split. */}
      <div className="relative h-3" style={{ width: branchGap }}>
        <span className="absolute inset-x-0 bottom-0 h-3 rounded-b-md border-x border-b border-info-border" aria-hidden="true" />
      </div>
      <Line height={20} />
      <AddStep lock={lock} />
      <Line height={56} arrow />
      <span className="rounded-full border border-error bg-error-subtle px-4 py-1.5 text-label-xs text-error">END</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step details                                                        */
/* ------------------------------------------------------------------ */

type StepKey = "incoming" | "ring" | "voicemail";

const STEP_SHEETS: Record<StepKey, { title: string; description: string; deletable: boolean }> = {
  incoming: {
    title: "Incoming call",
    description: "Calls to these numbers start this workflow.",
    // The trigger is the workflow's first node; there's nothing to delete it from.
    deletable: false,
  },
  ring: {
    title: "Ring Members/Groups",
    description: "Choose who rings when a call reaches this step, and how.",
    deletable: true,
  },
  voicemail: {
    title: "Voicemail",
    description: "What callers hear and what happens to their message.",
    deletable: true,
  },
};

/** A labelled group of controls inside the sheet. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-label-md text-foreground">{label}</span>
      {children}
    </div>
  );
}

function StepFields({ step, readOnly }: { step: StepKey; readOnly: boolean }) {
  if (step === "incoming") {
    return (
      <Field label="Numbers">
        <div className="flex flex-wrap gap-2">
          {/* One number, then +N — the tag-row rule everywhere else. */}
          <Tag size="md" color="grey">
            (856) 567-5552
          </Tag>
          <Tag size="md" color="grey">
            +2
          </Tag>
        </div>
      </Field>
    );
  }
  if (step === "ring") {
    return (
      <>
        <Field label="Members/Groups">
          <div className="flex flex-wrap gap-2">
            <Tag size="md" color="grey">
              Sales
            </Tag>
            <Tag size="md" color="grey">
              +79
            </Tag>
          </div>
        </Field>
        <Field label="Ring strategy">
          <div role="radiogroup" aria-label="Ring strategy" className="flex flex-col gap-3">
            <Radio name="ring-strategy" label="Simultaneous" description="Ring everyone at once." defaultChecked disabled={readOnly} />
            <Radio name="ring-strategy" label="Round robin" description="Ring one member at a time, in turn." disabled={readOnly} />
          </div>
        </Field>
        <InputField label="Ring for (seconds)" defaultValue="30" disabled={readOnly} />
      </>
    );
  }
  return (
    <>
      <Field label="Greeting">
        <div role="radiogroup" aria-label="Greeting" className="flex flex-col gap-3">
          <Radio name="voicemail-greeting" label="Text to speech" defaultChecked disabled={readOnly} />
          <Radio name="voicemail-greeting" label="Audio file" disabled={readOnly} />
        </div>
      </Field>
      <InputField
        label="Message"
        defaultValue="Sorry we missed you. Leave a message and we'll call you back."
        disabled={readOnly}
      />
      <Toggle label="Transcribe voicemail" defaultChecked disabled={readOnly} />
      <Toggle label="Email voicemail to members" disabled={readOnly} />
    </>
  );
}

/**
 * A step's settings. For a license that can't edit workflows it opens the
 * same sheet with every field disabled and Save / Delete Block locked — the
 * settings are still there to read, only the verbs are blocked.
 */
function StepSheet({ step, lock, onClose }: { step: StepKey | null; lock?: Lock; onClose: () => void }) {
  // Keep the last step while the sheet slides out, so its content doesn't
  // blank mid-exit.
  const [shown, setShown] = useState<StepKey>("ring");
  if (step && step !== shown) setShown(step);
  const sheet = STEP_SHEETS[shown];
  const readOnly = Boolean(lock);

  return (
    <Sidesheet open={step !== null} onClose={onClose} width={520}>
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-heading-lg text-foreground">{sheet.title}</h2>
          <p className="text-paragraph-sm text-muted-foreground">{sheet.description}</p>
        </div>
        <Named title="Close">
          <button type="button" aria-label="Close step" onClick={onClose} className={ICON_BUTTON}>
            <IconClose size={20} />
          </button>
        </Named>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-6 py-6">
        <InputField label="Title (Optional)" placeholder={sheet.title} disabled={readOnly} />
        <StepFields key={shown} step={shown} readOnly={readOnly} />
      </div>

      <div
        className={cn(
          "flex shrink-0 items-center gap-3 border-t border-line px-6 py-4",
          sheet.deletable ? "justify-between" : "justify-end"
        )}
      >
        {sheet.deletable ? (
          <Gate lock={lock}>
            <Button variant="error-secondary" size="md">
              Delete Block
            </Button>
          </Gate>
        ) : null}
        <Gate lock={lock}>
          <Button variant="primary" size="md" onClick={onClose}>
            Save
          </Button>
        </Gate>
      </div>
    </Sidesheet>
  );
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export function WorkflowEditor({
  workflow,
  lock,
  deleteLock,
  onClose,
}: {
  workflow: Workflow;
  /** Set when the license can't change workflows: the builder opens read-only. */
  lock?: Lock;
  /**
   * Deleting is its own permission, not part of editing: Lite can delete a
   * workflow it can't edit. Only View-only sets this.
   */
  deleteLock?: Lock;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(100);
  const [openStep, setOpenStep] = useState<StepKey | null>(null);
  const published = workflow.status !== "Draft";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Workflow ${workflow.name}`}
      className="fixed inset-0 z-50 flex flex-col bg-white"
    >
      <header className="flex h-[72px] shrink-0 items-center justify-between gap-6 border-b border-line px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Named title="Close">
            <button type="button" aria-label="Close workflow" onClick={onClose} className={ICON_BUTTON}>
              <IconClose size={20} />
            </button>
          </Named>
          <h1 className="truncate text-heading-xl text-foreground">{workflow.name}</h1>
          <Tag size="md" color="indigo" className="shrink-0">
            V2
          </Tag>
          <Action title="Rename" lock={lock}>
            <button type="button" aria-label="Rename workflow" className={cn(ICON_BUTTON, "size-7")}>
              <IconPencil size={16} />
            </button>
          </Action>
          <Tag size="md" color={workflow.status === "Draft" ? "grey" : "green"} className="shrink-0">
            {workflow.status}
          </Tag>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Action title="Undo" lock={lock}>
            <button type="button" aria-label="Undo" className={ICON_BUTTON}>
              <IconArrowBackUp size={20} />
            </button>
          </Action>
          <Action title="Redo" lock={lock}>
            <button type="button" aria-label="Redo" className={ICON_BUTTON}>
              <IconArrowForwardUp size={20} />
            </button>
          </Action>
          <Gate lock={lock}>
            <Button variant="grey-outline" size="md" className="ml-2">
              Save as Draft
            </Button>
          </Gate>
          {published ? (
            // Already live: nothing to publish, for any license.
            <Button variant="primary" size="md" disabled leftIcon={<IconCheck size={20} />}>
              Published
            </Button>
          ) : (
            <Gate lock={lock}>
              <Button variant="primary" size="md">
                Publish
              </Button>
            </Gate>
          )}
          {/* Open for every license: the menu holds Delete, which Lite keeps.
              Each item locks on its own. */}
          <Menu
            label="More actions"
            align="end"
            items={[
              { key: "rename", label: "Rename", icon: <IconPencil size={16} />, locked: lock },
              {
                key: "delete",
                label: "Delete workflow",
                icon: <IconTrash size={16} />,
                destructive: true,
                separatorBefore: true,
                locked: deleteLock,
                onSelect: onClose,
              },
            ]}
            trigger={
              <button type="button" aria-label="More actions" className={ICON_BUTTON}>
                <IconDotsVertical size={20} />
              </button>
            }
          />
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-auto bg-secondary-bg bg-[radial-gradient(var(--color-line)_1px,transparent_1px)] bg-size-[16px_16px]">
        {/* Viewing controls — open to every license. */}
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-8">
          <div className="flex h-[52px] items-center rounded-[4px] border border-line bg-white shadow-100">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoom <= ZOOM_MIN}
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
              className={cn(ICON_BUTTON, "ml-2 disabled:text-disabled-fg")}
            >
              <IconMinus size={20} />
            </button>
            <span className="w-14 text-center text-paragraph-md text-foreground tabular-nums" aria-live="polite">
              {zoom}%
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoom >= ZOOM_MAX}
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
              className={cn(ICON_BUTTON, "mr-2 disabled:text-disabled-fg")}
            >
              <IconPlus size={20} />
            </button>
            <span className="h-full w-px bg-line" aria-hidden="true" />
            <Named title="Fit to screen">
              <button type="button" aria-label="Fit to screen" onClick={() => setZoom(100)} className={cn(ICON_BUTTON, "mx-2")}>
                <IconFocusCentered size={20} />
              </button>
            </Named>
          </div>
          <Action title="Add note" lock={lock}>
            <button
              type="button"
              aria-label="Add note"
              className={cn(ICON_BUTTON, "size-11 border border-line bg-white shadow-100 data-[locked=true]:hover:bg-white")}
            >
              <IconNote size={20} />
            </button>
          </Action>
        </div>

        <div className="flex min-h-full justify-center px-6 pt-16 pb-24">
          <div style={{ zoom: zoom / 100 }}>
            <Flow lock={lock} openStep={openStep} onOpenStep={setOpenStep} />
          </div>
        </div>
      </div>
      <StepSheet step={openStep} lock={lock} onClose={() => setOpenStep(null)} />
    </div>
  );
}
