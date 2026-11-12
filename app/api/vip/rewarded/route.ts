import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const bodySchema = z.object({
  receipt: z.string().min(12).max(5000),
  placement: z.enum(["vip_pass", "vip_dinner", "gulf_rescue", "reputation_campaign", "festival_pr"]),
});

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid rewarded-ad payload" }, { status: 400 });

  const verifierUrl = process.env.AD_REWARD_VERIFY_URL;
  const verifierSecret = process.env.AD_REWARD_VERIFY_SECRET;
  if (!verifierUrl || !verifierSecret) return NextResponse.json({ error: "Secure ad receipt verifier is not configured" }, { status: 503 });

  let verified: { verified?: boolean; event_id?: string };
  try {
    const verification = await fetch(verifierUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${verifierSecret}` },
      body: JSON.stringify({ receipt: parsed.data.receipt, user_id: authData.user.id, placement: parsed.data.placement }),
      signal: AbortSignal.timeout(12000),
    });
    if (!verification.ok) return NextResponse.json({ error: "Ad receipt verification failed" }, { status: 400 });
    verified = await verification.json();
  } catch {
    return NextResponse.json({ error: "Ad receipt verifier unavailable" }, { status: 503 });
  }
  if (!verified.verified || !verified.event_id || verified.event_id.length > 200) return NextResponse.json({ error: "Unverified ad receipt" }, { status: 400 });

  const { data, error } = await supabase.rpc("apply_rewarded_ad_event", {
    p_user_id: authData.user.id,
    p_event_id: verified.event_id,
    p_placement: parsed.data.placement,
  });
  if (error) return NextResponse.json({ error: "Unable to record verified ad receipt" }, { status: 500 });
  const outcome = data as { duplicate?: boolean; progress?: number; active?: boolean; expires_at?: string };
  if (outcome.duplicate) return NextResponse.json({ error: "This ad receipt has already been used" }, { status: 409 });
  return NextResponse.json({ placement: parsed.data.placement, progress: outcome.progress ?? 0, active: Boolean(outcome.active), expires_at: outcome.expires_at ?? null, verified: true });
}
