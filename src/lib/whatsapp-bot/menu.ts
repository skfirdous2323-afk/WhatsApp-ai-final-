import { supabaseAdmin } from "@/lib/ai/admin-client";
import { engineSendInteractiveButtons } from "@/lib/flows/meta-send";

interface ClinicData {
  clinic_name: string;
  clinic_logo?: string;
  clinic_address?: string;
  clinic_phone?: string;
  clinic_email?: string;
  whatsapp_number?: string;
}

export async function sendMainMenu({
  accountId,
  userId,
  conversationId,
  contactId,
}: {
  accountId: string;
  userId: string;
  conversationId: string;
  contactId: string;
}) {
  const db = supabaseAdmin();

  // ✅ Get clinic data with all fields
  const { data: clinic, error: clinicError } = await db
    .from("clinics")
    .select("clinic_name, clinic_logo, clinic_address, clinic_phone, clinic_email, whatsapp_number")
    .eq("user_id", userId)
    .maybeSingle();

  if (clinicError) {
    console.error("Error fetching clinic:", clinicError);
  }

  const clinicName = clinic?.clinic_name || "Our Clinic";
  const clinicAddress = clinic?.clinic_address || "";
  const clinicPhone = clinic?.clinic_phone || "";
  const whatsappNumber = clinic?.whatsapp_number || "";

  // ✅ Get working hours summary
  const { data: hoursData } = await db
    .from("clinic_working_hours")
    .select("day_name, is_closed, open_time, close_time")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  // ✅ Build working hours summary
  let hoursSummary = "";
  if (hoursData && hoursData.length > 0) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayHours = hoursData.find((h: any) => h.day_name === today);
    
    if (todayHours) {
      if (todayHours.is_closed) {
        hoursSummary = `📌 Today (${today}): Closed`;
      } else {
        hoursSummary = `📌 Today (${today}): ${todayHours.open_time} - ${todayHours.close_time}`;
      }
    }
  }

  // ✅ Build welcome message
  let welcomeText = `👋 Welcome to *${clinicName}*!`;

  // Add address if available
  if (clinicAddress) {
    welcomeText += `\n📍 ${clinicAddress}`;
  }

  // Add working hours summary
  if (hoursSummary) {
    welcomeText += `\n${hoursSummary}`;
  }

  // Add contact info if available
  if (whatsappNumber) {
    welcomeText += `\n📱 WhatsApp: ${whatsappNumber}`;
  } else if (clinicPhone) {
    welcomeText += `\n📞 Phone: ${clinicPhone}`;
  }

  welcomeText += `\n\n*Please choose an option:*`;

  // ✅ Dynamic buttons based on available data
  const buttons: Array<{ id: string; title: string }> = [
    { id: "book", title: "📅 Book Appointment" },
    { id: "doctors", title: "👨‍⚕️ Doctors" },
    { id: "services", title: "🩺 Services" },
  ];

  // Add FAQ button if knowledge base exists
  const { count: faqCount } = await db
    .from("clinic_knowledge_base")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", userId);

  if (faqCount && faqCount > 0) {
    buttons.push({ id: "faq", title: "❓ FAQ" });
  }

  // Add working hours button
  buttons.push({ id: "hours", title: "🕐 Hours" });

  // Add contact button if contact info exists
  if (clinicPhone || whatsappNumber || clinicAddress) {
    buttons.push({ id: "contact", title: "📞 Contact" });
  }

  // Add location button if address exists
  if (clinicAddress) {
    buttons.push({ id: "location", title: "📍 Location" });
  }

  await engineSendInteractiveButtons({
    accountId,
    userId,
    conversationId,
    contactId,
    bodyText: welcomeText,
    buttons: buttons,
    footerText: `🏥 ${clinicName} • ZIVEXO CRM`,
  });
}
