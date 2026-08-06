import {
  engineSendText,
  engineSendInteractiveList,
} from "@/lib/flows/meta-send";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { sendMainMenu } from "@/lib/whatsapp-bot/menu";
import {
  getSession,
  setSession,
  clearSession,
} from "@/lib/whatsapp-bot/session";

// ============================================================
// Type Definitions
// ============================================================

interface SessionData {
  step: string;
  serviceId?: string;
  serviceName?: string;
  doctorId?: string;
  doctorName?: string;
  date?: string;
  time?: string;
  patientName?: string;
  page?: number;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Generate next 7 days for date selection
 */
function getNext7Days() {
  const days = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);

    const id = d.toISOString().split("T")[0];
    days.push({
      id: `date_${id}`,
      title: d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      description: d.toLocaleDateString("en-US", {
        weekday: "long",
      }),
    });
  }

  return days;
}

/**
 * Generate time slots based on slot duration
 * Default: 9:00 AM to 6:00 PM
 */
function generateTimeSlots(slotDuration: number) {
  const timeSlots = [];
  let hour = 9;
  let minute = 0;

  while (hour < 18 || (hour === 18 && minute === 0)) {
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");

    const hour12 = hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? "PM" : "AM";

    timeSlots.push({
      id: `time_${hh}:${mm}`,
      title: `${String(hour12).padStart(2, "0")}:${mm} ${ampm}`,
    });

    minute += slotDuration;

    while (minute >= 60) {
      minute -= 60;
      hour++;
    }
  }

  return timeSlots;
}

/**
 * Get paginated time slots with navigation buttons
 */
function getTimeSlotPage(slotDuration: number, page: number) {
  const allSlots = generateTimeSlots(slotDuration);
  const pageSize = 8;
  const start = page * pageSize;
  const end = start + pageSize;
  const pageSlots = allSlots.slice(start, end);

  const rows = pageSlots.map((slot) => ({
    id: slot.id,
    title: slot.title,
    description: "Tap to select this time",
  }));

  // Add Previous button
  if (page > 0) {
    rows.push({
      id: `prev_slots_${page - 1}`,
      title: "⬅️ Previous Slots",
      description: "Go back to previous slots",
    });
  }

  // Add Next button
  if (end < allSlots.length) {
    rows.push({
      id: `next_slots_${page + 1}`,
      title: "➡️ View More Slots",
      description: "Show more available time slots",
    });
  }

  return rows;
}

// ============================================================
// Main Handler
// ============================================================

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
  console.log("📩 Message received:", text);

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
    console.error("❌ Clinic not found", clinicError);
    return false;
  }

  const clinicId = clinic.id;

  // Get appointment settings
  const { data: settings } = await db
    .from("clinic_appointment_settings")
    .select("slot_duration")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  const slotDuration = settings?.slot_duration || 30;
let session = getSession(contactId) as SessionData | null;




