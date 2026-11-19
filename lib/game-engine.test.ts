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
  generateRivalReleases,
  formatCurrency,
} from './game-engine';
import {
  mergeDatabases,
  validateCustomDatabase,
  getResolvedDatabase,
  MasterDatabase,
} from './db-resolver';
import {
  getMarketProfile,
  getPrimaryMarketRegion,
  getMarketConfigsForWorld,
} from './market-profiles';
import {
  computeLedgerSignature,
  verifyLedgerSignature,
  computePlausibleCashCeiling,
  computePlausibleMarketValueCeiling,
} from './ledger-security';
import { buildAnnualAwardsGalaForYear } from './store';
import defaultDbRaw from '../data/default_db.json';

const baseDb = defaultDbRaw as unknown as MasterDatabase;

test('formatMoney formats billions as 1B / 1.25B instead of 1000M', () => {
  assert.equal(formatMoney(1_000_000_000), '1B');
  assert.equal(formatMoney(1_250_000_000), '1.25B');
  assert.equal(formatMoney(2_500_000_000), '2.5B');
  assert.equal(formatMoney(185_000_000), '185M');
  assert.equal(formatMoney(45_500_000), '45.5M');
});

test('Resolved database contains core actors and crew members with zero pre-baked rising stars', () => {
  const resolved = getResolvedDatabase(null);
  const coreActors = resolved.actors.filter((a) => !a.isRisingDiscovery);
  const risingActors = resolved.actors.filter((a) => a.isRisingDiscovery);

  assert.ok(coreActors.length >= 160);
  assert.equal(risingActors.length, 0);
  assert.equal(resolved.actors.length, coreActors.length);
  assert.ok(resolved.crew.length >= 55);
});

