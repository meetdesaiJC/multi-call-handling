import type { ReactNode } from "react";
import { IconVoice } from "@/components/Icon";
import { cn } from "@/lib/utils";

export function SpeakProgressHint({
  listening,
  className,
  children,
}: {
  listening?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-2 text-pretty text-paragraph-sm leading-5 text-muted-foreground",
        className
      )}
    >
      <IconVoice
        size={20}
        className={cn(
          "size-5 shrink-0 self-center text-info",
          listening && "script-listen-mic"
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 leading-5">{children}</span>
    </p>
  );
}
