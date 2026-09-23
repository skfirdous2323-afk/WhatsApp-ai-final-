"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  ArrowUp,
  ArrowDown,
  Users,
  Zap,
  Target,
  Flame,
  ChevronRight,
  RefreshCw,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Stethoscope,
  CreditCard,
  FileText,
  Settings,
  Megaphone,
  PieChart as PieIcon,
  Minus,
  AlertTriangle,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
} from "recharts";

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

import { useTranslations } from "next-intl";

type RangeDays = 7 | 30 | 90;

// ==================== MAIN PAGE ====================

export default function DashboardPage() {
  const t = useTranslations("Dashboard.page");
  const { defaultCurrency: authCurrency } = useAuth();
  const defaultCurrency =
    authCurrency === "USD" || !authCurrency ? "INR" : authCurrency;

  const [metrics, setMetrics] = useState<MetricsBundle | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const [range, setRange] = useState<RangeDays>(30);
  const [series, setSeries] = useState<
    Record<RangeDays, ConversationsSeriesPoint[] | null>
  >({ 7: null, 30: null, 90: null });
  const [seriesLoading, setSeriesLoading] = useState(true);

  const [pipeline, setPipeline] = useState<PipelineDonutData | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(true);

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(
    null
  );
  const [responseTimeLoading, setResponseTimeLoading] = useState(true);

  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  // Clinic data
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [topDoctors, setTopDoctors] = useState<
    { id: string; name: string; count: number }[]
  >([]);

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
      .catch((err) => console.error("[dashboard] response failed:", err))
      .finally(() => setResponseTimeLoading(false));

    void loadActivity(db, 50)
      .then((a) => setActivity(a))
      .catch((err) => console.error("[dashboard] activity failed:", err))
      .finally(() => setActivityLoading(false));

    // Clinic-specific
    const todayKey = new Date().toLocaleDateString("en-CA");

    void db
      .from("appointments")
      .select(
        "id, patient_name, appointment_time, status, doctor_id, amount, payment_status, contact_id"
      )
      .eq("appointment_date", todayKey)
      .order("appointment_time", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("[dashboard] today appts:", error);
        setTodayAppointments(data || []);
        setAppointmentsLoading(false);
      });

    void db
      .from("appointments")
      .select("amount, payment_status, appointment_date")
      .then(({ data, error }) => {
        if (error) console.error("[dashboard] revenue:", error);
        const rows = data || [];
        const todayStr = todayKey;
        const today = rows
          .filter((r: any) => r.appointment_date === todayStr)
          .filter((r: any) => r.payment_status === "paid")
          .reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
        setTodayRevenue(today);

        const pending = rows
          .filter(
            (r: any) =>
              r.payment_status !== "paid" && r.amount && Number(r.amount) > 0
          )
          .reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
        setPendingPayments(pending);
      });

    void db
      .from("clinic_doctors")
      .select("id, doctor_name")
      .then(({ data, error }) => {
        if (error) console.error("[dashboard] doctors:", error);
        const docs = data || [];
        if (docs.length === 0) return;

        void db
          .from("appointments")
          .select("doctor_id")
          .then(({ data: appts }) => {
            const counts: Record<string, number> = {};
            (appts || []).forEach((a: any) => {
              if (a.doctor_id)
                counts[a.doctor_id] = (counts[a.doctor_id] || 0) + 1;
            });
            const top = docs
              .map((d: any) => ({
                id: d.id,
                name: d.doctor_name,
                count: counts[d.id] || 0,
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 4);
            setTopDoctors(top);
          });
      });
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

  const greeting = useMemo(() => getGreeting(), []);
  const today = useMemo(() => new Date(), []);

  const apptStats = useMemo(() => {
    const completed = todayAppointments.filter(
      (a) => a.status === "completed"
    ).length;
    const pending = todayAppointments.filter(
      (a) => a.status === "pending"
    ).length;
    const confirmed = todayAppointments.filter(
      (a) => a.status === "confirmed"
    ).length;
    const cancelled = todayAppointments.filter(
      (a) => a.status === "cancelled" || a.status === "canceled"
    ).length;
    return {
      total: todayAppointments.length,
      completed,
      pending,
      confirmed,
      cancelled,
    };
  }, [todayAppointments]);

  return (
    <div className="min-h-screen bg-slate-50/70">
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-6 lg:p-8">
        {/* ===== HEADER ===== */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Sparkles className="h-3 w-3" />
                {greeting.emoji} {greeting.label}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live · {apptStats.total} appointments today
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              {t("title")}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>
                {today.toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="text-slate-400">•</span>
              <span>{t("description")}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadAll}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/inbox"
              className="relative inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <span className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </span>
              <span className="hidden sm:inline">Inbox</span>
            </Link>
          </div>
        </header>

        {/* ===== BUSINESS KPI ===== */}
        <section className="space-y-3">
          <SectionHeader
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Today at a glance"
            description="Your clinic's live performance"
          />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <BizKpiCard
              label="Today's Collection"
              value={formatCurrency(todayRevenue, defaultCurrency)}
              hint="Paid appointments"
              icon={<CreditCard className="h-5 w-5" />}
              tone="emerald"
              href="/appointments"
            />
            <BizKpiCard
              label="Today's Appointments"
              value={String(apptStats.total)}
              hint={`${apptStats.completed} done · ${
                apptStats.pending + apptStats.confirmed
              } upcoming`}
              icon={<CalendarDays className="h-5 w-5" />}
              tone="blue"
              href="/appointments"
            />
            <BizKpiCard
              label="Pending Payments"
              value={formatCurrency(pendingPayments, defaultCurrency)}
              hint="To be collected"
              icon={<AlertCircle className="h-5 w-5" />}
              tone="amber"
              href="/appointments"
            />
            <BizKpiCard
              label="Active Chats"
              value={
                metrics
                  ? metrics.activeConversations.current.toLocaleString()
                  : "—"
              }
              hint="WhatsApp conversations"
              icon={<MessageCircle className="h-5 w-5" />}
              tone="violet"
              href="/inbox"
            />
          </div>
        </section>

        {/* ===== BUSINESS METRICS ===== */}
        <section className="space-y-3">
          <SectionHeader
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            label="Business Metrics"
            description="Comparing with previous period"
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
                  value={formatCurrency(
                    metrics.openDealsValue,
                    defaultCurrency
                  )}
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

        {/* ===== ACTION CENTER ===== */}
        <section className="space-y-3">
          <SectionHeader
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Action Center"
            description="What needs your attention right now"
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TodayScheduleCard
                appointments={todayAppointments}
                loading={appointmentsLoading}
                stats={apptStats}
                currency={defaultCurrency}
              />
            </div>
            <div>
              <QuickActionsCard />
            </div>
          </div>
        </section>

        {/* ===== TOP DOCTORS ===== */}
        {topDoctors.length > 0 && (
          <section className="space-y-3">
            <SectionHeader
              icon={<Stethoscope className="h-3.5 w-3.5" />}
              label="Doctor Performance"
              description="Appointment load distribution"
            />
            <TopDoctorsCard doctors={topDoctors} />
          </section>
        )}

        {/* ===== CHARTS ===== */}
        <section className="space-y-3">
          <SectionHeader
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Performance Analytics"
            description="Conversation trends and pipeline breakdown"
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="h-full lg:col-span-3">
              <ConversationsChartCard
                series={series}
                loading={seriesLoading}
                range={range}
                onRangeChange={handleRangeChange}
              />
            </div>
            <div className="h-full lg:col-span-2">
              <PipelineDonutCard
                data={pipeline}
                loading={pipelineLoading}
                currency={defaultCurrency}
              />
            </div>
          </div>
        </section>

        {/* ===== RESPONSE TIME ===== */}
        <section className="space-y-3">
          <SectionHeader
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Response Performance"
            description="How fast your team replies to patients"
          />
          <ResponseTimeCard data={responseTime} loading={responseTimeLoading} />
        </section>

        {/* ===== ACTIVITY ===== */}
        <section className="space-y-3">
          <SectionHeader
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Recent Activity"
            description="Latest events across your workspace"
          />
          <ActivityFeedCard items={activity} loading={activityLoading} />
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} — Built with care for your clinic</p>
          <p className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            All systems operational
          </p>
        </footer>
      </div>
    </div>
  );
}

// ==================== SECTION HEADER ====================

function SectionHeader({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600">
          {icon}
        </span>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {label}
          </h2>
          {description && (
            <p className="text-[11px] text-slate-500">{description}</p>
          )}
        </div>
      </div>
      <span className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  );
}

// ==================== BIZ KPI CARD ====================

function BizKpiCard({
  label,
  value,
  hint,
  icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: "emerald" | "blue" | "amber" | "violet";
  href: string;
}) {
  const tones = {
    emerald: {
      iconBg: "bg-emerald-100 text-emerald-600",
      accent: "from-emerald-500/5 to-transparent",
      border: "border-emerald-100",
    },
    blue: {
      iconBg: "bg-blue-100 text-blue-600",
      accent: "from-blue-500/5 to-transparent",
      border: "border-blue-100",
    },
    amber: {
      iconBg: "bg-amber-100 text-amber-600",
      accent: "from-amber-500/5 to-transparent",
      border: "border-amber-100",
    },
    violet: {
      iconBg: "bg-violet-100 text-violet-600",
      accent: "from-violet-500/5 to-transparent",
      border: "border-violet-100",
    },
  };
  const t = tones[tone];

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border ${t.border} bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.accent} opacity-60`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 truncate text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
            {value}
          </p>
          <p className="mt-1 truncate text-[11px] text-slate-500">{hint}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.iconBg}`}
        >
          {icon}
        </div>
      </div>
      <ArrowUpRight className="absolute bottom-3 right-3 h-4 w-4 text-slate-300 opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}

