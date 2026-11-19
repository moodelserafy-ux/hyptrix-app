'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/store';

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
  const activeScreen = useGameStore((s) => s.activeScreen);
  const isStarForgeOpen = useGameStore((s) => s.isStarForgeOpen);
  const isPrWarRoomOpen = useGameStore((s) => s.isPrWarRoomOpen);
  const isChildModalOpen = useGameStore((s) => s.isChildModalOpen);
  const setActiveScreen = useGameStore((s) => s.setActiveScreen);
  const setStarForgeOpen = useGameStore((s) => s.setStarForgeOpen);
  const setPrWarRoomOpen = useGameStore((s) => s.setPrWarRoomOpen);

  // One-time Telegram WebApp SDK initialization (safe no-op in regular browsers)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    try {
      tg.ready?.();
      tg.expand?.();
      tg.disableVerticalSwipes?.();
      document.documentElement.dataset.telegramMiniApp = 'true';
    } catch {
      // Safe fallback
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
