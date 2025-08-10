import type { Context } from 'hono'
import type {
  ApiResponse,
  Note,
  User,
  Cluster,
  Document,
  SearchQuery,
  SearchResponse,
  PaginationRequest,
  PaginatedResponse,
} from './index'

// Hono Context Extensions
export interface AppContext extends Context {
  var: {
    user?: User
    requestId: string
    startTime: number
  }
}

// API Route Handler Types
export type ApiHandler = (c: AppContext) => Promise<Response> | Response

// Notes API Types
export interface NotesAPI {
  'GET /notes': {
    query: PaginationRequest
    response: ApiResponse<PaginatedResponse<Note>>
  }
  'POST /notes': {
    body: { content: string; metadata?: Record<string, unknown> }
    response: ApiResponse<Note>
  }
  'GET /notes/:id': {
    params: { id: string }
    response: ApiResponse<Note>
  }
  'PUT /notes/:id': {
    params: { id: string }
    body: { content?: string; metadata?: Record<string, unknown> }
    response: ApiResponse<Note>
  }
  'DELETE /notes/:id': {
    params: { id: string }
    response: ApiResponse<void>
  }
}

// Search API Types
export interface SearchAPI {
  'POST /search': {
    body: SearchQuery
    response: ApiResponse<SearchResponse>
  }
  'POST /search/semantic': {
    body: SearchQuery
    response: ApiResponse<SearchResponse>
  }
}

// Clusters API Types
export interface ClustersAPI {
  'GET /clusters': {
    query: PaginationRequest
    response: ApiResponse<PaginatedResponse<Cluster>>
  }
  'GET /clusters/suggestions': {
    query: PaginationRequest
    response: ApiResponse<PaginatedResponse<Cluster>>
  }
  'POST /clusters/:id/accept': {
    params: { id: string }
    response: ApiResponse<Cluster>
  }
  'POST /clusters/:id/dismiss': {
    params: { id: string }
    response: ApiResponse<void>
  }
}

// Documents API Types
export interface DocumentsAPI {
  'GET /documents': {
    query: PaginationRequest
    response: ApiResponse<PaginatedResponse<Document>>
  }
  'POST /documents': {
    body: {
      clusterId?: string
      title: string
      content?: string
    }
    response: ApiResponse<Document>
  }
  'GET /documents/:id': {
    params: { id: string }
    response: ApiResponse<Document>
  }
  'PUT /documents/:id': {
    params: { id: string }
    body: {
      title?: string
      content?: string
      status?: 'draft' | 'published' | 'archived'
    }
    response: ApiResponse<Document>
  }
  'DELETE /documents/:id': {
    params: { id: string }
    response: ApiResponse<void>
  }
}

// User API Types
export interface UserAPI {
  'GET /user/profile': {
    response: ApiResponse<User>
  }
  'PUT /user/profile': {
    body: {
      name?: string
      preferences?: Record<string, unknown>
    }
    response: ApiResponse<User>
  }
  'DELETE /user/account': {
    response: ApiResponse<void>
  }
}

// Health API Types
export interface HealthAPI {
  'GET /health': {
    response: {
      status: 'ok'
      timestamp: string
      service: string
    }
  }
}

// Combined API Types
export interface AppAPI
  extends NotesAPI,
    SearchAPI,
    ClustersAPI,
    DocumentsAPI,
    UserAPI,
    HealthAPI {}

// Utility types for extracting request/response types
export type ExtractParams<T> = T extends { params: infer P } ? P : never
export type ExtractQuery<T> = T extends { query: infer Q } ? Q : never
export type ExtractBody<T> = T extends { body: infer B } ? B : never
export type ExtractResponse<T> = T extends { response: infer R } ? R : never

// Helper types for route definitions
export type RouteConfig<Method extends string, Path extends string, Config = unknown> = {
  method: Method
  path: Path
} & Config

// Middleware types
export type AuthMiddleware = (c: AppContext, next: () => Promise<void>) => Promise<Response | void>
export type ValidationMiddleware = (
  c: AppContext,
  next: () => Promise<void>
) => Promise<Response | void>
export type RateLimitMiddleware = (
  c: AppContext,
  next: () => Promise<void>
) => Promise<Response | void>

// Error types
export interface APIError extends Error {
  status: number
  code?: string
  details?: Record<string, unknown>
}

export class ValidationError extends Error implements APIError {
  status = 400
  code = 'VALIDATION_ERROR'
  details?: Record<string, unknown>

  constructor(message: string, details?: Record<string, unknown>) {
    super(message)
    this.details = details
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error implements APIError {
  status = 401
  code = 'AUTHENTICATION_ERROR'

  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error implements APIError {
  status = 403
  code = 'AUTHORIZATION_ERROR'

  constructor(message = 'Access denied') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends Error implements APIError {
  status = 404
  code = 'NOT_FOUND'

  constructor(resource?: string) {
    super(resource ? `${resource} not found` : 'Resource not found')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error implements APIError {
  status = 409
  code = 'CONFLICT'

  constructor(message = 'Resource conflict') {
    super(message)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends Error implements APIError {
  status = 429
  code = 'RATE_LIMIT_EXCEEDED'

  constructor(message = 'Rate limit exceeded') {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class InternalServerError extends Error implements APIError {
  status = 500
  code = 'INTERNAL_SERVER_ERROR'

  constructor(message = 'Internal server error') {
    super(message)
    this.name = 'InternalServerError'
  }
}
