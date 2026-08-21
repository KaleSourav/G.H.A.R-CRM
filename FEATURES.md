# G.H.A.R CRM — Implemented Features & Technical Inventory

**Platform:** G.H.A.R CRM (Gem Homes Advisory & Realtors)  
**Architecture:** React 18 (Vite SPA) + Node.js 20 (Express REST API) + Supabase (PostgreSQL 15 with Row-Level Security & Auth)  
**Document Generated:** August 2026

---

## 📑 Executive Summary

G.H.A.R CRM is a production-ready, full-stack real estate Customer Relationship Management (CRM) platform designed specifically for high-velocity real estate developers, brokerages, and advisory firms. The system automates lead intake, enforces response SLAs, manages pipeline stages with drag-and-drop Kanban workflows, tracks unit inventory, and provides role-based analytics.

---

## 🧱 Comprehensive Feature Breakdown

### 1. 👥 Lead Management & Ingestion
- **Public Lead Capture Form (`/capture`)**:
  - Standalone, responsive public web enquiry form for customer self-service.
  - Collects client name, phone number, email, configuration preference (1BHK–5BHK, Villa, Plot, Commercial), budget, and notes.
  - Automatically ties to the organization, runs duplicate checks, calculates lead score, and triggers the auto-assignment engine.
- **Manual Lead Creation (`LeadForm`)**:
  - Modal-based form for sales executives and managers.
  - Form validation with country phone standardisation, budget range (min/max), property preferences, lead source, and sub-source.
- **CSV Bulk Import Engine (`CSVImportModal` / `csvImport.js`)**:
  - Flexible header matching with smart aliases for 12+ standard columns.
  - Automated currency text parsing (supports *Lakhs/Lacs*, *Crores*, *₹*, and raw numeric formats).
  - Phone sanitization (strips spaces, country codes `+91`, symbols).
  - **Deduplication Engine**: Flags duplicate leads by phone and email without dropping records, linking them to original lead records.
  - Batch insertion with option to auto-assign incoming batches directly to active executives.
  - Import summary reports with total processed, imported count, flagged duplicates, and error logs.
- **Lead Listing & Advanced Filtering (`/leads`)**:
  - Full-text search on Name, Phone, and Email.
  - Multi-dimensional filters: Stage, Lead Source, Priority, Assigned Executive, Project, SLA Breach status, and Date range.
  - Column sorting (creation date, lead score, name, budget) and server-side pagination.
  - **CSV Export**: Instant download of filtered/active leads into CSV format.
  - **Bulk Actions**: Batch reassign leads to executives, batch stage updates, and bulk delete (Admin only).
- **Lead Detail View (`/leads/:id`)**:
  - Comprehensive customer profile card with contact badges, project interest, budget, and configuration.
  - Visual interactive pipeline progress bar with one-click stage progression.
  - Unit interest linking and assigned sales executive profile.
  - Quick action toolbar (Call, Email, WhatsApp, Log Activity, Edit Lead, Reassign).

---

### 2. 📊 Pipeline & Kanban Board (`/pipeline`)
- **10-Stage Real Estate Sales Pipeline**:
  1. `New / Unassigned` (Grey)
  2. `Contacted` (Blue)
  3. `Qualified` (Indigo)
  4. `Site Visit Scheduled` (Amber)
  5. `Site Visit Done` (Pink)
  6. `Negotiation` (Purple)
  7. `Booking` (Orange)
  8. `Sold / Closed Won` (Emerald Green)
  9. `Lost / Dropped` (Red)
  10. `On Hold / Nurture` (Slate)
- **Drag-and-Drop Kanban Board**:
  - Smooth HTML5 / `@dnd-kit` drag-and-drop workflow across all stages.
  - Real-time lead count indicators per stage.
  - Quick card summaries showing lead avatar, name, project, phone, budget, priority badge, and SLA breach warnings.
- **Mandatory Lost Reason Modal (`LostReasonModal`)**:
  - Enforced structured reason selection whenever a lead is moved to `Lost / Dropped`.
  - Standardized options: *Budget mismatch*, *Location mismatch*, *Competitor*, *Unresponsive*, *Not genuine*, *Property not available*, *Delayed decision*, and *Other*.
- **Realtime Collaboration Ready**:
  - Direct integration with Supabase Realtime subscriptions for instant pipeline updates across team members.

---

### 3. 🎯 Lead Auto-Assignment Engine (`autoAssign.js`)
- **Configurable Assignment Modes**:
  - **Round-Robin**: Sequentially distributes newly ingested leads to the executive who was least recently assigned a lead (`last_assigned_at`).
  - **Workload-Balanced**: Routes leads dynamically to the active sales executive with the lowest `current_lead_count`.
