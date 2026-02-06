# 🚀 COOPNAMA TURNOS AI - MASTER PROMPT FOR CLAUDE CODE

## Project: COOPNAMA Turnos AI - Intelligent Queue Management SaaS

---

## 📁 Reference Documentation

This project has 3 essential documentation files that you MUST read and follow throughout development:

### 1. `COOPNAMA_TURNOS_PROMPT.md`
**Purpose:** Complete technical specifications
**Contains:**
- Full database schema (PostgreSQL/Supabase) with all tables
- Row Level Security (RLS) policies for multi-tenant isolation
- API endpoints structure
- AI prompts for WhatsApp agent, sentiment analysis, co-pilot
- n8n workflow configurations
- Environment variables
- Development phases with timelines

### 2. `COOPNAMA_TURNOS_STRUCTURE.md`
**Purpose:** Architecture and visual reference
**Contains:**
- System architecture diagrams (ASCII)
- Multi-tenant data flow
- Database tables map and relationships
- App routes structure
- User roles and permissions matrix
- Ticket status flow diagram
- AI features architecture
- WhatsApp conversation flow examples
- Components structure
- Pricing tiers
- Development timeline
- External integrations map
- KPIs to track

### 3. `LIQUID_GLASS_DESIGN_GUIDE.md` (Optional - if provided)
**Purpose:** Design system for premium UI
**Contains:**
- CSS implementation for glass effects
- Tailwind configuration
- Component styling guidelines
- Responsive design rules

---

## 🎯 Development Strategy

### APPROACH: Module-by-Module Sequential Development

Unlike a UI-first approach, this project requires **functional modules** to be built sequentially because:
1. Real-time queue updates are critical
2. WhatsApp integration requires working backend
3. AI features depend on data from the queue system

### Development Order:

```
PHASE 1: Foundation & Core Setup
    ↓
PHASE 2: Queue Core (Tickets, Stations, Real-time)
    ↓
PHASE 3: Member Management
    ↓
PHASE 4: Agent Workstation
    ↓
PHASE 5: Display Views (TV, Kiosk)
    ↓
PHASE 6: WhatsApp Integration (n8n + AI)
    ↓
PHASE 7: AI Features (Sentiment, Co-pilot, Predictions)
    ↓
PHASE 8: Analytics & Reports
    ↓
PHASE 9: Polish & Deploy
```

---

## 📋 PHASE 1: Foundation & Core Setup

### Step 1.1: Project Initialization

```
Read COOPNAMA_TURNOS_PROMPT.md and COOPNAMA_TURNOS_STRUCTURE.md first.

Create a Next.js 14 project with:
- TypeScript
- App Router
- Tailwind CSS
- ESLint

Install these dependencies:
- @supabase/supabase-js @supabase/ssr (database & auth)
- @anthropic-ai/sdk (AI features)
- zustand (state management)
- react-hook-form @hookform/resolvers zod (forms)
- @tanstack/react-table (data tables)
- date-fns (date handling)
- recharts (charts)
- framer-motion (animations)
- lucide-react (icons)
- sonner (toasts)
- class-variance-authority clsx tailwind-merge (styling utilities)

Initialize shadcn/ui and add these components:
button, card, input, label, select, textarea, badge, avatar,
dialog, sheet, dropdown-menu, tabs, table, form, toast, 
calendar, popover, command, separator, scroll-area, skeleton, switch

Create the folder structure as defined in COOPNAMA_TURNOS_STRUCTURE.md
```

### Step 1.2: Supabase Setup

```
Create Supabase configuration files:
- /lib/supabase/client.ts (browser client)
- /lib/supabase/server.ts (server client with cookies)
- /lib/supabase/admin.ts (service role for admin operations)

Run all database migrations from COOPNAMA_TURNOS_PROMPT.md:
- Core tables (organizations, branches, services, stations)
- Queue tables (tickets, ticket_history, daily_counters)
- User tables (users, members)
- AI tables (whatsapp_sessions, ai_conversations, notifications)
- Analytics tables (daily_metrics, announcements, holidays)
- All indexes
- All RLS policies
- All functions and triggers
```

### Step 1.3: Authentication

```
Implement Supabase Auth with:
- Email/password login
- Password reset flow
- Session management with middleware
- Protected routes based on user role
- Organization context from user profile

Create auth pages:
- /app/(auth)/login/page.tsx
- /app/(auth)/register/page.tsx (admin invite only)
- /app/(auth)/forgot-password/page.tsx
```

