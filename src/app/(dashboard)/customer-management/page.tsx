"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Users,
  CalendarDays,
  Clock,
  XCircle,
  RefreshCw,
  Loader2,
  Phone,
  Mail,
  Building2,
  ArrowLeft,
  User,
} from "lucide-react";

type Customer = {
  id: string;
  name?: string;
  phone: string;
  email?: string;
  company?: string;
  created_at: string;
};

type Appointment = {
  id: string;
  contact_id: string;
  patient_name: string;
  gender?: string;
  age?: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  doctor_id?: string;
  service_id?: string;
};

export default function CustomerManagementPage() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);
  const [customerNotes, setCustomerNotes] = useState<{ id: string; note_text: string; created_at: string }[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const loadData = async () => {
    setLoading(true);

    const [{ data: contacts }, { data: appointmentData }] =
      await Promise.all([
        supabase
          .from("contacts")
          .select("id, name, phone, email, company, created_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("appointments")
          .select(
            "id, contact_id, patient_name, gender, age, appointment_date, appointment_time, status, doctor_id, service_id"
          )
          .order("appointment_date", { ascending: false }),
      ]);

    setCustomers((contacts || []) as Customer[]);
    setAppointments((appointmentData || []) as Appointment[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return customers;

    return customers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(term) ||
        customer.phone?.toLowerCase().includes(term) ||
        customer.email?.toLowerCase().includes(term)
    );
  }, [customers, search]);

  const getCustomerAppointments = (customerId: string) =>
    appointments.filter(
      (appointment) => appointment.contact_id === customerId
    );

  const loadCustomerNotes = async (contactId: string) => {
    const { data, error } = await supabase
      .from("contact_notes")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });

    if (!error) {
      setCustomerNotes(data || []);
    }
  };

  const addCustomerNote = async () => {
    if (!selectedCustomer || !newNote.trim()) return;

    setSavingNote(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setSavingNote(false);
      return;
    }

    const { data: profile } = await supabase
      .from("contacts")
      .select("account_id")
      .eq("id", selectedCustomer.id)
      .single();

    if (!profile?.account_id) {
      setSavingNote(false);
      return;
    }

    const { error } = await supabase.from("contact_notes").insert({
      contact_id: selectedCustomer.id,
      account_id: profile.account_id,
      user_id: user.id,
      note_text: newNote.trim(),
    });

    if (!error) {
      setNewNote("");
      await loadCustomerNotes(selectedCustomer.id);
    }

    setSavingNote(false);
  };


  const pendingAppointments = appointments.filter(
    (appointment) => appointment.status === "pending"
  ).length;

  const cancelledAppointments = appointments.filter(
    (appointment) =>
      appointment.status === "cancelled" ||
      appointment.status === "canceled"
  ).length;

