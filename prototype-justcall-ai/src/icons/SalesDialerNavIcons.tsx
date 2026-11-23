import * as React from "react";

/**
 * Sales Dialer nav glyphs the shared nav set doesn't have: Get Started,
 * Campaigns and Salesfloor. Drawn on the same 20px / 1.2 stroke grid as the
 * other Sidenav marks, with `currentColor` so active and inactive text colour
 * carries through.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

const STROKE = {
  stroke: "currentColor",
  strokeWidth: 1.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconSdGetStarted(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3.333 10.833a5 5 0 0 1 3.334 3.334 5.833 5.833 0 0 0 5-5 5.833 5.833 0 0 0 5-5.834 5 5 0 0 0-5.834 5 5.833 5.833 0 0 0-5 5"
        {...STROKE}
      />
      <path d="M5.833 11.667a3.333 3.333 0 0 0-2.5 5 3.333 3.333 0 0 0 5-2.5" {...STROKE} />
      <path d="M12.083 7.917a.417.417 0 1 0 .834 0 .417.417 0 0 0-.834 0Z" {...STROKE} />
    </svg>
  );
}

/** Two stacked cards — a campaign is a list worked through in order. */
export function IconSdCampaigns(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6.667 8.333a1.667 1.667 0 0 1 1.666-1.666h6.667a1.667 1.667 0 0 1 1.667 1.666V15a1.667 1.667 0 0 1-1.667 1.667H8.333A1.667 1.667 0 0 1 6.667 15V8.333Z"
        {...STROKE}
      />
      <path
        d="M13.333 6.667V5A1.667 1.667 0 0 0 11.667 3.333H5A1.667 1.667 0 0 0 3.333 5v6.667A1.667 1.667 0 0 0 5 13.333h1.667"
        {...STROKE}
      />
    </svg>
  );
}

/** A radar sweep — Salesfloor watches every live dial at once. */
export function IconSdSalesfloor(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="M10 10m-1.667 0a1.667 1.667 0 1 0 3.334 0 1.667 1.667 0 1 0-3.334 0" {...STROKE} />
      <path d="M10 10m-4.167 0a4.167 4.167 0 1 0 8.334 0 4.167 4.167 0 1 0-8.334 0" {...STROKE} strokeDasharray="1.5 2" />
      <path d="M10 2.5V3.75M10 16.25V17.5M2.5 10H3.75M16.25 10H17.5M4.7 4.7l.884.884M14.416 14.416l.884.884M4.7 15.3l.884-.884M14.416 5.584l.884-.884" {...STROKE} />
    </svg>
  );
}
