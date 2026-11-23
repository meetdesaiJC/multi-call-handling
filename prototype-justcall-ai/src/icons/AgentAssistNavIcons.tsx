import type { SVGProps } from "react";

/**
 * Agent Assist icons — traced from `icon-library/Agent Assist`
 * ("KB icon", "brand-speedtest", "Actions Icon", "hand-stop"). Exported at 16px
 * with the stroke switched to `currentColor` so one icon covers both the active
 * and resting nav states — and, for Live Assist, both the white call bar and
 * the dark-on-white panel header.
 *
 * Scripts and Response Cards were tabs before they became nav items, so they
 * had no glyph. They borrow the 20-unit JustCall AI grid (`list-check` for
 * Scripts, a message bubble for Response Cards) drawn at 1.2 stroke, which
 * lands on the same optical weight as the 16-unit icons at 1.
 */

type NavIconProps = SVGProps<SVGSVGElement>;

function NavIcon({
  children,
  viewBox = "0 0 16 16",
  ...props
}: NavIconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconAaKnowledge(props: NavIconProps) {
  return (
    <NavIcon {...props}>
      <path
        d="M8 3.99916C8.91212 3.47255 9.94678 3.19531 11 3.19531C12.0532 3.19531 13.0879 3.47255 14 3.99916V12.6658C13.0879 12.1392 12.0532 11.862 11 11.862C9.94678 11.862 8.91212 12.1392 8 12.6658C7.08788 12.1392 6.05322 11.862 5 11.862C3.94678 11.862 2.91212 12.1392 2 12.6658V3.99916C2.91212 3.47255 3.94678 3.19531 5 3.19531C6.05322 3.19531 7.08788 3.47255 8 3.99916ZM8 12.6658V3.99916"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavIcon>
  );
}

export function IconAaScripts(props: NavIconProps) {
  return (
    <NavIcon viewBox="0 0 20 20" {...props}>
      <path
        d="M2.91602 4.58333L4.16602 5.83333L6.24935 3.75M2.91602 9.58333L4.16602 10.8333L6.24935 8.75M2.91602 14.5833L4.16602 15.8333L6.24935 13.75M9.16602 5H16.666M9.16602 10H16.666M9.16602 15H16.666"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavIcon>
  );
}

export function IconAaResponseCards(props: NavIconProps) {
  return (
    <NavIcon viewBox="0 0 20 20" {...props}>
      <path
        d="M17.5 12.5C17.5 12.942 17.3244 13.3659 17.0118 13.6785C16.6993 13.9911 16.2754 14.1667 15.8333 14.1667H5.83333L2.5 17.5V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H15.8333C16.2754 2.5 16.6993 2.67559 17.0118 2.98816C17.3244 3.30072 17.5 3.72464 17.5 4.16667V12.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.66602 6.66797H13.3327M6.66602 10.0013H10.8327"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavIcon>
  );
}

/**
 * Behavioral Coaching — the speedtest dial (`brand-speedtest`). The headset this
 * used to be is the glyph the JustCall AI nav already spends on Agent Assist
 * itself, so at a glance a parent and one of its children read as the same
 * thing. The dial is also the truer picture: coaching watches how a call is
 * being delivered — pace, talk ratio, interruptions — which is what the panel's
 * own pace cue already draws with this icon.
 */
export function IconAaCoaching(props: NavIconProps) {
  return (
    <NavIcon {...props}>
      <path
        d="M3.75734 12.9106C2.91823 12.0715 2.34679 11.0024 2.11529 9.83848C1.88378 8.6746 2.0026 7.4682 2.45673 6.37185C2.91086 5.2755 3.6799 4.33843 4.66659 3.67915C5.65328 3.01986 6.81332 2.66797 8 2.66797C9.18669 2.66797 10.3467 3.01986 11.3334 3.67915C12.3201 4.33843 13.0891 5.2755 13.5433 6.37185C13.9974 7.4682 14.1162 8.6746 13.8847 9.83848C13.6532 11.0024 13.0818 12.0715 12.2427 12.9106M10.6667 6.00122L8 8.66789"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavIcon>
  );
}

/**
 * Live Assist — the raised hand from the library (`hand-stop`). A hand is the
 * one gesture that reads as "I need someone" without reading as an error.
 */
export function IconAaLiveAssist(props: NavIconProps) {
  return (
    <NavIcon {...props}>
      <path
        d="M7.3335 3.66536C7.3335 3.40015 7.22814 3.14579 7.0406 2.95826C6.85307 2.77072 6.59871 2.66536 6.3335 2.66536C6.06828 2.66536 5.81393 2.77072 5.62639 2.95826C5.43885 3.14579 5.3335 3.40015 5.3335 3.66536V8.66536L4.35346 7.68536C4.15715 7.48928 3.90095 7.36441 3.62556 7.33059C3.35017 7.29677 3.07137 7.35594 2.83346 7.4987C2.61009 7.63261 2.44778 7.84839 2.38104 8.10013C2.31431 8.35187 2.34842 8.61972 2.47612 8.8467C3.72879 11.0734 4.45879 12.346 4.66679 12.6654C4.71017 12.7321 4.75373 12.7988 4.79746 12.8654C5.1618 13.4186 5.65784 13.8727 6.24104 14.1869C6.82425 14.5011 7.47635 14.6655 8.13879 14.6654H8.00012H9.33345C10.3943 14.6654 11.4117 14.2439 12.1619 13.4938C12.912 12.7436 13.3335 11.7262 13.3335 10.6654V4.9987C13.3335 4.73348 13.2281 4.47913 13.0406 4.29159C12.853 4.10405 12.5987 3.9987 12.3335 3.9987C12.0682 3.9987 11.8139 4.10405 11.6263 4.29159C11.4388 4.47913 11.3335 4.73348 11.3335 4.9987M7.3335 3.66536V7.9987M7.3335 3.66536V2.33203C7.3335 2.20071 7.35936 2.07067 7.40962 1.94935C7.45987 1.82802 7.53353 1.71778 7.62639 1.62492C7.71925 1.53207 7.82949 1.45841 7.95081 1.40815C8.07214 1.3579 8.20217 1.33203 8.3335 1.33203C8.46482 1.33203 8.59485 1.3579 8.71618 1.40815C8.8375 1.45841 8.94774 1.53207 9.0406 1.62492C9.13346 1.71778 9.20712 1.82802 9.25738 1.94935C9.30763 2.07067 9.3335 2.20071 9.3335 2.33203V7.9987M9.3335 3.66536C9.3335 3.40015 9.43885 3.14579 9.62639 2.95826C9.81393 2.77072 10.0683 2.66536 10.3335 2.66536C10.5987 2.66536 10.8531 2.77072 11.0406 2.95826C11.2281 3.14579 11.3335 3.40015 11.3335 3.66536V7.9987"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavIcon>
  );
}

export function IconAaActions(props: NavIconProps) {
  return (
    <NavIcon {...props}>
      <path
        d="M8.66732 2V6.66667H12.6673L7.33398 14V9.33333H3.33398L8.66732 2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavIcon>
  );
}
