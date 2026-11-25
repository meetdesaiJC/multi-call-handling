import * as React from "react";

/**
 * The production webphone's glyphs. Production draws them from two icon
 * fonts — Material Icons (filled) and Ionicons — so these are those exact
 * shapes, not the DS 2.0 icon set, which is outlined and would read as the
 * new dialer. Sources: @material-design-icons/svg@0.14.13 (Apache-2.0) and
 * ionicons@7.4.0 (MIT). All paint with `currentColor`, so tokens colour them.
 *
 * Prototype-only on purpose: nothing new should be designed with these.
 */

type GlyphProps = { className?: string };

function material(path: string) {
  return function MaterialGlyph({ className }: GlyphProps) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
        <path d={path} />
      </svg>
    );
  };
}

export const WebphoneCall = material(
  "M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"
);
export const WebphoneCallEnd = material(
  "M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"
);
export const WebphoneSwap = material(
  "M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"
);
export const WebphoneForum = material(
  "M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"
);
export const WebphoneBackspace = material(
  "M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z"
);
export const WebphoneHelp = material(
  "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6.99 15c-.7 0-1.26-.56-1.26-1.26 0-.71.56-1.25 1.26-1.25.71 0 1.25.54 1.25 1.25-.01.69-.54 1.26-1.25 1.26zm3.01-7.4c-.76 1.11-1.48 1.46-1.87 2.17-.16.29-.22.48-.22 1.41h-1.82c0-.49-.08-1.29.31-1.98.49-.87 1.42-1.39 1.96-2.16.57-.81.25-2.33-1.37-2.33-1.06 0-1.58.8-1.8 1.48l-1.65-.7C9.01 7.15 10.22 6 11.99 6c1.48 0 2.49.67 3.01 1.52.44.72.7 2.07.02 3.08z"
);
export const WebphoneMic = material(
  "M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"
);
export const WebphonePause = material("M6 19h4V5H6v14zm8-14v14h4V5h-4z");
export const WebphoneDialpad = material(
  "M12 19c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12-8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-6 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
);
export const WebphonePersonAdd = material(
  "M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
);
export const WebphoneVoicemail = material(
  "M18.5 6C15.46 6 13 8.46 13 11.5c0 1.33.47 2.55 1.26 3.5H9.74c.79-.95 1.26-2.17 1.26-3.5C11 8.46 8.54 6 5.5 6S0 8.46 0 11.5 2.46 17 5.5 17h13c3.04 0 5.5-2.46 5.5-5.5S21.54 6 18.5 6zm-13 9C3.57 15 2 13.43 2 11.5S3.57 8 5.5 8 9 9.57 9 11.5 7.43 15 5.5 15zm13 0c-1.93 0-3.5-1.57-3.5-3.5S16.57 8 18.5 8 22 9.57 22 11.5 20.43 15 18.5 15z"
);
/** The yellow notes sheet in the live call's top-right. */
export const WebphoneNotes = material(
  "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
);
export const WebphoneClose = material(
  "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
);
export const WebphoneExpand = material("M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z");
export const WebphoneCaret = material("m7 10 5 5 5-5z");
/** Material `expand_less` — the queue panel's collapse handle. */
export const WebphoneCollapse = material("M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z");
/** Material `person` — a queued caller with no contact photo. */
export const WebphonePerson = material(
  "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
);
/** Material `open_in_new` — open a CRM record in its own app. */
export const WebphoneOpenInNew = material(
  "M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"
);
export const WebphoneStar = material(
  "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
);

/** Contacts tab — Ionicons `book`. */
export function WebphoneBook({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M202.24 74C166.11 56.75 115.61 48.3 48 48a31.36 31.36 0 00-17.92 5.33A32 32 0 0016 79.9V366c0 19.34 13.76 33.93 32 33.93 71.07 0 142.36 6.64 185.06 47a4.11 4.11 0 006.94-3V106.82a15.89 15.89 0 00-5.46-12A143 143 0 00202.24 74zM481.92 53.3A31.33 31.33 0 00464 48c-67.61.3-118.11 8.71-154.24 26a143.31 143.31 0 00-32.31 20.78 15.93 15.93 0 00-5.45 12v337.13a3.93 3.93 0 006.68 2.81c25.67-25.5 70.72-46.82 185.36-46.81a32 32 0 0032-32v-288a32 32 0 00-14.12-26.61z" />
    </svg>
  );
}

/** Settings tab — Ionicons `construct`, the crossed hammer and wrench. */
export function WebphoneConstruct({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M503.58 126.2a16.85 16.85 0 00-27.07-4.55l-51.15 51.15a11.15 11.15 0 01-15.66 0l-22.48-22.48a11.17 11.17 0 010-15.67l50.88-50.89a16.85 16.85 0 00-5.27-27.4c-39.71-17-89.08-7.45-120 23.29-26.81 26.61-34.83 68-22 113.7a11 11 0 01-3.16 11.1L114.77 365.1a56.76 56.76 0 1080.14 80.18L357 272.08a11 11 0 0110.9-3.17c45 12 86 4 112.43-22 15.2-15 25.81-36.17 29.89-59.71 3.83-22.2 1.41-44.44-6.64-61z" />
      <path d="M437.33 378.41c-13.94-11.59-43.72-38.4-74.07-66.22l-66.07 70.61c28.24 30 53.8 57.85 65 70.88l.07.08A30 30 0 00383.72 464h1.1a30.11 30.11 0 0021-8.62l.07-.07 33.43-33.37a29.46 29.46 0 00-2-43.53zM118.54 214.55a20.48 20.48 0 00-3-10.76 2.76 2.76 0 012.62-4.22h.06c.84.09 5.33.74 11.7 4.61 4.73 2.87 18.23 12.08 41.73 35.54a34.23 34.23 0 007.22 22.12l66.23-61.55a33.73 33.73 0 00-21.6-9.2 2.65 2.65 0 01-.21-.26l-.65-.69-24.54-33.84a28.45 28.45 0 01-4-26.11 35.23 35.23 0 0111.78-16.35c5.69-4.41 18.53-9.72 29.44-10.62a52.92 52.92 0 0115.19.94 65.57 65.57 0 017.06 2.13 15.46 15.46 0 002.15.63 16 16 0 0016.38-25.06c-.26-.35-1.32-1.79-2.89-3.73a91.85 91.85 0 00-9.6-10.36c-8.15-7.36-29.27-19.77-57-19.77a123.13 123.13 0 00-46.3 9c-38.37 15.45-63.47 36.58-75.01 47.79l-.09.09A222.14 222.14 0 0063.7 129.5a27 27 0 00-4.7 11.77 7.33 7.33 0 01-7.71 6.17H50.2a20.65 20.65 0 00-14.59 5.9L6.16 182.05l-.32.32a20.89 20.89 0 00-.24 28.72c.19.2.37.39.57.58L53.67 258a21 21 0 0014.65 6 20.65 20.65 0 0014.59-5.9l29.46-28.79a20.51 20.51 0 006.17-14.76z" />
    </svg>
  );
}

/** The live call's caller badge — Ionicons `person-add-outline`. */
export function WebphonePersonAddOutline({ className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      stroke="currentColor"
      strokeWidth={20}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M376 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96z" />
      <path d="M288 304c-87 0-175.3 48-191.64 138.6-2 10.92 4.21 21.4 15.65 21.4H464c11.44 0 17.62-10.48 15.65-21.4C463.3 352 375 304 288 304z" />
      <path d="M88 176v112M144 232H32" />
    </svg>
  );
}
