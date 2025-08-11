# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Context is an AI-powered note-taking application built with a unified Next.js + Hono.js architecture. The app enables fast note capture with AI-powered clustering and document generation, following Andrej Karpathy's "append-and-review" methodology.

## Architecture & Technology Stack

### Unified Full-Stack Framework

- **Frontend & Backend**: Next.js 15 with App Router + Hono.js for API routes
- **Single Codebase**: Shared TypeScript types between frontend and API layers
- **API Pattern**: All routes handled via `app/api/[...route]/route.ts` using Hono.js

### Key Dependencies

- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS) - primary component library
- **Styling**: Tailwind CSS for utility-first styling
- **Forms**: React Hook Form with Zod validation
- **Database**: PostgreSQL with Prisma ORM (planned: Neon serverless)
- **Caching**: Redis (planned: Upstash)
- **Vector Database**: Pinecone for AI embeddings
- **AI Services**: OpenAI GPT-4 and embeddings

### Development Environment

- **Language**: TypeScript throughout with strict type checking
- **Linting**: ESLint with Next.js config + Prettier
- **Pre-commit**: Husky with lint-staged for automated formatting
- **Package Manager**: pnpm

## Common Commands

### Development

```bash
pnpm dev          # Start development server (Next.js + API)
pnpm build        # Build for production
pnpm start        # Start production server
```

### Code Quality

```bash
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix ESLint issues automatically
pnpm format       # Format code with Prettier
pnpm format:check # Check Prettier formatting
pnpm type-check   # Run TypeScript compiler checks
```

### Pre-commit

```bash
pnpm prepare      # Set up Husky hooks
pnpm pre-commit   # Run lint-staged manually
```

## Code Organization

### Directory Structure

```
/app                 # Next.js App Router pages and layouts
  /api/[...route]/   # Unified API via Hono.js (all endpoints)
  layout.tsx         # Root layout with fonts
  page.tsx           # Home page
/components          # React components
  /ui/               # shadcn/ui components
/lib                 # Shared utilities and configurations
  env.ts             # Environment validation with Zod
  /types/            # Shared TypeScript types
  utils.ts           # Utility functions
/docs                # Project documentation and planning
```

### Environment Configuration

- Comprehensive environment validation in `lib/env.ts`
- Feature flags for AI functionality (clustering, semantic search, document generation)
- Service availability checks for external APIs
- Validation runs automatically in development mode

### API Architecture

- All API routes handled through single Hono.js app at `/api/[...route]`
- Unified error handling and response types
- Built-in health check at `/api/health`
- Type-safe responses using shared ApiResponse types

## Development Guidelines

### Component Development

- Use shadcn/ui components as primary building blocks
- Install new shadcn/ui components via: `pnpm dlx shadcn@latest add <component>`
- Follow existing patterns for component composition and styling
- Maintain accessibility through Radix UI primitives

### Type Safety

- Leverage shared types from `lib/types/` across frontend and API
- Use Zod schemas for request/response validation
- Environment variables are fully typed and validated

### Code Style

- ESLint configuration enforces Next.js and TypeScript best practices
- Prettier handles formatting automatically via pre-commit hooks
- Use `pnpm lint:fix` to resolve style issues before committing

### Feature Development

- Check feature flags in `lib/env.ts` before implementing AI features
- Validate required services are configured via `validateRequiredServices()`
- Follow the unified architecture pattern for new API endpoints

### AI Integration

- AI features are behind feature flags: `ENABLE_AI_CLUSTERING`, `ENABLE_SEMANTIC_SEARCH`, etc.
- OpenAI and Pinecone configurations are validated at startup
- All AI functionality should gracefully degrade when services are unavailable

## Testing Strategy

### Current Status

- Basic project setup complete
- No comprehensive test suite yet implemented
- Tests should cover both frontend components and API routes

### Future Testing Approach

- Unit tests for shared utilities and API logic
- Integration tests for API endpoints
- Component testing for React components
- E2E tests for critical user flows

## Key Features (Planned Implementation)

### Core Functionality

1. **The Log**: Infinite-scroll note feed with real-time input
2. **Magic Search**: Hybrid keyword + semantic search
3. **Auto-Clustering**: AI-powered note grouping
4. **Document Promotion**: 1-click cluster-to-document conversion
5. **Cross-device Sync**: Real-time synchronization

### AI Pipeline

- Background embedding generation for semantic search
- Periodic clustering analysis using cosine similarity
- Document structure generation via GPT-4
- Quality scoring and confidence thresholds

## Performance Requirements

- Note input lag: <200ms
- Search results: <500ms (keyword), <2s (semantic)
- AI processing: Background jobs only
- Real-time sync: WebSocket-based updates

## Monitoring & Observability

- Health check endpoint provides system status and feature flags
- Comprehensive error logging with structured format
- Environment validation prevents misconfiguration
- Service availability checks for external dependencies

## Reference Documentation

Comprehensive reference documentation is available in the `/ref` directory:

### 📚 Core References

- **[API Reference](/ref/api-reference.md)** - Complete API endpoint documentation including health checks, notes, search, clusters, and documents
- **[Database Reference](/ref/database-reference.md)** - PostgreSQL schema, Supabase integration, Prisma ORM, and vector operations
- **[Components Reference](/ref/components-reference.md)** - shadcn/ui component library, custom components, and usage patterns
- **[Type Definitions](/ref/type-definitions.md)** - Comprehensive TypeScript type system including API, database, and UI types

### 🔍 Specialized References

- **[Monitoring Reference](/ref/monitoring-reference.md)** - Vercel Analytics, Sentry error tracking, health monitoring, and alerting
- **[Testing Reference](/ref/testing-reference.md)** - Playwright E2E testing, test patterns, fixtures, and CI/CD

### 🚀 Quick Access

- **[Reference Overview](/ref/README.md)** - Navigation guide and architecture overview

These references provide detailed documentation for developers, operations teams, and QA engineers working with the Context application.

## Important Implementation Notes

- This codebase uses a unified architecture to reduce complexity and deployment overhead
- All AI features require proper API keys and should fail gracefully
- The project is designed for serverless deployment (Vercel)
- Component library strategy prioritizes shadcn/ui for consistency and performance
- TypeScript is used extensively for type safety across the full stack
