"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  IndianRupee,
  Search,
  CheckCircle2,
  Clock3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";

type PaymentRow = {
  id: string;
  patient_name: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  amount: number | null;
  payment_status: string | null;
  payment_method: string | null;
  paid_at: string | null;
};

type Tab = "paid" | "pending";

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

function isActiveAppointment(row: PaymentRow) {
  const status = (row.status || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  return !["cancelled", "no-show"].includes(status);
}

function isPaid(row: PaymentRow) {
  return row.payment_status?.trim().toLowerCase() === "paid";
}

function displayDate(value: string | null, fallback = "—") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function methodLabel(value: string | null) {
  if (!value) return "Not specified";
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ");
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function PaymentsReceivedPage() {
  const supabase = useMemo(() => createClient(), []);
  const { defaultCurrency: authCurrency } = useAuth();
  const currency = authCurrency === "USD" || !authCurrency ? "INR" : authCurrency;

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("paid");
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) throw new Error("Please login to view payments.");

      const { data: clinic, error: clinicError } = await supabase
        .from("clinics")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (clinicError || !clinic) {
        throw new Error("Clinic not found. Please check your clinic setup.");
      }

      const { data, error: paymentError } = await supabase
        .from("appointments")
        .select(
          "id, patient_name, appointment_date, appointment_time, status, amount, payment_status, payment_method, paid_at"
        )
        .eq("clinic_id", clinic.id)
        .order("appointment_date", { ascending: false });

      if (paymentError) throw paymentError;
      setRows((data || []) as PaymentRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payment report.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const now = new Date();
  const todayKey = localDateKey(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const paidRows = rows.filter(
    (row) => isActiveAppointment(row) && isPaid(row) && !!row.paid_at
  );

  const receivedToday = paidRows
    .filter((row) => localDateKey(new Date(row.paid_at!)) === todayKey)
    .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const thisMonth = paidRows
    .filter((row) => {
      const receivedAt = new Date(row.paid_at!);
      return receivedAt >= monthStart && receivedAt < nextMonthStart;
    })
    .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const lastMonth = paidRows
    .filter((row) => {
      const receivedAt = new Date(row.paid_at!);
      return receivedAt >= lastMonthStart && receivedAt < monthStart;
    })
    .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const growth =
    lastMonth > 0
      ? ((thisMonth - lastMonth) / lastMonth) * 100
      : thisMonth > 0
        ? null
        : 0;

  const pendingRows = rows.filter(
    (row) => isActiveAppointment(row) && !isPaid(row)
  );

  const filteredRows = (tab === "paid" ? paidRows : pendingRows)
    .filter((row) => {
      const name = (row.patient_name || "").toLowerCase();
      const matchesSearch = name.includes(search.trim().toLowerCase());
      const matchesMethod =
        method === "all" ||
        (row.payment_method || "").trim().toLowerCase() === method;
      const dateValue =
        tab === "paid" && row.paid_at
          ? localDateKey(new Date(row.paid_at))
          : row.appointment_date.slice(0, 10);
      const matchesFrom = !dateFrom || dateValue >= dateFrom;
      const matchesTo = !dateTo || dateValue <= dateTo;
      return matchesSearch && matchesMethod && matchesFrom && matchesTo;
    })
    .sort((a, b) => {
      const aDate = tab === "paid" ? a.paid_at || "" : a.appointment_date;
      const bDate = tab === "paid" ? b.paid_at || "" : b.appointment_date;
      return bDate.localeCompare(aDate);
    });

  const paymentMethods = Array.from(
    new Set(rows.map((row) => row.payment_method?.trim().toLowerCase()).filter(Boolean))
  ) as string[];

  const pendingAmount = filteredRows.reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0
  );

  const stats = [
    {
      label: "Today's Collection",
      value: receivedToday,
      icon: <Wallet size={20} />,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "This Month Collection",
      value: thisMonth,
      icon: <CreditCard size={20} />,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Last Month Collection",
      value: lastMonth,
      icon: <CalendarDays size={20} />,
      color: "bg-violet-50 text-violet-700",
    },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/customer-management"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Customer Management
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Payments Received
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your clinic's actual received payments and pending dues.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadPayments()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-500">{item.label}</p>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
                {item.icon}
              </span>
            </div>
            <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
              {formatCurrency(item.value, currency)}
            </p>
          </div>
        ))}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-500">Monthly Growth</p>
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                growth === null || growth >= 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {growth === null || growth >= 0 ? (
                <TrendingUp size={20} />
              ) : (
                <TrendingDown size={20} />
              )}
            </span>
          </div>
          <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
            {growth === null ? "New" : `${growth > 0 ? "+" : ""}${growth.toFixed(1)}%`}
          </p>
          <p className="mt-1 text-xs text-slate-500">Compared with last month</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Payment Transactions</h2>
            <p className="mt-1 text-xs text-slate-500">
              {tab === "paid"
                ? "Payments with a recorded received date."
                : "Active appointments where payment is not marked as paid."}
            </p>
          </div>
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTab("paid")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === "paid"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Paid ({paidRows.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("pending")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === "pending"
                  ? "bg-white text-amber-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Pending ({pendingRows.length})
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative sm:col-span-2 xl:col-span-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-500">
              From date {tab === "paid" ? "(received)" : "(appointment)"}
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-500">
              To date
            </span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-500">
              Payment method
            </span>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            >
              <option value="all">All methods</option>
              {paymentMethods.map((item) => (
                <option key={item} value={item}>
                  {methodLabel(item)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {(search || dateFrom || dateTo || method !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setDateFrom("");
              setDateTo("");
              setMethod("all");
            }}
            className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-semibold">Patient</th>
                <th className="px-3 py-3 font-semibold">Appointment</th>
                <th className="px-3 py-3 font-semibold">
                  {tab === "paid" ? "Received date" : "Payment status"}
                </th>
                <th className="px-3 py-3 font-semibold">Method</th>
                <th className="px-3 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-sm text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={17} className="animate-spin" />
                      Loading payment records...
                    </span>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      {tab === "paid" ? <CreditCard size={22} /> : <Clock3 size={22} />}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      No {tab === "paid" ? "received payments" : "pending payments"} found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Try changing your filters or check again later.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/80">
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-800">
                        {row.patient_name || "Unknown patient"}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        ID: {row.id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-sm font-medium text-slate-700">
                        {displayDate(row.appointment_date)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {row.appointment_time || "Time not set"}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      {tab === "paid" ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                          <CheckCircle2 size={15} />
                          {displayDate(row.paid_at)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
                          <Clock3 size={15} />
                          {row.payment_status || "Unpaid"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-600">
                      {methodLabel(row.payment_method)}
                    </td>
                    <td className="px-3 py-4 text-right font-bold text-slate-900">
                      {formatCurrency(Number(row.amount) || 0, currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            Showing {filteredRows.length} of{" "}
            {tab === "paid" ? paidRows.length : pendingRows.length} records
            {tab === "pending" && (
              <span className="ml-2 font-semibold text-amber-700">
                Pending amount: {formatCurrency(pendingAmount, currency)}
              </span>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        Collection totals are calculated from recorded payment received dates.
      </p>
    </div>
  );
}
