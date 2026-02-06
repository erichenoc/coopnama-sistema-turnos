import Image from 'next/image'
import { cn } from '@/shared/utils/cn'

const LOGO_URL = 'https://res.cloudinary.com/dbftvu8ab/image/upload/v1770398227/coopnama_logo_iqzzj2.png'

interface CoopnamaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  xs: 'w-10 h-10',
  sm: 'w-12 h-12',
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
}

const pxMap = {
  xs: 40,
  sm: 48,
  md: 56,
  lg: 64,
  xl: 80,
}

export function CoopnamaLogo({ size = 'md', className }: CoopnamaLogoProps) {
  return (
    <div className={cn(sizeMap[size], 'relative flex-shrink-0', className)}>
      <Image
        src={LOGO_URL}
        alt="COOPNAMA"
        width={pxMap[size]}
        height={pxMap[size]}
        className="rounded-lg object-contain"
        priority
      />
    </div>
  )
}

export { LOGO_URL }
