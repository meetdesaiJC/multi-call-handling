import type { IntegrationId } from "../actionsData";

import confluenceLogo from "./crm/confluence.svg";
import freshdeskLogo from "./crm/freshdesk.svg";
import hubspotLogo from "./crm/hubspot.svg";
import intercomLogo from "./crm/intercom.svg";
import pipedriveLogo from "./crm/pipedrive.svg";
import zendeskLogo from "./crm/zendesk.svg";
import zohoLogo from "./crm/zoho.svg";

const INTEGRATION_IDS: IntegrationId[] = [
  "hubspot",
  "salesforce",
  "zendesk",
  "pipedrive",
];

function isIntegrationId(id: string): id is IntegrationId {
  return INTEGRATION_IDS.includes(id as IntegrationId);
}

type LogoProps = {
  size?: number;
  className?: string;
};

const CRM_LOGOS: Record<Exclude<IntegrationId, "salesforce">, string> = {
  hubspot: hubspotLogo,
  zendesk: zendeskLogo,
  pipedrive: pipedriveLogo,
};

function SalesforceMark({ size = 16, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={["shrink-0", className].filter(Boolean).join(" ")}
    >
      <path
        d="M6.6813 3.98201C7.15593 3.49032 7.81723 3.17973 8.54645 3.17973C9.51855 3.17973 10.3608 3.72226 10.8128 4.52475C11.2028 4.34959 11.6379 4.25348 12.0956 4.25348C13.8478 4.25348 15.2606 5.68329 15.2606 7.44673C15.2606 9.21016 13.842 10.6396 12.0956 10.6396C11.8812 10.6396 11.6719 10.6169 11.4741 10.5774C11.0785 11.2838 10.3211 11.7644 9.45043 11.7644C9.089 11.7644 8.74405 11.6796 8.43882 11.5326C8.03767 12.4765 7.09933 13.1431 6.00848 13.1431C4.87254 13.1431 3.90045 12.4255 3.5273 11.4135C3.36178 11.4474 3.19324 11.4645 3.02427 11.4643C1.6679 11.4643 0.571289 10.3566 0.571289 8.98318C0.571289 8.06969 1.063 7.26502 1.79778 6.83548C1.64526 6.49074 1.56046 6.10667 1.56046 5.69957C1.5553 4.13472 2.83819 2.85743 4.40904 2.85743C4.84888 2.85669 5.28292 2.95784 5.67711 3.15295C6.07131 3.34807 6.41496 3.63184 6.6811 3.98201"
        fill="#00A1E0"
      />
    </svg>
  );
}

/**
 * Brand marks for connected CRMs, taken from the design system's CRM Logos
 * set. Drawn at 16px, so tables and pickers get the real mark rather than a
 * redrawn approximation.
 */
export function IntegrationLogo({
  id,
  size = 16,
  className,
}: LogoProps & { id: IntegrationId }) {
  if (id === "salesforce") {
    return <SalesforceMark size={size} className={className} />;
  }

  return (
    <img
      src={CRM_LOGOS[id]}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={["shrink-0", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
    />
  );
}

function NotionMark({ size = 16, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={["shrink-0", className].filter(Boolean).join(" ")}
    >
      <rect width="16" height="16" rx="2.5" fill="#1A1A1A" />
      <path
        d="M5.1 4.2h2.05l3.75 5.55V4.2H12.9v7.6h-2.02L7.1 6.22V11.8H5.1V4.2Z"
        fill="#fff"
      />
    </svg>
  );
}

function GoogleDriveMark({ size = 16, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={["shrink-0", className].filter(Boolean).join(" ")}
    >
      <path d="M6.15 2.4h3.7L13.7 10H10Z" fill="#FFBA00" />
      <path d="M2.3 13.2 4.15 10h9.55l-1.85 3.2H2.3Z" fill="#00AC47" />
      <path d="M6.15 2.4 2.3 9.2 4.15 12.4 8 5.6 6.15 2.4Z" fill="#4285F4" />
      <path d="M8 5.6 4.15 12.4h3.7L11.7 5.6H8Z" fill="#2684FC" />
    </svg>
  );
}

function SharePointMark({ size = 16, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={["shrink-0", className].filter(Boolean).join(" ")}
    >
      <path
        d="M8.4 2.3c2.15 0 3.9 1.25 3.9 3.55v6.15c0 .55-.48.95-1.02.88l-2.55-.4V6.05c0-1.2-.85-1.95-2.15-1.95H4.9L8.4 2.3Z"
        fill="#4B4E9C"
      />
      <path
        d="M3.1 5.15h5.15c1.45 0 2.5.9 2.5 2.25v6.05c0 .55-.48.95-1.02.88l-2.85-.45c-2-.3-3.78-1.6-3.78-3.65V5.15Z"
        fill="#1A9BA8"
      />
    </svg>
  );
}

const SOURCE_LOGOS: Record<string, string> = {
  zoho: zohoLogo,
  intercom: intercomLogo,
  freshdesk: freshdeskLogo,
  confluence: confluenceLogo,
};

function SourceMark({
  src,
  size,
  className,
}: LogoProps & { src: string }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={["shrink-0", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
    />
  );
}

/** Brand mark for a knowledge/source provider. Falls back to the initial. */
export function SourceLogo({
  provider,
  label,
  size = 16,
  className,
}: LogoProps & { provider: string; label: string }) {
  if (provider === "notion") {
    return <NotionMark size={size} className={className} />;
  }
  if (provider === "google-drive") {
    return <GoogleDriveMark size={size} className={className} />;
  }
  if (provider === "sharepoint") {
    return <SharePointMark size={size} className={className} />;
  }
  if (isIntegrationId(provider)) {
    return <IntegrationLogo id={provider} size={size} className={className} />;
  }
  const src = SOURCE_LOGOS[provider];
  if (src) {
    return <SourceMark src={src} size={size} className={className} />;
  }
  return (
    <span aria-hidden="true" className="text-label-sm text-foreground">
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function IntegrationName({
  id,
  name,
  size = 16,
  className,
}: {
  id: IntegrationId;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={["inline-flex min-w-0 items-center gap-2", className].filter(Boolean).join(" ")}>
      <IntegrationLogo id={id} size={size} />
      <span className="truncate text-paragraph-md text-foreground">{name}</span>
    </span>
  );
}
