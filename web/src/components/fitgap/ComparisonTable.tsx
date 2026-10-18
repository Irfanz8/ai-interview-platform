import {
  LEVEL_LABELS,
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
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap",
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
      <p className="text-sm text-muted-foreground py-4 text-center">
        No vacancy skills configured for comparison.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th scope="col" className="text-left px-4 py-2.5 font-medium">
                Skill
              </th>
              <th scope="col" className="text-center px-4 py-2.5 font-medium">
                Required
              </th>
              <th scope="col" className="text-center px-4 py-2.5 font-medium">
                Candidate
              </th>
              <th scope="col" className="text-center px-4 py-2.5 font-medium">
                Result
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((c, i) => {
              const reqLevel = c.required_level ?? c.expected_level;
              const isInsufficient =
                c.assessment_status === "insufficient_evidence";

              return (
                <tr key={c.skill_id ?? `${c.skill_label}-${i}`} className="border-b last:border-0 align-top">
                  <td className="px-4 py-2.5 min-w-[160px]">
                    <div className="font-medium break-words">
                      {c.skill_label}
                    </div>
                    {c.is_override && c.assessor_notes && (
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        <span className="font-medium text-foreground">
                          Override note:
                        </span>{" "}
                        {c.assessor_notes}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground whitespace-nowrap">
                    {reqLevel != null ? LEVEL_LABELS[reqLevel] ?? `L${reqLevel}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    {c.candidate_level != null ? (
                      <div className="inline-flex flex-col items-center">
                        <span className="font-medium">
                          {LEVEL_LABELS[c.candidate_level] ?? `L${c.candidate_level}`}
                          {c.is_override && (
                            <span
                              title="Assessor override applied"
                              aria-label="Assessor override applied"
                              className="text-xs text-green-700 ml-1"
                            >
                              ✏
                            </span>
                          )}
                        </span>
                        {c.is_override && c.ai_level != null && (
                          <span className="text-[11px] text-muted-foreground">
                            AI {LEVEL_LABELS[c.ai_level] ?? `L${c.ai_level}`} →{" "}
                            {LEVEL_LABELS[c.candidate_level] ?? `L${c.candidate_level}`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex flex-col items-center">
                        <span className="text-xs text-muted-foreground">
                          Not assessed
                        </span>
                        <span className="text-[11px] text-muted-foreground/80">
                          {isInsufficient ? "Insufficient evidence" : "Not probed"}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <ResultBadge comparison={c} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div
        aria-label="Fit/gap comparison summary"
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground"
      >
        <span>
          ✅ Match: {matchCount} skill{matchCount !== 1 ? "s" : ""}
        </span>
        <span>
          ⭐ Exceeds: {exceedCount} skill{exceedCount !== 1 ? "s" : ""}
        </span>
        <span>
          ⚠ Gap: {gapCount} skill{gapCount !== 1 ? "s" : ""}
        </span>
        <span>
          — Not assessed: {notAssessedCount} skill
          {notAssessedCount !== 1 ? "s" : ""}
        </span>
        <span className="sm:ml-auto">✏ = human override applied</span>
      </div>
    </div>
  );
}