- **Intelligent Routing Rules**:
  - Scoped strictly to active executives within the organization.
  - Automatically updates executive metrics (`current_lead_count`, `last_assigned_at`).
  - Generates audit logs and instant in-app assignment notifications for the assigned executive.
- **Manual Reassignment**:
  - Admins and Managers can reassign leads at any time.
  - Automatically decrements old executive workload and increments new executive workload while logging the change in the activity history.

---

### 4. 🧮 Lead Scoring Engine (`leadScore.js`)
- **Weighted 0–100 Point Algorithmic Scoring**:
  - **Source Quality (0–30 pts)**: High-intent channels (Walk-in: 30 pts, Google Ads / Referrals: 28 pts, Inbound Call: 26 pts, Website Form: 25 pts, Portals: 20–24 pts, CSV: 12 pts).
  - **Budget Clarity (0–25 pts)**: Full budget range specified (25 pts), partial budget (15 pts), none (0 pts).
  - **Engagement Level (0–20 pts)**: Graded points based on total logged interactions and timeline touchpoints.
  - **First Response Speed (0–25 pts)**: Contacted ≤ 30 min (25 pts), ≤ 1 hr (20 pts), ≤ 2 hrs (15 pts), ≤ 8 hrs (10 pts), ≤ 24 hrs (5 pts).
- **Automated Priority Categorization**:
  - 🔴 **Hot**: Score ≥ 70
  - 🟡 **Warm**: Score 40–69
  - 🔵 **Cold**: Score < 40
- **Dynamic Recalculation**:
  - Lead score automatically refreshes whenever activities are logged or key details (budget, source, response time) change.

---

### 5. ⏱️ SLA Timer & Breach Escalation (`slaTimer.js`)
- **Automated SLA Monitoring**:
  - Background scheduler (`node-cron`) executing every 5 minutes.
  - Monitors all leads in `New / Unassigned` stage against the organization's SLA window (default: 30 minutes).
- **Breach Actions**:
  - Sets `sla_breach = true` on overdue leads.
  - Visual ⚠️ breach indicators placed across Kanban cards, Lead tables, and Lead detail pages.
  - Dispatches high-priority in-app alerts to the assigned executive.
  - **Manager Escalation**: Automatically sends an escalation alert to the executive's direct Sales Manager.
- **Automatic Resolution**:
  - Transitioning a lead to `Contacted` sets `first_contacted_at` and automatically clears the SLA breach status.

---

### 6. 📝 Activity Timeline & Interaction Tracking (`ActivityTimeline`)
- **Centralized Interaction Stream**:
  - Chronological history of every touchpoint on the lead.
  - Activity types: Notes, Outbound Calls, Emails, WhatsApp chats, SMS messages, Stage Changes, Reassignments, Tasks Created, Site Visits Scheduled & Done, Document Uploads, Score Updates, and CSV Ingestion.
- **Direct Activity Logging**:
  - Quick-composer on the Lead Detail page to log notes, calls, and follow-ups with one click.
- **Comprehensive Audit Trail**:
  - System logs capture changes with timestamp, actor ID, action type, old values, and new values.

---

### 7. 📅 Task & Follow-Up Management (`/tasks`)
- **Task Creation & Scheduling (`TaskForm`)**:
  - Supports task categories: *Call*, *Follow Up*, *Site Visit*, *Document*, *Email*, *WhatsApp*, and *Other*.
  - Due date, priority level (*Low*, *Medium*, *High*, *Urgent*), description, and optional linkage to specific leads.
- **Smart Task Dashboard**:
  - Grouped views: 🔴 **Overdue**, 📅 **Due Today**, 🔔 **Upcoming**, and ✅ **Completed**.
  - Type-based filtering and quick toggle for task completion/reopening.
  - Automatic activity log entry created on the linked lead when a task is created.
- **Overdue Task Automation**:
  - Automatic state progression to `overdue` when past due date.

---

### 8. 🏢 Projects & Inventory Master (`/projects` & `/projects/:id`)
- **Project Catalog Management (`ProjectForm`)**:
  - Project profiles with developer name, project name, location, RERA registration number, status (*Active*, *Upcoming*, *Completed*), launch and possession dates.
  - Price range (minimum to maximum) and customizable amenities tags (e.g., *Swimming Pool*, *Gym*, *Clubhouse*, *24/7 Security*).
  - Visual inventory absorption bar displaying total units vs. booked/sold units.
- **Unit Grid & Matrix (`UnitGrid` & `UnitForm`)**:
  - Floor-by-floor visual unit matrix showing unit number, tower, floor, BHK configuration, super built-up area, carpet area, facing direction, and pricing.
  - Unit status lifecycle: `Available` (Green), `Held` (Amber), `Booked` (Purple), and `Sold` (Red).
  - Interactive unit editing and instant status updating.
  - Automatic synchronization of `available_units` count on the parent project.

---

