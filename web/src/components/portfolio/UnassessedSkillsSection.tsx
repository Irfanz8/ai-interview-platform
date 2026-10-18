import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import { LEVEL_LABELS } from "@/utils/constants";
import type { UnassessedSkill } from "@/types";

interface UnassessedSkillsSectionProps {
  skills: UnassessedSkill[];
}

export default function UnassessedSkillsSection({
  skills,
}: UnassessedSkillsSectionProps) {
  if (!skills || skills.length === 0) return null;

  return (
    <section aria-label="Unassessed configured skills" className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Unassessed Skills ({skills.length})
        </h2>
        <p className="text-xs text-muted-foreground">
          These configured skills lacked sufficient interview probing to assign a valid L1–L5 rating. They are marked{" "}
          <span className="font-medium text-foreground">Not assessed</span> in Fit/Gap reports rather than penalized as a skill gap.
        </p>
      </div>

      <div className="grid gap-2.5">
        {skills.map((skill, idx) => {
          const isInsufficient = skill.reason === "insufficient_evidence";
          const badgeLabel = isInsufficient
            ? `Insufficient Evidence (${skill.probe_count} probe${skill.probe_count !== 1 ? "s" : ""})`
            : "Not Probed (0 probes)";

          return (
            <Card key={skill.skill_id ?? `${skill.skill_label}-${idx}`} className="bg-muted/20 border-dashed">
              <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium break-words">
                      {skill.skill_label}
                    </span>
                    {skill.expected_level != null && (
                      <span className="text-xs text-muted-foreground">
                        Target: {LEVEL_LABELS[skill.expected_level] ?? `L${skill.expected_level}`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isInsufficient
                      ? "Topic was initiated, but session ended before enough behavioral evidence was gathered."
                      : "Session ended before the interviewer reached this skill."}
                  </p>
                </div>

                <span
                  className={
                    isInsufficient
                      ? "inline-flex items-center self-start sm:self-center shrink-0 text-xs font-medium px-2.5 py-1 rounded border bg-amber-50 text-amber-800 border-amber-200"
                      : "inline-flex items-center self-start sm:self-center shrink-0 text-xs font-medium px-2.5 py-1 rounded border bg-neutral-100 text-neutral-700 border-neutral-200"
                  }
                >
                  {badgeLabel}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
