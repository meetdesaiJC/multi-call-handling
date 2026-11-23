import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Accordion, AccordionItem } from "@/components/Accordion";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { Slider } from "@/components/Slider";
import { Toggle } from "@/components/Toggle";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import {
  IconAccountDetails,
  IconArrowRight,
  IconClose,
  IconPhone,
  IconVoicemailDrop,
  IconVoicemailMessage,
} from "@/components/Icon";
import {
  IconCallSpeaker,
  IconCallSpeakerLow,
} from "./icons/CallControlIcons";
import {
  AUDIO_INPUTS,
  AUDIO_OUTPUTS,
  RINGER_OUTPUTS,
  type VoicemailGreeting,
} from "./callDeviceData";
import {
  MicLevelMeter,
  deviceOptions,
  useMicTest,
  type AudioDeviceSelection,
} from "./audioSettings";

/**
 * The webphone's Settings tab. Its nav has always had the entry; this is the
 * page behind it.
 *
 * Four rows, in JustCall's own order and under JustCall's own names — Audio,
 * Dialer, Voicemail, Account. An accordion rather than four stacked sections
 * because the card is 360×490: four groups open at once puts the last one two
 * screens down, and an agent between calls wants exactly one of them.
 *
 * JustCall's own list carries a fifth row, Refer & Earn. It is deliberately
 * not here: this prototype is about how an agent runs a call, and a referral
 * offer in the middle of that is the one thing on the page nobody opens
 * Settings to do.
 *
 * Everything here is about the *phone*, not the account's product settings.
 * Anything an admin sets for a whole team belongs in JustCall AI's own
 * Settings, not in a panel an agent opens between calls.
 *
 * The connection read-out and its troubleshooter are not here either, for the
 * same reason: JustCall's own list has no row for them, and the reading an
 * agent acts on is the live one on the call bar. Worth revisiting — the case
 * for a troubleshooter in Settings is that you reach for it *between* calls,
 * which is exactly when the call bar isn't on screen.
 */

const WRAP_UP_OPTIONS = [
  { value: "off", label: "Disabled" },
  { value: "15", label: "15 seconds" },
  { value: "30", label: "30 seconds" },
  { value: "60", label: "1 minute" },
];

/**
 * Numbers the account owns, by the name they were given rather than by their
 * digits — that is how an agent picks one, and the digits are there for the
 * one case where two lines share a name.
 */
const OUTBOUND_NUMBERS = [
  { value: "support", label: "Support outbound · +1 (415) 555-0100" },
  { value: "sales", label: "Sales outbound · +1 (415) 555-0120" },
  { value: "personal", label: "My number · +1 (415) 555-0166" },
];

/**
 * Dial code alongside the name, because the dial code is the thing this
 * setting actually changes — it is what stops being typed once a default is
 * set. Searchable, since a country list is the one field here long enough to
 * need it.
 */
const OUTBOUND_COUNTRIES = [
  { value: "us", label: "United States (+1)" },
  { value: "ca", label: "Canada (+1)" },
  { value: "gb", label: "United Kingdom (+44)" },
  { value: "au", label: "Australia (+61)" },
  { value: "in", label: "India (+91)" },
  { value: "de", label: "Germany (+49)" },
  { value: "sg", label: "Singapore (+65)" },
];

/**
 * Offsets first, because that is what a timezone list is sorted by everywhere
 * and what tells the agent whether they picked the right one. Searchable —
 * with the country list, the only field on this page long enough to need it.
 */
const TIMEZONES = [
  { value: "us-pacific", label: "(GMT-08:00) Pacific Time · Los Angeles" },
  { value: "us-mountain", label: "(GMT-07:00) Mountain Time · Denver" },
  { value: "us-central", label: "(GMT-06:00) Central Time · Chicago" },
  { value: "us-eastern", label: "(GMT-05:00) Eastern Time · New York" },
  { value: "uk", label: "(GMT+00:00) London · Dublin" },
  { value: "eu-central", label: "(GMT+01:00) Berlin · Paris · Madrid" },
  { value: "india", label: "(GMT+05:30) Chennai · Kolkata · Mumbai · New Delhi" },
  { value: "singapore", label: "(GMT+08:00) Singapore · Hong Kong" },
  { value: "sydney", label: "(GMT+11:00) Sydney · Melbourne" },
];

