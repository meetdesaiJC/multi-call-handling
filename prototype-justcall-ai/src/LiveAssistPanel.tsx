import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/Alert";
import { Avatar, type AvatarColor } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import { IconChevronDown, IconClose } from "@/components/Icon";
import { useDropdownPresence } from "@/components/Dropdown/useDropdownPresence";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import { IconCallHelp } from "./icons/CallControlIcons";
import type { CallScenario } from "./callSimulation";

/**
 * Live Assist — a private supervisor chat in the right-side utility panel.
 *
 * Script and Conversation Guidance stay up. The agent types a question; call
 * context and the live transcript go with the first message. Nothing here
 * holds, mutes, or transfers the customer.
 */

export interface Supervisor {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  color: AvatarColor;
  status: "available" | "busy";
}

export const SUPERVISORS: Supervisor[] = [
  {
    id: "maya",
    name: "Maya Sharma",
    firstName: "Maya",
    initials: "MS",
    color: "orange",
    status: "available",
  },
  {
    id: "rohan",
    name: "Rohan Mehta",
    firstName: "Rohan",
    initials: "RM",
    color: "indigo",
    status: "available",
  },
  {
    id: "ankit",
    name: "Ankit Patel",
    firstName: "Ankit",
    initials: "AP",
    color: "bluegrey",
    status: "busy",
  },
];

export const SUPERVISOR = SUPERVISORS[0];

const AGENT = {
  name: "You",
  initials: "SJ",
};

export type HelpPhase = "idle" | "waiting" | "active" | "unavailable";

export type HelpToast = { kind: "reply"; name: string } | null;

const ACCEPT_MS = 2200;
const FIRST_REPLY_MS = 1400;
const TYPING_DELAY_MS = 700;
const FOLLOWUP_REPLY_MS = 2200;
const TOAST_MS = 5200;

function supervisorById(id: string): Supervisor {
  return SUPERVISORS.find((item) => item.id === id) ?? SUPERVISORS[0];
}

function statusLabel(status: Supervisor["status"]): string {
  return status === "available" ? "Available" : "Busy";
}

