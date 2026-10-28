import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in again." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const action = body?.action;
    const ids = body?.ids;
    const newDate = body?.date;
    const newTime = body?.time;

    if (
      !["cancel", "delete", "approve", "reject", "complete", "no-show", "reschedule"].includes(action) ||
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > 100 ||
      (action === "reschedule" && ids.length !== 1) ||
      ids.some((id: unknown) => typeof id !== "string" || !id.trim()) ||
      new Set(ids).size !== ids.length ||
      (action === "reschedule" &&
        (typeof newDate !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(newDate) ||
          Number.isNaN(Date.parse(`${newDate}T00:00:00`)) ||
          typeof newTime !== "string" ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime)))
    ) {
      return NextResponse.json(
        { error: "Invalid appointment action or selection." },
        { status: 400 }
      );
    }

    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (clinicError || !clinic?.id) {
      return NextResponse.json(
        { error: "Your clinic could not be verified." },
        { status: 403 }
      );
    }

    const { data: ownedAppointments, error: lookupError } = await supabase
      .from("appointments")
      .select("id, status, doctor_id, appointment_date, appointment_time")
      .eq("clinic_id", clinic.id)
      .in("id", ids);

    if (lookupError) {
      console.error("Appointment ownership check failed:", lookupError);
      return NextResponse.json(
        { error: "Could not verify the selected appointments." },
        { status: 500 }
      );
    }

    if (!ownedAppointments || ownedAppointments.length !== ids.length) {
      return NextResponse.json(
        { error: "Some appointments were not found in your clinic." },
        { status: 404 }
      );
    }

    const normalizedStatus = (status: string) =>
      String(status || "").toLowerCase().replace(/[_\s]+/g, "-");

    if (action === "reschedule") {
      const appointment = ownedAppointments[0];
      const status = normalizedStatus(appointment.status);

      if (["cancelled", "canceled", "completed", "no-show"].includes(status)) {
        return NextResponse.json(
          { error: "Completed, cancelled, or no-show appointments cannot be rescheduled." },
          { status: 409 }
        );
      }

      const [year, month, day] = newDate.split("-").map(Number);
      const dateObject = new Date(year, month - 1, day);
      const validDate =
        dateObject.getFullYear() === year &&
        dateObject.getMonth() === month - 1 &&
        dateObject.getDate() === day;
      const today = new Date();
      const todayLocal = new Date(
        today.getFullYear(), today.getMonth(), today.getDate()
      );
      if (!validDate || dateObject < todayLocal) {
        return NextResponse.json(
          { error: "Choose today or a future date." },
          { status: 400 }
        );
      }

      if (appointment.doctor_id) {
        const { data: conflicts, error: conflictError } = await supabase
          .from("appointments")
          .select("id")
          .eq("clinic_id", clinic.id)
          .eq("doctor_id", appointment.doctor_id)
          .eq("appointment_date", newDate)
          .eq("appointment_time", newTime)
          .in("status", ["pending", "confirmed"])
          .neq("id", appointment.id)
          .limit(1);

        if (conflictError) {
          console.error("Appointment reschedule conflict check failed:", conflictError);
          return NextResponse.json(
            { error: "Could not verify availability for that time slot." },
            { status: 500 }
          );
        }

        if (conflicts?.length) {
          return NextResponse.json(
            { error: "That doctor already has an appointment at this time. Choose another slot." },
            { status: 409 }
          );
        }
      }

      const { data: updated, error: updateError } = await supabase
        .from("appointments")
        .update({ appointment_date: newDate, appointment_time: newTime })
        .eq("clinic_id", clinic.id)
        .eq("id", appointment.id)
        .select("id")
        .maybeSingle();

      if (updateError || !updated) {
        console.error("Appointment reschedule failed:", updateError);
        return NextResponse.json(
          { error: "Could not reschedule this appointment." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, action, count: 1 });
    }

    if (
      action === "cancel" &&
      ownedAppointments.some((appointment) =>
        ["cancelled", "canceled", "completed", "no-show"].includes(
          normalizedStatus(appointment.status)
        )
      )
    ) {
      return NextResponse.json(
        { error: "Completed, no-show, or already cancelled appointments cannot be cancelled again." },
        { status: 409 }
      );
    }

    if (
      ["approve", "reject"].includes(action) &&
      ownedAppointments.some((appointment) => normalizedStatus(appointment.status) !== "pending")
    ) {
      return NextResponse.json(
        { error: "Only pending appointments can be approved or rejected. Refresh and try again." },
        { status: 409 }
      );
    }

    if (
      ["complete", "no-show"].includes(action) &&
      ownedAppointments.some(
        (appointment) => normalizedStatus(appointment.status) !== "confirmed"
      )
    ) {
      return NextResponse.json(
        { error: "Only confirmed appointments can be marked completed or not visited." },
        { status: 409 }
      );
    }

    const query =
      action === "delete"
        ? supabase
            .from("appointments")
            .delete()
            .eq("clinic_id", clinic.id)
            .in("id", ids)
        : supabase
            .from("appointments")
            .update({
              status:
                action === "approve"
                  ? "confirmed"
                  : action === "complete"
                    ? "completed"
                    : action === "no-show"
                      ? "no-show"
                      : action === "reject" || action === "cancel"
                        ? "cancelled"
                        : "pending",
            })
            .eq("clinic_id", clinic.id)
            .in("id", ids);

    const { data: changedAppointments, error: actionError } = await query
      .select("id");

    if (actionError) {
      console.error(`Appointment ${action} failed:`, actionError);
      return NextResponse.json(
        {
          error:
            action === "delete"
              ? "Delete failed. Check database permissions and related records."
              : "Cancellation failed. Check database permissions.",
        },
        { status: 500 }
      );
    }

    if (!changedAppointments || changedAppointments.length !== ids.length) {
      return NextResponse.json(
        {
          error:
            "Not all appointments were changed. Refresh the list and check database permissions.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      action,
      count: changedAppointments.length,
    });
  } catch (error) {
    console.error("Appointment management request failed:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
