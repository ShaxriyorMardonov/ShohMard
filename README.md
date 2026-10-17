# SAMU — Smart Assessment & Modern University

**Bilim. Natija. Kelajak.**

SAMU — bir nechta universitet talabalari uchun zamonaviy onlayn imtihon platformasi. Markaziy administrator universitetlar, talabalar, savollar banki va testlarni boshqaradi; talabalar o'z universitetiga belgilangan testlarni ishlaydi.

## Texnologiyalar

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui uslubidagi komponentlar (Radix UI) · Lucide React · PostgreSQL · Prisma ORM 6 · Zod · bcrypt · Vitest

## Imkoniyatlar

- Bir nechta universitet, markaziy administrator, universitetga biriktirilgan talaba hisoblari (ochiq ro'yxatdan o'tish yo'q).
- Savol turlari: bitta javobli, ko'p javobli, to'g'ri/noto'g'ri. Savollar banki va testlarga biriktirish (ball, tartib).
- Test jadvali (boshlanish/tugash oynasi) va davomiylik. Test universitetlar bo'yicha ko'rinadi.
- **Server muddati**: urinish boshlanganda `deadlineAt = min(boshlanish + davomiylik, test tugashi)` bazaga yoziladi. Sahifani yangilash taymerni qayta boshlamaydi; brauzer soati faqat server vaqtiga nisbatan siljish sifatida ishlatiladi.
- **Avtomatik saqlash**: har bir javob/belgi alohida serverga yoziladi (navbat, qayta urinish, saqlanmagan javob bo'lsa sahifadan chiqishda ogohlantirish). Yangilangandan keyin javoblar bazadan tiklanadi.
- **Avtomatik topshirish**: vaqt tugaganda brauzer topshiradi; brauzer yopilgan bo'lsa ham server muddati o'tgan urinishlarni keyingi murojaatda (talaba/admin sahifalari, saqlash so'rovi, CSV eksport) yakunlaydi. Muddatdan keyin javob qabul qilinmaydi (tarmoq kechikishi uchun 3 soniya).
- **Server tomonida baholash** (to'liq moslik bo'yicha), parallel topshirishda bir marta baholash kafolati.
- Natijalarni e'lon qilish: darhol / test yakunlangach / administrator e'lon qilganda. Ball va to'g'ri javoblar e'londan oldin talabaga yuborilmaydi; imtihon oynasiga javob kalitlari umuman yuborilmaydi.
- Natijalar tarixi, batafsil tahlil, admin statistikasi va filtrlangan natijalarni **CSV eksport** (faqat administrator; Excel uchun BOM va formula-injection himoyasi).
- Imtihon boshlangach savollar tarkibi va ishlatilgan savollar qulflanadi (natijalar buzilmasligi uchun).

## Xavfsizlik

- Sessiyalar: tasodifiy 256-bit token, bazada faqat SHA-256 xeshi, `httpOnly` + `SameSite=Lax` + productionda `Secure` cookie, 12 soat.
- Parollar bcrypt (12 raund). 5 marta noto'g'ri urinishdan so'ng hisob 15 daqiqaga bloklanadi; foydalanuvchi mavjudligi oshkor qilinmaydi.
- Har bir sahifa, server amali va route handler serverda `requireAdmin()` / `requireStudent()` bilan tekshiriladi. `middleware.ts` faqat yo'naltirish uchun.
- Talaba faqat o'z urinishlariga kira oladi (egalik har bir so'rovda tekshiriladi). Barcha kiruvchi ma'lumotlar Zod bilan tekshiriladi.
- Frontend kodida maxfiy ma'lumotlar yo'q.

## O'rnatish

Talablar: Node.js 20+ (22 tavsiya etiladi), PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # DATABASE_URL ni sozlang
npx prisma migrate deploy     # yoki ishlab chiqishda: npm run db:migrate
npm run db:seed               # administrator (+ demo ma'lumotlar)
npm run dev                   # http://localhost:3000
```

Production:

```bash
npm run build
npm run db:deploy
npm start
```

Productionda: `SEED_DEMO=false` va kuchli `SEED_ADMIN_PASSWORD` bilan seed qiling, so'ng administrator parolini **Sozlamalar** sahifasida o'zgartiring. HTTPS orqali xizmat ko'rsating (cookie `Secure`).

### Vercel + Neon

1. Neon (yoki boshqa PostgreSQL) bazasini yarating.
2. Vercel'da repo'ni import qiling va Environment Variables'ga qo'shing:
   - `DATABASE_URL` — baza ulanish satri;
   - `SEED_ADMIN_LOGIN` (ixtiyoriy, standart `admin`), `SEED_ADMIN_PASSWORD` — kuchli parol;
   - `SEED_DEMO=false` — demo ma'lumotlarsiz.
   - `GOOGLE_PLACES_API_KEY` (ixtiyoriy) — olimpiadaga ro'yxatdan o'tishda universitetni Google Places orqali tekshirish (Places API (New) yoqilgan kalit). Bo'lmasa o'rnatilgan OTMlar ro'yxati ishlatiladi.
3. Deploy. `vercel-build` migratsiyalarni qo'llaydi va `SEED_ADMIN_PASSWORD` bo'lsa administratorni yaratadi (mavjud hisob o'zgartirilmaydi). Kirgandan so'ng parolni Sozlamalarda yangilang.

### Demo hisoblar (`SEED_DEMO=true`)

| Rol | Login | Parol |
| --- | --- | --- |
| Administrator | `admin` | `SamuAdmin2026` |
| Talaba (TDTU) | `talaba1`, `talaba2` | `Talaba2026` |
| Talaba (SamDU) | `talaba3` | `Talaba2026` |
| Talaba (FarDU) | `talaba4` | `Talaba2026` |

Demo: 3 universitet, 14 savol, 3 test (biri darhol natija beradi, biri test tugagach, biri administrator e'lon qilganda). Natijalar yoki urinishlar soxta tarzda yaratilmaydi.

## Buyruqlar

| Buyruq | Vazifa |
| --- | --- |
| `npm run dev` | Ishlab chiqish serveri |
| `npm run build` / `npm start` | Production build va ishga tushirish |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript tekshiruvi |
| `npm test` | Unit testlar (integratsion testlar `TEST_DATABASE_URL` bo'lsa ishlaydi) |
| `npm run db:migrate` / `db:deploy` / `db:seed` | Migratsiya va seed |

Integratsion testlar (alohida bazada — undagi ma'lumotlar o'chiriladi):

```bash
createdb samu_test
DATABASE_URL=postgresql://.../samu_test npx prisma migrate deploy
TEST_DATABASE_URL=postgresql://.../samu_test npm test
```

## Vaqt mintaqasi

Barcha sanalar **Asia/Tashkent (UTC+05:00)** bo'yicha ko'rsatiladi va administrator kiritgan sana-vaqtlar shu mintaqada talqin qilinadi (`src/lib/time.ts`).

## Tuzilma

```
prisma/              sxema, migratsiyalar, seed
src/app/login        kirish sahifasi
src/app/student      talaba kabineti (bosh sahifa, testlar, tarix, natijalar, profil)
src/app/exam         imtihon oynasi
src/app/admin        administrator paneli (+ results/export CSV)
src/actions          server amallari (auth, exam, admin)
src/server           imtihon va natija xizmatlari (faqat server)
src/lib              auth, Zod sxemalar, baholash qoidalari, vaqt, CSV
src/components/brand SAMU logotipi (SamuLogo, SamuMark)
src/components/ui    shadcn/ui uslubidagi komponentlar
tests/               Vitest unit va integratsion testlar
```

## Brend

Palitra `src/app/globals.css` da: Midnight Blue `#101D3A`, Royal Blue `#315ECA`, fon `#F3F6FC`, karta `#FFFFFF`, muvaffaqiyat `#21A67A`, ogohlantirish `#E9A23B`, xato `#DC4545`, matn `#172033`, ikkilamchi matn `#64748B`. Logotip — buklangan burchakli imtihon varag'i va belgi (✓), `SamuLogo` komponenti orqali qayta ishlatiladi.

## Fayldan yuklash

- **Universitetlar** va **Talabalar**: Excel (.xlsx), namunani "Fayldan yuklash" oynasidan yuklab oling.
- **Savollar**: Word (.doc, .docx) yoki Excel (.xlsx). Word uchun ikki format qabul qilinadi:
  - HEMIS formati: savollar `++++`, variantlar `====` bilan ajratiladi, to'g'ri javob oldiga `#` qo'yiladi.
  - Raqamli format: `1. Savol`, `A) variant`, to'g'ri javob oldiga `*` yoki `Javob: B` qatori.
- Imtihonda variantlar har bir talaba uchun aralashtiriladi.

## Rollar va tuzilma

- **Administrator**: hamma narsani boshqaradi, "Rollar" sahifasida menejer va administratorlarni qo'shadi.
- **Universitet menejeri**: faqat o'z universiteti uchun talaba qo'shadi/yuklaydi, test yaratadi, savol yuklaydi va testni faol/nofaol qiladi.
- Universitet → Fakultet → Guruh. Talabada ta'lim shakli (Kunduzgi, Sirtqi, Kechki, Masofaviy) bor. Excel'dan yuklashda fakultet va guruh avtomatik yaratiladi.
- Testni "Faqat ruxsat berilgan talabalar" rejimiga o'tkazib, guruh, fakultet yoki loginlar bo'yicha ruxsat berish mumkin.
- Natijalar Excel jadval (.xlsx) yoki CSV ko'rinishida filtrlar bilan yuklab olinadi.