function replyFor(text: string): string {
  const hay = text.toLowerCase();
  if (/\d+\s*%/.test(hay) || /\bdiscount\b/.test(hay)) {
    return "Yes. You can offer up to 20%.";
  }
  if (/\b(price|pricing|cheaper|expensive|aircall)\b/.test(hay)) {
    return "Stay on value, not the seat price. Don't go past 15% on annual without me — I'll stay on.";
  }
  if (/\b(salesforce|crm)\b/.test(hay)) {
    return "Yes — calls log to the contact and company in Salesforce automatically. You can say that with confidence.";
  }
  return "Got it. I'll stay on until you wrap. The customer can't hear this.";
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface LiveAssistMessage {
  id: string;
  from: "agent" | "supervisor" | "system";
  text: string;
  atMs: number;
}

export interface LiveAssistThread {
  phase: HelpPhase;
  supervisor: Supervisor;
  supervisors: Supervisor[];
  pendingSupervisorId: string | null;
  typing: boolean;
  unread: number;
  messages: LiveAssistMessage[];
  toast: HelpToast;
  sendMessage: (text: string) => void;
  selectSupervisor: (id: string) => void;
  confirmSupervisorChange: () => void;
  cancelSupervisorChange: () => void;
  dismissToast: () => void;
  markRead: () => void;
}

/**
 * Thread state lives above the utility panel so closing it, or switching to
 * Notes / Transcript, never drops the conversation — and so the call bar can
 * keep a badge while the agent is in another pane.
 */
export function useLiveAssist({
  scenarioId,
  elapsedMs,
  panelOpen,
}: {
  scenarioId: string;
  elapsedMs: number;
  panelOpen: boolean;
}): LiveAssistThread {
  const [phase, setPhase] = useState<HelpPhase>("idle");
  const [supervisorId, setSupervisorId] = useState(SUPERVISORS[0].id);
  const [pendingSupervisorId, setPendingSupervisorId] = useState<string | null>(
    null
  );
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [messages, setMessages] = useState<LiveAssistMessage[]>([]);
  const [toast, setToast] = useState<HelpToast>(null);

  const elapsedRef = useRef(elapsedMs);
  elapsedRef.current = elapsedMs;
  const panelRef = useRef(panelOpen);
  panelRef.current = panelOpen;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const supervisorRef = useRef(supervisorId);
  supervisorRef.current = supervisorId;

  const timers = useRef<number[]>([]);
  const seq = useRef(0);

  const supervisor = supervisorById(supervisorId);

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const conversationStarted =
    messages.length > 0 || phase === "waiting" || phase === "active";

  const resetSession = (nextSupervisorId = supervisorRef.current) => {
    clearTimers();
    setPhase("idle");
    setTyping(false);
    setUnread(0);
    setMessages([]);
    setPendingSupervisorId(null);
    setSupervisorId(nextSupervisorId);
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    resetSession(SUPERVISORS[0].id);
    setToast(null);
    // Fresh call — drop the previous private thread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  useEffect(() => {
    if (panelOpen) {
      setUnread(0);
      setToast(null);
    }
  }, [panelOpen, messages.length]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const push = (message: Omit<LiveAssistMessage, "id">) => {
    seq.current += 1;
    const id = `live-assist-${seq.current}`;
    setMessages((current) => [...current, { ...message, id }]);
    if (message.from === "supervisor" && !panelRef.current) {
      setUnread((count) => count + 1);
      setToast({
        kind: "reply",
        name: supervisorById(supervisorRef.current).firstName,
      });
    }
  };

  const beginJoin = () => {
    const current = supervisorById(supervisorRef.current);
    if (current.status !== "available") {
      setPhase("unavailable");
      return;
    }
    setPhase("active");
    push({
      from: "system",
      text: `${current.firstName} joined Live Assist`,
      atMs: elapsedRef.current,
    });
    later(() => {
      if (phaseRef.current !== "active") return;
      setTyping(true);
    }, FIRST_REPLY_MS - TYPING_DELAY_MS);
    later(() => {
      if (phaseRef.current !== "active") return;
      setTyping(false);
      const lastAgent = [...messagesRef.current]
        .reverse()
        .find((item) => item.from === "agent");
      push({
        from: "supervisor",
        text: lastAgent ? replyFor(lastAgent.text) : replyFor(""),
        atMs: elapsedRef.current,
      });
    }, FIRST_REPLY_MS);
  };

  const sendMessage: LiveAssistThread["sendMessage"] = (text) => {
    const body = text.trim();
    if (!body) return;

    const current = supervisorById(supervisorRef.current);
    if (current.status !== "available") {
      setPhase("unavailable");
      return;
    }
    if (phase === "unavailable") return;
    if (phase === "active" && typing) return;

    push({ from: "agent", text: body, atMs: elapsedRef.current });

    if (phaseRef.current === "idle" || phaseRef.current === "waiting") {
      if (phaseRef.current === "idle") {
        setPhase("waiting");
        phaseRef.current = "waiting";
        later(() => {
          if (phaseRef.current !== "waiting") return;
          beginJoin();
        }, ACCEPT_MS);
      }
      return;
    }

    later(() => {
      if (phaseRef.current !== "active") return;
      setTyping(true);
    }, TYPING_DELAY_MS);
    later(() => {
      if (phaseRef.current !== "active") return;
      setTyping(false);
      push({
        from: "supervisor",
        text: replyFor(body),
        atMs: elapsedRef.current,
      });
    }, FOLLOWUP_REPLY_MS);
  };

  const selectSupervisor: LiveAssistThread["selectSupervisor"] = (id) => {
    if (id === supervisorRef.current) {
      setPendingSupervisorId(null);
      return;
    }
    const next = supervisorById(id);
    if (next.status !== "available") return;

    if (conversationStarted) {
      setPendingSupervisorId(id);
      return;
    }

    setSupervisorId(id);
    if (phase === "unavailable") setPhase("idle");
  };

  const confirmSupervisorChange = () => {
    if (!pendingSupervisorId) return;
    resetSession(pendingSupervisorId);
  };

  return {
    phase,
    supervisor,
    supervisors: SUPERVISORS,
    pendingSupervisorId,
    typing,
    unread,
    messages,
    toast,
    sendMessage,
    selectSupervisor,
    confirmSupervisorChange,
    cancelSupervisorChange: () => setPendingSupervisorId(null),
    dismissToast: () => setToast(null),
    markRead: () => setUnread(0),
  };
}

export function LiveAssistToast({
  toast,
  onDismiss,
  onView,
}: {
  toast: HelpToast;
  onDismiss: () => void;
  onView: () => void;
}) {
  if (!toast) return null;

  return (
    <div
      data-state="open"
      className="toast-panel pointer-events-auto absolute top-[84px] left-1/2 z-30 w-[min(100%-48px,360px)] -translate-x-1/2"
    >
      <Alert
        variant="info"
        title={`${toast.name} replied in Live Assist`}
        action={
          <button
            type="button"
            onClick={onView}
            className="text-label-md text-brand outline-none hover:text-brand-hover focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            View
          </button>
        }
        onClose={onDismiss}
      />
    </div>
  );
}

/**
 * Live Assist on the call bar — same circle as Notes and Transcript, with a
 * count when a supervisor replied while the panel was on something else.
 */
export function LiveAssistControl({
  help,
  panelOpen,
  revealing,
  onToggle,
}: {
  help: LiveAssistThread;
  panelOpen: boolean;
  revealing?: boolean;
  onToggle: () => void;
}) {
  const waiting = help.phase === "waiting";
  const active = help.phase === "active";
  const pressed = panelOpen;

  const label = waiting
    ? `Waiting for ${help.supervisor.firstName}`
    : help.unread > 0
      ? `${help.supervisor.firstName} replied in Live Assist`
      : active
        ? `${help.supervisor.firstName} is helping`
        : "Live Assist";

  const detail = revealing
    ? {
        className: "call-bar-detail-in",
        style: { "--detail-delay": "340ms" } as CSSProperties,
      }
    : {};

  return (
    <TooltipTrigger
      placement="bottom"
      content={<Tooltip theme="dark" arrow="top-center" title={label} />}
      className="shrink-0"
    >
      <button
        type="button"
        aria-label={
          help.unread > 0 ? `${label}, ${help.unread} unread` : label
        }
        aria-pressed={pressed}
        data-help={waiting ? "waiting" : active ? "active" : undefined}
        style={detail.style}
        onClick={onToggle}
        className={cn(
          "call-bar-control relative flex size-9 shrink-0 items-center justify-center rounded-full text-white outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.97]",
          detail.className
        )}
      >
        <span className="relative flex size-5 items-center justify-center overflow-clip">
          <IconCallHelp size={20} />
        </span>
        {help.unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] leading-none font-medium text-white tabular-nums ring-2 ring-dialer-surface"
          >
            {help.unread > 9 ? "9+" : help.unread}
          </span>
        ) : null}
      </button>
    </TooltipTrigger>
  );
}

