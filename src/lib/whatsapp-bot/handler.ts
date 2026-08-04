import { engineSendText } from "@/lib/flows/meta-send";
import { supabaseAdmin } from "@/lib/ai/admin-client";
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
const db = supabaseAdmin();
const { data: clinic, error: clinicError } = await db
  .from("clinics")
  .select("id")
  .eq("user_id", userId)
  .single();

if (clinicError || !clinic) {
  console.error("Clinic not found", clinicError);
  return false;
}

const clinicId = clinic.id;

  if (msg === "hi" || msg === "hello") {
    await engineSendText({
      accountId,
      userId,
      conversationId,
      contactId,
      text:
`👋 Welcome!

1️⃣ Book Appointment
2️⃣ Doctors
3️⃣ Services
4️⃣ Working Hours`,
    });

    return true;
  }

  return false;
}
if (msg === "2") {
  const { data: doctors } = await db
    .from("clinic_doctors")
    .select("name")
    .eq("clinic_id", clinicId);

  const list =
    doctors && doctors.length
      ? doctors.map((d, i) => `${i + 1}. ${d.name}`).join("\n")
      : "No doctors found.";

  await engineSendText({
    accountId,
    userId,
    conversationId,
    contactId,
    text: `👨‍⚕️ Doctors:\n\n${list}`,
  });

  return true;
}
