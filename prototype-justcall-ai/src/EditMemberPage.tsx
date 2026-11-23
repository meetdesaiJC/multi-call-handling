import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, initialsFromName } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { IconClose } from "@/components/Icon";
import { InputField } from "@/components/InputField";
import { Radio } from "@/components/Radio";
import { RadioCard } from "@/components/RadioCard";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  FixedAccess,
  LICENSE_OPTIONS,
  ROLE_OPTIONS,
  type License,
  type RoleChoice,
} from "./AddMembersFlow";
import { CsmEmail } from "./CsmEmail";
import { CUSTOM_ROLES, memberLicense, type TeamMember } from "./teamMembersData";

/**
 * Team Members › Edit Member, opened from a row's pencil. Takes over the page
 * body the way Add Members does: same 74px bar, close on the left, the
 * commit actions on the right.
 *
 * Save stays disabled until something actually changes, so it doubles as the
 * "you have unsaved edits" signal rather than being a button that does
 * nothing on a clean form.
 */

type Section = "basic" | "access" | "working-hours" | "dialer-settings";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "basic", label: "Basic information" },
  { key: "access", label: "License Type & Role" },
  { key: "working-hours", label: "Working Hours" },
  { key: "dialer-settings", label: "Dialer Settings" },
];

/** The zones the fixture uses, in the live product's "(GMT±hh:mm) Cities" wording. */
const TIME_ZONES = [
  { value: "Pacific/Midway", label: "(GMT-11:00) Midway Island, Samoa" },
  { value: "Etc/GMT+10", label: "(GMT-10:00) Hawaii" },
  { value: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time (US & Canada)" },
  { value: "America/New_York", label: "(GMT-05:00) Eastern Time (US & Canada)" },
  { value: "Europe/London", label: "(GMT+00:00) Edinburgh, London" },
  { value: "Asia/Kolkata", label: "(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi" },
  { value: "Asia/Singapore", label: "(GMT+08:00) Kuala Lumpur, Singapore" },
  { value: "Asia/Hong_Kong", label: "(GMT+08:00) Beijing - Chongqing - Hong Kong - Urumqi" },
];

/** The member's license in the invite flow's keys. */
function licenseOf(member: TeamMember): License {
  const license = memberLicense(member.id);
  return license === "Lite" ? "lite" : license === "View-only" ? "view-only" : "standard";
}

/** Fixture roles are free text; fold them onto the invite flow's three choices. */
function roleOf(member: TeamMember): { role: RoleChoice; customRole: string } {
  if (member.role === "Owner" || member.role === "Admin") {
    return { role: "admin", customRole: "" };
  }
  if (member.role === "Team Member" || member.role === "Migrated Team Member") {
    return { role: "member", customRole: "" };
  }
  return { role: "custom", customRole: member.role };
}

function splitName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  return { first: first ?? "", last: rest.join(" ") };
}

