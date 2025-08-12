'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/lib/auth/hooks'
import { LogOut, User, Settings, CreditCard } from 'lucide-react'

interface UserNavProps {
  className?: string
}

export function UserNav({ className }: UserNavProps) {
  const auth = useAuth()
  const { status, signOut } = auth
  const user = status === 'authenticated' ? auth.user : null
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="hidden md:block">
          <div className="w-20 h-4 bg-gray-200 animate-pulse rounded" />
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Link href="/auth/sign-in">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
        </Link>
        <Link href="/auth/sign-up">
          <Button size="sm">Sign Up</Button>
        </Link>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <TooltipProvider>
        {/* User Avatar and Info */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={user.name || user.email}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-700">
                  {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            {user.subscriptionPlan !== 'free' && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border border-white" />
            )}
          </div>

          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900">
              {user.name || user.email.split('@')[0]}
            </p>
            <p className="text-xs text-gray-500">
              {user.subscriptionPlan.charAt(0).toUpperCase() + user.subscriptionPlan.slice(1)} Plan
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile">
                  <User className="w-4 h-4" />
                  <span className="sr-only">Profile</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Profile</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/settings">
                  <Settings className="w-4 h-4" />
                  <span className="sr-only">Settings</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>

          {user.subscriptionPlan === 'free' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/upgrade">
                    <CreditCard className="w-4 h-4" />
                    <span className="sr-only">Upgrade</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upgrade Plan</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={isLoggingOut}>
                <LogOut className="w-4 h-4" />
                <span className="sr-only">Sign Out</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign Out</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  )
}
