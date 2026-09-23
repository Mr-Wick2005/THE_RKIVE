# Athenaeum — College Digital Magazine Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20Auth-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-amber?style=flat-square)](LICENSE)

A production-grade, peer-governed college digital magazine publishing platform and academic archive. Built with **Next.js 14 App Router**, **TypeScript**, **Tailwind CSS**, and **Supabase**, featuring an interactive physical-book-style flipbook reader, an automated high-fidelity PDF processing pipeline, and strict multi-department editorial governance.

---

## Key Highlights

- **Physical-Book Flipbook Reader Engine**: Dual-page desktop spreads, single-page mobile layout, page-curl physics, drag interactions, zoom & pan, sound effects, thumbnail drawer, keyboard navigation, and deep-linked page URLs (`?page=N`).
- **High-Fidelity PDF Processing**: Server-side multi-tier PDF rasterization pipeline rendering print-quality page assets (~200–300 DPI) and progressive thumbnails without degrading font glyphs or image fidelity.
- **Strict Role-Based Access Control (RBAC)**: Fine-grained permissions with Supabase Auth and Row Level Security (RLS) separating **Super Admins** from **Department Admins**.
- **Editorial Publishing Lifecycle**: Complete governance workflow (`DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED` / `REJECTED` → `PUBLISHED` / `ARCHIVED`) with immutable audit logging.
- **Safe Asset & Storage Deletion**: Department-isolated deletion removing database records and purging all associated storage buckets (covers, original PDFs, high-res pages, thumbnails) without affecting other publications.
- **Performance Optimized**: Single-verification JWT authentication, batched admin data transport, lightweight client bundles, and aggressive caching.
- **Editorial Design System**: Typography-driven aesthetic using *Newsreader*, *Plus Jakarta Sans*, and *JetBrains Mono* with a warm ivory, ink, and gold color scheme (`#F8F6F1`, `#171717`, `#B58A55`).

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PUBLIC PORTAL & READER                        │
│   Landing Page  •  Department Archives  •  Search  •  Interactive Flipbook │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                       ADMINISTRATION WORKSPACE                          │
│   Dashboard  •  Publication Table  •  Review Queue  •  User Management  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
       ┌─────────────────────────────┼─────────────────────────────┐
       ▼                             ▼                             ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│ Supabase     │             │ PDF Render   │             │ Supabase     │
│ Auth & RLS   │             │ Pipeline     │             │ Storage      │
│ • SuperAdmin │             │ • High-Res   │             │ • Covers     │
│ • DeptAdmin  │             │ • Thumbnails │             │ • PDFs       │
│ • Isolation  │             │ • Queues     │             │ • Pages      │
└──────────────┘             └──────────────┘             └──────────────┘
```

---

## Directory Structure

```
├── app/
│   ├── actions/                  # Next.js Server Actions (Magazines, Users, Auth)
│   ├── admin/
│   │   ├── dashboard/            # Administrative stats & recent publications
│   │   ├── login/                # Administrative authentication portal
│   │   ├── magazines/            # Publication management (new, edit, delete)
│   │   ├── review/               # Super Admin editorial review queue
│   │   └── users/                # Super Admin user management & role provisioning
│   ├── api/
│   │   └── admin/
│   │       ├── data/             # Batched admin payload endpoint
│   │       └── me/               # Fast cached session verification
│   ├── department/[slug]/        # Department view & published archives
│   ├── magazine/[slug]/          # Magazine issue detail & metadata
│   ├── reader/[slug]/            # Fullscreen interactive flipbook reader
│   ├── magazines/                # Public searchable magazine archive
│   ├── globals.css               # Editorial CSS tokens & typography
│   └── page.tsx                  # Public homepage & masthead
├── components/
│   ├── admin/                    # Admin forms, tables, status badges, modals
│   ├── layout/                   # Masthead, navigation, footer, admin headers
│   ├── reader/                   # Flipbook stage, toolbars, thumbnail scrubber
│   └── ui/                       # Editorial UI components (buttons, badges, inputs)
├── lib/
│   ├── auth/                     # Session helpers, profile cache, bootstrap
│   ├── pdf/                      # PDFjs rasterizer & multi-tier processing pipeline
│   ├── storage/                  # Supabase storage uploads & folder purges
│   └── supabase/                 # Client, server, admin, and middleware clients
├── supabase/
│   ├── schema.sql                # Complete database DDL, RLS, functions, triggers
│   └── seed.sql                  # Seed data for academic departments
├── types/                        # TypeScript domain models & database definitions
├── next.config.mjs               # Next.js config (Node canvas & external packages)
└── tailwind.config.ts            # Custom design tokens, fonts & color palette
```

---

## Core Features & Workflows

### 1. Interactive Flipbook Reader (`/reader/[slug]`)
- **Real Page Turn Physics**: Powered by `page-flip` + HTML5 Canvas with smooth corner drag, realistic drop shadows, and page curl animations.
- **Dual & Single Spreads**: Two-page book view on desktop displays and responsive single-page mode on mobile/tablet viewports.
- **Reader Controls**: Zoom (1x to 3x) with drag-to-pan, fullscreen toggle, page flip sound effects, keyboard arrow shortcuts, and direct jump input.
- **Visual Thumbnail Scrubber**: Slide-out drawer displaying all processed page thumbnails for instant jumping across large editions.
- **Shareable Deep-Links**: Synchronized URL search parameter (`?page=N`) to share and bookmark exact pages.

### 2. PDF Processing & Rasterization Pipeline
- **Print Resolution**: Renders PDF pages to high-resolution PNG/WebP images (~200–300 DPI) ensuring sharp vector typography and crisp imagery.
- **Progressive Thumbnails**: Concurrently generates lightweight thumbnail images for fast loading in carousels and reader navigation.
- **Processing Status Lifecycle**: `QUEUED` → `PROCESSING` → `COMPLETED` / `FAILED` with retry capability in the admin dashboard.

### 3. Editorial Governance & Review Flow
1. **Creation**: Department Admin creates a publication draft and uploads the original PDF and cover art.
2. **Automated Processing**: Server converts the PDF into page assets and saves them to scoped storage.
3. **Safety Verification**: Before submission, the system verifies that PDF processing is `COMPLETED` and page assets exist.
4. **Submission**: Draft transitions to `SUBMITTED` status and enters the Super Admin review queue.
5. **Editorial Review**: Super Admin inspects the issue in the review workspace, providing approval notes or rejection feedback.
6. **Publication**: Approved magazines can be published immediately to the public portal and reader.

### 4. Publication Lifecycle & State Machine

| Status | Accessible Roles | Can Edit? | Can Delete? | Visible on Public Portal? |
| :--- | :--- | :---: | :---: | :---: |
| `DRAFT` | Dept Admin (Own), Super Admin | Yes | Yes | No |
| `SUBMITTED` | Dept Admin (Own), Super Admin | Yes | Yes | No |
| `UNDER_REVIEW` | Super Admin | No | Yes | No |
| `APPROVED` | Super Admin | No | Yes | No |
| `PUBLISHED` | Public, Dept Admin, Super Admin | **No** | Yes | **Yes** |
| `REJECTED` | Dept Admin (Own), Super Admin | Yes | Yes | No |
| `ARCHIVED` | Dept Admin (Own), Super Admin | No | Yes | Optional |

### 5. Safe Deletion & Storage Purging
- **Department Admins** can delete publications belonging to their own department at any lifecycle stage.
- **Super Admins** can delete any publication across all departments.
- **Storage Cleanup**: Safely lists and purges all assets in `${departmentId}/${magazineId}/` across `magazine-covers`, `magazine-pdfs`, and `magazine-pages` (pages and thumbnails).
- **Relational Integrity**: Foreign keys with `ON DELETE CASCADE` automatically clean up `magazine_pages` and `magazine_status_history`.

---

## Getting Started

### Prerequisites

- **Node.js**: `v18.17.0` or higher
- **npm** or **pnpm**
- **Supabase Account**: A Supabase project with PostgreSQL database, Auth, and Storage enabled.

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Mr-Wick2005/VPP_Magazine.git
cd VPP_Magazine
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Settings
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Database Migration & Setup

1. Log in to your [Supabase Dashboard](https://database.new).
2. Navigate to the **SQL Editor**.
3. Run the schema migration script:
   - Copy and execute [`supabase/schema.sql`](supabase/schema.sql) to create tables, enums, triggers, RLS policies, and storage buckets.
4. Run the seed data script:
   - Copy and execute [`supabase/seed.sql`](supabase/seed.sql) to populate standard college departments.

### 4. Run the Application

```bash
# Start development server
npm run dev

