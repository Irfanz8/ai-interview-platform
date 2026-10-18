import { LEVEL_LABELS, LEVEL_BADGE_CLASSES, LEVEL_DESCRIPTIONS } from "@/utils/constants";
import { cn } from "@/lib/utils";

interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md";
  className?: string;
}

export default function LevelBadge({ level, size = "md", className }: LevelBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center rounded-md font-semibold border border-black/5 shrink-0",
        size === "md" ? "px-3 py-1.5 min-w-[3.75rem] text-sm" : "px-2 py-0.5 min-w-[2.25rem] text-xs",
        LEVEL_BADGE_CLASSES[level],
        className
      )}
    >
      <span className="leading-tight">{LEVEL_LABELS[level]}</span>
      {size === "md" && (
        <span className="text-[10px] font-medium opacity-75 leading-tight mt-0.5">
          {LEVEL_DESCRIPTIONS[level]}
        </span>
      )}
    </div>
  );
}

