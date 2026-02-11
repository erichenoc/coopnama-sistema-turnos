export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Subtle mesh gradient background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[#009e59]/8 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-blue-600/6 rounded-full blur-[120px]" />
      </div>
      {/* Public layout for TV Display and Kiosk - no navigation */}
      {children}
    </div>
  )
}
