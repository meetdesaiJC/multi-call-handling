import * as React from "react";
import { Button } from "@/components/Button";
import { Counter } from "@/components/Counter";
import { Radio } from "@/components/Radio";
import { IconClose, IconChevronDown, IconCircleCheck, IconCheck } from "@/components/Icon";
import { IconTranscriptionAi } from "./icons/AiInsightsIcons";
import visaLogo from "./illustrations/visa-logo.svg";

/**
 * Checkout — select licenses — Figma "Flow 3 / Checkout — select licenses"
 * (node 40002476:46084). Full-page takeover reached from the AI Insights
 * "Get AI Review Assist" empty state.
 *
 * The product icon reuses `IconTranscriptionAi` (already built for the AI
 * Insights empty state — same glyph, Figma calls both instances
 * "Transcription Ai"). The gradient avatar backdrop is a one-off tint with
 * no matching token, same precedent as `GlobalHeader`'s "Live Call Support"
 * pill background.
 *
 * Figma's "Cal Sans" display face for the "Checkout" title isn't part of
 * this design system yet, so the title renders in `text-heading-xxxl`
 * (same 24/32 size/line-height) on the system's Inter stack instead of
 * pulling in a one-off font.
 *
 * The Monthly/Yearly billing-cycle control is a live toggle, defaulting to
 * Monthly. Switching it recomputes the charge summary between a monthly
 * and yearly total — the per-license "$9 per license per month" rate is
 * the shared basis for both.
 * "Amount due today" is prorated proportionally to the design's own
 * $2,368 / $2,700 ratio as the license count changes; the real proration
 * math depends on the account's renewal date, which isn't modeled here.
 */

const INCLUDED_FEATURES_LEFT = [
  "Transcription search",
  "Smart chapters",
  "Questions and action items",
  "Call topics and tags",
  "Topic analysis",
];

const INCLUDED_FEATURES_RIGHT = [
  "Snippet sharing",
  "CRM call logging",
  "AI Review Assist APIs",
  "SMS summary",
  "Ask AI",
];

const PRICE_PER_LICENSE_PER_MONTH = 9;
const PRORATION_RATIO = 2368 / 2700;
const YEARLY_RENEWAL_DATE = "Jun 2, 2027";
const MONTHLY_RENEWAL_DATE = "Sep 2, 2026";

// "Amount due today" breakdown — proration is anchored to a fixed "today"
// (Aug 11, 2026) with each cycle's day-count run out to the day before its
// renewal date above. The subtotal/tax split scales the design's own $962 /
// $1,020 example ratio against the live total; it isn't a real tax calc.
const PRORATION_TODAY = "Aug 11, 2026";
const SALES_TAX_RATE_LABEL = "8.875%";
const SUBTOTAL_RATIO = 962 / 1020;
const PRORATION_BY_CYCLE = {
  monthly: { end: "Sep 1, 2026", days: 21, totalDays: 31 },
  yearly: { end: "Jun 1, 2027", days: 294, totalDays: 365 },
} as const;

const AMOUNT_DUE_TRANSITION_EASING = "cubic-bezier(0.2, 0, 0, 1)";
const AMOUNT_DUE_EXPAND_DURATION = "200ms";
const AMOUNT_DUE_COLLAPSE_DURATION = "165ms";

const AI_AVATAR_BG =
  "linear-gradient(94deg, rgba(0,76,230,0.15) 46%, rgba(172,112,255,0.15) 145%), linear-gradient(90deg, var(--color-white) 0%, var(--color-white) 100%)";

function FeatureRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full items-center gap-2 py-1.5">
      <IconCheck size={16} className="size-4 shrink-0 text-success" />
      <span className="text-paragraph-md text-foreground">{children}</span>
    </div>
  );
}

export interface CheckoutSelectLicensesProps {
  onClose: () => void;
  /** Called once the "Confirm & Pay" loading animation finishes. */
  onConfirm: (licenses: number) => void;
  /** True when entering checkout to buy more licenses of an add-on already owned. */
  alreadyOwnsAddon?: boolean;
}

// Purely cosmetic delay so "Confirm & Pay" reads as a real payment being
// processed before handing off to the Billing Overview page.
const PAYMENT_PROCESSING_MS = 1100;

