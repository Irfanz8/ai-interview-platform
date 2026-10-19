import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import ComparisonTable from "@/components/fitgap/ComparisonTable";
import LevelBadge from "@/components/portfolio/LevelBadge";
import { portfoliosApi } from "@/services/portfolios";
import { sessionsApi } from "@/services/sessions";
import { vacanciesApi } from "@/services/vacancies";
import { usePolling } from "@/hooks/usePolling";
import { parseLevel, LEVEL_DESCRIPTIONS } from "@/utils/constants";
import {
  ArrowLeft,
  Download,
  Loader2,
  RefreshCw,
  Zap,
  AlertCircle,
  Clock,
  Info,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import type { FitGapReport, Portfolio } from "@/types";

const MAX_POLL_ATTEMPTS = 12;

export default function FitGapReportPage() {
  const { id, sessionId, vacancyId } = useParams<{
    id: string;
    sessionId: string;
    vacancyId: string;
  }>();

  const [report, setReport] = useState<FitGapReport | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [vacancyTitle, setVacancyTitle] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [isStaleRefresh, setIsStaleRefresh] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [failedError, setFailedError] = useState<string | null>(null);
  const [notFoundError, setNotFoundError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "json" | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const pollAttemptsRef = useRef(0);
  const hasTriggeredRef = useRef<string | null>(null);
  const latestRequestIdRef = useRef(0);

  const fetchReport = useCallback(async () => {
    if (!portfolio) return;
    const targetVacancyId = Number(vacancyId);
    const triggerKey = `${portfolio.id}:${targetVacancyId}`;
    const requestId = ++latestRequestIdRef.current;

    try {
      const res = await portfoliosApi.getFitGap(portfolio.id, targetVacancyId);
      if (requestId !== latestRequestIdRef.current) return;

      const data = res.data;
      setNotFoundError(null);

      if (data.status === "ready" && data.report) {
        pollAttemptsRef.current = 0;
        setReport(data.report);
        setGenerating(false);
        setIsStaleRefresh(false);
        setTimedOut(false);
        setFailedError(null);
        return;
      }

      if (data.status === "failed") {
        setGenerating(false);
        setIsStaleRefresh(false);
        setTimedOut(false);
        setFailedError(
          data.message ?? "Fit/Gap report generation failed. Please retry generation."
        );
        return;
      }

      if (data.status === "generating") {
        setIsStaleRefresh(!!data.stale);
        pollAttemptsRef.current += 1;
        if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
          setGenerating(false);
          setTimedOut(true);
        } else {
          setGenerating(true);
          setTimedOut(false);
          setFailedError(null);
        }
        return;
      }

      if (data.status === "not_generated") {
        if (hasTriggeredRef.current !== triggerKey) {
          hasTriggeredRef.current = triggerKey;
          pollAttemptsRef.current = 0;
          setGenerating(true);
          setTimedOut(false);
          setFailedError(null);
          try {
            const triggerRes = await portfoliosApi.triggerFitGap(portfolio.id, targetVacancyId);
            if (requestId !== latestRequestIdRef.current) return;
            if (triggerRes.data?.status === "ready" && triggerRes.data?.report) {
              setReport(triggerRes.data.report);
              setGenerating(false);
            }
          } catch (triggerErr: unknown) {
            if (requestId !== latestRequestIdRef.current) return;
            const triggerStatus = (triggerErr as { response?: { status?: number } })?.response?.status;
            setGenerating(false);
            if (triggerStatus === 404) {
              setNotFoundError("The requested portfolio or vacancy could not be found in your workspace.");
            } else {
              setFailedError("Could not start Fit/Gap report generation. Please retry.");
            }
          }
        } else {
          setGenerating(true);
        }
      }
    } catch (e: unknown) {
      if (requestId !== latestRequestIdRef.current) return;
      const status = (e as { response?: { status?: number } })?.response?.status;
      setGenerating(false);
      setTimedOut(false);
      if (status === 404) {
        // 404 is terminal: parent portfolio or vacancy does not exist in tenant scope.
        // Never auto-trigger POST /fitgap on 404.
        setNotFoundError("The requested portfolio or vacancy was not found in your workspace.");
      } else {
        setFailedError("Unable to load Fit/Gap report status. Please try again.");
      }
    }
  }, [portfolio, vacancyId]);

  useEffect(() => {
    setLoading(true);
    setNotFoundError(null);
    setFailedError(null);
    Promise.all([
      sessionsApi.getPortfolio(Number(sessionId)),
      vacanciesApi.list().catch(() => null),
    ])
      .then(([res, vRes]) => {
        const data = res.data;
        if (data.portfolio) {
          setPortfolio(data.portfolio);
        } else {
          setNotFoundError("Portfolio is not ready yet for this session.");
        }
        const matchedVacancy = vRes?.data?.vacancies?.find(
          (v) => v.id === Number(vacancyId)
        );
        if (matchedVacancy) {
          setVacancyTitle(matchedVacancy.role_title);
        }
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setNotFoundError("Session or portfolio was not found in your workspace.");
        } else {
          setFailedError("Unable to load candidate portfolio.");
        }
      })
      .finally(() => setLoading(false));
  }, [sessionId, vacancyId]);

  useEffect(() => {
    if (portfolio) {
      pollAttemptsRef.current = 0;
      fetchReport();
    }
  }, [portfolio, fetchReport]);

  usePolling(fetchReport, 5000, generating && !timedOut && !!portfolio);

  const handleCheckStatusNow = async () => {
    pollAttemptsRef.current = 0;
    setTimedOut(false);
    await fetchReport();
  };

  const handleRegenerate = async () => {
    if (!portfolio) return;
    setRegenerating(true);
    setFailedError(null);
    setTimedOut(false);
    try {
      await portfoliosApi.regenerateFitGap(portfolio.id, Number(vacancyId));
      pollAttemptsRef.current = 0;
      setReport(null);
      setGenerating(true);
      toast.info("Regenerating vacancy alignment report...", "Fit/Gap Report");
    } catch {
      setGenerating(false);
      setFailedError("Failed to trigger Fit/Gap regeneration. Please try again.");
      toast.error("Failed to trigger Fit/Gap regeneration.", "Error");
    } finally {
      setRegenerating(false);
    }
  };

  const handleExport = async (format: "pdf" | "json") => {
    if (!portfolio) return;
    setExporting(format);
    try {
      const res = await portfoliosApi.exportPortfolio(portfolio.id, format, Number(vacancyId));
      const ext = format;
      const blob =
        format === "pdf"
          ? new Blob([res.data as BlobPart], { type: "application/pdf" })
          : new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fitgap-${sessionId}-${vacancyId}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Fit/Gap report downloaded as ${format.toUpperCase()}!`, "Export Complete");
    } catch {
      toast.error("Export failed. Please try again.", "Export Error");
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading Fit/Gap report"
        className="max-w-4xl mx-auto space-y-4"
      >
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const candidateName = portfolio?.session_summary?.candidate_name ?? null;
  const comparisons = report?.skill_comparisons ?? [];
  const notAssessedCount = comparisons.filter((c) => c.result === "not_assessed").length;
  const totalRequiredCount = comparisons.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            to={`/assessments/${id}/sessions/${sessionId}/portfolio`}
            aria-label="Back to candidate portfolio"
            className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="space-y-0.5 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Vacancy Alignment Analysis
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Fit/Gap Report</h1>
            {(candidateName || vacancyTitle) && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {candidateName && (
                  <span className="font-medium text-foreground break-words">
                    {candidateName}
                  </span>
                )}
                {candidateName && vacancyTitle && <span aria-hidden="true">→</span>}
                {vacancyTitle && (
                  <span className="font-medium text-primary break-words">
                    {vacancyTitle}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {portfolio && !notFoundError && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating || generating}
            >
              {regenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
              )}
              Regenerate
            </Button>
            {report && !generating && (
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
        )}
      </div>

      {/* Terminal 404 / Not Found state */}
      {notFoundError && (
        <div role="alert" className="border border-destructive/40 bg-destructive/5 rounded-lg p-6 text-center space-y-3">
          <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">{notFoundError}</p>
          <Link
            to={`/assessments/${id}/sessions/${sessionId}/portfolio`}
            className="inline-flex items-center text-xs underline text-muted-foreground hover:text-foreground"
          >
            Return to portfolio
          </Link>
        </div>
      )}

      {/* Generating */}
      {generating && !timedOut && !notFoundError && (
        <div role="status" aria-live="polite" className="border rounded-lg bg-card p-8 sm:p-12 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <div className="space-y-1">
            <p className="font-medium text-sm">Generating fit/gap report...</p>
            {isStaleRefresh && (
              <p className="text-xs text-muted-foreground">
                Refreshing comparison and narrative after a recent assessor override.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Polling Timeout (role="status": not a confirmed backend failure) */}
      {timedOut && !notFoundError && (
        <div
          role="status"
          aria-live="polite"
          className="border border-amber-300 bg-amber-50/60 rounded-lg p-6 text-center space-y-3"
        >
          <Clock className="h-6 w-6 text-amber-600 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900">
              Fit/Gap report analysis is still processing in the background
            </p>
            <p className="text-xs text-amber-800">
              Automatic status polling has paused because generation is taking longer than usual. You can check the latest status without queueing a duplicate job, or restart generation.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleCheckStatusNow}>
              Check Status
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              {regenerating ? (
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
      {!generating && !timedOut && !notFoundError && failedError && (
        <div role="alert" className="border border-destructive/40 bg-destructive/5 rounded-lg p-6 text-center space-y-3">
          <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">{failedError}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Retry Generation
          </Button>
        </div>
      )}

      {/* Report ready */}
      {!generating && !timedOut && !notFoundError && !failedError && report && (
        <>
          {/* Partial Coverage Caveat when unassessed skills exist */}
          {notAssessedCount > 0 && (
            <div
              role="note"
              aria-label="Partial interview coverage notice"
              className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 text-xs text-amber-900"
            >
              <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="leading-relaxed">
                <span className="font-semibold">Partial coverage note:</span>{" "}
                {notAssessedCount} of {totalRequiredCount} required role skill
                {totalRequiredCount !== 1 ? "s" : ""} lacked sufficient interview turns (0–1 probes) and{" "}
                {notAssessedCount === 1 ? "is" : "are"} marked{" "}
                <span className="font-semibold">Not assessed</span> rather than penalized as a confirmed skill gap.
              </p>
            </div>
          )}

          {/* Narratives Grid: Overall Hiring Recommendation & Culture & Competency Fit */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {report.overall_narrative && (
              <Card className="border-primary/25 bg-primary/[0.02]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Overall Hiring Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                    {report.overall_narrative}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className={!report.overall_narrative ? "lg:col-span-2" : undefined}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Culture &amp; Competency Fit
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                  {report.culture_narrative || "No separate culture narrative was generated for this report."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Skill comparison */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Skill Comparison</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ComparisonTable comparisons={report.skill_comparisons} />
            </CardContent>
          </Card>

          {/* Discovered skills */}
          {portfolio && portfolio.skills.some((s) => s.is_discovered) && (
            <>
              <Separator />
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Discovered Skills (not in vacancy requirements)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2.5">
                  {portfolio.skills
                    .filter((s) => s.is_discovered)
                    .map((s) => {
                      const override = portfolio.overrides.find(
                        (o) => o.portfolio_skill_id === s.id
                      );
                      const effectiveLevel =
                        override?.override_level ?? parseLevel(s.ai_level);
                      return (
                        <div
                          key={s.id}
                          className="text-sm flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <LevelBadge level={effectiveLevel} size="sm" />
                            <span className="font-medium break-words">
                              {s.skill_label}
                            </span>
                            {LEVEL_DESCRIPTIONS[effectiveLevel] && (
                              <span className="text-xs text-muted-foreground">
                                ({LEVEL_DESCRIPTIONS[effectiveLevel]})
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {override
                              ? `Human override applied (AI L${parseLevel(s.ai_level)} → L${effectiveLevel})`
                              : s.ai_confidence?.toLowerCase() === "low"
                              ? "Low AI confidence"
                              : "Assessed outside role rubric"}
                          </span>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}



