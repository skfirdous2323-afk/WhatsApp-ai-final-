import { supabaseAdmin } from "@/lib/ai/admin-client";
import {
  engineSendInteractiveList,
  engineSendMedia,
} from "@/lib/flows/meta-send";

export async function sendMainMenu({
  accountId,
  userId,
  conversationId,
  contactId,
  clinicId,
}: {
  accountId: string;
  userId: string;
  conversationId: string;
  contactId: string;
  clinicId: string;
}) {
  const db = supabaseAdmin();

  // Get clinic settings
  const { data: clinic, error: clinicError } = await db
    .from("clinics")
    .select(`
      clinic_name,
      whatsapp_number,
      logo_url,
      clinic_logo,
      menu_labels,
      book_enabled,
      doctors_enabled,
      services_enabled,
      faq_enabled,
      working_hours_enabled,
      contact_enabled,
      location_enabled
    `)
    .eq("id", clinicId)
    .maybeSingle();

  if (clinicError) {
    console.error("Error fetching clinic:", clinicError);
  }

  const clinicName =
    clinic?.clinic_name || "Sunrise Health Clinic";

  const whatsappNumber =
    clinic?.whatsapp_number || "";

  const logoUrl =
    clinic?.logo_url || clinic?.clinic_logo || null;

  const menuLabels = clinic?.menu_labels || {};

  // Feature settings
  const bookEnabled =
    clinic?.book_enabled !== false;

  const doctorsEnabled =
    clinic?.doctors_enabled !== false;

  const servicesEnabled =
    clinic?.services_enabled !== false;

  const faqEnabled =
    clinic?.faq_enabled !== false;

  const workingHoursEnabled =
    clinic?.working_hours_enabled !== false;

  const contactEnabled =
    clinic?.contact_enabled !== false;

  const locationEnabled =
    clinic?.location_enabled !== false;

  // Custom labels
  const bookLabel =
    menuLabels.book || "📅 Book Appointment";

  const doctorsLabel =
    menuLabels.doctors || "👨‍⚕️ Doctors";

  const servicesLabel =
    menuLabels.services || "🦷 Services";

  const hoursLabel =
    menuLabels.hours || "🕒 Working Hours";

  const faqLabel =
    menuLabels.faq || "❓ FAQ";

  const contactLabel =
    menuLabels.contact || "📞 Contact";

  const locationLabel =
    menuLabels.location || "📍 Location";

  // Send clinic logo
  if (logoUrl) {
    try {
      await engineSendMedia({
        accountId,
        userId,
        conversationId,
        contactId,
        kind: "image",
        link: logoUrl,
        caption: `🏥 ${clinicName}`,
      });
    } catch (error) {
      console.error(
        "Failed to send clinic logo:",
        error
      );
    }
  }

  // Get working hours
  let hoursSummary = "";

  if (workingHoursEnabled) {
    const { data: hoursData } = await db
      .from("clinic_working_hours")
      .select(
        "day_name, is_closed, open_time, close_time"
      )
      .eq("clinic_id", clinicId)
      .order("created_at", {
        ascending: true,
      });

    if (hoursData && hoursData.length > 0) {
      const today =
        new Date().toLocaleDateString(
          "en-US",
          { weekday: "long" }
        );

      const todayHours = hoursData.find(
        (h: any) => h.day_name === today
      );

      if (todayHours) {
        if (todayHours.is_closed) {
          hoursSummary =
            `Today (${today}): Closed`;
        } else {
          hoursSummary =
            `Today (${today}): ${todayHours.open_time} - ${todayHours.close_time}`;
        }
      }
    }
  }

  // Welcome message
  let welcomeText =
    `👋 Welcome to *${clinicName}*!`;

  if (hoursSummary) {
    welcomeText += `\n${hoursSummary}`;
  }

  if (whatsappNumber) {
    welcomeText +=
      `\n📱 WhatsApp: ${whatsappNumber}`;
  }

  welcomeText +=
    `\n\n*Please choose an option from the menu below.*`;

  // Build menu dynamically
  const rows: any[] = [];

  // Book Appointment
  if (bookEnabled) {
    rows.push({
      id: "book",
      title: bookLabel,
      description: "Book a new appointment",
    });
  }

  // Doctors
  if (doctorsEnabled) {
    rows.push({
      id: "doctors",
      title: doctorsLabel,
      description: "View all doctors",
    });
  }

  // Services
  if (servicesEnabled) {
    rows.push({
      id: "services",
      title: servicesLabel,
      description: "Our treatments",
    });
  }

  // Working Hours
  if (workingHoursEnabled) {
    rows.push({
      id: "hours",
      title: hoursLabel,
      description: "Clinic timing",
    });
  }

  // FAQ
  if (faqEnabled) {
    rows.push({
      id: "faq",
      title: faqLabel,
      description: "Frequently asked questions",
    });
  }

  // Contact
  if (contactEnabled) {
    rows.push({
      id: "contact",
      title: contactLabel,
      description: "Contact clinic",
    });
  }

  // Location
  if (locationEnabled) {
    rows.push({
      id: "location",
      title: locationLabel,
      description: "Clinic address",
    });
  }

  // Send WhatsApp menu
  await engineSendInteractiveList({
    accountId,
    userId,
    conversationId,
    contactId,
    bodyText: welcomeText,
    buttonLabel: "📋 Open Menu",
    sections: [
      {
        title: "Clinic Menu",
        rows,
      },
    ],
    footerText:
      `🏥 ${clinicName} • ZIVEXO CRM`,
  });
}
