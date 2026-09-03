# 🚀 Deployment Guide — Cloudflare Pages + Supabase

এই গাইডটি অনুসরণ করে যেকোনো নতুন ক্লায়েন্টের জন্য এই অ্যাপ্লিকেশনটি ডিপ্লয় করুন।

---

## পূর্বশর্ত (Prerequisites)

- [x] [Supabase](https://supabase.com) অ্যাকাউন্ট
- [x] [Cloudflare](https://cloudflare.com) অ্যাকাউন্ট
- [x] [GitHub](https://github.com) অ্যাকাউন্ট (fork বা access আছে)
- [x] [Telegram Bot](https://t.me/BotFather) (নোটিফিকেশনের জন্য, ঐচ্ছিক)

---

## ধাপ ১ — Supabase প্রজেক্ট তৈরি করুন

1. [supabase.com/dashboard](https://supabase.com/dashboard) এ গিয়ে **New Project** ক্লিক করুন
2. নাম, পাসওয়ার্ড ও region (US East) দিয়ে প্রজেক্ট তৈরি করুন
3. প্রজেক্ট তৈরি হলে **Settings → API** থেকে নিচের ২টি মান নোট করুন:
   - `Project URL` → `VITE_SUPABASE_URL` এর জন্য
   - `anon public` key → `VITE_SUPABASE_ANON_KEY` এর জন্য

---

## ধাপ ২ — Database Schema রান করুন

Supabase Dashboard এ **SQL Editor** এ গিয়ে নিচের ফাইলগুলো একটি একটি করে **Run** করুন:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_seed_data.sql
supabase/migrations/004_storage_policies.sql
supabase/migrations/005_r2_and_system.sql
supabase/migrations/006_push_subscriptions.sql
supabase/migrations/006_username_auth.sql
supabase/migrations/007_guest_live_chat.sql
supabase/migrations/008_referral_signup.sql
supabase/migrations/009_referral_system.sql
supabase/migrations/010_cashout_requests.sql
supabase/migrations/010_promotions_pinned.sql
supabase/migrations/011_cashout_qr_code.sql
supabase/migrations/011_promotions_pin_text.sql
supabase/migrations/012_free_play_requests.sql
supabase/migrations/013_accounting_rls.sql
supabase/migrations/014_banners_storage.sql
supabase/migrations/015_cashout_rules.sql
supabase/migrations/016_winners_circle.sql
supabase/migrations/017_game_play_now_url.sql
supabase/migrations/018_customer_payment_tag.sql
supabase/migrations/019_staff_permissions.sql
supabase/migrations/020_staff_accounting_rls.sql
supabase/migrations/020_update_is_admin.sql
supabase/migrations/021_staff_table_permissions.sql
supabase/migrations/022_staff_testimonials.sql
supabase/migrations/023_game_password.sql
supabase/migrations/024_staff_processed_by.sql
supabase/migrations/025_accounting_cycles_columns.sql
supabase/migrations/026_fix_active_cycle.sql
supabase/migrations/027_retroactive_processed_by.sql
supabase/migrations/028_retroactive_created_by.sql
supabase/migrations/029_game_icons_storage.sql
```

---

## ধাপ ৩ — Storage Buckets তৈরি করুন

Supabase Dashboard → **Storage** → **New Bucket** এ গিয়ে নিচের buckets তৈরি করুন (সবগুলো **Public** করুন):

| Bucket Name | Public |
|-------------|--------|
| `payment-screenshots` | ❌ না (Private) |
| `avatars` | ✅ হ্যাঁ (Public) |
| `game-assets` | ✅ হ্যাঁ (Public) |
| `banners` | ✅ হ্যাঁ (Public) |
| `game-icons` | ✅ হ্যাঁ (Public) |
| `chat_attachments` | ✅ হ্যাঁ (Public) |

---

## ধাপ ৪ — Admin ইউজার তৈরি করুন

Supabase → **Authentication → Users → Add User** এ গিয়ে আপনার Admin ইমেইল ও পাসওয়ার্ড দিয়ে ইউজার তৈরি করুন।

তারপর **SQL Editor** এ রান করুন (ইমেইল পরিবর্তন করুন):

```sql
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'admin@yourdomain.com';
```

---

## ধাপ ৫ — Edge Functions ডিপ্লয় করুন

Supabase CLI ইন্সটল করুন:
```bash
npm install -g supabase
```

Login ও Function ডিপ্লয়:
```bash
npx supabase login
npx supabase functions deploy send-telegram-notification --project-ref YOUR_PROJECT_REF
npx supabase functions deploy send-push-notification --project-ref YOUR_PROJECT_REF
```

Edge Function Environment Variables সেট করুন — Supabase Dashboard → **Edge Functions → send-telegram-notification → Secrets**:

| Key | Value |
|-----|-------|
| `TELEGRAM_BOT_TOKEN` | আপনার Telegram Bot Token |
| `APP_NAME` | আপনার সাইটের নাম (যেমন: `MyGameZone`) |

---

## ধাপ ৬ — Cloudflare Pages ডিপ্লয়

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages**
2. GitHub repository connect করুন
3. Build settings:
   - **Framework preset:** `None`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Environment Variables** এ নিচেরগুলো যোগ করুন:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | আপনার Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | আপনার Supabase Anon Key |
| `VITE_APP_NAME` | সাইটের নাম (যেমন: `MyGameZone`) |
| `VITE_APP_SHORT_NAME` | সংক্ষিপ্ত নাম (যেমন: `MGZ`) |
| `VITE_APP_TAGLINE` | ট্যাগলাইন |
| `VITE_APP_DESCRIPTION` | বিবরণ |
| `VITE_APP_URL` | আপনার ডোমেইন (যেমন: `https://mygamezone.com`) |
| `VITE_DEFAULT_SUPPORT_EMAIL` | সাপোর্ট ইমেইল |
| `VITE_DEFAULT_SUPPORT_TELEGRAM` | Telegram লিংক |

5. **Save and Deploy** ক্লিক করুন

---

## ধাপ ৭ — Custom Domain (ঐচ্ছিক)

Cloudflare Pages → আপনার প্রজেক্ট → **Custom Domains** → ডোমেইন যোগ করুন।

---

## ধাপ ৮ — Admin Panel থেকে Setup সম্পন্ন করুন

লগইন করার পর **Admin Panel → Settings** থেকে:

- ✅ সাইটের লোগো আপলোড করুন
- ✅ সাইটের নাম ও ট্যাগলাইন আপডেট করুন
- ✅ Support contact তথ্য দিন
- ✅ Payment methods এর ট্যাগ ও QR কোড আপডেট করুন
- ✅ Telegram notification সেটআপ করুন (ঐচ্ছিক)
- ✅ Games ও promotions কাস্টমাইজ করুন

---

## ✅ চেকলিস্ট

```
□ Supabase project তৈরি
□ সব migrations run করা হয়েছে
□ Storage buckets তৈরি
□ Admin user তৈরি ও role সেট
□ Edge functions deployed
□ Cloudflare Pages connected
□ Environment variables সেট
□ Custom domain যোগ
□ Admin panel থেকে branding setup
```

---

## 🔄 পরবর্তী ক্লায়েন্টের জন্য

শুধুমাত্র নতুন Supabase প্রজেক্ট তৈরি করুন এবং Cloudflare Pages এ নতুন deployment তৈরি করুন ভিন্ন environment variables দিয়ে।
একই GitHub repository থেকে সব ক্লায়েন্ট আপডেট পাবে।