export interface LiveAssistPanelProps {
  thread: LiveAssistThread;
  scenario: CallScenario;
  active?: boolean;
  onClose: () => void;
  className?: string;
}

export function LiveAssistPanel({
  thread,
  scenario,
  active = true,
  onClose,
  className,
}: LiveAssistPanelProps) {
  const reduced = prefersReducedMotion();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stickToBottom = useRef(true);

  const {
    messages,
    typing,
    phase,
    supervisor,
    sendMessage,
    pendingSupervisorId,
  } = thread;

  useEffect(() => {
    setDraft("");
  }, [scenario.id]);

  useEffect(() => {
    if (!active) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [active]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, typing, phase, active]);

  const submit = (text = draft) => {
    const body = text.trim();
    if (!body) return;
    if (phase === "unavailable") return;
    if (supervisor.status !== "available") return;
    sendMessage(body);
    setDraft("");
    stickToBottom.current = true;
  };

  const pending = pendingSupervisorId
    ? supervisorById(pendingSupervisorId)
    : null;

  const composerLocked =
    supervisor.status !== "available" ||
    phase === "unavailable" ||
    (phase === "active" && typing);

  return (
    <section
      aria-label="Live Assist"
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white",
        className
      )}
    >
      <header className="flex h-11 shrink-0 items-center justify-between gap-1.5 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <IconCallHelp size={16} className="shrink-0 text-muted-foreground" />
          <p className="text-label-md-semi text-foreground">Live Assist</p>
        </div>
        <button
          type="button"
          aria-label="Close Live Assist"
          onClick={onClose}
          className="flex size-6 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={16} />
        </button>
      </header>

      <div className="flex shrink-0 flex-col gap-2 border-b border-line px-4 py-3">
        <SupervisorSelect
          supervisors={thread.supervisors}
          value={supervisor.id}
          disabled={Boolean(pending)}
          active={active}
          onChange={thread.selectSupervisor}
        />
      </div>

      {pending ? (
        <SupervisorSwitchConfirm
          current={supervisor}
          next={pending}
          onCancel={thread.cancelSupervisorChange}
          onConfirm={thread.confirmSupervisorChange}
        />
      ) : null}

      <div
        ref={scrollRef}
        aria-live="polite"
        onScroll={(event) => {
          const el = event.currentTarget;
          const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
          stickToBottom.current = dist < 48;
        }}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 && phase === "idle" && !typing ? (
          <p className="text-pretty text-paragraph-sm text-muted-foreground">
            Ask {supervisor.firstName} anything about this call. They can see
            the customer, the account, and the live transcript.
          </p>
        ) : null}

        {messages.map((message) => (
          <MessageRow
            key={message.id}
            message={message}
            supervisor={supervisor}
            reduced={reduced}
          />
        ))}

        {phase === "waiting" ? (
          <SystemLine
            text={`Waiting for ${supervisor.firstName}…`}
            reduced={reduced}
            pulse
          />
        ) : null}

        {phase === "unavailable" ? (
          <SystemLine
            text={`${supervisor.firstName} is unavailable`}
            reduced={reduced}
          />
        ) : null}

        {phase === "unavailable" ? (
          <p className="text-pretty text-paragraph-sm text-muted-foreground">
            Select another available supervisor to start a new assist. This
            conversation stays here.
          </p>
        ) : null}

        {typing ? (
          <TypingRow supervisor={supervisor} reduced={reduced} />
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex shrink-0 items-start gap-2 border-t border-line px-4 py-3"
      >
        <InputField
          ref={inputRef}
          wrapperClassName="min-w-0 flex-1"
          aria-label="Ask your supervisor"
          placeholder="Ask your supervisor..."
          clearable={false}
          disabled={composerLocked}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button
          type="submit"
          size="md"
          variant="primary"
          iconOnly
          aria-label="Send"
          disabled={!draft.trim() || composerLocked}
        >
          <IconSend />
        </Button>
      </form>
    </section>
  );
}

