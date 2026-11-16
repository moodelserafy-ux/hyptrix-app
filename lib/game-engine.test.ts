import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMoney,
  calculateGenreSynergy,
  evaluateCastChemistry,
  calculateNegotiatedSalary,
  calculateTalentExpectedSalary,
  calculateFinancialsAndQuality,
  calculateStudioMarketValue,
} from './game-engine';
import {
  mergeDatabases,
  validateCustomDatabase,
  getResolvedDatabase,
  MasterDatabase,
} from './db-resolver';
import { combineAndRankLocal, LOCAL_LEAGUE_STUDIOS } from './supabase';
import defaultDbRaw from '../data/default_db.json';

const baseDb = defaultDbRaw as unknown as MasterDatabase;

test('formatMoney formats billions as 1B / 1.25B instead of 1000M', () => {
  assert.equal(formatMoney(1_000_000_000), '1B');
  assert.equal(formatMoney(1_250_000_000), '1.25B');
  assert.equal(formatMoney(2_500_000_000), '2.5B');
  assert.equal(formatMoney(185_000_000), '185M');
  assert.equal(formatMoney(45_500_000), '45.5M');
});

test('Resolved database contains 160 core actors and 59 crew members with zero pre-baked rising stars', () => {
  const resolved = getResolvedDatabase(null);
  const coreActors = resolved.actors.filter((a) => !a.isRisingDiscovery);
  const risingActors = resolved.actors.filter((a) => a.isRisingDiscovery);

  assert.equal(coreActors.length, 160);
  assert.equal(risingActors.length, 0);
  assert.equal(resolved.actors.length, 160);
  assert.ok(resolved.crew.length >= 55);
});

test('combineAndRankLocal strictly sorts local studios descending by netWorth', () => {
  const ranked = combineAndRankLocal(LOCAL_LEAGUE_STUDIOS, {
    studioName: 'العقرب ستوديوز',
    ceoName: 'محمود الصيرفي',
    region: 'egypt',
    netWorth: 500_000_000,
    releasesCount: 3,
    awardsCount: 4,
  });

  assert.ok(ranked.length >= 10);
  for (let i = 1; i < ranked.length; i++) {
    assert.ok(
      ranked[i - 1].netWorth >= ranked[i].netWorth,
      `Expected rank #${i} (${ranked[i - 1].netWorth}) >= rank #${i + 1} (${ranked[i].netWorth})`
    );
    assert.equal(ranked[i].rank, i + 1);
  }
});

test('Genre Synergy rewards harmonious pairs and penalizes clashes unless saved by genius crew', () => {
  const harmonious = calculateGenreSynergy('crime_mystery', 'psychological_horror', 80, 80);
  assert.equal(harmonious.isHarmonious, true);
  assert.ok(harmonious.score >= 15);

  const clashNormal = calculateGenreSynergy('light_comedy', 'psychological_horror', 75, 75);
  assert.equal(clashNormal.isHarmonious, false);
  assert.ok(clashNormal.score < 0);

  const clashGenius = calculateGenreSynergy('light_comedy', 'psychological_horror', 95, 94);
  assert.equal(clashGenius.isHarmonious, true);
  assert.equal(clashGenius.isWeirdSavedByGenius, true);
  assert.equal(clashGenius.score, 20);
});

test('Cast Chemistry triggers severe ego clash when 2+ stars have ego >= 90', () => {
  const highEgoStars = baseDb.actors.filter((a) => a.stats.ego >= 90).slice(0, 2);
  assert.equal(highEgoStars.length, 2);

  const chemistry = evaluateCastChemistry(highEgoStars, 80);
  assert.equal(chemistry.hasSevereClash, true);
  assert.ok(chemistry.egoClashRisk > 50);
  assert.ok(chemistry.warningMessage?.includes(highEgoStars[0].name));
});

test('Negotiated salary accounts for contract perks; paid dinner is a separate relationship cost', () => {
  const baseSalary = 10_000_000;
  const normalOffer = calculateNegotiatedSalary(baseSalary, 0, 'visionary_director', false);
  assert.equal(normalOffer, 10_000_000);

  const sharkOffer = calculateNegotiatedSalary(baseSalary, 0, 'shark_negotiator', false);
  assert.equal(sharkOffer, 8_500_000);

  const vipDinnerOffer = calculateNegotiatedSalary(baseSalary, 0, 'visionary_director', true);
  assert.equal(vipDinnerOffer, 10_000_000);

  // Out-of-genre + high ego increases expected salary demand
  const highDemand = calculateTalentExpectedSalary({
    baseSalary: 10_000_000,
    ego: 95,
    genreMasteryScore: 45,
    studioReputation: 30,
  });
  assert.ok(highDemand.expectedMinimumSalary > 12_000_000);
});

