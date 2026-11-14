import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";
import type { GameState, Studio, Project, GameDatabase, WorldHistoryEntry, ContractTerms } from "@/lib/types";

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
  updateContract: (projectId: string, memberId: string, update: Partial<ContractTerms>) => void;
  setActiveProject: (id: string | null) => void;
  addCash: (amount: number) => void;
  addHistory: (entry: WorldHistoryEntry) => void;
  syncClock: () => void;
  setVip: (expiresAt: number) => void;
  setNotification: (message: string | null) => void;
  resetGame: () => void;
};

const initialState: GameState = {
  hydrated: false, hasStudio: false, studio: null, year: 2026, week: 1, gameDay: 1, lastTickAt: 0,
  customDb: null, projects: [], activeProjectId: null, worldHistory: [],
  careerAwards: {}, vipExpiresAt: null, notification: null,
};

export const useGameStore = create<GameState & GameActions>()(persist((setState, getState) => ({
  ...initialState,
  hydrate: async () => {
    let importedDatabase: GameDatabase | null = null;
    try { importedDatabase = await get<GameDatabase>("hyptrix_custom_db"); } catch { /* Keep the database already present in persisted state. */ }
    const current = getState();
    const now = Date.now();
    // Keep the persisted day during hydration. syncClock() applies offline time
    // after the UI has initialized its simulation cursor, preventing old days
    // from being replayed as fresh production/revenue ticks.
    const resumedDay = Math.max(1, current.gameDay ?? 1);
    const resumedWeek = Math.floor((resumedDay - 1) / 7) + 1;
    const resumedYear = 2026 + Math.floor((resumedDay - 1) / 364);
    const migratedProjects = current.projects.map((project) => project.status === "draft" ? ({
      ...project,
      contracts: project.contracts.map((contract) => ({
        ...contract,
        response: contract.response ?? "pending",
        responseDay: contract.responseDay ?? resumedDay + 1,
      })),
      proposalDay: project.proposalDay ?? current.gameDay,
    }) : project);
    setState({ ...(importedDatabase ? { customDb: importedDatabase } : {}), projects: migratedProjects, gameDay: resumedDay, week: ((resumedWeek - 1) % 52) + 1, year: resumedYear, lastTickAt: current.hasStudio ? (current.lastTickAt || now) : now, hydrated: true });
  },
  createStudio: (studio) => setState({ studio, hasStudio: true, lastTickAt: Date.now(), notification: `أهلاً بك في ${studio.name}. يبدأ المشوار الآن.` }),
  setCustomDb: (db) => {
    if (db) void set("hyptrix_custom_db", db);
    else void del("hyptrix_custom_db");
    setState({ customDb: db, notification: db ? `تم تفعيل حزمة: ${db.meta?.pack_name ?? "قاعدة مخصصة"}` : "تمت العودة إلى قاعدة البيانات الافتراضية" });
  },
  createProject: (project) => setState((state) => ({ projects: [project, ...state.projects], activeProjectId: project.id, notification: "تم إنشاء ملف المشروع. راجع التشكيل قبل بدء التصوير." })),
  updateProject: (id, update) => setState((state) => ({ projects: state.projects.map((p) => p.id === id ? { ...p, ...update } : p) })),
  updateContract: (projectId, memberId, update) => setState((state) => ({
    projects: state.projects.map((project) => project.id === projectId
      ? { ...project, contracts: project.contracts.map((contract) => contract.memberId === memberId ? { ...contract, ...update } : contract) }
      : project),
  })),
  setActiveProject: (id) => setState({ activeProjectId: id }),
  addCash: (amount) => setState((state) => state.studio ? ({ studio: { ...state.studio, cash: Math.max(0, state.studio.cash + amount) } }) : {}),
  addHistory: (entry) => setState((state) => ({ worldHistory: [entry, ...state.worldHistory].slice(0, 160) })),
  syncClock: () => setState((state) => {
    if (!state.hasStudio) return state;
    const now = Date.now();
    const lastTickAt = state.lastTickAt || now;
    const elapsedDays = Math.min(90, Math.floor((now - lastTickAt) / 60_000));
    if (elapsedDays < 1) return state;
    const gameDay = state.gameDay + elapsedDays;
    const week = Math.floor((gameDay - 1) / 7) + 1;
    const year = 2026 + Math.floor((gameDay - 1) / 364);
    return { gameDay, week: ((week - 1) % 52) + 1, year, lastTickAt: elapsedDays === 90 ? now : lastTickAt + elapsedDays * 60_000 };
  }),
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
    hasStudio: state.hasStudio, studio: state.studio, year: state.year, week: state.week, gameDay: state.gameDay, lastTickAt: state.lastTickAt,
    customDb: state.customDb, projects: state.projects, activeProjectId: state.activeProjectId,
    worldHistory: state.worldHistory, careerAwards: state.careerAwards,
  }) as GameState & GameActions,
}));
