# زكي — مساعدك الشخصي الذكي للإنتاجية

تطبيق ويب شامل لإدارة المهام والعادات والمشاريع مع ذكاء اصطناعي متقدم.

## ✨ Features

- 📝 **إدارة المهام الذكية** — مهام مع أولويات، تصنيفات، وتاريخ استحقاق
- 📊 **لوحة تحليلات** — رؤية شاملة لإنتاجيتك (ECharts)
- 🎯 **نمط التركيز** — Pomodoro Timer مع task focus
- 🗂️ **Kanban Board** — تنظيم المهام مع Drag & Drop
- 📅 **تتبع العادات** — مع نظام Streaks
- 📁 **إدارة المشاريع** — تجميع المهام حسب المشاريع
- 🔥 **خريطة الحرارة** — تصور نشاطك السنوي
- 🗣️ **Chat الذكي** — محادثة بالذكاء الاصطناعي
- 🎙️ **Voice Input** — إدخال المهام بالصوت (ASR)
- 🌐 **Web Search** — بحث ويب متكامل في الدردشة
- 📤 **تصدير CSV** — تصدير بيانات المهام
- 🏷️ **تصنيفات مخصصة** — وسوم وتصنيفات قابلة للتخصيص

## 🛠️ التقنيات المستخدمة

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: TailwindCSS + Shadcn UI + Radix UI
- **Database**: SQLite + Prisma ORM
- **State Management**: Zustand + TanStack React Query
- **Charts**: ECharts + Recharts
- **Auth**: NextAuth 4 (Google OAuth)
- **Drag & Drop**: @dnd-kit
- **Forms**: React Hook Form + Zod

## 🚀 البدء السريع

### المتطلبات
- Node.js 18+
- Bun أو npm

### التثبيت

```bash
# استنساخ المستودع
git clone <repo-url>
cd agents-project-feedback-request

# تثبيت الحزم
npm install
# أو
bun install

# إعداد قاعدة البيانات
npm run db:generate
npm run db:push

# تشغيل خادم التطوير
npm run dev
```

التطبيق سيكون متاحاً على: `http://localhost:3000`

## 📂 البنية

```
src/
├── app/          # Next.js routes والـ API endpoints
├── components/   # React components (UI + feature)
├── hooks/        # React custom hooks
├── lib/          # Utilities والـ API clients
├── store/        # Zustand state management
├── types/        # TypeScript type definitions
└── styles/       # Global styles
```

## 🔧 الأوامر المتاحة

```bash
# التطوير
npm run dev          # تشغيل خادم التطوير

# البناء
npm run build        # بناء للإنتاجية
npm start            # تشغيل الإنتاجية

# قاعدة البيانات
npm run db:generate  # توليد Prisma client
npm run db:push      # دفع schema إلى البيانات
npm run db:migrate   # إنشاء migration جديد
npm run db:reset     # إعادة تعيين قاعدة البيانات

# الجودة
npm run lint         # تشغيل ESLint
```

## 🔐 المتغيرات البيئية

أنشئ ملف `.env` في الجذر:

```env
DATABASE_URL=file:./db/custom.db
NEXT_PUBLIC_API_URL=http://localhost:3000
# أضف مفاتيح Google OAuth عند الحاجة
```

## 📝 الملاحظات

- التطبيق يستخدم SQLite لسهولة التطوير
- كل المستخدمين يشاركون نفس مثيل قاعدة البيانات (dev mode)
- الدردشة الذكية تتطلب API credentials

## 📄 الترخيص

MIT
