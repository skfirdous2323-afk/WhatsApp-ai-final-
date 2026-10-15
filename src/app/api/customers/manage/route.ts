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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("account_id, account_role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile?.account_id) {
      return NextResponse.json(
        { error: "Your workspace could not be verified." },
        { status: 403 }
      );
    }

    if (!["owner", "admin", "agent"].includes(profile.account_role)) {
      return NextResponse.json(
        { error: "You do not have permission to delete customers." },
        { status: 403 }
      );
    }

    const { data: ownedCustomers, error: lookupError } = await supabase
      .from("contacts")
      .select("id")
      .eq("account_id", profile.account_id)
      .in("id", ids);

    if (lookupError) {
      console.error("Customer ownership check failed:", lookupError);
      return NextResponse.json(
        { error: "Could not verify the selected customers." },
        { status: 500 }
      );
    }

    if (!ownedCustomers || ownedCustomers.length !== ids.length) {
      return NextResponse.json(
        { error: "Some customers were not found in your workspace." },
        { status: 404 }
      );
    }

    const { data: deletedCustomers, error: deleteError } = await supabase
      .from("contacts")
      .delete()
      .eq("account_id", profile.account_id)
      .in("id", ids)
      .select("id");

    if (deleteError) {
      console.error("Customer deletion failed:", deleteError);
      return NextResponse.json(
        {
          error:
            "Customers could not be deleted. Their linked records may need a database update first.",
        },
        { status: 409 }
      );
    }

    if (!deletedCustomers || deletedCustomers.length !== ids.length) {
      return NextResponse.json(
        { error: "Not all selected customers could be deleted." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: deletedCustomers.length,
    });
  } catch (error) {
    console.error("Customer manage API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
