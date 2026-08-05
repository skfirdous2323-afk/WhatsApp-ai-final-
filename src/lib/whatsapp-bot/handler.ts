import { engineSendText } from "@/lib/flows/meta-send";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { sendMainMenu } from "@/lib/whatsapp-bot/menu";
import {
  getSession,
  setSession,
  clearSession,
} from "@/lib/whatsapp-bot/session";

// Type definitions
interface SessionData {
  step: string;
  serviceId?: string;
  serviceName?: string;
  doctorId?: string;
  doctorName?: string;
  date?: string;
  time?: string;
  patientName?: string;
  patientPhone?: string;
}

export async function runWhatsAppBot({
  accountId,
  userId,
  conversationId,
  contactId,
  text,
}: {
  accountId: string;
  userId: string;
  conversationId: string;
  contactId: string;
  text: string;
}) {
  const msg = text.trim().toLowerCase();

  // Convert text commands to numbers
  const command = msg
    .replace(/^book$/i, "1")
    .replace(/^doctors$/i, "2")
    .replace(/^services$/i, "3")
    .replace(/^hours$/i, "4")
    .replace(/^faq$/i, "5")
    .replace(/^contact$/i, "6")
    .replace(/^location$/i, "7");

  const db = supabaseAdmin();

  // Get clinic ID
  const { data: clinic, error: clinicError } = await db
    .from("clinics")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (clinicError || !clinic) {
    console.error("Clinic not found", clinicError);
    return false;
  }

  const clinicId = clinic.id;
  const session = getSession(contactId) as SessionData | null;

  // ============================================================
  // Handle session-based flows
  // ============================================================
  if (session) {
    // ---- STEP: Service Selection ----
    if (session.step === "service") {
      const serviceIndex = parseInt(command) - 1;

      const { data: services } = await db
        .from("clinic_services")
        .select("id, service_name")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (services && services[serviceIndex]) {
        const selected = services[serviceIndex];

        setSession(contactId, {
          step: "doctor",
          serviceId: selected.id,
          serviceName: selected.service_name,
        });

        const { data: doctors } = await db
          .from("clinic_doctors")
          .select("id, doctor_name, specialization")
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false });

        if (!doctors || doctors.length === 0) {
          await engineSendText({
            accountId,
            userId,
            conversationId,
            contactId,
            text: "❌ No doctors available. Please contact the clinic.",
          });
          clearSession(contactId);
          return true;
        }

        const doctorList = doctors
          .map(
            (d: any, i: number) =>
              `${i + 1}. ${d.doctor_name} (${d.specialization})`
          )
          .join("\n");

        await engineSendText({
          accountId,
          userId,
          conversationId,
          contactId,
          text: `👨‍⚕️ Select a Doctor for ${selected.service_name}:\n\n${doctorList}\n\nReply with the number.`,
        });

        return true;
      } else {
        await engineSendText({
          accountId,
          userId,
          conversationId,
          contactId,
          text: "❌ Invalid selection. Please reply with a number from the list.",
        });
        return true;
      }
    }

    // ---- STEP: Doctor Selection ----
    if (session.step === "doctor") {
      const doctorIndex = parseInt(command) - 1;

      const { data: doctors } = await db
        .from("clinic_doctors")
        .select("id, doctor_name, specialization")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (doctors && doctors[doctorIndex]) {
        const selected = doctors[doctorIndex];

        setSession(contactId, {
          step: "date",
          serviceId: session.serviceId,
          serviceName: session.serviceName,
          doctorId: selected.id,
          doctorName: selected.doctor_name,
        });

        await engineSendText({
          accountId,
          userId,
          conversationId,
          contactId,
          text: `📅 Please enter the date for your appointment with ${selected.doctor_name}.\n\nFormat: DD-MM-YYYY (e.g., 25-12-2024)`,
        });

        return true;
      } else {
        await engineSendText({
          accountId,
          userId,
          conversationId,
          contactId,
          text: "❌ Invalid selection. Please reply with a number from the list.",
        });
        return true;
      }
    }

    // ---- STEP: Date Selection ----
    if (session.step === "date") {
      const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
      if (!dateRegex.test(msg)) {
        await engineSendText({
          accountId,
          userId,
          conversationId,
          contactId,
          text: "❌ Invalid date format. Please use DD-MM-YYYY (e.g., 25-12-2024)",
        });
        return true;
      }

      setSession(contactId, {
        step: "time",
        serviceId: session.serviceId,
        serviceName: session.serviceName,
        doctorId: session.doctorId,
        doctorName: session.doctorName,
        date: msg,
      });

      await engineSendText({
        accountId,
        userId,
        conversationId,
        contactId,
        text: `🕐 Please enter the time for your appointment.\n\nFormat: HH:MM (e.g., 14:30 for 2:30 PM)`,
      });

      return true;
    }

    // ---- STEP: Time Selection ----
    if (session.step === "time") {
      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(msg)) {
        await engineSendText({
          accountId,
          userId,
          conversationId,
          contactId,
          text: "❌ Invalid time format. Please use HH:MM (e.g., 14:30)",
        });
        return true;
      }

      setSession(contactId, {
        step: "name",
        serviceId: session.serviceId,
        serviceName: session.serviceName,
        doctorId: session.doctorId,
        doctorName: session.doctorName,
        date: session.date,
        time: msg,
      });

      await engineSendText({
        accountId,
        userId,
        conversationId,
        contactId,
        text: `👤 Please enter your full name.`,
      });

      return true;
    }

    // ---- STEP: Name ----
    if (session.step === "name") {
      if (msg.length < 2) {
        await engineSendText({
          accountId,
          userId,
          conversationId,
          contactId,
          text: "❌ Please enter a valid name (at least 2 characters).",
        });
        return true;
      }

      setSession(contactId, {
        step: "phone",
        serviceId: session.serviceId,
        serviceName: session.serviceName,
        doctorId: session.doctorId,
        doctorName: session.doctorName,
        date: session.date,
        time: session.time,
        patientName: msg,
      });

      await engineSendText({
        accountId,
        userId,
        conversationId,
        contactId,
        text: `📱 Please enter your phone number with country code.\n\nExample: 919876543210`,
      });

      return true;
    }

    // ---- STEP: Phone & Confirm ----
    if (session.step === "phone") {
      const phoneRegex = /^\d{10,15}$/;
      if (!phoneRegex.test(msg)) {
        await engineSendText({
          accountId,
          userId,
          conversationId,
          contactId,
          text: "❌ Invalid phone number. Please enter 10-15 digits without spaces or symbols.",
        });
        return true;
      }

      try {
        const appointmentData = {
          clinic_id: clinicId,
          user_id: userId,
          contact_id: contactId,
          service_id: session.serviceId,
          doctor_id: session.doctorId,
          appointment_date: session.date,
          appointment_time: session.time,
          patient_name: session.patientName,
          patient_phone: msg,
          status: "pending",
          created_at: new Date().toISOString(),
        };

        const { error: insertError } = await db
          .from("appointments")
          .insert([appointmentData]);

        if (insertError) {
          console.error("Error saving appointment:", insertError);
          await engineSendText({
            accountId,
            userId,
            conversationId,
            contactId,
            text: "❌ Failed to book appointment. Please try again later.",
          });
          clearSession(contactId);
          return true;
        }

        clearSession(contactId);

        await engineSendText({
          accountId,
          userId,
          conversationId,
          contactId,
          text: `✅ Appointment Confirmed!\n\n📋 Service: ${session.serviceName}\n👨‍⚕️ Doctor: ${session.doctorName}\n📅 Date: ${session.date}\n🕐 Time: ${session.time}\n👤 Patient: ${session.patientName}\n📱 Phone: ${msg}\n\nThank you for booking with us! We'll send you a reminder.`,
        });

        return true;
      } catch (error) {
        console.error("Error saving appointment:", error);
        await engineSendText({
          accountId,
          userId,
          conversationId,
          contactId,
          text: "❌ An error occurred. Please try again later.",
        });
        clearSession(contactId);
        return true;
      }
    }
  }

  // ============================================================
  // Main Menu Handlers
  // ============================================================

  // Hi / Hello / Menu - Show Interactive List
  if (msg === "hi" || msg === "hello" || msg === "hey" || msg === "menu") {
    clearSession(contactId);

    await sendMainMenu({
      accountId,
      userId,
      conversationId,
      contactId,
      clinicId,
    });

    return true;
  }

  // 1 or "book" - Book Appointment
  if (command === "1" || command === "book") {
    const { data: services } = await db
      .from("clinic_services")
      .select("id, service_name")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    if (!services || services.length === 0) {
      await engineSendText({
        accountId,
        userId,
        conversationId,
        contactId,
        text: "❌ No services available. Please contact the clinic.",
      });
      return true;
    }

    setSession(contactId, { step: "service" });

    const list = services
      .map((s: any, i: number) => `${i + 1}. ${s.service_name}`)
      .join("\n");

    await engineSendText({
      accountId,
      userId,
      conversationId,
      contactId,
      text: `📋 Select a Service:\n\n${list}\n\nReply with the number.`,
    });

    return true;
  }

  // 2 or "doctors" - Show Doctors
  if (command === "2" || command === "doctors") {
    const { data: doctors } = await db
      .from("clinic_doctors")
      .select("doctor_name, specialization")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    if (!doctors || doctors.length === 0) {
      await engineSendText({
        accountId,
        userId,
        conversationId,
        contactId,
        text: "❌ No doctors available.",
      });
      return true;
    }

    const list = doctors
      .map(
        (d: any, i: number) =>
          `${i + 1}. ${d.doctor_name} (${d.specialization})`
      )
      .join("\n");

    await engineSendText({
      accountId,
      userId,
      conversationId,
      contactId,
      text: `👨‍⚕️ Our Doctors:\n\n${list}`,
    });

    return true;
  }

  // 3 or "services" - Show Services
  if (command === "3" || command === "services") {
    const { data: services } = await db
      .from("clinic_services")
      .select("service_name, price, duration_minutes")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    if (!services || services.length === 0) {
      await engineSendText({
        accountId,
        userId,
        conversationId,
        contactId,
        text: "❌ No services available.",
      });
      return true;
    }

    const list = services
      .map(
        (s: any) =>
          `🩺 ${s.service_name}${s.price ? ` - ₹${s.price}` : ""}${
            s.duration_minutes ? ` (${s.duration_minutes} min)` : ""
          }`
      )
      .join("\n");

    await engineSendText({
      accountId,
      userId,
      conversationId,
      contactId,
      text: `🩺 Our Services:\n\n${list}`,
    });

    return true;
  }

  // 4 or "hours" - Show Working Hours
  if (command === "4" || command === "hours") {
    const { data: hours } = await db
      .from("clinic_working_hours")
      .select("day_name, open_time, close_time, is_closed")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: true });

    if (!hours || hours.length === 0) {
      await engineSendText({
        accountId,
        userId,
        conversationId,
        contactId,
        text: "❌ Working hours not available.",
      });
      return true;
    }

    const list = hours
      .map((h: any) =>
        h.is_closed
          ? `${h.day_name}: Closed`
          : `${h.day_name}: ${h.open_time} - ${h.close_time}`
      )
      .join("\n");

    await engineSendText({
      accountId,
      userId,
      conversationId,
      contactId,
      text: `🕒 Working Hours:\n\n${list}`,
    });

    return true;
  }

  // 5 or "faq" - Show FAQ
  if (command === "5" || command === "faq") {
    const { data: faq } = await db
      .from("clinic_knowledge_base")
      .select("question, answer")
      .eq("clinic_id", clinicId)
      .limit(5);

    if (!faq || faq.length === 0) {
      await engineSendText({
        accountId,
        userId,
        conversationId,
        contactId,
        text: "❌ No FAQ available.",
      });
      return true;
    }

    const list = faq
      .map((f: any, i: number) => `${i + 1}. ${f.question}\n   ${f.answer}`)
      .join("\n\n");

    await engineSendText({
      accountId,
      userId,
      conversationId,
      contactId,
      text: `❓ Frequently Asked Questions:\n\n${list}`,
    });

    return true;
  }

  // 6 or "contact" - Show Contact
  if (command === "6" || command === "contact") {
    const { data: clinicData } = await db
      .from("clinics")
      .select("clinic_name, whatsapp_number")
      .eq("id", clinicId)
      .maybeSingle();

    let contactText = `📞 Contact ${clinicData?.clinic_name || "Us"}:\n\n`;
    if (clinicData?.whatsapp_number)
      contactText += `📱 WhatsApp: ${clinicData.whatsapp_number}\n`;

    await engineSendText({
      accountId,
      userId,
      conversationId,
      contactId,
      text: contactText || "📞 Contact information not available.",
    });

    return true;
  }

  // 7 or "location" - Show Location
  if (command === "7" || command === "location") {
    await engineSendText({
      accountId,
      userId,
      conversationId,
      contactId,
      text: "📍 Location information not available.",
    });

    return true;
  }

  // Unknown command - show help
  await engineSendText({
    accountId,
    userId,
    conversationId,
    contactId,
    text: `❌ I didn't understand that.\n\nPlease reply with:\n1️⃣ Book Appointment\n2️⃣ Doctors\n3️⃣ Services\n4️⃣ Working Hours\n5️⃣ FAQ\n6️⃣ Contact\n7️⃣ Location\n\nOr type "Hi" to see the menu.`,
  });

  return true;
}
