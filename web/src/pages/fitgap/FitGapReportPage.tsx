import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import ComparisonTable from "@/components/fitgap/ComparisonTable";
import { portfoliosApi } from "@/services/portfolios";
import { sessionsApi } from "@/services/sessions";
import { usePolling } from "@/hooks/usePolling";
import { ArrowLeft, Download, Loader2, RefreshCw, Zap, AlertCircle, Clock } from "lucide-react";
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
  const [generating, setGenerating] = useState(false);
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
        setTimedOut(false);
        setFailedError(null);
        return;
      }

      if (data.status === "failed") {
        setGenerating(false);
        setTimedOut(false);
        setFailedError(
          data.message ?? "Fit/Gap report generation failed. Please retry generation."
        );
        return;
      }

      if (data.status === "generating") {
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
            await portfoliosApi.triggerFitGap(portfolio.id, targetVacancyId);
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
    sessionsApi
      .getPortfolio(Number(sessionId))
      .then((res) => {
        const data = res.data;
        if (data.portfolio) {
          setPortfolio(data.portfolio);
        } else {
          setNotFoundError("Portfolio is not ready yet for this session.");
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
  }, [sessionId]);

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
    } catch {
      setGenerating(false);
      setFailedError("Failed to trigger Fit/Gap regeneration. Please try again.");
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
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/assessments/${id}/sessions/${sessionId}/portfolio`}
              aria-label="Back to candidate portfolio"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg font-semibold">Fit/Gap Report</h1>
          </div>
        </div>

        {portfolio && !notFoundError && (
          <div className="flex flex-wrap gap-2">
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
        <div role="alert" className="border border-destructive/40 rounded-lg p-6 text-center space-y-3">
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
        <div role="status" aria-live="polite" className="border rounded-lg p-12 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Generating fit/gap report...</p>
        </div>
      )}

      {/* Polling Timeout */}
      {timedOut && !notFoundError && (
        <div role="alert" className="border border-amber-300 bg-amber-50/60 rounded-lg p-6 text-center space-y-3">
          <Clock className="h-6 w-6 text-amber-600 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900">
              Fit/Gap report generation is taking longer than expected
            </p>
            <p className="text-xs text-amber-800">
              Automatic status polling has paused. You can check the current status or restart generation.
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
        <div role="alert" className="border border-destructive/40 rounded-lg p-6 text-center space-y-3">
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
          {/* Overall Hiring Recommendation */}
          {report.overall_narrative && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Overall Hiring Recommendation</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                  {report.overall_narrative}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Skill comparison */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Skill Comparison</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ComparisonTable comparisons={report.skill_comparisons} />
            </CardContent>
          </Card>

          <Separator />

          {/* Culture & competency */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Culture &amp; Competency Fit</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                {report.culture_narrative || "No separate culture narrative was generated for this report."}
              </p>
            </CardContent>
          </Card>

          {/* Discovered skills */}
          {portfolio && portfolio.skills.some((s) => s.is_discovered) && (
            <>
              <Separator />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Discovered Skills (not in vacancy requirements)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {portfolio.skills
                    .filter((s) => s.is_discovered)
                    .map((s) => (
                      <div key={s.id} className="text-sm flex flex-wrap items-center gap-2">
                        <span className="font-medium break-words">{s.skill_label}</span>
                        <span className="text-muted-foreground">
                          {s.ai_level} ({s.ai_confidence?.toLowerCase() === "low" ? "low confidence" : "confirmed"})
                        </span>
                        <span className="text-xs text-muted-foreground">
                          — Not required for this role, may be additive.
                        </span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

