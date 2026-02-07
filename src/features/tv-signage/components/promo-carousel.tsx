'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SignageItem {
  id: string
  content_type: 'image' | 'text' | 'video' | 'html'
  title: string | null
  content_url: string | null
  content_text: string | null
  display_duration_seconds: number
}

interface Props {
  organizationId: string
  branchId: string | null
  isIdle: boolean // true when no ticket is currently being called/shown
}

export function PromoCarousel({ organizationId, branchId, isIdle }: Props) {
  const [items, setItems] = useState<SignageItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [fadeIn, setFadeIn] = useState(true)

  // Fetch signage content
  const fetchContent = useCallback(async () => {
    const supabase = createClient()
    const now = new Date().toISOString()

    let query = supabase
      .from('signage_content')
      .select('id, content_type, title, content_url, content_text, display_duration_seconds')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('sort_order', { ascending: true })

    if (branchId) {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
    }

    const { data } = await query
    setItems((data || []) as SignageItem[])
  }, [organizationId, branchId])

  useEffect(() => {
    fetchContent()
    // Refresh content list every 5 minutes
    const interval = setInterval(fetchContent, 300000)
    return () => clearInterval(interval)
  }, [fetchContent])

  // Auto-advance carousel
  useEffect(() => {
    if (!isIdle || items.length === 0) return

    const currentItem = items[currentIndex]
    const duration = (currentItem?.display_duration_seconds || 10) * 1000

    const timer = setTimeout(() => {
      setFadeIn(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length)
        setFadeIn(true)
      }, 500)
    }, duration)

    return () => clearTimeout(timer)
  }, [isIdle, items, currentIndex])

  // Reset to first slide when becoming idle
  useEffect(() => {
    if (isIdle) {
      setCurrentIndex(0)
      setFadeIn(true)
    }
  }, [isIdle])

  if (!isIdle || items.length === 0) return null

  const currentItem = items[currentIndex]

  return (
    <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      {currentItem.content_type === 'image' && currentItem.content_url && (
        <div className="relative w-full h-full">
          <img
            src={currentItem.content_url}
            alt={currentItem.title || 'Promotional content'}
            className="w-full h-full object-contain"
          />
          {currentItem.title && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
              <p className="text-white text-3xl font-bold">{currentItem.title}</p>
            </div>
          )}
        </div>
      )}

      {currentItem.content_type === 'text' && (
        <div className="text-center px-16">
          {currentItem.title && (
            <h2 className="text-5xl font-bold text-white mb-6">{currentItem.title}</h2>
          )}
          {currentItem.content_text && (
            <p className="text-2xl text-blue-200 leading-relaxed whitespace-pre-wrap">
              {currentItem.content_text}
            </p>
          )}
        </div>
      )}

      {currentItem.content_type === 'video' && currentItem.content_url && (
        <video
          src={currentItem.content_url}
          autoPlay
          muted
          loop
          className="w-full h-full object-contain"
        />
      )}

      {currentItem.content_type === 'html' && currentItem.content_text && (
        <div
          className="w-full h-full flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: currentItem.content_text }}
        />
      )}

      {/* Slide indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
