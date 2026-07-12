import { useCallback, useEffect, useState } from 'react'

export type ToastTone = 'error' | 'warning' | 'info' | 'success'

export interface ToastItem {
  id: string
  message: string
  tone: ToastTone
}

const AUTO_DISMISS_MS = 6000

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev.slice(-4), { id, message, tone }])
    return id
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return

    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS),
    )

    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [toasts, dismiss])

  return { toasts, push, dismiss }
}
