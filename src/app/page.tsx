import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'

const LOGO_URL = 'https://res.cloudinary.com/dbftvu8ab/image/upload/v1770567396/COOPNAMA-ISOLOGO-scaled-e1759506874509-1024x1018_aoobai.png'

export const metadata: Metadata = {
  title: 'COOPNAMA Turnos - Sistema Inteligente de Gestion de Turnos',
  description: 'Sistema inteligente de gestion de turnos para cooperativas e instituciones financieras. IA integrada, cola virtual, WhatsApp, citas programadas y mas.',
}

const IMPACT_STATS = [
  { value: '80%', label: 'Reduccion en tiempos de espera' },
  { value: '30%', label: 'Mas clientes atendidos por dia' },
  { value: '10s', label: 'Para obtener un turno' },
  { value: '99.9%', label: 'Disponibilidad del sistema' },
]

const CHANNELS = [
  {
    title: 'Kiosko Tactil',
    description: 'Auto-servicio 24/7 con busqueda por cedula, prioridad automatica para VIP e impresion de recibo termica.',
    gradient: 'from-[#009e59] to-[#00c96f]',
    icon: 'kiosk',
  },
  {
    title: 'QR desde Celular',
    description: 'Cola virtual sin tocar el kiosko. El cliente puede hacer fila desde su casa escaneando un QR.',
    gradient: 'from-emerald-600 to-emerald-800',
    icon: 'qr',
  },
  {
    title: 'WhatsApp IA',
    description: 'Chatbot inteligente que emite turnos, consulta estados y cancela citas con lenguaje natural.',
    gradient: 'from-green-600 to-green-700',
    icon: 'whatsapp',
  },
  {
    title: 'API Abierta',
    description: 'Integra con CRM, app movil o cualquier sistema externo. Documentada con autenticacion y rate limiting.',
    gradient: 'from-violet-600 to-violet-800',
    icon: 'api',
  },
]

const FEATURES = [
  {
    number: '01',
    title: 'Cola Inteligente con Prioridades',
    description: 'Asignacion automatica de prioridad para socios VIP, personas mayores y embarazadas. Transferencias entre servicios sin perder el lugar en la fila.',
    gradient: 'from-[#009e59] to-[#00c96f]',
  },
  {
    number: '02',
    title: 'Copiloto IA V2 para Agentes',
    description: '4 paneles especializados: chat IA streaming, perfil 360 del socio con sentimiento, base de conocimiento auto-contextual, y acciones automatizadas.',
    gradient: 'from-emerald-600 to-emerald-800',
  },
  {
    number: '03',
    title: 'Anuncios de Voz con IA',
    description: '66 voces profesionales incluyendo voces clonadas personalizadas. Audio a 48kHz con cola de anuncios inteligente y fallback automatico.',
    gradient: 'from-amber-500 to-amber-700',
  },
  {
    number: '04',
    title: 'Citas Programadas Online',
    description: 'Reserva en 6 pasos simples. Citas recurrentes (semanal/quincenal/mensual), recordatorios automaticos y check-in al llegar.',
    gradient: 'from-rose-500 to-rose-700',
  },
  {
    number: '05',
    title: 'Seguimiento Mi Turno en Vivo',
    description: 'Barra de progreso visual, posicion en la fila, tiempo estimado y notificaciones push cuando es tu turno. WebSocket en tiempo real.',
    gradient: 'from-cyan-500 to-cyan-700',
  },
  {
    number: '06',
    title: 'Pantalla TV / Digital Signage',
    description: 'Display en tiempo real con animaciones, carousel de contenido promocional, QR integrado y reloj en espanol dominicano.',
    gradient: 'from-indigo-500 to-indigo-700',
  },
]

