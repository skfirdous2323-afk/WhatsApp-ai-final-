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

  // Get clinic data
  const { data: clinic, error: clinicError } = await db
    .from("clinics")

.select("clinic_name, whatsapp_number, logo_url, clinic_logo")
    .eq("id", clinicId)
    .maybeSingle();

  if (clinicError) {
    console.error("Error fetching clinic:", clinicError);
  }

  const clinicName = clinic?.clinic_name || "Sunrise Health Clinic";
  const whatsappNumber = clinic?.whatsapp_number || "+91 9876543210";
const logoUrl = clinic?.logo_url || clinic?.clinic_logo || null;

// Send clinic logo first
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
    console.error("Failed to send clinic logo:", error);
  }
}
  // Get today's working hours
  const { data: hoursData } = await db
    .from("clinic_working_hours")
    .select("day_name, is_closed, open_time, close_time")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: true });

  let hoursSummary = "";
  if (hoursData && hoursData.length > 0) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayHours = hoursData.find((h: any) => h.day_name === today);
    
    if (todayHours) {
      if (todayHours.is_closed) {
        hoursSummary = `Today (${today}): Closed`;
      } else {
        hoursSummary = `Today (${today}): ${todayHours.open_time} - ${todayHours.close_time}`;
      }
    }
  }

  // Build welcome message
  let welcomeText = `👋 Welcome to *${clinicName}*!`;

  if (hoursSummary) {
    welcomeText += `\n${hoursSummary}`;
  }

  if (whatsappNumber) {
    welcomeText += `\n📱 WhatsApp: ${whatsappNumber}`;
  }

  welcomeText += `\n\n*Please choose an option from the menu below.*`;

  // ✅ Interactive List - 7 options
  await engineSendInteractiveList({
    accountId,
    userId,
    conversationId,
    contactId,
    bodyText: welcomeText,
    buttonLabel: "📋 Open Menu",
    sections: [
      {
        title: "Dental Clinic",
        rows: [
          {
            id: "book",
            title: "📅 Book Appointment",
            description: "Book a new appointment",
          },
          {
            id: "doctors",
            title: "👨‍⚕️ Doctors",
            description: "View all doctors",
          },
          {
            id: "services",
            title: "🦷 Services",
            description: "Our treatments",
          },
          {
            id: "hours",
            title: "🕒 Working Hours",
            description: "Clinic timing",
          },
          {
            id: "faq",
            title: "❓ FAQ",
            description: "Frequently asked questions",
          },
          {
            id: "contact",
            title: "📞 Contact",
            description: "Contact clinic",
          },
          {
            id: "location",
            title: "📍 Location",
            description: "Clinic address",
          },
        ],
      },
    ],
    footerText: `🏥 ${clinicName} • ZIVEXO CRM`,
  });
}
