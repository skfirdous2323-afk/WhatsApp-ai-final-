import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encryptPassword } from "@/lib/security/encryption";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { customer_id, email, password, phone, clinic_name } = await req.json();

    const { encrypted, iv } = encryptPassword(password);

    const { error } = await supabaseAdmin
      .from("admin_customer_credentials")
      .insert({
        customer_id,
        email,
        encrypted_password: encrypted,
        iv: iv,
        phone,
        clinic_name,
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
