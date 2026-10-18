import {
  LEVEL_LABELS,
  LEVEL_DESCRIPTIONS,
  LEVEL_BADGE_CLASSES,
  FIT_GAP_RESULT_LABELS,
  FIT_GAP_RESULT_CLASSES,
} from "@/utils/constants";
import { cn } from "@/lib/utils";
import type { SkillComparison } from "@/types";

interface ComparisonTableProps {
  comparisons: SkillComparison[];
}

function ResultBadge({ comparison }: { comparison: SkillComparison }) {
  const label = FIT_GAP_RESULT_LABELS[comparison.result] ?? comparison.result;
  const classes = FIT_GAP_RESULT_CLASSES[comparison.result] ?? "";

  let icon = "";
  let suffix = "";
  if (comparison.result === "match") icon = "✅";
  else if (comparison.result === "exceed") {
    icon = "⭐";
    suffix = comparison.delta ? ` +${comparison.delta}` : "";
  } else if (comparison.result === "gap") {
    icon = "⚠";
    suffix = comparison.delta ? ` -${Math.abs(comparison.delta)}` : "";
  } else {
    icon = "—";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap",
        comparison.result === "match" && "border-green-200",
        comparison.result === "exceed" && "border-green-200",
        comparison.result === "gap" && "border-amber-200",
        comparison.result === "not_assessed" && "border-dashed border-neutral-300",
        classes
      )}
    >
      <span aria-hidden="true">{icon}</span> {label}
      {suffix}
    </span>
  );
}

export default function ComparisonTable({ comparisons }: ComparisonTableProps) {
  const matchCount = comparisons.filter((c) => c.result === "match").length;
  const gapCount = comparisons.filter((c) => c.result === "gap").length;
  const exceedCount = comparisons.filter((c) => c.result === "exceed").length;
  const notAssessedCount = comparisons.filter(
    (c) => c.result === "not_assessed"
  ).length;

  if (comparisons.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
        No vacancy skills configured for comparison.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Structured 4-Category Summary Strip */}
      <div
        aria-label="Fit/gap comparison summary"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
      >
        <div className="rounded-lg border border-green-200/80 bg-green-50/50 px-3 py-2 text-xs text-green-900">
          <span className="font-semibold">
            ✅ Match: {matchCount} skill{matchCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="rounded-lg border border-teal-200/80 bg-teal-50/50 px-3 py-2 text-xs text-teal-900">
          <span className="font-semibold">
            ⭐ Exceeds: {exceedCount} skill{exceedCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
          <span className="font-semibold">
            ⚠ Gap: {gapCount} skill{gapCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50/80 px-3 py-2 text-xs text-neutral-700">
          <span className="font-semibold">
            — Not assessed: {notAssessedCount} skill{notAssessedCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto rounded-lg border bg-card shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="text-left px-4 py-3 font-semibold">
                Skill &amp; Provenance
              </th>
              <th scope="col" className="text-center px-4 py-3 font-semibold">
                Required
              </th>
              <th scope="col" className="text-center px-4 py-3 font-semibold">
                Candidate
              </th>
              <th scope="col" className="text-center px-4 py-3 font-semibold">
                Outcome
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {comparisons.map((c, i) => {
              const reqLevel = c.required_level ?? c.expected_level;
              const isInsufficient =
                c.assessment_status === "insufficient_evidence";

              return (
                <tr
                  key={c.skill_id ?? `${c.skill_label}-${i}`}
                  className="align-top transition-colors hover:bg-muted/20"
                >
                  <td className="px-4 py-3.5 min-w-[180px]">
                    <div className="font-medium text-foreground break-words">
                      {c.skill_label}
                    </div>
                    {c.is_override && c.assessor_notes && (
                      <div className="mt-1.5 rounded-md border border-emerald-200/80 bg-emerald-50/50 px-2.5 py-1.5 text-xs text-emerald-950 break-words">
                        <span className="font-semibold text-emerald-900">
                          Override note:
                        </span>{" "}
                        {c.assessor_notes}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    {reqLevel != null ? (
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-semibold border border-black/5",
                            LEVEL_BADGE_CLASSES[reqLevel] ?? "bg-muted text-foreground"
                          )}
                        >
                          {LEVEL_LABELS[reqLevel] ?? `L${reqLevel}`}
                        </span>
                        {LEVEL_DESCRIPTIONS[reqLevel] && (
                          <span className="hidden sm:inline text-[10px] text-muted-foreground mt-0.5">
                            {LEVEL_DESCRIPTIONS[reqLevel]}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    {c.candidate_level != null ? (
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <div className="inline-flex items-center gap-1">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-semibold border border-black/5",
                              LEVEL_BADGE_CLASSES[c.candidate_level] ?? "bg-muted text-foreground"
                            )}
                          >
                            {LEVEL_LABELS[c.candidate_level] ?? `L${c.candidate_level}`}
                          </span>
                          {c.is_override && (
                            <span
                              title="Assessor override applied"
                              aria-label="Assessor override applied"
                              className="text-xs font-semibold text-emerald-700"
                            >
                              ✏
                            </span>
                          )}
                        </div>
                        {c.is_override && c.ai_level != null && (
                          <span className="text-[11px] font-medium text-emerald-800">
                            AI {LEVEL_LABELS[c.ai_level] ?? `L${c.ai_level}`} →{" "}
                            {LEVEL_LABELS[c.candidate_level] ?? `L${c.candidate_level}`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex flex-col items-center">
                        <span className="text-xs font-medium text-muted-foreground">
                          Not assessed
                        </span>
                        <span className="text-[11px] text-muted-foreground/80">
                          {isInsufficient ? "Insufficient evidence" : "Not probed"}
                        </span>
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <ResultBadge comparison={c} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground px-1">
        <span>
          Unassessed skills lacked sufficient interview turns (0–1 probes) and are not counted as skill gaps.
        </span>
        <span className="font-medium text-emerald-800">✏ = human override applied</span>
      </div>
    </div>
  );
}

