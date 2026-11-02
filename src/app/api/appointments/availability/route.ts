import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type WorkingHours = {
  day_name: string;
  open_time: string | null;
  close_time: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  is_closed: boolean;
};

function minutes(value: string) {
  const [hours, mins] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + mins;
}

function formatTime(value: number) {
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function overlapsLunch(
  start: number,
  end: number,
  lunchStart: string | null,
  lunchEnd: string | null
) {
  if (!lunchStart || !lunchEnd) return false;
  return start < minutes(lunchEnd) && end > minutes(lunchStart);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }

    const body = await request.json();
    const doctorId = body?.doctorId;
    const selectedDate = body?.date;

    if (
      typeof doctorId !== "string" ||
      !doctorId.trim() ||
      (selectedDate !== undefined &&
        (typeof selectedDate !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)))
    ) {
      return NextResponse.json({ error: "Invalid doctor or date." }, { status: 400 });
    }

    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (clinicError || !clinic?.id) {
      return NextResponse.json({ error: "Your clinic could not be verified." }, { status: 403 });
    }

    const [doctorResult, settingsResult, hoursResult] = await Promise.all([
      supabase
        .from("clinic_doctors")
        .select("id, available_days, start_time, end_time")
        .eq("id", doctorId)
        .eq("clinic_id", clinic.id)
        .maybeSingle(),
      supabase
        .from("clinic_appointment_settings")
        .select("slot_duration, max_booking_days, allow_online_booking")
        .eq("clinic_id", clinic.id)
        .maybeSingle(),
      supabase
        .from("clinic_working_hours")
        .select("day_name, open_time, close_time, lunch_start, lunch_end, is_closed")
        .eq("clinic_id", clinic.id),
    ]);

    if (doctorResult.error || settingsResult.error || hoursResult.error) {
      throw new Error("Could not load clinic availability settings.");
    }

    const doctor = doctorResult.data;
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
    }

    const settings = settingsResult.data;
    if (settings?.allow_online_booking === false) {
      return NextResponse.json({ error: "Online appointment booking is disabled." }, { status: 403 });
    }

    const slotDuration = Math.max(5, Number(settings?.slot_duration) || 30);
    const bookingDays = Math.max(1, Math.min(90, Number(settings?.max_booking_days) || 30));
    const workingHours = (hoursResult.data || []) as WorkingHours[];

    const workingMap = new Map(
      workingHours.map((row) => [row.day_name.toLowerCase(), row])
    );

    const doctorDays = Array.isArray(doctor.available_days)
      ? doctor.available_days.map((day: string) => day.toLowerCase())
      : [];

    const doctorStart = doctor.start_time?.slice(0, 5) || "09:00";
    const doctorEnd = doctor.end_time?.slice(0, 5) || "18:00";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastDate = new Date(today);
    lastDate.setDate(lastDate.getDate() + bookingDays - 1);

    const todayString = formatDate(today);
    const lastDateString = formatDate(lastDate);

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("appointment_date, appointment_time")
      .eq("clinic_id", clinic.id)
      .eq("doctor_id", doctorId)
      .gte("appointment_date", todayString)
      .lte("appointment_date", lastDateString)
      .in("status", ["pending", "confirmed"]);

    if (appointmentsError) throw appointmentsError;

    const bookedMap = new Map<string, Set<string>>();

    for (const appointment of appointments || []) {
      if (!appointment.appointment_date || !appointment.appointment_time) continue;

      const dateKey = String(appointment.appointment_date).slice(0, 10);
      if (!bookedMap.has(dateKey)) bookedMap.set(dateKey, new Set());

      bookedMap.get(dateKey)!.add(String(appointment.appointment_time).slice(0, 5));
    }

    const availableDates: Array<{
      value: string;
      label: string;
      day: string;
    }> = [];

    const slotsForDate = (dateString: string) => {
      const [year, month, day] = dateString.split("-").map(Number);
      const dateObject = new Date(year, month - 1, day);
      const weekday = dateObject.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

      const clinicHours = workingMap.get(weekday);
      if (!clinicHours || clinicHours.is_closed) return [];

      if (doctorDays.length > 0 && !doctorDays.includes(weekday)) return [];

      const clinicStart = clinicHours.open_time?.slice(0, 5) || doctorStart;
      const clinicEnd = clinicHours.close_time?.slice(0, 5) || doctorEnd;

      const start = Math.max(minutes(doctorStart), minutes(clinicStart));
      const end = Math.min(minutes(doctorEnd), minutes(clinicEnd));

      if (end <= start) return [];

      const booked = bookedMap.get(dateString) || new Set<string>();
      const slots: Array<{ value: string; label: string }> = [];

      for (let current = start; current + slotDuration <= end; current += slotDuration) {
        const value = formatTime(current);

        if (booked.has(value)) continue;

        if (
          overlapsLunch(
            current,
            current + slotDuration,
            clinicHours.lunch_start,
            clinicHours.lunch_end
          )
        ) {
          continue;
        }

        const hour = Math.floor(current / 60);
        const minute = current % 60;
        const hour12 = hour % 12 || 12;
        const suffix = hour >= 12 ? "PM" : "AM";

        slots.push({
          value,
          label: `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`,
        });
      }

      return slots;
    };

    for (let i = 0; i < bookingDays; i++) {
      const dateObject = new Date(today);
      dateObject.setDate(today.getDate() + i);

      const dateString = formatDate(dateObject);
      const slots = slotsForDate(dateString);

      if (slots.length === 0) continue;

      availableDates.push({
        value: dateString,
        label: dateObject.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        day: dateObject.toLocaleDateString("en-US", { weekday: "long" }),
      });
    }

    if (selectedDate) {
      if (!availableDates.some((item) => item.value === selectedDate)) {
        return NextResponse.json({ dates: availableDates, slots: [] });
      }

      return NextResponse.json({
        dates: availableDates,
        slots: slotsForDate(selectedDate),
      });
    }

    return NextResponse.json({ dates: availableDates, slots: [] });
  } catch (error: any) {
    console.error("Appointment availability error:", error);
    return NextResponse.json(
      { error: error?.message || "Could not load appointment availability." },
      { status: 500 }
    );
  }
}
