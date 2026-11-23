import * as React from "react";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Tag";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Table";
import { IconCircleCheck, IconInfoCircle } from "@/components/Icon";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  IconInvoiceDoc,
  IconOverviewEye,
  IconPricingCard,
  IconUsageBalanceBars,
  type SidenavItem,
} from "@/components/Sidenav";
import {
  ACCOUNT_PLAN,
  BILLING,
  LICENSE_SEATS,
  PLAN_CHARGE_KEYS,
  PLAN_CHARGES,
  planChargeTotal,
  type PlanChargeKey,
} from "./teamMembersData";
import { PlanDetailsModal } from "./PlanDetailsModal";
import { CsmEmail } from "./CsmEmail";

/**
 * Profile › Billing — the account's plan, with Lite and View-only licenses as
 * line items in it, and the billing housekeeping (address, card).
 * Sections and copy follow the ai-review-assist billing screen; the card
 * treatment matches the add-ons prototype's Billing Overview so the two read
 * as one product.
 */

/** The "Your Plan" nav that replaces the product nav while in billing. */
export const BILLING_NAV_ITEMS: SidenavItem[] = [
  { key: "overview", label: "Overview", icon: <IconOverviewEye />, sectionLabel: "Your Plan" },
  { key: "invoices", label: "Invoices", icon: <IconInvoiceDoc /> },
  { key: "pricing", label: "Pricing", icon: <IconPricingCard /> },
  { key: "usage-balance", label: "Usage Balance", icon: <IconUsageBalanceBars /> },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-6 rounded-sm border border-line bg-white p-6">
      {children}
    </section>
  );
}

