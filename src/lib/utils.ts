import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge about our custom typography utilities (generated from
// the --text-* design tokens). Without this it treats e.g. `text-label-md`
// as a text-*color* and drops a sibling `text-white`, leaving dark text on
// solid buttons.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "label-xs",
            "label-sm",
            "label-md",
            "label-md-semi",
            "label-md-bold",
            "label-lg",
            "paragraph-sm",
            "paragraph-md",
            "paragraph-lg",
            "heading-lg",
            "heading-xl",
            "heading-xxl",
            "heading-xxxl",
          ],
        },
      ],
    },
  },
});

/**
 * Merge class names conditionally and resolve Tailwind conflicts.
 * e.g. cn("px-2", condition && "px-4") -> "px-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