/**
 * Send — the paper plane for the composer button. Drawn on the library's
 * 24-unit grid with round caps and the 20px stroke weight, so it reads as part
 * of the same set; the Button's `[&_svg]:size-5` fixes the rendered size.
 */
function IconSend() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 14 21 3" />
      <path d="M21 3l-6.5 18a.55.55 0 0 1-1 0L10 14 3 10.5a.55.55 0 0 1 0-1L21 3Z" />
    </svg>
  );
}

function SupervisorSelect({
  supervisors,
  value,
  disabled,
  active = true,
  onChange,
}: {
  supervisors: Supervisor[];
  value: string;
  disabled?: boolean;
  active?: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { mounted, state } = useDropdownPresence(open);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = supervisorById(value);
  const [menuBox, setMenuBox] = useState({ top: 0, left: 0, width: 0 });

  const place = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = rect.width;
    const below = rect.bottom + 8;
    const spaceBelow = window.innerHeight - below;
    const estimated = Math.min(220, supervisors.length * 44 + 8);
    const top =
      spaceBelow < estimated && rect.top > estimated
        ? rect.top - estimated - 8
        : below;
    setMenuBox({ top, left: rect.left, width });
  };

  useEffect(() => {
    if (!active || disabled) setOpen(false);
  }, [active, disabled]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onReposition = () => place();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, supervisors.length]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const t = event.target;
      if (!(t instanceof Node)) return;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-label-sm text-muted-foreground">Supervisor</p>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={mounted ? listboxId : undefined}
        onClick={() => !disabled && setOpen((next) => !next)}
        className={cn(
          "flex h-10 w-full min-w-0 items-center gap-2 rounded-[4px] border border-line bg-white px-3 text-left outline-none",
          "hover:border-control-border focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/16",
          "disabled:cursor-not-allowed disabled:bg-control-disabled-bg"
        )}
      >
        <Avatar
          size="xs"
          initials={selected.initials}
          color={selected.color}
          className="shrink-0"
        />
        <span className="min-w-0 flex-1 truncate text-paragraph-md text-foreground">
          {selected.name}
          <span className="text-muted-foreground">
            {" "}
            · {statusLabel(selected.status)}
          </span>
        </span>
        <IconChevronDown
          size={16}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {mounted
        ? createPortal(
            <div
              ref={menuRef}
              id={listboxId}
              role="listbox"
              aria-label="Supervisors"
              data-state={state}
              style={{
                top: menuBox.top,
                left: menuBox.left,
                width: menuBox.width,
              }}
              className="dropdown-panel fixed z-[80] overflow-hidden rounded-[4px] border border-line bg-white py-1 shadow-400"
            >
              {supervisors.map((item) => {
                const selectedItem = item.id === value;
                const busy = item.status === "busy";
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={selectedItem}
                    disabled={busy}
                    onClick={() => {
                      if (busy) return;
                      onChange(item.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left outline-none",
                      busy
                        ? "cursor-not-allowed text-disabled-fg"
                        : selectedItem
                          ? "bg-brand-subtle text-foreground"
                          : "text-foreground hover:bg-surface-hover"
                    )}
                  >
                    <Avatar
                      size="xs"
                      initials={item.initials}
                      color={item.color}
                      className="shrink-0"
                    />
                    <span className="min-w-0 flex-1 truncate text-paragraph-md">
                      {item.name}
                    </span>
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 text-label-sm",
                        busy ? "text-disabled-fg" : "text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          busy ? "bg-warning" : "bg-success"
                        )}
                        aria-hidden="true"
                      />
                      {statusLabel(item.status)}
                    </span>
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function SupervisorSwitchConfirm({
  current,
  next,
  onCancel,
  onConfirm,
}: {
  current: Supervisor;
  next: Supervisor;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-line bg-muted px-4 py-3">
      <div className="flex flex-col gap-1">
        <p className="text-label-md-semi text-pretty text-foreground">
          Start a new assist with {next.firstName}?
        </p>
        <p className="text-pretty text-paragraph-sm text-muted-foreground">
          {next.firstName} won't see this chat with {current.firstName}.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="grey-outline"
          className="flex-1"
          onClick={onCancel}
        >
          Keep {current.firstName}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="primary"
          className="flex-1"
          onClick={onConfirm}
        >
          Start new
        </Button>
      </div>
    </div>
  );
}

function MessageRow({
  message,
  supervisor,
  reduced,
}: {
  message: LiveAssistMessage;
  supervisor: Supervisor;
  reduced: boolean;
}) {
  if (message.from === "system") {
    return <SystemLine text={message.text} reduced={reduced} />;
  }

  const mine = message.from === "agent";
  const name = mine ? AGENT.name : supervisor.firstName;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        !reduced && "live-assist-msg-in"
      )}
    >
      <p className="text-label-sm text-muted-foreground">{name}</p>
      <p className="text-pretty text-paragraph-sm text-foreground">
        {message.text}
      </p>
    </div>
  );
}

function SystemLine({
  text,
  reduced,
  pulse,
}: {
  text: string;
  reduced: boolean;
  pulse?: boolean;
}) {
  return (
    <p
      className={cn(
        "text-label-sm text-pretty text-muted-foreground",
        !reduced && "live-assist-msg-in"
      )}
    >
      {pulse ? (
        <span className="inline-flex items-center gap-1.5">
          <span
            className="help-wait-dot size-1.5 rounded-full bg-warning"
            aria-hidden="true"
          />
          {text}
        </span>
      ) : (
        text
      )}
    </p>
  );
}

function TypingRow({
  supervisor,
  reduced,
}: {
  supervisor: Supervisor;
  reduced: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        !reduced && "live-assist-msg-in"
      )}
    >
      <p className="text-label-sm text-muted-foreground">{supervisor.firstName}</p>
      <span
        className="flex h-7 w-fit items-center gap-1 rounded-[8px] bg-secondary-bg px-2.5"
        aria-label={`${supervisor.name} is typing`}
      >
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            style={{ "--dot-delay": `${index * 140}ms` } as CSSProperties}
            className={cn(
              "size-1.5 rounded-full bg-disabled-fg",
              !reduced && "live-assist-dot"
            )}
          />
        ))}
      </span>
    </div>
  );
}
