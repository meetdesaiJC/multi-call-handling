import type { ReactNode, SVGProps } from "react";
import { IconCircleCheckFilled } from "@/components/Icon";
import { cn } from "@/lib/utils";
import {
  coachingAccent,
  coachingSignal,
  type CoachingAccent,
  type CoachingRule,
  type CoachingSignal,
  type CoachingTemplateId,
} from "./coachingData";

/**
 * Semantic coaching cards. Color is the category, not decoration — the same
 * wash + icon language on the in-call card, the admin preview, and the
 * template picker so agents learn it once.
 */

const TONE: Record<
  CoachingAccent,
  { card: string; ink: string; well: string; hover: string }
> = {
  orange: {
    card: "border border-l-2 border-coach-orange-border border-l-coach-orange bg-coach-orange-surface",
    ink: "text-coach-orange-text",
    well: "bg-coach-orange-surface text-coach-orange-text",
    hover: "hover:bg-white/70",
  },
  purple: {
    card: "border border-l-2 border-coach-purple-border border-l-coach-purple bg-coach-purple-surface",
    ink: "text-coach-purple-text",
    well: "bg-coach-purple-surface text-coach-purple-text",
    hover: "hover:bg-white/70",
  },
  blue: {
    card: "border border-l-2 border-coach-blue-border border-l-coach-blue bg-coach-blue-surface",
    ink: "text-coach-blue-text",
    well: "bg-coach-blue-surface text-coach-blue-text",
    hover: "hover:bg-white/70",
  },
  teal: {
    card: "border border-l-2 border-coach-teal-border border-l-coach-teal bg-coach-teal-surface",
    ink: "text-coach-teal-text",
    well: "bg-coach-teal-surface text-coach-teal-text",
    hover: "hover:bg-white/70",
  },
};

export function coachingTone(templateId: CoachingTemplateId) {
  return TONE[coachingAccent(templateId)];
}

