# Real Estate CRM & Lead Management Platform — Product & Technical Specification

**Reference model:** UPONLY One (AI-infused sales/lead CRM suite)
**Purpose:** Adapt the reference app's concept into a real-estate-focused CRM + Lead Management web application, self-hosted on the client's own domain.
**Prepared for:** AI-assisted build (Antigravity, Claude Sonnet 4.6)
**Stack:** React (frontend) · Node.js (backend) · Supabase (Postgres + Auth + Storage + Realtime)

---

## 1. Product Overview

### 1.1 What this is
A web-based CRM built specifically for real estate businesses (developers, brokerages, channel partner networks) to manage the full funnel: **lead capture → qualification → site visits → negotiation → booking → post-sale**. It replaces the "sales enterprise suite" idea from UPONLY One with a real-estate-specific version: leads become **prospective buyers/tenants**, inventory becomes **projects/units**, and "DSA onboarding" becomes **channel partner / broker onboarding**.

### 1.2 Who uses it
| Role | What they do in the system |
|---|---|
| **Super Admin** (agency/developer owner) | Full access — configures projects, users, integrations, sees all reports |
| **Sales Manager** | Manages a team, assigns/reassigns leads, views team pipeline & performance |
| **Sales Executive / Telecaller** | Works assigned leads, logs calls, schedules site visits, updates lead stage |
| **Channel Partner / Broker (external)** | Submits leads, tracks their own leads and commission, limited-scope login |
| **Site/Front Office Staff** | Logs walk-in leads, handles site-visit check-in |
| **Accounts/Finance** | Manages booking payments, invoices, commission payouts |

### 1.3 Why this exists (business goals — carried over from the reference app's stated purpose)
- Cut down manual lead entry and follow-up tracking (spreadsheets/registers)
- Reduce lead leakage — every inbound lead is captured and assigned automatically
- Give management real-time visibility into pipeline health and team performance
- Speed up the sales cycle with automation and reminders
- Make channel partner/broker management transparent (leads, status, commission)

---

## 2. Core Modules (Feature-by-Feature Detail)

### 2.1 Lead Management System (LMS)

**Purpose:** Centralize lead capture from every channel so nothing is entered manually or lost.

**Lead sources to support:**
- Web forms (project landing pages, "Enquire Now" / "Download Brochure" forms)
- Facebook/Instagram Lead Ads (via webhook or Meta Lead Ads API)
- Google Ads lead form extensions
- Property portals: 99acres, MagicBricks, Housing.com, NoBroker (via email-to-lead parsing or API where available)
- WhatsApp Business API inbound enquiries
- Inbound/missed calls (via telephony integration, click-to-call logs)
- Walk-ins (entered manually by front-office staff)
- Referrals (from existing clients or channel partners)
- Manual bulk upload (CSV/Excel import)

**Fields captured per lead:**
- Name, phone, email, alternate contact
- Source, sub-source (e.g., "Facebook — Project X Campaign")
- Project/property interested in, budget range, configuration (1BHK/2BHK/3BHK/Villa/Plot etc.)
- Location preference, purpose (self-use / investment / rental)
- Lead score (auto-calculated — see AI section)
- Assigned to (executive), assigned date
- Current stage, last activity date, next follow-up date
- Notes/remarks log (timestamped, multi-entry)
- Duplicate-lead flag (auto-detected by phone/email match)

**Lead lifecycle / pipeline stages (configurable, default set):**
1. New / Unassigned
2. Contacted
3. Qualified (budget & requirement confirmed)
4. Site Visit Scheduled
5. Site Visit Done
6. Negotiation
7. Booking (token received)
8. Sold / Closed Won
9. Lost / Dropped (with mandatory "lost reason" dropdown: budget mismatch, location mismatch, competitor, unresponsive, not genuine, etc.)
10. On Hold / Nurture (long-term, not ready to buy — auto re-engagement drip)

