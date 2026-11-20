'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/store';
import { getOrCreateStudioInstanceId } from '@/lib/supabase';

interface TelegramHapticFeedback {
  impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred?: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged?: () => void;
}

interface TelegramBackButton {
  isVisible?: boolean;
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}

interface TelegramWebAppInstance {
  ready?: () => void;
  expand?: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  initData?: string;
  initDataUnsafe?: {
    start_param?: string;
    user?: {
      id?: number;
      first_name?: string;
      username?: string;
    };
  };
  isExpanded?: boolean;
  viewportStableHeight?: number;
  platform?: string;
  BackButton?: TelegramBackButton;
  HapticFeedback?: TelegramHapticFeedback;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebAppInstance;
    };
  }
}

export function triggerTelegramHaptic(
  type:
    | 'light'
    | 'medium'
    | 'heavy'
    | 'selection'
    | 'success'
    | 'warning'
    | 'error' = 'light'
) {
  if (typeof window === 'undefined') return;
  const haptic = window.Telegram?.WebApp?.HapticFeedback;
  if (!haptic) return;
  try {
    if (type === 'selection') {
      if (haptic.selectionChanged) {
        haptic.selectionChanged();
      } else {
        haptic.impactOccurred?.('light');
      }
    } else if (type === 'success' || type === 'warning' || type === 'error') {
      haptic.notificationOccurred?.(type);
    } else {
      haptic.impactOccurred?.(type);
    }
  } catch {
    // Ignore outside Telegram client
  }
}

