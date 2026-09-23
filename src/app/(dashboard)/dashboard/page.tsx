"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import {
  MessageSquare,
  UserPlus,
  DollarSign,
  Send,
  Bell,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Clock,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Users,
  Zap,
} from "lucide-react";

import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadPipelineDonut,
  loadResponseTime,
} from "@/lib/dashboard/queries";
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  PipelineDonutData,
  ResponseTimeSummary,
} from "@/lib/dashboard/types";

import { MetricCard } from "@/components/dashboard/metric-card";
import { SkeletonCard } from "@/components/dashboard/skeleton";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ConversationsChart } from "@/components/dashboard/conversations-chart";
import { PipelineDonut } from "@/components/dashboard/pipeline-donut";
import { ResponseTimeChart } from "@/components/dashboard/response-time-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

import { useTranslations } from "next-intl";

type RangeDays = 7 | 30 | 90;

export default function DashboardPage() {
  const t = useTranslations("Dashboard.page");
  const { defaultCurrency } = useAuth();
  const [metrics, setMetrics] = useState<MetricsBundle | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const [range, setRange] = useState<RangeDays>(30);
  const [series, setSeries] = useState<
    Record<RangeDays, ConversationsSeriesPoint[] | null>
  >({
    7: null,
    30: null,
    90: null,
  });
  const [seriesLoading, setSeriesLoading] = useState(true);

  const [pipeline, setPipeline] = useState<PipelineDonutData | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(true);

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(
    null
  );
  const [responseTimeLoading, setResponseTimeLoading] = useState(true);

  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  const loadAll = useCallback(() => {
    const db = createClient();

    void loadMetrics(db)
      .then((m) => setMetrics(m))
      .catch((err) => console.error("[dashboard] metrics failed:", err))
      .finally(() => setMetricsLoading(false));

    void loadConversationsSeries(db, 30)
      .then((s) => setSeries((prev) => ({ ...prev, 30: s })))
      .catch((err) => console.error("[dashboard] series failed:", err))
      .finally(() => setSeriesLoading(false));

    void loadPipelineDonut(db)
      .then((p) => setPipeline(p))
      .catch((err) => console.error("[dashboard] pipeline failed:", err))
      .finally(() => setPipelineLoading(false));

    void loadResponseTime(db)
      .then((r) => setResponseTime(r))
      .catch((err) => console.error("[dashboard] response time failed:", err))
      .finally(() => setResponseTimeLoading(false));

    void loadActivity(db, 50)
      .then((a) => setActivity(a))
      .catch((err) => console.error("[dashboard] activity failed:", err))
      .finally(() => setActivityLoading(false));
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r);
      if (series[r] !== null) return;
      setSeriesLoading(true);
      const db = createClient();
      loadConversationsSeries(db, r)
        .then((s) => setSeries((prev) => ({ ...prev, [r]: s })))
        .catch((err) => console.error("[dashboard] series failed:", err))
        .finally(() => setSeriesLoading(false));
    },
    [series]
  );

  const greeting = getGreeting();
  const today = new Date();

  return (
    <div className="space-y-6">
      {/* ============ HEADER ============ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              <Sparkles className="h-3 w-3" />
              {greeting.emoji} {greeting.label}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>
              {today.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span>{t("description")}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent"
            aria-label="Notifications"
          >
            <span className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />
            </span>
            <span className="hidden sm:inline">Notifications</span>
          </button>
        </div>
      </div>

      {/* ============ METRIC CARDS ============ */}
      <section className="space-y-3">
        <SectionLabel
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Overview"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metricsLoading || !metrics ? (
            Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          ) : (
            <>
              <MetricCard
                title={t("activeConversations")}
                value={metrics.activeConversations.current.toLocaleString()}
                icon={MessageSquare}
                delta={{
                  sign: metrics.activeConversations.previous,
                  label: deltaLabel(
                    metrics.activeConversations.previous,
                    t("newTodayVsYesterday"),
                    t("noChange", { suffix: t("newTodayVsYesterday") })
                  ),
                }}
              />
              <MetricCard
                title={t("newContactsToday")}
                value={metrics.newContactsToday.current.toLocaleString()}
                icon={UserPlus}
                delta={{
                  sign:
                    metrics.newContactsToday.current -
                    metrics.newContactsToday.previous,
                  label: deltaLabel(
                    metrics.newContactsToday.current -
                      metrics.newContactsToday.previous,
                    t("vsYesterday"),
                    t("noChange", { suffix: t("vsYesterday") })
                  ),
                }}
              />
              <MetricCard
                title={t("openDealsValue")}
                value={formatCurrency(metrics.openDealsValue, defaultCurrency)}
                icon={DollarSign}
                subtitle={t("openDeals", { count: metrics.openDealsCount })}
              />
              <MetricCard
                title={t("messagesSentToday")}
                value={metrics.messagesSentToday.current.toLocaleString()}
                icon={Send}
                delta={{
                  sign:
                    metrics.messagesSentToday.current -
                    metrics.messagesSentToday.previous,
                  label: deltaLabel(
                    metrics.messagesSentToday.current -
                      metrics.messagesSentToday.previous,
                    t("vsYesterday"),
                    t("noChange", { suffix: t("vsYesterday") })
                  ),
                }}
              />
            </>
          )}
        </div>
      </section>

      {/* ============ SNAPSHOT STRIP ============ */}
      {!metricsLoading && metrics && (
        <SnapshotStrip
          metrics={metrics}
          defaultCurrency={defaultCurrency}
        />
      )}

      {/* ============ QUICK ACTIONS ============ */}
      <section className="space-y-3">
        <SectionLabel icon={<Sparkles className="h-3.5 w-3.5" />} label="Quick Actions" />
        <QuickActions />
      </section>

      {/* ============ CHARTS ROW ============ */}
      <section className="space-y-3">
        <SectionLabel
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Performance"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="h-full lg:col-span-3">
            <ConversationsChart
              series={series}
              loading={seriesLoading}
              range={range}
              onRangeChange={handleRangeChange}
            />
          </div>
          <div className="h-full lg:col-span-2">
            <PipelineDonut
              data={pipeline}
              loading={pipelineLoading}
              currency={defaultCurrency}
            />
          </div>
        </div>
      </section>

      {/* ============ RESPONSE TIME ============ */}
      <section className="space-y-3">
        <SectionLabel
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Response Time"
        />
        <ResponseTimeChart
          data={responseTime}
          loading={responseTimeLoading}
        />
      </section>

      {/* ============ ACTIVITY FEED ============ */}
      <section className="space-y-3">
        <SectionLabel
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Recent Activity"
        />
        <ActivityFeed items={activity} loading={activityLoading} />
      </section>
    </div>
  );
}

