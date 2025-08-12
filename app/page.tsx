import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/server'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Brain, Zap, FileText, Search } from 'lucide-react'

export default async function Home() {
  // Check if user is authenticated and redirect to dashboard
  const user = await getUser()
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">Context</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/sign-in">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Organize Your Thoughts with <span className="text-blue-600">AI</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Context is an AI-powered note-taking app that automatically clusters your thoughts into
            meaningful insights and helps you generate structured documents from your ideas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/sign-up">
              <Button size="lg" className="w-full sm:w-auto">
                Start Taking Notes
              </Button>
            </Link>
            <Link href="/auth/sign-in">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Powered by AI, Designed for Thinking
          </h2>
          <p className="text-xl text-gray-600">
            Follow the &quot;append-and-review&quot; methodology with intelligent automation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="p-6 text-center">
            <Zap className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast Capture</h3>
            <p className="text-gray-600">
              Quickly jot down ideas, thoughts, and insights without worrying about organization.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <Brain className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Clustering</h3>
            <p className="text-gray-600">
              Watch your notes automatically organize into meaningful clusters and themes.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <Search className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Search</h3>
            <p className="text-gray-600">
              Find your ideas instantly with hybrid keyword and semantic search.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <FileText className="h-12 w-12 text-purple-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Document Generation</h3>
            <p className="text-gray-600">
              Transform note clusters into structured documents with one click.
            </p>
          </Card>
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How Context Works</h2>
            <p className="text-xl text-gray-600">Three simple steps to organized thinking</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Write Freely</h3>
              <p className="text-gray-600">
                Capture your thoughts, ideas, meeting notes, and insights without structure.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Organizes</h3>
              <p className="text-gray-600">
                Our AI automatically groups related notes into clusters based on themes and
                concepts.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate Documents</h3>
              <p className="text-gray-600">
                Transform organized clusters into polished documents, reports, and summaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to Transform Your Note-Taking?
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Join thousands of users who&apos;ve revolutionized their thinking with Context.
        </p>
        <Link href="/auth/sign-up">
          <Button size="lg" className="text-lg px-8 py-4">
            Start Your Free Account
          </Button>
        </Link>
        <p className="text-sm text-gray-500 mt-4">No credit card required • Free plan available</p>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Brain className="h-6 w-6 text-blue-400" />
            <span className="ml-2 font-semibold">Context</span>
          </div>
          <p className="text-gray-400">© 2024 Context. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