**Automation:**
- Auto-assignment rules: round-robin, by project, by territory/location, by lead source, or workload-balanced
- SLA timer: alert if a new lead isn't contacted within X hours (configurable, e.g. 30 min)
- Auto-reminders for scheduled follow-ups and site visits (push + SMS/WhatsApp/email)
- Auto lead-nurture sequences for "not ready yet" leads (drip WhatsApp/email content)
- Duplicate lead merging with source-of-truth priority rules

---

### 2.2 Sales CRM / Pipeline Management

**Purpose:** Give executives and managers a working view of every deal in motion.

**Features:**
- Kanban-style pipeline board (drag lead cards across stages) + list/table view toggle
- Filter/sort by project, executive, source, stage, priority, date range
- Task management: create follow-up tasks, call tasks, site-visit tasks tied to a lead
- Calendar view of all scheduled site visits, calls, and follow-ups (per executive and team-wide)
- Activity timeline per lead: every call, WhatsApp message, email, note, and stage change logged chronologically
- Lead scoring/prioritization: Hot / Warm / Cold tagging (manual + AI-assisted, see §2.6)
- Bulk actions: reassign leads, bulk status update, bulk export
- Notes & internal comments (with @mention to tag colleagues/manager)
- Lead reassignment history/audit trail

---

### 2.3 Property / Project Inventory Management

**Purpose:** Real estate–specific module absent in the generic reference app — this is what makes it a *real estate* CRM rather than a generic sales CRM.

**Features:**
- Project master: name, developer, location (with map pin), RERA number, launch date, possession date, amenities list, brochure/floor-plan uploads
- Unit/inventory master per project: tower/block, floor, unit number, configuration, carpet/built-up area, facing, price, status (Available / Held / Booked / Sold)
- Real-time inventory status visible to sales team (prevent double-selling)
- "Hold unit" workflow with auto-release timer (e.g., 24/48 hrs) if booking isn't confirmed
- Price list management with revision history
- Media library: images, floor plans, brochures, walkthrough videos, virtual tour links per project
- Link leads directly to specific units they're interested in / have booked

---

### 2.4 Channel Partner (Broker/DSA) Management

**Purpose:** Direct equivalent of "DSA onboarding" in the reference app, adapted for real estate brokers.

**Features:**
- Broker/channel partner self-registration or admin-invited onboarding
- KYC document upload (PAN, Aadhaar/ID, RERA broker registration if applicable) with approval workflow
- Broker-specific login with a restricted dashboard: submit leads, track their leads' status (without seeing other brokers' data), view commission ledger
- Commission structure setup per project/per broker (flat %, slab-based)
- Commission ledger: earned, pending, paid, with payout status
- Broker leaderboard (top performers by leads/conversions) — motivational/gamification element
- Broker communication: broadcast new project launches, price updates, offers

---

### 2.5 Client / Customer Management (post-lead conversion)

**Purpose:** Once a lead converts, they become a client with ongoing data needs (payments, documents, possession updates).

**Features:**
- Client profile: KYC documents, co-applicant details, booking details, unit linked
- Payment schedule tracker (construction-linked or milestone-based plans): due dates, amounts, paid/pending status
- Auto-generated payment reminder notifications
- Document vault: agreement copy, allotment letter, payment receipts, possession letter (upload/download, access-controlled)
- Post-sales support ticket log (complaints, queries, possession-related requests)
- Referral tracking — flag if a new lead was referred by an existing client (referral incentive tracking)

---

### 2.6 AI-Backed Insights (the "smart AI-infused" layer, adapted)

**Purpose:** Mirrors UPONLY One's "AI-backed insights" positioning — practical, not gimmicky.

**Concrete features to build (in order of feasibility):**
- **Lead scoring model**: rules/weighted-score engine initially (source quality, response time, budget-match, engagement level, number of interactions) → can evolve to an ML model later
- **Next-best-action suggestions**: e.g., "This lead hasn't been contacted in 3 days — call now" or "This lead matches Project X inventory — suggest site visit"
- **Auto-summarized lead notes**: LLM-generated 1-line summary of a lead's activity history for quick manager scanning
- **Smart duplicate/fraud detection**: flag suspicious duplicate submissions or bot form-fills
- **Conversational lead-qualification chatbot** (website widget / WhatsApp bot) to pre-qualify inbound enquiries before they reach a human (budget, configuration, timeline questions)
- **Predictive "likely to convert" tag** on each lead (v2 feature, needs historical data volume first)