const DATA_CENTRES = [
  { value: "auto", label: "Auto (Recommended)" },
  { value: "us-east", label: "US East (Virginia)" },
  { value: "us-west", label: "US West (Oregon)" },
  { value: "eu-west", label: "EU West (Ireland)" },
  { value: "ap-south", label: "Asia Pacific (Mumbai)" },
  { value: "ap-southeast", label: "Asia Pacific (Sydney)" },
];

/**
 * A control with its own name above it — the only shape that fits 328px — and
 * an optional action under it.
 *
 * `action` goes below rather than beside the label because that is where Test
 * sits in JustCall, and it is the right place: Test acts on the device the
 * agent just chose, so it reads after the choice, not before it.
 */
function Field({
  label,
  description,
  action,
  hint,
  children,
}: {
  label: string;
  /** Sits between the label and the control, like JustCall's ringtone note. */
  description?: string;
  action?: ReactNode;
  /** Trailing note on the label row — a "locked" explanation, not a control. */
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <SettingLabel>{label}</SettingLabel>
        {hint ? <span className="shrink-0">{hint}</span> : null}
      </div>
      {description ? <SettingDescription>{description}</SettingDescription> : null}
      {children}
      {action ? <div className="flex pt-0.5">{action}</div> : null}
    </div>
  );
}

/**
 * A row's name, and the sentence under it. Defined once because four different
 * row shapes use them and `Toggle` brings its own pair — `text-paragraph-md` /
 * `text-paragraph-sm` — which is the one this file has to agree with rather
 * than the other way round. So the label is passed *into* `Toggle`'s `label`
 * slot, and every description in the panel takes `paragraph-sm` to match the
 * one `Toggle` renders for itself.
 *
 * `label-md-semi` rather than `-bold`: at 14px a row's name only has to beat
 * its own description, and `bold` was loud enough to compete with the group
 * heading above it. Same size and line-height, so nothing reflows.
 */
function SettingLabel({
  children,
  required,
}: {
  children: ReactNode;
  /** The red mark tying this row to a footnote. */
  required?: boolean;
}) {
  return (
    <span className="text-label-md-semi text-gray-700">
      {children}
      {required ? (
        <span aria-hidden="true" className="text-error">
          *
        </span>
      ) : null}
    </span>
  );
}

function SettingDescription({ children }: { children: ReactNode }) {
  return (
    <p className="text-paragraph-sm text-muted-foreground">{children}</p>
  );
}

/** The panel body's own padding, shared so every row indents alike. */
function Panel({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 px-4 pt-1 pb-4">{children}</div>;
}

/** A rule between groups inside one panel. */
function PanelRule() {
  return <span aria-hidden="true" className="h-px w-full bg-line" />;
}

/**
 * A toggle whose label reads as a sentence and whose switch sits on the far
 * right — the row shape JustCall's settings use, and the reason
 * `controlPosition="end"` exists.
 *
 * `required` adds the red asterisk that marks a setting you cannot have both
 * of turned off. The mark is decorative; the footnote it points at is what
 * carries the meaning, so it is `aria-hidden` and the label stays clean.
 */
function SettingToggle({
  label,
  description,
  required,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  required?: boolean;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <Toggle
      size="sm"
      controlPosition="end"
      checked={checked}
      onCheckedChange={onCheckedChange}
      label={<SettingLabel required={required}>{label}</SettingLabel>}
      description={description}
      wrapperClassName="w-full"
    />
  );
}

/**
 * The same row as `SettingToggle`, with a button where the switch would be.
 * Clear Cache is the shape's only user so far: something you *do* once, not a
 * state you leave set.
 */
function SettingAction({
  label,
  description,
  action,
}: {
  label: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <SettingLabel>{label}</SettingLabel>
        </span>
        <span className="shrink-0">{action}</span>
      </div>
      <SettingDescription>{description}</SettingDescription>
    </div>
  );
}

/**
 * Label, control, then the sentence explaining it.
 *
 * The description sits *below* the control here, unlike `Field` in Audio, and
 * the difference is what each one is for. Audio's notes qualify the choice you
 * are about to make ("this is where the ring plays"), so they have to arrive
 * first. These explain what a setting does to the product, which is only worth
 * reading once — below the control, out of the way of the agent who already
 * knows what they came to change.
 */
function SettingControl({
  label,
  description,
  saves = true,
  children,
}: {
  label: string;
  description: string;
  /**
   * Whether the value is committed by a button rather than by changing it.
   *
   * JustCall puts a Save beside every one of these because each field is its
   * own request. Kept, because it is load-bearing for the agent too: these are
   * the settings that change how the *next* call is placed, and a dropdown
   * that takes effect the instant it is brushed is the wrong contract for
   * "which number do I call from". Audio has no Save for the opposite reason —
   * you switch a mic to hear whether it worked.
   */
  saves?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <SettingLabel>{label}</SettingLabel>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1">{children}</span>
        {saves ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="shrink-0"
          >
            Save
          </Button>
        ) : null}
      </div>
      <SettingDescription>{description}</SettingDescription>
    </div>
  );
}

