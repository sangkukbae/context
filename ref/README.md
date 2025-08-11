# Context Reference Documentation

This directory contains comprehensive reference documentation for the Context AI-powered note-taking application.

## Documentation Overview

The reference documentation is organized into the following key areas:

### 📚 **Core References**

- **[API Reference](./api-reference.md)** - Complete API endpoint documentation
- **[Database Reference](./database-reference.md)** - Database schema and Supabase integration
- **[Components Reference](./components-reference.md)** - UI component library documentation
- **[Type Definitions](./type-definitions.md)** - TypeScript type system reference

### 🔍 **Specialized References**

- **[Monitoring Reference](./monitoring-reference.md)** - Sentry, Vercel Analytics, and health monitoring
- **[Testing Reference](./testing-reference.md)** - Playwright testing framework and patterns

## Quick Navigation

### For Developers

| Task                      | Reference Document                                |
| ------------------------- | ------------------------------------------------- |
| Adding new API endpoints  | [API Reference](./api-reference.md)               |
| Working with the database | [Database Reference](./database-reference.md)     |
| Creating UI components    | [Components Reference](./components-reference.md) |
| Understanding type system | [Type Definitions](./type-definitions.md)         |
| Setting up monitoring     | [Monitoring Reference](./monitoring-reference.md) |
| Writing tests             | [Testing Reference](./testing-reference.md)       |

### For Operations

| Task                          | Reference Document                                                     |
| ----------------------------- | ---------------------------------------------------------------------- |
| Monitoring application health | [Monitoring Reference](./monitoring-reference.md#health-check-system)  |
| Debugging issues              | [Monitoring Reference](./monitoring-reference.md#troubleshooting)      |
| Database operations           | [Database Reference](./database-reference.md#database-operations)      |
| Performance tuning            | [Database Reference](./database-reference.md#performance-optimization) |

### For QA and Testing

| Task                | Reference Document                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Running test suites | [Testing Reference](./testing-reference.md#test-execution)                                    |
| Writing new tests   | [Testing Reference](./testing-reference.md#test-patterns-and-best-practices)                  |
| API testing         | [API Reference](./api-reference.md) + [Testing Reference](./testing-reference.md#api-testing) |
| Component testing   | [Components Reference](./components-reference.md#testing-components)                          |

## Architecture Overview

The Context application uses a **unified Next.js 15 + Hono.js architecture** with:

- **Frontend & Backend**: Single codebase with App Router
- **Database**: PostgreSQL via Supabase with pgvector
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Monitoring**: Vercel Analytics + Sentry + Supabase Dashboard
- **Testing**: Playwright for E2E testing
- **AI Integration**: OpenAI for embeddings and document generation

## Key Features

### 🎯 **Core Functionality**

- **The Log**: Infinite-scroll note capture system
- **Magic Search**: Hybrid keyword + semantic search
- **Auto-Clustering**: AI-powered note grouping
- **Document Promotion**: 1-click cluster-to-document conversion
- **Cross-device Sync**: Real-time synchronization

### 🔧 **Technical Features**

- **Type Safety**: Comprehensive TypeScript coverage
- **Real-time Updates**: Supabase Realtime integration
- **Vector Search**: pgvector for semantic search
- **Performance Monitoring**: Health checks and alerting
- **Accessibility**: WCAG compliant UI components

## Getting Started

1. **Read the main project documentation**: Start with `/CLAUDE.md` for project overview
2. **Choose your reference**: Pick the relevant reference document from the list above
3. **Follow examples**: Each reference includes practical examples and usage patterns
4. **Check related docs**: Cross-reference related documentation as needed

## Documentation Standards

All reference documentation follows these standards:

- **Comprehensive Coverage**: Complete API/feature documentation
- **Practical Examples**: Real-world usage examples
- **Type Safety**: Full TypeScript integration
- **Testing Guidance**: Testing patterns and best practices
- **Troubleshooting**: Common issues and solutions
- **Performance Notes**: Performance considerations and optimization

## Contributing

When adding new features or making changes:

1. **Update relevant reference docs** - Keep documentation in sync with code
2. **Add examples** - Include practical usage examples
3. **Update type definitions** - Maintain comprehensive type coverage
4. **Add tests** - Include test patterns in testing reference
5. **Performance notes** - Document performance implications

## External Resources

- **[Next.js 15 Documentation](https://nextjs.org/docs)**
- **[Supabase Documentation](https://supabase.com/docs)**
- **[shadcn/ui Documentation](https://ui.shadcn.com/)**
- **[Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)**
- **[Playwright Documentation](https://playwright.dev/)**
- **[Vercel Analytics](https://vercel.com/docs/analytics)**

## Maintenance

This reference documentation is maintained alongside the codebase and should be:

- **Updated with each release** - Keep docs current with features
- **Reviewed regularly** - Ensure accuracy and completeness
- **Validated with examples** - Test code examples for correctness
- **Optimized for searchability** - Maintain clear structure and indexing

For questions about this documentation or suggestions for improvements, please refer to the main project documentation or create an issue in the project repository.
