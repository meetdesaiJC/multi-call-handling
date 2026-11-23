import * as React from "react";
import { Sidenav, IconOverviewEye, IconInvoiceDoc, IconPricingCard, IconUsageBalanceBars } from "@/components/Sidenav";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Button, buttonVariants } from "@/components/Button";
import { cn } from "@/lib/utils";
import { Tag } from "@/components/Tag";
import { Alert } from "@/components/Alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellText,
} from "@/components/Table";
import {
  IconInfoCircle,
  IconInfoCircleFilled,
  IconDotsVertical,
  IconCircleCheckFilled,
} from "@/components/Icon";
import { ManageLicensesModal, type AccountHolder, type TeamMember } from "./ManageLicensesModal";
import visaLogo from "./illustrations/visa-logo.svg";

/**
 * Billing Overview — Figma "User-level pricing for Add-ons / Billing Overview"
 * (node 40002590:35026). Landing page after a successful "Confirm & Pay" from
 * `CheckoutSelectLicenses` — shows the account's plan, AI Review Assist seat
 * usage, saved payment method, and the cancel-subscription escape hatch.
 *
 * The sidenav here swaps the main product nav for the "Your Plan" section
 * (Overview / Invoices / Pricing / Usage Balance) via `Sidenav`'s `backLink`
 * and `sectionLabel` support — added alongside this page since the flat nav
 * list couldn't express a grouped, "leaving the main app" sub-nav.
 */

const YOUR_PLAN_ITEMS = [
  { key: "overview", label: "Overview", icon: <IconOverviewEye /> },
  { key: "invoices", label: "Invoices", icon: <IconInvoiceDoc /> },
  { key: "pricing", label: "Pricing", icon: <IconPricingCard /> },
  { key: "usage-balance", label: "Usage Balance", icon: <IconUsageBalanceBars /> },
];

const PLAN_RENEWAL_DATE = "October 1, 2025";
const CANCEL_EFFECTIVE_DATE = "August 1, 2025";

const TEAM_MEMBER_NAMES = [
  "Lydia Mango",
  "Skylar Schleifer",
  "Rayna Mango",
  "Brandon Schleifer",
  "Talan Gouse",
  "Olivia Chen",
  "Marcus Rivera",
  "Anya Patel",
  "Desmond Clarke",
  "Priya Nair",
  "Jonah Whitfield",
  "Camille Dubois",
  "Ethan Kowalski",
  "Farah Haddad",
  "Nolan Reyes",
  "Ines Bergstrom",
  "Wesley Okafor",
  "Sana Malik",
  "Gustavo Alves",
  "Bianca Ferreira",
  "Callum Fitzgerald",
  "Mei Lin Tan",
  "Deacon Holloway",
  "Rosalind Petit",
  "Tobias Herzog",
  "Amara Boateng",
  "Julian Voss",
  "Nadia Kowalczyk",
  "Silas Thorne",
  "Ivy Sinclair",
  "Rafael Moreno",
  "Chiara Bianchi",
  "Kofi Mensah",
  "Layla Farouk",
  "Declan Murphy",
  "Yuki Tanaka",
  "Theo Andersson",
  "Zara Ahmed",
  "Elias Sundberg",
  "Naomi Osei",
  "Hugo Lindqvist",
  "Selin Yildiz",
  "Otis Bramwell",
  "Freya Nilsen",
  "Kwame Asante",
  "Vera Novak",
  "Miles Ashworth",
  "Alina Popescu",
  "Django Fontaine",
  "Simone Laurent",
];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/(^-|-$)/g, "");
}

