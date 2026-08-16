# OscarZone — Gaming Customer Portal

A production-ready gaming customer portal with order management, bonus engine, referral system, live chat, and admin panel.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS v4 |
| UI Components | shadcn/ui, Radix UI, Lucide Icons |
| State | Zustand, TanStack Query |
| Backend | Supabase (Auth, PostgreSQL, Realtime, Edge Functions) |
| File Storage | Cloudflare R2 (private, signed URLs) |
| Notifications | Telegram Bot API via Edge Functions |
| Hosting | Cloudflare Pages |
| Charts | Recharts |

## Features

- **Customer Portal**: Register, login, dashboard, game loading, order history, referrals, live chat
- **Guest Quick Load**: No login required to place a load order
- **Bonus Engine**: Server-side bonus calculation with promotional support
- **Referral System**: Multi-level referral program with recurring commissions
- **Admin Panel**: Full order management, customer management, game management, reports
- **Telegram Notifications**: Real-time order alerts via Telegram bot
- **Cloudflare R2**: Private screenshot storage with short-lived signed URLs
- **Screenshot Retention Policy**: Automatic cleanup with configurable retention periods
- **Real-Time Chat**: Supabase Realtime powered live customer support
- **RLS Security**: Row-level security on all tables

---

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd oscar-zone
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> **Security**: Never add R2, Telegram, or Supabase service role credentials to `.env`. These are Edge Function secrets only.

### 3. Local Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Supabase Setup

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key to `.env`

### 2. Run Database Migrations

In the Supabase Dashboard → SQL Editor, run each migration file in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_seed_data.sql
supabase/migrations/005_r2_and_system.sql
```

> Skip `004_storage_policies.sql` — superseded by R2 integration

### 3. Set Edge Function Secrets

In the Supabase Dashboard → Settings → Edge Functions → Secrets:

```
SUPABASE_SERVICE_ROLE_KEY = <your service role key>
R2_ACCOUNT_ID = ffeea7891345dc256a5d6a7b9a0f1e40
R2_ACCESS_KEY_ID = <your R2 access key>
R2_SECRET_ACCESS_KEY = <your R2 secret key>
R2_BUCKET_NAME = oscar-zone-screenshots
R2_ENDPOINT = https://ffeea7891345dc256a5d6a7b9a0f1e40.r2.cloudflarestorage.com
TELEGRAM_BOT_TOKEN = <your telegram bot token>
```

### 4. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref srltrgrepqtnfpyvgkup

# Deploy all functions
supabase functions deploy create-order
supabase functions deploy calculate-bonus
supabase functions deploy update-order-status
supabase functions deploy send-telegram-notification
supabase functions deploy r2-upload-screenshot
supabase functions deploy r2-get-signed-url
supabase functions deploy r2-cleanup-screenshots
```

---

## Cloudflare R2 Setup

### 1. Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → R2
2. Create a bucket named `oscar-zone-screenshots`
3. Keep it **private** (no public access)

### 2. Create R2 API Token

1. Go to R2 → Manage R2 API Tokens
2. Create a token with **Object Read & Write** permissions
3. Copy the Access Key ID and Secret Access Key
4. Add to Supabase Edge Function secrets (see above)

### 3. R2 CORS Configuration

In the R2 bucket settings, add CORS policy:

```json
[
  {
    "AllowedOrigins": ["https://your-domain.pages.dev", "http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

> Note: Direct R2 access from the browser is proxied through the Edge Function. CORS is mainly for the signed URL viewer.

---

## Telegram Bot Setup

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Create a new bot: `/newbot`
3. Copy the bot token
4. Add bot to your group/channel and get the Chat ID
5. Add `TELEGRAM_BOT_TOKEN` to Supabase secrets
6. In Admin Panel → Telegram, add your Chat ID and test the connection

---

## Scheduled Screenshot Cleanup

To automatically delete expired screenshots, set up a cron job using [Supabase pg_cron](https://supabase.com/docs/guides/database/extensions/pg_cron) or call the cleanup function manually:

```sql
-- Enable pg_cron extension in Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Run cleanup daily at 3 AM
SELECT cron.schedule(
  'r2-screenshot-cleanup',
  '0 3 * * *',
  $$
    SELECT net.http_post(
      url := 'https://srltrgrepqtnfpyvgkup.supabase.co/functions/v1/r2-cleanup-screenshots',
      headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'
    );
  $$
);
```

---

## Cloudflare Pages Deployment

### 1. Connect Repository

1. Go to [Cloudflare Pages](https://pages.cloudflare.com)
2. Create a new project
3. Connect your GitHub repository

### 2. Build Settings

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `20` |

### 3. Environment Variables

In Cloudflare Pages → Settings → Environment Variables:

```
VITE_SUPABASE_URL = https://srltrgrepqtnfpyvgkup.supabase.co
VITE_SUPABASE_ANON_KEY = <your anon key>
```

### 4. SPA Routing

The `public/_redirects` file handles SPA routing automatically on Cloudflare Pages.

---

## Admin Setup

### Creating the First Admin User

1. Register a normal account through the website
2. In Supabase Dashboard → SQL Editor, run:

```sql
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'your-admin@email.com';
```

3. Log out and log back in — admin panel is now accessible at `/admin`

---

## Payment Methods

The seed data includes Chime, PayPal, and Cash App. To update payment tags:

```sql
UPDATE payment_methods SET tag = '$YourRealTag' WHERE slug = 'chime';
UPDATE payment_methods SET tag = '@YourRealTag' WHERE slug = 'paypal';
UPDATE payment_methods SET tag = '$YourRealTag' WHERE slug = 'cash-app';
```

---

## Order Flow

```
Customer selects game
     ↓
