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
    appointments.filter((appointment) => appointment.contact_id === customerId);

  const totalAppointments = appointments.length;

  const pendingAppointments = appointments.filter(
    (appointment) => appointment.status === "pending"
  ).length;

  const confirmedAppointments = appointments.filter(
    (appointment) => appointment.status === "confirmed"
  ).length;

  const cancelledAppointments = appointments.filter(
    (appointment) =>
      appointment.status === "cancelled" ||
      appointment.status === "canceled"
  ).length;

  const cancelAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId);

    if (!error) {
      await loadData();
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 text-[#0a1628]">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Customer Management</h1>
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
            value={totalAppointments}
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
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-[#0a1628] outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Customers */}
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
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-600">
                            {(customer.name || customer.phone || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <h3 className="font-semibold">
                              {customer.name || "Unnamed Customer"}
                            </h3>

                            <p className="text-sm text-slate-500">
                              {customer.phone}
                            </p>
                          </div>
                        </div>

                        {customer.email && (
                          <p className="mt-2 text-sm text-slate-500">
                            {customer.email}
                          </p>
                        )}
                      </div>

                      <div className="text-left lg:text-right">
                        <p className="text-sm font-medium">
                          {customerAppointments.length} appointment
                          {customerAppointments.length === 1 ? "" : "s"}
                        </p>

                        {customerAppointments.length > 0 && (
                          <p className="mt-1 text-xs text-slate-500">
                            Latest:{" "}
                            {customerAppointments[0].appointment_date}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Appointment history */}
                    {customerAppointments.length > 0 && (
                      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Appointment History
                        </p>

                        <div className="space-y-2">
                          {customerAppointments.slice(0, 5).map((appointment) => (
                            <div
                              key={appointment.id}
                              className="flex flex-col gap-2 rounded-lg bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {appointment.patient_name ||
                                    customer.name ||
                                    "Patient"}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {appointment.appointment_date} •{" "}
                                  {appointment.appointment_time}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <StatusBadge
                                  status={appointment.status}
                                />

                                {(appointment.status === "pending" ||
                                  appointment.status === "confirmed") && (
                                  <button
                                    onClick={() =>
                                      cancelAppointment(appointment.id)
                                    }
                                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
      {label}
    </span>
  );
}
