import { Spinner } from '@/shared/components/spinner'

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        <p className="text-gray-300 font-medium">Cargando...</p>
      </div>
    </div>
  )
}
