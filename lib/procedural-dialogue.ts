/**
 * Procedural Grammar Dialogue & Press Composer (0 AI tokens, 1,000+ unique contextual EN & AR phrasings)
 *
 * Uses a 4-part compositional grammar (Opening x Project/Director Clause x Financial/Ego Commentary x Closing)
 * so every talent negotiation reply and filming press update feels fresh, grounded in the exact
 * salary, backend points, VIP dinner, director, and synopsis — in fluent English or Arabic.
 */

import type { UiLanguageId, WorldMarketId } from './market-profiles';
import { getCurrencyLabel } from './market-profiles';

function hashStr(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(arr: readonly T[], seed: number, salt: number): T {
  return arr[Math.abs(seed + salt * 31) % arr.length];
}

function formatShortMoney(n: number): string {
  const m = n / 1_000_000;
  if (Math.abs(m) >= 1) {
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  return `${Math.round(n / 1_000)}K`;
}

function extractPlotHook(
  synopsis?: string,
  title?: string,
  isAr = false
): string {
  const clean = (synopsis || '').replace(/\s+/g, ' ').trim();
  if (!clean) {
    if (isAr) {
      return title ? `خطوط «${title}» الدرامية` : 'مسار القصة الرئيسي';
    }
    return title ? `the dramatic stakes of "${title}"` : 'the core storyline';
  }
  const firstPart = clean
    .split(/[،.,!؟\n]/)[0]
    ?.trim()
    .split(/\s+/)
    .slice(0, 8)
    .join(' ');
  if (firstPart && firstPart.length >= 6) return firstPart;
  return isAr
    ? `أحداث «${title || 'العمل'}»`
    : `the central arc of "${title || 'the project'}"`;
}

export interface ProceduralOfferReplyParams {
  worldMarket?: WorldMarketId;
  uiLanguage?: UiLanguageId;
  talentName: string;
  talentType?: 'actor' | 'crew';
  roleLabel?: string;
  projectTitle?: string;
  directorName?: string;
  synopsis?: string;
  offeredSalary: number;
  expectedSalary: number;
  backendPoints?: number;
  vipDinner?: boolean;
  ego?: number;
  accepted: boolean;
  studioName?: string;
  rejectionCount?: number;
  seedSalt?: number;
}

const ACCEPT_OPENINGS_EN = [
  'Honestly, this concept hooked me from page one;',
  'My agency reviewed the package and I am genuinely excited to jump in,',
  'Count me in—this feels like the exact bold swing I have been waiting for,',
  'After reading the treatment, I can already see audiences talking about this,',
  'I am officially on board without hesitation,',
  'Rarely does a project with this level of ambition cross my desk,',
  'My team and I agree this has real tentpole potential,',
  'I would be honored to collaborate with your studio this season,',
  'The dramatic runway in this material is electric,',
  'Send over the final paperwork—I am ready to lock dates,',
  'The timing and creative ambition here could not be better,',
  'Consider it a deal—I cannot wait to step onto set,',
] as const;

const REJECT_OPENINGS_EN = [
  'I truly appreciate the studio reaching out, though frankly',
  'My agent and I went over the terms twice, and unfortunately',
  'There is a real spark in the premise, no doubt, yet right now',
  'With full respect for your studio’s vision and ambition,',
  'I genuinely wanted to find common ground here, however',
  'I have to pass on the offer as currently structured because',
  'My upcoming calendar is packed, and to clear space for this shoot',
  'After running the numbers closely with my representation, we feel',
  'I was hoping we could collaborate this year, yet honestly',
  'After weighing the creative and financial picture carefully,',
  'Thank you for thinking of me, though under these terms',
] as const;

const ACCEPT_CLOSINGS_EN = [
  'Let’s schedule table reads before cameras roll.',
  'I have a strong feeling we are about to shake up the box office.',
  'Send the final contract to my agent so we can close this immediately.',
  'I already have a few creative notes I am eager to explore on set.',
  'This season is going to belong to us!',
  'Have production send over the rehearsal schedule this week.',
  'I cannot wait to see the crowd reaction when the teaser drops.',
  'Your trust means a lot—I will bring my A-game from day one.',
  'My calendar is locked and I am ready for principal photography.',
  'Let’s build something audiences remember for years.',
] as const;

const REJECT_CLOSINGS_EN = [
  'If you can bump the fee or sweeten the backend, my door stays open.',
  'Wishing the whole team every success—perhaps we connect on the next slate.',
  'Revisit the budget; once it aligns with my market quote, we can talk again.',
  'I hope you understand—my billing and track record carry clear benchmarks.',
  'Feel free to come back with an improved package if you still want me aboard.',
  'Best of luck with the shoot; I am open to revisiting if the terms shift.',
  'I need stronger financial certainty before locking my schedule.',
  'Adding meaningful box-office points would definitely bring me back to the table.',
  'Apologies again, and best wishes finding the right fit for the project.',
  'The door isn’t closed forever, just not at this current figure.',
] as const;

const ACCEPT_OPENINGS_EG = [
  'بكل صراحة الفكرة دخلت مزاجي من أول سطر؛',
  'مكتب أعمالي راجع الورق وأنا متحمس جداً نبدأ فوراً،',
  'بعتّلكم موافقتي المبدئية وأنا شايف إننا قدام مشروع تقيل فعلاً،',
  'الحماس عندي في السما بعد قراءة المعالجة،',
  'موافق على خوض التجربة دي بلا تردد،',
  'من فترة طويلة ما شفتش مشروع بالجرأة والوضوح ده،',
  'قريت التفاصيل مع فريقي واتفقنا إن العمل ده مكانه الصدارة،',
  'يشرفني نشتغل سوا على المشروع ده في الموسم الجديد،',
  'الشخصية والمساحة الفنية في الورق شدّتني جداً،',
  'يلا نوقّع العقود ونبدأ البروفات في أسرع وقت،',
  'بصراحة العرض ده جه في وقته تماماً،',
  'أقدر أقولك رسمياً إني معاكم في البلاتوه،',
] as const;

const ACCEPT_OPENINGS_SA = [
  'بكل أمانة الفكرة شدتني من أول قراءة،',
  'تواصلت مع فريقي وأنا متحمس جداً نبدأ التصوير قريباً،',
  'موافق بكل سرور على الانضمام لهذا المشروع الواعد،',
  'المعالجة الدرامية مميزة وتستاهل كل الجهد،',
  'من زمان ما شفت مشروع بهذا الطموح والجودة في السوق،',
  'أعلن موافقتي الرسمية ويشرفني التعاون معكم هذا الموسم،',
  'تفاصيل الورق ورؤية الاستوديو أقنعتني تماماً بالمشاركة،',
  'جاهز لتوقيع العقد وبدء التحضيرات مباشرة،',
  'الفكرة تلامس الجمهور بقوة وأنا سعيد أكون جزءاً منها،',
  'عرض احترافي ومشروع يليق بحجم الطموح،',
  'أبارك لكم هذا التوجه الفني وأنا معكم رسمياً،',
  'حماسي للمشروع كبير وواثق إنه بيترك بصمة قوية،',
] as const;

const REJECT_OPENINGS_EG = [
  'أقدّر جداً اهتمام الاستوديو بالتعاون معايا، لكن بصراحة',
  'راجعت العرض مع مدير أعمالي أكثر من مرة، وللأسف',
  'الفكرة فيها لمحة حلوة مش هقدر أنكرها، بس في المرحلة دي',
  'مع كامل احترامي لتاريخ الشركة وطموح المشروع،',
  'حاولت ألاقي نقطة اتفاق عشان نشتغل سوا، لكن',
  'أعتذر بشدة عن عدم قبول العرض بشكله الحالي، لأن',
  'جدولي مضغوط جداً الفترة الجاية وعشان أفرّغ نفسي للمشروع ده',
  'قعدت مع وكيل أعمالي وحسبناها من كل الجوانب، ولقينا إن',
  'كنت أتمنى نتقابل في البلاتوه السنة دي، بس بصراحة',
  'بعد تفكير طويل في المعطيات المادية والفنية للعرض،',
  'مقدر تواصلكم معايا جداً، لكن بشروط العقد الحالية',
] as const;

const REJECT_OPENINGS_SA = [
  'أقدّر جداً تواصلكم وثقتكم، لكن بكل صراحة',
  'راجعت تفاصيل العقد مع فريقي، وللأسف في الوقت الحالي',
  'المشروع يحمل فكرة جيدة، ولكن بالنظر لظروف السوق الحالية',
  'مع كامل التقدير للاستوديو وفريق العمل،',
  'حرصت على دراسة العرض بعناية، إلا أن',
  'أعتذر عن قبول العرض بهذه الشروط حالياً، لأن',
  'ارتباطاتي القادمة تتطلب عرضاً يوازي حجم المسؤولية، وبصراحة',
  'بعد مراجعة الأرقام والتفاصيل مع مدير أعمالي تبيّن أن',
  'كنت أتمنى ننجز هذا العمل سوياً، لكن',
  'أشكر لكم الدعوة والاهتمام، غير أن',
  'لا أستطيع الالتزام بالعقد بصيغته الراهنة لأن',
] as const;

const ACCEPT_CLOSINGS_EG = [
  'وخلينا نجهز جلسات الترابيزة قبل ما الكاميرا تدور.',
  'ومتأكد إننا هنعمل ضجة حقيقية في شباك التذاكر.',
  'ابعتوا النسخة النهائية من العقد عشان نخلص الإجراءات فوراً.',
  'وعندي كذا تفصيلة فنية متحمس أتناقش فيها معاكم في البلاتوه.',
  'الموسم ده هيكون بتاعنا بإذن الله!',
  'خلي إدارة الإنتاج تبلغني بمواعيد البروفات هذا الأسبوع.',
  'متحمس أشوف رد فعل الجمهور أول ما الإعلان التشويقي ينزل.',
  'ثقتكم فيّ هتترجم لأقوى أداء على الشاشة.',
  'جاهز للالتزام الكامل بجدول التصوير من اليوم الأول.',
  'خلينا نصنع عمل يفضل الجمهور فاكره سنين قدام.',
] as const;

const ACCEPT_CLOSINGS_SA = [
  'بانتظار إرسال النسخة النهائية للعقد وتحديد موعد جلسات القراءة.',
  'وواثق تماماً أننا سنقدم عملاً يتصدر حديث الجمهور هذا الموسم.',
  'يسعدني البدء معكم فور اعتماد جدول التصوير الرسمي.',
  'لدي عدة مقترحات إبداعية أتطلع لمشاركتها في التحضيرات.',
  'بإذن الله نحقق معاً رقماً قياسياً في الشباك والمنصات.',
  'جهّزوا أوراق التوقيع وسأكون أول الحاضرين في موقع التصوير.',
  'متحمس جداً لرؤية هذا المشروع يخرج للنور بأعلى جودة.',
  'تعاونكم الاحترافي هو ما جعل القرار سهلاً وسريعاً.',
  'نتطلع لموسم استثنائي يليق بتطلعات المشاهدين.',
  'فلنبدأ العمل فوراً ونصنع تجربة سينمائية لا تُنسى.',
] as const;

const REJECT_CLOSINGS_EG = [
  'لو فيه نية لرفع الأجر أو تحسين الحوافز، مكتبي مفتوح لجولة تفاوض تانية.',
  'أتمنى لكم التوفيق في المشروع، وربما تجمعنا فرصة أنسب في عمل قادم.',
  'راجعوا الميزانية تاني، ولو اقتربتم من التقدير السوقي الحقيقي نقدر نتكلم.',
  'أرجو تتفهموا موقفي، الاسم والمكانة في السوق ليهم حسابات دقيقة.',
  'تقدروا تبعتوا عرض محسّن بنسبة أرباح أو أجر أعلى لو لسه متمسكين بوجودي.',
  'كل التمنيات بنجاح الفيلم، وممكن نعيد التفاوض لو تغيرت شروط العقد.',
  'أنا محتاج ضمانات مادية أوضح قبل ما أربط نفسي بجدول التصوير.',
  'لو أضفتم حافز أرباح شباك تذاكر محترم ممكن أعيد النظر فوراً.',
  'أعتذر مرة تانية، وبالتوفيق ليكم في اختيار الأنسب للدور.',
  'الباب مش مقفول بالكامل، لكن الرقم الحالي صعب جداً أوقّع عليه.',
] as const;

const REJECT_CLOSINGS_SA = [
  'إذا أمكن تعديل العرض المالي أو إضافة نسبة من الإيرادات يسعدني إعادة النظر.',
  'أتمنى لكم كل التوفيق في المشروع، وقد يجمعنا تعاون قادم بشروط أنسب.',
  'راجعوا بند الأجر مع الإدارة المالية، وسأكون منفتحاً لعرض محدث.',
  'أرجو تفهّم موقفي، فالتقييم السوقي لاسمي لا يسمح بقبول هذا الرقم.',
  'يمكنكم طرح عرض جديد أكثر توازناً إذا رغبتم باستمرار المفاوضات.',
  'كل التمنيات لفريقكم بالنجاح، وربما نلتقي في إنتاجات قادمة.',
  'أحتاج عرضاً يعكس حجم الدور وتأثيره في التسويق قبل الالتزام.',
  'إضافة نسبة واضحة من الشباك قد تقرب وجهات النظر في جولة أخرى.',
  'أشكركم مجدداً على العرض وأتمنى للمشروع النجاح الكامل.',
  'القرار نهائي على هذا الرقم، لكنني أرحب بأي تعديل جاد قريباً.',
] as const;

export function composeProceduralOfferReply(
  params: ProceduralOfferReplyParams
): string {
  const isAr = params.uiLanguage === 'ar';
  const isSaudi = params.worldMarket === 'saudi';
  const currencyLabel = getCurrencyLabel(params.worldMarket, params.uiLanguage);
  const title = (
    params.projectTitle || (isAr ? 'العمل الجديد' : 'Untitled Project')
  ).trim();
  const role =
    params.roleLabel ||
    (params.talentType === 'crew'
      ? isAr
        ? 'المهمة الفنية'
        : 'the creative lead'
      : isAr
      ? 'الدور'
      : 'the role');
  const plotHook = extractPlotHook(params.synopsis, title, isAr);
  const ratio =
    params.expectedSalary > 0 ? params.offeredSalary / params.expectedSalary : 1;
  const backend = Math.max(0, Number(params.backendPoints || 0));
  const ego = Number(params.ego ?? 60);
  const seed = hashStr(
    `${params.talentName}_${title}_${params.offeredSalary}_${backend}_${params.vipDinner ? 1 : 0}_${params.rejectionCount || 0}_${params.seedSalt || 0}`
  );

  const offeredTxt = `${formatShortMoney(params.offeredSalary)} ${currencyLabel}`;
  const expectedTxt = `${formatShortMoney(params.expectedSalary)} ${currencyLabel}`;

  if (!isAr) {
    const opening = params.accepted
      ? pick(ACCEPT_OPENINGS_EN, seed, 1)
      : pick(REJECT_OPENINGS_EN, seed, 1);

    const dirClause = params.directorName
      ? pick(
          [
            `especially with ${params.directorName} helming "${title}" and the "${plotHook}" angle.`,
            `working under ${params.directorName} on "${title}" adds serious prestige to ${role}.`,
            `pairing ${params.directorName}’s vision with "${plotHook}" is a major creative draw.`,
            `having ${params.directorName} attached gives "${title}" a clear, unmistakable identity.`,
          ],
          seed,
          2
        )
      : pick(
          [
            `the "${plotHook}" angle in "${title}" gives real room to elevate ${role}.`,
            `the premise of "${title}" opens a standout showcase for ${role}.`,
            `the rhythm behind "${plotHook}" speaks directly to what audiences crave right now.`,
          ],
          seed,
          2
        );

    let moneyClause = '';
    if (params.accepted) {
      if (backend >= 4 && params.vipDinner) {
        moneyClause = `A ${offeredTxt} fee with ${backend}% backend points—plus the genuine respect shown at our VIP dinner—sealed the decision.`;
      } else if (backend >= 4) {
        moneyClause = `Even with the upfront fee (${offeredTxt}) near my floor, ${backend}% of box-office upside makes me a true partner in the win.`;
      } else if (params.vipDinner) {
        moneyClause = `The ${offeredTxt} package is fair, and our private dinner convinced me that "${params.studioName || 'your studio'}" truly backs its artists.`;
      } else if (ratio >= 1.05) {
        moneyClause = `Your generous ${offeredTxt} offer reflects real professionalism and confidence in what I bring to the marquee.`;
      } else {
        moneyClause = `The ${offeredTxt} deal is balanced and well-structured for the scale of this production.`;
      }
    } else {
      if (ratio < 0.72) {
        moneyClause = `the proposed ${offeredTxt} sits far below my market quote (${expectedTxt}) and doesn’t reflect the weight of ${role}.`;
      } else if (ego >= 80 && !params.vipDinner && backend < 3) {
        moneyClause = `a ${offeredTxt} offer without backend points or a proper sit-down doesn’t match the box-office draw I bring.`;
      } else if (ratio < 0.92 && backend === 0) {
        moneyClause = `the ${offeredTxt} fee falls short of my target (${expectedTxt}) with no revenue share to bridge the gap.`;
      } else {
        moneyClause = `the gap between your ${offeredTxt} offer and my standard quote (${expectedTxt}) makes signing tough this season.`;
      }
    }

    const closing = params.accepted
      ? pick(ACCEPT_CLOSINGS_EN, seed, 4)
      : pick(REJECT_CLOSINGS_EN, seed, 4);

    return `${opening} ${dirClause} ${moneyClause} ${closing}`
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Arabic path (Egyptian / Saudi)
  const opening = params.accepted
    ? pick(isSaudi ? ACCEPT_OPENINGS_SA : ACCEPT_OPENINGS_EG, seed, 1)
    : pick(isSaudi ? REJECT_OPENINGS_SA : REJECT_OPENINGS_EG, seed, 1);

  const dirClause = params.directorName
    ? pick(
        [
          `خاصةً مع وجود المخرج ${params.directorName} على رأس «${title}» ومعالجة «${plotHook}».`,
          `والعمل تحت قيادة ${params.directorName} في «${title}» يضيف ثِقلاً كبيراً لدور ${role}.`,
          `وبصراحة اجتماع رؤية ${params.directorName} مع خط «${plotHook}» عامل جذب حقيقي.`,
          `خصوصاً أن مشروع «${title}» مع ${params.directorName} له هوية واضحة ومختلفة.`,
        ],
        seed,
        2
      )
    : pick(
        [
          `ومعالجة «${plotHook}» في «${title}» تعطي مساحة ممتازة لإبراز ${role}.`,
          `خاصةً أن فكرة «${title}» تفتح آفاقاً قوية أمام ${role}.`,
          `وخط «${plotHook}» يحمل إيقاعاً قريباً جداً من ذوق الجمهور.`,
        ],
        seed,
        2
      );

  let moneyClause = '';
  if (params.accepted) {
    if (backend >= 4 && params.vipDinner) {
      moneyClause = `أجر ${offeredTxt} مع نسبة ${backend}% من الإيرادات والاهتمام الراقي في جلسة العشاء الخاصة حسموا قراري تماماً.`;
    } else if (backend >= 4) {
      moneyClause = `رغم أن الأجر (${offeredTxt}) قريب من الحد الأدنى، إلا أن نسبة ${backend}% من أرباح الشباك تجعلني شريكاً حقيقياً في النجاح.`;
    } else if (params.vipDinner) {
      moneyClause = `العرض المالي (${offeredTxt}) مناسب، والروح الاحترافية خلال عشاء العمل أقنعتني بأن «${params.studioName || 'الاستوديو'}» يقدّر قيمة فريقه.`;
    } else if (ratio >= 1.05) {
      moneyClause = `تقديركم المالي السخي (${offeredTxt}) يعكس احترافية عالية وثقة حقيقية في إضافتي للمشروع.`;
    } else {
      moneyClause = `الاتفاق على ${offeredTxt} معقول ومتوازن قياساً بحجم الإنتاج وتفاصيل العقد.`;
    }
  } else {
    if (ratio < 0.72) {
      moneyClause = `الرقم المطروح (${offeredTxt}) بعيد جداً عن أجري السوقي (${expectedTxt}) ولا يتناسب إطلاقاً مع حجم ${role}.`;
    } else if (ego >= 80 && !params.vipDinner && backend < 3) {
      moneyClause = `عرض ${offeredTxt} بدون حوافز أرباح أو اهتمام تفاوضي يليق بمكانتي لا يعكس القيمة التي أضيفها لشباك التذاكر.`;
    } else if (ratio < 0.92 && backend === 0) {
      moneyClause = `عرض ${offeredTxt} أقل من توقعاتي (${expectedTxt}) دون تعويض بنسب من الإيرادات أو امتيازات عقدية.`;
    } else {
      moneyClause = `الفارق بين عرضكم (${offeredTxt}) وقيمتي التعاقدية (${expectedTxt}) يجعل التوقيع حالياً غير مناسب لخطتي هذا الموسم.`;
    }
  }

  const closing = params.accepted
    ? pick(isSaudi ? ACCEPT_CLOSINGS_SA : ACCEPT_CLOSINGS_EG, seed, 4)
    : pick(isSaudi ? REJECT_CLOSINGS_SA : REJECT_CLOSINGS_EG, seed, 4);

  return `${opening} ${dirClause} ${moneyClause} ${closing}`
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ProceduralPressNewsParams {
  worldMarket?: WorldMarketId;
  uiLanguage?: UiLanguageId;
  projectTitle: string;
  studioName: string;
  directorName?: string;
  leadName?: string;
  synopsis?: string;
  format?: 'film' | 'series';
  gameDay?: number;
  hypeScore?: number;
}

export function composeProceduralFilmingNews(params: ProceduralPressNewsParams): {
  headline: string;
  detail: string;
  impactType: 'positive' | 'drama' | 'rival';
  hypeDelta: number;
} {
  const isAr = params.uiLanguage === 'ar';
  const isSaudi = params.worldMarket === 'saudi';
  const title = params.projectTitle || (isAr ? 'العمل الجديد' : 'Untitled Project');
  const director = params.directorName || (isAr ? 'المخرج' : 'the director');
  const lead = params.leadName || (isAr ? 'بطل العمل' : 'the lead star');
  const hook = extractPlotHook(params.synopsis, title, isAr);
  const seed = hashStr(
    `${title}_${params.studioName}_${director}_${lead}_${params.gameDay || 1}_${Date.now() % 1000}`
  );

  if (!isAr) {
    const mediaLabel = params.format === 'series' ? 'series' : 'feature';
    const marketName = isSaudi ? 'the Saudi & Gulf slate' : 'the Egyptian cinema circuit';
    const enTemplates: Array<{
      headline: string;
      detail: string;
      impactType: 'positive' | 'drama' | 'rival';
      hypeDelta: number;
    }> = [
      {
        headline: `On-Set Buzz from "${title}": ${lead} Stuns Crew in Pivotal Sequence!`,
        detail: `Entertainment press are buzzing over a complex sequence built around "${hook}" directed by ${director} for ${params.studioName}, sending pre-release hype climbing.`,
        impactType: 'positive',
        hypeDelta: 4,
      },
      {
        headline: `Leaked Set Still of ${lead} on ${params.studioName}’s ${mediaLabel} "${title}" Goes Viral`,
        detail: `An unofficial behind-the-scenes frame sparked widespread fan theories around ${lead}’s transformation in "${title}", while ${director} keeps the finale under tight wraps.`,
        impactType: 'positive',
        hypeDelta: 5,
      },
      {
        headline: `Early Crew Praise for ${director}’s Visual Craft on "${title}"`,
        detail: `Insiders report that the "${hook}" set-pieces are shaping up with rare cinematic polish for ${marketName}, putting ${params.studioName} firmly in the spotlight.`,
        impactType: 'positive',
        hypeDelta: 3,
      },
      {
        headline: `Creative Sparks on the "${title}" Soundstage Between ${director} and ${lead}`,
        detail: `An intense creative debate over the climax of "${hook}" ended with an ambitious reshoot—and fans are already eager to see the payoff on screen.`,
        impactType: 'drama',
        hypeDelta: 3,
      },
      {
        headline: `Rival Studios Quietly Track Production Pace of ${params.studioName}’s "${title}"`,
        detail: `Competing executives are rethinking their release calendars ahead of the ${mediaLabel} "${title}", headlined by ${lead} and directed by ${director}.`,
        impactType: 'rival',
        hypeDelta: 4,
      },
      {
        headline: `Night Shoots Ramp Up on "${title}" to Lock Prime Seasonal Release`,
        detail: `${params.studioName}’s unit led by ${director} is running extended exterior shoots for "${hook}" to hit the target premiere without sacrificing polish.`,
        impactType: 'positive',
        hypeDelta: 2,
      },
    ];
    return pick(enTemplates, seed, 7);
  }

  const mediaLabel = params.format === 'series' ? 'مسلسل' : 'فيلم';
  const templates: Array<{
    headline: string;
    detail: string;
    impactType: 'positive' | 'drama' | 'rival';
    hypeDelta: number;
  }> = [
    {
      headline: `كواليس ساخنة من بلاتوه «${title}».. ${lead} يفاجئ الجميع في مشهد محوري!`,
      detail: `تداولت الصحافة الفنية أخباراً عن تصوير مشهد معقد يرتبط بخط «${hook}» تحت قيادة ${director} لصالح «${params.studioName}»، مما رفع ترقب الجمهور قبل العرض.`,
      impactType: 'positive',
      hypeDelta: 4,
    },
    {
      headline: `تسريب صورة غير رسمية لـ ${lead} من موقع تصوير ${mediaLabel} «${title}»`,
      detail: `أشعلت لقطة مسرّبة من كواليس «${params.studioName}» نقاشات واسعة حول تحول شخصية ${lead} في «${title}»، وسط تكتم شديد من ${director} على تفاصيل النهاية.`,
      impactType: 'positive',
      hypeDelta: 5,
    },
    {
      headline: `إشادة مبكرة من فنيي البلاتوه بالرؤية البصرية لـ ${director} في «${title}»`,
      detail: `أكدت مصادر مقربة من الإنتاج أن تنفيذ مشاهد «${hook}» يسير بدقة سينمائية غير مسبوقة في ${isSaudi ? 'السوق السعودي والخليجي' : 'السوق المصري والعربي'}، ما يضع «${params.studioName}» تحت الأضواء.`,
      impactType: 'positive',
      hypeDelta: 3,
    },
    {
      headline: `توتر إبداعي عابر في موقع تصوير «${title}» بين ${director} و${lead} حول مشهد الذروة`,
      detail: `شهد البلاتوه نقاشاً حاداً انتهى باعتماد إعادة تصوير لقطة حاسمة في «${hook}» لإخراجها بأعلى جودة ممكنة، والجمهور يترقب النتيجة بحماس كبير.`,
      impactType: 'drama',
      hypeDelta: 3,
    },
    {
      headline: `الشركات المنافسة تراقب بقلق وتيرة تصوير «${title}» من إنتاج «${params.studioName}»`,
      detail: `بدأت استوديوهات منافسة مراجعة جدول طرحها الموسمي تحسباً للمنافسة الشرسة مع ${mediaLabel} «${title}» ببطولة ${lead} وإخراج ${director}.`,
      impactType: 'rival',
      hypeDelta: 4,
    },
    {
      headline: `مضاعفة ساعات التصوير الليلي لـ «${title}» للحاق بموسم العرض المستهدف`,
      detail: `يعمل طاقم «${params.studioName}» بقيادة ${director} بكامل طاقته لإنهاء المشاهد الخارجية لخط «${hook}» في موعدها دون المساس بالجودة الفنية.`,
      impactType: 'positive',
      hypeDelta: 2,
    },
  ];

  return pick(templates, seed, 7);
}
