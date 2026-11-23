import * as React from "react";
import { InputField } from "@/components/InputField";
import {
  IconAlertTriangleFilled,
  IconCircleCheckFilled,
  IconFile,
} from "@/components/Icon";
import { cn } from "@/lib/utils";
import { IconAaActions } from "./icons/AgentAssistNavIcons";
import {
  capabilityById,
  emailAttachmentDisplay,
  integrationById,
  integrationDeepLink,
  integrationDoneLabel,
  integrationWriteLabel,
  isSendEmailCapability,
  isValidEmailAddress,
  previewEmail,
  previewExtractedValue,
  type AgentAction,
  type EmailAttachment,
  type Integration,
} from "./actionsData";

export function ActionReviewField({
  label,
  value,
  secondary,
  secondaryTone = "muted",
}: {
  label: string;
  value: string;
  /** Muted second line — e.g. the recipient's address under their name. */
  secondary?: string;
  secondaryTone?: "muted" | "error";
}) {
  return (
    <div className="min-w-0">
      <dt className="text-label-sm text-muted-foreground">{label}</dt>
      <dd className="text-pretty text-paragraph-md text-foreground">{value}</dd>
      {secondary ? (
        <dd
          className={cn(
            "truncate text-paragraph-sm",
            secondaryTone === "error" ? "text-error" : "text-muted-foreground"
          )}
        >
          {secondary}
        </dd>
      ) : null}
    </div>
  );
}

function SendingSpinner() {
  return (
    <svg
      className="size-3.5 shrink-0 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The file itself, not a line of prose about it. The agent has to be able to
 * answer "what am I attaching?" without opening anything.
 */
function EmailAttachmentRow({ attachment }: { attachment: EmailAttachment }) {
  const { fileName, meta, href } = emailAttachmentDisplay(attachment);
  return (
    <div className="flex items-center gap-2.5 rounded-[4px] border border-line bg-secondary-bg px-2.5 py-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] border border-line bg-white text-muted-foreground">
        <IconFile size={16} className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-label-md text-foreground">
          {fileName}
        </p>
        <p className="text-label-sm text-muted-foreground">{meta}</p>
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-7 shrink-0 items-center rounded-[4px] px-2 text-label-sm font-medium text-brand outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          View
        </a>
      ) : null}
    </div>
  );
}

function EmailAttachmentList({
  attachments,
  labelled = false,
}: {
  attachments: EmailAttachment[];
  labelled?: boolean;
}) {
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {labelled ? (
        <p className="text-label-md text-foreground">
          {attachments.length === 1 ? "Attachment" : "Attachments"}
        </p>
      ) : null}
      {attachments.map((attachment) => (
        <EmailAttachmentRow key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
}

/**
 * Recipient as one compact block: who it goes to on top, the address that
 * actually receives it underneath — editable, because a wrong address is the
 * most expensive thing on this card.
 */
function EmailRecipientField({
  name,
  email,
  disabled,
  onEmailChange,
}: {
  name: string;
  email: string;
  disabled?: boolean;
  onEmailChange: (value: string) => void;
}) {
  const id = React.useId();
  const invalid = !isValidEmailAddress(email);
  const helpText = !email.trim()
    ? "No email address on this contact — add one to continue."
    : invalid
      ? "Enter a valid email address to continue."
      : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-label-md text-foreground" htmlFor={id}>
        To
      </label>
      <div
        className={cn(
          "flex flex-col rounded-[4px] border border-line bg-white px-3 py-1.5 transition-colors",
          "hover:border-control-border focus-within:border-brand focus-within:hover:border-brand",
          invalid &&
            "border-error hover:border-error focus-within:border-error focus-within:hover:border-error",
          disabled && "pointer-events-none border-line bg-control-disabled-bg"
        )}
      >
        {name ? (
          <p
            className={cn(
              "truncate text-label-md text-foreground",
              disabled && "text-disabled-fg"
            )}
          >
            {name}
          </p>
        ) : null}
        <input
          id={id}
          type="email"
          value={email}
          disabled={disabled}
          placeholder="name@company.com"
          aria-invalid={invalid || undefined}
          aria-describedby={helpText ? `${id}-help` : undefined}
          onChange={(event) => onEmailChange(event.target.value)}
          className="m-0 w-full min-w-0 appearance-none border-0 bg-transparent p-0 text-paragraph-sm text-muted-foreground outline-none placeholder:text-disabled-fg disabled:cursor-not-allowed disabled:text-disabled-fg"
        />
      </div>
      {helpText ? (
        <p id={`${id}-help`} className="text-paragraph-sm text-error">
          {helpText}
        </p>
      ) : null}
    </div>
  );
}

function ActionCardCta({
  label,
  busy,
  onClick,
}: {
  label: string;
  busy?: boolean;
  onClick?: () => void;
}) {
  const className =
    "-mr-1 inline-flex h-7 shrink-0 cursor-pointer items-center rounded-[4px] px-2 text-label-sm font-medium text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24 disabled:cursor-default disabled:opacity-60";
  if (onClick) {
    return (
      <button type="button" disabled={busy} onClick={onClick} className={className}>
        {label}
      </button>
    );
  }
  return <span className={cn(className, "cursor-default")}>{label}</span>;
}

function ActionReviewActions({
  cancelLabel = "Cancel",
  confirmLabel,
  confirmIcon,
  confirmDisabled,
  busy,
  onCancel,
  onConfirm,
}: {
  cancelLabel?: string;
  confirmLabel: string;
  confirmIcon?: React.ReactNode;
  confirmDisabled?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={onCancel}
        className="inline-flex h-7 cursor-pointer items-center rounded-[4px] px-2 text-label-sm text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24 disabled:cursor-default disabled:opacity-60"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        disabled={confirmDisabled || busy}
        onClick={onConfirm}
        className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[4px] px-2 text-label-sm font-medium text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24 disabled:cursor-default disabled:opacity-60"
      >
        {confirmIcon}
        {confirmLabel}
      </button>
    </div>
  );
}

function ActionCardHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <IconAaActions className="size-4 shrink-0 text-foreground" />
      <p className="min-w-0 flex-1 text-pretty text-label-md font-medium text-foreground">
        {title}
      </p>
    </div>
  );
}

