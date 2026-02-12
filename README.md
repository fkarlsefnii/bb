# B2 Cloud Manager (Next.js Version)

Bu məşhur web texnologiyası olan **Next.js** ilə hazırlanmış, Backblaze B2 idarəetmə panelidir. O, React, TailwindCSS, Framer Motion və Server Actions istifadə edir.

## Xüsusiyyətlər

- 🌌 **Müasir Dizayn**: Glassmorphism, animasiyalar və təmiz interfeys.
- 🚀 **Sürətli Upload**: Fayllar birbaşa brauzerdən B2-yə yüklənir (Presigned URLs), serveri yükləmir.
- 📂 **Tam İdarəetmə**: Qovluq yaratmaq, silmək, faylları gəzmək.
- ⚡ **Next.js Power**: Server Side Rendering (SSR) və Server Actions ilə maksimum performans.

## Qurulum

1. Asılılıqları yükləyin:
   ```bash
   npm install
   ```
2. `.env.local` faylını redaktə edin və B2 məlumatlarınızı daxil edin:
   ```ini
   B2_KEY_ID=...
   B2_APP_KEY=...
   B2_BUCKET_NAME=...
   B2_ENDPOINT=...
   ```
3. İnkişaf serverini işə salın:
   ```bash
   npm run dev
   ```
   Brauzerdə `http://localhost:3000` ünvanını açın.

## Deploy (Vercel və ya Server)

Bu proqramı **Vercel** və ya Node.js dəstəkləyən istənilən serverə (VPS, Railway, Render) rahatlıqla deploy edə bilərsiniz.

```bash
npm run build
npm start
```

## Texnologiyalar

- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Storage**: AWS SDK v3 (B2 Compatible)
