/**
 * Test Data Fixtures for Search Tests
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/supabase'

const _supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jaklhhckzosiodpsicrd.supabase.co'
const _supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export interface TestNote {
  id?: string
  content: string
  metadata?: {
    tags?: string[]
    importance?: number
    sentiment?: string
    categories?: string[]
  }
}

export const testNotes: TestNote[] = [
  {
    content:
      'Machine learning algorithms are becoming increasingly sophisticated in natural language processing tasks.',
    metadata: {
      tags: ['machine-learning', 'nlp', 'ai'],
      importance: 8,
      sentiment: 'neutral',
      categories: ['technology', 'artificial-intelligence'],
    },
  },
  {
    content:
      'Korean text processing: 한국어 자연어 처리는 매우 복잡한 작업입니다. 형태소 분석과 구문 분석이 중요합니다.',
    metadata: {
      tags: ['korean', 'nlp', 'morphology'],
      importance: 7,
      sentiment: 'neutral',
      categories: ['language', 'technology'],
    },
  },
  {
    content:
      'Database optimization techniques include proper indexing, query optimization, and connection pooling.',
    metadata: {
      tags: ['database', 'optimization', 'performance'],
      importance: 9,
      sentiment: 'positive',
      categories: ['technology', 'databases'],
    },
  },
  {
    content:
      'React hooks have revolutionized how we write components, making functional components more powerful.',
    metadata: {
      tags: ['react', 'hooks', 'frontend'],
      importance: 6,
      sentiment: 'positive',
      categories: ['technology', 'web-development'],
    },
  },
  {
    content:
      'Testing is crucial for maintaining code quality. Unit tests, integration tests, and E2E tests each serve different purposes.',
    metadata: {
      tags: ['testing', 'quality', 'software'],
      importance: 10,
      sentiment: 'positive',
      categories: ['technology', 'software-engineering'],
    },
  },
  {
    content:
      'Performance monitoring helps identify bottlenecks in applications before they impact users.',
    metadata: {
      tags: ['performance', 'monitoring', 'observability'],
      importance: 8,
      sentiment: 'neutral',
      categories: ['technology', 'operations'],
    },
  },
  {
    content:
      'API design best practices include consistent naming, proper HTTP status codes, and comprehensive documentation.',
    metadata: {
      tags: ['api', 'design', 'best-practices'],
      importance: 7,
      sentiment: 'positive',
      categories: ['technology', 'software-architecture'],
    },
  },
  {
    content:
      'Search functionality implementation: Full-text search with ranking, caching, and analytics tracking.',
    metadata: {
      tags: ['search', 'full-text', 'caching'],
      importance: 9,
      sentiment: 'neutral',
      categories: ['technology', 'features'],
    },
  },
]

export async function setupTestData(userId: string, accessToken: string): Promise<TestNote[]> {
  const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })

  const createdNotes: TestNote[] = []

  for (const note of testNotes) {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        content: note.content,
        metadata: note.metadata as any,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create test note:', error)
      continue
    }

    createdNotes.push({
      ...note,
      id: data.id,
    })
  }

  // Wait for search content to be updated (trigger should run)
  await new Promise(resolve => setTimeout(resolve, 1000))

  return createdNotes
}

export async function cleanupTestData(userId: string, accessToken: string): Promise<void> {
  const _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })

  // Delete test notes
  await supabase.from('notes').delete().eq('user_id', userId)

  // Clean up search data
  await supabase.from('search_history').delete().eq('user_id', userId)

  await supabase.from('search_analytics').delete().eq('user_id', userId)

  await supabase.from('search_cache').delete().eq('user_id', userId)
}

export const _searchTestCases = [
  {
    query: 'machine learning',
    expectedResults: 1,
    description: 'Should find notes about machine learning',
  },
  {
    query: '한국어',
    expectedResults: 1,
    description: 'Should find Korean text content',
  },
  {
    query: 'database optimization',
    expectedResults: 1,
    description: 'Should find database-related content',
  },
  {
    query: 'testing quality',
    expectedResults: 1,
    description: 'Should find testing-related content',
  },
  {
    query: 'nonexistent content xyz123',
    expectedResults: 0,
    description: 'Should return no results for non-existent content',
  },
  {
    query: 'technology',
    expectedResults: 6,
    description: 'Should find multiple notes with technology category',
  },
]

export const _performanceTestCases = [
  {
    query: 'search',
    maxExecutionTime: 500,
    description: 'Simple search should complete under 500ms',
  },
  {
    query: 'machine learning algorithms sophisticated',
    maxExecutionTime: 500,
    description: 'Complex search should complete under 500ms',
  },
]