Selects username (or enters for guest)
     ↓
Enters load amount
     ↓
Bonus preview calculated (server-side)
     ↓
Selects payment method
     ↓
Uploads payment screenshot → R2
     ↓
Order created (atomic, server-side)
     ↓
Telegram notification sent
     ↓
Admin reviews screenshot
     ↓
Verifies → Processes → Completes
     ↓
Customer receives notification
```

---

## Security Notes

- All bonus calculations happen server-side in Edge Functions
- R2 credentials never reach the browser
- Screenshot access requires authentication + ownership check
- Signed URLs expire after 1 hour
- RLS prevents cross-customer data access
- Telegram bot token stored in Edge Function secrets only
- Guest orders are isolated and must be migrated manually by admins

---

## Games Supported

| Game | Download |
|------|----------|
| Juwa | http://dl.juwa777.com/ |
| Orion Stars | http://orionstars.vip:8580/index.html |
| Firekirin | http://firekirin.xyz:8580/index.html |
| Milkyway | https://milkywayapp.xyz/ |
| Game Vault | http://download.gamevault999.com |
| Game Room | https://www.gameroom777.com/m |
| Cash Frenzy | https://www.cashfrenzy777.com/ |

---

## Project Structure

```
oscar-zone/
├── src/
│   ├── components/
│   │   ├── customer/     # Customer-facing components
│   │   ├── layout/       # CustomerLayout, AdminLayout, ProtectedRoute
│   │   └── shared/       # LoadingSpinner, EmptyState, etc.
│   ├── hooks/
│   │   ├── useAuth.ts    # Auth initialization
│   │   └── useRealtime.ts # Realtime subscriptions
│   ├── lib/
│   │   ├── supabase.ts   # Supabase client
│   │   ├── constants.ts  # App constants, game list
│   │   └── utils.ts      # Utility functions
│   ├── pages/
│   │   ├── admin/        # Admin panel pages
│   │   ├── auth/         # Login, Register, etc.
│   │   ├── customer/     # Dashboard, Orders, etc.
│   │   └── public/       # Home, Games, FAQ, etc.
│   ├── services/
│   │   ├── admin.ts      # Admin API calls
│   │   ├── chat.ts       # Chat service
│   │   ├── games.ts      # Game service
│   │   ├── notifications.ts
│   │   ├── orders.ts     # Order service
│   │   ├── payments.ts   # Payment methods
│   │   ├── profiles.ts   # Profile service
│   │   ├── promotions.ts
│   │   ├── r2.ts         # Cloudflare R2 upload/signed URLs
│   │   └── referrals.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── chatStore.ts
│   │   └── notificationStore.ts
│   ├── types/
│   │   └── index.ts      # TypeScript types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css         # Tailwind v4 + custom CSS
├── supabase/
│   ├── functions/
│   │   ├── calculate-bonus/
│   │   ├── create-order/
│   │   ├── r2-cleanup-screenshots/
│   │   ├── r2-get-signed-url/
│   │   ├── r2-upload-screenshot/
│   │   ├── send-telegram-notification/
│   │   └── update-order-status/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       ├── 003_seed_data.sql
│       └── 005_r2_and_system.sql
├── public/
│   └── _redirects        # Cloudflare Pages SPA routing
├── .env.example
├── wrangler.toml         # Cloudflare Pages config
└── netlify.toml          # Netlify backup config
```

---

## Support

For issues or questions, contact: support@oscarzone.com
