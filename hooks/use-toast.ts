'use client'

/**
 * Toast hook that provides a consistent interface using sonner
 * This creates compatibility with existing code that expects a use-toast hook
 */

import { toast as sonnerToast } from 'sonner'

export interface ToastProps {
  title?: string
  description?: string
  action?: React.ReactNode
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const toast = ({ title, description, variant = 'default', ...props }: ToastProps) => {
    if (variant === 'destructive') {
      return sonnerToast.error(title || 'Error', {
        description,
        ...props,
      })
    }

    return sonnerToast(title || 'Notification', {
      description,
      ...props,
    })
  }

  return {
    toast,
    dismiss: sonnerToast.dismiss,
  }
}