export function TelegramMiniAppBridge({
  hasTopUiModalOpen = false,
  onCloseTopUiModal,
}: {
  hasTopUiModalOpen?: boolean;
  onCloseTopUiModal?: () => void;
}) {
  const studioCreated = useGameStore((s) => s.studioCreated);
  const gameDay = useGameStore((s) => s.gameDay);
  const releasedCount = useGameStore((s) => s.releasedProjects.length);
  const activeScreen = useGameStore((s) => s.activeScreen);
  const isStarForgeOpen = useGameStore((s) => s.isStarForgeOpen);
  const isPrWarRoomOpen = useGameStore((s) => s.isPrWarRoomOpen);
  const isChildModalOpen = useGameStore((s) => s.isChildModalOpen);
  const setActiveScreen = useGameStore((s) => s.setActiveScreen);
  const setStarForgeOpen = useGameStore((s) => s.setStarForgeOpen);
  const setPrWarRoomOpen = useGameStore((s) => s.setPrWarRoomOpen);
  const hydrateCloudState = useGameStore((s) => s.hydrateCloudState);
  const claimReferralReward = useGameStore((s) => s.claimReferralReward);

  const cloudLoadedRef = useRef(false);
  const lastSavedKeyRef = useRef('');
  const referralCheckedRef = useRef(false);

  // One-time Telegram WebApp SDK initialization + Automatic zero-login Cloud Save Restore
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tg = window.Telegram?.WebApp;

    if (tg) {
      try {
        tg.ready?.();
        tg.expand?.();
        tg.disableVerticalSwipes?.();
        document.documentElement.dataset.telegramMiniApp = 'true';
      } catch {
        // Safe fallback
      }
    }

    // Automatic Telegram User ID Cloud Restore (no login screen needed!)
    const initData = tg?.initData || '';
    if (initData && !cloudLoadedRef.current) {
      cloudLoadedRef.current = true;
      fetch('/api/telegram-cloud-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load', initData }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.ok && data?.found && data?.state) {
            hydrateCloudState(data.state);
          }
        })
        .catch(() => {});
    }
  }, [hydrateCloudState]);

  // Automatic Telegram Cloud Save Sync when progress advances (throttled per day / release)
  useEffect(() => {
    if (typeof window === 'undefined' || !studioCreated) return;
    const initData = window.Telegram?.WebApp?.initData || '';
    if (!initData) return;

    const saveKey = `${gameDay}_${releasedCount}`;
    if (lastSavedKeyRef.current === saveKey) return;
    lastSavedKeyRef.current = saveKey;

    const s = useGameStore.getState();
    const compactSnapshot = {
      studioCreated: s.studioCreated,
      hasSelectedMarket: s.hasSelectedMarket,
      worldMarket: s.worldMarket,
      uiLanguage: s.uiLanguage,
      studioName: s.studioName,
      ceoName: s.ceoName,
      logo: s.logo,
      founderPerk: s.founderPerk,
      cash: s.cash,
      marketValue: s.marketValue,
      reputation: s.reputation,
      gameDay: s.gameDay,
      currentYear: s.currentYear,
      unlockedRegions: s.unlockedRegions,
      ownedStudioAssets: s.ownedStudioAssets,
      ledgerSignature: s.ledgerSignature,
      releasedProjects: s.releasedProjects.slice(0, 40),
      lastReleasedProject: s.lastReleasedProject,
      aiGeneratedActors: s.aiGeneratedActors.slice(0, 25),
      starForgeLocksOpened: s.starForgeLocksOpened,
    };

    const timer = setTimeout(() => {
      fetch('/api/telegram-cloud-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          initData,
          state: compactSnapshot,
        }),
      }).catch(() => {});
    }, 1800);

    return () => clearTimeout(timer);
  }, [studioCreated, gameDay, releasedCount]);

  // Auto-detect incoming Telegram `startapp=ref_<id>` OR Web `?ref=<id>` referral once studio is created
  useEffect(() => {
    if (typeof window === 'undefined' || !studioCreated || referralCheckedRef.current) {
      return;
    }
    const alreadyClaimed = localStorage.getItem('neelyo_referral_claimed');
    if (alreadyClaimed) {
      referralCheckedRef.current = true;
      return;
    }

    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
    const urlRef = new URLSearchParams(window.location.search).get('ref') || '';
    const pendingStored = localStorage.getItem('neelyo_pending_referrer') || '';

    const rawRef = startParam.startsWith('ref_')
      ? startParam.slice(4)
      : urlRef || pendingStored;

    if (!rawRef) return;
    referralCheckedRef.current = true;

    const myStudioId = getOrCreateStudioInstanceId();
    if (!myStudioId || rawRef === myStudioId) return;

    fetch('/api/social-growth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'claim_referral',
        referrerStudioId: rawRef,
        inviteeStudioId: myStudioId,
        rewardType: 'cash',
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) {
          localStorage.setItem('neelyo_referral_claimed', rawRef);
          localStorage.removeItem('neelyo_pending_referrer');
          claimReferralReward(
            data.rewardType === 'star_lock' ? 'star_lock' : 'cash',
            Number(data.rewardAmount || 15_000_000)
          );
        }
      })
      .catch(() => {});
  }, [studioCreated, claimReferralReward]);

  // Capture ?ref= or start_param before studio creation so it survives onboarding!
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
    const urlRef = new URLSearchParams(window.location.search).get('ref') || '';
    const detected = startParam.startsWith('ref_') ? startParam.slice(4) : urlRef;
    if (detected && !localStorage.getItem('neelyo_referral_claimed')) {
      localStorage.setItem('neelyo_pending_referrer', detected);
    }
  }, []);

  // Match Telegram chrome seamlessly to the warm creamy theme across onboarding & gameplay
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    try {
      tg.setHeaderColor?.(studioCreated ? '#1A2530' : '#F9F6F0');
      tg.setBackgroundColor?.('#F9F6F0');
    } catch {
      // Safe fallback
    }
  }, [studioCreated]);

  // Sync native Telegram BackButton with ALL open modals, hub sheets, and inner stages
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const backBtn = window.Telegram?.WebApp?.BackButton;
    if (!backBtn) return;

    const shouldShowBack =
      hasTopUiModalOpen ||
      isChildModalOpen ||
      isStarForgeOpen ||
      isPrWarRoomOpen ||
      (studioCreated && activeScreen !== 'STUDIO_HUB');

    const handleBackClick = () => {
      triggerTelegramHaptic('light');
      if (hasTopUiModalOpen && onCloseTopUiModal) {
        onCloseTopUiModal();
        return;
      }
      if (isStarForgeOpen) {
        setStarForgeOpen(false);
        return;
      }
      if (isPrWarRoomOpen) {
        setPrWarRoomOpen(false);
        return;
      }
      if (isChildModalOpen) {
        window.dispatchEvent(new CustomEvent('neelyo:telegram-back'));
        return;
      }
      if (studioCreated && activeScreen !== 'STUDIO_HUB') {
        setActiveScreen('STUDIO_HUB');
      }
    };

    try {
      if (shouldShowBack) {
        backBtn.show();
        backBtn.onClick(handleBackClick);
      } else {
        backBtn.hide();
      }
    } catch {
      // Ignore if Telegram API version differs
    }

    return () => {
      try {
        backBtn.offClick(handleBackClick);
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [
    studioCreated,
    activeScreen,
    hasTopUiModalOpen,
    onCloseTopUiModal,
    isChildModalOpen,
    isStarForgeOpen,
    isPrWarRoomOpen,
    setActiveScreen,
    setStarForgeOpen,
    setPrWarRoomOpen,
  ]);

  return null;
}