/**
 * A named cluster of rows inside a panel — JustCall's "Web-to-Device Settings"
 * and "Receive Incoming Calls". A heading rather than another accordion level:
 * two of them hold two toggles each, and folding four toggles behind two more
 * disclosures would cost more taps than the whole panel is worth.
 */
function SettingGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h4 className="text-label-md-bold text-foreground">{label}</h4>
      {children}
    </section>
  );
}

/**
 * Longest recording the product accepts. Past three minutes it stops being a
 * message and starts being a monologue the agent holds a call open for.
 */
const MAX_DROP_SECONDS = 180;

/**
 * `renewal-reminder-v2.mp3` → `Renewal reminder v2` — the name the agent would
 * have typed anyway, offered when they upload before they name. It stays
 * editable, because the file name is not always the name.
 */
function nameFromFile(fileName: string) {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
}

function formatSeconds(total: number) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The recording's real length, read out of the file before it is accepted.
 *
 * Length is the one thing about a drop the agent has to know: the popover
 * counts it down and the line stays open for it, so a library that guessed
 * would be lying about how long the call is held. Resolves 0 when the browser
 * cannot decode the file — the honest test of "is this playable audio",
 * better than trusting an extension.
 */
function readDuration(file: File) {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const settle = (seconds: number) => {
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    audio.onloadedmetadata = () =>
      settle(
        Number.isFinite(audio.duration) && audio.duration > 0
          ? Math.max(1, Math.round(audio.duration))
          : 0
      );
    audio.onerror = () => settle(0);
    audio.src = url;
  });
}

/** A file that has been read and measured, but not yet confirmed. */
interface StagedDrop {
  fileName: string;
  seconds: number;
}

/**
 * Voicemail Settings, and the whole of it.
 *
 * JustCall's own panel here is a list and an upload, and that is right: a
 * *drop* is the only part of voicemail the phone owns. What happens to
 * voicemails the account receives — emailing them on, transcribing them — is
 * set once for a whole team and never touched again, which puts it in
 * JustCall AI's Settings and not in a panel an agent opens between calls.
 */
