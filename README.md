# G.H.A.R CRM — Real Estate Lead Management Platform

**Gem Homes Advisory & Realtors** — Production-grade CRM built on React + Node.js + Supabase.

---

## 🏗️ Architecture

```
/G.H.A.R CRM
├── frontend/        # React + Vite SPA
├── backend/         # Node.js + Express API server
├── supabase/        # SQL migrations & RLS policies
└── .env.example     # Environment variable template
```

---

## 🚀 Quick Start

### 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run migrations in order:
   - `supabase/migrations/001_core_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_seed_data.sql`
3. Copy your **Project URL**, **Anon Key**, **Service Role Key**, and **JWT Secret** from Dashboard > Settings > API

### 2. Configure environment

```bash
# Frontend
cp .env.example frontend/.env
# Edit frontend/.env — fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL

# Backend
cp .env.example backend/.env
# Edit backend/.env — fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
```

### 3. Install & run

```bash
# Backend
cd backend
npm install
npm run dev       # starts on http://localhost:4000

# Frontend (new terminal)
cd frontend
npm install
npm run dev       # starts on http://localhost:5173
```

---

## 👤 Default Roles

| Role | Capabilities |
|---|---|
| **Admin** (Super Admin) | Full access — all leads, projects, users, settings, reports |
| **Manager** | Team leads, assignments, reports, cannot access settings |
| **Executive** | Own assigned leads and tasks only |

Create your first Admin user through Supabase Auth Dashboard, then insert their record into the `users` table with `role = 'admin'`.

---

## 📊 Phase 1 Features (Built)

- ✅ Lead capture — web form, manual entry, CSV bulk import
- ✅ Pipeline Kanban board with drag-and-drop (10 stages)
- ✅ Lead detail page with activity timeline
- ✅ Task & calendar management
- ✅ Reporting dashboard (Manager + Executive views)
- ✅ Project & inventory master
- ✅ Role-based access control (Admin / Manager / Executive)
- ✅ Auto lead assignment (round-robin / workload-balanced)
- ✅ SLA timer + breach alerts
- ✅ Lead scoring (Hot / Warm / Cold)

## 🔮 Phase 2 (Database scaffolded, UI deferred)

- Channel partner / broker management
- WhatsApp + SMS integration
- Client post-sale module + payment tracking
- Advanced analytics + source ROI

## 🤖 Phase 3 (Deferred)

- AI lead scoring + next-best-action
- Chatbot lead qualification
- Portal integrations (99acres, MagicBricks)
- Attendance / HRMS lite

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6, dnd-kit, Recharts |
| Backend | Node.js 20, Express, node-cron, multer, csv-parse |
| Database | Supabase (Postgres 15) with Row-Level Security |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (documents, brochures) |
| Realtime | Supabase Realtime (live pipeline updates) |