### Step 1.4: Dashboard Layout

```
Create the main dashboard layout:
- /app/(dashboard)/layout.tsx
- Responsive sidebar with navigation
- Header with user menu and notifications
- Branch selector (for multi-branch orgs)
- Real-time connection indicator

Navigation items based on role:
- Dashboard (overview)
- Queue Management
- Tickets
- Members
- Staff
- Reports
- Settings
```

---

## 📋 PHASE 2: Queue Core System

### Step 2.1: Services & Stations Management

```
Create CRUD for services:
- /app/(dashboard)/[orgSlug]/settings/services/page.tsx
- Service list with categories
- Create/edit service form
- Enable/disable per branch

Create stations management:
- /app/(dashboard)/[orgSlug]/branches/[branchId]/stations/page.tsx
- Station list with current status
- Assign services to stations
- Station configuration
```

### Step 2.2: Ticket System

```
Create ticket operations:
- /lib/actions/tickets.ts (server actions)
  - createTicket() with auto-numbering (A-001, B-001)
  - callNextTicket() 
  - startService()
  - completeTicket()
  - transferTicket()
  - cancelTicket()

Create ticket number generator function as defined in COOPNAMA_TURNOS_PROMPT.md

Implement ticket form:
- /components/tickets/ticket-form.tsx
- Service selection
- Member lookup (optional)
- Priority selection
- Scheduled time (optional)
```

### Step 2.3: Real-time Queue

```
Implement Supabase Realtime subscriptions:
- /hooks/use-queue.ts
- Subscribe to tickets table changes for branch
- Subscribe to stations table for agent assignments
- Auto-reconnect on connection loss

Create queue display:
- /components/queue/queue-list.tsx
- Real-time ticket list grouped by service
- Priority indicators
- Wait time estimates
- Current position
```

---

## 📋 PHASE 3: Member Management

```
Create member CRUD:
- /app/(dashboard)/[orgSlug]/members/page.tsx
- Member search (by cedula, code, name, phone)
- Member profile with visit history
- Priority level assignment
- Notes and tags

Member lookup component:
- /components/members/member-search.tsx
- Quick search for ticket creation
- Auto-fill member info
```

---

## 📋 PHASE 4: Agent Workstation

```
Create agent workstation view:
- /app/(agent)/[orgSlug]/station/[stationId]/page.tsx

Include:
- Current ticket being served
- "Call Next" button (prominent)
- Queue preview (next 5 tickets)
- Customer info panel (when serving)
- Quick actions (transfer, hold, complete)
- Service timer
- AI suggestions panel (co-pilot placeholder)

Implement station session:
- /hooks/use-agent-session.ts
- Track agent login/logout
- Track tickets served
- Track service times
```

---

## 📋 PHASE 5: Display Views

### Step 5.1: TV Queue Display

```
Create TV display:
- /app/(display)/[orgSlug]/[branchId]/tv/page.tsx

Features:
- Full-screen, no navigation
- Auto-refresh
- Large ticket numbers
- "Now Serving" section with station
- "Waiting" queue list
- Estimated wait times
- Announcements banner
- ElevenLabs voice announcements (with Web Speech fallback)

Implement ElevenLabs integration:
- /lib/audio/elevenlabs.ts
- /app/api/audio/generate/route.ts
- Audio caching in Supabase Storage
- Pre-generate common ticket numbers on deploy
- Fallback to Web Speech API if ElevenLabs fails
```

### Step 5.2: Kiosk Interface

```
Create kiosk mode:
- /app/(kiosk)/[orgSlug]/[branchId]/kiosk/page.tsx

Features:
- Full-screen touch interface
- Large buttons for service selection
- Member identification (cedula or "anonymous")
- Ticket confirmation screen
- Thermal printer integration (ESC/POS via WebUSB)
- QR code on printed ticket linking to status page
- Browser print fallback
- Auto-reset after inactivity
- Offline capability (queue locally, sync when online)

Implement thermal printing:
- /lib/printing/thermal-printer.ts
- /components/tickets/ticket-print-preview.tsx
- Support Epson, Star, Bixolon printers
- 80mm paper width
```

### Step 5.3: Public Ticket Status

```
Create public ticket tracker:
- /app/(member)/mi-turno/page.tsx
- Enter ticket number to check status
- Show position in queue
- Estimated wait time
- Real-time updates
```

---

## 📋 PHASE 6: WhatsApp Integration

