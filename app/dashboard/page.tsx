import { requireAuth } from '@/lib/auth/server'
import { UserNav } from '@/components/auth/user-nav'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NoteLog } from '@/components/log/note-log'
import { FileText, Layers, Search, Brain } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  // This will redirect to sign-in if not authenticated
  const user = await requireAuth()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-7 w-7 text-accent mr-2" />
              <h1 className="typography-heading text-foreground">Context</h1>
            </div>
            <UserNav />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Log Area */}
          <div className="xl:col-span-3">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-semibold text-foreground">The Log</h1>
                  <p className="typography-body text-muted-foreground mt-1">
                    Capture your thoughts freely. AI will organize them later.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/search">
                    <Button variant="outline" size="sm">
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Note Log Component */}
              <NoteLog />
            </div>
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Welcome Card */}
            <Card className="p-6">
              <h3 className="typography-heading text-foreground mb-2">
                Welcome back, {user.name || user.email.split('@')[0]}!
              </h3>
              <p className="typography-body text-muted-foreground">
                Start capturing your thoughts. The AI will help organize them automatically.
              </p>
            </Card>

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="typography-heading text-foreground mb-4">Your Progress</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-accent mr-2" />
                    <span className="typography-metadata text-muted-foreground">Notes</span>
                  </div>
                  <span className="text-2xl font-bold text-foreground" title="Total notes captured">
                    --
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Layers className="h-4 w-4 text-accent mr-2" />
                    <span className="typography-metadata text-muted-foreground">Clusters</span>
                  </div>
                  <span
                    className="text-2xl font-bold text-foreground"
                    title="AI-generated clusters"
                  >
                    --
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-accent mr-2" />
                    <span className="typography-metadata text-muted-foreground">Documents</span>
                  </div>
                  <span className="text-2xl font-bold text-foreground" title="Generated documents">
                    --
                  </span>
                </div>
                <div className="typography-metadata text-muted-foreground/70 mt-2">
                  Statistics will appear once you start adding notes
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="typography-heading text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Layers className="w-4 h-4 mr-2" />
                  View Clusters
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Create Document
                </Button>
                <Link href="/search">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Search className="w-4 h-4 mr-2" />
                    Advanced Search
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Tips */}
            <Card className="p-6">
              <h3 className="typography-heading text-foreground mb-4">💡 Tips</h3>
              <div className="space-y-3 typography-metadata text-muted-foreground">
                <div>
                  <span className="font-medium">Keyboard Shortcuts:</span>
                  <div className="mt-1 space-y-1">
                    <div>⌘+Enter to save note</div>
                    <div>⌘+K for quick search</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
