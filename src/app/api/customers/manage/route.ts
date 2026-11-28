import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in again." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const ids: unknown = body?.ids;

    if (
      body?.action !== "delete" ||
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > 100 ||
      ids.some(
        (id: unknown) =>
          typeof id !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      ) ||
      new Set(ids).size !== ids.length
    ) {
      return NextResponse.json(
        { error: "Invalid customer selection." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "delete_customers_with_appointments",
      { p_contact_ids: ids as string[] }
    );

    if (error) {
      console.error("Customer deletion RPC failed:", error);

      const status =
        error.code === "42501"
          ? 403
          : error.code === "P0002"
            ? 404
            : error.code === "22023"
              ? 400
              : 409;

      return NextResponse.json(
        { error: error.message || "Customers could not be deleted." },
        { status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Customer manage API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
