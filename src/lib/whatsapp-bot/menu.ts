import { supabaseAdmin } from "@/lib/ai/admin-client";
import { engineSendInteractiveButtons } from "@/lib/flows/meta-send";

export async function sendMainMenu({
  accountId,
  userId,
  conversationId,
  contactId,
  clinicId,  // ✅ নতুন প্যারামিটার
}: {
  accountId: string;
  userId: string;
  conversationId: string;
  contactId: string;
  clinicId: string;  // ✅ নতুন প্যারামিটার
}) {
  const db = supabaseAdmin();

  // ✅ clinicId দিয়ে clinic ডেটা নিন
  const { data: clinic, error: clinicError } = await db
    .from("clinics")
    .select("clinic_name, whatsapp_number")
    .eq("id", clinicId)
    .maybeSingle();

  if (clinicError) {
    console.error("Error fetching clinic:", clinicError);
  }

  const clinicName = clinic?.clinic_name || "Our Clinic";
  const whatsappNumber = clinic?.whatsapp_number || "";

  // ✅ clinicId দিয়ে working hours নিন
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
        hoursSummary = `📌 Today (${today}): Closed`;
      } else {
        hoursSummary = `📌 Today (${today}): ${todayHours.open_time} - ${todayHours.close_time}`;
      }
    }
  }

  let welcomeText = `👋 Welcome to *${clinicName}*!`;

  if (hoursSummary) {
    welcomeText += `\n${hoursSummary}`;
  }

  if (whatsappNumber) {
    welcomeText += `\n📱 WhatsApp: ${whatsappNumber}`;
  }

  welcomeText += `\n\n*Please choose an option:*`;

  // ✅ ৩টির বেশি বাটন নয় (WhatsApp-এর সীমা)
  const buttons = [
    { id: "book", title: "📅 Book" },
    { id: "doctors", title: "👨‍⚕️ Doctors" },
    { id: "services", title: "🦷 Services" },
  ];

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
