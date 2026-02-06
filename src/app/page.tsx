import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'COOPNAMA Turnos - Sistema Inteligente de Gestión de Turnos',
  description: 'Sistema inteligente de gestión de turnos para COOPNAMA - Cooperativa Nacional de Maestros',
}

export default function Home() {
  return (
    <main className="min-h-screen bg-neu-bg">
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-coopnama-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-coopnama-secondary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-coopnama-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-coopnama-primary rounded-neu-sm shadow-neu-sm flex items-center justify-center">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <span className="font-bold text-xl text-gray-800">COOPNAMA</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2 text-gray-600 hover:text-coopnama-primary transition-colors"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/signup"
            className={`
              px-6 py-2
              bg-coopnama-primary
              text-white
              rounded-neu-sm
              shadow-neu-sm
              hover:bg-blue-700
              active:shadow-neu-inset
              transition-all duration-150
            `}
          >
            Registrarse
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="mb-8">
          <span className="px-4 py-2 bg-coopnama-secondary/10 text-coopnama-secondary text-sm font-medium rounded-full">
            Sistema de Gestión de Turnos con IA
          </span>
        </div>

        <h1 className="text-5xl lg:text-6xl font-bold text-gray-800 mb-6">
          Gestiona tus turnos de forma
          <span className="text-coopnama-primary"> inteligente</span>
        </h1>

        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          Sistema moderno y eficiente para la gestión de turnos en COOPNAMA.
          Reduce tiempos de espera, mejora la experiencia del socio y optimiza los recursos.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/kiosk"
            className={`
              px-8 py-4
              bg-coopnama-primary
              text-white
              text-lg font-semibold
              rounded-neu
              shadow-neu
              hover:bg-blue-700
              active:shadow-neu-inset
              transition-all duration-200
            `}
          >
            Obtener Turno
          </Link>
          <Link
            href="/dashboard"
            className={`
              px-8 py-4
              bg-neu-bg
              text-gray-700
              text-lg font-semibold
              rounded-neu
              shadow-neu
              hover:shadow-neu-sm
              active:shadow-neu-inset
              transition-all duration-200
            `}
          >
            Ir al Dashboard
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: '⚡',
              title: 'Rápido y Eficiente',
              description: 'Reduce los tiempos de espera con una gestión inteligente de la cola.',
            },
            {
              icon: '🤖',
              title: 'Impulsado por IA',
              description: 'Predicciones de tiempo de espera y optimización automática de recursos.',
            },
            {
              icon: '📊',
              title: 'Análisis en Tiempo Real',
              description: 'Dashboard con métricas y reportes detallados para tomar mejores decisiones.',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className={`
                p-8
                bg-neu-bg
                shadow-neu
                rounded-neu-lg
                text-center
                hover:shadow-neu-md
                transition-shadow duration-300
              `}
            >
              <span className="text-5xl mb-4 block">{feature.icon}</span>
              <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/tv"
            className={`
              group
              p-8
              bg-neu-bg
              shadow-neu
              rounded-neu-lg
              flex items-center gap-6
              hover:shadow-neu-md
              transition-all duration-300
            `}
          >
            <div className="w-16 h-16 bg-coopnama-accent/10 rounded-neu flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-4xl">📺</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-coopnama-primary transition-colors">
                Pantalla TV
              </h3>
              <p className="text-gray-600">
                Vista para pantallas de sala de espera
              </p>
            </div>
          </Link>

          <Link
            href="/kiosk"
            className={`
              group
              p-8
              bg-neu-bg
              shadow-neu
              rounded-neu-lg
              flex items-center gap-6
              hover:shadow-neu-md
              transition-all duration-300
            `}
          >
            <div className="w-16 h-16 bg-coopnama-secondary/10 rounded-neu flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-4xl">🖥️</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-coopnama-primary transition-colors">
                Kiosko de Turnos
              </h3>
              <p className="text-gray-600">
                Autoservicio para obtener turnos
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-coopnama-primary rounded-neu-sm shadow-neu-xs flex items-center justify-center">
                <span className="text-white font-bold">C</span>
              </div>
              <div>
                <p className="font-bold text-gray-800">COOPNAMA</p>
                <p className="text-sm text-gray-500">Cooperativa Nacional de Maestros</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} COOPNAMA. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
