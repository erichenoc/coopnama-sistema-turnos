import Image from 'next/image'
import { cn } from '@/shared/utils/cn'

const LOGO_URL = 'https://res.cloudinary.com/dbftvu8ab/image/upload/v1770398227/coopnama_logo_iqzzj2.png'

interface CoopnamaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
  xl: 'w-16 h-16',
}

const pxMap = {
  xs: 32,
  sm: 40,
  md: 48,
  lg: 56,
  xl: 64,
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
