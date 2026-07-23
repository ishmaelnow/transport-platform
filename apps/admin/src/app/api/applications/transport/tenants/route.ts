import { NextResponse } from "next/server";
import { createAnonymousSupabaseClient } from "@esh-platform/supabase";

export async function GET() {
  const { data, error } = await createAnonymousSupabaseClient().rpc(
    "list_transport_application_tenants",
  );
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ tenants: data ?? [] });
}