function CardHeading({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      {/* 16 medium, a step under Figma's 18 semibold: at full weight the five
          stacked titles read louder than the content they label. */}
      <h2 className="flex items-center gap-2 text-label-lg text-foreground">{title}</h2>
      {subtitle ? <p className="text-paragraph-md text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function BillingPage() {
  const full = ACCOUNT_PLAN.fullLicenses;
  const total = PLAN_CHARGE_KEYS.reduce((sum, key) => sum + planChargeTotal(key), 0);
  // The modal remembers its last tab while closed so the exit animation
  // doesn't flash back to the first one.
  const [breakdownOpen, setBreakdownOpen] = React.useState(false);
  const [breakdownTab, setBreakdownTab] = React.useState<PlanChargeKey>("team-members");
  const openBreakdown = (key: PlanChargeKey) => {
    setBreakdownTab(key);
    setBreakdownOpen(true);
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white p-6">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <CardHeading
              title="Plan Details"
              subtitle={`Your subscription renews on ${BILLING.renewsOn}`}
            />
            {/* The whole card is contract-bound, so the tag sits on the card,
                not on a row. Interactive so the CSM's email can be clicked. */}
            <TooltipTrigger
              placement="bottom-right"
              interactive
              content={
                <Tooltip
                  theme="dark"
                  arrow="top-right"
                  padded="comfortable"
                  className="max-w-[320px]"
                >
                  {/* Padding on the body, not the Tooltip: its className
                      styles the shell that holds the arrow, so padding there
                      pushes the bubble away from the tag. */}
                  <span className="block whitespace-normal px-1 py-2">
                    Your account is managed under a custom contract. For any
                    questions or changes related to your plan or billing, please
                    contact your Customer Success Manager, {BILLING.csm.name} at{" "}
                    <CsmEmail tone="dark" />
                    .
                  </span>
                </Tooltip>
              }
            >
              <button
                type="button"
                className="shrink-0 rounded-[4px] outline-none focus-visible:ring-4 focus-visible:ring-brand/24"
              >
                <Tag
                  size="lg"
                  color="pink"
                  infoIcon={<IconInfoCircle size={16} aria-hidden="true" />}
                >
                  Custom Contract
                </Tag>
              </button>
            </TooltipTrigger>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-label-md">Plan name</TableHead>
                <TableHead className="text-label-md">Plan details</TableHead>
                <TableHead className="w-[200px] text-label-md">
                  <span className="inline-flex items-center gap-1.5">
                    Licenses
                    {/* One icon for the whole column. Generic on purpose:
                        the per-type rules live in the contract, and spelling
                        them out here made the tooltip a wall of text. */}
                    <TooltipTrigger
                      placement="bottom"
                      // Interactive so the pointer can reach the CSM's email.
                      interactive
                      content={
                        <Tooltip
                          theme="dark"
                          arrow="top-center"
                          padded="comfortable"
                          className="max-w-[280px]"
                        >
                          <span className="block whitespace-normal px-1 py-2 text-tooltip-dark-fg">
                            Lite and View-only license counts are set in your
                            contract. Contact your CSM at <CsmEmail tone="dark" /> to
                            modify them.
                          </span>
                        </Tooltip>
                      }
                    >
                      <button
                        type="button"
                        aria-label="How license counts work"
                        className="inline-flex rounded-full text-muted-foreground outline-none focus-visible:ring-4 focus-visible:ring-brand/24"
                      >
                        <IconInfoCircle size={16} className="size-4 shrink-0" />
                      </button>
                    </TooltipTrigger>
                  </span>
                </TableHead>
                <TableHead className="w-[146px] text-right text-label-md">Subscription Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent [&>td]:align-top">
                {/* Every cell top-aligned: the line items and license rows run
                    three or four lines deep, so centring would leave the name
                    and total floating beside the second line. */}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-label-lg text-foreground">{ACCOUNT_PLAN.name}</span>
                    <span className="text-paragraph-md text-muted-foreground">Monthly</span>
                  </div>
                </TableCell>
                <TableCell>
                  {/* Team Members is one figure across every license type:
                      Standard, Lite and View-only fold in, and the counts live
                      in the Licenses column. The other charges stay itemised. */}
                  <ul className="list-disc space-y-0.5 pl-[18px] text-label-md text-brand">
                    {PLAN_CHARGE_KEYS.map((key) => (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => openBreakdown(key)}
                          // align-top: a button is inline-block, so by default it
                          // sits on its last line's baseline and the bullet drops
                          // to the second line when a charge wraps.
                          className="rounded-[2px] text-left align-top outline-none hover:underline focus-visible:ring-4 focus-visible:ring-brand/24"
                        >
                          {PLAN_CHARGES[key].label}: {money.format(planChargeTotal(key))}
                        </button>
                      </li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell>
                  {/* Each type reads used / contracted. For Standard the
                      denominator is the contract minimum, not a cap — the
                      tooltip on the header says so. Counts sit right-aligned
                      in tabular figures with a floor on their width, so 2/5
                      and 10/10 end on the same edge and the column scans
                      straight down whatever this account's numbers are. */}
                  <dl className="grid grid-cols-[auto_minmax(5ch,auto)] justify-start gap-x-6 gap-y-1 text-paragraph-md [&_dd]:text-right [&_dd]:tabular-nums">
                    <dt className="text-muted-foreground">Standard</dt>
                    <dd className="text-label-md text-foreground">
                      {full}/{ACCOUNT_PLAN.fullLicenses}
                    </dd>
                    <dt className="text-muted-foreground">Lite</dt>
                    <dd className="text-label-md text-foreground">
                      {LICENSE_SEATS.lite.used}/{LICENSE_SEATS.lite.total}
                    </dd>
                    <dt className="text-muted-foreground">View-only</dt>
                    <dd className="text-label-md text-foreground">
                      {LICENSE_SEATS["view-only"].used}/{LICENSE_SEATS["view-only"].total}
                    </dd>
                  </dl>
                </TableCell>
                <TableCell className="text-right text-label-lg text-foreground">
                  {money.format(total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>

        <Card>
          <div className="flex items-center gap-6">
            <CardHeading
              title={
                <>
                  Update Billing Address
                  <IconCircleCheck size={20} className="shrink-0 text-success" aria-hidden="true" />
                </>
              }
              subtitle={BILLING.address}
            />
            <Button variant="grey-outline" size="md" className="shrink-0">
              Update Address
            </Button>
          </div>
        </Card>

        <Card>
          {/* A custom contract is paid by wire transfer, so there is no card
              on file to list or manage — the card says how payment happens
              instead of offering an Add Card that leads nowhere. */}
          <div className="flex items-center gap-6">
            <CardHeading title="Payment Method" />
            <p className="flex shrink-0 items-center gap-2 text-paragraph-md text-muted-foreground">
              <IconPricingCard className="size-5 shrink-0" />
              Your payments are handled via wire transfer
            </p>
          </div>
        </Card>
      </div>
      <PlanDetailsModal
        open={breakdownOpen}
        tab={breakdownTab}
        onTabChange={setBreakdownTab}
        onClose={() => setBreakdownOpen(false)}
      />
    </main>
  );
}