### Step 6.1: Webhook Endpoint

```
Create webhook for n8n:
- /app/api/webhooks/whatsapp/route.ts
- Verify webhook signature
- Parse incoming messages
- Return appropriate response

Create WhatsApp session management:
- /lib/whatsapp/sessions.ts
- Track conversation state
- Store in whatsapp_sessions table
```

### Step 6.2: Claude AI Conversational Agent

```
Implement AI chat handler:
- /app/api/ai/chat/route.ts
- Use system prompt from COOPNAMA_TURNOS_PROMPT.md
- Stream responses
- Parse action intents (create_ticket, check_status, etc.)

Create WhatsApp message templates:
- /lib/whatsapp/templates.ts
- ticket_created
- ticket_called
- almost_your_turn
- feedback_request
```

### Step 6.3: n8n Workflow Configuration

```
Document n8n workflows needed:
1. WhatsApp Message Handler
   - Trigger: Webhook from WhatsApp
   - Call Claude API
   - Execute actions (create ticket, etc.)
   - Send response

2. Ticket Called Notification
   - Trigger: Supabase webhook on ticket status = 'called'
   - Get member phone
   - Send WhatsApp notification

3. Almost Turn Notification
   - Trigger: Every minute check
   - Find tickets with position = 2
   - Send reminder

4. Scheduled Ticket Reminder
   - Trigger: Cron every 5 min
   - Find tickets scheduled for 30 min from now
   - Send reminder
```

---

## 📋 PHASE 7: AI Features

### Step 7.1: Sentiment Analysis

```
Implement sentiment analysis:
- /app/api/ai/analyze-sentiment/route.ts
- Analyze WhatsApp messages
- Analyze feedback comments
- Store sentiment scores

Create sentiment badge:
- /components/ai/sentiment-badge.tsx
- Visual indicator (😊 😐 😠)
```

### Step 7.2: Agent Co-pilot

```
Implement co-pilot:
- /app/api/ai/copilot/route.ts
- Generate customer summary
- Suggest cross-sell opportunities
- Provide conversation scripts

Create co-pilot panel:
- /components/ai/ai-suggestions.tsx
- Display in agent workstation
- Real-time suggestions when serving
```

### Step 7.3: Predictive Analytics

```
Implement predictions:
- /lib/ai/predictions.ts
- Wait time estimation (use SQL function from COOPNAMA_TURNOS_PROMPT.md)
- Peak hour prediction
- Staffing recommendations

Create prediction displays:
- /components/ai/prediction-card.tsx
- Show in dashboard and queue views
```

---

## 📋 PHASE 8: Analytics & Reports

```
Create reports section:
- /app/(dashboard)/[orgSlug]/reports/page.tsx

Implement:
- Daily metrics aggregation (cron job)
- Real-time dashboard with charts
- Agent performance reports
- Service metrics
- Channel distribution
- Export to CSV/PDF

Charts to include:
- Tickets over time (line)
- Wait time trends (area)
- Service distribution (pie)
- Peak hours heatmap
- Agent comparison (bar)
```

---

## 📋 PHASE 9: Polish & Deploy

```
Final tasks:
- UI/UX refinements
- Loading states everywhere
- Error boundaries
- Empty states
- Responsive testing (mobile, tablet, TV)
- Performance optimization
- Security review (RLS, auth)
- Documentation
- Vercel deployment
- Environment variables setup
```

---

## 🔧 Key Implementation Notes

### 1. Real-time is CRITICAL
```
Use Supabase Realtime for:
- Queue updates (tickets table)
- Station status (stations table)
- Announcements

Always handle reconnection gracefully.
```

### 2. Multi-tenant Isolation
```
EVERY query must be scoped by organization_id.
RLS policies enforce this at database level.
Always test with multiple organizations.
```

### 3. Offline Support for Kiosk
```
Kiosk should work with intermittent internet:
- Queue tickets locally
- Sync when connection restored
- Show offline indicator
```

### 4. Voice Announcements (ElevenLabs)
```
Primary: ElevenLabs TTS
- Voice ID: VALENTINA (female, warm, Latina)
- Or custom cloned COOPNAMA voice
- Pre-generate common numbers (A-001 to A-100)
- Cache all audio in Supabase Storage
- Format: "Turno A cuarenta y siete, ventanilla tres"

Fallback: Web Speech API
- Used when ElevenLabs fails
- Less natural but works offline
- Spanish (es-DO) voice preferred

Cost: ~$5-22/month with ElevenLabs
```

