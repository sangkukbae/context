'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserNav } from '@/components/auth/user-nav'
import { Search } from '@/components/search/search'
import { Brain } from 'lucide-react'

export default function SearchPage() {
  const router = useRouter()

  // Client-side auth check - user will be redirected if not authenticated
  useEffect(() => {
    // The UserNav component handles auth state and redirects if needed
    // Additional client-side auth validation can be added here if required
  }, [])

  const handleNoteSelect = (noteId: string) => {
    // Navigate to the dashboard with the selected note
    router.push(`/dashboard?note=${noteId}`)
  }

  const handleNoteEdit = (noteId: string) => {
    // Navigate to the dashboard with the note in edit mode
    router.push(`/dashboard?note=${noteId}&edit=true`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-7 w-7 text-accent mr-2" />
              <h1 className="text-xl font-semibold text-foreground">Context</h1>
              <span className="ml-4 text-sm text-muted-foreground">Search</span>
            </div>
            <UserNav />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Search onNoteSelect={handleNoteSelect} onNoteEdit={handleNoteEdit} />
      </main>
    </div>
  )
}
