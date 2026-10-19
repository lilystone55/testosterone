import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";

import { API_BASE, apiClient } from "../../lib/api-client";
import { Badge, Button, Card, KeyValue, PageHeader, Spinner, StatusPill, TestPyramid } from "../../components/ui";
import { formatRunLabel } from "../../lib/format";
import { AI_SUMMARY_SNAPSHOT_MESSAGE, IS_STATIC_BUILD } from "../../lib/static-backend";

export function RunDetailPage() {
  const params = useParams();
  const runId = params.runId ?? "";
  const [artifactsExpanded, setArtifactsExpanded] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const runQuery = useQuery({
    queryKey: ["run", runId],
    queryFn: () => apiClient.getRun(runId),
    enabled: Boolean(runId)
  });
  const reportsQuery = useQuery({
    queryKey: ["reports", runId],
    queryFn: () => apiClient.getRunReports(runId),
    enabled: Boolean(runId)
  });
  const aiSummaryQuery = useQuery({
    queryKey: ["run-ai-summary", runId],
    queryFn: () => apiClient.getRunAiSummary(runId),
    enabled: Boolean(runId)
  });
  const pyramidQuery = useQuery({
    queryKey: ["run-pyramid", runId],
    queryFn: () => apiClient.getRunPyramid(runId),
    enabled: Boolean(runId)
  });

  if (!runId) {
    return <p className="text-sm text-danger-400">Missing run id.</p>;
  }
  if (runQuery.isLoading || reportsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-300">
        <Spinner /> Loading run details...
      </div>
    );
  }
  if (runQuery.isError || reportsQuery.isError || !runQuery.data || !reportsQuery.data) {
    return <p className="text-sm text-danger-400">Failed to load run details.</p>;
  }

  const run = runQuery.data.run;
  const reports = reportsQuery.data;

  return (
    <section className="space-y-4">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span>{formatRunLabel(run)}</span>
            <StatusPill status={run.status} returncode={run.returncode} />
          </span>
        }
        subtitle="Run Details"
        actions={
          <Link to="/runs">
            <Button variant="secondary" size="sm">
              Back to runs
            </Button>
          </Link>
        }
      />

      <Card title="Summary">
        <KeyValue
          items={[
            { label: "Run ID", value: <span className="font-mono text-xs">{run.run_id}</span> },
            { label: "Type", value: run.test_kind },
            { label: "Return code", value: <span className="font-mono">{run.returncode}</span> },
            { label: "Health", value: run.health_pct != null ? `${run.health_pct.toFixed(2)}%` : "n/a" },
            { label: "Wall duration", value: `${run.wall_duration_ms.toFixed(0)} ms` }
          ]}
        />
      </Card>

      <Card title="Report Links">
        {Object.keys(reports.static_links).length === 0 ? (
          <p className="text-sm text-ink-400">No reports for this run.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {Object.entries(reports.static_links).map(([name, url]) => (
              <li key={name}>
                <a href={`${API_BASE}/${url}`} target="_blank" rel="noreferrer" className="text-brand-300 hover:text-brand-400 hover:underline">
                  {name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Test Pyramid">
        {pyramidQuery.isLoading ? (
          <p className="text-sm text-ink-300">Loading test pyramid...</p>
        ) : pyramidQuery.isError || !pyramidQuery.data ? (
          <p className="text-sm text-danger-400">Failed to load test pyramid.</p>
        ) : (
          <TestPyramid {...pyramidQuery.data} />
        )}
      </Card>

      <Card title="Stage Health">
        {(run.stage_health ?? []).length === 0 ? (
          <p className="text-sm text-ink-400">Per-stage breakdown not available for this run.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(run.stage_health ?? []).map((stage) => (
              <li key={stage.name} className="flex items-center justify-between gap-2">
                <span className="text-ink-100">
                  {stage.name}
                  {stage.framework ? <span className="ml-2 text-xs text-ink-400">{stage.framework}</span> : null}
                </span>
                <span className="flex items-center gap-2">
                  {stage.total_tests != null && (
                    <span className="text-xs text-ink-400">
                      {stage.passed ?? 0}/{stage.total_tests}
                    </span>
                  )}
                  <Badge tone={stage.health_pct == null ? "neutral" : stage.health_pct >= 100 ? "success" : stage.health_pct > 0 ? "warn" : "danger"}>
                    {stage.health_pct != null ? `${stage.health_pct.toFixed(2)}%` : "n/a"}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {aiSummaryQuery.isLoading ? (
        <Card title="AI Failure Summary">
          <p className="text-sm text-ink-300">Loading AI summary...</p>
        </Card>
      ) : aiSummaryQuery.isError || !aiSummaryQuery.data ? null : (
        <Card title="AI Failure Summary">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{aiSummaryQuery.data.summary_text}</ReactMarkdown>
          </div>
        </Card>
      )}
    </section>
  );
}