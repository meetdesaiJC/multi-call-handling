import * as React from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Tabs, type TabItem } from "@/components/Tabs";
import { InputField } from "@/components/InputField";
import { AvatarLabelGroup } from "@/components/Avatar";
import { IconSearch, IconClose } from "@/components/Icon";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";

/**
 * Manage AI Review Assist licenses — Figma "User-level pricing for Add-ons"
 * (node 40002510:66065 / 40002510:67812). Opened from the "Manage" button on
 * the Billing Overview AI Review Assist card.
 *
 * Every action (Assign, Remove, Approve, Deny) commits immediately via its
 * callback — there's no separate save step since each row already has its
 * own explicit action. "Approve all" is the exception: it opens a
 * confirmation dialog first (node 40002596:61641 / 40002596:62507) since it
 * affects every pending request at once, and if there aren't enough
 * available licenses to cover every request it redirects to buying more
 * instead of silently under-filling.
 */

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  /** Already has a license before this modal opened. */
  assigned?: boolean;
  /** Has an open request for a license, awaiting approval. */
  requested?: boolean;
}

/** The signed-in admin's own identity — not part of `members`, since the roster only tracks teammates. */
export interface AccountHolder {
  name: string;
  email: string;
  initials: string;
  assigned: boolean;
}

export interface ManageLicensesModalProps {
  open: boolean;
  onClose: () => void;
  /** Total paid licenses on the account. */
  licensesTotal: number;
  members: TeamMember[];
  /**
   * The signed-in admin, pinned as the first row of the "All" tab (tagged
   * "(You)") so they can see and manage their own access alongside the
   * team's — they're a license holder too, just not part of `members`.
   */
  accountHolder?: AccountHolder;
  /** Tab to land on when the modal opens. Defaults to "all". */
  initialTab?: "all" | "assigned" | "requests";
  onBuyAdditionalLicenses?: () => void;
  /** Called immediately when a member is assigned a license. */
  onAssign?: (id: string) => void;
  /** Called immediately when a member's license is removed. */
  onRemove?: (id: string) => void;
  /** Called immediately when the account holder is assigned a license. */
  onAssignAccountHolder?: () => void;
  /** Called immediately when the account holder's license is removed. */
  onRemoveAccountHolder?: () => void;
  /** Called immediately when a license request is approved. */
  onApproveRequest?: (id: string) => void;
  /** Called immediately when a license request is denied. */
  onDenyRequest?: (id: string) => void;
  /** Called immediately when all pending requests are approved at once. */
  onApproveAll?: () => void;
}

const TABS: TabItem[] = [
  { key: "all", label: "All" },
  { key: "assigned", label: "Assigned" },
  { key: "requests", label: "Requests" },
];

function ProgressPie({ percent }: { percent: number }) {
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r={radius} fill="none" className="stroke-line" strokeWidth="2" />
      {filled > 0 && (
        <circle
          cx="10"
          cy="10"
          r={radius}
          fill="none"
          className="stroke-brand"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 10 10)"
        />
      )}
    </svg>
  );
}

/** Assign/Remove action shared by every row — disabled with an explanatory tooltip once the account is out of licenses. */
function AssignRemoveButton({
  assigned,
  atLicenseLimit,
  onAssign,
  onRemove,
}: {
  assigned: boolean;
  atLicenseLimit: boolean;
  onAssign?: () => void;
  onRemove?: () => void;
}) {
  if (!assigned && atLicenseLimit) {
    return (
      <TooltipTrigger
        placement="left"
        content={<Tooltip arrow="right" title="Buy additional licenses to assign more team members" />}
      >
        <span className="inline-flex shrink-0">
          <Button variant="grey-outline" size="xs" disabled>
            Assign
          </Button>
        </span>
      </TooltipTrigger>
    );
  }
  return (
    <Button
      variant={assigned ? "error-grey-outline" : "grey-outline"}
      size="xs"
      className="shrink-0"
      onClick={assigned ? onRemove : onAssign}
    >
      {assigned ? "Remove" : "Assign"}
    </Button>
  );
}

