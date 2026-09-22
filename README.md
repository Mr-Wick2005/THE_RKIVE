# College Digital Magazine Platform — Athenaeum

A production-ready, peer-governed college-wide digital magazine publishing platform and academic archive built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase.

---

## Architecture Overview — Module 01

Module 01 provides the core technical foundation:

* **Framework**: Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide React
* **Database & Auth**: Supabase PostgreSQL with strict Row Level Security (RLS) and Supabase Auth
* **Design System**: Editorial typography (Newsreader & Plus Jakarta Sans), curated light-theme palette (Warm Ivory `#F8F6F1`, Ink `#171717`, Warm Beige `#E8E2D8`, Muted Gray `#77736C`)

---

## Project Structure

```
├── app/
│   ├── admin/
│   │   ├── dashboard/page.tsx    # Protected editorial dashboard
│   │   └── login/page.tsx        # Administrative authentication
│   ├── auth/
│   │   ├── callback/route.ts     # Auth token exchange callback
│   │   └── signout/route.ts      # Server signout handler
│   ├── department/[slug]/        # Department view & published issues
│   ├── magazine/[slug]/          # Magazine issue view & metadata
│   ├── magazines/page.tsx        # Public published archives
│   ├── globals.css               # Editorial CSS & typography tokens
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Public landing & department directory
├── components/
│   ├── layout/
│   │   ├── admin-header.tsx      # Protected workspace header
│   │   ├── footer.tsx            # Public editorial footer
│   │   └── header.tsx            # Public editorial masthead
│   └── ui/                       # Button, Input, Badge, Card components
├── lib/
│   ├── auth/
│   │   ├── permissions.ts        # Server authorization & role guards
│   │   └── session.ts            # Server session & profile retrieval
│   ├── departments/              # Department database queries & fallbacks
│   ├── magazines/                # Magazine queries & status filters
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── middleware.ts         # Session update & route guard middleware
│   │   └── server.ts             # Server Supabase client
│   └── utils.ts                  # Utility functions
├── supabase/
│   ├── schema.sql                # Complete schema, triggers, functions, RLS
│   └── seed.sql                  # Academic departments & demo records
├── types/
│   ├── auth.ts                   # Auth, Profile, and Role types
│   ├── database.types.ts         # Supabase TypeScript schema definitions
│   ├── department.ts             # Department domain models
│   └── magazine.ts               # Magazine models & status lifecycles
├── middleware.ts                 # Next.js route protection middleware
├── tailwind.config.ts            # Tailwind design tokens & font pairings
└── tsconfig.json                 # Strict TypeScript configuration
```

---

## Supabase Database Setup

1. Go to your [Supabase Dashboard](https://database.new).
2. Open the **SQL Editor**.
3. Copy and run [`supabase/schema.sql`](supabase/schema.sql) to create:
   - `departments`, `profiles`, `magazines` tables
   - Enums: `user_role` (`SUPER_ADMIN`, `DEPARTMENT_ADMIN`), `magazine_status` (`DRAFT` → `PUBLISHED`)
   - `get_user_role()`, `get_user_department_id()`, `is_super_admin()` security definer functions
   - Row Level Security (RLS) policies for public visitors, department admins, and super admins
   - Storage buckets: `magazine-covers`, `magazine-pdfs`, `magazine-pages`
4. Copy and run [`supabase/seed.sql`](supabase/seed.sql) to populate standard college departments.

---

## Environment Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Running the Application

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```