if (session && command !== "1" && ["2", "3", "4", "5", "6", "7"].includes(command)) {
  clearSession(contactId);
  session = null;
}
  // ============================================================
  // Handle session-based flows
  // ============================================================
  if (session) {
    // ---- STEP: Service Selection ----
    if (session.step === "service") {
      let selected;

      if (command.startsWith("service_")) {
        const serviceId = command.replace("service_", "");
        const { data: services } = await db
          .from("clinic_services")
          .select("id, service_name")
          .eq("clinic_id", clinicId);
        selected = services?.find((s: any) => String(s.id) === serviceId);
      } else {
        const serviceIndex = parseInt(command) - 1;
        const { data: services } = await db
          .from("clinic_services")
          .select("id, service_name")
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false });
        selected = services?.[serviceIndex];
      }

      if (!selected) {
        await engineSendText({
          accountId,
          userId,
          conversationId,
          contactId,
          text: "❌ Invalid service. Please select again.",
        });
        return true;
      }

      setSession(contactId, {
        step: "doctor",
        serviceId: selected.id,
        serviceName: selected.service_name,
      });

      // Get doctors for this clinic
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

      await engineSendInteractiveList({
        accountId,
        userId,
        conversationId,
        contactId,
        bodyText: `👨‍⚕️ Select a Doctor for ${selected.service_name}`,
        footerText: "Please choose a doctor",
        buttonLabel: "View Doctors",
        sections: [
          {
            title: "Available Doctors",
            rows: doctors.map((d: any) => ({
              id: `doctor_${d.id}`,
              title:
                d.doctor_name.length > 24
                  ? d.doctor_name.substring(0, 21) + "..."
                  : d.doctor_name,
              description: d.specialization,
            })),
          },
        ],
      });

      return true;
    }

    // ---- STEP: Doctor Selection ----
    if (session.step === "doctor") {
      let selected;

      if (command.startsWith("doctor_")) {
        const doctorId = command.replace("doctor_", "");
        const { data: doctors } = await db
          .from("clinic_doctors")
          .select("id, doctor_name, specialization")
          .eq("clinic_id", clinicId);
        selected = doctors?.find((d: any) => String(d.id) === doctorId);
      } else {
        const doctorIndex = parseInt(command) - 1;
        const { data: doctors } = await db
          .from("clinic_doctors")
          .select("id, doctor_name, specialization")
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false });
        selected = doctors?.[doctorIndex];
      }

      if (!selected) {
        await engineSendText({
          accountId,
          userId,
          conversationId,
          contactId,
          text: "❌ Invalid doctor. Please select again.",
        });
        return true;
      }

      setSession(contactId, {
        step: "date",
        serviceId: session.serviceId,
        serviceName: session.serviceName,
        doctorId: selected.id,
        doctorName: selected.doctor_name,
      });

      const dates = getNext7Days();

      await engineSendInteractiveList({
        accountId,
        userId,
        conversationId,
        contactId,
        bodyText: `📅 Select Appointment Date for ${selected.doctor_name}`,
        buttonLabel: "View Dates",
        footerText: "Choose a date",
        sections: [
          {
            title: "Next 7 Days",
            rows: dates.map((d) => ({
              id: d.id,
              title: d.title,
              description: d.description,
            })),
          },
        ],
      });

      return true;
    }

    // ---- STEP: Date Selection ----
    if (session.step === "date") {
      let selectedDate: string | null = null;

      if (command.startsWith("date_")) {
        selectedDate = command.replace("date_", "");
      } else {
        // Fallback: if user types date manually
        const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
        if (dateRegex.test(msg)) {
          const parts = msg.split("-");
          selectedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          selectedDate = msg;
        }
      }

      if (!selectedDate) {
        await engineSendText({
          accountId,
          userId,
          conversationId,
          contactId,
          text: "❌ Please select a date from the list or use DD-MM-YYYY format.",
        });
        return true;
      }

      setSession(contactId, {
        step: "time",
        serviceId: session.serviceId,
        serviceName: session.serviceName,
        doctorId: session.doctorId,
        doctorName: session.doctorName,
        date: selectedDate,
        page: 0,
      });

      // Show first page of time slots
      const rows = getTimeSlotPage(slotDuration, 0);

      await engineSendInteractiveList({
        accountId,
        userId,
        conversationId,
        contactId,
        bodyText: `🕐 Select Appointment Time for ${session.serviceName} with ${session.doctorName}`,
        footerText: "Choose a time slot",
        buttonLabel: "View Time Slots",
        sections: [
          {
            title: "Available Time Slots",
            rows: rows,
          },
        ],
      });

      return true;
    }

    // ---- STEP: Time Selection ----
    if (session.step === "time") {
      // Handle navigation: Previous page
      if (command.startsWith("prev_slots_")) {
        const page = parseInt(command.replace("prev_slots_", ""));
        setSession(contactId, { ...session, page });

        const rows = getTimeSlotPage(slotDuration, page);

        await engineSendInteractiveList({
          accountId,
          userId,
          conversationId,
          contactId,
          bodyText: `🕐 Select Appointment Time for ${session.serviceName} with ${session.doctorName}`,
          footerText: "Choose a time slot",
          buttonLabel: "View Time Slots",
          sections: [
            {
              title: "Available Time Slots",
              rows: rows,
            },
          ],
        });

        return true;
      }

      // Handle navigation: Next page
      if (command.startsWith("next_slots_")) {
        const page = parseInt(command.replace("next_slots_", ""));
        setSession(contactId, { ...session, page });

        const rows = getTimeSlotPage(slotDuration, page);

        await engineSendInteractiveList({
          accountId,
          userId,
          conversationId,
          contactId,
          bodyText: `🕐 Select Appointment Time for ${session.serviceName} with ${session.doctorName}`,
          footerText: "Choose a time slot",
          buttonLabel: "View Time Slots",
          sections: [
            {
              title: "Available Time Slots",
              rows: rows,
            },
          ],
        });

        return true;
      }

      // Select a specific time slot
      let selectedTime: string | null = null;

      if (command.startsWith("time_")) {
        selectedTime = command.replace("time_", "");
      } else {
        // Fallback: if user types time manually (HH:MM)
        const timeRegex = /^\d{2}:\d{2}$/;
        if (timeRegex.test(msg)) {
          selectedTime = msg;
        }
      }

      if (!selectedTime) {
        await engineSendText({
          accountId,
          userId,
          conversationId,
          contactId,
          text: "❌ Invalid time. Please select from the list or use HH:MM format.",
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
        time: selectedTime,
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

    // ---- STEP: Name & Confirm ----
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

      try {
        // Save appointment directly with name (no phone step)
        const appointmentData = {
          clinic_id: clinicId,
          user_id: userId,
          contact_id: contactId,
          service_id: session.serviceId,
          doctor_id: session.doctorId,
          appointment_date: session.date,
          appointment_time: session.time,
          patient_name: msg,
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
          text: `✅ Appointment Confirmed!\n\n📋 Service: ${session.serviceName}\n👨‍⚕️ Doctor: ${session.doctorName}\n📅 Date: ${session.date}\n🕐 Time: ${session.time}\n👤 Patient: ${msg}\n\nThank you for booking with us! We'll send you a reminder.`,
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

  // ============================================================
  // Interactive List Direct Selections
  // ============================================================

  // 1. Book Appointment
  if (msg === "book" || command === "1" || command === "book") {
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

    await engineSendInteractiveList({
      accountId,
      userId,
      conversationId,
      contactId,
      bodyText: "📋 Select a Service",
      footerText: "Please choose a service",
      buttonLabel: "View Services",
      sections: [
        {
          title: "Available Services",
          rows: services.map((s: any) => ({
            id: `service_${s.id}`,
            title:
              s.service_name.length > 24
                ? s.service_name.substring(0, 21) + "..."
                : s.service_name,
            description: "Tap to select",
          })),
        },
      ],
    });

    return true;
  }

  // 2. View Doctors
  if (msg === "doctors" || command === "2" || command === "doctors") {
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

  // 3. View Services
  if (msg === "services" || command === "3" || command === "services") {
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

  // 4. View Working Hours
  if (msg === "hours" || command === "4" || command === "hours") {
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

  // 5. View FAQ
  if (msg === "faq" || command === "5" || command === "faq") {
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

  // 6. Contact Information
  if (msg === "contact" || command === "6" || command === "contact") {
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

  // 7. Location
  if (msg === "location" || command === "7" || command === "location") {
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
