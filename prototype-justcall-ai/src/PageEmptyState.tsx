import { Button } from "@/components/Button";

/**
 * Height reserved for the page header above the block. The header itself is
 * one or two lines of description tall depending on the page, and the
 * Knowledge Base has no in-page header at all — measuring from the top of the
 * page instead of from the bottom of the header is what keeps the block in the
 * same place on every tab.
 */
const HEADER_ALLOWANCE = 64;

/**
 * The nothing-here state every top-level list opens on: a 420×280
 * illustration, a one-line title, two lines of body copy, and the page's
 * primary action. One component so the rhythm — 24px to the copy, 8px between
 * the two lines of it, 24px to the button — is written once and cannot drift
 * per page.
 *
 * It centres on the page rather than on the space under the header, so
 * switching tabs never moves it. Callers render it inside their `relative`
 * <main>, alongside (not instead of) the page header.
 */
export function PageEmptyState({
  illustrationSrc,
  title,
  description,
  actionLabel,
  onAction,
}: {
  illustrationSrc: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <div
      className="absolute inset-0 flex overflow-auto px-6 pb-10"
      style={{ paddingTop: HEADER_ALLOWANCE }}
    >
      <div className="m-auto flex flex-col items-center gap-6">
        <img
          src={illustrationSrc}
          alt=""
          width={420}
          height={280}
          className="h-[280px] w-[420px] max-w-full shrink-0 object-contain"
        />
        <div className="flex w-full max-w-[444px] flex-col gap-2 text-center">
          <p className="text-[16px] leading-6 font-semibold text-foreground">
            {title}
          </p>
          <p className="text-[14px] leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <Button size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