/**
 * Suggested-state Action card — the same surface the agent sees mid-call.
 * Preview and the live panel both wire `onReview` so the next state is visible.
 */
export function InCallActionSuggestionCard({
  title,
  property,
  value,
  recordLabel,
  recordValue,
  busy = false,
  onReview,
  className,
}: {
  title: string;
  property: string;
  value: string;
  recordLabel: string;
  recordValue: string;
  busy?: boolean;
  onReview?: () => void;
  className?: string;
}) {
  const cta = busy ? "Working…" : "Review action";

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-lg border border-line bg-white px-3 py-2",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <IconAaActions className="size-4 shrink-0 text-foreground" />
        <p className="min-w-0 flex-1 text-pretty text-label-md font-medium text-foreground">
          {title}
        </p>
        <ActionCardCta label={cta} busy={busy} onClick={onReview} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-6">
        <ActionReviewField label={property} value={value} />
        <ActionReviewField label={recordLabel} value={recordValue} />
      </dl>
    </div>
  );
}

/**
 * Suggested-state Send email card — recipient, subject, and the generated
 * body. Setup preview and the live stream share this surface.
 */
export function InCallEmailSuggestionCard({
  title,
  to,
  toEmail,
  subject,
  body,
  attachments = [],
  cta = "Review email",
  busy = false,
  onReview,
  className,
}: {
  title: string;
  to: string;
  toEmail?: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
  cta?: string;
  busy?: boolean;
  onReview?: () => void;
  className?: string;
}) {
  const label = busy ? "Working…" : cta;
  // A missing address is the one thing worth flagging before the agent opens
  // the card — everything else they can read here as-is.
  const addressMissing = toEmail !== undefined && !toEmail.trim();

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-lg border border-line bg-white px-3 pb-3.5 pt-2",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <IconAaActions className="size-4 shrink-0 text-foreground" />
        <p className="min-w-0 flex-1 text-pretty text-label-md font-medium text-foreground">
          {title}
        </p>
        <ActionCardCta label={label} busy={busy} onClick={onReview} />
      </div>

      <div className="flex flex-col gap-1.5 pl-6">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          <ActionReviewField
            label="To"
            value={to}
            secondary={addressMissing ? "No email address" : toEmail}
            secondaryTone={addressMissing ? "error" : "muted"}
          />
          <ActionReviewField label="Subject" value={subject} />
        </dl>
        <p className="line-clamp-4 whitespace-pre-wrap text-pretty text-paragraph-sm text-foreground">
          {body}
        </p>
        <EmailAttachmentList attachments={attachments} />
      </div>
    </div>
  );
}

/** Where the email sits between "review" and "gone". */
export type EmailSendState = "idle" | "sending" | "failed";

