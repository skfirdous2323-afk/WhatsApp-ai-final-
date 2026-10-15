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

    if (
      !["cancel", "delete"].includes(action) ||
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > 100 ||
      ids.some((id: unknown) => typeof id !== "string" || !id.trim()) ||
      new Set(ids).size !== ids.length
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
      .select("id, status")
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

    if (
      action === "cancel" &&
      ownedAppointments.some((appointment) =>
        ["cancelled", "canceled", "completed", "no-show"].includes(
          String(appointment.status || "")
            .toLowerCase()
            .replace(/[\\s_]+/g, "-")
        )
      )
    ) {
      return NextResponse.json(
        { error: "Completed, no-show, or already cancelled appointments cannot be cancelled again." },
        { status: 409 }
      );
    }

    const query =
      action === "cancel"
        ? supabase
            .from("appointments")
            .update({ status: "cancelled" })
            .eq("clinic_id", clinic.id)
            .in("id", ids)
        : supabase
            .from("appointments")
            .delete()
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
