import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionSummary } from "@/types";

interface SessionCoverageBannerProps {
  summary: SessionSummary;
}

const END_REASON_LABELS: Record<string, { label: string; tone: "neutral" | "success" | "warning" }> = {
  all_covered: { label: "All Skills Covered", tone: "success" },
  manual_candidate: { label: "Ended Early by Candidate", tone: "warning" },
  manual_assessor: { label: "Ended by Assessor", tone: "neutral" },
  time_ceiling: { label: "Time Limit Reached", tone: "neutral" },
  error: { label: "Interrupted by Error", tone: "warning" },
};

export function formatDurationSeconds(seconds?: number | null): string {
  if (seconds == null || seconds < 0) return "Duration N/A";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export default function SessionCoverageBanner({ summary }: SessionCoverageBannerProps) {
  const configured = summary.configured_skills_count ?? 0;
  const assessed = summary.assessed_skills_count ?? 0;
  const unassessed = summary.unassessed_skills_count ?? Math.max(0, configured - assessed);
  const covered = summary.covered_skills_count ?? 0;

  const pct = configured > 0 ? Math.round((assessed / configured) * 100) : 0;
  const reasonInfo = summary.end_reason
    ? END_REASON_LABELS[summary.end_reason] ?? {
        label: summary.end_reason.replace(/_/g, " "),
        tone: "neutral" as const,
      }
    : null;

  const isPartial = unassessed > 0;

  return (
    <section
      aria-label="Interview session coverage summary"
      className={cn(
        "rounded-lg border p-4 space-y-3",
        isPartial ? "bg-amber-50/40 border-amber-200" : "bg-muted/30"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {isPartial ? (
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" aria-hidden="true" />
          )}
          <span className="text-sm font-semibold">
            {assessed} of {configured} configured skill{configured !== 1 ? "s" : ""} assessed
          </span>
          {reasonInfo && (
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded border",
                reasonInfo.tone === "success" && "bg-green-50 text-green-700 border-green-200",
                reasonInfo.tone === "warning" && "bg-amber-100/80 text-amber-800 border-amber-300",
                reasonInfo.tone === "neutral" && "bg-background text-muted-foreground border-border"
              )}
            >
              {reasonInfo.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{formatDurationSeconds(summary.duration_seconds)}</span>
        </div>
      </div>

      {configured > 0 && (
        <div className="space-y-1.5">
          <div
            role="progressbar"
            aria-label="Configured skills assessed"
            aria-valuenow={assessed}
            aria-valuemin={0}
            aria-valuemax={configured}
            className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden"
          >
            <div
              className={cn(
                "h-full transition-all",
                isPartial ? "bg-amber-500" : "bg-teal-600"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {covered} fully covered · {Math.max(0, assessed - covered)} partially assessed
            </span>
            {unassessed > 0 && (
              <span className="text-amber-800 font-medium">
                {unassessed} unassessed (not penalized as low skill)
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
