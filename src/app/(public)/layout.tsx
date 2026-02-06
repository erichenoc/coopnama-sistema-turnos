export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-neu-bg">
      {/* Public layout for TV Display and Kiosk - no navigation */}
      {children}
    </div>
  )
}
