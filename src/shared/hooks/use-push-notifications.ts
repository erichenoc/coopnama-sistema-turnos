'use client'

import { useState, useCallback, useEffect } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

interface UsePushNotificationsOptions {
  organizationId: string
  memberId?: string
  userId?: string
  autoSubscribe?: boolean
}

export function usePushNotifications({
  organizationId,
  memberId,
  userId,
  autoSubscribe = false,
}: UsePushNotificationsOptions) {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && Boolean(VAPID_PUBLIC_KEY)
    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)
      checkExistingSubscription()
    }
  }, [])

  useEffect(() => {
    if (autoSubscribe && isSupported && permission === 'default') {
      subscribe()
    }
  }, [autoSubscribe, isSupported, permission])

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(Boolean(subscription))
    } catch {
      setIsSubscribed(false)
    }
  }

  const subscribe = useCallback(async () => {
    if (!isSupported) return false

    try {
      // Request permission
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') return false

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })

      const json = subscription.toJSON()

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          organizationId,
          memberId,
          userId,
          deviceType: detectDeviceType(),
        }),
      })

      if (response.ok) {
        setIsSubscribed(true)
        return true
      }

      return false
    } catch (err) {
      console.error('Push subscription failed:', err)
      return false
    }
  }, [isSupported, organizationId, memberId, userId])

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      }

      setIsSubscribed(false)
      return true
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
      return false
    }
  }, [])

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function detectDeviceType(): string {
  const ua = navigator.userAgent
  if (/tablet|ipad/i.test(ua)) return 'tablet'
  if (/mobile|iphone|android/i.test(ua)) return 'mobile'
  return 'desktop'
}
