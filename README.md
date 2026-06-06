# زكي — Notion-like AI Workspace (عربي/RTL)

مساحة عمل شبيهة بـ Notion: شجرة صفحات لا نهائية، محرّر blocks، وقواعد بيانات بعروض متعددة —
مع **ذكاء اصطناعي مدمج في كل مكان** يعمل على **موديل محلي مجاني (Ollama · qwen3:4b-instruct)** بدون أي API خارجي مدفوع.

## ✨ Features

- 🗂️ **شجرة صفحات** في sidebar (RTL) — عمق لا نهائي، طي، سحب وإفلات للنقل والتداخل، مفضلة، وسلة مهملات (أرشفة/استعادة).
- 📝 **محرّر Blocks (BlockNote)** — slash menu عربية، حفظ تلقائي، عناوين/قوائم/مهام/كود/جداول…
- ✨ **أوامر «/زكي» في المحرر** — كمّل · لخّص · حسّن · ترجم · استخرج مهام · اشرح — كلها **streaming** من الموديل المحلي مع «قبول/تراجع».
- 🧱 **قواعد بيانات بعروض متعددة** — جدول (تحرير inline) · كانبان (DnD) · تقويم · قائمة، وكل صف يفتح كصفحة.
- 🪄 **املأ بزكي** — توليد/تصنيف قيم الخصائص تلقائياً (structured JSON من الموديل المحلي).
- 💬 **اسأل زكي عن الصفحة** — شات بسياق محتوى الصفحة الحالية (streaming).
- 🔍 **بحث Cmd/Ctrl+K** — في عناوين الصفحات **ومحتوى الـ blocks**.
- 🔒 **خصوصية كاملة** — كل الذكاء self-hosted على نفس السيرفر (localhost فقط)، مع fallback خارجي اختياري.
- 🧰 الأدوات القديمة (مهام/كانبان/عادات/مشاريع/Pomodoro/heatmap/تحليلات/شات بالـ tools) متاحة على `/legacy`.

## 🛠️ التقنيات المستخدمة

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Editor**: BlockNote (@blocknote/shadcn)
- **Styling**: TailwindCSS v4 + Shadcn UI + Radix UI (RTL/dark)
- **Database**: SQLite + Prisma ORM (Page / Database / Row)
- **State**: Zustand + TanStack React Query
- **AI**: Ollama محلي (qwen3:4b-instruct) عبر OpenAI-compatible API — كل النداءات في `src/lib/ai.ts`
- **Drag & Drop**: @dnd-kit · **Charts**: ECharts/Recharts (legacy) · **Auth**: Google OAuth

## 🚀 البدء السريع

### المتطلبات
- Node.js 18+ · Bun أو npm
- **Ollama** (للذكاء المحلي) — السيرفر يُفضّل ≥ 8GB RAM (أو swap)

### 1) إعداد الموديل المحلي (Ollama)

```bash
# تثبيت Ollama (بيسجّل نفسه كـ systemd service)
curl -fsSL https://ollama.com/install.sh | sh

# سحب الموديل (non-thinking، يدعم العربي و tool calling)
ollama pull qwen3:4b-instruct

# (اختياري) systemd override: localhost فقط + context أكبر
#   /etc/systemd/system/ollama.service.d/override.conf
#   [Service]
#   Environment="OLLAMA_HOST=127.0.0.1:11434"
#   Environment="OLLAMA_CONTEXT_LENGTH=8192"
#   Environment="OLLAMA_KEEP_ALIVE=30m"
```

> ⚠️ لا تعرض بورت Ollama (11434) للإنترنت — `OLLAMA_HOST=127.0.0.1` فقط.
> على سيرفر بـ RAM محدودة أضِف swap (مثلاً 8GB) لتفادي OOM. الموديل بطيء على CPU، لذلك الشات والمحرر يستخدمان streaming.

### 2) تشغيل التطبيق

```bash
git clone https://github.com/naderyasser/zkii.git && cd zkii
bun install
cp .env.example .env          # واملأ المفاتيح (انظر تحت)
bun run db:generate && bun run db:push
bun run migrate:pages         # (مرة واحدة) نقل بيانات المهام/المشاريع/العادات القديمة لصفحات
bun run dev                   # تطوير
```

التطبيق على: `http://localhost:1111`

### 3) متغيّرات الذكاء في `.env`

```env
# المزوّد الأساسي (محلي عبر Ollama)
AI_BASE_URL=http://127.0.0.1:11434/v1
AI_API_KEY=ollama
AI_MODEL=qwen3:4b-instruct

# مزوّد احتياطي اختياري (يُستخدم تلقائياً لو المحلي فشل) — اتركه فارغاً للتشغيل المحلي فقط
AI_FALLBACK_BASE_URL=
AI_FALLBACK_API_KEY=
AI_FALLBACK_MODEL=
```

### النشر (production / systemd)

```bash
bun run build
# zakii.service: EnvironmentFile=-/root/zkii/.env · After=ollama.service · Restart=always
sudo systemctl restart zakii
```

> `DATABASE_URL` في `.env` لازم يكون **مساراً مطلقاً** (مثلاً `file:/root/zkii/db/custom.db`)
> لأن `EnvironmentFile` في systemd بيغلب الإعداد الصريح. Caddy يعمل reverse proxy لبورت 1111 على الدومين (HTTPS).

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
npm start            # تشغيل الإنتاجية على بورت 1111

# قاعدة البيانات
npm run db:generate  # توليد Prisma client
npm run db:push      # دفع schema إلى البيانات
npm run db:migrate   # إنشاء migration جديد
npm run db:reset     # إعادة تعيين قاعدة البيانات