function VoicemailDrops({
  drops,
  onAdd,
  onRemove,
}: {
  drops: VoicemailGreeting[];
  onAdd: (drop: VoicemailGreeting) => void;
  onRemove: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <SettingLabel>Voicemail drops</SettingLabel>
        <SettingDescription>
          The recordings the in-call Voicemail drop offers. The message keeps
          playing after you hang up.
        </SettingDescription>
      </div>

      {drops.length ? (
        <ul className="flex flex-col gap-1">
          {drops.map((drop) => (
            <li key={drop.id} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-brand"
              >
                <IconVoicemailDrop size={16} />
              </span>
              <span className="min-w-0 flex-1 truncate text-label-md text-foreground">
                {drop.label}
              </span>
              <span className="shrink-0 text-label-sm text-muted-foreground tabular-nums">
                {formatSeconds(drop.seconds)}
              </span>
              <Button
                type="button"
                variant="error-grey-outline"
                size="xs"
                iconOnly
                aria-label={`Delete ${drop.label}`}
                onClick={() => onRemove(drop.id)}
              >
                <IconClose size={16} />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-line px-3 py-4 text-center text-paragraph-sm text-muted-foreground">
          No drops yet. The one you upload is the one the call bar offers.
        </p>
      )}

      <PanelRule />

      <Button
        type="button"
        variant="primary-outline"
        size="sm"
        className="w-full"
        onClick={() => setCreating(true)}
      >
        Upload audio
      </Button>

      {/* Keyed on each opening so a cancelled attempt leaves nothing behind —
          the name typed and the file picked belong to that attempt, not to the
          next one. */}
      {creating ? (
        <CreateVoicemailDropModal
          onCancel={() => setCreating(false)}
          onConfirm={(drop) => {
            onAdd(drop);
            setCreating(false);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * The product's own Create Voicemail Drop dialog, in the phone's Settings.
 *
 * A dialog rather than a form inline in the panel, because it is the same
 * thing the agent does in global Settings and the same object it produces —
 * and because naming a recording is a small piece of work with a beginning and
 * an end, which is exactly what Cancel and Confirm are for. Nothing reaches
 * the library until Confirm: the next thing that happens to a drop is that it
 * plays down a live line at a customer, and there is no editing it then.
 */
function CreateVoicemailDropModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (drop: VoicemailGreeting) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [staged, setStaged] = useState<StagedDrop | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const take = async (file: File) => {
    setError(null);
    const seconds = await readDuration(file);
    if (!seconds) {
      setStaged(null);
      setError("That file wouldn't play. Upload an MP3 recording.");
      return;
    }
    if (seconds > MAX_DROP_SECONDS) {
      setStaged(null);
      setError(
        `That's ${formatSeconds(seconds)} long — a drop can run up to ${formatSeconds(MAX_DROP_SECONDS)}.`
      );
      return;
    }
    setStaged({ fileName: file.name, seconds });
    // Only ever a suggestion: an agent who named it first keeps their name.
    setName((current) => current.trim() || nameFromFile(file.name));
  };

  const ready = Boolean(staged) && name.trim().length > 0;

  return (
    <Modal
      open
      onClose={onCancel}
      size="md"
      title="Create Voicemail Drop"
      footer={
        <>
          <Button type="button" variant="grey-outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!ready}
            onClick={() => {
              if (!staged || !ready) return;
              onConfirm({
                id: `vm-${Date.now()}`,
                label: name.trim(),
                seconds: staged.seconds,
                // The file is what the agent recognises the recording by, so
                // it is what the popover shows under the name they gave it.
                description: staged.fileName,
              });
            }}
          >
            Confirm
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <InputField
          label="Voicemail name"
          placeholder="Enter voicemail name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onClear={() => setName("")}
        />

        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void take(file);
            // Cleared so picking the same file twice still fires a change.
            event.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files[0];
            if (file) void take(file);
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition-colors duration-base",
            dragging
              ? "border-brand bg-brand-subtle/60"
              : "border-line hover:border-brand hover:bg-brand-subtle/30"
          )}
        >
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-muted"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-brand text-white">
              <IconArrowRight size={16} className="-rotate-90" />
            </span>
          </span>

          {staged ? (
            <span className="flex flex-col items-center gap-1">
              <span className="text-label-md text-foreground">
                {staged.fileName}
              </span>
              <span className="text-paragraph-sm text-muted-foreground">
                {formatSeconds(staged.seconds)} · click to replace
              </span>
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1">
              <span className="text-label-md text-foreground">
                <span className="text-brand">Click to upload</span> or drag
                &amp; drop
              </span>
              <span className="text-paragraph-sm text-muted-foreground">
                Upload your MP3 file
                <br />
                (Maximum duration: {MAX_DROP_SECONDS / 60} minutes)
              </span>
            </span>
          )}
        </button>

        {error ? (
          <p className="text-paragraph-sm text-error">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
}

export interface DialerSettingsPageProps {
  devices: AudioDeviceSelection;
  /** The drops this account has — the same list the in-call popover offers. */
  drops: VoicemailGreeting[];
  onAddDrop: (drop: VoicemailGreeting) => void;
  onRemoveDrop: (id: string) => void;
}

export function DialerSettingsPage({
  devices,
  drops,
  onAddDrop,
  onRemoveDrop,
}: DialerSettingsPageProps) {
  const micTest = useMicTest();
  const [enhanceMic, setEnhanceMic] = useState(false);
  const [noiseCancellation, setNoiseCancellation] = useState(false);
  const [recordingControl, setRecordingControl] = useState(true);
  const [notesScreen, setNotesScreen] = useState(true);
  const [connectingSounds, setConnectingSounds] = useState(true);
  const [queueVolume, setQueueVolume] = useState(100);
  const [wrapUp, setWrapUp] = useState("off");
  const [country, setCountry] = useState("us");
  const [outboundCall, setOutboundCall] = useState("support");
  const [outboundSms, setOutboundSms] = useState("sales");
  const [dataCentre, setDataCentre] = useState("auto");
  const [clickToDialSip, setClickToDialSip] = useState(false);
  const [clickToDialMobile, setClickToDialMobile] = useState(false);
  const [receiveDesktop, setReceiveDesktop] = useState(true);
  const [receiveWeb, setReceiveWeb] = useState(true);

  const pick = (value: string | string[]) =>
    Array.isArray(value) ? (value[0] ?? "") : value;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
      <Accordion type="single" className="border-b border-line">
        {/* ── Audio ──────────────────────────────────────────────────────── */}
        <AccordionItem
          value="audio"
          icon={<IconCallSpeaker size={20} />}
          label="Audio Settings"
        >
          <Panel>
            <Field
              label="Select Output Devices"
              action={
                <Button type="button" variant="grey-outline" size="sm">
                  Test
                </Button>
              }
            >
              <Dropdown
                searchable={false}
                options={deviceOptions(AUDIO_OUTPUTS)}
                value={devices.output}
                onValueChange={(value) => devices.setOutput(pick(value))}
                aria-label="Select output devices"
              />
            </Field>

            <PanelRule />

            <Field
              label="Select Input Devices"
              action={
                <Button
                  type="button"
                  variant="grey-outline"
                  size="sm"
                  onClick={micTest.start}
                >
                  {micTest.testing ? "Listening…" : "Test"}
                </Button>
              }
            >
              <Dropdown
                searchable={false}
                options={deviceOptions(AUDIO_INPUTS)}
                value={devices.input}
                onValueChange={(value) => devices.setInput(pick(value))}
                aria-label="Select input devices"
              />
              {/* JustCall's Test is a button with no visible result. In a
                  prototype with no audio at all, a level is the only thing
                  that can stand in for hearing yourself back. */}
              <div className="flex items-center gap-2 pt-0.5">
                <MicLevelMeter active={micTest.testing} className="flex-1" />
                <span className="shrink-0 text-label-sm text-muted-foreground">
                  {micTest.testing ? "Say something" : "Input level"}
                </span>
              </div>
            </Field>

            <Field
              label="Select Ringtone Devices"
              description="Output device that is used to play the ringing sound when receiving an incoming call."
              action={
                <Button type="button" variant="grey-outline" size="sm">
                  Test
                </Button>
              }
            >
              <Dropdown
                searchable={false}
                options={deviceOptions(RINGER_OUTPUTS)}
                value={devices.ringer}
                onValueChange={(value) => devices.setRinger(pick(value))}
                aria-label="Select ringtone devices"
              />
            </Field>

            <PanelRule />

            <SettingToggle
              label="Automatically enhance microphone volume"
              description="Allow JustCall to adjust input volume automatically"
              checked={enhanceMic}
              onCheckedChange={setEnhanceMic}
            />

            <PanelRule />

            <SettingToggle
              label="Active Noise Cancellation"
              description="Filters out sound from your mic that isn't speech"
              checked={noiseCancellation}
              onCheckedChange={setNoiseCancellation}
            />

            <PanelRule />

            <Button
              type="button"
              variant="link"
              size="sm"
              className="self-center underline underline-offset-2"
            >
              Step by step guide for audio settings
            </Button>
          </Panel>
        </AccordionItem>

        {/* ── Dialer ─────────────────────────────────────────────────────── */}
        <AccordionItem
          value="dialer"
          icon={<IconPhone size={20} />}
          label="Dialer Settings"
        >
          <Panel>
            <SettingAction
              label="Clear Cache"
              description="Clears cached dialer data stored in your browser."
              action={
                <Button type="button" variant="primary" size="sm">
                  Clear
                </Button>
              }
            />

            <PanelRule />

            <SettingToggle
              label="Call Recording Control"
              description="Disabling this, will remove the Record button from your dialer."
              checked={recordingControl}
              onCheckedChange={setRecordingControl}
            />

            <PanelRule />

            <SettingToggle
              label="Notes and Rating Screen"
              description="Disabling this, will remove the Notes and Rating screen from your dialer when the call ends."
              checked={notesScreen}
              onCheckedChange={setNotesScreen}
            />

            <PanelRule />

            <SettingToggle
              label="Play connecting sounds"
              description="Disabling this, will disable the sounds that are played when call is connected / disconnected."
              checked={connectingSounds}
              onCheckedChange={setConnectingSounds}
            />

            <PanelRule />

            <SettingControl
              label="Queue Notification Sound"
              description="Set the volume for the notification sound played when you get a caller in queue."
            >
              <Slider
                min={0}
                max={100}
                value={queueVolume}
                onValueChange={setQueueVolume}
                aria-label="Queue notification sound volume"
                startAdornment={
                  <IconCallSpeakerLow size={16} className="size-4" />
                }
                endAdornment={<IconCallSpeaker size={16} className="size-4" />}
              />
            </SettingControl>

            <PanelRule />

            <SettingControl
              label="Wrap-Up Time"
              description="Define time after every call to complete post-call work. You won't receive calls during wrap-up time."
            >
              <Dropdown
                searchable={false}
                options={WRAP_UP_OPTIONS}
                value={wrapUp}
                onValueChange={(value) => setWrapUp(pick(value))}
                aria-label="Wrap-up time"
              />
            </SettingControl>

            <PanelRule />

            <SettingControl
              label="Default country for outbound calls and texts"
              description="This allows you to dial numbers without typing in the area code."
            >
              <Dropdown
                options={OUTBOUND_COUNTRIES}
                value={country}
                onValueChange={(value) => setCountry(pick(value))}
                aria-label="Default country for outbound calls and texts"
              />
            </SettingControl>

            <PanelRule />

            <SettingControl
              label="Default number for outbound calls"
              description="This will be the default number for making outbound calls."
            >
              <Dropdown
                searchable={false}
                options={OUTBOUND_NUMBERS}
                value={outboundCall}
                onValueChange={(value) => setOutboundCall(pick(value))}
                aria-label="Default number for outbound calls"
              />
            </SettingControl>

            <PanelRule />

            <SettingControl
              label="Default number for outbound SMS/MMS"
              description="This will be the default number for sending SMS/MMS."
            >
              <Dropdown
                searchable={false}
                options={OUTBOUND_NUMBERS}
                value={outboundSms}
                onValueChange={(value) => setOutboundSms(pick(value))}
                aria-label="Default number for outbound SMS/MMS"
              />
            </SettingControl>

            <PanelRule />

            <SettingControl
              label="Data center for outbound call routing"
              description="By default, JustCall will use Global Low Latency routing capability to determine which data center is closest to you, establishing a connection through JustCall's nearest point of presence."
            >
              <Dropdown
                searchable={false}
                options={DATA_CENTRES}
                value={dataCentre}
                onValueChange={(value) => setDataCentre(pick(value))}
                aria-label="Data center for outbound call routing"
              />
            </SettingControl>

            <PanelRule />

            <SettingGroup label="Web-to-Device Settings">
              <SettingToggle
                label="Click to dial SIP"
                description="Click a number on web to dial it from your SIP device"
                checked={clickToDialSip}
                onCheckedChange={setClickToDialSip}
              />
              <PanelRule />
              <SettingToggle
                label="Click to dial Mobile"
                description="Click a number on web to dial it from your Mobile device"
                checked={clickToDialMobile}
                onCheckedChange={setClickToDialMobile}
              />
            </SettingGroup>

            <PanelRule />

            <SettingGroup label="Receive Incoming Calls">
              <SettingToggle
                label="Desktop App"
                required
                description="Enable this option to receive incoming calls on your Desktop App."
                checked={receiveDesktop}
                onCheckedChange={setReceiveDesktop}
              />
              <PanelRule />
              <SettingToggle
                label="Web Dialer"
                required
                description="Enable this option to receive incoming calls on your Web Dialer."
                checked={receiveWeb}
                onCheckedChange={setReceiveWeb}
              />
              {/* Ties the two asterisks above to the one thing they share. Kept
                  inside the group rather than at the foot of the panel, so it
                  sits next to what it is annotating. */}
              <p className="text-paragraph-sm text-error">
                <span aria-hidden="true">*</span> Reload Desktop App to reflect
                changes.
              </p>
            </SettingGroup>
          </Panel>
        </AccordionItem>

        {/* ── Voicemail ──────────────────────────────────────────────────── */}
        <AccordionItem
          value="voicemail"
          icon={<IconVoicemailMessage size={20} />}
          label="Voicemail Settings"
        >
          <Panel>
            <VoicemailDrops
              drops={drops}
              onAdd={onAddDrop}
              onRemove={onRemoveDrop}
            />
          </Panel>
        </AccordionItem>

        {/* ── Account ────────────────────────────────────────────────────── */}
        <AccordionItem
          value="account"
          icon={<IconAccountDetails size={20} />}
          label="Account Settings"
        >
          <Panel>
            <AccountDetails />
          </Panel>
        </AccordionItem>
      </Accordion>

    </div>
  );
}

/**
 * The account's own details, in JustCall's order and under JustCall's locks.
 *
 * Email and company are the workspace's, not the agent's, so they are shown
 * disabled rather than hidden — "which account am I signed into" is the
 * question that sends an agent to this panel in the first place, and an
 * answer they cannot edit is still an answer.
 *
 * One Update Details for the group rather than a Save per field, unlike the
 * dialer's settings above: those are independent switches, this is one record.
 */
function AccountDetails() {
  const [firstName, setFirstName] = useState("Sarah");
  const [lastName, setLastName] = useState("Johnson");
  const [phone, setPhone] = useState("+1 (415) 555-0166");
  const [timezone, setTimezone] = useState("us-pacific");

  return (
    <div className="flex flex-col gap-3">
      <InputField
        label="First Name"
        value={firstName}
        onChange={(event) => setFirstName(event.target.value)}
        onClear={() => setFirstName("")}
      />
      <InputField
        label="Last Name"
        value={lastName}
        onChange={(event) => setLastName(event.target.value)}
        onClear={() => setLastName("")}
      />
      <InputField
        label="Email Address"
        value="sarah.johnson@justcall.io"
        disabled
        readOnly
      />
      <InputField label="Company" value="SaaS Labs" disabled readOnly />
      <InputField
        label="Phone no."
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        onClear={() => setPhone("")}
      />

      <div className="flex flex-col gap-1.5">
        <SettingLabel>Your timezone</SettingLabel>
        <Dropdown
          options={TIMEZONES}
          value={timezone}
          onValueChange={(value) =>
            setTimezone(Array.isArray(value) ? (value[0] ?? "") : value)
          }
          searchPlaceholder="Search timezones"
          // Opens upward: this is the last field of the last panel, so a menu
          // hung below it lands under the tab bar and has to be scrolled to.
          menuClassName="top-auto bottom-[calc(100%+8px)]"
          aria-label="Your timezone"
        />
      </div>

      <Button type="button" size="sm" className="self-start">
        Update Details
      </Button>
    </div>
  );
}