---

### 2.7 Reporting & Analytics Dashboard

**Purpose:** The "unified view of sales performance" promise from the reference app, built out properly.

**Dashboards to include:**
- **Manager/Admin dashboard**: total leads, leads by stage (funnel chart), conversion rate, source-wise ROI, team leaderboard, average response time, revenue booked (this month/quarter)
- **Executive dashboard**: my leads, my tasks today, my conversion rate, my targets vs achieved
- **Source performance report**: cost-per-lead vs conversion by channel (if ad-spend data is fed in) — helps marketing decide where to spend
- **Project-wise report**: inventory sold vs available, revenue per project
- **Channel partner report**: leads submitted, converted, commission payable
- Exportable reports (CSV/PDF), scheduled email reports (daily/weekly digest to managers)

---

### 2.8 Communication & Notification Layer

**Purpose:** Keep leads warm and staff informed without manual effort.

**Channels to integrate:**
- **WhatsApp Business API** — template messages for lead acknowledgment, site-visit confirmation, payment reminders (highest priority for Indian real estate market)
- **SMS gateway** — fallback/OTP and basic alerts
- **Email** (transactional — booking confirmation, payment receipts, brochures)
- **Push notifications** (in-app/browser) — for internal staff: new lead assigned, follow-up due, SLA breach alert
- **Click-to-call telephony integration** (e.g., Exotel/Knowlarity/Ozonetel-style) — auto-log call duration, recording link, and outcome directly on the lead

---

### 2.9 Task & Calendar Management

- Personal + team task list (calls, follow-ups, site visits, document collection)
- Calendar sync (Google Calendar optional integration)
- Recurring task templates (e.g., auto-create "Day 1 follow-up," "Day 3 follow-up," "Day 7 follow-up" when a lead is created)
- Overdue task escalation to manager

---

### 2.10 User & Role Management (Admin Panel)

- Role-based access control (RBAC) — Super Admin, Manager, Executive, Channel Partner, Finance, Front Office (see §1.2)
- Team/hierarchy structure (executives report to managers; territory or project-based team grouping)
- User activity log/audit trail (who changed what, when — important for lead-reassignment disputes)
- Custom field builder — allow admin to add/remove lead fields without a code change (important for a real client project where requirements shift)
- Configurable pipeline stages and lost-reason list per organization

---

### 2.11 Attendance & Basic HR (optional module, borrowed from UPONLY's HRMS idea)

*Include only if the client wants field-sales attendance tracking — flag as optional/Phase 2.*
- Geo-tagged check-in/check-out for field executives (site-visit accompaniment proof)
- Leave application/approval
- Daily target vs achievement tracker per executive

---

## 3. Data Not Present in the Reference App — Filled In By Us

The UPONLY One store listings gave only marketing copy, not a real feature tree. The following were **not available from the source and have been designed from real-estate CRM industry standards** to make this a genuinely usable product:

- Full property/inventory management module (§2.3) — entirely additive, real-estate specific
- Client/post-sale management module (§2.5) — entirely additive
- Concrete lead scoring formula and automation rule logic (§2.6, §2.1 automation)
- Detailed pipeline stage list and lost-reason taxonomy (§2.1)
- Commission structure/ledger logic for channel partners (§2.4)
- Full reporting dashboard breakdown (§2.7)
- Notification channel architecture (§2.8)
- RBAC/role structure and audit trail (§2.10)
- Complete database schema (§5) and API structure (§6)

---

