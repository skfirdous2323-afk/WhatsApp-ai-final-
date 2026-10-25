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

type Doctor = {
  id: string;
  doctor_name: string | null;
  specialization?: string | null;
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
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("all");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "followup">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [appointmentRange, setAppointmentRange] = useState<"all" | "pending" | "upcoming" | "today" | "last7" | "month" | "completed" | "no-show" | "cancelled">("all");
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<string[]>([]);
  const [appointmentActionLoading, setAppointmentActionLoading] = useState(false);
  const [appointmentActionError, setAppointmentActionError] = useState("");
  const [appointmentActionMessage, setAppointmentActionMessage] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [customerActionLoading, setCustomerActionLoading] = useState(false);
  const [customerActionError, setCustomerActionError] = useState("");
  const [customerActionMessage, setCustomerActionMessage] = useState("");

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
      let doctorData: Doctor[] = [];

      if (!clinicError && clinic?.id) {
        const { data: clinicDoctors, error: doctorError } = await supabase
          .from("clinic_doctors")
          .select("id, doctor_name, specialization")
          .eq("clinic_id", clinic.id)
          .order("created_at", { ascending: false });

        if (doctorError) {
          console.error("Clinic doctors could not be loaded:", doctorError);
        } else {
          doctorData = (clinicDoctors || []) as Doctor[];
        }

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
      setDoctors(doctorData);
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

  const handleCustomerDelete = useCallback(
    async (ids: string[]) => {
      if (!ids.length || customerActionLoading) return;

      const confirmed = window.confirm(
        ids.length === 1
          ? "Delete this customer? This cannot be undone. Associated WhatsApp conversations and messages will also be permanently deleted."
          : `Delete ${ids.length} selected customers? This cannot be undone. Associated WhatsApp conversations and messages will also be permanently deleted.`
      );

      if (!confirmed) return;

      setCustomerActionLoading(true);
      setCustomerActionError("");
      setCustomerActionMessage("");

      try {
        const response = await fetch("/api/customers/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", ids }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Customers could not be deleted.");
        }

        setSelectedCustomerIds((current) =>
          current.filter((id) => !ids.includes(id))
        );

        await loadData();
        setCustomerActionMessage(
          `${result.deletedCount ?? ids.length} customer(s) deleted successfully.`
        );
      } catch (err) {
        setCustomerActionError(
          err instanceof Error
            ? err.message
            : "Customers could not be deleted. Please try again."
        );
      } finally {
        setCustomerActionLoading(false);
      }
    },
    [customerActionLoading, loadData]
  );

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

  const upcomingAppointmentsCount = appointments.filter((appointment) => {
    const date = appointmentDate(appointment);
    return date >= tomorrow && activeAppointment(appointment);
  }).length;

  const rangeAppointments = appointments.filter((appointment) => {
    if (selectedDoctorId !== "all" && appointment.doctor_id !== selectedDoctorId) {
      return false;
    }
    if (appointmentRange === "all") return true;
    const date = appointmentDate(appointment);
    const status = appointment.status.trim().toLowerCase().replace(/[_\s]+/g, "-");

    if (appointmentRange === "pending") {
      return status === "pending";
    }

    if (appointmentRange === "upcoming") {
      return date >= tomorrow && activeAppointment(appointment);
    }

    if (appointmentRange === "today") {
      return date >= today && date < tomorrow && activeAppointment(appointment);
    }

    if (appointmentRange === "completed") {
      return status === "completed";
    }

    if (appointmentRange === "no-show") {
      return status === "no-show";
    }

    if (appointmentRange === "cancelled") {
      return status === "cancelled" || status === "canceled";
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

  const handleAppointmentAction = async (
    action: "approve" | "cancel" | "delete" | "complete" | "no-show",
    ids: string[]
  ) => {
    if (appointmentActionLoading || ids.length === 0) return;
    const confirmed = window.confirm(
      action === "delete"
        ? `Permanently delete ${ids.length} appointment(s)? This cannot be undone.`
        : action === "approve"
          ? `Confirm ${ids.length} appointment(s)?`
          : action === "complete"
            ? `Mark ${ids.length} appointment(s) as completed?`
            : action === "no-show"
              ? `Mark ${ids.length} appointment(s) as not visited?`
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
        `${result.count} appointment(s) ${
          action === "approve" ? "confirmed"
            : action === "cancel" ? "cancelled"
            : action === "complete" ? "marked completed"
            : action === "no-show" ? "marked not visited"
            : "deleted"
        }. `
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
    <main className="min-h-full bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* ---------- Header ---------- */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-600">
              <Users size={14} />
              <span>CRM</span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className="text-slate-500">Customer Management</span>
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
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = "/appointments/book"; }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <CalendarDays size={16} />
              Book Appointment
            </button>
          </div>
        </header>

        {error && (
          <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
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

        {/* ---------- Summary Strip ---------- */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <SummaryCard
            label="Total Customers"
            value={customers.length}
            detail="All registered customers"
            icon={<Users size={18} />}
            iconClass="bg-blue-50 text-blue-600"
          />
          <SummaryCard
            label="New Customers"
            value={newCustomers}
            detail="Joined in the last 30 days"
            icon={<UserPlus size={18} />}
            iconClass="bg-emerald-50 text-emerald-600"
          />
          <SummaryCard
            label="Upcoming Appointments"
            value={upcomingAppointmentsCount}
            detail="Scheduled ahead"
            icon={<CalendarDays size={18} />}
            iconClass="bg-indigo-50 text-indigo-600"
          />
          <SummaryCard
            label="Follow-ups Due"
            value={followups}
            detail="Past visits to follow up"
            icon={<Activity size={18} />}
            iconClass="bg-amber-50 text-amber-600"
          />
        </section>

        {/* ---------- Appointment Overview ---------- */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Appointment Overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review clinic appointments by date range.
                </p>
              </div>
              <span className="inline-flex items-center self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:self-auto">
                {rangeAppointments.length} appointments
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {([
                {
                  id: "upcoming",
                  label: "Upcoming",
                  count: upcomingAppointmentsCount,
                  detail: "Future dates",
                },
                {
                  id: "today",
                  label: "Today",
                  count: appointments.filter((appointment) => {
                    const date = appointmentDate(appointment);
                    return date >= today && date < tomorrow && activeAppointment(appointment);
                  }).length,
                  detail: "Scheduled today",
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
                  detail: "Current month",
                },
                {
                  id: "completed",
                  label: "Completed",
                  count: appointments.filter((appointment) =>
                    appointment.status.trim().toLowerCase().replace(/[_\s]+/g, "-") === "completed"
                  ).length,
                  detail: "Consultations done",
                },
                {
                  id: "no-show",
                  label: "Not Visited",
                  count: appointments.filter((appointment) =>
                    appointment.status.trim().toLowerCase().replace(/[_\s]+/g, "-") === "no-show"
                  ).length,
                  detail: "Patient no-show",
                },
                {
                  id: "cancelled",
                  label: "Cancelled",
                  count: appointments.filter((appointment) =>
                    ["cancelled", "canceled"].includes(
                      appointment.status.trim().toLowerCase().replace(/[_\s]+/g, "-")
                    )
                  ).length,
                  detail: "Cancelled visits",
                },
              ] as const).map((item) => {
                const isActive = appointmentRange === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setAppointmentRange(item.id);
                      setSelectedAppointmentIds([]);
                      setAppointmentActionError("");
                      setAppointmentActionMessage("");
                    }}
                    aria-pressed={isActive}
                    className={`rounded-lg border p-3 text-left transition ${
                      isActive
                        ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`truncate text-xs font-semibold ${
                          isActive ? "text-blue-700" : "text-slate-600"
                        }`}
                      >
                        {item.label}
                      </span>
                      <CalendarDays
                        size={14}
                        className={isActive ? "text-blue-600" : "text-slate-400"}
                      />
                    </div>
                    <div className="mt-2 text-xl font-bold tracking-tight text-slate-900">
                      {item.count.toLocaleString("en-IN")}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {item.detail}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label
                htmlFor="appointment-doctor-filter"
                className="text-sm font-medium text-slate-700"
              >
                Select Doctor
              </label>
              <select
                id="appointment-doctor-filter"
                value={selectedDoctorId}
                onChange={(event) => {
                  setSelectedDoctorId(event.target.value);
                  setSelectedAppointmentIds([]);
                  setAppointmentActionError("");
                  setAppointmentActionMessage("");
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 sm:max-w-xs"
              >
                <option value="all">All Doctors</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.doctor_name || "Unnamed Doctor"}
                    {doctor.specialization ? ` · ${doctor.specialization}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk bar */}
          <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={allVisibleAppointmentsSelected}
                  onChange={toggleSelectAllAppointments}
                  disabled={rangeAppointments.length === 0 || appointmentActionLoading}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Select all in this view
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500">
                  {selectedAppointmentIds.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => void handleAppointmentAction("cancel", selectedAppointmentIds)}
                  disabled={selectedAppointmentIds.length === 0 || appointmentActionLoading}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Ban size={13} /> Cancel Selected
                </button>
                <button
                  type="button"
                  onClick={() => void handleAppointmentAction("delete", selectedAppointmentIds)}
                  disabled={selectedAppointmentIds.length === 0 || appointmentActionLoading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {appointmentActionLoading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                  Delete Selected
                </button>
              </div>
            </div>
            {appointmentActionError && (
              <p
                role="alert"
                className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {appointmentActionError}
              </p>
            )}
            {appointmentActionMessage && (
              <p
                role="status"
                className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              >
                {appointmentActionMessage}
              </p>
            )}
          </div>

          {/* Appointment list */}
          <div className="divide-y divide-slate-100">
            {rangeAppointments.length > 0 ? (
              rangeAppointments.map((appointment) => {
                const normalizedStatus = appointment.status
                  .trim()
                  .toLowerCase()
                  .replace(/[_\s]+/g, "-");
                return (
                  <div
                    key={appointment.id}
                    className="flex flex-col gap-3 p-4 transition hover:bg-slate-50/40 sm:flex-row sm:items-center sm:justify-between sm:px-5"
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
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <UserRound size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {appointment.patient_name?.trim() || "Patient"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDate(appointment.appointment_date)}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                          <Clock size={12} />
                          {appointment.appointment_time || "Time not set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                      <span
                        className={`inline-flex w-fit rounded-md px-2 py-1 text-[11px] font-semibold capitalize ${statusClass(appointment.status)}`}
                      >
                        {appointment.status.replace(/[-_]/g, " ")}
                      </span>
                      {normalizedStatus === "pending" && (
                        <button
                          type="button"
                          onClick={() => void handleAppointmentAction("approve", [appointment.id])}
                          disabled={appointmentActionLoading}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      )}
                      {normalizedStatus === "confirmed" && (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleAppointmentAction("complete", [appointment.id])}
                            disabled={appointmentActionLoading}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Mark Completed
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleAppointmentAction("no-show", [appointment.id])}
                            disabled={appointmentActionLoading}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Mark Not Visited
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleAppointmentAction("cancel", [appointment.id])}
                        disabled={
                          appointmentActionLoading ||
                          ["cancelled", "no-show", "completed"].includes(normalizedStatus)
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Ban size={12} /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAppointmentAction("delete", [appointment.id])}
                        disabled={appointmentActionLoading}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-12 text-center">
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

        {/* ---------- Customers + Profile ---------- */}
        <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
          {/* Customer list */}
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">
                    Your Customers
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {filteredCustomers.length} records found
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Plus size={13} /> Add Customer
                </button>
              </div>

              <div className="relative mt-4">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, phone or email..."
                  aria-label="Search customers"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(
                  [
                    ["all", "All customers"],
                    ["new", "New"],
                    ["followup", "Follow-ups due"],
                  ] as const
                ).map(([value, label]) => {
                  const isActive = filter === value;
                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setFilter(value)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        isActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredCustomers.length > 0 && !loading && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 sm:px-5">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    aria-label="Select all visible customers"
                    checked={
                      filteredCustomers.length > 0 &&
                      filteredCustomers.every((customer) =>
                        selectedCustomerIds.includes(customer.id)
                      )
                    }
                    onChange={(event) => {
                      const visibleIds = filteredCustomers.map((customer) => customer.id);
                      setSelectedCustomerIds((current) =>
                        event.target.checked
                          ? Array.from(new Set([...current, ...visibleIds]))
                          : current.filter((id) => !visibleIds.includes(id))
                      );
                    }}
                    disabled={customerActionLoading}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Select visible ({filteredCustomers.length})
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedCustomerIds.length > 0 && (
                    <span className="text-xs font-medium text-slate-500">
                      {selectedCustomerIds.length} selected
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleCustomerDelete(selectedCustomerIds)}
                    disabled={!selectedCustomerIds.length || customerActionLoading}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {customerActionLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    Delete selected
                  </button>
                </div>
              </div>
            )}

            {(customerActionError || customerActionMessage) && (
              <div
                role={customerActionError ? "alert" : "status"}
                className={`mx-4 mt-3 rounded-lg border px-3 py-2 text-sm sm:mx-5 ${
                  customerActionError
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {customerActionError || customerActionMessage}
              </div>
            )}

            <div className="max-h-[680px] overflow-y-auto">
              {loading ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-slate-500">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                  Loading customers...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Users size={24} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
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
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                      <Plus size={15} /> Add first customer
                    </button>
                  )}
                </div>
              ) : (
                filteredCustomers.map((customer) => {
                  const history = customerAppointments(customer.id);
                  const active = selected?.id === customer.id;

                  return (
                    <div
                      key={customer.id}
                      className={`flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 transition sm:px-4 ${
                        active ? "bg-blue-50/60" : "bg-white hover:bg-slate-50/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select ${customer.name || "customer"}`}
                        checked={selectedCustomerIds.includes(customer.id)}
                        onChange={(event) => {
                          setSelectedCustomerIds((current) =>
                            event.target.checked
                              ? [...current, customer.id]
                              : current.filter((id) => id !== customer.id)
                          );
                        }}
                        disabled={customerActionLoading}
                        className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />

                      <button
                        type="button"
                        onClick={() => setSelected(customer)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-xs font-bold text-blue-700">
                          {initials(customer.name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-slate-900">
                              {customer.name || "Unnamed customer"}
                            </span>
                            {new Date(customer.created_at) >= recentBoundary && (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                New
                              </span>
                            )}
                          </div>

                          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <Phone size={11} />
                            <span className="break-all">{customer.phone}</span>
                          </div>

                          <div className="mt-0.5 text-[11px] text-slate-400">
                            Added {formatDate(customer.created_at)} ·{" "}
                            {history.length} appointment
                            {history.length === 1 ? "" : "s"}
                          </div>
                        </div>

                        <ChevronRight
                          size={16}
                          className={`shrink-0 ${
                            active ? "text-blue-600" : "text-slate-300"
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        aria-label={`Delete ${customer.name || "customer"}`}
                        title="Delete customer"
                        onClick={() => void handleCustomerDelete([customer.id])}
                        disabled={customerActionLoading}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {customerActionLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Profile column */}
          <div className="min-w-0 space-y-5">
            {selected ? (
              <>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="h-20 bg-gradient-to-br from-blue-600 to-indigo-600" />
                  <div className="px-5 pb-5">
                    <div className="-mt-10 flex items-end justify-between gap-3">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-white text-2xl font-bold text-blue-700 shadow-sm">
                        {initials(selected.name)}
                      </div>
                      <span className="mb-1 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        Customer profile
                      </span>
                    </div>

                    <h2 className="mt-4 text-xl font-bold text-slate-900">
                      {selected.name || "Unnamed customer"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Customer since {formatDate(selected.created_at)}
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <InfoItem
                        icon={<Phone size={16} />}
                        label="Phone number"
                        value={selected.phone}
                      />
                      <InfoItem
                        icon={<Mail size={16} />}
                        label="Email address"
                        value={selected.email || "Not provided"}
                      />
                    </div>

                    {selected.company && (
                      <div className="mt-2.5">
                        <InfoItem
                          icon={<UserRound size={16} />}
                          label="Company / Notes"
                          value={selected.company}
                        />
                      </div>
                    )}

                    <div className="mt-5 grid grid-cols-2 gap-2.5">
                      <a
                        href={`tel:${selected.phone}`}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Phone size={15} /> Call
                      </a>
                      <a
                        href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        <MessageCircle size={15} /> WhatsApp
                      </a>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 p-5">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Appointment History
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedAppointments.length} linked appointment records
                      </p>
                    </div>
                    <CalendarDays size={18} className="text-blue-600" />
                  </div>

                  {selectedAppointments.length === 0 ? (
                    <div className="px-5 py-9 text-center">
                      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <CalendarDays size={18} />
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
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <CalendarDays size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800">
                                {formatDate(appointment.appointment_date)}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                <Clock size={11} />
                                {appointment.appointment_time || "Time not set"}
                              </p>
                              {appointment.amount != null && (
                                <p className="mt-0.5 text-xs font-medium text-slate-600">
                                  ₹{Number(appointment.amount).toLocaleString("en-IN")}
                                  {appointment.payment_status
                                    ? ` · ${appointment.payment_status}`
                                    : ""}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold capitalize ${statusClass(
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
                    <div className="border-t border-slate-100 bg-blue-50/60 px-5 py-2.5 text-xs font-medium text-blue-700">
                      {upcomingAppointments.length} upcoming appointment
                      {upcomingAppointments.length === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <UserRound size={24} />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Select a customer
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                  Choose a customer from the directory to view contact details and appointment history.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                  <Activity size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {value.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">{detail}</p>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${iconClass}`}
        >
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
    <div className="flex min-w-0 items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <div className="mt-0.5 shrink-0 text-blue-600">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-medium text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}