export function CheckoutSelectLicenses({
  onClose,
  onConfirm,
  alreadyOwnsAddon = false,
}: CheckoutSelectLicensesProps) {
  const [licenses, setLicenses] = React.useState(1);
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("monthly");
  const [isAmountDueExpanded, setIsAmountDueExpanded] = React.useState(true);
  const [isPaying, setIsPaying] = React.useState(false);

  const handleConfirmAndPay = () => {
    setIsPaying(true);
    setTimeout(() => onConfirm(licenses), PAYMENT_PROCESSING_MS);
  };
  const amountDueTransitionDuration = isAmountDueExpanded
    ? AMOUNT_DUE_EXPAND_DURATION
    : AMOUNT_DUE_COLLAPSE_DURATION;

  const monthlyTotal = licenses * PRICE_PER_LICENSE_PER_MONTH;
  const yearlyTotal = monthlyTotal * 12;
  const cycleTotal = billingCycle === "monthly" ? monthlyTotal : yearlyTotal;
  const amountDueToday = Math.round(cycleTotal * PRORATION_RATIO);
  const proration = PRORATION_BY_CYCLE[billingCycle];
  const subtotal = Math.round(amountDueToday * SUBTOTAL_RATIO);
  const salesTax = amountDueToday - subtotal;

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-white">
      <div className="flex h-16 shrink-0 items-center gap-4 border-b border-line pl-36 pr-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex size-6 items-center justify-center rounded-[4px] text-foreground outline-none hover:text-muted-foreground focus-visible:ring-4 focus-visible:ring-brand/16"
        >
          <IconClose size={24} className="size-6" />
        </button>
        <h1 className="text-heading-xxxl text-foreground">Checkout</h1>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex w-full flex-col gap-6 px-36 py-11">
            <div className="flex w-full flex-col rounded-[8px] border border-line bg-white">
              <div className="flex flex-col gap-6 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div
                      className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full"
                      style={{ backgroundImage: AI_AVATAR_BG }}
                    >
                      <IconTranscriptionAi className="size-6" />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-heading-lg text-foreground">AI Review Assist</p>
                      <p className="text-paragraph-md text-muted-foreground">
                        Let AI handle your call notes, so you can focus on what&rsquo;s next.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    <p className="text-heading-lg text-foreground">${cycleTotal.toLocaleString()}</p>
                    <p className="text-paragraph-sm text-muted-foreground">
                      per {billingCycle === "monthly" ? "month" : "year"}
                    </p>
                  </div>
                </div>

                <div className="h-px w-full bg-line" />

                <div className="flex w-full items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-label-md text-foreground">
                      {alreadyOwnsAddon ? "Additional licenses to buy" : "Number of licenses"}
                    </p>
                    <p className="text-paragraph-md text-muted-foreground">
                      ${PRICE_PER_LICENSE_PER_MONTH} per license per month
                    </p>
                  </div>
                  <Counter value={licenses} onChange={setLicenses} min={1} />
                </div>

                <div className="h-px w-full bg-line" />

                <div className="flex w-full flex-col gap-2">
                  <p className="text-paragraph-md text-muted-foreground">What&rsquo;s included</p>
                  <div className="flex w-full items-start gap-6">
                    <div className="flex flex-1 flex-col">
                      {INCLUDED_FEATURES_LEFT.map((feature) => (
                        <FeatureRow key={feature}>{feature}</FeatureRow>
                      ))}
                    </div>
                    <div className="flex flex-1 flex-col">
                      {INCLUDED_FEATURES_RIGHT.map((feature) => (
                        <FeatureRow key={feature}>{feature}</FeatureRow>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3">
              <p className="text-label-md-semi text-foreground">Payment Method</p>
              <div className="flex w-full items-center gap-4 rounded-[6px] border border-line p-6">
                <div className="flex shrink-0 items-center justify-center rounded-[6px] bg-secondary-bg p-2.5">
                  <span className="flex h-6 w-[35px] items-center justify-center rounded-[2px] border border-line bg-white">
                    <img src={visaLogo} alt="Visa" className="h-[8px] w-[25px]" />
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <p className="text-label-md text-foreground">Paying with &bull;&bull;&bull;&bull; 7149</p>
                    <IconCircleCheck size={20} className="size-5 text-success" />
                  </div>
                  <p className="text-paragraph-sm text-muted-foreground">Expires 07-2035</p>
                </div>
                <Button variant="grey-outline" size="xs" className="shrink-0">
                  Change Card
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-[480px] shrink-0 flex-col overflow-hidden border-l border-line bg-secondary-bg">
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="flex flex-col gap-6">
              <h2 className="text-heading-xl text-foreground">Charge Summary</h2>

              <div className="flex items-center gap-8 border-b border-line pb-3">
                <Radio
                  label="Monthly"
                  name="billing-cycle"
                  size="sm"
                  checked={billingCycle === "monthly"}
                  onCheckedChange={(checked) => checked && setBillingCycle("monthly")}
                />
                <Radio
                  label="Yearly"
                  name="billing-cycle"
                  size="sm"
                  checked={billingCycle === "yearly"}
                  onCheckedChange={(checked) => checked && setBillingCycle("yearly")}
                />
              </div>

              <div className="flex flex-col rounded-[8px] bg-white p-4">
                <button
                  type="button"
                  onClick={() => setIsAmountDueExpanded((expanded) => !expanded)}
                  aria-expanded={isAmountDueExpanded}
                  className="flex items-start justify-between gap-4 text-left outline-none"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <p className="text-heading-lg text-brand">Amount due today</p>
                      <IconChevronDown
                        size={24}
                        className="size-6 shrink-0 text-brand transition-transform"
                        style={{
                          transform: isAmountDueExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          transitionDuration: amountDueTransitionDuration,
                          transitionTimingFunction: AMOUNT_DUE_TRANSITION_EASING,
                        }}
                      />
                    </div>
                    <p className="text-paragraph-sm text-muted-foreground">Prorated for the current year</p>
                  </div>
                  <p className="shrink-0 text-heading-xl text-brand">${amountDueToday.toLocaleString()}</p>
                </button>

                <div
                  className="grid overflow-hidden"
                  style={{
                    gridTemplateRows: isAmountDueExpanded ? "1fr" : "0fr",
                    transitionProperty: "grid-template-rows",
                    transitionDuration: amountDueTransitionDuration,
                    transitionTimingFunction: AMOUNT_DUE_TRANSITION_EASING,
                  }}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div
                      className="flex flex-col gap-4 pt-4"
                      style={{
                        opacity: isAmountDueExpanded ? 1 : 0,
                        transitionProperty: "opacity",
                        transitionDuration: amountDueTransitionDuration,
                        transitionTimingFunction: AMOUNT_DUE_TRANSITION_EASING,
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-label-sm text-foreground">
                            AI Review Assist ({PRORATION_TODAY} – {proration.end})
                          </p>
                          <p className="text-paragraph-sm text-muted-foreground">
                            ${PRICE_PER_LICENSE_PER_MONTH} × {licenses} license{licenses === 1 ? "" : "s"} ×{" "}
                            {proration.days}/{proration.totalDays} days
                          </p>
                        </div>
                        <p className="shrink-0 text-label-sm text-foreground">${subtotal.toLocaleString()}</p>
                      </div>

                      <div className="h-px w-full bg-line" />

                      <div className="flex items-center justify-between gap-4">
                        <p className="text-label-sm text-muted-foreground">Subtotal</p>
                        <p className="text-label-sm text-foreground">${subtotal.toLocaleString()}</p>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <p className="text-label-sm text-foreground">Sales tax ({SALES_TAX_RATE_LABEL})</p>
                        <p className="text-label-sm text-foreground">${salesTax.toLocaleString()}</p>
                      </div>

                      <div className="h-px w-full border-t border-dashed border-line" />

                      <div className="flex items-center justify-between gap-4">
                        <p className="text-label-sm text-foreground">Total Amount</p>
                        <p className="text-label-sm text-foreground">${amountDueToday.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 h-px w-full bg-line" />

                <div className="mt-4 flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <p className="text-heading-lg text-foreground">
                        Then {billingCycle === "monthly" ? "monthly" : "yearly"}
                      </p>
                      <IconChevronDown size={24} className="size-6 text-foreground" />
                    </div>
                    <p className="text-paragraph-sm text-muted-foreground">
                      Renews every {billingCycle === "monthly" ? "month" : "year"} starting{" "}
                      {billingCycle === "monthly" ? MONTHLY_RENEWAL_DATE : YEARLY_RENEWAL_DATE}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-heading-xl text-foreground">${cycleTotal.toLocaleString()}</p>
                    <p className="text-paragraph-sm text-muted-foreground">plus applicable taxes</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-1 rounded-[8px] bg-muted p-4 text-paragraph-sm text-muted-foreground">
                <span>&bull;</span>
                <span>
                  This summary includes charges for the additional AI Review Assist licenses in this
                  purchase. Your existing license charges are not included.
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 p-6">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={isPaying}
              onClick={handleConfirmAndPay}
            >
              Confirm &amp; Pay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
