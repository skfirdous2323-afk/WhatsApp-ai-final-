"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ContactForm } from "@/components/contacts/contact-form";
import {
  Search,
  Plus,
  Users,
  UserRound,
  CalendarDays,
  Clock,
  Phone,
  Mail,
  MessageCircle,
  RefreshCw,
  Loader2,
  ChevronRight,
  UserPlus,
  Activity,
  CalendarCheck,
  X,
  Ban,
  Trash2,
} from "lucide-react";

type Customer = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  contact_id: string | null;
  patient_name: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  doctor_id?: string | null;
  service_id?: string | null;
  amount?: number | null;
  payment_status?: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const initials = (name?: string | null) =>
  (name || "Patient")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const statusClass = (status: string) => {
  const value = status.toLowerCase();
  if (value === "confirmed" || value === "completed")
    return "bg-emerald-50 text-emerald-700";
  if (value === "cancelled" || value === "no-show")
    return "bg-red-50 text-red-600";
  return "bg-amber-50 text-amber-700";
};

export default function CustomerManagementPage() {
  const supabase = useMemo(() => createClient(), []);
  const { accountId } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "followup">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [appointmentRange, setAppointmentRange] = useState<"upcoming" | "last7" | "month">("upcoming");
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<string[]>([]);
  const [appointmentActionLoading, setAppointmentActionLoading] = useState(false);
  const [appointmentActionError, setAppointmentActionError] = useState("");
  const [appointmentActionMessage, setAppointmentActionMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("Please sign in again to view your customers.");
        setCustomers([]);
        setAppointments([]);
        return;
      }

      if (!accountId) {
        setCustomers([]);
        setAppointments([]);
        setError("Your workspace is still loading. Please refresh in a moment.");
        return;
      }

      const { data: contactData, error: contactError } = await supabase
        .from("contacts")
        .select("id, name, phone, email, company, created_at")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });

      if (contactError) throw contactError;

      const { data: clinic, error: clinicError } = await supabase
        .from("clinics")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let appointmentData: Appointment[] = [];

      if (!clinicError && clinic?.id) {
        const { data, error: appointmentError } = await supabase
          .from("appointments")
          .select(
            "id, contact_id, patient_name, appointment_date, appointment_time, status, doctor_id, service_id, amount, payment_status"
          )
          .eq("clinic_id", clinic.id)
          .order("appointment_date", { ascending: false });

        if (appointmentError) {
          console.error("Customer appointments could not be loaded:", appointmentError);
        } else {
          appointmentData = (data || []) as Appointment[];
        }
      }

      const loadedCustomers = (contactData || []) as Customer[];
      setCustomers(loadedCustomers);
      setAppointments(appointmentData);
      setSelected((current) =>
        current
          ? loadedCustomers.find((item) => item.id === current.id) || null
          : loadedCustomers[0] || null
      );
    } catch (err) {
      console.error("Customer Management load error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Customers could not be loaded. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, accountId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const recentBoundary = new Date(today);
  recentBoundary.setDate(recentBoundary.getDate() - 30);

  const customerAppointments = (customerId: string) =>
    appointments
      .filter(
        (appointment) =>
          appointment.contact_id === customerId ||
          (!appointment.contact_id &&
            appointments.filter(
              (item) => item.patient_name === appointment.patient_name
            ).length === 1 &&
            appointment.patient_name?.trim().toLowerCase() ===
              customers
                .find((customer) => customer.id === customerId)
                ?.name?.trim()
                .toLowerCase())
      )
      .sort((a, b) => {
        const first = `${a.appointment_date} ${a.appointment_time || ""}`;
        const second = `${b.appointment_date} ${b.appointment_time || ""}`;
        return second.localeCompare(first);
      });

  const filteredCustomers = customers.filter((customer) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      (customer.name || "").toLowerCase().includes(term) ||
      customer.phone.toLowerCase().includes(term) ||
      (customer.email || "").toLowerCase().includes(term);

    const isNew = new Date(customer.created_at) >= recentBoundary;
    const history = customerAppointments(customer.id);
    const hasFollowup = history.some((appointment) => {
      const date = new Date(appointment.appointment_date);
      return (
        date < today &&
        !["cancelled", "no-show"].includes(appointment.status.toLowerCase())
      );
    });

    return (
      matchesSearch &&
      (filter === "all" ||
        (filter === "new" && isNew) ||
        (filter === "followup" && hasFollowup))
    );
  });

  const newCustomers = customers.filter(
    (customer) => new Date(customer.created_at) >= recentBoundary
  ).length;

  const followups = customers.filter((customer) =>
    customerAppointments(customer.id).some((appointment) => {
      const date = new Date(appointment.appointment_date);
      return (
        date < today &&
        !["cancelled", "no-show"].includes(appointment.status.toLowerCase())
      );
    })
  ).length;

  const selectedAppointments = selected
    ? customerAppointments(selected.id)
    : [];

  const upcomingAppointments = selectedAppointments.filter((appointment) => {
    const date = new Date(appointment.appointment_date);
    return (
      date >= today &&
      !["cancelled", "no-show"].includes(appointment.status.toLowerCase())
    );
  });

  // Calendar-based appointment ranges use local dates to avoid UTC boundary shifts.
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const last7DaysBoundary = new Date(today);
  last7DaysBoundary.setDate(last7DaysBoundary.getDate() - 6);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const activeAppointment = (appointment: Appointment) =>
    !["cancelled", "no-show"].includes(
      appointment.status.trim().toLowerCase().replace(/[_\s]+/g, "-")
    );

  const appointmentDate = (appointment: Appointment) => {
    const [year, month, day] = appointment.appointment_date
      .slice(0, 10)
      .split("-")
      .map(Number);
    return new Date(year, month - 1, day);
  };

  const rangeAppointments = appointments.filter((appointment) => {
    const date = appointmentDate(appointment);

    if (appointmentRange === "upcoming") {
      return date >= today && activeAppointment(appointment);
    }

    if (appointmentRange === "last7") {
      return date >= last7DaysBoundary && date < tomorrow;
    }

    return date >= monthStart && date < nextMonthStart;
  });

  const allVisibleAppointmentsSelected =
    rangeAppointments.length > 0 &&
    rangeAppointments.every((appointment) => selectedAppointmentIds.includes(appointment.id));

  const toggleAppointmentSelection = (id: string) => {
    setSelectedAppointmentIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
    setAppointmentActionError("");
    setAppointmentActionMessage("");
  };

  const toggleSelectAllAppointments = () => {
    setSelectedAppointmentIds((current) =>
      allVisibleAppointmentsSelected
        ? current.filter((id) => !rangeAppointments.some((appointment) => appointment.id === id))
        : Array.from(new Set([...current, ...rangeAppointments.map((appointment) => appointment.id)]))
    );
    setAppointmentActionError("");
    setAppointmentActionMessage("");
  };

  const handleAppointmentAction = async (action: "cancel" | "delete", ids: string[]) => {
    if (appointmentActionLoading || ids.length === 0) return;
    const confirmed = window.confirm(
      action === "delete"
        ? `Permanently delete ${ids.length} appointment(s)? This cannot be undone.`
        : `Cancel ${ids.length} appointment(s)? Their records will remain in history.`
    );
    if (!confirmed) return;

    setAppointmentActionLoading(true);
    setAppointmentActionError("");
    setAppointmentActionMessage("");
    try {
      const response = await fetch("/api/appointments/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not update appointments.");
      }
      setSelectedAppointmentIds((current) => current.filter((id) => !ids.includes(id)));
      setAppointmentActionMessage(
        `${result.count} appointment(s) ${action === "cancel" ? "cancelled" : "deleted"}.`
      );
      await loadData();
    } catch (error) {
      setAppointmentActionError(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setAppointmentActionLoading(false);
    }
  };

  return (
    <main className="min-h-full bg-[#f5f8fc] p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
              <Users size={16} />
              <span>CRM / Customer Management</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Customer Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your patients, appointments and customer relationships.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Customer
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Customers"
            value={customers.length}
            detail="All saved contacts"
            icon={<Users size={20} />}
            iconClass="bg-blue-50 text-blue-600"
          />
          <SummaryCard
            label="New Customers"
            value={newCustomers}
            detail="Added in the last 30 days"
            icon={<UserPlus size={20} />}
            iconClass="bg-violet-50 text-violet-600"
          />
          <SummaryCard
            label="Appointments"
            value={appointments.length}
            detail="Available clinic records"
            icon={<CalendarCheck size={20} />}
            iconClass="bg-emerald-50 text-emerald-600"
          />
          <SummaryCard
            label="Follow-ups Due"
            value={followups}
            detail="Past appointments to review"
            icon={<Activity size={20} />}
            iconClass="bg-amber-50 text-amber-600"
          />
        </section>

        {error && (
          <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadData()}
              className="font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Appointment Overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review clinic appointments by date range.
                </p>
              </div>
              <span className="text-sm font-medium text-slate-500">
                {rangeAppointments.length} appointments
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([
                {
                  id: "upcoming",
                  label: "Upcoming Appointments",
                  count: appointments.filter((appointment) => {
                    const date = appointmentDate(appointment);
                    return date >= today && activeAppointment(appointment);
                  }).length,
                  detail: "Today and future",
                },
                {
                  id: "last7",
                  label: "Last 7 Days",
                  count: appointments.filter((appointment) => {
                    const date = appointmentDate(appointment);
                    return date >= last7DaysBoundary && date < tomorrow;
                  }).length,
                  detail: "Including today",
                },
                {
                  id: "month",
                  label: "This Month",
                  count: appointments.filter((appointment) => {
                    const date = appointmentDate(appointment);
                    return date >= monthStart && date < nextMonthStart;
                  }).length,
                  detail: "Current calendar month",
                },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setAppointmentRange(item.id);
                    setSelectedAppointmentIds([]);
                    setAppointmentActionError("");
                    setAppointmentActionMessage("");
                  }}
                  aria-pressed={appointmentRange === item.id}
                  className={`rounded-xl border p-4 text-left transition ${
                    appointmentRange === item.id
                      ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                      : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      {item.label}
                    </span>
                    <CalendarDays size={17} className="shrink-0 text-blue-600" />
                  </span>
                  <span className="mt-3 block text-2xl font-bold text-slate-900">
                    {item.count.toLocaleString("en-IN")}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {item.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={allVisibleAppointmentsSelected}
                  onChange={toggleSelectAllAppointments}
                  disabled={rangeAppointments.length === 0 || appointmentActionLoading}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Select all appointments in this view
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500">{selectedAppointmentIds.length} selected</span>
                <button
                  type="button"
                  onClick={() => void handleAppointmentAction("cancel", selectedAppointmentIds)}
                  disabled={selectedAppointmentIds.length === 0 || appointmentActionLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                >
                  <Ban size={14} /> Cancel Selected
                </button>
                <button
                  type="button"
                  onClick={() => void handleAppointmentAction("delete", selectedAppointmentIds)}
                  disabled={selectedAppointmentIds.length === 0 || appointmentActionLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {appointmentActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete Selected
                </button>
              </div>
            </div>
            {appointmentActionError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{appointmentActionError}</p>}
            {appointmentActionMessage && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{appointmentActionMessage}</p>}
          </div>

          <div className="divide-y divide-slate-100">
            {rangeAppointments.length > 0 ? (
              rangeAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      aria-label={`Select appointment for ${appointment.patient_name?.trim() || "Patient"}`}
                      checked={selectedAppointmentIds.includes(appointment.id)}
                      onChange={() => toggleAppointmentSelection(appointment.id)}
                      disabled={appointmentActionLoading}
                      className="mt-3 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <UserRound size={19} />
                    </div>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-900">
                        {appointment.patient_name?.trim() || "Patient"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(appointment.appointment_date)}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock size={13} />
                        {appointment.appointment_time || "Time not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span
                      className={`inline-flex w-fit rounded-lg px-3 py-1.5 text-xs font-semibold ${statusClass(appointment.status)}`}
                    >
                      {appointment.status.replace(/[-_]/g, " ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleAppointmentAction("cancel", [appointment.id])}
                      disabled={appointmentActionLoading || ["cancelled", "no-show", "completed"].includes(appointment.status.trim().toLowerCase().replace(/[_\s]+/g, "-"))}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Ban size={13} /> Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAppointmentAction("delete", [appointment.id])}
                      disabled={appointmentActionLoading}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center">
                <CalendarCheck size={28} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No appointments in this period
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Appointments will appear here when available.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Your Customers
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {filteredCustomers.length} records found
                  </p>
                </div>
                <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  Contact directory
                </span>
              </div>

              <div className="relative mt-4">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, phone or email..."
                  aria-label="Search customers"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    ["all", "All customers"],
                    ["new", "New"],
                    ["followup", "Follow-ups due"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                      filter === value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[680px] overflow-y-auto">
              {loading ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-slate-500">
                  <Loader2 size={26} className="animate-spin text-blue-600" />
                  Loading customers...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Users size={25} />
                  </div>
                  <h3 className="font-semibold text-slate-900">
                    {search || filter !== "all"
                      ? "No matching customers"
                      : "No customers yet"}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                    {search || filter !== "all"
                      ? "Try another search or choose a different filter."
                      : "Add your first customer to start building your clinic directory."}
                  </p>
                  {!search && filter === "all" && (
                    <button
                      type="button"
                      onClick={() => setFormOpen(true)}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      <Plus size={16} /> Add first customer
                    </button>
                  )}
                </div>
              ) : (
                filteredCustomers.map((customer) => {
                  const history = customerAppointments(customer.id);
                  const active = selected?.id === customer.id;

                  return (
                    <button
                      type="button"
                      key={customer.id}
                      onClick={() => setSelected(customer)}
                      className={`flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left transition hover:bg-blue-50/60 sm:px-5 ${
                        active
                          ? "bg-blue-50/80 ring-inset ring-2 ring-blue-100"
                          : "bg-white"
                      }`}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-sm font-bold text-blue-700">
                        {initials(customer.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900">
                            {customer.name || "Unnamed customer"}
                          </span>
                          {new Date(customer.created_at) >= recentBoundary && (
                            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                              New
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone size={12} />
                          <span>{customer.phone}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Added {formatDate(customer.created_at)}
                          {" · "}
                          {history.length} appointment
                          {history.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      <ChevronRight
                        size={18}
                        className={`shrink-0 ${
                          active ? "text-blue-600" : "text-slate-300"
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-5">
            {selected ? (
              <>
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <div className="h-24 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500" />
                  <div className="px-5 pb-5">
                    <div className="-mt-10 flex items-end justify-between gap-3">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-blue-50 text-2xl font-bold text-blue-700 shadow-sm">
                        {initials(selected.name)}
                      </div>
                      <span className="mb-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        Customer profile
                      </span>
                    </div>

                    <h2 className="mt-4 text-xl font-bold text-slate-900">
                      {selected.name || "Unnamed customer"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Customer since {formatDate(selected.created_at)}
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoItem
                        icon={<Phone size={17} />}
                        label="Phone number"
                        value={selected.phone}
                      />
                      <InfoItem
                        icon={<Mail size={17} />}
                        label="Email address"
                        value={selected.email || "Not provided"}
                      />
                    </div>

                    {selected.company && (
                      <InfoItem
                        icon={<UserRound size={17} />}
                        label="Company / Notes"
                        value={selected.company}
                      />
                    )}

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <a
                        href={`tel:${selected.phone}`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Phone size={16} /> Call
                      </a>
                      <a
                        href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        <MessageCircle size={16} /> WhatsApp
                      </a>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 p-5">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Appointment History
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedAppointments.length} linked appointment records
                      </p>
                    </div>
                    <CalendarDays size={20} className="text-blue-600" />
                  </div>

                  {selectedAppointments.length === 0 ? (
                    <div className="px-5 py-9 text-center">
                      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <CalendarDays size={20} />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        No linked appointments
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Appointments will appear here when linked to this customer.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {selectedAppointments.slice(0, 6).map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-start justify-between gap-3 p-4 sm:px-5"
                        >
                          <div className="flex min-w-0 gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <CalendarDays size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800">
                                {formatDate(appointment.appointment_date)}
                              </p>
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                <Clock size={12} />
                                {appointment.appointment_time || "Time not set"}
                              </p>
                              {appointment.amount != null && (
                                <p className="mt-1 text-xs font-medium text-slate-600">
                                  ₹{Number(appointment.amount).toLocaleString("en-IN")}
                                  {appointment.payment_status
                                    ? ` · ${appointment.payment_status}`
                                    : ""}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold ${statusClass(
                              appointment.status
                            )}`}
                          >
                            {appointment.status || "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {upcomingAppointments.length > 0 && (
                    <div className="border-t border-slate-100 bg-blue-50/60 px-5 py-3 text-xs font-medium text-blue-700">
                      {upcomingAppointments.length} upcoming appointment
                      {upcomingAppointments.length === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <UserRound size={26} />
                </div>
                <h3 className="font-semibold text-slate-900">
                  Select a customer
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                  Choose a customer from the directory to view contact details and appointment history.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <Activity size={19} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Your clinic, better organised
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Keep customer contacts and appointment records together in one workspace.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="pb-2 text-center text-xs text-slate-400">
          ZIVEXO CRM · Customer Management
        </footer>
      </div>

      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={() => void loadData()}
      />
    </main>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  iconClass,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value.toLocaleString("en-IN")}
          </p>
          <p className="mt-1.5 text-xs text-slate-400">{detail}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <div className="mt-0.5 shrink-0 text-blue-600">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}
