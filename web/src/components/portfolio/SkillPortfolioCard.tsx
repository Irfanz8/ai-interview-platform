import { Card, CardContent } from "@/components/ui/card";
import LevelBadge from "./LevelBadge";
import ConfidenceIndicator from "./ConfidenceIndicator";
import OverridePanel from "./OverridePanel";
import { Zap, UserCheck, Quote } from "lucide-react";
import { parseLevel, LEVEL_LABELS } from "@/utils/constants";
import { cn } from "@/lib/utils";
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
    <Card
      className={cn(
        "transition-shadow hover:shadow-sm",
        override && "border-emerald-200/90"
      )}
    >
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* 1. Skill name -> effective rating -> provenance & confidence */}
        <div className="flex items-start gap-3.5 min-w-0">
          <LevelBadge level={effectiveLevel} />
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold leading-snug text-foreground break-words">
                {skill.skill_label}
              </h3>
              {skill.is_discovered && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <Zap className="h-3 w-3" aria-hidden="true" /> Discovered
                </span>
              )}
              {skill.coverage_state === "covered" && (
                <span className="inline-flex items-center text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200/70 px-2 py-0.5 rounded-full">
                  Covered
                  {skill.probe_count != null ? ` (${skill.probe_count} probes)` : ""}
                </span>
              )}
              {skill.coverage_state === "partial" && (
                <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  Partially assessed
                  {skill.probe_count != null ? ` (${skill.probe_count} probes)` : ""}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ConfidenceIndicator confidence={skill.ai_confidence} />
              {override ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <UserCheck className="h-3 w-3" aria-hidden="true" />
                  Human override active
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  AI-generated rating
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Latest Assessor Override provenance callout */}
        {override && (
          <div
            role="note"
            aria-label={`Latest assessor override for ${skill.skill_label}`}
            className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3.5 py-3 space-y-1.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-emerald-900">
              <span className="inline-flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                Latest Assessor Override: AI {LEVEL_LABELS[override.ai_level ?? aiLevelNum]} → Assessor{" "}
                {LEVEL_LABELS[override.override_level]}
              </span>
              {formattedOverrideTime && (
                <span className="text-emerald-800/80 font-normal">
                  {formattedOverrideTime}
                </span>
              )}
            </div>
            {override.assessor_notes && (
              <p className="text-sm text-emerald-950 break-words leading-relaxed">
                {override.assessor_notes}
              </p>
            )}
          </div>
        )}

        {/* Low confidence advisory */}
        {skill.ai_confidence?.toLowerCase() === "low" && !override && (
          <div className="text-xs text-amber-900 bg-amber-50/80 border border-amber-200 rounded-md px-3 py-2">
            Only briefly explored. AI confidence is low — assessor review or override is recommended if this skill is critical.
          </div>
        )}

        {/* 3. AI Competency Summary (placed before verbatim quotes for clear reading order) */}
        {skill.competency_summary && (
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              AI Competency Summary
            </span>
            <p className="text-sm text-foreground/90 leading-relaxed break-words">
              {skill.competency_summary}
            </p>
          </div>
        )}

        {/* 4. Supporting Verbatim Evidence */}
        {skill.evidence && skill.evidence.length > 0 && (
          <div className="space-y-2 pt-0.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <Quote className="h-3 w-3" aria-hidden="true" />
              Supporting Interview Evidence ({skill.evidence.length})
            </span>
            <ul className="space-y-2">
              {skill.evidence.map((quote, i) => (
                <li
                  key={i}
                  className="text-sm text-muted-foreground border-l-2 border-primary/30 bg-muted/25 rounded-r-md pl-3 pr-3 py-1.5 break-words leading-relaxed italic"
                >
                  &ldquo;{quote}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 5. Override Action Footer / Expandable Form */}
        <div className="pt-3 border-t border-border/60">
          <OverridePanel
            skill={skill}
            existingOverride={override}
            onSaved={onOverrideSaved}
          />
        </div>
      </CardContent>
    </Card>
  );
}