# Or build and run for production
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the public portal.

---

## Administrative Access & User Provisioning

### Creating the First Super Admin

You can bootstrap the initial Super Admin account by:
1. Creating an account in the Supabase Auth Dashboard or sign-up flow.
2. In Supabase SQL Editor, assign the `SUPER_ADMIN` role in the `public.profiles` table:

```sql
UPDATE public.profiles
SET role = 'SUPER_ADMIN', is_active = true
WHERE email = 'admin@college.edu';
```

### Department Admin Management

Once logged in as Super Admin:
1. Navigate to **Admin Workspace** → **User Management** (`/admin/users`).
2. Click **Create User**.
3. Enter the user's name, email, department, and role (`DEPARTMENT_ADMIN`).
4. The system provisions the user in Supabase Auth and links their profile to the chosen department.

---

## Storage Architecture

All media assets are organized in three dedicated Supabase Storage buckets with strict departmental folder scoping:

| Bucket Name | Purpose | Path Pattern | Access Policy |
| :--- | :--- | :--- | :--- |
| `magazine-covers` | High-res cover artwork | `${department_id}/${magazine_id}/cover.*` | Public Read / Admin Write |
| `magazine-pdfs` | Original PDF documents | `${department_id}/${magazine_id}/original.pdf` | Authenticated Read & Write |
| `magazine-pages` | Rendered pages & thumbnails | `${department_id}/${magazine_id}/pages/page_*.webp`<br>`${department_id}/${magazine_id}/thumbnails/thumb_*.webp` | Public Read / Admin Write |

---

## Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions, Route Handlers)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with `@tailwindcss/typography` & `tailwind-merge`
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Auth, Storage)
- **Flipbook Engine**: `page-flip` + HTML5 Canvas
- **PDF Processing**: `pdfjs-dist` + `@napi-rs/canvas` / `canvas`
- **Icons**: [Lucide React](https://lucide.dev/)
- **Fonts**: *Newsreader* (Serif), *Plus Jakarta Sans* (Sans), *JetBrains Mono* (Code)

---

## Contributing & Development Guidelines

1. **Department Isolation**: Never bypass department ID filtering in administrative queries or storage paths.
2. **Immutability of Published Issues**: Once a publication reaches `PUBLISHED` status, its metadata and assets are immutable to preserve academic archival integrity.
3. **Storage Cleanup**: Always use `deleteMagazineStorageAssets()` when deleting publications to prevent orphaned storage objects.

---

## License

This project is licensed under the [MIT License](LICENSE).
