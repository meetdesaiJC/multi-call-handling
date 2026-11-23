import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "../..");
export const MANIFEST_PATH = path.join(__dirname, "icons.manifest.json");
export const SVG_DIR = path.join(ROOT, "src/icons/svg");
export const GENERATED_ICONS_PATH = path.join(
  ROOT,
  "src/components/Icon/icons.generated.tsx"
);
export const ICON_LIBRARY_DIR = path.join(ROOT, "icon-library");
export const FIGMA_FILE_KEY = "nkEfgf0iNgksHjD4irjIaJ";
export const ICONS_PAGE_ID = "3464:126133";
export const SIZES = [16, 20, 24];

/** Decode common XML entities in Figma metadata names. */
export function decodeXmlName(name) {
  return name
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/** Stable slug for filesystem + React component names. */
export function slugifyIconName(name) {
  return decodeXmlName(name)
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** PascalCase component name: IconSearch, IconCancelCloseX, etc. */
export function toIconComponentName(name) {
  const slug = slugifyIconName(name);
  const pascal = slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `Icon${pascal}`;
}

export function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(
      `Missing ${MANIFEST_PATH}. Run: node scripts/icons/catalog.mjs`
    );
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function getFigmaToken() {
  return (
    process.env.FIGMA_ACCESS_TOKEN ||
    process.env.FIGMA_TOKEN ||
    process.env.FIGMA_PERSONAL_ACCESS_TOKEN ||
    ""
  );
}

/**
 * Resolve an icon entry from the manifest by slug, Figma name, or component name.
 */
export function resolveManifestEntry(manifest, query) {
  const q = query.trim();
  const slug = slugifyIconName(q);
  if (manifest.icons[slug]) return manifest.icons[slug];

  const byName = Object.values(manifest.icons).find(
    (icon) =>
      icon.name.toLowerCase() === q.toLowerCase() ||
      slugifyIconName(icon.name) === slug ||
      toIconComponentName(icon.name) === q ||
      toIconComponentName(icon.name) === `Icon${q.replace(/^Icon/, "")}`
  );
  return byName ?? null;
}

/** Map of known React Icon* names → Figma icon names for the first sync. */
export const USED_ICON_ALIASES = {
  IconAccountDetails: "Account details",
  IconAIVoiceAgent: "AI Voice agent",
  IconAnalytics: "Analytics",
  IconAppointmentScheduler: "Appointment Scheduler",
  IconBusinessProfile: "Bussiness profile",
  IconCallDisposition: "Call disposition",
  IconCallLogs: "Call logs",
  IconCallOnHold: "call on hold",
  IconChangePassword: "Change password",
  IconCheck: "check",
  IconChevronDown: "chevron-down",
  IconChevronLeft: "chevron-left",
  IconChevronRight: "chevron-right",
  IconChevronUp: "chevron-up",
  IconCircle: "circle",
  IconCircleDashed: "circle-dashed",
  IconContacts: "Contacts",
  IconCreateBot: "Craete bot",
  IconCreateAction: "Create action",
  IconDashboard: "Dashboard",
  IconDevelopers: "Developers",
  IconDropDown: "Drop down",
  IconFax: "Fax",
  IconFile: "file",
  IconGoBack: "Go back",
  IconIntegrations: "Integrations",
  IconIVR: "IVR",
  IconJCMenu: "JC Menu",
  IconManageReports: "Manage reports",
  IconMarketPlace: "Market place",
  IconMarketplace: "Marketplace",
  IconMoments: "Moments",
  IconMore: "More",
  IconOngoing: "Ongoing",
  IconOtherApps: "Other apps",
  IconPhoneNumber: "Phone number",
  IconPhoneNumbers: "Phone numbers",
  IconPopularIntegrations: "Popular integrations",
  IconPostCallSurvey: "Post call survey",
  IconQueue: "Queue",
  IconRinging: "Ringing",
  IconSalesDialer: "Sales dialer",
  IconSalesDialer1: "Sales dialer-1",
  IconScheduleCalls: "Schedule calls",
  IconScheduler: "Scheduler",
  IconSearch: "Search",
  IconSidebar: "Sidebar",
  IconSMSAndMMS: "SMS & MMS",
  IconSparkles: "sparkles",
  IconTeamManagement: "Team management",
  IconUnavailabilityReason: "Unavailability reason",
  IconVoice: "Voice",
  IconVoicemailDrop: "Voicemail drop",
  IconVoicemailMessage: "Voicemail message",
  IconWebToDevice: "Web to device",
  IconWorkingHours: "Working hours",
  IconWrapUpTimeSetting: "Wrap up time setting",
  IconAgentUnavailability: "Agent unavailability",
  // Status / chrome
  IconAlertTriangleFilled: "alert-triangle-filled",
  IconInfoCircleFilled: "info-circle-filled",
  IconCircleXFilled: "circle-x-filled",
  IconCircleCheckFilled: "circle-check-filled",
  IconClose: "Cancel | Close | 'X'",
};

/**
 * Frame rects inside a 100×24 strip export.
 * Matches Figma clipPaths: size=16 at (0,4), size=24 at (36,0), size=20 at (80,2).
 */
export const STRIP_FRAMES = {
  16: { x: 0, y: 4, size: 16 },
  24: { x: 36, y: 0, size: 24 },
  20: { x: 80, y: 2, size: 20 },
};
