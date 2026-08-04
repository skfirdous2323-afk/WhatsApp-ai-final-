import { engineSendText } from "@/lib/flows/meta-send";

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