### 5. Thermal Printing
```
Supported printers (ESC/POS):
- Epson TM-T88 series
- Star TSP100 series  
- Bixolon SRP-350

Connection: WebUSB API (Chrome/Edge)
Paper: 80mm width standard
Features: QR code, large ticket number

Fallback: Browser window.print()
```

### 6. WhatsApp Rate Limits
```
Meta has rate limits:
- Implement message queuing
- Exponential backoff on errors
- Track delivery status
```

### 7. AI Cost Management
```
Claude API costs money:
- Cache common responses
- Use smaller context where possible
- Track API usage per organization

ElevenLabs:
- Pre-generate common announcements
- Cache aggressively (30 day retention)
```

### 8. Dominican Republic Specifics
```
- Timezone: America/Santo_Domingo (AST, UTC-4)
- Language: Spanish (es-DO)
- Currency: RD$ (Dominican Peso)
- ID: Cédula (11 digits, format: XXX-XXXXXXX-X)
```

### 9. Scheduled Appointments
```
Members can book appointments in advance:
- Via WhatsApp conversation
- Via web booking page
- Priority queue on arrival
- 24h and 1h reminders via WhatsApp

Tables: appointment_slots, appointments
Function: get_available_slots()
```

---

## 🚀 How to Start

### Initial Command for Claude Code:

```
Read the following documentation files in this order:

1. COOPNAMA_TURNOS_STRUCTURE.md - Architecture overview
2. COOPNAMA_TURNOS_PROMPT.md - Full technical specifications

Then start with PHASE 1, Step 1.1: Project Initialization

Create the Next.js 14 project with all dependencies and folder structure.
Show me each file as you create it.

After project setup, continue with Step 1.2: Supabase Setup.
Run all the database migrations from the prompt file.
```

### Subsequent Commands:

```
Continue with Phase 1, Step 1.3: Authentication
Implement Supabase Auth with all the auth pages.
```

```
Continue with Phase 2: Queue Core System
Start with services and stations management.
```

(Continue phase by phase...)

---

## ✅ Completion Checklist

### Phase 1: Foundation
- [ ] Next.js 14 project initialized
- [ ] All dependencies installed
- [ ] Folder structure created
- [ ] Supabase configured
- [ ] All migrations run
- [ ] RLS policies applied
- [ ] Authentication working
- [ ] Dashboard layout complete

### Phase 2: Queue Core
- [ ] Services CRUD
- [ ] Stations management
- [ ] Ticket creation with auto-numbering
- [ ] Call next ticket
- [ ] Transfer ticket
- [ ] Cancel ticket
- [ ] Real-time queue updates

### Phase 3: Members
- [ ] Member CRUD
- [ ] Member search
- [ ] Visit history
- [ ] Priority levels

### Phase 4: Agent Workstation
- [ ] Agent station view
- [ ] Call next button
- [ ] Service timer
- [ ] Quick actions
- [ ] Customer info panel

### Phase 5: Displays
- [ ] TV queue display
- [ ] ElevenLabs TTS integration
- [ ] Audio caching system
- [ ] Web Speech API fallback
- [ ] Pre-generate common announcements
- [ ] Kiosk interface
- [ ] Thermal printer integration (ESC/POS)
- [ ] QR code on tickets
- [ ] Browser print fallback
- [ ] Public ticket tracker

### Phase 6: WhatsApp
- [ ] Webhook endpoint
- [ ] AI conversational agent
- [ ] n8n workflows documented
- [ ] Notifications working
- [ ] Scheduled appointments flow
- [ ] Appointment reminders (24h, 1h)

### Phase 7: AI Features
- [ ] Sentiment analysis
- [ ] Agent co-pilot
- [ ] Wait time predictions

### Phase 8: Analytics
- [ ] Daily metrics aggregation
- [ ] Dashboard charts
- [ ] Agent reports
- [ ] Export functionality

### Phase 9: Polish
- [ ] Responsive design
- [ ] Loading states
- [ ] Error handling
- [ ] Audit logging system
- [ ] Documentation
- [ ] Deployed to Vercel

---

**Document Version:** 1.0  
**Created:** January 2026  
**Author:** HENOC Marketing AI Automation  
**Client:** COOPNAMA - Dominican Republic

---

*This master prompt provides complete context for Claude Code to build the COOPNAMA Turnos AI platform module by module.*