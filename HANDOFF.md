# HANDOFF — خدام الوحدة الصباحية

## آخر عمل: Cursor، 2026-11-23 (بطاقات منتسبين مضغوطة)

- بطاقة المنتسب مغلقة بسطرَين تقريباً (~69px): اسم + موقع + تعديل/مجاز.
- الحقول التفصيلية تظهر فقط بعد «تعديل».
- رُفض إبقاء كل الحقول ظاهرة مع تصغير الحشو فقط — ما زالت طويلة مع 32 اسماً.

## قبلها: إصلاح + نشر حذر

- إصلاح ترحيل `fixedPosts` بـ `meta.fixedMigrated` + تصدير/استيراد JSON.
- الحفظ على `khadam-morning-unit-v4` مع قراءة تراثية من `v1` عند الحاجة.
- فرع احتياطي للنسخة المحلية: `backup/local-redesign-2026-11-23`.
- دُمج `main` البعيد ثم أُلغي أثر الدمج الفاسد على `index.html` (كانت تتكرر المعرفات).
- فحص: `node work/audit-pure.mjs` = 16/16.

## تشغيل

- الصفحة: https://warithh.github.io/khadam-morning-unit/
- المستودع: https://github.com/Warithh/khadam-morning-unit
- اختبار: `node work/audit-pure.mjs`
