# COOPNAMA Sistema de Turnos - Supabase Backend

## Estructura de Migraciones

```
supabase/
├── migrations/
│   ├── 001_base_tables.sql      # Tablas: organizations, branches, services, stations
│   ├── 002_users_members.sql    # Tablas: members, users, user_services
│   ├── 003_tickets.sql          # Tablas: tickets, ticket_history, daily_counters, agent_sessions
│   ├── 004_functions.sql        # Funciones: create_ticket, call_next_ticket, etc.
│   └── 005_rls_policies.sql     # Políticas de seguridad RLS
├── seed.sql                     # Datos iniciales (COOPNAMA, servicios, ventanillas)
└── README.md                    # Este archivo
```

## Cómo Aplicar las Migraciones

### Opción 1: Desde el Dashboard de Supabase (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **SQL Editor**
3. Copia y pega el contenido de cada archivo de migración **en orden**:
   - `001_base_tables.sql`
   - `002_users_members.sql`
   - `003_tickets.sql`
   - `004_functions.sql`
   - `005_rls_policies.sql`
4. Ejecuta cada uno con **Run**
5. Finalmente, ejecuta `seed.sql` para cargar los datos iniciales

### Opción 2: Usando Supabase CLI

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Vincular con tu proyecto
supabase link --project-ref <tu-project-ref>

# Aplicar migraciones
supabase db push

# Ejecutar seed (opcional)
supabase db execute --file supabase/seed.sql
```

### Opción 3: Script combinado

Puedes combinar todos los archivos SQL en uno solo y ejecutarlo:

```bash
cat supabase/migrations/*.sql supabase/seed.sql > supabase/full_migration.sql
```

Luego ejecuta `full_migration.sql` en el SQL Editor.

## Verificación

Después de aplicar las migraciones, verifica:

1. **Tablas creadas:**
   - `organizations`, `branches`, `services`, `stations`
   - `branch_services`, `station_services`
   - `members`, `users`, `user_services`
   - `tickets`, `ticket_history`, `daily_counters`, `agent_sessions`

2. **Funciones creadas:**
   - `generate_ticket_number(branch_id, service_id)`
   - `create_ticket(...)`
   - `call_next_ticket(station_id, agent_id)`
   - `start_serving_ticket(ticket_id, agent_id)`
   - `complete_ticket(ticket_id, agent_id, notes)`
   - `mark_ticket_no_show(ticket_id, agent_id)`
   - `get_daily_stats(branch_id, date)`
   - `get_active_queue(branch_id)`

3. **RLS habilitado** en todas las tablas

4. **Realtime habilitado** en `tickets` y `agent_sessions`

## Datos Semilla

El archivo `seed.sql` crea:

- **Organización:** COOPNAMA
- **Sucursal:** Santo Domingo Este
- **Servicios:**
  - A: Préstamos (~15 min)
  - B: Caja (~8 min)
  - C: Ahorros (~12 min)
  - D: Atención General (~10 min)
- **Ventanillas:** 4 ventanillas (1-3 general, 4 preferencial)
- **Miembros de ejemplo:** 5 socios con diferentes prioridades
- **Tickets de ejemplo:** 5 tickets en espera (opcional)

## Variables de Entorno

Asegúrate de tener configurado `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

## Solución de Problemas

### Error: "function auth.uid() does not exist"
Las políticas RLS usan `auth.uid()`. Asegúrate de ejecutar las migraciones en orden.

### Error: "relation already exists"
Las migraciones usan `CREATE TABLE IF NOT EXISTS`. Si falla, probablemente hay conflictos. Puedes eliminar las tablas existentes primero (¡cuidado con los datos!).

### RLS bloquea consultas
Para desarrollo, puedes desactivar RLS temporalmente:
```sql
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
```

Recuerda volver a habilitarlo para producción.