export function EditMemberPage({
  member,
  onClose,
}: {
  member: TeamMember;
  onClose: () => void;
}) {
  const initial = {
    ...splitName(member.name),
    email: member.email,
    extension: member.extension,
    timeZone: member.timeZone,
    ...roleOf(member),
  };
  const license = licenseOf(member);
  const [form, setForm] = useState(initial);
  const [section, setSection] = useState<Section>("basic");
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some(
    (key) => form[key] !== initial[key]
  );
  const set = (key: keyof typeof initial) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const setRole = (role: RoleChoice) => setForm((current) => ({ ...current, role }));

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex h-[74px] shrink-0 items-center justify-between gap-4 border-b border-line px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={24} />
          </button>
          <h1 className="text-heading-xxl text-foreground">Edit Member</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="error-secondary" size="md">
            Remove Member
          </Button>
          <Button size="md" disabled={!dirty} onClick={onClose}>
            Save
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-16 overflow-auto px-6 py-9 lg:px-10">
        <aside className="flex w-[288px] shrink-0 flex-col gap-6">
          <div className="flex items-start gap-3">
            <Avatar size="lg" color="indigo" initials={initialsFromName(member.name)} />
            <div className="flex min-w-0 flex-col">
              <span className="text-label-lg text-foreground">{member.name}</span>
              <span className="break-all text-paragraph-md text-muted-foreground">
                {member.email}
              </span>
            </div>
          </div>
          <nav aria-label="Member settings" className="flex flex-col gap-1">
            {SECTIONS.map((item) => {
              const active = item.key === section;
              // Every section stays open, Dialer Settings included, whatever
              // the member's or the admin's license — locks go on verbs, not pages.
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => setSection(item.key)}
                  className={cn(
                    "w-full rounded-[4px] px-7 py-2.5 text-left text-label-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
                    active
                      ? "bg-brand-subtle text-brand"
                      : "text-foreground hover:bg-surface-hover"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section
          className={cn(
            "@container flex w-full flex-col gap-6",
            // Three license cards need the invite flow's width to stay readable.
            section === "access" ? "max-w-[760px]" : "max-w-[640px]"
          )}
        >
          {section === "basic" ? (
            <>
              <header className="flex flex-col gap-1">
                <h2 className="text-heading-xl text-foreground">Basic Information</h2>
                <p className="text-paragraph-md text-muted-foreground">
                  Update and modify essential personal information
                </p>
              </header>
              <div className="flex flex-col gap-5">
                <InputField
                  label="First Name"
                  value={form.first}
                  onChange={(event) => set("first")(event.target.value)}
                />
                <InputField
                  label="Last Name"
                  value={form.last}
                  onChange={(event) => set("last")(event.target.value)}
                />
                <InputField
                  label="Email Address"
                  value={form.email}
                  onChange={(event) => set("email")(event.target.value)}
                />
                <InputField
                  label="Extension"
                  value={form.extension}
                  inputMode="numeric"
                  onChange={(event) => set("extension")(event.target.value)}
                />
                <Dropdown
                  label="Time Zone"
                  options={TIME_ZONES}
                  value={form.timeZone}
                  onValueChange={(value) =>
                    set("timeZone")(Array.isArray(value) ? value[0] : value)
                  }
                  className="w-full"
                />
              </div>
            </>
          ) : section === "access" ? (
            <>
              <header>
                <h2 className="text-heading-xl text-foreground">License Type &amp; Role</h2>
              </header>

              {/* Heading sits close to its cards so it reads as their label,
                  not as a section of its own. */}
              <div className="flex flex-col gap-2">
                <h3 className="text-label-lg text-foreground">License type</h3>
                {/* The same three cards the invite flow offers, so the admin
                    recognises them — but read-only. Moving someone between
                    licenses changes the contract, which is the CSM's call, not
                    a settings toggle; each card says so on hover. */}
                <div
                  role="radiogroup"
                  aria-label="License type"
                  aria-disabled="true"
                  className="grid grid-cols-1 gap-3 @min-[600px]:grid-cols-3"
                >
                  {LICENSE_OPTIONS.map((option) => (
                    <TooltipTrigger
                      key={option.key}
                      placement="top"
                      className="flex h-full w-full"
                      // Interactive so the pointer can travel into the bubble
                      // and reach the CTA before it closes.
                      interactive
                      content={
                        <Tooltip
                          theme="dark"
                          arrow="bottom-center"
                          // White rather than the tooltip's muted grey / link
                          // blue: the whole bubble is the message, as in Figma.
                          description={
                            <span className="text-tooltip-dark-fg">
                              License changes are handled by your CSM. Contact{" "}
                              <CsmEmail tone="dark" /> to request one.
                            </span>
                          }
                        />
                      }
                    >
                      <RadioCard
                        wrapperClassName="w-full"
                        name="edit-member-license"
                        // Only the alternatives are disabled. The member's own
                        // license keeps the selected look — greying it too
                        // would read as "no license", not "this one".
                        disabled={license !== option.key}
                        checked={license === option.key}
                        onCheckedChange={() => {}}
                        title={option.label}
                        icon={option.icon}
                        description={option.description}
                      />
                    </TooltipTrigger>
                  ))}
                </div>
              </div>

              {license === "standard" ? (
                <div className="flex flex-col gap-4">
                  <h3 className="text-label-lg text-foreground">Role</h3>
                  <div
                    role="radiogroup"
                    aria-label="Role"
                    className="flex max-w-[620px] flex-col gap-5"
                  >
                    {ROLE_OPTIONS.map((option) => {
                      const selected = form.role === option.key;
                      return (
                        <div key={option.key} className="flex flex-col gap-3">
                          <Radio
                            name="edit-member-role"
                            size="md"
                            checked={selected}
                            onCheckedChange={(checked) => checked && setRole(option.key)}
                            label={<span className="text-label-md">{option.label}</span>}
                            description={
                              <span className="text-muted-foreground">
                                {option.description}
                              </span>
                            }
                          />
                          {option.key === "custom" && selected ? (
                            <div className="pl-8">
                              <Dropdown
                                placeholder="Select a custom role"
                                searchable
                                searchPlaceholder="Search roles"
                                options={CUSTOM_ROLES.map((r) => ({ value: r, label: r }))}
                                value={form.customRole || undefined}
                                onValueChange={(value) =>
                                  set("customRole")(Array.isArray(value) ? value[0] : value)
                                }
                                className="w-full max-w-[360px]"
                              />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // Lite and View-only carry fixed access — the invite flow's
                // reasoning holds here too: a role picker would have no effect.
                <FixedAccess />
              )}
            </>
          ) : (
            <header className="flex flex-col gap-1">
              <h2 className="text-heading-xl text-foreground">
                {SECTIONS.find((item) => item.key === section)?.label}
              </h2>
              <p className="text-paragraph-md text-muted-foreground">
                Not part of this prototype yet.
              </p>
            </header>
          )}
        </section>
      </div>
    </main>
  );
}
