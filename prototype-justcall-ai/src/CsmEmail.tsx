import { cn } from "@/lib/utils";
import { BILLING } from "./teamMembersData";

/**
 * The CSM's email as a mailto link. Every "contact your CSM" in the
 * prototype ends in this, so the admin is always handed the address rather
 * than told to go find it — the same promise the Custom Contract tooltip
 * makes. `tone` follows the surface: the tooltip's link blue on dark, brand
 * blue on light.
 */
export function CsmEmail({ tone }: { tone: "dark" | "light" }) {
  return (
    <a
      href={`mailto:${BILLING.csm.email}`}
      className={cn(
        "hover:underline",
        tone === "dark" ? "text-tooltip-dark-link" : "text-brand"
      )}
    >
      {BILLING.csm.email}
    </a>
  );
}
