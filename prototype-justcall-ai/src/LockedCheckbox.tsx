import { Checkbox, type CheckboxProps } from "@/components/Checkbox";
import { LockedControl, type Lock } from "@/components/LockedControl";

/**
 * A row-selection checkbox that follows the license rule for bulk actions.
 * When every bulk verb on a table is locked, selecting leads nowhere — so the
 * checkbox stays in place (the table keeps its shape across licenses) but
 * renders disabled, and the license reason shows on hover / focus / tap.
 *
 * The native input can't carry the tooltip — a disabled input takes no
 * pointer events — so LockedControl wraps a span around it instead.
 */
export function LockedCheckbox({
  lock,
  placement = "right",
  ...props
}: CheckboxProps & {
  lock?: Lock;
  placement?: "top" | "bottom" | "left" | "right";
}) {
  if (!lock) return <Checkbox {...props} />;
  return (
    <LockedControl reason={lock.reason} hint={lock.hint} placement={placement}>
      <span className="flex" tabIndex={0} aria-label={props["aria-label"]}>
        <Checkbox {...props} checked={false} indeterminate={false} disabled tabIndex={-1} />
      </span>
    </LockedControl>
  );
}
