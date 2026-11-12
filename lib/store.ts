import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";
import type { GameState, Studio, Project, GameDatabase, WorldHistoryEntry } from "@/lib/types";

const indexedDbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => { await set(name, value); },
  removeItem: async (name) => { await del(name); },
};

type GameActions = {
  hydrate: () => Promise<void>;
  createStudio: (studio: Studio) => void;
  setCustomDb: (db: GameDatabase | null) => void;
  createProject: (project: Project) => void;
  updateProject: (id: string, update: Partial<Project>) => void;
  setActiveProject: (id: string | null) => void;
  addCash: (amount: number) => void;
  addHistory: (entry: WorldHistoryEntry) => void;
  advanceWeek: () => void;
  setVip: (expiresAt: number) => void;
  setNotification: (message: string | null) => void;
  resetGame: () => void;
};

const initialState: GameState = {
  hydrated: false, hasStudio: false, studio: null, year: 2026, week: 1,
  customDb: null, projects: [], activeProjectId: null, worldHistory: [],
  careerAwards: {}, vipExpiresAt: null, notification: null,
};

export const useGameStore = create<GameState & GameActions>()(persist((setState, getState) => ({
  ...initialState,
  hydrate: async () => {
    const importedDatabase = await get<GameDatabase>("hyptrix_custom_db");
    if (importedDatabase) setState({ customDb: importedDatabase });
    setState({ hydrated: true });
  },
  createStudio: (studio) => setState({ studio, hasStudio: true, notification: `أهلاً بك في ${studio.name}. يبدأ المشوار الآن.` }),
  setCustomDb: (db) => {
    if (db) void set("hyptrix_custom_db", db);
    else void del("hyptrix_custom_db");
    setState({ customDb: db, notification: db ? `تم تفعيل حزمة: ${db.meta?.pack_name ?? "قاعدة مخصصة"}` : "تمت العودة إلى قاعدة البيانات الافتراضية" });
  },
  createProject: (project) => setState((state) => ({ projects: [project, ...state.projects], activeProjectId: project.id, notification: "تم إنشاء ملف المشروع. راجع التشكيل قبل بدء التصوير." })),
  updateProject: (id, update) => setState((state) => ({ projects: state.projects.map((p) => p.id === id ? { ...p, ...update } : p) })),
  setActiveProject: (id) => setState({ activeProjectId: id }),
  addCash: (amount) => setState((state) => state.studio ? ({ studio: { ...state.studio, cash: Math.max(0, state.studio.cash + amount) } }) : {}),
  addHistory: (entry) => setState((state) => ({ worldHistory: [entry, ...state.worldHistory].slice(0, 160) })),
  advanceWeek: () => setState((state) => state.week >= 52
    ? { week: 1, year: state.year + 1, notification: `بدأ عام ${state.year + 1}. موسم جديد وفرص جديدة.` }
    : { week: state.week + 1 }),
  setVip: (expiresAt) => setState({ vipExpiresAt: expiresAt }),
  setNotification: (message) => setState({ notification: message }),
  resetGame: () => {
    void del("hyptrix_custom_db");
    setState({ ...initialState, hydrated: true });
  },
}), {
  name: "hyptrix-game-v1",
  storage: createJSONStorage(() => indexedDbStorage),
  skipHydration: true,
  partialize: (state) => ({
    hasStudio: state.hasStudio, studio: state.studio, year: state.year, week: state.week,
    customDb: state.customDb, projects: state.projects, activeProjectId: state.activeProjectId,
    worldHistory: state.worldHistory, careerAwards: state.careerAwards,
  }) as GameState & GameActions,
}));