// ==================== METRIC CARD ====================

function MetricCard({
  title,
  value,
  icon: Icon,
  delta,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  delta?: { sign: number; label: string };
  subtitle?: string;
}) {
  const tone = delta
    ? delta.sign > 0
      ? "positive"
      : delta.sign < 0
      ? "negative"
      : "neutral"
    : "neutral";

  const toneStyles = {
    positive: {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: "bg-emerald-100 text-emerald-600",
      iconEl: <ArrowUp className="h-3 w-3" />,
    },
    negative: {
      badge: "border-red-200 bg-red-50 text-red-700",
      icon: "bg-red-100 text-red-600",
      iconEl: <ArrowDown className="h-3 w-3" />,
    },
    neutral: {
      badge: "border-slate-200 bg-slate-50 text-slate-600",
      icon: "bg-blue-100 text-blue-600",
      iconEl: <Minus className="h-3 w-3" />,
    },
  };

  const styles = toneStyles[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <p className="mt-2 truncate text-2xl font-bold leading-tight tracking-tight text-slate-900">
            {value}
          </p>
          {delta ? (
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}
              >
                {styles.iconEl}
                {delta.label}
              </span>
            </div>
          ) : subtitle ? (
            <p className="mt-2 truncate text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105 ${styles.icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ==================== SKELETON ====================

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <div className="h-2.5 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="h-7 w-20 animate-pulse rounded-md bg-slate-200" />
          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

// ==================== TODAY SCHEDULE ====================

function TodayScheduleCard({
  appointments,
  loading,
  stats,
  currency,
}: {
  appointments: any[];
  loading: boolean;
  stats: {
    total: number;
    completed: number;
    pending: number;
    confirmed: number;
    cancelled: number;
  };
  currency: string;
}) {
  const statusStyles: Record<string, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    completed: "border-blue-200 bg-blue-50 text-blue-700",
    cancelled: "border-red-200 bg-red-50 text-red-700",
    canceled: "border-red-200 bg-red-50 text-red-700",
    "no-show": "border-slate-200 bg-slate-100 text-slate-600",
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-white px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Today's Schedule
            </h3>
            <p className="text-[11px] text-slate-500">
              {stats.total} appointments ·{" "}
              <span className="font-semibold text-emerald-600">
                {stats.completed} completed
              </span>{" "}
              ·{" "}
              <span className="font-semibold text-blue-600">
                {stats.pending + stats.confirmed} upcoming
              </span>
            </p>
          </div>
        </div>
        <Link
          href="/appointments"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View All
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { label: "Completed", value: stats.completed, tone: "text-blue-600" },
          {
            label: "Confirmed",
            value: stats.confirmed,
            tone: "text-emerald-600",
          },
          { label: "Pending", value: stats.pending, tone: "text-amber-600" },
          {
            label: "Cancelled",
            value: stats.cancelled,
            tone: "text-red-500",
          },
        ].map((s) => (
          <div key={s.label} className="px-3 py-2.5 text-center">
            <p className={`text-lg font-bold leading-tight ${s.tone}`}>
              {s.value}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <CalendarDays className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">
              No appointments today
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Enjoy the calm — or book someone in.
            </p>
            <Link
              href="/appointments"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Book appointment
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.slice(0, 8).map((a) => {
              const statusKey = (a.status || "pending").toLowerCase();
              const style = statusStyles[statusKey] || statusStyles.pending;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70"
                >
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-sm font-bold text-slate-900">
                      {a.appointment_time}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {a.patient_name || "Patient"}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {a.amount
                        ? `${formatCurrency(
                            Number(a.amount),
                            currency
                          )} · ${a.payment_status || "pending"}`
                        : "No amount set"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${style}`}
                  >
                    {a.status || "pending"}
                  </span>
                </div>
              );
            })}
            {appointments.length > 8 && (
              <div className="px-4 py-3 text-center">
                <Link
                  href="/appointments"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  +{appointments.length - 8} more appointments
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== QUICK ACTIONS ====================

function QuickActionsCard() {
  const actions = [
    {
      href: "/inbox",
      label: "Open Inbox",
      icon: MessageSquare,
      tone: "blue",
    },
    {
      href: "/contacts",
      label: "Add Contact",
      icon: UserPlus,
      tone: "violet",
    },
    {
      href: "/appointments",
      label: "Book Appointment",
      icon: CalendarDays,
      tone: "emerald",
    },
    {
      href: "/payments",
      label: "Collect Payment",
      icon: CreditCard,
      tone: "amber",
    },
    {
      href: "/broadcasts",
      label: "Send Broadcast",
      icon: Megaphone,
      tone: "pink",
    },
    {
      href: "/reports",
      label: "View Reports",
      icon: FileText,
      tone: "cyan",
    },
    {
      href: "/analytics",
      label: "Analytics",
      icon: BarChart3,
      tone: "indigo",
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      tone: "slate",
    },
  ];

  const tones: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
    violet:
      "bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white",
    emerald:
      "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
    amber:
      "bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
    pink: "bg-pink-100 text-pink-600 group-hover:bg-pink-600 group-hover:text-white",
    cyan: "bg-cyan-100 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white",
    indigo:
      "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
    slate:
      "bg-slate-100 text-slate-600 group-hover:bg-slate-800 group-hover:text-white",
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-violet-50/60 to-white px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>
          <p className="text-[11px] text-slate-500">
            Jump to frequently used tasks
          </p>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2 p-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5 transition hover:border-slate-200 hover:bg-slate-50/60"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${tones[a.tone]}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="truncate text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                {a.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ==================== TOP DOCTORS ====================

function TopDoctorsCard({
  doctors,
}: {
  doctors: { id: string; name: string; count: number }[];
}) {
  const max = doctors[0]?.count || 1;
  const medals = ["🥇", "🥈", "🥉", "🏅"];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
        {doctors.map((d, i) => (
          <div
            key={d.id}
            className="flex items-center gap-3 p-4 transition hover:bg-slate-50/70"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm">
              {d.name
                .split(" ")
                .filter(
                  (w) =>
                    w.toLowerCase() !== "dr." && w.toLowerCase() !== "dr"
                )
                .map((w) => w.charAt(0))
                .slice(0, 2)
                .join("")
                .toUpperCase() || "D"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{medals[i] || "•"}</span>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {d.name}
                </p>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    style={{ width: `${(d.count / max) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {d.count}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== CONVERSATIONS CHART ====================

function ConversationsChartCard({
  series,
  loading,
  range,
  onRangeChange,
}: {
  series: Record<RangeDays, ConversationsSeriesPoint[] | null>;
  loading: boolean;
  range: RangeDays;
  onRangeChange: (r: RangeDays) => void;
}) {
  const data = series[range] || [];
  const ranges: RangeDays[] = [7, 30, 90];

  const total = useMemo(
    () => data.reduce((s, p: any) => s + (p.count || 0), 0),
    [data]
  );
  const avg = data.length ? Math.round(total / data.length) : 0;
  const peak = useMemo(() => {
    if (!data.length) return 0;
    return Math.max(...data.map((p: any) => p.count || 0));
  }, [data]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Conversations Trend
            </h3>
            <p className="text-[11px] text-slate-500">
              Message volume over time
            </p>
          </div>
        </div>
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                range === r
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-4 py-2.5 text-center">
          <p className="text-base font-bold leading-tight text-blue-600">
            {total.toLocaleString()}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Total
          </p>
        </div>
        <div className="px-4 py-2.5 text-center">
          <p className="text-base font-bold leading-tight text-violet-600">
            {avg.toLocaleString()}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Daily avg
          </p>
        </div>
        <div className="px-4 py-2.5 text-center">
          <p className="text-base font-bold leading-tight text-emerald-600">
            {peak.toLocaleString()}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Peak
          </p>
        </div>
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex h-[240px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[240px] flex-col items-center justify-center text-center">
            <TrendingUp className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-600">
              No data yet
            </p>
            <p className="text-xs text-slate-500">
              Trend will appear once messages flow in.
            </p>
          </div>
        ) : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="url(#lineGrad)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== PIPELINE DONUT ====================

function PipelineDonutCard({
  data,
  loading,
  currency,
}: {
  data: PipelineDonutData | null;
  loading: boolean;
  currency: string;
}) {
  const items = (data?.items || []) as Array<{
    label: string;
    value: number;
  }>;
  const COLORS = [
    "#3b82f6",
    "#8b5cf6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
  ];
  const total = useMemo(
    () => items.reduce((s, i) => s + (i.value || 0), 0),
    [items]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-violet-50/60 to-white px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
          <PieIcon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Pipeline</h3>
          <p className="text-[11px] text-slate-500">Deals by stage</p>
        </div>
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex h-[200px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-violet-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-[200px] flex-col items-center justify-center text-center">
            <Target className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-600">
              No pipeline data
            </p>
            <p className="text-xs text-slate-500">Deals will appear here.</p>
          </div>
        ) : (
          <>
            <div className="relative h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={items}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {items.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatCurrency(v, currency)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Total
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {formatCurrency(total, currency)}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {items.map((item, i) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="truncate font-medium text-slate-700">
                      {item.label}
                    </span>
                  </div>
                  <span className="shrink-0 font-bold text-slate-900">
                    {formatCurrency(item.value, currency)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ==================== RESPONSE TIME ====================

function ResponseTimeCard({
  data,
  loading,
}: {
  data: ResponseTimeSummary | null;
  loading: boolean;
}) {
  const buckets = ((data as any)?.buckets || []) as Array<{
    label: string;
    count: number;
  }>;
  const avgSeconds = (data as any)?.avgSeconds || 0;
  const medianSeconds = (data as any)?.medianSeconds || 0;

  const fmt = (s: number) =>
    s < 60
      ? `${Math.round(s)}s`
      : s < 3600
      ? `${Math.round(s / 60)}m`
      : `${(s / 3600).toFixed(1)}h`;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50/60 to-white px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Response Time</h3>
            <p className="text-[11px] text-slate-500">
              How fast you reply to patients
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Avg
            </p>
            <p className="text-sm font-bold text-emerald-600">
              {fmt(avgSeconds)}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Median
            </p>
            <p className="text-sm font-bold text-blue-600">
              {fmt(medianSeconds)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex h-[200px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
          </div>
        ) : buckets.length === 0 ? (
          <div className="flex h-[200px] flex-col items-center justify-center text-center">
            <Zap className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-600">
              No data yet
            </p>
            <p className="text-xs text-slate-500">
              Response stats will appear here.
            </p>
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={buckets}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    fontSize: 12,
                  }}
                  cursor={{ fill: "rgba(16,185,129,0.06)" }}
                />
                <Bar
                  dataKey="count"
                  fill="url(#barGrad)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== ACTIVITY FEED ====================

function ActivityFeedCard({
  items,
  loading,
}: {
  items: ActivityItem[] | null;
  loading: boolean;
}) {
  const [pageSize, setPageSize] = useState(10);
  const all = items || [];
  const visible = all.slice(0, pageSize);
  const PAGE_SIZES = [10, 25, 50];

  const getMeta = (item: any) => {
    const type = (item.type || "").toLowerCase();
    if (type.includes("message") || type.includes("chat"))
      return {
        icon: <MessageSquare className="h-4 w-4" />,
        bg: "bg-blue-100",
        color: "text-blue-600",
        defaultTitle: "New message",
      };
    if (type.includes("contact") || type.includes("lead"))
      return {
        icon: <UserPlus className="h-4 w-4" />,
        bg: "bg-violet-100",
        color: "text-violet-600",
        defaultTitle: "New contact",
      };
    if (type.includes("appointment") || type.includes("booking"))
      return {
        icon: <CalendarDays className="h-4 w-4" />,
        bg: "bg-emerald-100",
        color: "text-emerald-600",
        defaultTitle: "Appointment",
      };
    if (type.includes("deal") || type.includes("payment"))
      return {
        icon: <DollarSign className="h-4 w-4" />,
        bg: "bg-amber-100",
        color: "text-amber-600",
        defaultTitle: "Deal update",
      };
    if (type.includes("complete") || type.includes("done"))
      return {
        icon: <CheckCircle2 className="h-4 w-4" />,
        bg: "bg-emerald-100",
        color: "text-emerald-600",
        defaultTitle: "Completed",
      };
    if (type.includes("error") || type.includes("fail"))
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        bg: "bg-red-100",
        color: "text-red-600",
        defaultTitle: "Error",
      };
    return {
      icon: <Activity className="h-4 w-4" />,
      bg: "bg-slate-100",
      color: "text-slate-600",
      defaultTitle: "Activity",
    };
  };

  const relTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Recent Activity
            </h3>
            <p className="text-[11px] text-slate-500">
              Latest events across your workspace
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Show
          </span>
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {PAGE_SIZES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPageSize(n)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                  pageSize === n
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 p-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
            >
              <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-2.5 w-1/3 animate-pulse rounded-full bg-slate-200" />
                <div className="h-2 w-2/3 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : all.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Activity className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            No activity yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Events will appear as your team works.
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-100">
            {visible.map((item: any) => {
              const meta = getMeta(item);
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-slate-50/70"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg} ${meta.color}`}
                  >
                    {meta.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.title || meta.defaultTitle}
                    </p>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <time className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-400">
                    {relTime(item.created_at)}
                  </time>
                </div>
              );
            })}
          </div>
          {all.length > pageSize && (
            <div className="border-t border-slate-100 px-5 py-3 text-center">
              <p className="text-xs text-slate-500">
                Showing {visible.length} of {all.length}
              </p>
            </div>
          )}
        </>
      )}
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