function initialsFor(name: string) {
  const parts = name.split(" ");
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const TEAM_MEMBERS: TeamMember[] = TEAM_MEMBER_NAMES.map((name) => ({
  id: slugify(name),
  name,
  email: `${slugify(name)}@email.com`,
  initials: initialsFor(name),
  assigned: false,
  requested: false,
}));

type ToastPhase = "entering" | "open" | "exiting";

// Visible duration and exit length from the Figma motion spec (node
// 40002590:35221) — exit must match the .toast-panel[data-state="exiting"]
// transition duration in globals.css so the unmount timer doesn't cut the
// fade-out short.
const TOAST_VISIBLE_MS = 5000;
const TOAST_EXIT_MS = 140;

export interface BillingOverviewProps {
  /** AI Review Assist licenses on the account (from the most recent purchase). */
  aiReviewAssistLicenses?: number;
  /** Shows the "N AI Review Assist licenses purchased" success toast. */
  showSuccessToast?: boolean;
  onDismissToast?: () => void;
  onBackToDashboard?: () => void;
  onBuyAdditionalLicenses?: () => void;
  /** Seeds who's already assigned/requested. Defaults to a clean roster. */
  initialTeamMembers?: TeamMember[];
}

export function BillingOverview({
  aiReviewAssistLicenses = 0,
  showSuccessToast = false,
  onDismissToast,
  onBackToDashboard,
  onBuyAdditionalLicenses,
  initialTeamMembers = TEAM_MEMBERS,
}: BillingOverviewProps) {
  // Source of truth for who has a license — updated in place as each
  // Assign/Remove/Approve/Deny action commits, so the card's count stays
  // in sync and the modal reflects the latest state when reopened.
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>(initialTeamMembers);
  // The signed-in admin holds a license by default — she's the one managing
  // everyone else's access. Not part of `teamMembers`, so tracked separately
  // and folded into the counts below.
  const [accountHolderAssigned, setAccountHolderAssigned] = React.useState(true);
  const accountHolder: AccountHolder = {
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    initials: initialsFor("Sarah Johnson"),
    assigned: accountHolderAssigned,
  };
  const aiReviewAssistAssigned =
    teamMembers.filter((member) => member.assigned).length + (accountHolderAssigned ? 1 : 0);
  const pendingRequests = teamMembers.filter((member) => member.requested).length;

  const assignedPct =
    aiReviewAssistLicenses > 0 ? Math.min(100, (aiReviewAssistAssigned / aiReviewAssistLicenses) * 100) : 0;
  const atLicenseLimit = aiReviewAssistLicenses > 0 && aiReviewAssistAssigned >= aiReviewAssistLicenses;

  const [manageLicensesOpen, setManageLicensesOpen] = React.useState(false);
  const [manageLicensesTab, setManageLicensesTab] = React.useState<"all" | "assigned" | "requests">("all");

  const [toastMounted, setToastMounted] = React.useState(showSuccessToast);
  const [toastPhase, setToastPhase] = React.useState<ToastPhase>("entering");
  // Remaining countdown + when the current leg started, so hover/focus can
  // pause and later resume with the time actually left instead of restarting.
  const remainingMsRef = React.useRef(TOAST_VISIBLE_MS);
  const countdownStartedAtRef = React.useRef(0);
  const dismissTimerRef = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    if (!showSuccessToast) return;
    setToastMounted(true);
    setToastPhase("entering");
    remainingMsRef.current = TOAST_VISIBLE_MS;
    const raf = requestAnimationFrame(() => setToastPhase("open"));
    return () => cancelAnimationFrame(raf);
  }, [showSuccessToast]);

  const startCountdown = React.useCallback(() => {
    countdownStartedAtRef.current = Date.now();
    dismissTimerRef.current = setTimeout(() => setToastPhase("exiting"), remainingMsRef.current);
  }, []);

  const pauseCountdown = React.useCallback(() => {
    if (toastPhase !== "open") return;
    clearTimeout(dismissTimerRef.current);
    remainingMsRef.current -= Date.now() - countdownStartedAtRef.current;
  }, [toastPhase]);

  const resumeCountdown = React.useCallback(() => {
    if (toastPhase !== "open" || remainingMsRef.current <= 0) return;
    startCountdown();
  }, [toastPhase, startCountdown]);

  React.useEffect(() => {
    if (toastPhase !== "open") return;
    startCountdown();
    return () => clearTimeout(dismissTimerRef.current);
  }, [toastPhase, startCountdown]);

  React.useEffect(() => {
    if (toastPhase !== "exiting") return;
    const timer = setTimeout(() => {
      setToastMounted(false);
      onDismissToast?.();
    }, TOAST_EXIT_MS);
    return () => clearTimeout(timer);
  }, [toastPhase, onDismissToast]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidenav
        activeKey="overview"
        items={YOUR_PLAN_ITEMS}
        backLink={{ label: "Back To Dashboard", onClick: onBackToDashboard }}
        onItemSelect={() => {}}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <GlobalHeader title="Billing Overview" />

        {toastMounted && (
          <div
            data-state={toastPhase}
            className="toast-panel absolute right-6 top-[82px] z-10 w-[342px]"
            onMouseEnter={pauseCountdown}
            onMouseLeave={resumeCountdown}
            onFocus={pauseCountdown}
            onBlur={resumeCountdown}
          >
            <Alert
              variant="success"
              aria-live="polite"
              icon={
                <span data-state={toastPhase} className="toast-check inline-flex">
                  <IconCircleCheckFilled size={20} className="size-5" />
                </span>
              }
            >
              {aiReviewAssistLicenses} AI Review Assist licenses purchased
            </Alert>
          </div>
        )}

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white p-6">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
            {/* Plan Details */}
            <section className="flex w-full flex-col gap-6 rounded-[4px] border border-line p-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-heading-xl text-foreground">Plan Details</h2>
                <p className="text-paragraph-md text-muted-foreground">
                  Your monthly subscription renews on {PLAN_RENEWAL_DATE}
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan name</TableHead>
                    <TableHead>Plan details</TableHead>
                    <TableHead className="w-24 text-center">Licenses</TableHead>
                    <TableHead className="w-[146px] text-right">Subscription Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <TableCellText primary="Pro" supporting="Monthly" />
                    </TableCell>
                    <TableCell>
                      <ul className="list-disc space-y-0.5 pl-4 text-label-sm text-brand">
                        <li>Team members: 168 x $29</li>
                        <li>Phone numbers: $334</li>
                        <li>Add-ons: $6518</li>
                      </ul>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1.5">
                        168/168
                        <IconInfoCircle size={16} className="size-4 shrink-0 text-muted-foreground" />
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-paragraph-md text-muted-foreground">$11,724</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </section>

            {/* AI Review Assist */}
            <section className="flex w-full flex-col overflow-hidden rounded-[4px] border border-line">
              <div className="flex w-full items-center gap-6 p-6">
                <div className="flex flex-1 flex-col gap-1">
                  <h2 className="text-heading-xl text-foreground">AI Review Assist</h2>
                  <p className="text-paragraph-md text-muted-foreground">
                    Let AI handle the call notes. You focus on what&rsquo;s next.
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-3">
                  <p className="text-paragraph-md text-muted-foreground">
                    {aiReviewAssistAssigned} of {aiReviewAssistLicenses} paid licenses assigned
                  </p>
                  <div className="h-1.5 w-[240px] overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${assignedPct}%` }} />
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Button
                    variant="grey-outline"
                    size="md"
                    onClick={() => {
                      setManageLicensesTab("all");
                      setManageLicensesOpen(true);
                    }}
                  >
                    Manage
                  </Button>
                  {atLicenseLimit && (
                    <Button variant="primary" size="md" onClick={onBuyAdditionalLicenses}>
                      Buy more licenses
                    </Button>
                  )}
                </div>
              </div>

              {pendingRequests > 0 && (
                <div className="flex h-10 w-full items-center gap-2 bg-info-secondary px-6">
                  <IconInfoCircleFilled size={20} className="size-5 shrink-0 text-info" />
                  <p className="min-w-0 flex-1 text-paragraph-md text-foreground">
                    <span className="text-label-md-semi">
                      {pendingRequests} team member{pendingRequests === 1 ? " has" : "s have"} requested access to
                      AI Review Assist.
                    </span>{" "}
                    Review requests and Manage AI Review Assist licenses to your team.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setManageLicensesTab("requests");
                      setManageLicensesOpen(true);
                    }}
                    className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto shrink-0")}
                  >
                    Review Requests
                  </button>
                </div>
              )}
            </section>

            {/* Payment Method */}
            <section className="flex w-full flex-col gap-6 rounded-[4px] border border-line p-6">
              <div className="flex items-center gap-6">
                <div className="flex flex-1 flex-col gap-1">
                  <h2 className="text-heading-xl text-foreground">Payment Method</h2>
                  <p className="text-paragraph-md text-muted-foreground">
                    Manage your saved cards to keep billing seamless.
                  </p>
                </div>
                <Button variant="grey-outline" size="sm" className="shrink-0">
                  Add Card
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Card</TableHead>
                    <TableHead className="w-[480px]">Name on card</TableHead>
                    <TableHead className="w-40 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-[35px] items-center justify-center rounded-[2px] border border-line bg-white">
                          <img src={visaLogo} alt="Visa" className="h-[8px] w-[25px]" />
                        </span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-label-md text-foreground">**** **** **** 2633</span>
                            <Tag size="sm" color="grey">
                              Default
                            </Tag>
                          </div>
                          <span className="text-paragraph-sm text-muted-foreground">Expires 06/2024</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-paragraph-md text-muted-foreground">Avery Quinn</TableCell>
                    <TableCell className="text-center">
                      <Button variant="grey-outline" size="sm" iconOnly aria-label="Card actions">
                        <IconDotsVertical size={16} className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </section>

            {/* Cancel Subscription */}
            <section className="flex w-full items-center gap-6 rounded-[6px] border border-line bg-white p-6">
              <div className="flex flex-1 flex-col gap-1">
                <h2 className="text-heading-xl text-foreground">Cancel Subscription</h2>
                <p className="text-paragraph-md text-muted-foreground">
                  If you cancel now, your subscription will stay active until {CANCEL_EFFECTIVE_DATE}. Prefer a
                  temporary break? You can choose to pause your subscription instead.
                </p>
              </div>
              <Button variant="grey-outline" size="md" className="shrink-0">
                Cancel Subscription
              </Button>
            </section>
          </div>
        </main>
      </div>

      <ManageLicensesModal
        open={manageLicensesOpen}
        onClose={() => setManageLicensesOpen(false)}
        licensesTotal={aiReviewAssistLicenses}
        members={teamMembers}
        accountHolder={accountHolder}
        initialTab={manageLicensesTab}
        onBuyAdditionalLicenses={onBuyAdditionalLicenses}
        onAssignAccountHolder={() => setAccountHolderAssigned(true)}
        onRemoveAccountHolder={() => setAccountHolderAssigned(false)}
        onAssign={(id) =>
          setTeamMembers((prev) => prev.map((member) => (member.id === id ? { ...member, assigned: true } : member)))
        }
        onRemove={(id) =>
          setTeamMembers((prev) => prev.map((member) => (member.id === id ? { ...member, assigned: false } : member)))
        }
        onApproveRequest={(id) =>
          setTeamMembers((prev) =>
            prev.map((member) => (member.id === id ? { ...member, assigned: true, requested: false } : member))
          )
        }
        onDenyRequest={(id) =>
          setTeamMembers((prev) =>
            prev.map((member) => (member.id === id ? { ...member, requested: false } : member))
          )
        }
        onApproveAll={() =>
          setTeamMembers((prev) => {
            let remaining = aiReviewAssistLicenses - prev.filter((member) => member.assigned).length;
            return prev.map((member) => {
              if (!member.requested || remaining <= 0) return member;
              remaining -= 1;
              return { ...member, assigned: true, requested: false };
            });
          })
        }
      />
    </div>
  );
}
