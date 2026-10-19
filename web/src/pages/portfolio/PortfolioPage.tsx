import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SkillPortfolioCard from "@/components/portfolio/SkillPortfolioCard";
import SessionCoverageBanner from "@/components/portfolio/SessionCoverageBanner";
import UnassessedSkillsSection from "@/components/portfolio/UnassessedSkillsSection";
import { sessionsApi } from "@/services/sessions";
import { vacanciesApi } from "@/services/vacancies";
import { portfoliosApi } from "@/services/portfolios";
import { usePolling } from "@/hooks/usePolling";
import {
  ArrowLeft,
  Download,
  Loader2,
  RefreshCw,
  Zap,
  FileText,
  AlertCircle,
  Clock,
  Briefcase,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import type { Portfolio, AssessorOverride, Vacancy } from "@/types";

const MAX_POLL_ATTEMPTS = 12;

export default function PortfolioPage() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [generating, setGenerating] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [failedError, setFailedError] = useState<string | null>(null);
  const [notFoundError, setNotFoundError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, AssessorOverride>>({});
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [selectedVacancy, setSelectedVacancy] = useState<string>("");
  const [exporting, setExporting] = useState<"pdf" | "json" | null>(null);
  const [candidateName, setCandidateName] = useState<string | null>(null);
  const [assessmentName, setAssessmentName] = useState<string | null>(null);

  const pollAttemptsRef = useRef(0);
  const latestRequestIdRef = useRef(0);

  const applyOverrideMap = useCallback((loadedPortfolio: Portfolio) => {
    const overrideMap: Record<number, AssessorOverride> = {};
    loadedPortfolio.overrides.forEach((o: AssessorOverride) => {
      overrideMap[o.portfolio_skill_id] = o;
    });
    setOverrides(overrideMap);
  }, []);

  const fetchPortfolio = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    try {
      const res = await sessionsApi.getPortfolio(Number(sessionId));
      if (requestId !== latestRequestIdRef.current) return;

      const data = res.data;
      setNotFoundError(null);

      if (data.status === "failed" || data.portfolio?.generation_status === "failed") {
        setGenerating(false);
        setTimedOut(false);
        setFailedError(
          data.error ??
            data.portfolio?.generation_error ??
            "Portfolio generation failed. Please retry generation."
        );
        if (data.portfolio) {
          setPortfolio(data.portfolio);
        }
        return;
      }

      if (
        data.status === "generating" ||
        data.portfolio?.generation_status === "generating" ||
        data.portfolio?.generation_status === "pending"
      ) {
        pollAttemptsRef.current += 1;
        if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
          setGenerating(false);
          setTimedOut(true);
        } else {
          setGenerating(true);
          setTimedOut(false);
        }
        return;
      }

      if (data.portfolio) {
        pollAttemptsRef.current = 0;
        setPortfolio(data.portfolio);
        setGenerating(false);
        setTimedOut(false);
        setFailedError(null);
        applyOverrideMap(data.portfolio);
      }
    } catch (err: unknown) {
      if (requestId !== latestRequestIdRef.current) return;
      const status = (err as { response?: { status?: number } })?.response?.status;
      setGenerating(false);
      if (status === 404) {
        setNotFoundError("Session or portfolio could not be found in your workspace.");
      } else {
        setFailedError("Unable to load portfolio status. Please check your connection and try again.");
      }
    }
  }, [sessionId, applyOverrideMap]);

  useEffect(() => {
    pollAttemptsRef.current = 0;
    Promise.all([
      fetchPortfolio(),
      vacanciesApi.list().catch(() => ({ data: { vacancies: [] as Vacancy[] } })),
      sessionsApi.get(Number(sessionId)).catch(() => null),
    ])
      .then(([, vRes, sRes]) => {
        if (vRes?.data?.vacancies) {
          setVacancies(vRes.data.vacancies);
        }
        if (sRes?.data?.session) {
          setCandidateName(sRes.data.session.candidate_name ?? null);
        }
        if (sRes?.data?.assessment) {
          setAssessmentName(sRes.data.assessment.name ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [fetchPortfolio, sessionId]);

  // Poll while generating and not timed out
  usePolling(fetchPortfolio, 5000, generating && !timedOut);

  const handleCheckStatusNow = async () => {
    pollAttemptsRef.current = 0;
    setTimedOut(false);
    await fetchPortfolio();
  };

  const handleRestartGeneration = async () => {
    setRetrying(true);
    try {
      await sessionsApi.regeneratePortfolio(Number(sessionId));
      pollAttemptsRef.current = 0;
      setFailedError(null);
      setTimedOut(false);
      setGenerating(true);
      toast.info("Regenerating AI candidate portfolio...", "Portfolio");
    } catch {
      setFailedError("Could not trigger portfolio regeneration. Please try again.");
      toast.error("Could not trigger portfolio regeneration.", "Error");
    } finally {
      setRetrying(false);
    }
  };

  const handleOverrideSaved = (skillId: number, override: AssessorOverride) => {
    setOverrides((prev) => ({ ...prev, [skillId]: override }));
  };

  const handleRunFitGap = () => {
    if (!selectedVacancy || !portfolio) return;
    navigate(`/assessments/${id}/sessions/${sessionId}/fitgap/${selectedVacancy}`);
  };

  const handleExport = async (format: "pdf" | "json") => {
    if (!portfolio) return;
    setExporting(format);
    try {
      const res = await portfoliosApi.exportPortfolio(
        portfolio.id,
        format,
        selectedVacancy ? Number(selectedVacancy) : undefined
      );
      if (format === "json") {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `portfolio-${sessionId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([res.data as BlobPart], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `portfolio-${sessionId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success(`Portfolio report downloaded as ${format.toUpperCase()}!`, "Export Complete");
    } catch {
      toast.error("Failed to export candidate portfolio.", "Export Error");
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading candidate portfolio"
        className="max-w-4xl mx-auto space-y-4"
      >
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const configuredAssessedSkills = portfolio?.skills.filter((s) => !s.is_discovered) ?? [];
  const discoveredSkills = portfolio?.skills.filter((s) => s.is_discovered) ?? [];
  const resolvedCandidateName =
    candidateName || portfolio?.session_summary?.candidate_name || null;
  const activeOverrideCount = Object.keys(overrides).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            to={`/assessments/${id}/invite`}
            aria-label="Back to assessment invites"
            className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="space-y-0.5 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Candidate Assessment Review
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Portfolio Results</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {resolvedCandidateName && (
                <span className="font-medium text-foreground break-words">
                  {resolvedCandidateName}
                </span>
              )}
              {resolvedCandidateName && assessmentName && (
                <span aria-hidden="true">·</span>
              )}
              {assessmentName && (
                <span className="break-words">{assessmentName}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            to={`/assessments/${id}/sessions/${sessionId}/transcript`}
            className="inline-flex items-center gap-1.5 text-xs font-medium border bg-background rounded-md px-3 h-8 hover:bg-accent transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Transcript
          </Link>
          {!generating && !timedOut && portfolio?.generation_status === "complete" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("pdf")}
                disabled={!!exporting}
              >
                {exporting === "pdf" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1" />
                )}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("json")}
                disabled={!!exporting}
              >
                {exporting === "json" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1" />
                )}
                JSON
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Not Found state */}
      {notFoundError && (
        <div role="alert" className="border border-destructive/40 bg-destructive/5 rounded-lg p-6 text-center space-y-3">
          <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">{notFoundError}</p>
          <Link
            to="/assessments"
            className="inline-flex items-center text-xs underline text-muted-foreground hover:text-foreground"
          >
            Return to assessments
          </Link>
        </div>
      )}

      {/* Generating state */}
      {generating && !timedOut && (
        <div role="status" aria-live="polite" className="border rounded-lg bg-card p-8 sm:p-12 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <div>
            <p className="font-medium">Generating portfolio...</p>
            <p className="text-sm text-muted-foreground mt-1">
              The AI is analyzing the interview transcript. This takes about 1–2 minutes.
            </p>
          </div>
        </div>
      )}

      {/* Polling Timeout state (role="status": not a confirmed backend failure) */}
      {timedOut && (
        <div
          role="status"
          aria-live="polite"
          className="border border-amber-300 bg-amber-50/60 rounded-lg p-6 text-center space-y-3"
        >
          <Clock className="h-6 w-6 text-amber-600 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900">
              Portfolio analysis is still processing in the background
            </p>
            <p className="text-xs text-amber-800">
              Automatic status polling has paused because analysis is taking longer than usual. You can check the latest status without starting a duplicate job, or restart generation.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleCheckStatusNow}>
              Check Status
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRestartGeneration}
              disabled={retrying}
            >
              {retrying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Restart Generation
            </Button>
          </div>
        </div>
      )}

      {/* Failed state */}
      {!generating && !timedOut && !notFoundError && (failedError || portfolio?.generation_status === "failed") && (
        <div role="alert" className="border border-destructive/40 bg-destructive/5 rounded-lg p-6 text-center space-y-3">
          <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">
            {failedError ?? "Portfolio generation failed."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestartGeneration}
            disabled={retrying}
          >
            {retrying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Retry Generation
          </Button>
        </div>
      )}

      {/* Ready state */}
      {!generating && !timedOut && !notFoundError && portfolio?.generation_status === "complete" && (
        <>
          {/* Session Coverage Banner */}
          {portfolio.session_summary && (
            <SessionCoverageBanner summary={portfolio.session_summary} />
          )}

          {/* Configured skills */}
          <section aria-label="Assessed configured skills" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold">
                  Assessed Configured Skills ({configuredAssessedSkills.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Skills that reached 2+ interview probes with behavioral evidence. Assessors can override any AI rating with a documented rationale.
                </p>
              </div>
              {activeOverrideCount > 0 && (
                <span className="inline-flex items-center text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {activeOverrideCount} human override{activeOverrideCount !== 1 ? "s" : ""} active
                </span>
              )}
            </div>
            {configuredAssessedSkills.length === 0 ? (
              <div className="border border-dashed rounded-lg p-5 text-xs text-muted-foreground text-center">
                No configured skills reached the minimum evidence threshold (2+ probes) during this session.
              </div>
            ) : (
              <div className="space-y-3">
                {configuredAssessedSkills.map((skill) => (
                  <SkillPortfolioCard
                    key={skill.id}
                    skill={skill}
                    override={overrides[skill.id]}
                    onOverrideSaved={(o) => handleOverrideSaved(skill.id, o)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Unassessed configured skills */}
          {portfolio.unassessed_skills && portfolio.unassessed_skills.length > 0 && (
            <>
              <Separator />
              <UnassessedSkillsSection skills={portfolio.unassessed_skills} />
            </>
          )}

          {/* Discovered skills */}
          {discoveredSkills.length > 0 && (
            <>
              <Separator />
              <section aria-label="Discovered skills" className="space-y-3">
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Discovered Skills ({discoveredSkills.length})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Skills the AI probed that were not in the original assessment
                  </p>
                </div>
                <div className="space-y-3">
                  {discoveredSkills.map((skill) => (
                    <SkillPortfolioCard
                      key={skill.id}
                      skill={skill}
                      override={overrides[skill.id]}
                      onOverrideSaved={(o) => handleOverrideSaved(skill.id, o)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

          <Separator />

          {/* Fit/Gap Next Action Card */}
          <Card className="bg-muted/25">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-primary" aria-hidden="true" />
                  Vacancy Fit/Gap Analysis
                </h2>
                <p className="text-xs text-muted-foreground">
                  Compare effective skill ratings (including any assessor overrides) against a target role&apos;s required levels.
                </p>
              </div>

              {vacancies.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No open vacancies available yet. Create a vacancy to run a Fit/Gap comparison.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <Select value={selectedVacancy} onValueChange={setSelectedVacancy}>
                    <SelectTrigger className="w-full sm:w-64 bg-background" aria-label="Select vacancy for Fit/Gap analysis">
                      <SelectValue placeholder="Choose vacancy..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vacancies.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.role_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleRunFitGap} disabled={!selectedVacancy} className="w-full sm:w-auto">
                    Run Fit/Gap Analysis →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}