/** Gradient "AI Review Assist" pill shown next to a member's name once assigned. */
function AiReviewAssistBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center whitespace-nowrap rounded-[16px] px-2 py-0.5"
      style={{
        backgroundImage:
          "linear-gradient(100deg, rgba(0, 76, 230, 0.08) 46%, rgba(180, 109, 255, 0.08) 145%)",
      }}
    >
      <span
        className="bg-clip-text text-label-sm text-transparent"
        style={{
          backgroundImage: "linear-gradient(101deg, var(--color-ai-gradient-from) 30%, var(--color-ai-gradient-to) 149%)",
        }}
      >
        AI Review Assist
      </span>
    </span>
  );
}

export function ManageLicensesModal({
  open,
  onClose,
  licensesTotal,
  members,
  accountHolder,
  initialTab = "all",
  onBuyAdditionalLicenses,
  onAssign,
  onRemove,
  onAssignAccountHolder,
  onRemoveAccountHolder,
  onApproveRequest,
  onDenyRequest,
  onApproveAll,
}: ManageLicensesModalProps) {
  const [tab, setTab] = React.useState<string>(initialTab);
  const [search, setSearch] = React.useState("");
  const [approveAllConfirmOpen, setApproveAllConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setSearch("");
    setApproveAllConfirmOpen(false);
  }, [open, initialTab]);

  const requestIds = new Set(members.filter((m) => m.requested).map((m) => m.id));

  const query = search.trim().toLowerCase();
  const matchesQuery = (person: { name: string; email: string }) =>
    !query ||
    person.name.toLowerCase().includes(query) ||
    person.email.toLowerCase().includes(query);

  const visibleMembers = members
    .filter((member) => {
      if (tab === "assigned" && !member.assigned) return false;
      if (tab === "requests" && !requestIds.has(member.id)) return false;
      return matchesQuery(member);
    })
    // Stable sort: assigned members float to the top but keep their
    // relative order, so a newly-assigned member slots in among the
    // existing assigned group instead of jumping to the very top.
    .sort((a, b) => Number(Boolean(b.assigned)) - Number(Boolean(a.assigned)));

  // Pinned first in the "All" tab only — the account holder isn't part of
  // `members`, so they'd otherwise be invisible in their own license list.
  const showAccountHolderRow = tab === "all" && Boolean(accountHolder) && matchesQuery(accountHolder!);

  const assignedCount = members.filter((m) => m.assigned).length + (accountHolder?.assigned ? 1 : 0);
  const assignedPct = licensesTotal > 0 ? (assignedCount / licensesTotal) * 100 : 0;
  const atLicenseLimit = assignedCount >= licensesTotal;

  const availableLicenses = Math.max(0, licensesTotal - assignedCount);
  const licensesNeeded = Math.max(0, requestIds.size - availableLicenses);
  const canApproveAllNow = licensesNeeded === 0;

  const tabsWithBadge: TabItem[] = TABS.map((item) =>
    item.key === "requests" && requestIds.size > 0
      ? { ...item, badge: requestIds.size }
      : item
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="md"
        title="Manage AI Review Assist licenses"
        description="Choose which team members get access."
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 rounded-[4px] border border-line bg-secondary-bg px-3 py-3">
            <div className="flex flex-1 items-center gap-2">
              <ProgressPie percent={assignedPct} />
              <p className="text-paragraph-md text-foreground">
                <span className="font-semibold">
                  {assignedCount}/{licensesTotal}
                </span>{" "}
                <span className="font-medium text-muted-foreground">paid licenses assigned</span>
              </p>
            </div>
            <Button
              variant={atLicenseLimit ? "primary" : "grey-outline"}
              size="xs"
              onClick={onBuyAdditionalLicenses}
              className="shrink-0"
            >
              Buy additional licenses
            </Button>
          </div>

          <div className="border-b border-line">
            <Tabs items={tabsWithBadge} value={tab} onValueChange={setTab} />
          </div>

          <InputField
            placeholder="Search"
            leadingIcon={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            clearable={false}
          />

          {tab === "requests" && requestIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-[4px] border border-line bg-secondary-bg px-3 py-2">
              <p className="flex-1 text-paragraph-md text-muted-foreground">
                {requestIds.size} pending request{requestIds.size === 1 ? "" : "s"}
              </p>
              <Button variant="link" size="xs" onClick={() => setApproveAllConfirmOpen(true)}>
                Approve all
              </Button>
            </div>
          )}

          <div className="flex max-h-[280px] flex-col overflow-y-auto">
            {showAccountHolderRow && (
              <>
                <div className="flex items-center gap-2 rounded-[4px] py-3 pl-3 pr-4 hover:bg-surface-hover">
                  <AvatarLabelGroup
                    className="flex-1"
                    name={
                      <span className="inline-flex items-center gap-1.5">
                        {accountHolder!.name}
                        <span className="text-muted-foreground">(You)</span>
                        {accountHolder!.assigned && <AiReviewAssistBadge />}
                      </span>
                    }
                    description={accountHolder!.email}
                    avatarProps={{ initials: accountHolder!.initials, color: "indigo" }}
                  />
                  <AssignRemoveButton
                    assigned={Boolean(accountHolder!.assigned)}
                    atLicenseLimit={atLicenseLimit}
                    onAssign={onAssignAccountHolder}
                    onRemove={onRemoveAccountHolder}
                  />
                </div>
                {visibleMembers.length > 0 && <div className="my-1 border-t border-line" />}
              </>
            )}
            {visibleMembers.length === 0 ? (
              !showAccountHolderRow && (
              <p className="px-3 py-6 text-center text-paragraph-md text-muted-foreground">
                {query ? (
                  "No results found."
                ) : (
                  <>
                    {tab === "assigned" && "No one has been assigned a license yet."}
                    {tab === "requests" && "No pending requests."}
                    {tab === "all" && "No team members found."}
                  </>
                )}
              </p>
              )
            ) : (
              visibleMembers.map((member, index) => {
                const isAssigned = Boolean(member.assigned);
                const isRequesting = tab === "requests" && requestIds.has(member.id);
                const prevMember = visibleMembers[index - 1];
                const showDivider = index > 0 && prevMember && Boolean(prevMember.assigned) && !isAssigned;

                return (
                  <React.Fragment key={member.id}>
                    {showDivider && <div className="my-1 border-t border-line" />}
                    <div className="flex items-center gap-2 rounded-[4px] py-3 pl-3 pr-4 hover:bg-surface-hover">
                      <AvatarLabelGroup
                        className="flex-1"
                        name={
                          isAssigned ? (
                            <span className="inline-flex items-center gap-1">
                              {member.name}
                              <AiReviewAssistBadge />
                            </span>
                          ) : (
                            member.name
                          )
                        }
                        description={member.email}
                        avatarProps={{ initials: member.initials, color: "indigo" }}
                      />
                      {isRequesting ? (
                        <div className="flex shrink-0 items-center gap-3">
                          <Button
                            variant="primary-outline"
                            size="xs"
                            disabled={atLicenseLimit}
                            onClick={() => onApproveRequest?.(member.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="grey-outline"
                            size="xs"
                            iconOnly
                            aria-label="Deny request"
                            onClick={() => onDenyRequest?.(member.id)}
                          >
                            <IconClose size={16} />
                          </Button>
                        </div>
                      ) : (
                        <AssignRemoveButton
                          assigned={isAssigned}
                          atLicenseLimit={atLicenseLimit}
                          onAssign={() => onAssign?.(member.id)}
                          onRemove={() => onRemove?.(member.id)}
                        />
                      )}
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={approveAllConfirmOpen}
        onClose={() => setApproveAllConfirmOpen(false)}
        size="sm"
        showCloseButton={false}
        title={
          canApproveAllNow
            ? `Approve all ${requestIds.size} request${requestIds.size === 1 ? "" : "s"}?`
            : "Buy additional licenses to approve all"
        }
        description={
          canApproveAllNow
            ? `All ${requestIds.size} team members will get access to AI Review Assist.`
            : `You have ${availableLicenses} license${availableLicenses === 1 ? "" : "s"} available. Buy ${licensesNeeded} more to approve everyone, or go back and choose who gets the ${availableLicenses} you have.`
        }
        footer={
          <div className="flex w-full gap-4">
            <Button
              variant="grey-outline"
              size="sm"
              className="flex-1"
              onClick={() => setApproveAllConfirmOpen(false)}
            >
              Back
            </Button>
            {canApproveAllNow ? (
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  onApproveAll?.();
                  setApproveAllConfirmOpen(false);
                }}
              >
                Approve all
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setApproveAllConfirmOpen(false);
                  onBuyAdditionalLicenses?.();
                }}
              >
                Buy {licensesNeeded} license{licensesNeeded === 1 ? "" : "s"}
              </Button>
            )}
          </div>
        }
      />
    </>
  );
}