## 4. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Hosting** | Deployed on the client's own domain/subdomain (e.g., `crm.clientdomain.com`) |
| **Multi-tenancy** | Design as single-tenant for this client initially, but keep schema tenant-ready (an `org_id` on core tables) in case it's white-labeled for other real estate clients later |
| **Security** | Row-Level Security (RLS) in Supabase enforced per role/org; encrypted storage for KYC documents; audit logs |
| **Performance** | Lead list/pipeline views should handle 50,000+ leads without UI lag (pagination + indexed queries) |
| **Mobile responsiveness** | Fully responsive web app — field executives will use this on phones; PWA install-to-homescreen support is a strong plus |
| **Availability** | Target 99.5% uptime; Supabase + a standard Node hosting provider (Railway/Render/EC2) is sufficient at this scale |
| **Compliance** | RERA-related data handling; DPDP Act (India) compliance for personal data (KYC, phone, email) |

---

## 5. Suggested Database Schema (Supabase / Postgres)

Core tables (simplified — expand with FKs, indexes, RLS policies during build):

- `organizations` (id, name, domain, settings)
- `users` (id, org_id, name, email, phone, role, manager_id, status)
- `leads` (id, org_id, name, phone, email, source, sub_source, project_id, unit_interest_id, budget_min, budget_max, configuration, stage, lead_score, assigned_to, created_at, last_activity_at, next_followup_at, lost_reason)
- `lead_activities` (id, lead_id, user_id, type[call/whatsapp/email/note/stage_change], content, created_at)
- `projects` (id, org_id, name, developer_name, location, rera_number, launch_date, possession_date, amenities, brochure_url)
- `units` (id, project_id, tower, floor, unit_number, configuration, area_sqft, price, status)
- `channel_partners` (id, org_id, name, phone, email, kyc_status, commission_structure_id)
- `commission_ledger` (id, channel_partner_id, lead_id, amount, status[pending/paid], paid_at)
- `clients` (id, lead_id_origin, unit_id, kyc_docs, co_applicant_details)
- `payment_schedules` (id, client_id, milestone, due_date, amount, status)
- `tasks` (id, org_id, user_id, lead_id, type, due_date, status)
- `documents` (id, entity_type, entity_id, file_url, uploaded_by, uploaded_at)
- `notifications` (id, user_id, type, content, read_status, created_at)
- `audit_logs` (id, org_id, user_id, action, entity_type, entity_id, timestamp)

---

## 6. Tech Architecture Notes (React + Node + Supabase)

- **Frontend (React):** component-driven, role-based route guarding, Kanban board (e.g., `dnd-kit` or `react-beautiful-dnd`), charting via Recharts/Chart.js for dashboards, form builder for the custom-field feature
- **Backend (Node/Express or Nest):** handles business logic that shouldn't live in the client — lead auto-assignment engine, SLA timers/cron jobs, WhatsApp/SMS webhook receivers, third-party portal lead ingestion (email parsing or API polling), commission calculation
- **Supabase:**
  - **Auth:** email/password + OTP login for staff; separate restricted auth flow for channel partners
  - **Postgres:** primary data store, RLS policies per role/org
  - **Storage:** KYC docs, brochures, floor plans, agreements
  - **Realtime:** live pipeline board updates when a lead is reassigned/moved by another user
  - **Edge Functions:** lightweight webhook handlers (e.g., Meta Lead Ads webhook) if you want to keep them serverless instead of on the Node server
- **Third-party integrations to plan for:** Meta Lead Ads API, WhatsApp Business API (via a BSP like Gupshup/Interakt/Twilio), SMS gateway, telephony provider (Exotel/Knowlarity), email service (SendGrid/Postmark), payment gateway (if collecting token amounts online)

---

## 7. Suggested Build Roadmap

**Phase 1 (MVP):**
Lead capture (web form + manual + CSV import) → Pipeline/CRM board → Task/follow-up reminders → Basic reporting dashboard → RBAC (Admin/Manager/Executive) → Project & inventory master

**Phase 2:**
Channel partner module + commission ledger → WhatsApp/SMS integration → Client/post-sale module + payment tracking → Advanced analytics/source ROI

**Phase 3:**
AI lead scoring + next-best-action → Chatbot lead qualification → Portal API integrations (99acres/MagicBricks) → Attendance/HRMS-lite module → Predictive conversion scoring

---

*This document is structured so each numbered module (§2.1–2.11) can be handed to the AI build tool as an individual, self-contained feature brief if you prefer to build incrementally rather than all at once.*
