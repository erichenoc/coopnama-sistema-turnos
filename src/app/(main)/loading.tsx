import { Spinner } from '@/shared/components/spinner'

export default function MainLayoutLoading() {
  return (
    <div className="min-h-screen bg-neu-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        <p className="text-gray-600 font-medium">Cargando panel...</p>
      </div>
    </div>
  )
}