# الجودة
npm run lint         # تشغيل ESLint
```

## 🔐 المتغيرات البيئية

انسخ `.env.example` إلى `.env` واملأ القيم. ملاحظة: `.env` غير مُتتبَّع في git — **ممنوع وضع أي secret في الكود أو الـ commits**.

```env
# AI Provider (Nous Portal / Hermes — متوافق مع OpenAI)
AI_BASE_URL=https://inference-api.nousresearch.com/v1
AI_API_KEY=
AI_MODEL=Hermes-4-405B

# Web Search (اختياري — Tavily أو Serper)
SEARCH_API_KEY=
SEARCH_PROVIDER=tavily

# Database — المسار نسبي لمجلد prisma/ فيشير لـ db/ في الجذر
DATABASE_URL=file:../db/custom.db

# App
NEXT_PUBLIC_API_URL=https://zakii.educore.software

# NextAuth + Google OAuth (اختياري)
NEXTAUTH_URL=https://zakii.educore.software
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://zakii.educore.software/api/auth/google/callback

# مزايا اختيارية (معطّلة افتراضياً)
NEXT_PUBLIC_ENABLE_ASR=false   # إظهار زر المايك (يتطلب مزوّد ASR خارجي)
ASR_API_URL=
ASR_API_KEY=
IMAGE_API_URL=                 # توليد الصور (مزوّد متوافق مع OpenAI)
IMAGE_API_KEY=
```

## 🤖 AI Provider

زكي يستخدم مزوّد LLM **متوافق مع OpenAI** عبر REST — الافتراضي هو **Nous Portal (Hermes)**:

- **Base URL**: `https://inference-api.nousresearch.com/v1`
- **Endpoint**: `POST /v1/chat/completions` (يدعم `tools` / `tool_calls` بصيغة OpenAI)
- **المصادقة**: `Authorization: Bearer <AI_API_KEY>`
- **الموديل**: عبر `AI_MODEL` (افتراضي `Hermes-4-405B`)

كل نداءات الذكاء تمر عبر `src/lib/ai.ts` (دالة `chatCompletion`) — فيها مهلة 60 ثانية ومعالجة أخطاء ورسالة fallback عربية. لتبديل المزوّد، غيّر `AI_BASE_URL` و `AI_MODEL` و `AI_API_KEY` فقط.

> **القدرات الأربعة:**
> - **الشات + الأدوات (Tools)**: عبر `chatCompletion` — `/api/chat` و `/api/chat/generate-day-summary`.
> - **بحث الويب**: عبر مزوّد خارجي خلف `SEARCH_API_KEY` (Tavily أو Serper) في `src/lib/web-search.ts`. لو المفتاح فاضي → "البحث غير مفعّل" بدون كسر.
> - **توليد الصور (Motivation)**: معطّل افتراضياً (Nous مبيوفّرش صور) — يرجّع ردّ نصّي بديل، ويُفعَّل بضبط `IMAGE_API_URL` + `IMAGE_API_KEY`.
> - **تحويل الصوت لنص (ASR)**: معطّل افتراضياً وزر المايك مخفي — يُفعَّل بضبط `NEXT_PUBLIC_ENABLE_ASR=true` + مزوّد `ASR_API_URL`/`ASR_API_KEY`.

## 🚀 النشر (Deployment)

النشر على VPS خلف **Caddy** (HTTPS تلقائي عبر Let's Encrypt) على البورت **1111** والدومين **`zakii.educore.software`**.

### متطلبات DNS / الشبكة
- سجل **DNS من نوع A** للـ `zakii.educore.software` يشير لـ **IP الـ VPS**.
- فتح بورت **80** و **443** في الـ firewall (Caddy يحتاجهم لإصدار شهادة TLS).

### الخطوات
```bash
# 1) استنساخ المشروع
git clone https://github.com/naderyasser/zkii.git && cd zkii

# 2) تثبيت الحزم
bun install

# 3) المتغيرات البيئية
cp .env.example .env        # املأ AI_API_KEY و NEXTAUTH_SECRET ... إلخ

# 4) قاعدة البيانات
bun run db:generate && bun run db:push

# 5) البناء (standalone)
bun run build

# 6) التشغيل على بورت 1111
bun run start

# 7) Caddy — يوجّه الدومين + HTTPS تلقائي
caddy run --config ./Caddyfile      # أو: caddy reload --config ./Caddyfile لو شغّال كخدمة
```

> **ملاحظات تشغيل:**
> - شغّل `bun run start` من **جذر المشروع** — السكربت يحدّد `DATABASE_URL` كمسار مطلق تلقائياً، و `bun` بيحمّل باقي متغيرات `.env`. لو غيّرت `.env` أعد تشغيل `start` (مش محتاج build).
> - **Google OAuth**: في Google Cloud Console أضِف redirect URI:
>   `https://zakii.educore.software/api/auth/google/callback`
> - **للبقاء بعد إغلاق الجلسة** استخدم `systemd` أو `pm2` لإبقاء `bun run start` و `caddy` شغّالين (مع `WorkingDirectory=/path/to/zkii`).

## 📝 الملاحظات

- التطبيق يستخدم SQLite لسهولة التشغيل
- كل المستخدمين يشاركون نفس مثيل قاعدة البيانات (dev mode)
- الدردشة الذكية تتطلب ضبط `AI_API_KEY`؛ بدونها يرد زكي برسالة fallback نظيفة

## 📄 الترخيص

MIT
