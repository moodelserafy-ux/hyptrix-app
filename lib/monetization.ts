export type AdPlacement = "vip_pass" | "vip_dinner" | "gulf_rescue" | "reputation_campaign" | "festival_pr";
export type RewardedAdResult = { completed: boolean; receipt?: string; simulated?: boolean };

declare global {
  interface Window {
    HyptrixAds?: { showRewarded: (placement: AdPlacement) => Promise<RewardedAdResult | boolean> };
  }
}

export async function showRewardedAd(placement: AdPlacement): Promise<RewardedAdResult> {
  if (typeof window === "undefined") return { completed: false };
  if (window.HyptrixAds?.showRewarded) {
    try {
      const result = await window.HyptrixAds.showRewarded(placement);
      return typeof result === "boolean" ? { completed: result } : result;
    } catch { return { completed: false }; }
  }
  // Development-only preview. It is explicitly not a paid or server-verified impression.
  if (process.env.NEXT_PUBLIC_ENABLE_AD_DEMO === "true" && process.env.NODE_ENV !== "production") return { completed: true, simulated: true };
  return { completed: false };
}
