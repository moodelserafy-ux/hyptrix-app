'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mail,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useGameStore } from '@/lib/store';
import { getUiDir, tr } from '@/lib/i18n';

export type NeelyoInfoTab = 'about' | 'privacy' | 'terms' | 'contact';

const OFFICIAL_EMAIL = 'neelyotycoon@gmail.com';

export function NeelyoInfoModal({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
}: {
  isOpen: boolean;
  activeTab: NeelyoInfoTab;
  onTabChange: (tab: NeelyoInfoTab) => void;
  onClose: () => void;
}) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const showToast = useGameStore((s) => s.showToast);
  const uiLanguage = useGameStore((s) => s.uiLanguage);

  if (!isOpen) return null;

  const dir = getUiDir(uiLanguage);
  const modalTabs: { id: NeelyoInfoTab; label: string }[] = [
    { id: 'about', label: tr(uiLanguage, 'About Us', 'معلومات عنا') },
    { id: 'privacy', label: tr(uiLanguage, 'Privacy Policy', 'سياسة الخصوصية') },
    { id: 'terms', label: tr(uiLanguage, 'Terms of Use', 'شروط الاستخدام') },
    { id: 'contact', label: tr(uiLanguage, 'Contact', 'تواصل معنا') },
  ];

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(OFFICIAL_EMAIL);
      setCopiedEmail(true);
      showToast(
        tr(uiLanguage, 'Official email copied to clipboard!', 'تم نسخ البريد الإلكتروني الرسمي بنجاح!'),
        'success'
      );
      setTimeout(() => setCopiedEmail(false), 2200);
    } catch {
      showToast(
        tr(uiLanguage, `Official Email: ${OFFICIAL_EMAIL}`, `البريد الرسمي: ${OFFICIAL_EMAIL}`),
        'info'
      );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[160] flex items-center justify-center bg-[#0F171E]/80 p-3 sm:p-5 backdrop-blur-md overscroll-contain"
        dir={dir}
      >
        <motion.div
          initial={{ scale: 0.96, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 16, opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl max-h-[88dvh] rounded-2xl bg-[#F9F6F0] text-[#1A2530] border border-[#D4AF37] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Editorial Modal Header */}
          <div className="bg-[#1A2530] px-6 py-4 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Image
                src="/images/neelyo-logo.png"
                alt="Neelyo"
                width={34}
                height={34}
                referrerPolicy="no-referrer"
                className="h-8 w-8 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#D4AF37]">
                  {tr(uiLanguage, 'Neelyo Studio · Official Hub', 'Neelyo Studio · المركز الرسمي')}
                </p>
                <h2 className="font-display text-lg sm:text-xl text-[#F9F6F0] truncate">
                  {tr(uiLanguage, 'Studio Overview & Legal Docs', 'التعريف والوثائق القانونية')}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={tr(uiLanguage, 'Close Neelyo info modal', 'إغلاق نافذة معلومات Neelyo')}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#D91624] text-[#F9F6F0] flex items-center justify-center shrink-0 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Clean Segmented Tab Bar */}
          <div className="px-5 pt-3 pb-0 bg-[#F9F6F0] border-b border-[#1A2530]/12 flex items-center gap-1 overflow-x-auto shrink-0">
            {modalTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`relative px-3.5 py-2.5 text-xs sm:text-sm font-extrabold whitespace-nowrap shrink-0 transition cursor-pointer ${
                    active
                      ? 'text-[#1A2530] border-b-2 border-[#D91624]'
                      : 'text-[#1A2530]/55 hover:text-[#1A2530] border-b-2 border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Scrollable Editorial Body */}
          <div className="px-6 py-6 overflow-y-auto flex-1 space-y-6">
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display text-xl sm:text-2xl text-[#1A2530] mb-2">
                    {tr(
                      uiLanguage,
                      'Neelyo — Cinema & TV Empire Simulation',
                      'Neelyo — محاكاة صناعة السينما والدراما'
                    )}
                  </h3>
                  <p className="text-sm leading-[1.85] text-[#1A2530]/80 font-medium">
                    {tr(
                      uiLanguage,
                      'Neelyo puts you in the executive chair as founder and CEO of your own film and television studio. Craft your studio identity, greenlight original movies and series, negotiate with 180+ actors and directors, navigate live on-set crises, invest in soundstages, and dominate box-office seasons, streaming charts, and annual film festivals.',
                      'تضعك Neelyo في مقعد المؤسس والمنتج التنفيذي لشركة إنتاج سينمائي وتلفزيوني عربية. صمّم هوية استوديوك، ألّف سيناريوهات أفلام ومسلسلات أصلية، تفاوض مع أكثر من 180 ممثلاً ومخرجاً، أدر كواليس التصوير وأصول الاستوديو الثابتة، وتصدّر شباك التذاكر وموسم دراما رمضان وجوائز المهرجانات السنوية.'
                    )}
                  </p>
                </div>

                <dl className="divide-y divide-[#1A2530]/12 border-t border-b border-[#1A2530]/12">
                  <div className="py-4">
                    <dt className="text-sm font-black text-[#1A2530] mb-1">
                      {tr(
                        uiLanguage,
                        '01. Dual Cinema & Television Pipelines',
                        '01. مساران مستقلان للسينما والمسلسلات'
                      )}
                    </dt>
                    <dd className="text-xs sm:text-sm leading-[1.8] text-[#1A2530]/75 font-medium">
                      {tr(
                        uiLanguage,
                        'Theatrical box-office runs and IMAX screens for films, plus millions of views and streaming/network contracts for TV series — all advancing with live daily revenue ticks and rival rankings.',
                        'شباك تذاكر وشاشات عرض للأفلام، ومشاهدات مليونية وعقود منصات وقنوات فضائية للمسلسلات، مع تقدم يومي تلقائي للإيرادات وترتيب المنافسين.'
                      )}
                    </dd>
                  </div>
                  <div className="py-4">
                    <dt className="text-sm font-black text-[#1A2530] mb-1">
                      {tr(
                        uiLanguage,
                        '02. The Star Forge & Deep Contract Negotiations',
                        '02. غرفة صناعة النجوم والتفاوض العميق'
                      )}
                    </dt>
                    <dd className="text-xs sm:text-sm leading-[1.8] text-[#1A2530]/75 font-medium">
                      {tr(
                        uiLanguage,
                        'Design exclusive Diamond-tier stars in the Royal Casting Cabin with a 6-axis stat radar, and conduct realistic multi-day negotiations weighing role billing, salary, and backend profit shares.',
                        'صمّم نجماً حصرياً عبر كابينة الكاستينج والرادار السداسي، وخُض مفاوضات واقعية تُقيّم حجم الدور والأجر ونسبة الأرباح خلال يومين إلى 3 أيام داخل اللعبة.'
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="text-xs font-bold text-[#1A2530]/65">
                    {tr(
                      uiLanguage,
                      'Read the complete studio guide & documentation:',
                      'للاطلاع على الدليل الكامل والوثائق التفصيلية:'
                    )}
                  </span>
                  <Link
                    href="/about-us"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A2530] px-4 py-2 text-xs font-extrabold text-[#D4AF37] hover:bg-[#D91624] hover:text-white transition whitespace-nowrap shrink-0"
                  >
                    <span>{tr(uiLanguage, 'Open About Page', 'فتح صفحة معلومات عنا')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-xl text-[#1A2530]">
                    {tr(uiLanguage, 'Privacy Policy', 'سياسة الخصوصية')}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#1A2530]/65 mt-1 leading-relaxed">
                    {tr(
                      uiLanguage,
                      'A clear, transparent summary of how Neelyo stores and processes game data.',
                      'ملخص واضح وشفاف لكيفية حفظ ومعالجة البيانات داخل Neelyo.'
                    )}
                  </p>
                </div>

                <dl className="divide-y divide-[#1A2530]/12 border-t border-b border-[#1A2530]/12">
                  <div className="py-4">
                    <dt className="text-sm font-black text-[#1A2530] mb-1">
                      {tr(uiLanguage, '1. Local Saves & Cloud Sync', '1. الحفظ المحلي والمزامنة السحابية')}
                    </dt>
                    <dd className="text-xs sm:text-sm leading-[1.8] text-[#1A2530]/80 font-medium">
                      {tr(
                        uiLanguage,
                        'Your studio progress is saved locally on your device for instant play with no mandatory sign-up. Secure cloud servers are used for optional cloud backups, global leaderboard sync, and virtual wallet integrity checks.',
                        'تُحفظ بيانات استوديوك وتقدمك محلياً على جهازك للاستكمال المباشر دون تسجيل إجباري، كما تُستخدم خوادم سحابية آمنة لحفظ التقدم السحابي الاختياري ومزامنة لوحة الترتيب العالمي والتحقق من نزاهة الأرصدة الافتراضية.'
                      )}
                    </dd>
                  </div>
                  <div className="py-4">
                    <dt className="text-sm font-black text-[#1A2530] mb-1">
                      {tr(uiLanguage, '2. Custom Portraits & Visual Assets', '2. الصور المخصصة والأصول المرئية')}
                    </dt>
                    <dd className="text-xs sm:text-sm leading-[1.8] text-[#1A2530]/80 font-medium">
                      {tr(
                        uiLanguage,
                        'Portraits uploaded in the Star Forge are stored strictly as part of your studio profile and may utilize secure media hosting. User images are never sold or shared for external marketing.',
                        'الصور التي ترفعها في غرفة صناعة النجوم تُحفظ ضمن بيانات استوديوك على جهازك، كما قد تعتمد بعض الأصول المرئية والملفات المخصصة داخل اللعبة على خدمات استضافة وسائط سحابية آمنة. ولا يتم بيع صور المستخدمين أو نقلها لأغراض تجارية خارجية.'
                      )}
                    </dd>
                  </div>
                  <div className="py-4">
                    <dt className="text-sm font-black text-[#1A2530] mb-1">
                      {tr(uiLanguage, '3. Leaderboards & AI Story Processing', '3. لوحة الصدارة ومعالجة النصوص')}
                    </dt>
                    <dd className="text-xs sm:text-sm leading-[1.8] text-[#1A2530]/80 font-medium">
                      {tr(
                        uiLanguage,
                        'Leaderboards display only in-game data (studio name, fictional CEO name, market value, releases, and awards) tied to an anonymous studio ID. Script synopses are processed solely to generate dynamic events and reviews.',
                        'تعرض لوحة الصدارة بيانات اللعبة فقط (اسم الاستوديو، اسم المدير الافتراضي، القيمة السوقية، والأعمال والجوائز) مرتبطة بمعرّف مستقل لكل لاعب. كما تُعالج نصوص القصص والسيناريوهات عبر خوادم المعالجة الذكية لتوليد التقييمات والأحداث التفاعلية فقط دون ربطها بهوية شخصية.'
                      )}
                    </dd>
                  </div>
                  <div className="py-4">
                    <dt className="text-sm font-black text-[#1A2530] mb-1">
                      {tr(uiLanguage, '4. Optional Rewarded Ads & Data Deletion', '4. الإعلانات الاختيارية وحذف البيانات')}
                    </dt>
                    <dd className="text-xs sm:text-sm leading-[1.8] text-[#1A2530]/80 font-medium">
                      {tr(
                        uiLanguage,
                        'Optional rewarded bonuses may use privacy-compliant ad providers. You can erase local progress anytime from Studio Settings or request cloud deletion via ',
                        'قد تعتمد المكافآت الاختيارية على مزودي إعلانات ملتزمين بمعايير الخصوصية القياسية. ويمكنك حذف بياناتك المحلية في أي وقت من «إعدادات الاستوديو» أو مراسلتنا لحذف بياناتك السحابية عبر '
                      )}
                      <span dir="ltr" className="font-mono text-[#D91624] font-bold">
                        {OFFICIAL_EMAIL}
                      </span>
                      .
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-xl text-[#1A2530]">
                    {tr(uiLanguage, 'Terms of Use', 'شروط الاستخدام')}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#1A2530]/65 mt-1 leading-relaxed">
                    {tr(
                      uiLanguage,
                      'Fair-play rules governing Neelyo and participation in global leaderboards.',
                      'القواعد المنظمة لاستخدام لعبة Neelyo والمشاركة في الترتيب العالمي.'
                    )}
                  </p>
                </div>

                <dl className="divide-y divide-[#1A2530]/12 border-t border-b border-[#1A2530]/12">
                  <div className="py-4">
                    <dt className="text-sm font-black text-[#1A2530] mb-1">
                      {tr(uiLanguage, '1. Fictional Entertainment Experience', '1. تجربة ترفيهية خيالية')}
                    </dt>
                    <dd className="text-xs sm:text-sm leading-[1.8] text-[#1A2530]/80 font-medium">
                      {tr(
                        uiLanguage,
                        'Neelyo is a purely fictional entertainment management simulation; all characters, reviews, news stories, and studio crises exist strictly for creative gameplay.',
                        'Neelyo لعبة محاكاة إدارية وترفيهية خيالية؛ كافة الشخصيات والتقييمات والأخبار والأزمات داخلها مخصصة للتسلية والتحدي الإبداعي فقط.'
                      )}
                    </dd>
                  </div>
                  <div className="py-4">
                    <dt className="text-sm font-black text-[#1A2530] mb-1">
                      {tr(uiLanguage, '2. 100% Virtual Currencies', '2. أرصدة وعملات افتراضية بالكامل')}
                    </dt>
                    <dd className="text-xs sm:text-sm leading-[1.8] text-[#1A2530]/80 font-medium">
                      {tr(
                        uiLanguage,
                        'All currencies, budgets, and box-office figures displayed in Neelyo are purely virtual and carry zero real-world monetary value.',
                        'جميع المبالغ والعملات الافتراضية المعروضة داخل اللعبة أرصدة افتراضية لا تملك أي قيمة نقدية فعلية ولا يمكن تحويلها أو استبدالها بأموال حقيقية.'
                      )}
                    </dd>
                  </div>
                  <div className="py-4">
                    <dt className="text-sm font-black text-[#1A2530] mb-1">
                      {tr(uiLanguage, '3. Fair Play & Leaderboard Integrity', '3. اللعب النظيف ونزاهة الصدارة')}
                    </dt>
                    <dd className="text-xs sm:text-sm leading-[1.8] text-[#1A2530]/80 font-medium">
                      {tr(
                        uiLanguage,
                        'Players agree to use respectful names and refrain from tampering with balances or exploiting bugs. Our automated ledger verification may adjust or reject tampered scores.',
                        'يلتزم اللاعب باختيار أسماء لائقة وعدم التلاعب بالأرصدة أو استغلال الثغرات، ويحتفظ نظام التحقق المالي الآلي بحق ضبط أو رفض الأرصدة غير المتطابقة حفاظاً على عدالة الترتيب العالمي.'
                      )}
                    </dd>
                  </div>
                  <div className="py-4">
                    <dt className="text-sm font-black text-[#1A2530] mb-1">
                      {tr(uiLanguage, '4. Updates & Intellectual Property', '4. التحديثات وحقوق الملكية')}
                    </dt>
                    <dd className="text-xs sm:text-sm leading-[1.8] text-[#1A2530]/80 font-medium">
                      {tr(
                        uiLanguage,
                        'All design, branding, and game systems are reserved to Neelyo. We periodically tune game balance and features to deliver the best experience.',
                        'كافة حقوق التصميم والهوية وآليات اللعب محفوظة لـ Neelyo، وقد نقوم بتحديث موازنة اللعبة ومميزاتها دورياً لتقديم أفضل تجربة مستقرة.'
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-5 py-2">
                <div>
                  <h3 className="font-display text-xl sm:text-2xl text-[#1A2530]">
                    {tr(uiLanguage, 'Contact the Neelyo Team', 'التواصل الرسمي مع فريق Neelyo')}
                  </h3>
                  <p className="mt-2 text-sm leading-[1.8] text-[#1A2530]/75 font-medium">
                    {tr(
                      uiLanguage,
                      'We welcome feature suggestions, bug reports, privacy inquiries, and partnership requests via our official email:',
                      'نرحب بمقترحات التطوير، بلاغات الأخطاء الفنية، طلبات الخصوصية، واستفسارات الشراكات عبر البريد الرسمي المعتمد:'
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-[#1A2530]/15 bg-white p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="block text-xs font-bold text-[#1A2530]/55 mb-1">
                      {tr(uiLanguage, 'Official Email Address', 'البريد الإلكتروني الرسمي')}
                    </span>
                    <span
                      dir="ltr"
                      className="font-mono text-base sm:text-lg font-black text-[#1A2530]"
                    >
                      {OFFICIAL_EMAIL}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`mailto:${OFFICIAL_EMAIL}?subject=${encodeURIComponent(
                        tr(uiLanguage, 'Inquiry regarding Neelyo', 'رسالة بخصوص لعبة Neelyo')
                      )}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#D91624] px-4 py-2 text-xs font-extrabold text-white hover:brightness-110 transition whitespace-nowrap shrink-0"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{tr(uiLanguage, 'Send Email', 'إرسال رسالة')}</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A2530] px-4 py-2 text-xs font-extrabold text-[#D4AF37] hover:brightness-110 transition cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {copiedEmail ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{tr(uiLanguage, 'Copied', 'تم النسخ')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{tr(uiLanguage, 'Copy Email', 'نسخ البريد')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