const AI_CAPABILITIES = [
  {
    title: 'Copiloto IA V2',
    description: 'Chat streaming con contexto del turno, resumen automatico post-servicio, recomendacion de transferencia y dictado por voz.',
  },
  {
    title: 'Analisis de Sentimiento',
    description: 'Clasifica feedback automaticamente. Dashboard con tendencias por agente, servicio y periodo (7/30/90 dias).',
  },
  {
    title: 'Prediccion de Demanda',
    description: 'Predice clientes por hora basado en 4 semanas de historial. Recomienda cantidad de agentes optima por turno.',
  },
  {
    title: 'Deteccion de Anomalias',
    description: 'Alertas en 3 niveles: espera excesiva, alta tasa de no-shows, CSAT baja y picos de trafico inusuales.',
  },
]

const ROLE_BENEFITS = [
  {
    role: 'Para la Gerencia',
    gradient: 'from-[#009e59] to-[#00c96f]',
    benefits: [
      'Visibilidad total de operaciones en tiempo real',
      'Prediccion de demanda para planificacion de personal',
      'Comparacion de rendimiento entre sucursales',
      'Reportes exportables en CSV y PDF',
      'Alertas proactivas de anomalias y SLA',
    ],
  },
  {
    role: 'Para los Agentes',
    gradient: 'from-emerald-600 to-emerald-800',
    benefits: [
      'Copiloto IA con 4 paneles especializados',
      'Dictado por voz en espanol dominicano',
      'Gamificacion: logros, leaderboard, metricas en vivo',
      'Modo entrenamiento para agentes nuevos',
      'Tareas de seguimiento post-servicio',
    ],
  },
  {
    role: 'Para los Clientes',
    gradient: 'from-amber-500 to-amber-700',
    benefits: [
      'Cero filas fisicas: turno desde el celular',
      'Sabe cuanto esperar antes de decidir',
      'Notificaciones Push, SMS y WhatsApp',
      'Citas programadas: llegar a hora exacta',
      'Portal de auto-servicio con historial de visitas',
    ],
  },
]

const DIFFERENTIATORS = [
  { feature: 'Copiloto IA con 4 paneles', us: true, them: false },
  { feature: 'Cola virtual desde celular', us: true, them: 'Parcial' },
  { feature: 'Chatbot WhatsApp con IA', us: true, them: false },
  { feature: 'Voces clonadas personalizadas', us: true, them: false },
  { feature: 'Gamificacion de agentes', us: true, them: false },
  { feature: 'Prediccion de demanda con IA', us: true, them: false },
  { feature: 'White-label multi-tenant', us: true, them: false },
  { feature: 'Routing por habilidades', us: true, them: 'Basico' },
  { feature: 'Monitor de SLA con alertas', us: true, them: false },
  { feature: 'Analisis de sentimiento', us: true, them: false },
]

const STEPS = [
  {
    step: '1',
    title: 'El socio toma su turno',
    description: 'Desde el kiosko tactil, QR, WhatsApp o la web. Selecciona el servicio y recibe su numero al instante.',
  },
  {
    step: '2',
    title: 'La IA optimiza la cola',
    description: 'El sistema distribuye turnos entre estaciones, prioriza socios preferenciales y balancea la carga de agentes.',
  },
  {
    step: '3',
    title: 'El agente atiende con IA',
    description: 'El copiloto muestra perfil 360, sugiere procedimientos, genera resumenes y recomienda acciones automaticamente.',
  },
]