const rescheduleAppointment = async (
  appointmentId: string,
  newDate: string,
  newTime: string
) => {
  const { error } = await supabase
    .from("appointments")
    .update({
      appointment_date: newDate,
      appointment_time: newTime,
    })
    .eq("id", appointmentId);

  if (error) {
    console.error("Reschedule error:", error);
    return false;
  }

  await loadData();
  return true;
};



  const cancelAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId);

    if (!error) {
      await loadData();
    }
  };

  // Customer Details View
  if (selectedCustomer) {
    const customerAppointments = getCustomerAppointments(
      selectedCustomer.id
    );

    if (customerNotes.length === 0) {
      loadCustomerNotes(selectedCustomer.id);
    }

    return (
      <div className="min-h-screen bg-white p-4 text-[#0a1628] md:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Back */}
          <button
            onClick={() => setSelectedCustomer(null)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </button>

          {/* Profile */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                  {(selectedCustomer.name ||
                    selectedCustomer.phone ||
                    "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <h1 className="text-2xl font-bold">
                    {selectedCustomer.name || "Unnamed Customer"}
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Customer ID: {selectedCustomer.id}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={selectedCustomer.phone || "Not available"}
              />

              <InfoCard
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={selectedCustomer.email || "Not available"}
              />

              <InfoCard
                icon={<Building2 className="h-4 w-4" />}
                label="Company"
                value={selectedCustomer.company || "Not available"}
              />
            </div>
          </div>

          {/* Appointment Summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              title="Total Appointments"
              value={customerAppointments.length}
              icon={<CalendarDays className="h-5 w-5" />}
            />

            <StatCard
              title="Active Appointments"
              value={
                customerAppointments.filter(
                  (a) =>
                    a.status === "pending" ||
                    a.status === "confirmed"
                ).length
              }
              icon={<Clock className="h-5 w-5" />}
            />
          </div>

          {/* Customer Notes */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-semibold">Customer Notes</h2>
              <p className="mt-1 text-sm text-slate-500">
                Internal notes about this customer
              </p>
            </div>

            <div className="p-5">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write a note about this customer..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-[#0a1628] outline-none focus:border-blue-500"
              />

              <button
                onClick={addCustomerNote}
                disabled={savingNote || !newNote.trim()}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingNote ? "Saving..." : "Add Note"}
              </button>

              <div className="mt-5 space-y-3">
                {customerNotes.length === 0 ? (
                  <p className="text-sm text-slate-400">No notes yet.</p>
                ) : (
                  customerNotes.map((note: { id: string; note_text: string; created_at: string }) => (
                    <div
                      key={note.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <p className="text-sm text-slate-700">{note.note_text}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Appointment History */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-semibold">
                Appointment History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                All appointments for this customer
              </p>
            </div>

            {customerAppointments.length === 0 ? (
              <div className="py-16 text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />

                <p className="mt-3 text-sm font-medium text-slate-600">
                  No appointments yet
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Appointment history will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {customerAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="p-5 hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />

                          <span className="font-semibold">
                            {appointment.patient_name ||
                              selectedCustomer.name ||
                              "Patient"}
                          </span>
                        </div>

                        <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-3">
                          <span>
                            📅 {appointment.appointment_date}
                          </span>

                          <span>
                            🕐 {appointment.appointment_time}
                          </span>

                          {appointment.gender && (
                            <span>
                              ⚥ {appointment.gender}
                            </span>
                          )}

                          {appointment.age && (
                            <span>🎂 Age: {appointment.age}</span>
                          )}
                        </div>

                        {appointment.doctor_id && (
                          <p className="text-xs text-slate-400">
                            Doctor ID: {appointment.doctor_id}
                          </p>
                        )}

                        {appointment.service_id && (
                          <p className="text-xs text-slate-400">
                            Service ID: {appointment.service_id}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <StatusBadge status={appointment.status} />

                        {(appointment.status === "pending" ||
                          appointment.status === "confirmed") && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const newDate = window.prompt("Enter new date (YYYY-MM-DD):");
                                if (!newDate) return;
                                const newTime = window.prompt("Enter new time (HH:MM):");
                                if (!newTime) return;
                                rescheduleAppointment(appointment.id, newDate, newTime);
                              }}
                              className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
                            >
                              Reschedule
                            </button>

                            <button
                              onClick={() => cancelAppointment(appointment.id)}
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Customer List
  return (
    <div className="min-h-screen bg-white p-4 text-[#0a1628] md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Customer Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage customers and their appointments from one place.
            </p>
          </div>

          <button
            onClick={loadData}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Customers"
            value={customers.length}
            icon={<Users className="h-5 w-5" />}
          />

          <StatCard
            title="Total Appointments"
            value={appointments.length}
            icon={<CalendarDays className="h-5 w-5" />}
          />

          <StatCard
            title="Pending"
            value={pendingAppointments}
            icon={<Clock className="h-5 w-5" />}
          />

          <StatCard
            title="Cancelled"
            value={cancelledAppointments}
            icon={<XCircle className="h-5 w-5" />}
          />
        </div>

        {/* Search */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer by name, phone or email..."
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-[#0a1628] outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">Customers</h2>

            <p className="text-sm text-slate-500">
              {filteredCustomers.length} customer
              {filteredCustomers.length === 1 ? "" : "s"} found
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              No customers found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredCustomers.map((customer) => {
                const customerAppointments =
                  getCustomerAppointments(customer.id);

                return (
                  <div
                    key={customer.id}
                    className="p-5 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-600">
                          {(customer.name ||
                            customer.phone ||
                            "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-semibold">
                            {customer.name || "Unnamed Customer"}
                          </h3>

                          <p className="text-sm text-slate-500">
                            {customer.phone}
                          </p>

                          {customer.email && (
                            <p className="truncate text-xs text-slate-400">
                              {customer.email}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-sm text-slate-500">
                          {customerAppointments.length} appointment
                          {customerAppointments.length === 1
                            ? ""
                            : "s"}
                        </div>

                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="rounded-lg bg-[#0a1628] px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-blue-600">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="mt-2 break-words text-sm font-medium text-[#0a1628]">
        {value}
      </p>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>

        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const label =
    normalized === "confirmed"
      ? "Confirmed"
      : normalized === "pending"
      ? "Pending"
      : normalized === "cancelled" || normalized === "canceled"
      ? "Cancelled"
      : status;

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium capitalize text-slate-700">
      {label}
    </span>
  );
}
