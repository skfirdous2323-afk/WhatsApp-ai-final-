"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ContactForm } from "@/components/contacts/contact-form";
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
  MessageCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Stethoscope,
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

type Note = {
  id: string;
  note_text: string;
  created_at: string;
};

type Doctor = { id: string; doctor_name: string };
type Service = {
  id: string;
  service_name: string;
  duration_minutes?: number;
  assigned_doctors?: string[];
};

export default function CustomerManagementPage() {
  const supabase = useMemo(() => createClient(), []);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customerNotes, setCustomerNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [appointmentDoctor, setAppointmentDoctor] = useState("");
  const [appointmentService, setAppointmentService] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [appointmentPatientName, setAppointmentPatientName] = useState("");
  const [appointmentGender, setAppointmentGender] = useState("");
  const [appointmentAge, setAppointmentAge] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">(
    "month"
  );
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [calendarDoctorFilter, setCalendarDoctorFilter] = useState("");
  const [calendarStatusFilter, setCalendarStatusFilter] = useState("");
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [updatingAppointmentStatus, setUpdatingAppointmentStatus] =
    useState(false);

  // ==================== HELPERS (declared before use) ====================

  const formatCalendarDate = (date: Date) => date.toLocaleDateString("en-CA");

  const getDoctorName = (doctorId?: string) => {
    if (!doctorId) return "Unassigned";
    return (
      doctors.find((doctor) => doctor.id === doctorId)?.doctor_name ||
      "Doctor"
    );
  };

  const getServiceName = (serviceId?: string) => {
    if (!serviceId) return "Consultation";
    return (
      services.find((service) => service.id === serviceId)?.service_name ||
      "Service"
    );
  };

  const getAppointmentStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
      case "completed":
        return "border-blue-200 bg-blue-50 text-blue-700";
      case "cancelled":
      case "canceled":
        return "border-red-200 bg-red-50 text-red-700";
      case "no-show":
        return "border-slate-200 bg-slate-100 text-slate-600";
      default:
        return "border-amber-200 bg-amber-50 text-amber-700";
    }
  };

  const getAppointmentStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "Confirmed";
      case "completed":
        return "Completed";
      case "cancelled":
      case "canceled":
        return "Cancelled";
      case "no-show":
        return "No-show";
      default:
        return "Pending";
    }
  };

  const getClinicId = async (userId: string) => {
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (clinicError || !clinic) {
      throw new Error("Clinic not found");
    }

    return clinic.id;
  };

  // ==================== DATA LOADERS ====================

  const loadAppointmentOptions = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) return;

      const clinicId = await getClinicId(user.id);

      const [{ data: doctorData }, { data: serviceData }] = await Promise.all([
        supabase
          .from("clinic_doctors")
          .select("id, doctor_name")
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false }),

        supabase
          .from("clinic_services")
          .select("id, service_name, duration_minutes, assigned_doctors")
          .eq("clinic_id", clinicId)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);

      setDoctors((doctorData || []) as Doctor[]);
      setServices((serviceData || []) as Service[]);
    } catch (error) {
      console.error("Appointment options error:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);

    try {
      const [
        { data: contacts, error: contactsError },
        { data: appointmentData, error: appointmentsError },
      ] = await Promise.all([
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

      if (contactsError) console.error("Contacts load error:", contactsError);
      if (appointmentsError)
        console.error("Appointments load error:", appointmentsError);

      setCustomers((contacts || []) as Customer[]);
      setAppointments((appointmentData || []) as Appointment[]);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerNotes = async (contactId: string) => {
    const { data, error } = await supabase
      .from("contact_notes")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });

    if (!error) {
      setCustomerNotes((data || []) as Note[]);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerNotes(selectedCustomer.id);
    } else {
      setCustomerNotes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.id]);

  // ==================== DERIVED DATA ====================

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

  const pendingAppointments = appointments.filter(
    (appointment) => appointment.status === "pending"
  ).length;

  const cancelledAppointments = appointments.filter(
    (appointment) =>
      appointment.status === "cancelled" || appointment.status === "canceled"
  ).length;

  // ==================== ACTIONS ====================

  const addCustomerNote = async () => {
    if (!selectedCustomer || !newNote.trim()) return;

    setSavingNote(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("contacts")
        .select("account_id")
        .eq("id", selectedCustomer.id)
        .single();

      if (!profile?.account_id) return;

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
    } finally {
      setSavingNote(false);
    }
  };

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

  const loadAvailableSlots = async (doctorId: string, date: string) => {
    if (!doctorId || !date) return [];

    const { data: settings } = await supabase
      .from("clinic_appointment_settings")
      .select("slot_duration")
      .limit(1)
      .single();

    const duration = settings?.slot_duration || 30;

    const selectedDate = new Date(`${date}T00:00:00`);
    const weekday = selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
    });

    const { data: workingHour } = await supabase
      .from("clinic_working_hours")
      .select("day_name, open_time, close_time, is_closed")
      .eq("day_name", weekday)
      .limit(1)
      .maybeSingle();

    if (!workingHour || workingHour.is_closed) return [];

    const { data: doctor } = await supabase
      .from("clinic_doctors")
      .select("available_days, start_time, end_time")
      .eq("id", doctorId)
      .maybeSingle();

    if (doctor?.available_days?.length) {
      const doctorDays = doctor.available_days.map((day: string) =>
        day.toLowerCase()
      );
      if (!doctorDays.includes(weekday.toLowerCase())) return [];
    }

    const { data: booked } = await supabase
      .from("appointments")
      .select("appointment_time")
      .eq("doctor_id", doctorId)
      .eq("appointment_date", date)
      .in("status", ["pending", "confirmed"]);

    const bookedTimes = new Set(
      (booked || []).map((item) => item.appointment_time)
    );

    const slots: string[] = [];

    const doctorStart = String(
      doctor?.start_time || workingHour.open_time || "09:00"
    ).slice(0, 5);

    const doctorEnd = String(
      doctor?.end_time || workingHour.close_time || "18:00"
    ).slice(0, 5);

    const [openHour, openMinute] = doctorStart.split(":").map(Number);
    const [closeHour, closeMinute] = doctorEnd.split(":").map(Number);

    let currentMinutes = openHour * 60 + openMinute;
    const closingMinutes = closeHour * 60 + closeMinute;

    while (currentMinutes < closingMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const minute = currentMinutes % 60;
      const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(
        2,
        "0"
      )}`;

      if (
        currentMinutes + duration <= closingMinutes &&
        !bookedTimes.has(time)
      ) {
        slots.push(time);
      }

      currentMinutes += duration;
    }

    return slots;
  };

  const refreshAvailableSlots = async (doctorId: string, date: string) => {
    setAppointmentTime("");
    setAvailableSlots([]);

    if (!doctorId || !date) return;

    setLoadingSlots(true);
    try {
      const slots = await loadAvailableSlots(doctorId, date);
      setAvailableSlots(slots);
    } finally {
      setLoadingSlots(false);
    }
  };

  const createAppointment = async () => {
    if (
      !selectedCustomer ||
      !appointmentDoctor ||
      !appointmentService ||
      !appointmentDate ||
      !appointmentTime
    ) {
      alert("Please fill Doctor, Service, Date and Time.");
      return;
    }

    setSavingAppointment(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login again.");
        return;
      }

      const clinicId = await getClinicId(user.id);

      const selectedService = services.find(
        (service) => service.id === appointmentService
      );

      if (
        selectedService?.assigned_doctors?.length &&
        !selectedService.assigned_doctors.includes(appointmentDoctor)
      ) {
        alert(
          "The selected doctor is not assigned to this service. Please select an assigned doctor."
        );
        return;
      }

      const { data: existingAppointment } = await supabase
        .from("appointments")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("doctor_id", appointmentDoctor)
        .eq("appointment_date", appointmentDate)
        .eq("appointment_time", appointmentTime)
        .in("status", ["pending", "confirmed"])
        .limit(1)
        .maybeSingle();

      if (existingAppointment) {
        alert("This time slot is already booked. Please select another time.");
        await refreshAvailableSlots(appointmentDoctor, appointmentDate);
        return;
      }

      const { error } = await supabase
        .from("appointments")
        .insert({
          clinic_id: clinicId,
          user_id: user.id,
          contact_id: selectedCustomer.id,
          doctor_id: appointmentDoctor,
          service_id: appointmentService,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          patient_name:
            appointmentPatientName.trim() || selectedCustomer.name || "",
          gender: appointmentGender || null,
          age: appointmentAge ? Number(appointmentAge) : null,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) {
        console.error("Create appointment error:", error);
        alert("Failed to create appointment.");
        return;
      }

      try {
        const doctorName = getDoctorName(appointmentDoctor);
        const serviceName = getServiceName(appointmentService);
        const patientName =
          appointmentPatientName.trim() || selectedCustomer.name || "Patient";

        const formattedDate = new Date(
          `${appointmentDate}T00:00:00`
        ).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });

        const confirmationMessage = [
          `Hello ${patientName},`,
          ``,
          `Your appointment has been booked successfully.`,
          ``,
          `👨‍⚕️ Doctor: ${doctorName}`,
          `🩺 Service: ${serviceName}`,
          `📅 Date: ${formattedDate}`,
          `🕐 Time: ${appointmentTime}`,
          `📌 Status: Pending Confirmation`,
          ``,
          `Please contact the clinic if you need to reschedule or cancel.`,
          ``,
          `Thank you.`,
        ].join("\n");

        const whatsappResponse = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact_id: selectedCustomer.id,
            message_type: "text",
            content_text: confirmationMessage,
          }),
        });

        if (!whatsappResponse.ok) {
          console.error(
            "Appointment WhatsApp confirmation failed:",
            await whatsappResponse.text()
          );
        }
      } catch (whatsappError) {
        console.error(
          "Appointment WhatsApp confirmation error:",
          whatsappError
        );
      }

      setAppointmentDoctor("");
      setAppointmentService("");
      setAppointmentDate("");
      setAppointmentTime("");
      setAppointmentPatientName("");
      setAppointmentGender("");
      setAppointmentAge("");
      setAppointmentOpen(false);

      await loadData();
    } finally {
      setSavingAppointment(false);
    }
  };

  const updateAppointmentStatus = async (
    appointmentId: string,
    status: "pending" | "confirmed" | "completed" | "cancelled" | "no-show"
  ) => {
    setUpdatingAppointmentStatus(true);

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", appointmentId);

      if (error) {
        console.error("Appointment status update error:", error);
        alert("Failed to update appointment status.");
        return;
      }

      setSelectedAppointment((current) =>
        current?.id === appointmentId ? { ...current, status } : current
      );

      try {
        const appointment = appointments.find(
          (item) => item.id === appointmentId
        );

        if (appointment?.contact_id) {
          const customer = customers.find(
            (item) => item.id === appointment.contact_id
          );

          const doctorName = getDoctorName(appointment.doctor_id);
          const serviceName = getServiceName(appointment.service_id);
          const patientName =
            appointment.patient_name || customer?.name || "Patient";

          const statusMessages: Record<string, string> = {
            pending:
              "Your appointment is currently pending confirmation from the clinic.",
            confirmed: "Your appointment has been confirmed by the clinic.",
            cancelled:
              "Your appointment has been cancelled. Please contact the clinic if you need a new appointment.",
            completed:
              "Your appointment has been marked as completed. Thank you for visiting the clinic.",
            "no-show":
              "Our records show that the appointment was marked as no-show. Please contact the clinic if you would like to book another appointment.",
          };

          const formattedDate = new Date(
            `${appointment.appointment_date}T00:00:00`
          ).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          });

          const notification = [
            `Hello ${patientName},`,
            ``,
            statusMessages[status],
            ``,
            `👨‍⚕️ Doctor: ${doctorName}`,
            `🩺 Service: ${serviceName}`,
            `📅 Date: ${formattedDate}`,
            `🕐 Time: ${appointment.appointment_time}`,
            ``,
            `Thank you.`,
          ].join("\n");

          const whatsappResponse = await fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contact_id: appointment.contact_id,
              message_type: "text",
              content_text: notification,
            }),
          });

          if (!whatsappResponse.ok) {
            console.error(
              "Appointment status WhatsApp notification failed:",
              await whatsappResponse.text()
            );
          }
        }
      } catch (whatsappError) {
        console.error(
          "Appointment status WhatsApp notification error:",
          whatsappError
        );
      }

      await loadData();
    } finally {
      setUpdatingAppointmentStatus(false);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId);

    if (error) {
      console.error("Cancel appointment error:", error);
      alert("Failed to cancel appointment.");
      return;
    }

    try {
      const appointment = appointments.find(
        (item) => item.id === appointmentId
      );

      if (appointment?.contact_id) {
        const customer = customers.find(
          (item) => item.id === appointment.contact_id
        );

        const patientName =
          appointment.patient_name || customer?.name || "Patient";

        const doctorName = getDoctorName(appointment.doctor_id);
        const serviceName = getServiceName(appointment.service_id);

        const formattedDate = new Date(
          `${appointment.appointment_date}T00:00:00`
        ).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });

        const notification = [
          `Hello ${patientName},`,
          ``,
          `❌ Your appointment has been cancelled.`,
          ``,
          `👨‍⚕️ Doctor: ${doctorName}`,
          `🩺 Service: ${serviceName}`,
          `📅 Date: ${formattedDate}`,
          `🕐 Time: ${appointment.appointment_time}`,
          ``,
          `Please contact the clinic if you need to book another appointment.`,
          ``,
          `Thank you.`,
        ].join("\n");

        const whatsappResponse = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact_id: appointment.contact_id,
            message_type: "text",
            content_text: notification,
          }),
        });

        if (!whatsappResponse.ok) {
          console.error(
            "Cancellation WhatsApp notification failed:",
            await whatsappResponse.text()
          );
        }
      }
    } catch (whatsappError) {
      console.error(
        "Cancellation WhatsApp notification error:",
        whatsappError
      );
    }

    await loadData();
  };

  // ==================== CALENDAR ENGINE ====================

  const calendarMonthLabel = calendarDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const calendarWeekStart = new Date(calendarDate);
  calendarWeekStart.setHours(0, 0, 0, 0);
  calendarWeekStart.setDate(
    calendarWeekStart.getDate() - calendarWeekStart.getDay()
  );

  const calendarWeekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(calendarWeekStart);
    day.setDate(calendarWeekStart.getDate() + index);
    return day;
  });

  const calendarMonthStart = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth(),
    1
  );

  const calendarMonthEnd = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() + 1,
    0
  );

  const calendarGridStart = new Date(calendarMonthStart);
  calendarGridStart.setDate(
    calendarMonthStart.getDate() - calendarMonthStart.getDay()
  );

  const calendarGridEnd = new Date(calendarMonthEnd);
  calendarGridEnd.setDate(
    calendarMonthEnd.getDate() + (6 - calendarMonthEnd.getDay())
  );

  const calendarMonthDays: Date[] = [];
  const monthCursor = new Date(calendarGridStart);

  while (monthCursor <= calendarGridEnd) {
    calendarMonthDays.push(new Date(monthCursor));
    monthCursor.setDate(monthCursor.getDate() + 1);
  }

  const appointmentsForDate = (date: Date) => {
    const dateKey = formatCalendarDate(date);
    const query = appointmentSearch.trim().toLowerCase();

    return appointments
      .filter((appointment) => appointment.appointment_date === dateKey)
      .filter((appointment) => {
        if (!query) return true;

        const customer = customers.find(
          (item) => item.id === appointment.contact_id
        );

        const doctorName = getDoctorName(appointment.doctor_id);
        const serviceName = getServiceName(appointment.service_id);

        return [
          appointment.patient_name,
          customer?.name,
          customer?.phone,
          customer?.email,
          doctorName,
          serviceName,
          appointment.status,
          appointment.appointment_time,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .filter(
        (appointment) =>
          !calendarDoctorFilter ||
          appointment.doctor_id === calendarDoctorFilter
      )
      .filter(
        (appointment) =>
          !calendarStatusFilter ||
          appointment.status.toLowerCase() === calendarStatusFilter
      )
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  };

  const changeCalendarDate = (direction: number) => {
    setCalendarDate((current) => {
      const next = new Date(current);

      if (calendarView === "day") {
        next.setDate(next.getDate() + direction);
      } else if (calendarView === "week") {
        next.setDate(next.getDate() + direction * 7);
      } else {
        next.setMonth(next.getMonth() + direction);
      }

      return next;
    });
  };

  const goToCalendarToday = () => setCalendarDate(new Date());

  const isCalendarToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  // ==================== CUSTOMER DETAILS VIEW ====================

  if (selectedCustomer) {
    const customerAppointments = getCustomerAppointments(selectedCustomer.id);

    return (
      <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <button
            onClick={() => setSelectedCustomer(null)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </button>

          {/* Profile */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow-md">
                  {(selectedCustomer.name || selectedCustomer.phone || "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-slate-900">
                    {selectedCustomer.name || "Unnamed Customer"}
                  </h1>
                  <p className="mt-1 text-xs text-slate-500">
                    ID: <span className="font-mono">{selectedCustomer.id}</span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    setAppointmentPatientName(selectedCustomer.name || "");
                    setAppointmentOpen(true);
                    loadAppointmentOptions();
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  New Appointment
                </button>
              </div>
            </div>

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

          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              title="Total Appointments"
              value={customerAppointments.length}
              icon={<CalendarDays className="h-5 w-5" />}
              variant="blue"
            />
            <StatCard
              title="Active Appointments"
              value={
                customerAppointments.filter(
                  (a) => a.status === "pending" || a.status === "confirmed"
                ).length
              }
              icon={<Clock className="h-5 w-5" />}
              variant="amber"
            />
          </div>

          {/* Notes */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Customer Notes
              </h2>
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
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />

              <button
                onClick={addCustomerNote}
                disabled={savingNote || !newNote.trim()}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingNote && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingNote ? "Saving..." : "Add Note"}
              </button>

              <div className="mt-5 space-y-3">
                {customerNotes.length === 0 ? (
                  <p className="text-sm text-slate-400">No notes yet.</p>
                ) : (
                  customerNotes.map((note) => (
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
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-semibold text-slate-900">
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
                    className="p-5 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-slate-900">
                            {appointment.patient_name ||
                              selectedCustomer.name ||
                              "Patient"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {appointment.appointment_date}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {appointment.appointment_time}
                          </span>
                          {appointment.gender && (
                            <span>⚥ {appointment.gender}</span>
                          )}
                          {appointment.age && (
                            <span>🎂 Age: {appointment.age}</span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                            <Stethoscope className="mr-1 inline h-3 w-3" />
                            {getDoctorName(appointment.doctor_id)}
                          </span>
                          <span className="rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-600">
                            {getServiceName(appointment.service_id)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={appointment.status} />

                        {(appointment.status === "pending" ||
                          appointment.status === "confirmed") && (
                          <>
                            <button
                              onClick={() => {
                                const newDate = window.prompt(
                                  "Enter new date (YYYY-MM-DD):"
                                );
                                if (!newDate) return;
                                const newTime = window.prompt(
                                  "Enter new time (HH:MM):"
                                );
                                if (!newTime) return;
                                rescheduleAppointment(
                                  appointment.id,
                                  newDate,
                                  newTime
                                );
                              }}
                              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                            >
                              Reschedule
                            </button>

                            <button
                              onClick={() =>
                                cancelAppointment(appointment.id)
                              }
                              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              Cancel
                            </button>
                          </>
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

  // ==================== CUSTOMER LIST VIEW ====================

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              Customer Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage customers and their appointments from one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAddCustomerOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Customer
            </button>

            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Customers"
            value={customers.length}
            icon={<Users className="h-5 w-5" />}
            variant="blue"
          />
          <StatCard
            title="Total Appointments"
            value={appointments.length}
            icon={<CalendarDays className="h-5 w-5" />}
            variant="indigo"
          />
          <StatCard
            title="Pending"
            value={pendingAppointments}
            icon={<Clock className="h-5 w-5" />}
            variant="amber"
          />
          <StatCard
            title="Cancelled"
            value={cancelledAppointments}
            icon={<XCircle className="h-5 w-5" />}
            variant="red"
          />
        </div>

        {/* CALENDAR */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/40 p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Appointment Calendar
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage clinic appointments, doctors and patient schedules.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={goToCalendarToday}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Today
                </button>

                <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => changeCalendarDate(-1)}
                    className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => changeCalendarDate(1)}
                    className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100"
                    aria-label="Next"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                  {(["day", "week", "month"] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setCalendarView(view)}
                      className={`rounded-md px-3 py-2 text-sm font-semibold capitalize transition ${
                        calendarView === view
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative mt-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={appointmentSearch}
                onChange={(e) => setAppointmentSearch(e.target.value)}
                placeholder="Search patient, phone, doctor, service, status or time..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                {
                  label: "Today",
                  value: appointments.filter(
                    (a) =>
                      a.appointment_date ===
                      formatCalendarDate(new Date())
                  ).length,
                  className: "border-blue-200 bg-blue-50 text-blue-700",
                },
                {
                  label: "Pending",
                  value: appointments.filter(
                    (a) => a.status.toLowerCase() === "pending"
                  ).length,
                  className: "border-amber-200 bg-amber-50 text-amber-700",
                },
                {
                  label: "Confirmed",
                  value: appointments.filter(
                    (a) => a.status.toLowerCase() === "confirmed"
                  ).length,
                  className:
                    "border-emerald-200 bg-emerald-50 text-emerald-700",
                },
                {
                  label: "Completed",
                  value: appointments.filter(
                    (a) => a.status.toLowerCase() === "completed"
                  ).length,
                  className: "border-indigo-200 bg-indigo-50 text-indigo-700",
                },
                {
                  label: "Cancelled / No-show",
                  value: appointments.filter((a) =>
                    ["cancelled", "canceled", "no-show"].includes(
                      a.status.toLowerCase()
                    )
                  ).length,
                  className: "border-red-200 bg-red-50 text-red-700",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-xl border px-4 py-3 ${stat.className}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2">
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={calendarDoctorFilter}
                  onChange={(e) => setCalendarDoctorFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500"
                >
                  <option value="">All Doctors</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.doctor_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={calendarStatusFilter}
                  onChange={(e) => setCalendarStatusFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="no-show">No-show</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {calendarView === "month"
                  ? calendarMonthLabel
                  : calendarView === "week"
                  ? `${calendarWeekDays[0].toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })} - ${calendarWeekDays[6].toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}`
                  : calendarDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
              </h3>

              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  Pending
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Confirmed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  Completed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  Cancelled
                </span>
              </div>
            </div>
          </div>

          {calendarView === "month" && (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="border-r border-slate-200 px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500 last:border-r-0"
                      >
                        {day}
                      </div>
                    )
                  )}
                </div>

                <div className="grid grid-cols-7">
                  {calendarMonthDays.map((date) => {
                    const dayAppointments = appointmentsForDate(date);
                    const isCurrentMonth =
                      date.getMonth() === calendarDate.getMonth();

                    return (
                      <div
                        key={formatCalendarDate(date)}
                        className={`min-h-[155px] border-b border-r border-slate-200 p-2 transition ${
                          !isCurrentMonth
                            ? "bg-slate-50/60"
                            : "bg-white hover:bg-slate-50/40"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                              isCalendarToday(date)
                                ? "bg-blue-600 text-white shadow-sm"
                                : isCurrentMonth
                                ? "text-slate-700"
                                : "text-slate-400"
                            }`}
                          >
                            {date.getDate()}
                          </span>

                          {dayAppointments.length > 0 && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                              {dayAppointments.length}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          {dayAppointments.slice(0, 4).map((appointment) => (
                            <button
                              key={appointment.id}
                              type="button"
                              onClick={() => setSelectedAppointment(appointment)}
                              className={`w-full rounded-lg border p-2 text-left transition hover:shadow-sm ${getAppointmentStatusClass(
                                appointment.status
                              )}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold">
                                  {appointment.appointment_time}
                                </span>
                                <span className="truncate text-[9px] font-semibold uppercase">
                                  {getAppointmentStatusLabel(
                                    appointment.status
                                  )}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs font-bold">
                                {appointment.patient_name || "Patient"}
                              </p>
                              <p className="truncate text-[10px] opacity-80">
                                {getDoctorName(appointment.doctor_id)}
                              </p>
                            </button>
                          ))}

                          {dayAppointments.length > 4 && (
                            <button
                              type="button"
                              className="w-full rounded-md px-2 py-1 text-left text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
                            >
                              +{dayAppointments.length - 4} more appointments
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {calendarView === "week" && (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                  {calendarWeekDays.map((date) => (
                    <div
                      key={formatCalendarDate(date)}
                      className={`border-r border-slate-200 p-4 text-center last:border-r-0 ${
                        isCalendarToday(date) ? "bg-blue-50" : ""
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        {date.toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </p>
                      <p
                        className={`mt-1 text-xl font-bold ${
                          isCalendarToday(date)
                            ? "text-blue-600"
                            : "text-slate-800"
                        }`}
                      >
                        {date.getDate()}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {calendarWeekDays.map((date) => {
                    const dayAppointments = appointmentsForDate(date);

                    return (
                      <div
                        key={formatCalendarDate(date)}
                        className="min-h-[420px] border-r border-slate-200 p-3 last:border-r-0"
                      >
                        <div className="space-y-2">
                          {dayAppointments.length === 0 ? (
                            <p className="py-10 text-center text-xs text-slate-400">
                              No appointments
                            </p>
                          ) : (
                            dayAppointments.map((appointment) => (
                              <button
                                key={appointment.id}
                                type="button"
                                onClick={() =>
                                  setSelectedAppointment(appointment)
                                }
                                className={`w-full rounded-xl border p-3 text-left transition hover:shadow-sm ${getAppointmentStatusClass(
                                  appointment.status
                                )}`}
                              >
                                <p className="text-sm font-bold">
                                  {appointment.appointment_time}
                                </p>
                                <p className="mt-1 truncate text-sm font-semibold">
                                  {appointment.patient_name || "Patient"}
                                </p>
                                <p className="mt-1 truncate text-xs">
                                  {getDoctorName(appointment.doctor_id)}
                                </p>
                                <p className="mt-1 truncate text-[11px] opacity-75">
                                  {getServiceName(appointment.service_id)}
                                </p>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {calendarView === "day" && (
            <div className="p-5 md:p-6">
              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="font-semibold text-slate-900">
                    {calendarDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {appointmentsForDate(calendarDate).length === 0 ? (
                    <div className="py-16 text-center text-sm text-slate-500">
                      No appointments scheduled for this day.
                    </div>
                  ) : (
                    appointmentsForDate(calendarDate).map((appointment) => (
                      <button
                        key={appointment.id}
                        type="button"
                        onClick={() => setSelectedAppointment(appointment)}
                        className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-slate-50 md:flex-row md:items-center"
                      >
                        <div className="w-24 shrink-0">
                          <p className="text-lg font-bold text-slate-900">
                            {appointment.appointment_time}
                          </p>
                        </div>

                        <div
                          className={`flex-1 rounded-xl border p-4 ${getAppointmentStatusClass(
                            appointment.status
                          )}`}
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-bold">
                                {appointment.patient_name || "Patient"}
                              </p>
                              <p className="mt-1 text-sm">
                                {getDoctorName(appointment.doctor_id)} •{" "}
                                {getServiceName(appointment.service_id)}
                              </p>
                            </div>

                            <span className="w-fit rounded-full border bg-white/70 px-3 py-1 text-xs font-bold">
                              {getAppointmentStatusLabel(appointment.status)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Search */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer by name, phone or email..."
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Customers</h2>
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
                const customerAppointments = getCustomerAppointments(
                  customer.id
                );

                return (
                  <div
                    key={customer.id}
                    className="p-5 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-semibold text-white shadow-sm">
                          {(customer.name || customer.phone || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900">
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
                        <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                          {customerAppointments.length} appointment
                          {customerAppointments.length === 1 ? "" : "s"}
                        </div>

                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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

      {/* ==================== NEW APPOINTMENT MODAL ==================== */}
      {appointmentOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  New Appointment
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  For {selectedCustomer.name || selectedCustomer.phone}
                </p>
              </div>
              <button
                onClick={() => setAppointmentOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Close"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <select
                value={appointmentDoctor}
                onChange={(e) => {
                  const doctorId = e.target.value;
                  setAppointmentDoctor(doctorId);
                  refreshAvailableSlots(doctorId, appointmentDate);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select Doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.doctor_name}
                  </option>
                ))}
              </select>

              <select
                value={appointmentService}
                onChange={(e) => setAppointmentService(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select Service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.service_name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => {
                  const date = e.target.value;
                  setAppointmentDate(date);
                  setAppointmentTime("");

                  if (!appointmentDoctor || !date) {
                    setAvailableSlots([]);
                    return;
                  }

                  refreshAvailableSlots(appointmentDoctor, date);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Available Time
                </label>

                {!appointmentDoctor || !appointmentDate ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                    Select Doctor and Date first.
                  </p>
                ) : loadingSlots ? (
                  <p className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading available slots...
                  </p>
                ) : availableSlots.length === 0 ? (
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    No available slots for this date.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setAppointmentTime(slot)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          appointmentTime === slot
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-900 hover:border-blue-400 hover:bg-blue-50"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="text"
                value={appointmentPatientName}
                onChange={(e) => setAppointmentPatientName(e.target.value)}
                placeholder="Patient Name"
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={appointmentGender}
                  onChange={(e) => setAppointmentGender(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>

                <input
                  type="number"
                  min="0"
                  value={appointmentAge}
                  onChange={(e) => setAppointmentAge(e.target.value)}
                  placeholder="Age"
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                onClick={createAppointment}
                disabled={savingAppointment}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingAppointment && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {savingAppointment ? "Creating..." : "Create Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== APPOINTMENT DETAILS MODAL ==================== */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/40 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Appointment Details
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedAppointment.patient_name || "Patient"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200"
                aria-label="Close appointment details"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              {(() => {
                const customer = customers.find(
                  (item) => item.id === selectedAppointment.contact_id
                );
                const phone = customer?.phone || "";

                return (
                  <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 sm:col-span-2">
                    {phone && (
                      <>
                        <a
                          href={`tel:${phone}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                        >
                          <Phone className="h-4 w-4" />
                          Call Patient
                        </a>
                        <a
                          href={`https://wa.me/${phone.replace(
                            /[^0-9]/g,
                            ""
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </a>
                      </>
                    )}

                    {customer && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAppointment(null);
                          setSelectedCustomer(customer);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <User className="h-4 w-4" />
                        Patient Profile
                      </button>
                    )}
                  </div>
                );
              })()}

              <DetailBox
                label="Date"
                value={selectedAppointment.appointment_date}
              />
              <DetailBox
                label="Time"
                value={selectedAppointment.appointment_time}
              />
              <DetailBox
                label="Doctor"
                value={getDoctorName(selectedAppointment.doctor_id)}
              />
              <DetailBox
                label="Service"
                value={getServiceName(selectedAppointment.service_id)}
              />

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Patient
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedAppointment.patient_name || "Not available"}
                </p>
                {(() => {
                  const customer = customers.find(
                    (item) => item.id === selectedAppointment.contact_id
                  );

                  return (
                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      <p>📞 {customer?.phone || "Phone not available"}</p>
                      <p>✉️ {customer?.email || "Email not available"}</p>
                      <p className="break-all font-mono text-[10px]">
                        ID: {selectedAppointment.contact_id}
                      </p>
                    </div>
                  );
                })()}
              </div>

              <DetailBox
                label="Patient Details"
                value={`${
                  selectedAppointment.gender || "Gender not set"
                }${
                  selectedAppointment.age !== undefined &&
                  selectedAppointment.age !== null
                    ? ` • ${selectedAppointment.age} years`
                    : ""
                }`}
              />
            </div>

            <div className="border-t border-slate-200 px-6 py-5">
              <p className="mb-3 text-sm font-semibold text-slate-700">
                Update Appointment Status
              </p>

              <div className="mb-5 flex flex-wrap gap-2">
                {(
                  [
                    "pending",
                    "confirmed",
                    "completed",
                    "no-show",
                    "cancelled",
                  ] as const
                ).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={updatingAppointmentStatus}
                    onClick={() =>
                      updateAppointmentStatus(selectedAppointment.id, status)
                    }
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition ${
                      selectedAppointment.status === status
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {updatingAppointmentStatus &&
                      selectedAppointment.status !== status && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    {status}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedAppointment(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ContactForm
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        onSaved={() => {
          setAddCustomerOpen(false);
          loadData();
        }}
      />
    </div>
  );
}

// ==================== SUB COMPONENTS ====================

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
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm">
      <div className="flex items-center gap-2 text-blue-600">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-2 break-words text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  variant = "blue",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant?: "blue" | "indigo" | "amber" | "red";
}) {
  const variantClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div
          className={`rounded-lg p-2 ${variantClasses[variant] || variantClasses.blue}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
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
      : normalized === "completed"
      ? "Completed"
      : normalized === "no-show"
      ? "No-show"
      : status;

  const className =
    normalized === "confirmed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : normalized === "pending"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : normalized === "cancelled" || normalized === "canceled"
      ? "bg-red-50 text-red-700 border-red-200"
      : normalized === "completed"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : normalized === "no-show"
      ? "bg-slate-100 text-slate-600 border-slate-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${className}`}
    >
      {label}
    </span>
  );
}
