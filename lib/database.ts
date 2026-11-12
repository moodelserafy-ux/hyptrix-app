import defaultDb from "@/data/default_db.json";
import { z } from "zod";
import type { GameDatabase } from "@/lib/types";

const actorSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), gender: z.enum(["male", "female", "other"]).optional(),
  age: z.number().min(0).max(120).optional(), tier: z.enum(["S", "A", "B", "C"]).optional(),
  image_url: z.string().optional(), base_salary: z.number().nonnegative().optional(),
  stats: z.record(z.string(), z.number()).optional(), genre_mastery: z.record(z.string(), z.number()).optional(),
});
const crewSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), role: z.enum(["director", "screenwriter", "cinematographer", "composer", "editor_vfx"]),
  image_url: z.string().optional(), base_salary: z.number().nonnegative().optional(),
  stats: z.record(z.string(), z.number()).optional(), best_genres: z.array(z.string()).optional(),
});
const dbSchema = z.object({
  meta: z.object({ pack_name: z.string().optional(), version: z.string().optional() }).optional(),
  actors: z.array(actorSchema).default([]), crew: z.array(crewSchema).default([]),
  competitor_studios: z.array(z.object({ id: z.string(), name: z.string(), logo_url: z.string().optional(), market_power: z.number().optional(), preferred_genres: z.array(z.string()).optional() })).default([]),
  streaming_platforms: z.array(z.object({ id: z.string(), name: z.string(), logo_url: z.string().optional(), budget_capacity: z.number().optional() })).default([]),
  festivals: z.array(z.object({ id: z.string(), name: z.string(), logo_url: z.string().optional(), prestige: z.number().optional() })).default([]),
});

export function validateDatabase(input: unknown): GameDatabase {
  return dbSchema.parse(input) as GameDatabase;
}

function mergeRows<T extends { id: string }>(base: T[], patch: T[], normalize: (row: T) => T): T[] {
  const byId = new Map(base.map((row) => [row.id, row]));
  for (const row of patch) {
    const previous = byId.get(row.id);
    byId.set(row.id, previous ? deepMerge(previous, row) : normalize(row));
  }
  return [...byId.values()];
}

function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (!base || typeof base !== "object" || !patch || typeof patch !== "object") return (patch ?? base) as T;
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const oldValue = result[key];
    result[key] = value && oldValue && typeof value === "object" && typeof oldValue === "object" && !Array.isArray(value)
      ? deepMerge(oldValue, value as object) : value;
  }
  return result as T;
}

export function getResolvedDatabase(customDb?: GameDatabase | null): GameDatabase {
  const base = validateDatabase(defaultDb);
  if (!customDb) return base;
  const patch = validateDatabase(customDb);
  return {
    meta: { ...base.meta, ...patch.meta },
    actors: mergeRows(base.actors, patch.actors, (row) => ({
      id: row.id, name: row.name, gender: row.gender ?? "other", age: row.age ?? 30, tier: row.tier ?? "C",
      image_url: row.image_url, base_salary: row.base_salary ?? 2_000_000,
      stats: { overall: 60, acting: 60, charisma: 60, box_office_pull: 50, ego: 40, ...row.stats },
      genre_mastery: row.genre_mastery ?? {},
    })),
    crew: mergeRows(base.crew, patch.crew, (row) => ({
      id: row.id, name: row.name, role: row.role, image_url: row.image_url, base_salary: row.base_salary ?? 2_000_000,
      stats: { overall: 60, vision: 60, pacing: 60, efficiency: 60, ...row.stats }, best_genres: row.best_genres ?? [],
    })),
    competitor_studios: mergeRows(base.competitor_studios, patch.competitor_studios, (row) => ({
      id: row.id, name: row.name, logo_url: row.logo_url, market_power: row.market_power ?? 50, preferred_genres: row.preferred_genres ?? [],
    })),
    streaming_platforms: mergeRows(base.streaming_platforms, patch.streaming_platforms, (row) => ({
      id: row.id, name: row.name, logo_url: row.logo_url, budget_capacity: row.budget_capacity ?? 50,
    })),
    festivals: mergeRows(base.festivals, patch.festivals, (row) => ({
      id: row.id, name: row.name, logo_url: row.logo_url, prestige: row.prestige ?? 50,
    })),
  };
}

export const DEFAULT_DATABASE = validateDatabase(defaultDb);
