import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ configured: false, entries: [] });
  const market = new URL(request.url).searchParams.get("market");
  const validMarkets = ["egypt", "gulf", "europe", "hollywood"];
  let query = supabase.from("studio_leaderboard").select("user_id, studio_name, market, net_worth, reputation, updated_at");
  if (market && validMarkets.includes(market)) query = query.eq("market", market);
  const { data, error } = await query.order("net_worth", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ configured: true, error: "Leaderboard query failed", entries: [] }, { status: 500 });
  return NextResponse.json({ configured: true, entries: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  const body = await request.json();
  const studioName = String(body.studioName ?? "").slice(0, 70);
  const market = String(body.market ?? "egypt");
  const netWorth = Math.max(0, Math.min(Number(body.netWorth) || 0, 9_000_000_000_000));
  const reputation = Math.max(0, Math.min(Number(body.reputation) || 0, 100));
  if (!studioName) return NextResponse.json({ error: "Studio name is required" }, { status: 400 });
  const { error } = await supabase.from("studio_leaderboard").upsert({ user_id: userData.user.id, studio_name: studioName, market, net_worth: netWorth, reputation, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "Unable to update leaderboard" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
