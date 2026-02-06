import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neu-bg flex items-center justify-center p-4">
      <div className="bg-neu-surface shadow-neu rounded-neu-lg p-8 max-w-md w-full text-center">
        {/* Error Code */}
        <h1 className="text-6xl font-bold text-coopnama-primary mb-4">
          404
        </h1>

        {/* Error Message */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Página no encontrada
        </h2>
        <p className="text-gray-600 mb-8">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>

        {/* Action Button */}
        <Link
          href="/dashboard"
          className="inline-block bg-neu-surface shadow-neu hover:shadow-neu-inset active:shadow-neu-inset-md rounded-neu px-6 py-3 font-semibold text-coopnama-primary transition-all duration-150"
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  )
}