/** Expanded review form after the agent clicks Review email. */
export function InCallEmailReviewCard({
  title,
  toName,
  toEmail,
  subject,
  message,
  attachments = [],
  sendState = "idle",
  onToEmailChange,
  onSubjectChange,
  onMessageChange,
  onCancel,
  onConfirm,
  className,
}: {
  title: string;
  toName: string;
  toEmail: string;
  subject: string;
  message: string;
  attachments?: EmailAttachment[];
  sendState?: EmailSendState;
  onToEmailChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  className?: string;
}) {
  const sending = sendState === "sending";
  const failed = sendState === "failed";
  const sendBlocked =
    !isValidEmailAddress(toEmail) || !subject.trim() || !message.trim();
  const bodyId = React.useId();

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-lg border bg-white px-3 py-2",
        failed ? "border-error-border" : "border-brand",
        className
      )}
    >
      <ActionCardHeader title={title} />

      <div className="flex flex-col gap-2.5 border-t border-line pt-2">
        <EmailRecipientField
          name={toName}
          email={toEmail}
          disabled={sending}
          onEmailChange={onToEmailChange}
        />
        <InputField
          label="Subject"
          value={subject}
          disabled={sending}
          onChange={(event) => onSubjectChange(event.target.value)}
          clearable={false}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-label-md text-foreground" htmlFor={bodyId}>
            Message
          </label>
          <textarea
            id={bodyId}
            rows={7}
            value={message}
            disabled={sending}
            onChange={(event) => onMessageChange(event.target.value)}
            className="w-full resize-y rounded-[4px] border border-line bg-white px-3 py-2.5 text-paragraph-sm text-foreground outline-none hover:border-control-border focus:border-brand focus:ring-2 focus:ring-brand/16 disabled:cursor-not-allowed disabled:border-line disabled:bg-control-disabled-bg disabled:text-disabled-fg disabled:hover:border-line"
          />
        </div>
        <EmailAttachmentList attachments={attachments} labelled />
        {failed ? (
          <div className="flex items-start gap-1.5 text-paragraph-sm text-error">
            <IconAlertTriangleFilled
              size={16}
              className="mt-px size-4 shrink-0"
            />
            <p>Email couldn’t be sent. Try again.</p>
          </div>
        ) : (
          <p className="text-paragraph-sm text-muted-foreground">
            Nothing is sent until you confirm.
          </p>
        )}
        <ActionReviewActions
          confirmLabel={sending ? "Sending…" : failed ? "Retry" : "Send email"}
          confirmIcon={sending ? <SendingSpinner /> : null}
          confirmDisabled={sendBlocked}
          busy={sending}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  );
}

export interface ActionReviewEditableField {
  label: string;
  inputLabel: string;
  value: string;
  placeholder?: string;
  helpText?: string;
  missing?: boolean;
}

/** Expanded review form after the agent clicks Review action. */
export function InCallActionReviewCard({
  writeLabel,
  recordLabel,
  recordValue,
  readonlyFields,
  editableFields,
  integrationName,
  onFieldChange,
  onCancel,
  onConfirm,
  confirmDisabled,
  className,
}: {
  writeLabel: string;
  recordLabel: string;
  recordValue: string;
  readonlyFields: { label: string; value: string }[];
  editableFields: ActionReviewEditableField[];
  integrationName: string;
  onFieldChange: (label: string, value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-lg border border-brand bg-white px-3 py-2",
        className
      )}
    >
      <ActionCardHeader title={writeLabel} />

      <div className="flex flex-col gap-2.5 border-t border-line pt-2">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          <ActionReviewField label={recordLabel} value={recordValue} />
          {readonlyFields.map((field) => (
            <ActionReviewField
              key={field.label}
              label={field.label}
              value={field.value}
            />
          ))}
          <ActionReviewField label="Current value" value="—" />
        </dl>
        {editableFields.map((field) => (
          <InputField
            key={field.label}
            label={field.inputLabel}
            placeholder={field.placeholder}
            value={field.value}
            onChange={(event) => onFieldChange(field.label, event.target.value)}
            helpText={field.helpText}
            helpIcon={field.missing}
            clearable={false}
          />
        ))}
        <p className="text-paragraph-sm text-muted-foreground">
          Nothing is written to {integrationName} until you confirm.
        </p>
        <ActionReviewActions
          confirmLabel={writeLabel}
          confirmDisabled={confirmDisabled}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  );
}