test('Ledger security signs/verifies HMAC accurately and enforces plausible cash & market value ceilings', () => {
  const studioInstanceId = 'studio_test_123';
  const cash = 135_000_000;
  const ownedAssets = ['soundstage_complex'];

  const sig = computeLedgerSignature(studioInstanceId, cash, ownedAssets);
  assert.equal(verifyLedgerSignature(studioInstanceId, cash, ownedAssets, sig), true);
  assert.equal(
    verifyLedgerSignature(studioInstanceId, 999_000_000_000, ownedAssets, sig),
    false
  );

  // A new studio with 1 released film and 60M profit (135M total cash) must stay well within ceiling
  const ceilingOneFilm = computePlausibleCashCeiling({
    releasedCount: 1,
    totalAwards: 0,
    reputation: 70,
  });
  assert.ok(ceilingOneFilm >= 200_000_000);
  assert.ok(135_000_000 <= ceilingOneFilm);

  // Fabricated 999B balance must vastly exceed ceiling
  assert.ok(999_000_000_000 > ceilingOneFilm);

  const mvCeiling = computePlausibleMarketValueCeiling({
    verifiedCash: 135_000_000,
    reputation: 70,
    releasedCount: 1,
    totalAwards: 0,
    ownedAssetsCount: 1,
  });
  assert.ok(mvCeiling >= 220_000_000);
  assert.ok(999_000_000_000 > mvCeiling);
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

test('Negotiated salary and expected salary account for perks, ego, and genre mastery', () => {
  const baseSalary = 10_000_000;
  const normalOffer = calculateNegotiatedSalary(baseSalary, 0, 'visionary_director', false);
  assert.equal(normalOffer, 10_000_000);

  const sharkOffer = calculateNegotiatedSalary(baseSalary, 0, 'shark_negotiator', false);
  assert.equal(sharkOffer, 8_500_000);

  const vipDinnerOffer = calculateNegotiatedSalary(baseSalary, 0, 'visionary_director', true);
  assert.equal(vipDinnerOffer, 8_000_000);

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

  // Upgrading 3D physical buildings & equipment increases studio market value and production quality
  const upgradedValuation = calculateStudioMarketValue({
    cash: 95_000_000,
    reputation: 64,
    releasedProjects: [],
    facilitiesLevels: {
      soundstage: 3,
      camera_rig: 3,
      vfx_tower: 3,
      audio_stage: 2,
      marketing_hub: 2,
    },
  });
  assert.ok(upgradedValuation > initialValuation + 100_000_000);
});

test('Dynamic simulation engine penalizes genre repetition and generates unpredictable market twists', () => {
  const repeatedGenreRun = calculateFinancialsAndQuality({
    format: 'film',
    filmSeason: 'summer',
    primaryGenre: 'action',
    secondaryGenre: null,
    ageRating: '+12',
    director: baseDb.crew[0],
    writers: [baseDb.crew[4]],
    dop: baseDb.crew[7],
    composer: baseDb.crew[9],
    vfx: baseDb.crew[11],
    leads: [baseDb.actors[0]],
    antagonist: baseDb.actors[1],
    supporting: [],
    cameos: [],
    budgetAllocation: {
      setsAndLocations: 8_000_000,
      costumesAndMakeup: 4_000_000,
      vfxAndStunts: 10_000_000,
      extrasAndCrowds: 3_000_000,
    },
    marketingBudget: 12_000_000,
    screensCount: 140,
    platformDealAmount: 20_000_000,
    founderPerk: 'visionary_director',
    hypeScore: 75,
    aiBoxOfficeMultiplier: 1.0,
    marketRegion: 'egypt',
    previousGenres: ['action', 'action'],
    entropySeed: 42,
  });

  const freshGenreRun = calculateFinancialsAndQuality({
    format: 'film',
    filmSeason: 'summer',
    primaryGenre: 'action',
    secondaryGenre: null,
    ageRating: '+12',
    director: baseDb.crew[0],
    writers: [baseDb.crew[4]],
    dop: baseDb.crew[7],
    composer: baseDb.crew[9],
    vfx: baseDb.crew[11],
    leads: [baseDb.actors[0]],
    antagonist: baseDb.actors[1],
    supporting: [],
    cameos: [],
    budgetAllocation: {
      setsAndLocations: 8_000_000,
      costumesAndMakeup: 4_000_000,
      vfxAndStunts: 10_000_000,
      extrasAndCrowds: 3_000_000,
    },
    marketingBudget: 12_000_000,
    screensCount: 140,
    platformDealAmount: 20_000_000,
    founderPerk: 'visionary_director',
    hypeScore: 75,
    aiBoxOfficeMultiplier: 1.0,
    marketRegion: 'egypt',
    previousGenres: ['comedy', 'romance'],
    entropySeed: 42,
  });

  assert.ok(repeatedGenreRun.simulationTwists.some((t) => t.id === 'genre_fatigue'));
  assert.ok(freshGenreRun.simulationTwists.some((t) => t.id === 'genre_fresh_wave'));
  assert.ok(freshGenreRun.totalBoxOfficeRevenue > repeatedGenreRun.totalBoxOfficeRevenue);
});

test('Saudi worldMarket resolves complete Saudi/Gulf database and currency profile', () => {
  const saudiDb = getResolvedDatabase(null, 'saudi');
  assert.equal(saudiDb.meta.targetMarket, 'saudi');
  assert.equal(saudiDb.actors.length, 100);
  assert.equal(saudiDb.crew.length, 36);
  assert.equal(saudiDb.competitor_studios.length, 10);
  assert.equal(saudiDb.streaming_platforms.length, 9);
  assert.equal(saudiDb.festivals.length, 3);
  assert.ok(saudiDb.festivals.some((f) => f.name.includes('البحر الأحمر')));

  const profile = getMarketProfile('saudi');
  assert.equal(profile.currencyLabel, 'ر.س');
  assert.equal(getPrimaryMarketRegion('saudi'), 'gulf');
  assert.equal(formatCurrency(75_000_000, 'saudi'), '75M ر.س');
  assert.equal(formatCurrency(75_000_000, 'egypt'), '75M ج.م');

  const saudiConfigs = getMarketConfigsForWorld('saudi');
  assert.equal(saudiConfigs[0].id, 'gulf');
  assert.equal(saudiConfigs[1].id, 'egypt');
});

test('validateCustomDatabase enforces meta.targetMarket compatibility between Egypt and Saudi worlds', () => {
  const egyptMod = {
    meta: { pack_name: 'Egypt Mod', targetMarket: 'egypt' },
    actors: [{ id: 'act_1', name: 'نجم مصري' }],
  };
  const saudiMod = {
    meta: { pack_name: 'Saudi Mod', targetMarket: 'saudi' },
    actors: [{ id: 'sa_act_1', name: 'نجم سعودي' }],
  };
  const universalMod = {
    meta: { pack_name: 'Universal Mod' },
    actors: [{ id: 'act_1', name: 'نجم عام' }],
  };

  assert.equal(validateCustomDatabase(egyptMod, 'egypt').valid, true);
  assert.equal(validateCustomDatabase(egyptMod, 'saudi').valid, false);
  assert.equal(validateCustomDatabase(saudiMod, 'saudi').valid, true);
  assert.equal(validateCustomDatabase(saudiMod, 'egypt').valid, false);
  assert.equal(validateCustomDatabase(universalMod, 'saudi').valid, true);
});

test('Saudi simulation engine uses Saudi rivals and treats gulf as primary region with egypt as expansion', () => {
  const saudiDb = getResolvedDatabase(null, 'saudi');
  const saudiProfile = getMarketProfile('saudi');

  const rivals = generateRivalReleases(
    saudiDb.competitor_studios,
    saudiDb.actors,
    [],
    1.0,
    2026,
    'film',
    'saudi'
  );
  assert.ok(rivals.length >= 3);
  assert.ok(rivals.every((r) => saudiProfile.rivalFilmTitles.includes(r.title)));

  const baseSaudiRun = calculateFinancialsAndQuality({
    format: 'film',
    filmSeason: 'eid_adha',
    primaryGenre: 'action',
    secondaryGenre: 'comedy',
    ageRating: '+12',
    director: saudiDb.crew[0],
    writers: [],
    dop: saudiDb.crew.find((c) => c.role === 'cinematographer') || null,
    composer: saudiDb.crew.find((c) => c.role === 'composer') || null,
    vfx: saudiDb.crew.find((c) => c.role === 'editor_vfx') || null,
    leads: [saudiDb.actors[0]],
    antagonist: saudiDb.actors[1],
    supporting: [],
    cameos: [],
    budgetAllocation: {
      setsAndLocations: 8_000_000,
      costumesAndMakeup: 4_000_000,
      vfxAndStunts: 10_000_000,
      extrasAndCrowds: 3_000_000,
    },
    marketingBudget: 12_000_000,
    screensCount: 150,
    platformDealAmount: 20_000_000,
    founderPerk: 'marketing_whale',
    hypeScore: 80,
    aiBoxOfficeMultiplier: 1.0,
    marketRegion: 'gulf',
    selectedDistributionMarkets: ['gulf'],
    worldMarket: 'saudi',
    entropySeed: 77,
  });

  const expandedSaudiRun = calculateFinancialsAndQuality({
    format: 'film',
    filmSeason: 'eid_adha',
    primaryGenre: 'action',
    secondaryGenre: 'comedy',
    ageRating: '+12',
    director: saudiDb.crew[0],
    writers: [],
    dop: saudiDb.crew.find((c) => c.role === 'cinematographer') || null,
    composer: saudiDb.crew.find((c) => c.role === 'composer') || null,
    vfx: saudiDb.crew.find((c) => c.role === 'editor_vfx') || null,
    leads: [saudiDb.actors[0]],
    antagonist: saudiDb.actors[1],
    supporting: [],
    cameos: [],
    budgetAllocation: {
      setsAndLocations: 8_000_000,
      costumesAndMakeup: 4_000_000,
      vfxAndStunts: 10_000_000,
      extrasAndCrowds: 3_000_000,
    },
    marketingBudget: 12_000_000,
    screensCount: 150,
    platformDealAmount: 20_000_000,
    founderPerk: 'marketing_whale',
    hypeScore: 80,
    aiBoxOfficeMultiplier: 1.0,
    marketRegion: 'gulf',
    selectedDistributionMarkets: ['gulf', 'egypt'],
    worldMarket: 'saudi',
    entropySeed: 77,
  });

  assert.equal(baseSaudiRun.distributionFeesTotal, 0);
  assert.ok(expandedSaudiRun.distributionFeesTotal > 0);
  assert.ok(expandedSaudiRun.totalGrossRevenue > baseSaudiRun.totalGrossRevenue);
});

test('mergeDatabases preserves base targetMarket when custom mod omits targetMarket', () => {
  const saudiBase = getResolvedDatabase(null, 'saudi');
  const merged = mergeDatabases(saudiBase, {
    meta: { pack_name: 'Mod Without Market', version: '2.1' },
    actors: [{ id: 'sa_act_1', name: 'نجم معدل' }],
  });
  assert.equal(merged.meta.targetMarket, 'saudi');
  assert.equal(merged.actors.find((a) => a.id === 'sa_act_1')?.name, 'نجم معدل');
});

test('Saudi DB contains 100% fictional names, balanced Egypt-parity salaries, and Saudi default platforms', () => {
  const saudiDb = getResolvedDatabase(null, 'saudi');
  assert.equal(saudiDb.actors.length, 100);
  assert.equal(saudiDb.crew.length, 36);

  // Unique names across all 136 people
  const allNames = [...saudiDb.actors.map((a) => a.name), ...saudiDb.crew.map((c) => c.name)];
  assert.equal(new Set(allNames).size, 136);

  // Zero real celebrity names or regional-suffix real names
  const forbiddenRealNames = [
    'عبدالعزيز الشلاحي',
    'عبدالمحسن الضبعان',
    'مفرج المجفل',
    'عبدالعزيز السكيرين',
    'عبدالرحمن نافع',
    'بدر اللحيدان',
    'محمد الدوخي',
    'طلال السدر',
    'سعيد قريشي',
    'شعيفان العتيبي',
    'آيدا القصيبي',
    'فايز المالكي',
    'هدى حسين',
    'فاطمة البنوي',
    'هيفاء المنصور',
  ];
  for (const forbidden of forbiddenRealNames) {
    assert.equal(
      allNames.some((n) => n.includes(forbidden)),
      false,
      `Found real celebrity name in saudi_db.json: ${forbidden}`
    );
  }

  // Economic salary parity with Egypt
  for (const actor of saudiDb.actors) {
    if (actor.tier === 'S') {
      assert.ok(actor.base_salary >= 24_000_000 && actor.base_salary <= 36_000_000);
    } else if (actor.tier === 'A') {
      assert.ok(actor.base_salary >= 12_000_000 && actor.base_salary <= 20_000_000);
    } else if (actor.tier === 'B') {
      assert.ok(actor.base_salary >= 5_000_000 && actor.base_salary <= 10_000_000);
    } else {
      assert.ok(actor.base_salary >= 1_800_000 && actor.base_salary <= 3_500_000);
    }
  }

  const saudiDirectors = saudiDb.crew.filter((c) => c.role === 'director');
  assert.ok(saudiDirectors.every((d) => d.base_salary >= 8_000_000 && d.base_salary <= 17_000_000));

  const firstVod = saudiDb.streaming_platforms.find(
    (p) => p.platform_type !== 'tv_channel' && !p.id.startsWith('tv_')
  );
  const firstTv = saudiDb.streaming_platforms.find(
    (p) => p.platform_type === 'tv_channel' || p.id.startsWith('tv_')
  );
  assert.equal(firstVod?.id, 'sa_plat_shashat');
  assert.equal(firstTv?.id, 'tv_sa_riyadh1');
});

test('Annual awards gala in Saudi market never leaks Egyptian fallback directors or titles', () => {
  const saudiDb = getResolvedDatabase(null, 'saudi');
  const saudiDirs = saudiDb.crew.filter((c) => c.role === 'director');
  const rivals = generateRivalReleases(
    saudiDb.competitor_studios,
    saudiDb.actors,
    [],
    1.0,
    2026,
    'film',
    'saudi',
    saudiDirs
  );
  assert.ok(rivals.every((r) => Boolean(r.directorName)));

  const gala = buildAnnualAwardsGalaForYear({
    playerProjectsInYear: [],
    rivalReleasesInYear: rivals,
    studioName: 'الدرعية ستوديوز',
    year: 2026,
    db: saudiDb,
    worldMarket: 'saudi',
  });

  const serialized = JSON.stringify(gala);
  for (const egyptLeak of ['مروان حافظ', 'شريف علام', 'تامر محسن الزيادي', 'ليالي المحروسة', 'العملية 99']) {
    assert.equal(serialized.includes(egyptLeak), false, `Found Egypt leak in Saudi gala: ${egyptLeak}`);
  }
  assert.ok(gala.ceremonies.length >= 2);
});



