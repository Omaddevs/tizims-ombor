# tizimsOmbor.uz — Universitet ombor boshqaruv tizimi

Universitet ombori uchun professional boshqaruv platformasi: mahsulotlar va qoldiqlar, kirim-chiqim jurnali,
xodimlarga buyum biriktirish (shtrix-kod/QR bilan), kamera orqali skanerlash, va kunlik/haftalik/oylik/yillik
hisobotlar (PDF, Excel, DOC).

`tizims-edu-main` bilan bir xil zamonaviy stack asosida qurilgan (React + Vite + Tailwind), lekin haqiqiy
ko'p-qurilmali skanerlash ishlashi uchun Node.js/Express backend va JSON-fayl bazasi (`lowdb`) qo'shilgan.

## Ishga tushirish

```bash
npm run install:all   # server va client bog'liqliklarini o'rnatadi
cp server/.env.example server/.env
npm run dev            # backend (http://localhost:4000) va frontend (http://localhost:2023) birga ishga tushadi
```

Brauzerda http://localhost:2023 ni oching. Birinchi ishga tushirishda backend avtomatik demo ma'lumotlar
(tashkilot, foydalanuvchilar, mahsulotlar, xodimlar) bilan boyitiladi.

## Demo hisoblar

Tashkilot: **Tizims Universiteti**

| Rol | Login | Parol |
| --- | --- | --- |
| Ombor mudiri (admin) | `admin` | `Admin123!` |
| Menejer | `menejer` | `Manager123!` |
| Xodim | `omadbek` | `Employee123!` |
| Tizim egasi (super admin, yangi tashkilotlar yaratadi) | `superadmin` | `SuperAdmin123!` |

## Asosiy imkoniyatlar

- **Mahsulotlar va qoldiqlar** — kategoriya, shtrix-kod, minimal zaxira, narx, yetkazib beruvchi.
- **Kirim** — yangi tovar qabul qilish, chek/hujjat yuklash.
- **Chiqim / Biriktirish** — sarflanadigan mahsulotlarni chiqim qilish yoki asosiy vositalarni (noutbuk va h.k.)
  xodimga QR-kodli biriktirish. Qog'ozdagi imzo o'rniga: xodim o'z hisobidan "Men oldim" deb tasdiqlaydi, yoki
  hisobi yo'q bo'lsa ombor mudiri guvoh sifatida hozir tasdiqlaydi.
- **QR/shtrix-kod chop etish** — biriktirilgan buyumga yopishtiriladigan yorliq, va mahsulot shtrix-kod yorlig'i.
- **Skanerlash** — kamera orqali istalgan qurilmadan (masalan telefondan) kodni skanerlab, mahsulot/xodim/buyum
  haqida haqiqiy ma'lumotni ko'rish (server orqali, localStorage emas).
- **Xodimlar** — bo'lim/lavozim, biriktirilgan buyumlar tarixi, har bir xodim uchun alohida hisobot yuklab olish.
- **Hisobotlar** — kunlik/haftalik/oylik/yillik, mahsulot va xodim kesimida, PDF/Excel/DOC eksport.
- **Login** — avval tashkilot tanlanadi, so'ng login/parol — har bir tashkilotning ombori alohida.

## Loyihaviy tuzilma

```
server/   Node.js + Express API (lowdb JSON baza)
client/   React + Vite + Tailwind frontend
```

Batafsil arxitektura va qarorlar uchun loyihalash hujjati bilan tanishing.
