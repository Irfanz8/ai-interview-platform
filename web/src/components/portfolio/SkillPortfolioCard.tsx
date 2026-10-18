import { Card, CardContent } from "@/components/ui/card";
import LevelBadge from "./LevelBadge";
import ConfidenceIndicator from "./ConfidenceIndicator";
import OverridePanel from "./OverridePanel";
import { Zap, UserCheck } from "lucide-react";
import { parseLevel, LEVEL_LABELS } from "@/utils/constants";
import type { PortfolioSkill, AssessorOverride } from "@/types";

interface SkillPortfolioCardProps {
  skill: PortfolioSkill;
  override?: AssessorOverride;
  onOverrideSaved: (override: AssessorOverride) => void;
}

function formatTimestamp(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SkillPortfolioCard({
  skill,
  override,
  onOverrideSaved,
}: SkillPortfolioCardProps) {
  const aiLevelNum = parseLevel(skill.ai_level);
  const effectiveLevel = override?.override_level ?? aiLevelNum;
  const formattedOverrideTime = formatTimestamp(override?.overridden_at);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Skill header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <LevelBadge level={effectiveLevel} />
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold break-words">
                  {skill.skill_label}
                </span>
                {skill.is_discovered && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    <Zap className="h-3 w-3" aria-hidden="true" /> Discovered
                  </span>
                )}
                {skill.coverage_state === "partial" && (
                  <span className="inline-flex items-center text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    Partially assessed
                    {skill.probe_count != null
                      ? ` (${skill.probe_count} probes)`
                      : ""}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ConfidenceIndicator confidence={skill.ai_confidence} />
                {!override && (
                  <span className="text-xs text-muted-foreground">
                    · AI-generated rating
                  </span>
                )}
              </div>
            </div>
          </div>
          <OverridePanel
            skill={skill}
            existingOverride={override}
            onSaved={onOverrideSaved}
          />
        </div>

        {/* Latest Assessor Override block */}
        {override && (
          <div
            role="note"
            aria-label={`Latest assessor override for ${skill.skill_label}`}
            className="rounded-md border border-green-200 bg-green-50/70 px-3 py-2.5 space-y-1"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-green-900">
              <span className="inline-flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-green-700" aria-hidden="true" />
                Latest Assessor Override: AI {LEVEL_LABELS[override.ai_level ?? aiLevelNum]} → Assessor{" "}
                {LEVEL_LABELS[override.override_level]}
              </span>
              {formattedOverrideTime && (
                <span className="text-green-800/80 font-normal">
                  {formattedOverrideTime}
                </span>
              )}
            </div>
            {override.assessor_notes && (
              <p className="text-sm text-green-950 break-words leading-relaxed">
                {override.assessor_notes}
              </p>
            )}
          </div>
        )}

        {/* Low confidence note (Product Assumption A-02) */}
        {skill.ai_confidence?.toLowerCase() === "low" && !override && (
          <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Only briefly explored. AI confidence is low — assessor review or override is recommended if this skill is critical.
          </div>
        )}

        {/* Verbatim Evidence from transcript */}
        {skill.evidence.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Verbatim evidence from interview
            </span>
            <ul className="space-y-1">
              {skill.evidence.map((quote, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground break-words leading-relaxed"
                >
                  • &ldquo;{quote}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Competency summary */}
        {skill.competency_summary && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              AI competency summary
            </span>
            <p className="text-sm text-muted-foreground leading-relaxed break-words">
              {skill.competency_summary}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