test('External JSON Patch merger overrides actor names and images by id while preserving stats', () => {
  const customPatch: Partial<MasterDatabase> = {
    meta: { pack_name: 'Mod Pack 2026', version: '2.0' },
    actors: [
      {
        id: 'act_1',
        name: 'النجم المعدل',
        image_url: 'https://image.tmdb.org/t/p/w300/custom.jpg',
      } as MasterDatabase['actors'][0],
    ],
  };

  const validation = validateCustomDatabase(customPatch);
  assert.equal(validation.valid, true);

  const merged = mergeDatabases(baseDb, customPatch);
  assert.equal(merged.meta.pack_name, 'Mod Pack 2026');
  const act1 = merged.actors.find((a) => a.id === 'act_1');
  assert.ok(act1);
  assert.equal(act1.name, 'النجم المعدل');
  assert.equal(act1.image_url, 'https://image.tmdb.org/t/p/w300/custom.jpg');
  assert.equal(act1.stats.box_office_pull, 99);
});

test('Financials calculation produces realistic grounded box office and separates strong vs weak projects', () => {
  const strongResult = calculateFinancialsAndQuality({
    format: 'film',
    filmSeason: 'eid_adha',
    primaryGenre: 'action',
    secondaryGenre: 'popular_drama',
    ageRating: '+12',
    director: baseDb.crew[0],
    writers: [baseDb.crew[4]],
    dop: baseDb.crew[7],
    composer: baseDb.crew[9],
    vfx: baseDb.crew[11],
    leads: [baseDb.actors[0]],
    antagonist: baseDb.actors[1],
    supporting: [baseDb.actors[8], baseDb.actors[9]],
    cameos: [baseDb.actors[3]],
    budgetAllocation: {
      setsAndLocations: 8_000_000,
      costumesAndMakeup: 4_000_000,
      vfxAndStunts: 10_000_000,
      extrasAndCrowds: 3_000_000,
    },
    marketingBudget: 15_000_000,
    screensCount: 150,
    platformDealAmount: 25_000_000,
    founderPerk: 'marketing_whale',
    hypeScore: 82,
    aiBoxOfficeMultiplier: 1.15,
    marketRegion: 'egypt',
    scriptWordCount: 28,
  });

  const resolved = getResolvedDatabase(null);
  const weakResult = calculateFinancialsAndQuality({
    format: 'film',
    filmSeason: 'mid_year',
    primaryGenre: 'light_comedy',
    secondaryGenre: 'psychological_horror',
    ageRating: '+18',
    director: baseDb.crew[3],
    writers: [],
    dop: null,
    composer: null,
    vfx: null,
    leads: [resolved.actors[60]],
    antagonist: null,
    supporting: [],
    cameos: [],
    budgetAllocation: {
      setsAndLocations: 1_500_000,
      costumesAndMakeup: 1_000_000,
      vfxAndStunts: 1_000_000,
      extrasAndCrowds: 500_000,
    },
    marketingBudget: 2_000_000,
    screensCount: 50,
    platformDealAmount: 5_000_000,
    founderPerk: 'shark_negotiator',
    hypeScore: 40,
    aiBoxOfficeMultiplier: 0.65,
    marketRegion: 'egypt',
    scriptWordCount: 4,
  });

  assert.ok(strongResult.technicalQuality >= 65);
  assert.ok(strongResult.totalBoxOfficeRevenue > 25_000_000);
  assert.ok(strongResult.totalBoxOfficeRevenue < 350_000_000);
  assert.ok(weakResult.totalBoxOfficeRevenue < strongResult.totalBoxOfficeRevenue * 0.45);
});

test('calculateStudioMarketValue separates liquid cash from studio enterprise market valuation', () => {
  const initialValuation = calculateStudioMarketValue({
    cash: 75_000_000,
    reputation: 50,
    releasedProjects: [],
  });
  assert.ok(initialValuation > 75_000_000);

  const postHitValuation = calculateStudioMarketValue({
    cash: 95_000_000,
    reputation: 64,
    releasedProjects: [
      {
        totalGrossRevenue: 110_000_000,
        netProfit: 42_000_000,
        criticScore: 8.1,
        awardsWon: ['أفضل فيلم', 'أفضل إخراج', 'أفضل تمثيل'],
      },
    ],
  });
  assert.ok(postHitValuation > initialValuation + 80_000_000);
});
