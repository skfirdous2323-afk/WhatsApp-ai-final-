"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  UserRound,
  Stethoscope,
  Phone,
  CheckCircle2,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Row = Record<string, any>;

export default function BookAppointmentPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { accountId, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [userId, setUserId] = useState("");
  const [customers, setCustomers] = useState<Row[]>([]);
  const [services, setServices] = useState<Row[]>([]);
  const [doctors, setDoctors] = useState<Row[]>([]);

  const [contactId, setContactId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      if (profileLoading) return;
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Please sign in again to book an appointment.");
        }

        const { data: clinic, error: clinicError } = await supabase
          .from("clinics")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (clinicError) throw clinicError;
        if (!clinic?.id) {
          throw new Error("No clinic found for your account. Please set up your clinic first.");
        }

        if (!accountId) {
          throw new Error("Your workspace could not be identified. Please refresh and sign in again.");
        }

        const [customerResult, serviceResult, doctorResult] = await Promise.all([
          supabase
            .from("contacts")
            .select("id, name, phone")
            .eq("account_id", accountId)
            .order("created_at", { ascending: false }),
          supabase
            .from("clinic_services")
            .select("*")
            .eq("clinic_id", clinic.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("clinic_doctors")
            .select("*")
            .eq("clinic_id", clinic.id)
            .order("created_at", { ascending: false }),
        ]);

        if (customerResult.error) throw customerResult.error;
        if (serviceResult.error) throw serviceResult.error;
        if (doctorResult.error) throw doctorResult.error;

        if (!active) return;

        setUserId(user.id);
        setClinicId(clinic.id);
        setCustomers(customerResult.data || []);
        setServices((serviceResult.data || []).filter((row: Row) =>
          row.is_active !== false && row.active !== false && row.enabled !== false
        ));
        setDoctors((doctorResult.data || []).filter((row: Row) =>
          row.is_active !== false && row.active !== false && row.enabled !== false
        ));
      } catch (err: any) {
        if (active) setError(err?.message || "Unable to load booking information.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, [supabase, accountId, profileLoading]);

  function getLabel(row: Row) {
    return String(
      row.name ??
      row.patient_name ??
      row.doctor_name ??
      row.service_name ??
      row.title ??
      row.full_name ??
      row.id ??
      "Unnamed"
    );
  }

  function handleCustomerChange(id: string) {
    setContactId(id);
    const customer = customers.find((item) => item.id === id);
    if (customer) {
      setPatientName(customer.name || "");
      setPhone(customer.phone || "");
    } else {
      setPatientName("");
      setPhone("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!clinicId || !userId || !accountId) {
      setError("Clinic or workspace information is missing. Refresh the page and try again.");
      return;
    }

    if (!patientName.trim() || !serviceId || !doctorId || !date || !time || !gender || !age) {
      setError("Please complete all required fields.");
      return;
    }

    const ageNumber = Number(age);
    if (!Number.isInteger(ageNumber) || ageNumber < 1 || ageNumber > 120) {
      setError("Enter a valid patient age between 1 and 120.");
      return;
    }

    const chosenDate = new Date(`${date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(chosenDate.getTime()) || chosenDate < today) {
      setError("Please choose today or a future date.");
      return;
    }

    setSaving(true);

    try {
      const { data: existing, error: existingError } = await supabase
        .from("appointments")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("doctor_id", doctorId)
        .eq("appointment_date", date)
        .eq("appointment_time", time)
        .in("status", ["pending", "confirmed"])
        .limit(1);

      if (existingError) throw existingError;

      if (existing?.length) {
        throw new Error("This time slot is already booked. Please choose another time.");
      }

      let resolvedContactId = contactId || null;

      if (!resolvedContactId) {
        const normalizedPhone = phone.trim();

        if (!normalizedPhone) {
          throw new Error("Enter the patient's phone number.");
        }

        const { data: existingContact, error: contactLookupError } = await supabase
          .from("contacts")
          .select("id")
          .eq("account_id", accountId)
          .eq("phone", normalizedPhone)
          .limit(1)
          .maybeSingle();

        if (contactLookupError) throw contactLookupError;

        if (existingContact) {
          resolvedContactId = existingContact.id;
        } else {
          const { data: newContact, error: contactInsertError } = await supabase
            .from("contacts")
            .insert({
              user_id: userId,
              account_id: accountId,
              name: patientName.trim(),
              phone: normalizedPhone,
            })
            .select("id")
            .single();

          if (contactInsertError) throw contactInsertError;
          resolvedContactId = newContact.id;
        }
      }

      const selectedService = services.find((item) => item.id === serviceId);
      const amount = selectedService
        ? Number(selectedService.price ?? selectedService.fee ?? selectedService.amount ?? 0)
        : 0;

      const { error: insertError } = await supabase.from("appointments").insert({
        clinic_id: clinicId,
        user_id: userId,
        contact_id: resolvedContactId,
        service_id: serviceId,
        doctor_id: doctorId,
        appointment_date: date,
        appointment_time: time,
        patient_name: patientName.trim(),
        gender,
        age: ageNumber,
        status: "pending",
        ...(Number.isFinite(amount) && amount > 0 ? { amount } : {}),
      });

      if (insertError) throw insertError;

      setSuccess("Appointment booked successfully and saved as Pending.");
      setContactId("");
      setPatientName("");
      setPhone("");
      setGender("");
      setAge("");
      setServiceId("");
      setDoctorId("");
      setDate("");
      setTime("");
    } catch (err: any) {
      setError(err?.message || "Could not save the appointment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const availableDoctors = doctors.filter((doctor) => {
    const linkedServiceId = doctor.service_id ?? doctor.clinic_service_id;
    return !linkedServiceId || !serviceId || linkedServiceId === serviceId;
  });

  return (
    <main className="min-h-screen bg-slate-50/80 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-5 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950"
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-7 text-white sm:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <CalendarDays size={25} />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-100">ZIVEXO CRM</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Book Appointment
                </h1>
                <p className="mt-1 text-sm text-blue-100">
                  Schedule a patient visit and manage the booking from your clinic.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {loading ? (
              <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-slate-500">
                <Loader2 className="animate-spin" size={20} />
                Loading clinic information...
              </div>
            ) : (
              <>
                {error && (
                  <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {success && (
                  <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">{success}</p>
                      <p className="mt-1">You can book another appointment or return to Customer Management.</p>
                      <button
                        type="button"
                        onClick={() => router.push("/customer-management")}
                        className="mt-3 font-semibold underline underline-offset-4"
                      >
                        Go to Customer Management
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <UserRound size={19} className="text-blue-700" />
                      <h2 className="font-semibold text-slate-900">Patient details</h2>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Existing customer <span className="font-normal text-slate-400">(optional)</span>
                        <select
                          value={contactId}
                          onChange={(event) => handleCustomerChange(event.target.value)}
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        >
                          <option value="">New / walk-in patient</option>
                          {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name || "Unnamed"}{customer.phone ? ` · ${customer.phone}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block text-sm font-medium text-slate-700">
                        Patient full name *
                        <input
                          required
                          value={patientName}
                          onChange={(event) => setPatientName(event.target.value)}
                          placeholder="Enter patient name"
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                      </label>

                      <label className="block text-sm font-medium text-slate-700">
                        <span className="flex items-center gap-2"><Phone size={15} /> Phone number</span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="Enter contact number"
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                        <span className="mt-1 block text-xs font-normal text-slate-400">
                          Contact number is recorded here; the appointment uses the selected customer when linked.
                        </span>
                      </label>

                      <div className="grid grid-cols-2 gap-4">
                        <label className="block text-sm font-medium text-slate-700">
                          Age *
                          <input
                            required
                            type="number"
                            min="1"
                            max="120"
                            value={age}
                            onChange={(event) => setAge(event.target.value)}
                            placeholder="Age"
                            className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />
                        </label>
                        <label className="block text-sm font-medium text-slate-700">
                          Gender *
                          <select
                            required
                            value={gender}
                            onChange={(event) => setGender(event.target.value)}
                            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-7">
                    <div className="mb-4 flex items-center gap-2">
                      <Stethoscope size={19} className="text-blue-700" />
                      <h2 className="font-semibold text-slate-900">Appointment details</h2>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Service *
                        <select
                          required
                          value={serviceId}
                          onChange={(event) => {
                            setServiceId(event.target.value);
                            setDoctorId("");
                            setTime("");
                          }}
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        >
                          <option value="">Select service</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {getLabel(service)}
                              {(service.price ?? service.fee ?? service.amount) != null
                                ? ` · ₹${service.price ?? service.fee ?? service.amount}`
                                : ""}
                            </option>
                          ))}
                        </select>
                        {services.length === 0 && (
                          <span className="mt-1 block text-xs font-normal text-amber-700">
                            No services found. Add services in WhatsApp Bot → Services first.
                          </span>
                        )}
                      </label>

                      <label className="block text-sm font-medium text-slate-700">
                        Doctor *
                        <select
                          required
                          value={doctorId}
                          onChange={(event) => {
                            setDoctorId(event.target.value);
                            setTime("");
                          }}
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        >
                          <option value="">Select doctor</option>
                          {availableDoctors.map((doctor) => (
                            <option key={doctor.id} value={doctor.id}>
                              {getLabel(doctor)}
                              {doctor.specialization ? ` · ${doctor.specialization}` : ""}
                            </option>
                          ))}
                        </select>
                        {doctors.length === 0 && (
                          <span className="mt-1 block text-xs font-normal text-amber-700">
                            No doctors found. Add doctors in your clinic setup first.
                          </span>
                        )}
                      </label>

                      <label className="block text-sm font-medium text-slate-700">
                        <span className="flex items-center gap-2"><CalendarDays size={15} /> Appointment date *</span>
                        <input
                          required
                          type="date"
                          min={new Date().toLocaleDateString("en-CA")}
                          value={date}
                          onChange={(event) => {
                            setDate(event.target.value);
                            setTime("");
                          }}
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                      </label>

                      <label className="block text-sm font-medium text-slate-700">
                        <span className="flex items-center gap-2"><Clock3 size={15} /> Appointment time *</span>
                        <input
                          required
                          type="time"
                          value={time}
                          onChange={(event) => setTime(event.target.value)}
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                        <span className="mt-1 block text-xs font-normal text-slate-400">
                          Choose a time within the selected doctor&apos;s working hours.
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      <ClipboardList size={16} />
                      New bookings will be saved as Pending.
                    </p>
                    <button
                      type="submit"
                      disabled={saving || services.length === 0 || doctors.length === 0}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={18} className="animate-spin" /> : <CalendarDays size={18} />}
                      {saving ? "Saving appointment..." : "Book Appointment"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </section>
        <p className="mt-4 text-center text-xs text-slate-400">Powered by ZIVEXO</p>
      </div>
    </main>
  );
}
