import React from 'react';
import { HyptrixClientApp } from '@/components/HyptrixClientApp';

export default function HyptrixHomePage() {
  return (
    <>
      <HyptrixClientApp />

      {/* Server-Rendered Semantic Overview & Footer for Search Engine Crawlers (Google, ChatGPT, Perplexity) */}
      <footer
        dir="rtl"
        className="border-t border-slate-200 bg-white px-4 py-10 text-right text-slate-600"
      >
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900">
                Hyptrix — إمبراطورية الإنتاج السينمائي 3D
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                لعبة محاكاة وإدارة شركات الإنتاج السينمائي والتلفزيوني باللغة العربية على hyptrix.com. ابنِ البلاتوهات ثلاثية الأبعاد، طوّر معدات التصوير، وتصدّر شباك التذاكر.
              </p>
            </div>

            <div>
              <h3 className="font-display text-sm font-bold text-slate-900">
                البناء المادي وتطوير المعدات 3D
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                شيّد وطوّر 5 مرافق إنتاجية ملموسة: البلاتوه السينمائي الرئيسي، أسطول كاميرات IMAX والدرون، برج الخدع البصرية والمونتاج، قاعة الصوت Dolby Atmos، وجناح التسويق والسجادة الحمراء.
              </p>
            </div>

            <div>
              <h3 className="font-display text-sm font-bold text-slate-900">
                محرك احتمالي وتوزيع عالمي
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                نظام تفاوض متسلسل مع أكثر من 160 ممثلاً ومخرجاً، محاكاة احتمالية لموجات السوق ومفاجآت الجمهور والنقاد، وتوزيع دولي في مصر والخليج وأوروبا وهوليوود.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
            <span>© {new Date().getFullYear()} Hyptrix (hyptrix.com) — جميع الحقوق محفوظة</span>
            <span>محاكاة إدارة استوديوهات السينما والدراما ثلاثية الأبعاد</span>
          </div>
        </div>
      </footer>
    </>
  );
}
