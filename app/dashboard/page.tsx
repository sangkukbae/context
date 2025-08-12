import { requireAuth } from '@/lib/auth/server'
import { UserNav } from '@/components/auth/user-nav'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Layers, Search } from 'lucide-react'

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
              <h1 className="text-xl font-semibold text-gray-900">Context</h1>
            </div>
            <UserNav />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name || user.email.split('@')[0]}!
          </h2>
          <p className="text-gray-600">
            Start capturing your thoughts and let AI help organize them into meaningful insights.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Notes</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <Layers className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clusters</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Documents</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <Search className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Subscription</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {user.subscriptionPlan}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Your First Note</h3>
            <p className="text-gray-600 mb-4">
              Start capturing your thoughts, ideas, and insights. The AI will help organize them
              automatically.
            </p>
            <Button className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              New Note
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Clusters</h3>
            <p className="text-gray-600 mb-4">
              Explore how your notes are automatically organized into meaningful groups and themes.
            </p>
            <Button variant="outline" className="w-full">
              <Layers className="w-4 h-4 mr-2" />
              View Clusters
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate Document</h3>
            <p className="text-gray-600 mb-4">
              Transform your note clusters into structured documents with AI assistance.
            </p>
            <Button variant="outline" className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              Create Document
            </Button>
          </Card>
        </div>

        {/* Getting Started */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Getting Started with Context</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">1</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Capture Your Thoughts</h4>
                <p className="text-gray-600">
                  Start writing notes about anything - ideas, meetings, research, or daily thoughts.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-green-600">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">AI Clustering</h4>
                <p className="text-gray-600">
                  Watch as Context automatically groups related notes into meaningful clusters.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-purple-600">3</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Generate Documents</h4>
                <p className="text-gray-600">
                  Transform clusters into structured documents, reports, or summaries.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
