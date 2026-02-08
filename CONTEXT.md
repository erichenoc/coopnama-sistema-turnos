# COOPNAMA Sistema de Turnos - Contexto del Proyecto

> Este archivo mantiene el estado actual del proyecto para que cada sesion de IA
> pueda retomar exactamente donde se quedo. Actualizar despues de cada sesion importante.

**Ultima actualizacion**: 2026-02-07

## Estado General

**Proyecto**: Sistema inteligente de gestion de turnos para cooperativas (SaaS multi-tenant)
**Stack**: Next.js 16 + Supabase + Tailwind CSS + TypeScript
**Produccion**: https://coopnama-turnos.vercel.app
**Repo**: https://github.com/erichenoc/coopnama-sistema-turnos.git
**Vercel**: Git integration activa (auto-deploy on push)

## Plan Maestro

Ver `.claude/plans/wild-cooking-hedgehog.md` para el plan completo de 10 fases.

### Progreso de Fases

| Fase | Descripcion | Estado | Migracion |
|------|------------|--------|-----------|
| 1 | OpenRouter Migration | COMPLETADA | N/A |
| 2 | SLA + Priority Rules | Estructura creada | 009 |
| 3 | AI Copilot + Wait Time | Estructura creada | 010 |
| 4 | TV Signage + Virtual Queue | Estructura creada + TV responsive FIX | 011 |
| 5 | Chatbot + Sentiment + Transfer | Estructura creada | 012 |
| 6 | Forecasting + Analytics | Estructura creada | 013 |
| 7 | Routing + Portal | Estructura creada | 014 |
| 8 | Onboarding + Gamificacion | Estructura creada | 015 |
| 9 | Offline + API v2 | Estructura creada | 016 |
| 10 | i18n + Compliance | Estructura creada | 017 |

**NOTA IMPORTANTE**: Las 10 fases tienen estructura basica (migraciones SQL, componentes, servicios),
pero la mayoria necesita **integracion real** - conectar los componentes con datos reales,
probar flujos end-to-end, y pulir la UX. La Fase 1 (OpenRouter) es prerequisito para las features de IA.

## Base de Datos

### Migraciones aplicadas (17 archivos)
```
001_base_tables.sql        - organizations, branches, services, stations
002_users_members.sql      - users (8 roles), members, member_services
003_tickets.sql            - tickets, ticket_history, daily_counter, feedback
004_functions.sql          - generate_ticket(), call_next_ticket(), complete_ticket()
005_rls_policies.sql       - Row Level Security completa
006_notifications_appointments.sql - notifications, appointments, sms_logs
007_add_integration_config.sql - integration_configs JSONB
008_org_daily_stats.sql    - org_daily_stats vista materializada
009_sla_priority_rules.sql - sla_configs, priority_rules, sla_breaches
010_knowledge_base.sql     - knowledge_base
011_tv_signage.sql         - signage_content
012_transfer_enhancements.sql - journey_step, original_ticket_id en tickets
013_forecasting_cache.sql  - demand_forecasts
014_intelligent_routing.sql - agent_skills, routing_configs
015_gamification.sql       - agent_achievements
016_webhooks.sql           - webhook_subscriptions
017_audit_compliance.sql   - audit_log, data_retention_policies
```

## Paginas Implementadas

### Admin (requiere auth) - /app/(main)/
- dashboard, queue, services, branches, stations, members
- agents (workstation), history, reports, appointments, holidays
- settings, sentiment, forecasting, leaderboard, audit

### Publicas - /app/(public)/
- tv (display para pantallas), kiosk (auto-servicio), mi-turno (tracking)
- join (cola virtual QR), portal (historial cliente), booking (citas)

### Auth - /app/(auth)/
- login, signup, reset-password

### API Routes (28 endpoints)
- /api/tickets/*, /api/appointments/*, /api/ai/*, /api/audio/*
- /api/cron/* (4 cron jobs), /api/webhooks/* (whatsapp, stripe)
- /api/v1/* (API publica), /api/v2/tickets, /api/reports/data
- /api/settings/integrations, /api/push/subscribe

## Features por Directorio

```
src/features/
  auth/          - Login, signup, MFA (componentes + hooks + actions)
  queue/         - Ticket service, branch service, realtime, kiosk/TV display
  feedback/      - Modal de feedback post-servicio
  branding/      - Logo uploader, color picker (white-label)
  reports/       - Agent performance, heatmap, PDF/CSV/Excel export
  appointments/  - Recurrence selector
  ai/            - Anomaly alerts
  billing/       - Subscription banner, pricing cards, Stripe actions
  white-label/   - CSS editor, domain manager
  i18n/          - Language switcher
  api/           - API key manager
  integrations/  - Integration actions
  sla/           - SLA service, monitor, alerts, config panel
  priority-rules/ - Priority calculator, rules manager
  agent-copilot/ - Copilot panel (IA en estacion agente)
  tv-signage/    - Promo carousel, signage content manager
  sentiment/     - Sentiment service
  forecasting/   - Demand forecaster
  routing/       - Routing engine (skill-based)
  onboarding/    - Onboarding wizard
  gamification/  - Metrics service, leaderboard
  offline/       - Online status hook, offline banner
  compliance/    - Audit log service
```

## Decisiones Tecnicas Clave

1. **Multi-tenant via RLS**: Todas las tablas usan organization_id con Row Level Security
2. **Realtime**: Supabase Postgres Changes para cola en tiempo real
3. **Ticket numbering**: Contador diario atomico por branch (RPC generate_ticket)
4. **8 roles**: super_admin, org_admin, branch_manager, supervisor, agent, receptionist, kiosk, viewer
5. **AI**: Vercel AI SDK v6 + OpenRouter (migracion completada). Provider centralizado en src/lib/ai/provider.ts
6. **TTS**: Inworld AI para anuncios de voz
7. **TV Display**: position:fixed con inline styles + body override para fullscreen garantizado
8. **QR Code**: 3 tamanios responsivos (40/56/72px) con shrink-0 pinned al bottom del sidebar

## Bugs Conocidos / Pendientes

- [ ] TV display: el usuario reporto area gris debajo en su pantalla - se aplico fix con inline styles + body override, pendiente verificar
- [ ] Cron SLA monitor: ajustado a daily para Vercel Hobby plan (no soporta < 1 dia)
- [ ] AI features requieren OPENROUTER_API_KEY configurada (en Settings > Integraciones o env var)

## Env Vars Requeridas

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY= (opcional, para features IA via OpenRouter)
INWORLD_API_KEY= (opcional, para TTS)
STRIPE_SECRET_KEY= (opcional, para billing)
TWILIO_ACCOUNT_SID= (opcional, para SMS)
VAPID_PUBLIC_KEY= (opcional, para push)
```

## Comandos Utiles

```bash
npm run dev          # Dev server (auto-port 3000-3006)
npm run build        # Build produccion
npx vercel --prod    # Deploy manual a Vercel
git push origin main # Auto-deploy via Git integration
```

## Instrucciones para Proxima Sesion

1. Leer este archivo primero
2. Revisar el plan maestro en `.claude/plans/wild-cooking-hedgehog.md`
3. Verificar git log para ver ultimos cambios
4. Continuar con la fase/tarea pendiente
