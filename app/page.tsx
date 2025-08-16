import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/server'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
// import { ThemeToggle } from '@/components/theme-toggle'
import Link from 'next/link'
import { Brain, Zap, FileText, Search } from 'lucide-react'

export default async function Home() {
  // Check if user is authenticated and redirect to dashboard
  const user = await getUser()
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-accent" />
              <h1 className="ml-2 text-xl font-bold text-foreground">Context</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* <ThemeToggle /> */}
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
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Organize Your Thoughts with <span className="text-accent">AI</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
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
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Powered by AI, Designed for Thinking
          </h2>
          <p className="text-xl text-muted-foreground">
            Follow the &quot;append-and-review&quot; methodology with intelligent automation
          </p>
        </div>

        {/* AI Color Showcase */}
        <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 bg-ai-cluster-hint border">
            <h3 className="font-semibold text-ai-cluster mb-2">AI Cluster Hint</h3>
            <p className="text-ai-cluster text-sm">
              This showcases the subtle blue background used for AI-clustered content hints.
            </p>
          </Card>
          <Card className="p-4 bg-ai-generated border">
            <h3 className="font-semibold text-ai-cluster mb-2">AI Generated</h3>
            <p className="text-ai-cluster text-sm">
              This showcases the subtle green background used for AI-generated content.
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="p-6 text-center">
            <Zap className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">Fast Capture</h3>
            <p className="text-muted-foreground">
              Quickly jot down ideas, thoughts, and insights without worrying about organization.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <Brain className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">AI Clustering</h3>
            <p className="text-muted-foreground">
              Watch your notes automatically organize into meaningful clusters and themes.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <Search className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">Smart Search</h3>
            <p className="text-muted-foreground">
              Find your ideas instantly with hybrid keyword and semantic search.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <FileText className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">Document Generation</h3>
            <p className="text-muted-foreground">
              Transform note clusters into structured documents with one click.
            </p>
          </Card>
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-muted py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">How Context Works</h2>
            <p className="text-xl text-muted-foreground">
              Three simple steps to organized thinking
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-accent">1</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Write Freely</h3>
              <p className="text-muted-foreground">
                Capture your thoughts, ideas, meeting notes, and insights without structure.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-accent">2</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">AI Organizes</h3>
              <p className="text-muted-foreground">
                Our AI automatically groups related notes into clusters based on themes and
                concepts.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-accent">3</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Generate Documents</h3>
              <p className="text-muted-foreground">
                Transform organized clusters into polished documents, reports, and summaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Ready to Transform Your Note-Taking?
        </h2>
        <p className="text-xl text-muted-foreground mb-8">
          Join thousands of users who&apos;ve revolutionized their thinking with Context.
        </p>
        <Link href="/auth/sign-up">
          <Button size="lg" className="text-lg px-8 py-4">
            Start Your Free Account
          </Button>
        </Link>
        <p className="text-sm text-muted-foreground/70 mt-4">
          No credit card required • Free plan available
        </p>
      </section>

      {/* Footer */}
      <footer className="bg-card text-card-foreground border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Brain className="h-6 w-6 text-accent" />
            <span className="ml-2 font-semibold">Context</span>
          </div>
          <p className="text-muted-foreground">© 2024 Context. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
