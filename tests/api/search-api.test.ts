/**
 * API Integration Tests for Search Routes
 *
 * Tests the search API endpoints including:
 * - Authentication middleware
 * - Request validation
 * - Search functionality
 * - Response formatting
 * - Error handling
 */
import { test, expect } from '../fixtures/auth'
import {
  setupTestData,
  cleanupTestData,
  searchTestCases,
  performanceTestCases,
} from '../fixtures/search-data'

const _baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3002'

test.describe('Search API Routes', () => {
  test.beforeEach(async ({ authenticatedUser }) => {
    await setupTestData(authenticatedUser.id, authenticatedUser.accessToken)
  })

  test.afterEach(async ({ authenticatedUser }) => {
    await cleanupTestData(authenticatedUser.id, authenticatedUser.accessToken)
  })

  test.describe('Authentication', () => {
    test('should reject requests without authorization header', async ({ page }) => {
      const _response = await page.request.post(`${baseURL}/api/search`, {
        headers: { 'Content-Type': 'application/json' },
        data: {
          query: 'test',
          type: 'keyword',
          limit: 10,
          offset: 0,
        },
      })

      expect(response.status()).toBe(401)
      const _data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    test('should reject requests with invalid token', async ({ page }) => {
      const _response = await page.request.post(`${baseURL}/api/search`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token',
        },
        data: {
          query: 'test',
          type: 'keyword',
          limit: 10,
          offset: 0,
        },
      })

      expect(response.status()).toBe(401)
      const _data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    test('should accept requests with valid token', async ({ page, apiHeaders }) => {
      const _response = await page.request.post(`${baseURL}/api/search`, {
        headers: apiHeaders,
        data: {
          query: 'machine learning',
          type: 'keyword',
          limit: 10,
          offset: 0,
        },
      })

      expect(response.status()).toBe(200)
      const _data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  test.describe('POST /api/search', () => {
    test('should validate request body schema', async ({ page, apiHeaders }) => {
      // Missing query
      let response = await page.request.post(`${baseURL}/api/search`, {
        headers: apiHeaders,
        data: {
          type: 'keyword',
          limit: 10,
        },
      })

      expect(response.status()).toBe(400)
      let data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation Error')

      // Invalid type
      response = await page.request.post(`${baseURL}/api/search`, {
        headers: apiHeaders,
        data: {
          query: 'test',
          type: 'invalid-type',
          limit: 10,
        },
      })

      expect(response.status()).toBe(400)
      data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation Error')
    })

    test('should handle empty search queries', async ({ page, apiHeaders }) => {
      const _response = await page.request.post(`${baseURL}/api/search`, {
        headers: apiHeaders,
        data: {
          query: '',
          type: 'keyword',
          limit: 10,
          offset: 0,
        },
      })

      expect(response.status()).toBe(400)
      const _data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation Error')
      expect(data.message).toContain('empty')
    })

    test.describe('Keyword Search', () => {
      searchTestCases.forEach(testCase => {
        test(`should ${testCase.description}`, async ({ page, apiHeaders }) => {
          const _response = await page.request.post(`${baseURL}/api/search`, {
            headers: apiHeaders,
            data: {
              query: testCase.query,
              type: 'keyword',
              limit: 20,
              offset: 0,
              includeSnippets: true,
              includeHighlighting: true,
            },
          })

          expect(response.status()).toBe(200)
          const _data = await response.json()

          expect(data.success).toBe(true)
          expect(data.data).toBeDefined()
          expect(data.data.results).toBeDefined()
          expect(Array.isArray(data.data.results)).toBe(true)
          expect(data.data.results.length).toBe(testCase.expectedResults)

          // Verify response structure
          expect(data.data.query).toBe(testCase.query)
          expect(data.data.type).toBe('keyword')
          expect(data.data.executionTimeMs).toBeDefined()
          expect(typeof data.data.executionTimeMs).toBe('number')
          expect(data.data.pagination).toBeDefined()
          expect(data.timestamp).toBeDefined()

          if (data.data.results.length > 0) {
            const _result = data.data.results[0]
            expect(result.id).toBeDefined()
            expect(result.content).toBeDefined()
            expect(result.userId).toBeDefined()
            expect(result.createdAt).toBeDefined()
            expect(result.score).toBeDefined()
            expect(typeof result.score).toBe('number')

            if (result.snippet) {
              expect(typeof result.snippet).toBe('string')
            }

            if (result.highlightedContent) {
              expect(typeof result.highlightedContent).toBe('string')
            }
          }
        })
      })

      test('should handle pagination correctly', async ({ page, apiHeaders }) => {
        // Get first page
        const _response1 = await page.request.post(`${baseURL}/api/search`, {
          headers: apiHeaders,
          data: {
            query: 'technology',
            type: 'keyword',
            limit: 3,
            offset: 0,
          },
        })

        expect(response1.status()).toBe(200)
        const _data1 = await response1.json()

        expect(data1.data.pagination.limit).toBe(3)
        expect(data1.data.pagination.offset).toBe(0)
        expect(data1.data.pagination.hasPrev).toBe(false)

        // Get second page if there are more results
        if (data1.data.pagination.hasNext) {
          const _response2 = await page.request.post(`${baseURL}/api/search`, {
            headers: apiHeaders,
            data: {
              query: 'technology',
              type: 'keyword',
              limit: 3,
              offset: 3,
            },
          })

          expect(response2.status()).toBe(200)
          const _data2 = await response2.json()

          expect(data2.data.pagination.limit).toBe(3)
          expect(data2.data.pagination.offset).toBe(3)
          expect(data2.data.pagination.hasPrev).toBe(true)
        }
      })

      test('should handle search filters', async ({ page, apiHeaders }) => {
        const _response = await page.request.post(`${baseURL}/api/search`, {
          headers: apiHeaders,
          data: {
            query: 'machine',
            type: 'keyword',
            limit: 10,
            offset: 0,
            filters: {
              tags: ['machine-learning'],
            },
          },
        })

        expect(response.status()).toBe(200)
        const _data = await response.json()

        expect(data.success).toBe(true)
        expect(data.data.filters).toBeDefined()
        expect(data.data.filters.tags).toEqual(['machine-learning'])
      })
    })

    test.describe('Semantic Search', () => {
      test('should return not implemented for semantic search', async ({ page, apiHeaders }) => {
        const _response = await page.request.post(`${baseURL}/api/search`, {
          headers: apiHeaders,
          data: {
            query: 'machine learning',
            type: 'semantic',
            limit: 10,
            offset: 0,
          },
        })

        expect(response.status()).toBe(501)
        const _data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error).toBe('Not Implemented')
      })
    })

    test.describe('Performance', () => {
      performanceTestCases.forEach(testCase => {
        test(`should ${testCase.description}`, async ({ page, apiHeaders }) => {
          const _startTime = Date.now()

          const _response = await page.request.post(`${baseURL}/api/search`, {
            headers: apiHeaders,
            data: {
              query: testCase.query,
              type: 'keyword',
              limit: 20,
              offset: 0,
            },
          })

          const _totalTime = Date.now() - startTime

          expect(response.status()).toBe(200)
          const _data = await response.json()

          expect(data.success).toBe(true)
          expect(data.data.executionTimeMs).toBeLessThan(testCase.maxExecutionTime)
          expect(totalTime).toBeLessThan(testCase.maxExecutionTime + 100) // Allow 100ms buffer for network
        })
      })
    })
  })

  test.describe('GET /api/search', () => {
    test('should handle simple query parameter searches', async ({ page, apiHeaders }) => {
      const _response = await page.request.get(`${baseURL}/api/search?q=machine+learning&limit=10`, {
        headers: apiHeaders,
      })

      expect(response.status()).toBe(200)
      const _data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.query).toBe('machine learning')
      expect(data.data.type).toBe('keyword')
      expect(Array.isArray(data.data.results)).toBe(true)
    })

    test('should require query parameter', async ({ page, apiHeaders }) => {
      const _response = await page.request.get(`${baseURL}/api/search?limit=10`, {
        headers: apiHeaders,
      })

      expect(response.status()).toBe(400)
      const _data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation Error')
    })

    test('should handle query parameters with filters', async ({ page, apiHeaders }) => {
      const _response = await page.request.get(
        `${baseURL}/api/search?q=technology&tags=machine-learning&limit=5`,
        {
          headers: apiHeaders,
        }
      )

      expect(response.status()).toBe(200)
      const _data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.filters.tags).toEqual(['machine-learning'])
    })
  })

  test.describe('GET /api/search/suggestions', () => {
    test('should return search suggestions', async ({ page, apiHeaders }) => {
      // First, perform some searches to create history
      await page.request.post(`${baseURL}/api/search`, {
        headers: apiHeaders,
        data: {
          query: 'machine learning algorithms',
          type: 'keyword',
          limit: 10,
          offset: 0,
        },
      })

      // Wait a bit for history to be recorded
      await page.waitForTimeout(500)

      const _response = await page.request.get(
        `${baseURL}/api/search/suggestions?query=machine&limit=5`,
        {
          headers: apiHeaders,
        }
      )

      expect(response.status()).toBe(200)
      const _data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.suggestions).toBeDefined()
      expect(Array.isArray(data.data.suggestions)).toBe(true)
      expect(data.data.total).toBeDefined()
    })

    test('should handle empty query prefix', async ({ page, apiHeaders }) => {
      const _response = await page.request.get(`${baseURL}/api/search/suggestions?limit=5`, {
        headers: apiHeaders,
      })

      expect(response.status()).toBe(200)
      const _data = await response.json()

      expect(data.success).toBe(true)
      expect(Array.isArray(data.data.suggestions)).toBe(true)
    })
  })

  test.describe('GET /api/search/history', () => {
    test('should return search history', async ({ page, apiHeaders }) => {
      // First, perform a search to create history
      await page.request.post(`${baseURL}/api/search`, {
        headers: apiHeaders,
        data: {
          query: 'test search history',
          type: 'keyword',
          limit: 10,
          offset: 0,
        },
      })

      // Wait a bit for history to be recorded
      await page.waitForTimeout(500)

      const _response = await page.request.get(`${baseURL}/api/search/history?limit=20`, {
        headers: apiHeaders,
      })

      expect(response.status()).toBe(200)
      const _data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.history).toBeDefined()
      expect(Array.isArray(data.data.history)).toBe(true)
      expect(data.data.pagination).toBeDefined()

      if (data.data.history.length > 0) {
        const _historyItem = data.data.history[0]
        expect(historyItem.id).toBeDefined()
        expect(historyItem.query).toBeDefined()
        expect(historyItem.type).toBeDefined()
        expect(historyItem.lastUsedAt).toBeDefined()
      }
    })

    test('should handle pagination in history', async ({ page, apiHeaders }) => {
      const _response = await page.request.get(`${baseURL}/api/search/history?limit=5&offset=0`, {
        headers: apiHeaders,
      })

      expect(response.status()).toBe(200)
      const _data = await response.json()

      expect(data.data.pagination.limit).toBe(5)
      expect(data.data.pagination.offset).toBe(0)
    })
  })

  test.describe('GET /api/search/analytics', () => {
    test('should return search analytics', async ({ page, apiHeaders }) => {
      const _response = await page.request.get(`${baseURL}/api/search/analytics?period=week`, {
        headers: apiHeaders,
      })

      expect(response.status()).toBe(200)
      const _data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.totalQueries).toBeDefined()
      expect(data.data.averageExecutionTime).toBeDefined()
      expect(data.data.mostPopularQueries).toBeDefined()
      expect(data.data.queryTypeDistribution).toBeDefined()
      expect(data.data.performanceMetrics).toBeDefined()
      expect(data.data.timeSeriesData).toBeDefined()
    })

    test('should handle different time periods', async ({ page, apiHeaders }) => {
      const _periods = ['day', 'week', 'month', 'year']

      for (const period of periods) {
        const _response = await page.request.get(
          `${baseURL}/api/search/analytics?period=${period}`,
          {
            headers: apiHeaders,
          }
        )

        expect(response.status()).toBe(200)
        const _data = await response.json()
        expect(data.success).toBe(true)
      }
    })
  })

  test.describe('GET /api/search/stats', () => {
    test('should return search statistics', async ({ page, apiHeaders }) => {
      const _response = await page.request.get(`${baseURL}/api/search/stats`, {
        headers: apiHeaders,
      })

      expect(response.status()).toBe(200)
      const _data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.totalSearches).toBeDefined()
      expect(data.data.uniqueQueries).toBeDefined()
      expect(data.data.averageResultsPerSearch).toBeDefined()
      expect(data.data.searchesToday).toBeDefined()
      expect(data.data.averageExecutionTime).toBeDefined()
    })
  })

  test.describe('DELETE /api/search/history', () => {
    test('should clear search history', async ({ page, apiHeaders }) => {
      // First, perform a search to create history
      await page.request.post(`${baseURL}/api/search`, {
        headers: apiHeaders,
        data: {
          query: 'test for deletion',
          type: 'keyword',
          limit: 10,
          offset: 0,
        },
      })

      await page.waitForTimeout(500)

      const _response = await page.request.delete(`${baseURL}/api/search/history`, {
        headers: apiHeaders,
      })

      expect(response.status()).toBe(200)
      const _data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.deletedCount).toBeDefined()
      expect(typeof data.data.deletedCount).toBe('number')
    })

    test('should handle olderThan parameter', async ({ page, apiHeaders }) => {
      const _olderThan = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago

      const _response = await page.request.delete(
        `${baseURL}/api/search/history?olderThan=${olderThan}`,
        {
          headers: apiHeaders,
        }
      )

      expect(response.status()).toBe(200)
      const _data = await response.json()
      expect(data.success).toBe(true)
    })
  })
})