// ==================== SUB COMPONENTS ====================

function SectionLabel({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="ml-2 h-px flex-1 bg-border" />
    </div>
  );
}

function SnapshotStrip({
  metrics,
  defaultCurrency,
}: {
  metrics: MetricsBundle;
  defaultCurrency: string;
}) {
  const items = [
    {
      label: "Active chats",
      value: metrics.activeConversations.current.toLocaleString(),
      icon: <MessageSquare className="h-4 w-4" />,
      accent: "text-blue-600 bg-blue-50 border-blue-100",
      trend:
        metrics.activeConversations.previous > 0 ? "up" : "flat",
    },
    {
      label: "New contacts",
      value: metrics.newContactsToday.current.toLocaleString(),
      icon: <Users className="h-4 w-4" />,
      accent: "text-violet-600 bg-violet-50 border-violet-100",
      trend:
        metrics.newContactsToday.current - metrics.newContactsToday.previous >
        0
          ? "up"
          : metrics.newContactsToday.current -
              metrics.newContactsToday.previous <
            0
          ? "down"
          : "flat",
    },
    {
      label: "Open deals",
      value: metrics.openDealsCount.toLocaleString(),
      icon: <DollarSign className="h-4 w-4" />,
      accent: "text-emerald-600 bg-emerald-50 border-emerald-100",
      trend: "flat",
    },
    {
      label: "Pipeline value",
      value: formatCurrency(metrics.openDealsValue, defaultCurrency),
      icon: <TrendingUp className="h-4 w-4" />,
      accent: "text-amber-600 bg-amber-50 border-amber-100",
      trend: "flat",
    },
    {
      label: "Messages sent",
      value: metrics.messagesSentToday.current.toLocaleString(),
      icon: <Send className="h-4 w-4" />,
      accent: "text-pink-600 bg-pink-50 border-pink-100",
      trend:
        metrics.messagesSentToday.current -
          metrics.messagesSentToday.previous >
        0
          ? "up"
          : metrics.messagesSentToday.current -
              metrics.messagesSentToday.previous <
            0
          ? "down"
          : "flat",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex divide-x divide-border overflow-x-auto">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex min-w-[160px] flex-1 items-center gap-3 px-4 py-3.5 transition hover:bg-accent/40"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${item.accent}`}
            >
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <div className="flex items-center gap-1.5">
                <p className="text-lg font-bold leading-tight text-foreground">
                  {item.value}
                </p>
                {item.trend === "up" && (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                )}
                {item.trend === "down" && (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== HELPERS ====================

function deltaLabel(
  delta: number,
  suffix: string,
  noChangeLabel: string
): string {
  if (delta === 0) return noChangeLabel;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toLocaleString()} ${suffix}`;
}

function getGreeting(): { emoji: string; label: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { emoji: "☀️", label: "Good morning" };
  if (hour < 17) return { emoji: "🌤️", label: "Good afternoon" };
  if (hour < 21) return { emoji: "🌆", label: "Good evening" };
  return { emoji: "🌙", label: "Working late" };
}
