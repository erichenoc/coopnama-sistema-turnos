# AI Agent Copilot Feature

Sistema de asistencia inteligente para agentes de servicio al cliente en COOPNAMA.

## Descripcion General

El AI Agent Copilot es un sistema de asistencia en tiempo real que proporciona:

1. **Sugerencias contextuales** - Recomendaciones personalizadas para atender al cliente
2. **Historial del miembro** - Visualizacion rapida de interacciones previas
3. **Base de conocimiento** - Busqueda rapida de informacion relevante
4. **Prediccion de tiempos de espera** - Estimaciones basadas en datos historicos

## Archivos Creados

### 1. `src/lib/ai/wait-time-predictor.ts`
**Tipo:** Server Action ('use server')

**Funcion principal:**
```typescript
predictWaitTime(
  branchId: string,
  serviceId: string | null,
  currentQueueLength: number,
  activeAgents: number
): Promise<WaitTimePrediction>
```

**Que hace:**
- Consulta datos historicos de los ultimos 28 dias
- Filtra por dia de la semana y hora similar (+/- 2 horas)
- Calcula estimacion ponderada basada en:
  - Tiempo de espera promedio
  - Tiempo de servicio promedio
  - Cantidad de personas en cola
  - Numero de agentes activos
- Determina nivel de confianza (high/medium/low) segun cantidad de datos
- Genera explicacion en espanol (con IA si disponible)

**Niveles de confianza:**
- **High**: >= 10 turnos similares en historial
- **Medium**: >= 3 turnos similares
- **Low**: < 3 turnos similares

### 2. `src/features/agent-copilot/components/copilot-panel.tsx`
**Tipo:** Client Component ('use client')

**Props:**
```typescript
interface CopilotPanelProps {
  ticket: {
    id: string
    ticket_number: string
    customer_name: string | null
    status: string
    priority: number
    service_id: string
    notes?: string | null
    member_id?: string | null
    service?: { name: string } | null
  } | null
  notes: string
}
```

**Tabs:**

#### Tab 1: Sugerencia
- Se activa automaticamente cuando el turno esta en estado "serving"
- Llama al endpoint `/api/ai/copilot` para generar sugerencia
- Muestra en caja con gradiente azul
- Boton "Regenerar" para nueva sugerencia

#### Tab 2: Historial
- Muestra ultimos 5 turnos completados del miembro
- Informacion por visita:
  - Nombre del servicio
  - Fecha de atencion
  - Calificacion (estrellas)
  - Tiempo de espera
  - Tiempo de servicio
- Si no hay member_id: "No hay miembro asociado"

#### Tab 3: Info (Base de Conocimiento)
- Campo de busqueda
- Busca en tabla `knowledge_base` por titulo
- Resultados expandibles (click para ver contenido completo)
- Muestra categoria y titulo

**Estilo:**
- Diseno neumorfismo consistente con sistema
- Tabs con estado activo (bg-coopnama-primary)
- Componentes reutilizables de shared/components

### 3. `src/app/api/ai/copilot/route.ts`
**Tipo:** API Route (POST)

**Request body:**
```typescript
{
  serviceName: string
  customerName: string | null
  ticketNotes: string | null
  memberId: string | null
}
```

**Response:**
```typescript
{
  suggestion: string
}
```

**Proceso:**
1. Si hay `memberId`, consulta ultimos 3 turnos completados
2. Construye contexto con historial (servicio, rating, comentarios)
3. Usa modelo rapido de OpenRouter (Claude Haiku)
4. Genera sugerencia personalizada en espanol (2-3 oraciones)
5. Fallback gracioso si IA no disponible

## Uso

### Importar componente:
```typescript
import { CopilotPanel } from '@/features/agent-copilot/components'

// En tu componente:
<CopilotPanel
  ticket={currentTicket}
  notes={agentNotes}
/>
```

### Usar predictor de tiempos:
```typescript
import { predictWaitTime } from '@/lib/ai/wait-time-predictor'

const prediction = await predictWaitTime(
  branchId,
  serviceId,
  queueLength,
  activeAgents
)

console.log(`Tiempo estimado: ${prediction.estimatedMinutes} minutos`)
console.log(`Confianza: ${prediction.confidence}`)
console.log(`Explicacion: ${prediction.explanation}`)
```

## Dependencias

### Tablas de base de datos requeridas:
- `tickets` - Turnos completados con metricas de tiempo
- `services` - Informacion de servicios
- `knowledge_base` - Base de conocimiento organizacional

### Variables de entorno:
- `OPENROUTER_API_KEY` - Para funcionalidad de IA (opcional)
- `OPENROUTER_FAST_MODEL` - Modelo rapido (default: claude-haiku)

### Paquetes NPM:
- `ai` - Vercel AI SDK
- `@openrouter/ai-sdk-provider` - Proveedor OpenRouter
- `@supabase/ssr` - Cliente Supabase

## Caracteristicas Tecnicas

### Optimizaciones:
- **Lazy loading** - Datos se cargan solo cuando tab esta activo
- **Caching** - Resultados se mantienen entre cambios de tab
- **Fallbacks** - Siempre retorna respuesta util, incluso sin IA
- **Type-safe** - TypeScript estricto en todos los archivos

### Manejo de errores:
- Todos los fetch envueltos en try/catch
- Estados de loading claros
- Mensajes de error en espanol
- Fallbacks para casos sin datos

### Performance:
- Consultas limitadas (5 para historial, 3 para contexto)
- Indices en BD aprovechados
- Modelo rapido para sugerencias (Haiku)
- Streaming deshabilitado para respuestas cortas

## Proximos pasos sugeridos

1. **Metricas**: Agregar tracking de:
   - Uso de sugerencias por agente
   - Aceptacion/rechazo de recomendaciones
   - Busquedas mas frecuentes en knowledge base

2. **Mejoras IA**:
   - Aprendizaje de feedback (que sugerencias fueron utiles)
   - Personalizacion por tipo de servicio
   - Deteccion de sentimiento en tiempo real

3. **UX**:
   - Atajos de teclado para cambiar tabs
   - Notificaciones push para info critica
   - Modo oscuro

4. **Integraciones**:
   - Sincronizacion con CRM
   - Exportar historial a PDF
   - Compartir knowledge base entre sucursales

## Testing

```bash
# Type check
npm run typecheck

# Build
npm run build

# Dev server
npm run dev
```

## Autor

Sistema de Turnos COOPNAMA
Implementado siguiendo Clean Architecture y Feature-First patterns