export function InCallActionDoneCard({
  label,
  viewUrl,
  viewName,
  className,
}: {
  label: string;
  viewUrl?: string;
  viewName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-start gap-2 rounded-lg border border-success-border bg-success-secondary px-3 py-2",
        className
      )}
      role="status"
    >
      <IconCircleCheckFilled size={16} className="mt-px size-4 shrink-0 text-success" />
      <div className="min-w-0 flex-1">
        <p className="text-label-md font-medium text-foreground">{label}</p>
        {viewUrl ? (
          <a
            href={viewUrl}
            target="_blank"
            rel="noreferrer"
            className="text-label-sm font-medium text-brand hover:text-brand-hover"
          >
            View in {viewName}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function previewRecordValue(object: string): string {
  const key = object.trim().toLowerCase();
  if (key === "contact" || key === "person") return "Elena Vasquez";
  return "Acme Corp";
}

type PreviewView = "suggested" | "review" | "sending" | "done";

/** Matches the live panel's execute delay so the preview paces the same. */
const PREVIEW_SEND_MS = 750;

/**
 * Admin preview of an in-call Action — suggested card, then the review
 * form the agent gets after clicking Review. Same cards as the live panel.
 */
export function ActionInCallPreview({
  action,
  integrations,
  className,
}: {
  action: AgentAction;
  integrations: Integration[];
  className?: string;
}) {
  const integration = integrationById(integrations, action.integrationId);
  const capability = capabilityById(
    integrations,
    action.integrationId,
    action.capabilityId
  );
  const isEmail = isSendEmailCapability(capability);
  const canReview = !isEmail || action.requiresConfirmation;
  const extracted = previewExtractedValue(action);
  const property = action.property || capability?.label || "Value";
  const recordKind = action.object || "Record";
  const recordValue = previewRecordValue(action.object);
  const integrationName = integration?.name ?? "this app";
  const writeLabel = integrationWriteLabel(action, integrations);
  const email = isEmail ? previewEmail(action) : null;

  const [view, setView] = React.useState<PreviewView>("suggested");
  const [filled, setFilled] = React.useState<Record<string, string>>({});
  const sendTimer = React.useRef<number>();

  const clearSendTimer = () => {
    if (sendTimer.current) window.clearTimeout(sendTimer.current);
    sendTimer.current = undefined;
  };

  React.useEffect(() => {
    clearSendTimer();
    setView("suggested");
    setFilled({});
  }, [action.id, action.capabilityId]);

  React.useEffect(() => clearSendTimer, []);

  React.useEffect(() => {
    if (!canReview && view === "review") setView("suggested");
  }, [canReview, view]);

  const patchFilled = (label: string, value: string) =>
    setFilled((current) => ({ ...current, [label]: value }));

  const openReview = () => {
    if (!canReview) {
      setView("done");
      return;
    }
    setFilled((current) => {
      if (email) {
        return {
          "To email": current["To email"] ?? email.toEmail,
          Subject: current.Subject ?? email.subject,
          Message: current.Message ?? email.body,
        };
      }
      return {
        ...current,
        "New value": current["New value"] ?? (extracted.trim() ? extracted : ""),
      };
    });
    setView("review");
  };

  const sendEmail = () => {
    setView("sending");
    clearSendTimer();
    sendTimer.current = window.setTimeout(
      () => setView("done"),
      PREVIEW_SEND_MS
    );
  };

  const card =
    view === "done" ? (
      <InCallActionDoneCard
        label={integrationDoneLabel(action, integrations)}
        viewUrl={integrationDeepLink(action.integrationId)}
        viewName={integrationName}
      />
    ) : (view === "review" || view === "sending") && email ? (
      <InCallEmailReviewCard
        title={email.title}
        toName={email.to}
        toEmail={filled["To email"] ?? email.toEmail}
        subject={filled.Subject ?? email.subject}
        message={filled.Message ?? email.body}
        attachments={email.attachments}
        sendState={view === "sending" ? "sending" : "idle"}
        onToEmailChange={(value) => patchFilled("To email", value)}
        onSubjectChange={(value) => patchFilled("Subject", value)}
        onMessageChange={(value) => patchFilled("Message", value)}
        onCancel={() => setView("suggested")}
        onConfirm={sendEmail}
      />
    ) : view === "review" ? (
      <InCallActionReviewCard
        writeLabel={writeLabel}
        recordLabel={recordKind}
        recordValue={recordValue}
        readonlyFields={
          property
            ? [{ label: "Property", value: property }]
            : []
        }
        editableFields={[
          {
            label: "New value",
            inputLabel: property,
            value: filled["New value"] ?? (extracted.trim() ? extracted : ""),
            placeholder: `Select ${property.toLowerCase()}`,
            missing: !extracted.trim(),
            helpText: !extracted.trim()
              ? "Not found in the conversation — add it to continue."
              : undefined,
          },
        ]}
        integrationName={integrationName}
        onFieldChange={patchFilled}
        onCancel={() => setView("suggested")}
        onConfirm={() => setView("done")}
        confirmDisabled={!((filled["New value"] ?? extracted).trim())}
      />
    ) : email ? (
      <InCallEmailSuggestionCard
        title={email.title}
        to={email.to}
        toEmail={email.toEmail}
        subject={email.subject}
        body={email.body}
        attachments={email.attachments}
        cta={email.cta}
        onReview={openReview}
      />
    ) : (
      <InCallActionSuggestionCard
        title={action.agentLabel || action.name}
        property={property}
        value={extracted.trim() ? extracted : "Select a value"}
        recordLabel={integration ? `${integration.name} ${recordKind}` : recordKind}
        recordValue={recordValue}
        onReview={openReview}
      />
    );

  return <div className={className}>{card}</div>;
}
