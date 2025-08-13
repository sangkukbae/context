import { requireAuth } from '@/lib/auth/server'
import { UserNav } from '@/components/auth/user-nav'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NoteLog } from '@/components/log/note-log'
import { FileText, Layers, Search, Brain } from 'lucide-react'

export default async function DashboardPage() {
  // This will redirect to sign-in if not authenticated
  const user = await requireAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-7 w-7 text-blue-600 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">Context</h1>
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
                  <h1 className="text-3xl font-bold text-gray-900">The Log</h1>
                  <p className="text-gray-600 mt-1">
                    Capture your thoughts freely. AI will organize them later.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Welcome back, {user.name || user.email.split('@')[0]}!
              </h3>
              <p className="text-gray-600 text-sm">
                Start capturing your thoughts. The AI will help organize them automatically.
              </p>
            </Card>

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm text-gray-600">Notes</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900" title="Total notes captured">
                    --
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Layers className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-gray-600">Clusters</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900" title="AI-generated clusters">
                    --
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-purple-600 mr-2" />
                    <span className="text-sm text-gray-600">Documents</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900" title="Generated documents">
                    --
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Statistics will appear once you start adding notes
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Layers className="w-4 h-4 mr-2" />
                  View Clusters
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Create Document
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Search className="w-4 h-4 mr-2" />
                  Advanced Search
                </Button>
              </div>
            </Card>

            {/* Tips */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Tips</h3>
              <div className="space-y-3 text-sm text-gray-600">
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
