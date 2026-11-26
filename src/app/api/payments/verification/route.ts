import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { resolveConversationByPhone } from "@/lib/whatsapp/resolve-conversation";
import { sendMessageToConversation } from "@/lib/whatsapp/send-message";

export const dynamic = "force-dynamic";

async function getOwnedClinic() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Please sign in again.", status: 401 as const };
  }

  const [{ data: clinic, error }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase
        .from("clinics")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("account_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  if (error || !clinic?.id || profileError || !profile?.account_id) {
    return { error: "Your clinic or WhatsApp account could not be verified.", status: 403 as const };
  }

  return { user, clinic, accountId: profile.account_id as string };
}

export async function GET() {
  try {
    const ownership = await getOwnedClinic();

    if ("error" in ownership) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    const db = supabaseAdmin();

    const { data: payments, error } = await db
      .from("clinic_payment_submissions")
      .select(
        "id, appointment_id, contact_id, amount, status, screenshot_path, utr, submitted_at, created_at"
      )
      .eq("clinic_id", ownership.clinic.id)
      .eq("status", "pending_verification")
      .order("submitted_at", { ascending: true });

    if (error) {
      console.error("[Payment Verification] List failed:", error);
      return NextResponse.json(
        { error: "Could not load pending payments." },
        { status: 500 }
      );
    }

    const results = await Promise.all(
      (payments || []).map(async (payment) => {
        let screenshotUrl: string | null = null;

        if (payment.screenshot_path) {
          const { data, error: urlError } = await db.storage
            .from("clinic-payment-submissions")
            .createSignedUrl(payment.screenshot_path, 60);

          if (!urlError) screenshotUrl = data?.signedUrl || null;
        }

        return {
          ...payment,
          screenshot_path: undefined,
          screenshot_url: screenshotUrl,
        };
      })
    );

    return NextResponse.json(
      { payments: results },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("[Payment Verification] GET failed:", error);
    return NextResponse.json(
      { error: "Unexpected error loading payments." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ownership = await getOwnedClinic();

    if ("error" in ownership) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    const body = await request.json();
    const paymentId = body?.paymentId;
    const action = body?.action;
    const utr = typeof body?.utr === "string" ? body.utr.trim() : "";
    const rejectionReason =
      typeof body?.rejectionReason === "string"
        ? body.rejectionReason.trim()
        : "";

    if (
      typeof paymentId !== "string" ||
      !paymentId.trim() ||
      !["approve", "reject"].includes(action) ||
      (action === "approve" && body?.verifiedReceived !== true) ||
      (action === "reject" && !rejectionReason)
    ) {
      return NextResponse.json(
        { error: "Invalid payment verification request." },
        { status: 400 }
      );
    }

    if (utr.length > 100 || rejectionReason.length > 500) {
      return NextResponse.json(
        { error: "UTR or rejection reason is too long." },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();

    const { data: payment, error: lookupError } = await db
      .from("clinic_payment_submissions")
      .select("id, appointment_id, contact_id, status")
      .eq("id", paymentId)
      .eq("clinic_id", ownership.clinic.id)
      .maybeSingle();

    if (lookupError || !payment) {
      return NextResponse.json(
        { error: "Payment request was not found in your clinic." },
        { status: 404 }
      );
    }

    if (payment.status !== "pending_verification") {
      return NextResponse.json(
        { error: "This payment has already been processed or is not awaiting verification." },
        { status: 409 }
      );
    }

    const newStatus = action === "approve" ? "paid" : "rejected";
    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await db
      .from("clinic_payment_submissions")
      .update({
        status: newStatus,
        utr: utr || null,
        rejection_reason: action === "reject" ? rejectionReason : null,
        verified_by: ownership.user.id,
        verified_at: now,
        updated_at: now,
      })
      .eq("id", payment.id)
      .eq("clinic_id", ownership.clinic.id)
      .eq("status", "pending_verification")
      .select("id")
      .maybeSingle();

    if (updateError || !updated) {
      console.error("[Payment Verification] Update failed:", updateError);
      return NextResponse.json(
        { error: "Payment could not be updated. Refresh and try again." },
        { status: 409 }
      );
    }

    const { error: appointmentError } = await db
      .from("appointments")
      .update({ payment_status: newStatus, ...(action === "approve" ? { paid_at: now } : {}) })
      .eq("id", payment.appointment_id)
      .eq("clinic_id", ownership.clinic.id);

    if (appointmentError) {
      console.error("[Payment Verification] Appointment update failed:", appointmentError);

      await db
        .from("clinic_payment_submissions")
        .update({
          status: "pending_verification",
          verified_by: null,
          verified_at: null,
          rejection_reason: null,
          utr: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id)
        .eq("clinic_id", ownership.clinic.id)
        .eq("status", newStatus);

      return NextResponse.json(
        { error: "Payment status could not be synchronized with the appointment. Please retry." },
        { status: 500 }
      );
    }

    // Notify the patient through the existing WhatsApp conversation.
    // Notification failure must never undo a successfully verified payment.
    let whatsappNotificationSent = false;

    if (payment.contact_id) {
      try {
        const { data: contact, error: contactError } = await db
          .from("contacts")
          .select("id, phone, name")
          .eq("id", payment.contact_id)
          .eq("account_id", ownership.accountId)
          .maybeSingle();

        if (contactError) {
          throw contactError;
        }

        if (contact?.phone) {
          const conversation = await resolveConversationByPhone(
            db,
            ownership.accountId,
            contact.phone,
            contact.name
          );

          const message =
            action === "approve"
              ? "Good news! Your payment has been verified successfully. Your appointment is confirmed. Thank you."
              : `Your payment could not be verified. Reason: ${rejectionReason}. Please contact the clinic if you need help.`;

          await sendMessageToConversation(db, ownership.accountId, {
            conversationId: conversation.conversationId,
            messageType: "text",
            contentText: message,
          });

          whatsappNotificationSent = true;
        }
      } catch (notificationError) {
        console.error(
          "[Payment Verification] WhatsApp notification failed:",
          notificationError
        );
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      status: newStatus,
      whatsappNotificationSent,
      message:
        action === "approve"
          ? "Payment verified successfully."
          : "Payment rejected successfully.",
    });
  } catch (error) {
    console.error("[Payment Verification] POST failed:", error);
    return NextResponse.json(
      { error: "Unexpected error processing payment verification." },
      { status: 500 }
    );
  }
}
