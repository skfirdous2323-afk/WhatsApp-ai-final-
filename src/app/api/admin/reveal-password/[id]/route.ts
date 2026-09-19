import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptPassword } from "@/lib/security/encryption";
import { isAdmin } from "@/lib/auth/admin-check";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const { data, error: dbError } = await supabaseAdmin
      .from("admin_customer_credentials")
      .select("encrypted_password, iv")
      .eq("id", id)
      .single();

    if (dbError) throw dbError;
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const password = decryptPassword(data.encrypted_password, data.iv);

    return NextResponse.json({ password });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