### 9. 📈 Analytics & Management Dashboard (`/dashboard`)
- **KPI Metrics Ribbon**:
  - Total Leads, New Leads This Month, Total Conversions & Conversion Rate %, Active SLA Breaches, Tasks Due Today, Overdue Tasks.
- **Visual Charts & Trends (Recharts)**:
  - **Pipeline Funnel Bar Chart**: Volume distribution across each pipeline stage.
  - **Lead Source Breakdown Pie Chart**: Lead share by acquisition channel (Google, Portals, Referrals, Walk-ins, Ads).
- **Executive Performance Leaderboard (Admins & Managers)**:
  - Ranked table of all sales executives sorted by conversion rate %.
  - Tracks Total Leads Assigned, Converted Deals, Active Pipeline, and Conversion Rate.
- **SLA Quick-Action List**:
  - Immediate view of top breached leads requiring urgent manager intervention.
- **Project Inventory Summary**:
  - Snapshot of all active projects with live unit availability.
- **Role-Aware Context**:
  - Sales Executives see personalized data (their leads, their tasks, their conversion rate).
  - Sales Managers and Admins see organization-wide consolidated metrics.

---

### 10. 🔐 Authentication, Team & RBAC (`/team` & `AuthContext`)
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Complete system control (user creation, org settings, delete rights, all leads/projects).
  - **Sales Manager**: Team oversight, lead assignments, performance reporting, project & unit management.
  - **Sales Executive**: Scoped access to own assigned leads, tasks, and activities.
  - **Front Office / Finance / Channel Partner**: Scaffolded role definitions.
- **Team Hierarchy & User Management (`TeamPage`)**:
  - Admin interface to create new users (creates Supabase Auth account and internal user profile).
  - Assign reporting managers to executives.
  - Active lead count counters per executive.
  - Member deactivation (preserves historic lead audits and assignments).
- **Route Guards & Middleware**:
  - Frontend protected routes (`RequireAuth`, `RequireRole`).
  - Backend JWT verification middleware (`authenticate`) and role enforcement (`requireRole`).

---

### 11. 🔔 In-App Notifications (`/api/auth/notifications`)
- Real-time notification center in top navigation bar with unread badge count.
- Triggers on:
  - New lead auto-assignments or reassignments.
  - SLA breach alerts and manager escalations.
  - CSV bulk import completion status.
- Single notification read toggle and "Mark All as Read" action.

---

### 12. ⚙️ Organization Settings (`/settings`)
- Organization metadata display (Name, Slug, Identifier).
- SLA window configuration display (e.g. 30 minutes).
- Active Lead Assignment algorithm configuration (`round_robin` vs `workload_based`).
- 10-stage pipeline overview and Phase 2 roadmap settings preview.

---

### 13. 🌓 Dark Mode & Light Mode Theme Switcher (`ThemeContext.jsx`)
- **Instant One-Click Toggle**: Accessible via the `Sun`/`Moon` button in the top navigation bar and sidebar footer.
- **Persistent Preferences**: Automatically stores user selection in `localStorage` (`ghar_theme`) and applies it on reload.
- **Seamless CSS Variable System**: Dynamic transition between Deep Navy dark mode (`#080E1A`, `#0D1526`) and Crisp Slate light mode (`#F8FAFC`, `#FFFFFF`) with optimized typography contrast, glassmorphic headers, and tailored form controls.

---

## 💻 Technical Stack Matrix

| Layer | Technologies Used | Key Packages |
|---|---|---|
| **Frontend** | React 18 (SPA), Vite 5, React Router v6 | `@dnd-kit/core`, `@dnd-kit/sortable`, `recharts`, `react-hot-toast`, `date-fns`, `axios` |
| **Backend** | Node.js 20+, Express 4 REST API | `@supabase/supabase-js`, `node-cron`, `multer`, `csv-parse`, `express-rate-limit`, `helmet`, `morgan`, `jsonwebtoken` |
| **Database & Auth** | Supabase (PostgreSQL 15) | Row-Level Security (RLS) policies, Foreign Keys, JSONB settings, Auth Admin SDK |
| **Styling** | Modern Vanilla CSS Design System | CSS variables, glassmorphism, responsive grid layouts, custom scrollbars, dark/light theme ready |

---

## 🔮 Future Roadmap (Phase 2 & Phase 3)

- **Phase 2 (Scaffolded / Upcoming)**:
  - Channel Partner / Broker Commission Management Portal.
  - Official WhatsApp Business API & SMS Gateway integration.
  - Post-sale client module, milestone payment tracking, and demand letters.
  - Meta Lead Ads Webhook integration.
- **Phase 3 (AI & Integrations)**:
  - AI Next-Best-Action recommendation engine & predictive lead conversion scoring.
  - Direct API webhooks from real estate portals (99acres, MagicBricks, Housing.com).
  - Automated qualification voice bot / chatbot.