const iconStroke = {
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function CueSvg({
  viewBox = "0 0 16 16",
  ...props
}: SVGProps<SVGSVGElement>) {
  return <svg viewBox={viewBox} fill="none" aria-hidden="true" {...props} />;
}

/** Heart — `icon-library/Agent Assist/heart.svg`. Sentiment / frustration. */
function IconSentiment(props: SVGProps<SVGSVGElement>) {
  return (
    <CueSvg {...props}>
      <path
        d="M13.0009 8.38243L8.00085 13.3344L3.00085 8.38243C2.67106 8.0615 2.41128 7.67577 2.23788 7.24952C2.06449 6.82327 1.98123 6.36573 1.99334 5.90572C2.00546 5.44571 2.11269 4.99319 2.30829 4.57665C2.50389 4.16012 2.78361 3.7886 3.12984 3.48548C3.47608 3.18236 3.88132 2.95422 4.32006 2.81542C4.7588 2.67661 5.22152 2.63015 5.6791 2.67896C6.13667 2.72777 6.57918 2.8708 6.97877 3.09903C7.37835 3.32727 7.72635 3.63576 8.00085 4.00509C8.27654 3.63844 8.62494 3.33264 9.02425 3.10683C9.42356 2.88102 9.86518 2.74006 10.3215 2.69277C10.7778 2.64549 11.2389 2.69289 11.676 2.83202C12.1132 2.97115 12.5169 3.19901 12.8619 3.50134C13.2069 3.80366 13.4858 4.17395 13.6811 4.58902C13.8765 5.00409 13.984 5.45502 13.9971 5.91357C14.0101 6.37212 13.9284 6.82842 13.7569 7.25393C13.5855 7.67943 13.3281 8.06498 13.0009 8.38643"
        {...iconStroke}
      />
    </CueSvg>
  );
}

/** Chat — `icon-library/Agent Assist/messages.svg`. Interruptions / overlap. */
function IconInterrupt(props: SVGProps<SVGSVGElement>) {
  return (
    <CueSvg {...props}>
      <path
        d="M9.33333 10V11.3333C9.33333 11.5101 9.2631 11.6797 9.13807 11.8047C9.01305 11.9298 8.84348 12 8.66667 12H4L2 14V7.33333C2 7.15652 2.07024 6.98695 2.19526 6.86193C2.32029 6.7369 2.48986 6.66667 2.66667 6.66667H4M14 9.33333L12 7.33333H7.33333C7.15652 7.33333 6.98695 7.2631 6.86193 7.13807C6.7369 7.01305 6.66667 6.84348 6.66667 6.66667V2.66667C6.66667 2.48986 6.7369 2.32029 6.86193 2.19526C6.98695 2.07024 7.15652 2 7.33333 2H13.3333C13.5101 2 13.6797 2.07024 13.8047 2.19526C13.9298 2.32029 14 2.48986 14 2.66667V9.33333Z"
        {...iconStroke}
      />
    </CueSvg>
  );
}

/** Speak — `icon-library/Agent Assist/speakerphone.svg`. Talk ratio. */
function IconTalk(props: SVGProps<SVGSVGElement>) {
  return (
    <CueSvg {...props}>
      <path
        d="M12 5.33203C12.5304 5.33203 13.0391 5.54274 13.4142 5.91782C13.7893 6.29289 14 6.8016 14 7.33203C14 7.86246 13.7893 8.37117 13.4142 8.74625C13.0391 9.12132 12.5304 9.33203 12 9.33203M6.66667 5.33203V12.6654C6.66667 12.8422 6.59643 13.0117 6.4714 13.1368C6.34638 13.2618 6.17681 13.332 6 13.332H5.33333C5.15652 13.332 4.98695 13.2618 4.86193 13.1368C4.7369 13.0117 4.66667 12.8422 4.66667 12.6654V9.33203M8 5.332L11.016 2.81866C11.1036 2.74567 11.2103 2.69916 11.3234 2.6846C11.4365 2.67004 11.5514 2.68801 11.6547 2.73643C11.758 2.78485 11.8453 2.86169 11.9065 2.95796C11.9676 3.05423 12.0001 3.16594 12 3.28V11.384C12.0001 11.498 11.9676 11.6098 11.9065 11.706C11.8453 11.8023 11.758 11.8791 11.6547 11.9276C11.5514 11.976 11.4365 11.994 11.3234 11.9794C11.2103 11.9648 11.1036 11.9183 11.016 11.8453L8 9.332H2.66667C2.48986 9.332 2.32029 9.26176 2.19526 9.13673C2.07024 9.01171 2 8.84214 2 8.66533V5.99866C2 5.82185 2.07024 5.65228 2.19526 5.52726C2.32029 5.40223 2.48986 5.332 2.66667 5.332H8Z"
        {...iconStroke}
      />
    </CueSvg>
  );
}

/** Speedtest — `icon-library/Agent Assist/brand-speedtest.svg`. Speaking pace. */
function IconPace(props: SVGProps<SVGSVGElement>) {
  return (
    <CueSvg {...props}>
      <path
        d="M3.75734 12.9106C2.91823 12.0715 2.34679 11.0024 2.11529 9.83848C1.88378 8.6746 2.0026 7.4682 2.45673 6.37185C2.91086 5.2755 3.6799 4.33843 4.66659 3.67915C5.65328 3.01986 6.81332 2.66797 8 2.66797C9.18669 2.66797 10.3467 3.01986 11.3334 3.67915C12.3201 4.33843 13.0891 5.2755 13.5433 6.37185C13.9974 7.4682 14.1162 8.6746 13.8847 9.83848C13.6532 11.0024 13.0818 12.0715 12.2427 12.9106M10.6667 6.00122L8 8.66789"
        {...iconStroke}
      />
    </CueSvg>
  );
}

/** Clock-play — `icon-library/Agent Assist/clock-play.svg`. Long silence. */
function IconMonologue(props: SVGProps<SVGSVGElement>) {
  return (
    <CueSvg {...props}>
      <path
        d="M7.99967 4.66634V7.99967L9.33301 9.33301M8.67759 13.9616C7.42284 14.1042 6.15508 13.8473 5.05485 13.2274C3.95462 12.6076 3.07803 11.6564 2.5499 10.5093C2.02177 9.36216 1.86904 8.07768 2.11346 6.83873C2.35788 5.59977 2.98698 4.46953 3.91117 3.60894C4.83537 2.74836 6.00753 2.20132 7.26074 2.04572C8.51395 1.89013 9.78431 2.13392 10.8909 2.74237C11.9975 3.35082 12.8839 4.29291 13.4238 5.43447C13.9638 6.57604 14.1298 7.85887 13.8983 9.10029M11.333 14.6663L14.6663 12.6663L11.333 10.6663V14.6663Z"
        {...iconStroke}
      />
    </CueSvg>
  );
}

const SIGNAL_ICON: Record<
  CoachingSignal,
  (props: SVGProps<SVGSVGElement>) => ReactNode
> = {
  sentiment: IconSentiment,
  interrupt: IconInterrupt,
  talk: IconTalk,
  pace: IconPace,
  monologue: IconMonologue,
};

export function CoachingCueIcon({
  templateId,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { templateId: CoachingTemplateId }) {
  const Icon = SIGNAL_ICON[coachingSignal(templateId)];
  return <Icon className={cn("size-4", className)} {...props} />;
}

/** Shared chrome for the live card and the admin preview. */
export function CoachingCardFace({
  rule,
  observation,
  resolved = false,
  action,
}: {
  rule: Pick<CoachingRule, "templateId" | "message">;
  observation: string;
  resolved?: boolean;
  action: ReactNode;
}) {
  const tone = coachingTone(rule.templateId);

  return (
    <div className="flex items-start gap-2 px-3 py-2.5">
      {resolved ? (
        <IconCircleCheckFilled
          size={16}
          className="mt-px size-4 shrink-0 text-success"
        />
      ) : (
        <CoachingCueIcon
          templateId={rule.templateId}
          className={cn("mt-px size-4 shrink-0", tone.ink)}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-pretty text-label-md font-medium text-foreground">
          {rule.message}
        </p>
        <p className="text-pretty text-paragraph-sm text-muted-foreground">
          {observation}
        </p>
      </div>
      {action}
    </div>
  );
}