function ChannelIcon({ type }: { type: string }) {
  switch (type) {
    case 'kiosk':
      return (
        <div className="w-6 h-8 rounded-sm border-2 border-current" />
      )
    case 'qr':
      return (
        <div className="w-7 h-7 grid grid-cols-3 grid-rows-3 gap-0.5">
          <div className="bg-current rounded-[1px]" />
          <div className="bg-current rounded-[1px]" />
          <div className="bg-current rounded-[1px]" />
          <div className="bg-current rounded-[1px]" />
          <div className="rounded-[1px]" />
          <div className="bg-current rounded-[1px]" />
          <div className="bg-current rounded-[1px]" />
          <div className="bg-current rounded-[1px]" />
          <div className="bg-current rounded-[1px]" />
        </div>
      )
    case 'whatsapp':
      return (
        <div className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center">
          <div className="w-3 h-2 border-b-2 border-r-2 border-current rounded-br-lg" />
        </div>
      )
    case 'api':
      return (
        <div className="flex gap-0.5 items-center">
          <div className="w-1.5 h-5 bg-current rounded-full" />
          <div className="w-1.5 h-7 bg-current rounded-full" />
          <div className="w-1.5 h-4 bg-current rounded-full" />
          <div className="w-1.5 h-6 bg-current rounded-full" />
        </div>
      )
    default:
      return null
  }
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950">
      {/* Decorative Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-60 -right-60 w-[500px] h-[500px] bg-coopnama-primary/[0.04] rounded-full blur-3xl" />
        <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] bg-coopnama-secondary/[0.04] rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src={LOGO_URL}
            alt="COOPNAMA"
            width={48}
            height={48}
            className="rounded-lg object-contain"
            priority
          />
          <div>
            <span className="font-bold text-lg text-white leading-none block">COOPNAMA</span>
            <span className="text-[11px] text-gray-400 leading-none">Sistema de Turnos</span>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm text-gray-300 hover:text-[#009e59] transition-colors"
          >
            Iniciar Sesion
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 bg-gradient-to-r from-[#009e59] to-[#00c96f] text-white text-sm font-medium rounded-neu-sm shadow-neu-xs hover:brightness-110 hover:shadow-[0_0_20px_rgba(0,158,89,0.3)] active:shadow-neu-inset-xs transition-all duration-150"
          >
            Registrarse
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="mb-6">
          <span className="inline-block px-4 py-1.5 bg-[#009e59]/10 text-[#009e59] text-xs font-semibold tracking-wide uppercase rounded-full">
            Potenciado con Inteligencia Artificial
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6 tracking-tight">
          La experiencia de{' '}
          <span className="bg-gradient-to-r from-[#009e59] to-[#00c96f] bg-clip-text text-transparent">
            atencion
          </span>{' '}
          que tus socios merecen
        </h1>

        <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Plataforma integral de gestion de turnos y citas con IA integrada. Elimina filas fisicas,
          predice demanda, asiste a tus agentes y transforma cada visita en una experiencia eficiente.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/kiosk"
            className="px-8 py-3.5 bg-gradient-to-r from-[#009e59] to-[#00c96f] text-white text-base font-semibold rounded-neu shadow-neu hover:brightness-110 hover:shadow-[0_0_20px_rgba(0,158,89,0.3)] active:shadow-neu-inset transition-all duration-200 w-full sm:w-auto"
          >
            Obtener Turno
          </Link>
          <Link
            href="/booking"
            className="px-8 py-3.5 bg-white/[0.06] text-gray-200 text-base font-semibold rounded-neu shadow-neu hover:shadow-neu-sm active:shadow-neu-inset transition-all duration-200 w-full sm:w-auto border border-white/[0.08]"
          >
            Agendar Cita
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-3.5 bg-white/[0.06] text-gray-200 text-base font-semibold rounded-neu shadow-neu hover:shadow-neu-sm active:shadow-neu-inset transition-all duration-200 w-full sm:w-auto"
          >
            Ver Dashboard
          </Link>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-white/[0.06] shadow-neu rounded-neu-lg p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {IMPACT_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-emerald-400 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-300 leading-snug">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 Channels */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            4 canales para obtener turno
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto">
            Tus socios eligen como y desde donde quieren tomar su turno.
            Sin filas, sin friccion.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CHANNELS.map((channel) => (
            <div
              key={channel.title}
              className="bg-white/[0.06] shadow-neu rounded-neu-lg p-6 hover:shadow-neu-md transition-shadow duration-300"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-neu-sm bg-gradient-to-br ${channel.gradient} text-white mb-5`}>
                <ChannelIcon type={channel.icon} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {channel.title}
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {channel.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Todo lo que necesitas para una atencion excepcional
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto">
            Herramientas disenadas para optimizar cada punto de contacto
            entre la cooperativa y sus socios.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.number}
              className="group bg-white/[0.06] shadow-neu rounded-neu-lg p-8 hover:shadow-neu-md transition-shadow duration-300"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-neu-sm bg-gradient-to-br ${feature.gradient} text-white text-sm font-bold mb-6`}>
                {feature.number}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-300 leading-relaxed text-[15px]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Section */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-neu-lg p-10 md:p-14">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-white/10 text-emerald-300 text-xs font-semibold tracking-wide uppercase rounded-full mb-4">
              Inteligencia Artificial
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              IA que trabaja para tu equipo
            </h2>
            <p className="text-gray-300 max-w-xl mx-auto">
              No es solo automatizacion. Es inteligencia que predice, asiste,
              analiza y aprende de cada interaccion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {AI_CAPABILITIES.map((cap, i) => (
              <div
                key={cap.title}
                className="bg-white/[0.06] border border-white/[0.08] rounded-neu-sm p-6 hover:bg-white/[0.1] transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {cap.title}
                  </h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits by Role */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Beneficios para cada rol
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto">
            Cada persona en la organizacion obtiene herramientas
            disenadas para su funcion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ROLE_BENEFITS.map((role) => (
            <div
              key={role.role}
              className="bg-white/[0.06] shadow-neu rounded-neu-lg overflow-hidden"
            >
              <div className={`bg-gradient-to-r ${role.gradient} px-6 py-4`}>
                <h3 className="text-lg font-bold text-white">{role.role}</h3>
              </div>
              <ul className="px-6 py-5 space-y-3">
                {role.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#009e59] mt-2 flex-shrink-0" />
                    <span className="text-sm text-gray-200 leading-snug">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Operational Features Grid */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Gestion operativa completa
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto">
            Todo lo que necesita la gerencia para tener control total
            de las operaciones.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { title: 'Multi-Sucursal', desc: 'Gestion centralizada de todas las ubicaciones con comparacion de rendimiento en tiempo real.' },
            { title: 'Monitor de SLA', desc: 'Alertas automaticas en 3 niveles cuando se viola un acuerdo de servicio. Registro para auditoria.' },
            { title: 'Gamificacion', desc: 'Leaderboard, logros y racha de dias. Motiva agentes con metricas visibles y competencia sana.' },
            { title: 'Routing Inteligente', desc: 'Asigna el mejor agente por habilidades, carga actual o combinacion hibrida. No mas round-robin.' },
            { title: 'White-Label', desc: 'Logo, colores, dominio propio y CSS personalizado. El sistema refleja tu marca, no la nuestra.' },
            { title: '8 Roles de Seguridad', desc: 'Desde Super Admin hasta Viewer. RLS por organizacion, MFA disponible y audit log completo.' },
          ].map((item) => (
            <div key={item.title} className="bg-white/[0.06] shadow-neu-sm rounded-neu-sm p-6">
              <h3 className="font-bold text-white mb-2">{item.title}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Differentiators */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Por que COOPNAMA Turnos
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto">
            Comparacion directa con soluciones tipicas del mercado.
          </p>
        </div>

        <div className="bg-white/[0.06] shadow-neu rounded-neu-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] text-sm">
            {/* Header */}
            <div className="px-6 py-3 bg-white/[0.06] font-semibold text-gray-200 border-b border-white/[0.08]">Caracteristica</div>
            <div className="px-6 py-3 bg-white/[0.06] font-semibold text-[#009e59] border-b border-white/[0.08] text-center min-w-[100px]">Nosotros</div>
            <div className="px-6 py-3 bg-white/[0.06] font-semibold text-gray-300 border-b border-white/[0.08] text-center min-w-[100px]">Otros</div>

            {/* Rows */}
            {DIFFERENTIATORS.map((row, i) => (
              <div key={row.feature} className="contents">
                <div className={`px-6 py-3 text-gray-200 ${i < DIFFERENTIATORS.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
                  {row.feature}
                </div>
                <div className={`px-6 py-3 text-center ${i < DIFFERENTIATORS.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
                  <span className="inline-block w-5 h-5 rounded-full bg-coopnama-secondary/20 text-coopnama-secondary text-xs font-bold leading-5">
                    &#10003;
                  </span>
                </div>
                <div className={`px-6 py-3 text-center text-gray-300 ${i < DIFFERENTIATORS.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
                  {row.them === false ? (
                    <span className="inline-block w-5 h-5 rounded-full bg-white/[0.06] text-gray-300 text-xs font-bold leading-5">
                      &#10007;
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">{row.them}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Simple de usar, poderoso por dentro
          </h2>
          <p className="text-gray-300 max-w-xl mx-auto">
            Tres pasos para transformar la atencion al socio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((item, index) => (
            <div key={item.step} className="relative">
              {index < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gradient-to-r from-gray-300 to-gray-200" />
              )}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/[0.06] shadow-neu text-2xl font-bold text-[#009e59] mb-6">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed max-w-xs mx-auto">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Access Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Accesos Directos
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/tv"
            className="group bg-white/[0.06] shadow-neu rounded-neu-lg p-8 hover:shadow-neu-md transition-all duration-300 block"
          >
            <div className="flex items-start gap-5">
              <div className="flex-shrink-0 w-14 h-14 rounded-neu bg-gradient-to-br from-coopnama-accent/20 to-coopnama-accent/5 flex items-center justify-center">
                <div className="w-7 h-5 rounded-sm border-2 border-coopnama-accent/70" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-[#009e59] transition-colors mb-1">
                  Pantalla TV
                </h3>
                <p className="text-gray-300 text-sm">
                  Vista optimizada para pantallas en sala de espera. Muestra los turnos
                  llamados en tiempo real con anuncios de voz IA.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/kiosk"
            className="group bg-white/[0.06] shadow-neu rounded-neu-lg p-8 hover:shadow-neu-md transition-all duration-300 block"
          >
            <div className="flex items-start gap-5">
              <div className="flex-shrink-0 w-14 h-14 rounded-neu bg-gradient-to-br from-coopnama-secondary/20 to-coopnama-secondary/5 flex items-center justify-center">
                <div className="w-5 h-7 rounded-sm border-2 border-coopnama-secondary/70" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-[#009e59] transition-colors mb-1">
                  Kiosko de Turnos
                </h3>
                <p className="text-gray-300 text-sm">
                  Terminal de autoservicio para que el socio seleccione su servicio
                  y obtenga su numero de turno al instante.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="bg-gradient-to-br from-[#009e59] to-[#00c96f] rounded-neu-lg p-12 text-center text-white shadow-neu-lg">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Listo para transformar la atencion al socio?
          </h2>
          <p className="text-emerald-100 max-w-lg mx-auto mb-8 text-lg">
            Registra tu cooperativa y comienza a ofrecer una experiencia
            de atencion moderna, inteligente y eficiente.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-3.5 bg-white text-[#009e59] text-base font-semibold rounded-neu hover:bg-emerald-50 transition-colors w-full sm:w-auto"
            >
              Comenzar Ahora
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 bg-white/10 text-white text-base font-semibold rounded-neu border border-white/20 hover:bg-white/20 transition-colors w-full sm:w-auto"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src={LOGO_URL}
                alt="COOPNAMA"
                width={40}
                height={40}
                className="rounded-lg object-contain"
              />
              <div>
                <p className="font-bold text-white text-sm">COOPNAMA</p>
                <p className="text-xs text-gray-400">Cooperativa Nacional de Maestros</p>
              </div>
            </div>
            <p className="text-gray-400 text-xs">
              &copy; {new Date().getFullYear()} COOPNAMA. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
