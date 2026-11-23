import { Avatar, initialsFromName } from "@/components/Avatar";
import { IconClose } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { SegmentedPanel, SegmentedTabs } from "@/components/SegmentedTabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Table";
import { Tag } from "@/components/Tag";
import dialerFavicon from "./assets/dialer-favicon.svg";
import {
  PLAN_CHARGE_KEYS,
  PLAN_CHARGES,
  type PlanChargeKey,
  type PlanChargeRow,
} from "./teamMembersData";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const TAB_ITEMS = PLAN_CHARGE_KEYS.map((key) => ({ key, label: PLAN_CHARGES[key].label }));

/**
 * Billing › Plan details breakdown — Figma "Cancellation - Billing Overview
 * Apex", node 40003082:109273. Each line item on the Plan Details card opens
 * this on its own tab, so the admin lands on the charge they asked about and
 * can still step sideways to the others.
 *
 * The header is composed here rather than through Modal's `title`: Modal's
 * header is 16/14, and this design is 20/14 with a 24px dark close.
 *
 * Amounts are per month, not the mockup's per year: the plan bills monthly
 * and the line items on the card are monthly, so a yearly figure here would
 * read as a different charge.
 */
export function PlanDetailsModal({
  open,
  tab,
  onTabChange,
  onClose,
}: {
  open: boolean;
  tab: PlanChargeKey;
  onTabChange: (tab: PlanChargeKey) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      showCloseButton={false}
      className="border border-line"
      bodyClassName="p-0 text-foreground"
    >
      <div className="flex flex-col gap-1 px-6 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-heading-xxl text-foreground">Plan details</h2>
            <p className="text-paragraph-md text-muted-foreground">
              Here’s a breakdown of charges for your current plan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-[4px] text-foreground outline-none transition-colors hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={24} />
          </button>
        </div>
      </div>

      <div className="flex flex-col pt-6 pb-2">
        <div className="px-6">
          <SegmentedTabs
            variant="outlined"
            items={TAB_ITEMS}
            value={tab}
            onValueChange={(key) => onTabChange(key as PlanChargeKey)}
          />
        </div>
        {/* Fixed to the scrolling table's height, so switching tabs never
            resizes the modal under the cursor; short tables leave space. */}
        <div className="px-6 py-4">
          <SegmentedPanel activeKey={tab} className="h-[330px]">
            {(key) => <ChargeTable chargeKey={key as PlanChargeKey} />}
          </SegmentedPanel>
        </div>
      </div>
    </Modal>
  );
}

function ChargeTable({ chargeKey }: { chargeKey: PlanChargeKey }) {
  const charge = PLAN_CHARGES[chargeKey];
  const hasCapabilities = charge.rows.some((row) => row.capabilities);
  const hasLicense = charge.rows.some((row) => row.license);
  return (
    // One outline around the table instead of a rule under every row: the
    // rows are a single list, and the frame keeps it from bleeding into the
    // modal. Same 8px radius as the tab track above, so the two read as one
    // stack. The list scrolls under a pinned header on the long members tab.
    <div className="max-h-[330px] overflow-y-auto rounded-md border border-line">
      <Table>
        <TableHeader className="sticky top-0 z-10">
          {/* 43px + the row's 1px rule = Figma's 44px header cell. */}
          <TableRow>
            <TableHead className="h-[43px] py-0 text-label-md">{charge.column}</TableHead>
            {hasLicense ? (
              <TableHead className="h-[43px] py-0 w-[210px] text-label-md">License type</TableHead>
            ) : null}
            {hasCapabilities ? (
              <TableHead className="h-[43px] py-0 w-[210px] text-label-md">Capabilities</TableHead>
            ) : null}
            <TableHead className="h-[43px] py-0 w-[160px] text-right text-label-md">Amount per month</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr]:border-0">
          {charge.rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-transparent">
              <TableCell className="h-14">
                <ChargeName row={row} chargeKey={chargeKey} />
              </TableCell>
              {hasLicense ? (
                <TableCell className="h-14">
                  {row.license ? (
                    <Tag size="sm" color="grey">
                      {row.license}
                    </Tag>
                  ) : null}
                </TableCell>
              ) : null}
              {hasCapabilities ? (
                <TableCell className="h-14">
                  <span className="flex items-center gap-1">
                    {row.capabilities?.map((capability) => (
                      <Tag key={capability} size="sm" color="indigo">
                        {capability}
                      </Tag>
                    ))}
                  </span>
                </TableCell>
              ) : null}
              <TableCell className="h-14 text-right text-paragraph-md text-muted-foreground tabular-nums">
                {money.format(row.monthly)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ChargeName({ row, chargeKey }: { row: PlanChargeRow; chargeKey: PlanChargeKey }) {
  const isNumber = chargeKey === "phone-numbers";
  const text = (
    <div className="flex min-w-0 flex-col">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-label-md text-foreground">{row.name}</span>
        {isNumber ? (
          <img src={dialerFavicon} alt="" width={16} height={16} className="size-4 shrink-0" />
        ) : null}
      </span>
      {row.detail ? (
        <span className="truncate text-paragraph-sm text-muted-foreground">{row.detail}</span>
      ) : null}
    </div>
  );
  if (chargeKey !== "team-members") return text;
  // Same indigo initials as the Team Members page, at 32px to sit inside the
  // 56px row, so a person reads as the same person on both screens.
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="md" color="indigo" initials={initialsFromName(row.name)} />
      {text}
    </div>
  );
}
