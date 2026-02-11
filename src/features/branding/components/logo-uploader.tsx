'use client'

import { useState, useRef } from 'react'
import { Button } from '@/shared/components'
import { uploadLogoAction } from '@/features/branding/actions/branding-actions'

interface LogoUploaderProps {
  currentLogoUrl: string | null
  organizationId: string
  onUploaded: (url: string) => void
}

export function LogoUploader({ currentLogoUrl, organizationId, onUploaded }: LogoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentLogoUrl)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    const file = inputRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('logo', file)

    const result = await uploadLogoAction(organizationId, formData)

    if (result.error) {
      setError(result.error)
    } else if (result.url) {
      onUploaded(result.url)
    }
    setUploading(false)
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-200">Logo de la Organizacion</label>

      {/* Preview */}
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 bg-white/[0.06] rounded-xl flex items-center justify-center overflow-hidden border-2 border-dashed border-white/[0.10]">
          {preview ? (
            <img src={preview} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#009e59]/10 file:text-[#009e59] hover:file:bg-[#009e59]/20 cursor-pointer"
          />
          <p className="text-xs text-gray-300">PNG, JPG, SVG o WebP. Max 2MB.</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {inputRef.current?.files?.length ? (
        <Button onClick={handleUpload} isLoading={uploading} variant="primary" size="sm">
          Subir Logo
        </Button>
      ) : null}
    </div>
  )
}
