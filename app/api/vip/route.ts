import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ configured: false, vipBalance: null, packageStatus: "unconfigured" });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ configured: true, authenticated: false }, { status: 401 });
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) return NextResponse.json({ configured: true, authenticated: false }, { status: 401 });
  const [wallet, subscription, progress] = await Promise.all([
    supabase.from("vip_wallets").select("balance").eq("user_id", userData.user.id).maybeSingle(),
    supabase.from("vip_subscriptions").select("status, expires_at, plan_code").eq("user_id", userData.user.id).maybeSingle(),
    supabase.from("vip_ad_progress").select("progress").eq("user_id", userData.user.id).maybeSingle(),
  ]);
  return NextResponse.json({ configured: true, authenticated: true, vipBalance: wallet.data?.balance ?? 0, package: subscription.data ?? null, rewardedProgress: progress.data?.progress ?? 0 });
}
