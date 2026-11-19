/**
 * Procedural Grammar Dialogue & Press Composer (0 AI tokens, 1,000+ unique contextual Arabic phrasings)
 *
 * Uses a 4-part compositional grammar (Opening × Project/Director Clause × Financial/Ego Commentary × Closing)
 * so every talent negotiation reply and filming/release press update feels fresh, grounded in the exact
 * salary, backend points, VIP dinner, director, and synopsis — without spending Groq tokens!
 */

import type { WorldMarketId } from './market-profiles';

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

function extractPlotHook(synopsis?: string, title?: string): string {
  const clean = (synopsis || '').replace(/\s+/g, ' ').trim();
  if (!clean) {
    return title ? `خطوط «${title}» الدرامية` : 'مسار القصة الرئيسي';
  }
  const firstPart = clean
    .split(/[،.,!؟\n]/)[0]
    ?.trim()
    .split(/\s+/)
    .slice(0, 8)
    .join(' ');
  return firstPart && firstPart.length >= 6 ? firstPart : `أحداث «${title || 'العمل'}»`;
}

export interface ProceduralOfferReplyParams {
  worldMarket?: WorldMarketId;
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
  const isSaudi = params.worldMarket === 'saudi';
  const currencyLabel = isSaudi ? 'ر.س' : 'ج.م';
  const title = (params.projectTitle || 'العمل الجديد').trim();
  const role = params.roleLabel || (params.talentType === 'crew' ? 'المهمة الفنية' : 'الدور');
  const plotHook = extractPlotHook(params.synopsis, title);
  const ratio = params.expectedSalary > 0 ? params.offeredSalary / params.expectedSalary : 1;
  const backend = Math.max(0, Number(params.backendPoints || 0));
  const ego = Number(params.ego ?? 60);
  const seed = hashStr(
    `${params.talentName}_${title}_${params.offeredSalary}_${backend}_${params.vipDinner ? 1 : 0}_${params.rejectionCount || 0}_${params.seedSalt || 0}`
  );

  // Part 1: Opening
  const opening = params.accepted
    ? pick(isSaudi ? ACCEPT_OPENINGS_SA : ACCEPT_OPENINGS_EG, seed, 1)
    : pick(isSaudi ? REJECT_OPENINGS_SA : REJECT_OPENINGS_EG, seed, 1);

  // Part 2: Dynamic Project / Director / Plot Clause
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

  // Part 3: Exact Salary / Backend / VIP / Ego Commentary
  let moneyClause = '';
  const offeredTxt = `${formatShortMoney(params.offeredSalary)} ${currencyLabel}`;
  const expectedTxt = `${formatShortMoney(params.expectedSalary)} ${currencyLabel}`;

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

  // Part 4: Closing
  const closing = params.accepted
    ? pick(isSaudi ? ACCEPT_CLOSINGS_SA : ACCEPT_CLOSINGS_EG, seed, 4)
    : pick(isSaudi ? REJECT_CLOSINGS_SA : REJECT_CLOSINGS_EG, seed, 4);

  return `${opening} ${dirClause} ${moneyClause} ${closing}`.replace(/\s+/g, ' ').trim();
}

export interface ProceduralPressNewsParams {
  worldMarket?: WorldMarketId;
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
  const isSaudi = params.worldMarket === 'saudi';
  const mediaLabel = params.format === 'series' ? 'مسلسل' : 'فيلم';
  const title = params.projectTitle || 'العمل الجديد';
  const director = params.directorName || 'المخرج';
  const lead = params.leadName || 'بطل العمل';
  const hook = extractPlotHook(params.synopsis, title);
  const seed = hashStr(
    `${title}_${params.studioName}_${director}_${lead}_${params.gameDay || 1}_${Date.now() % 1000}`
  );

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
