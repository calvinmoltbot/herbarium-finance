# HDW Finance - Brownfield Architecture Document

## Introduction

This document captures the **CURRENT STATE** of the HDW Finance codebase, a production-ready personal finance management system. It reflects the actual implementation, including patterns, conventions, technical debt, and real-world constraints. This serves as a reference for AI agents and developers working on enhancements.

### Document Scope

Comprehensive documentation of the entire system, covering all major features and modules.

### Change Log

| Date       | Version | Description                 | Author  |
| ---------- | ------- | --------------------------- | ------- |
| 2025-10-22 | 1.0     | Initial brownfield analysis | Winston |

---

## Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

**Main Entry Points:**
- **Root Layout**: `app/layout.tsx` - Global providers (QueryProvider, Toaster)
- **Dashboard Layout**: `app/(dashboard)/layout.tsx` - Auth, DateFilter, Sidebar
- **Auth Pages**: `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`

**Configuration:**
- **Environment**: `.env.local` (Supabase URL and anon key)
- **Next.js Config**: `next.config.ts`
- **Tailwind Config**: `tailwind.config.ts`
- **Package Management**: `package.json`

**Core Business Logic:**
- **Hooks**: `hooks/` - All data fetching and mutations using TanStack Query
- **Supabase Client**: `supabase/client.ts` - Browser client creation
- **Supabase Server**: `supabase/server.ts` - Server-side client
- **Pattern Matcher**: `lib/pattern-matcher.ts` - Categorization engine
- **Revolut Parser**: `lib/revolut-parser.ts` - Bank CSV parsing
- **Transaction Matcher**: `lib/transaction-matcher.ts` - Duplicate detection

**Database Models:**
- **Schema**: `supabase/migrations/001_initial_schema.sql` - Base schema
- **Hierarchies**: `scripts/category-hierarchy-schema.sql`
- **Bank Import**: `scripts/bank-import-enhancement-schema.sql`
- **User Preferences**: `scripts/user-preferences-schema.sql`
- **Types**: `lib/types.ts` - TypeScript interfaces

**Key Feature Areas:**
- **Dashboard**: `app/(dashboard)/dashboard/page.tsx`
- **Transactions**: `app/(dashboard)/transactions/page.tsx`
- **Categories**: `app/(dashboard)/categories/page.tsx`
- **Reports**: `app/(dashboard)/reports/**/*`
- **Bank Import**: `app/(dashboard)/import/revolut/page.tsx`
- **Pattern Management**: `app/(dashboard)/patterns/page.tsx`

---

## High Level Architecture

### Technical Summary

HDW Finance is a **modern, full-stack personal finance application** built with:
- **Next.js 15.1.6** (App Router) with **React 19** and **TypeScript**
- **Supabase** for backend (PostgreSQL, Authentication, Row Level Security)
- **TanStack Query** for client-state management and caching
- **Tailwind CSS** for styling with custom component library

**Architecture Pattern**: Server-side rendering with client-side hydration, API routes for custom endpoints, real-time database subscriptions via Supabase.

### Actual Tech Stack

| Category              | Technology              | Version | Notes                                        |
| --------------------- | ----------------------- | ------- | -------------------------------------------- |
| **Runtime**           | Node.js                 | 18+     | Required for Next.js 15                      |
| **Framework**         | Next.js                 | 15.1.6  | App Router, Turbopack dev mode               |
| **Language**          | TypeScript              | 5.x     | Strict mode enabled                          |
| **UI Library**        | React                   | 19.0.0  | Latest stable                                |
| **Styling**           | Tailwind CSS            | 3.4.1   | Custom configuration                         |
| **Backend/Database**  | Supabase                | 2.48.1  | PostgreSQL + Auth + Storage                  |
| **Auth**              | Supabase Auth           | SSR     | Built-in with Supabase                       |
| **State Management**  | TanStack Query          | 5.66.3  | React Query for server state                 |
| **Forms**             | React Hook Form         | 7.54.2  | With Zod validation                          |
| **Validation**        | Zod                     | 3.24.1  | Schema validation                            |
| **Drag & Drop**       | @dnd-kit                | 6.3.1   | Hierarchy reordering                         |
| **Date Handling**     | date-fns                | 4.1.0   | Date formatting and manipulation             |
| **CSV Parsing**       | PapaParse               | 5.5.3   | Bank CSV import                              |
| **UI Components**     | Radix UI                | Various | Headless components                          |
| **Icons**             | Lucide React            | 0.474.0 | Icon library                                 |
| **Notifications**     | Sonner                  | 1.7.4   | Toast notifications                          |
| **Package Manager**   | pnpm                    | Latest  | Preferred over npm/yarn                      |
| **Deployment Target** | Vercel                  | -       | Optimized for Vercel platform                |

### Repository Structure Reality Check

- **Type**: Monorepo (single Next.js app)
- **Package Manager**: pnpm (with workspace features)
- **Build Tool**: Turbopack (dev), Webpack (production)
- **Notable Decisions**:
  - Uses Next.js App Router (not Pages Router)
  - Route groups for organization: `(auth)` and `(dashboard)`
  - Server and client components strategically separated
  - Custom hooks pattern for all data operations

---

## Source Tree and Module Organization

### Project Structure (Actual)

```text
hdw-finance_new/
├── app/                           # Next.js 15 App Router
│   ├── (auth)/                    # Auth route group (no sidebar)
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── error/
│   ├── (dashboard)/               # Main app route group (with sidebar)
│   │   ├── dashboard/             # Main dashboard
│   │   ├── transactions/          # Transaction list
│   │   ├── categories/            # Category & hierarchy management
│   │   ├── patterns/              # Categorization pattern management
│   │   ├── import/                # CSV import system
│   │   │   ├── revolut/           # Revolut bank import flow
│   │   │   ├── shopify/           # Shopify import (future)
│   │   │   └── transactions/      # Generic transaction import
│   │   ├── reports/               # Financial reports
│   │   │   ├── financial/         # P&L, KPIs
│   │   │   ├── transactions/      # Transaction reports
│   │   │   └── standard-pl/       # Standard P&L format
│   │   ├── add-income/            # Quick add income
│   │   ├── add-expenditure/       # Quick add expenditure
│   │   ├── transaction-notes/     # Transaction metadata editing
│   │   └── account/               # User account settings
│   ├── api/                       # API routes
│   │   ├── health/                # Health check endpoint
│   │   └── patterns/              # Pattern testing endpoint
│   ├── layout.tsx                 # Root layout (providers)
│   └── globals.css                # Global styles
├── components/                    # Reusable UI components
│   ├── ui/                        # Base Radix UI components (shadcn-style)
│   ├── dashboard/                 # Dashboard-specific components
│   ├── categories/                # Category management components
│   ├── hierarchy/                 # Drag & drop hierarchy components
│   ├── transactions/              # Transaction components
│   ├── import/                    # Import flow components
│   ├── patterns/                  # Pattern management components
│   ├── reports/                   # Report components
│   ├── account/                   # Account components
│   ├── query-provider.tsx         # TanStack Query provider
│   └── user-auth-state.tsx        # Auth state management
├── hooks/                         # Custom React hooks (data layer)
│   ├── use-categories.ts          # Category CRUD
│   ├── use-category-hierarchies.ts # Hierarchy management
│   ├── use-categorization-patterns.ts # Pattern CRUD
│   ├── use-category-suggestions.ts # AI categorization
│   ├── use-transaction-metadata.ts # Transaction metadata
│   ├── use-dashboard-stats.ts     # Dashboard statistics
│   ├── use-revolut-import.ts      # Revolut import logic
│   ├── use-unallocated-categories.ts # Detect unassigned categories
│   ├── use-user-preferences.ts    # User preferences
│   └── import/                    # Import-specific hooks
├── lib/                           # Utilities and contexts
│   ├── auth-context.tsx           # Authentication context provider
│   ├── date-filter-context.tsx    # Global date filtering
│   ├── pattern-matcher.ts         # Pattern matching engine
│   ├── transaction-matcher.ts     # Duplicate detection
│   ├── revolut-parser.ts          # CSV parser for Revolut
│   ├── reports-data-engine.ts     # Report data aggregation
│   ├── types.ts                   # Core TypeScript types
│   ├── utils.ts                   # Utility functions (cn, etc.)
│   └── csv-export.ts              # CSV export utilities
├── supabase/                      # Database client and migrations
│   ├── client.ts                  # Browser client
│   ├── server.ts                  # Server-side client
│   ├── middleware.ts              # Auth middleware
│   └── migrations/
│       └── 001_initial_schema.sql # Base database schema
├── scripts/                       # Database migration scripts
│   ├── bank-import-enhancement-schema.sql
│   ├── category-hierarchy-schema.sql
│   ├── user-preferences-schema.sql
│   ├── seed-data.sql
│   └── [various migration scripts]
├── docs/                          # Documentation
│   ├── architecture.md            # This file
│   ├── stories/                   # BMad user stories
│   └── Archive Docs/              # Archived documentation
├── public/                        # Static assets
├── .bmad-core/                    # BMad agent system
│   ├── agents/                    # Agent definitions
│   ├── tasks/                     # Task workflows
│   ├── checklists/                # Quality checklists
│   └── templates/                 # Document templates
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── next.config.ts                 # Next.js configuration
├── .env.local                     # Environment variables (gitignored)
└── README.md                      # Project README
```

### Key Modules and Their Purpose

**Authentication & User Management:**
- `lib/auth-context.tsx` - Global auth state, user management
- `supabase/middleware.ts` - Route protection and session refresh
- `app/(auth)/**` - Login, registration, password reset flows

**Data Layer (Hooks):**
- ALL data fetching uses TanStack Query pattern
- Hooks encapsulate Supabase queries and mutations
- Consistent error handling with toast notifications
- Query invalidation for real-time updates

**Component Organization:**
- `components/ui/` - Base components (Button, Card, Input, etc.)
- Feature-specific folders match route structure
- Server components by default, client components marked with 'use client'

**Business Logic:**
- `lib/pattern-matcher.ts` - Core categorization engine (regex-based)
- `lib/transaction-matcher.ts` - Duplicate detection using multiple fields
- `lib/reports-data-engine.ts` - Complex report data aggregation
- `lib/revolut-parser.ts` - Bank CSV parsing with normalization

---

## Data Models and Database Schema

### Database Tables

**Core Tables:**
- `users` - User profiles (extends auth.users)
- `categories` - Income/Expenditure/Capital categories
- `transactions` - Financial transactions
- `category_hierarchies` - P&L report hierarchies
- `category_hierarchy_assignments` - Category-to-hierarchy mapping
- `transaction_metadata` - User notes, tags, extended descriptions
- `categorization_patterns` - Auto-categorization patterns
- `user_preferences` - UI state preferences
- `import_history` - Track import operations (implicit from logic)

**Table Relationships:**
```
users (auth.users)
  ↓
  ├─→ categories (user_id)
  │     ↓
  │     ├─→ transactions (category_id)
  │     │     ↓
  │     │     └─→ transaction_metadata (transaction_id)
  │     │
  │     ├─→ category_hierarchy_assignments (category_id)
  │     └─→ categorization_patterns (category_id)
  │
  ├─→ category_hierarchies (user_id)
  │     ↓
  │     └─→ category_hierarchy_assignments (hierarchy_id)
  │
  └─→ user_preferences (user_id)
```

### Data Models

**Instead of duplicating, reference actual model files:**

- **Core Types**: See `lib/types.ts`
  ```typescript
  User, Category, Transaction, DashboardStats,
  MonthlyData, CategoryBreakdown
  ```

- **Revolut Types**: See `lib/revolut-types.ts`
  ```typescript
  RevolutTransaction, RevolutImportState, ParsedTransaction
  ```

- **Report Types**: See `lib/reports-types.ts`
  ```typescript
  ReportConfig, ReportData, HierarchyData
  ```

- **Hook Interfaces**: Each hook file defines its own interfaces
  ```typescript
  // Example from use-categories.ts
  CreateCategoryData, UpdateCategoryData
  ```

### Row Level Security (RLS)

**CRITICAL**: All tables have RLS enabled with user_id policies:
- Users can ONLY view/modify their own data
- Policies use `auth.uid() = user_id` check
- Foreign key constraints ensure data integrity
- Migration scripts use DO blocks to avoid duplicate policies

**Important**: When adding new tables, ALWAYS:
1. Add `user_id UUID REFERENCES auth.users(id) NOT NULL`
2. Enable RLS: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY`
3. Create SELECT, INSERT, UPDATE, DELETE policies
4. Add indexes on `user_id` for performance

---

## API Specifications

### Supabase REST API

The application uses Supabase's auto-generated REST API for all database operations.

**Client-Side**: `createClient()` from `supabase/client.ts`
**Server-Side**: `createClient()` from `supabase/server.ts` (with cookies)

**Pattern**:
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', user.id);
```

### Custom API Routes

**Health Check:**
- **Endpoint**: `/api/health`
- **Purpose**: System health monitoring
- **Method**: GET

**Pattern Testing:**
- **Endpoint**: `/api/patterns`
- **Purpose**: Test categorization patterns
- **Method**: POST
- **Payload**: `{ pattern: string, description: string }`

### No External API Integrations (Yet)

Currently, all data operations are against Supabase. Future integrations planned:
- Bank APIs (Open Banking)
- Payment processors
- Accounting software exports

---

## Feature Modules Deep Dive

### 1. Authentication System

**Location**: `app/(auth)/**`, `lib/auth-context.tsx`

**Flow**:
1. User submits credentials → Supabase Auth
2. Session stored in cookies (SSR-compatible)
3. `AuthProvider` manages global auth state
4. Middleware protects dashboard routes
5. Auto-creates default categories on registration

**Key Files**:
- `app/(auth)/login/page.tsx` - Login form
- `app/(auth)/register/page.tsx` - Registration with default categories
- `lib/auth-context.tsx` - Context provider
- `supabase/middleware.ts` - Route protection

### 2. Dashboard & Analytics

**Location**: `app/(dashboard)/dashboard/page.tsx`

**Features**:
- Real-time financial statistics
- Monthly income/expenditure trends
- Category breakdowns with charts
- Date range filtering (context-based)

**Data Sources**:
- `hooks/use-dashboard-stats.ts` - Aggregate statistics
- `hooks/use-monthly-data.ts` - Time-series data
- `hooks/use-category-breakdown.ts` - Category analysis

**Charts**: Uses Recharts library for visualization

### 3. Transaction Management

**Location**: `app/(dashboard)/transactions/page.tsx`

**Features**:
- Paginated transaction list
- Advanced filtering (date, category, type)
- Inline editing
- Bulk operations
- Transaction metadata (notes, tags)

**Key Components**:
- `components/transactions/enhanced-transaction-list.tsx`
- `components/transactions/transaction-detail-panel.tsx`
- `components/transactions/category-suggestion-card.tsx`

**Hooks**:
- `hooks/use-recent-transactions.ts` - Fetch with pagination
- `hooks/use-transaction-metadata.ts` - Metadata CRUD

### 4. Category & Hierarchy Management

**Location**: `app/(dashboard)/categories/page.tsx`

**Features**:
- Create/Edit/Delete categories
- Drag & drop hierarchy ordering
- Visual P&L preview
- Unallocated category detection
- Bulk category assignment

**Drag & Drop**:
- Uses `@dnd-kit` library
- Live P&L preview as you reorder
- Persists `display_order` to database

**Key Components**:
- `components/hierarchy/hierarchy-reorder.tsx`
- `components/hierarchy/collapsible-pl-preview.tsx`
- `components/categories/unallocated-categories-panel.tsx`

**Hooks**:
- `hooks/use-category-hierarchies.ts` - Hierarchy CRUD and reordering
- `hooks/use-unallocated-categories.ts` - Detect unassigned categories

### 5. Bank Import System (Revolut)

**Location**: `app/(dashboard)/import/revolut/**`

**Flow**:
1. **Upload**: User uploads Revolut CSV
2. **Parse**: `lib/revolut-parser.ts` parses and normalizes
3. **Reconciliation**: Match to existing transactions, suggest categories
4. **Review**: User reviews suggestions, adds metadata
5. **Commit**: Insert transactions with metadata

**Key Features**:
- Duplicate detection using transaction matcher
- Pattern-based categorization with confidence scoring
- Bulk metadata entry
- Import history tracking

**Key Files**:
- `lib/revolut-parser.ts` - CSV parsing with normalization
- `lib/transaction-matcher.ts` - Duplicate detection
- `lib/pattern-matcher.ts` - Auto-categorization
- `hooks/use-revolut-import.ts` - Import state management
- `hooks/use-commit-import.ts` - Final commit logic

**Pattern Matching**:
- Regex-based patterns stored in `categorization_patterns` table
- Confidence scores improve with usage
- User can test patterns before applying

### 6. Pattern Management

**Location**: `app/(dashboard)/patterns/page.tsx`

**Features**:
- Create/Edit/Delete categorization patterns
- Test patterns against sample descriptions
- View pattern performance (match count, confidence)
- Bulk pattern operations

**Pattern Engine**:
- Regex-based matching
- Case-insensitive by default
- Supports complex patterns
- Confidence scoring based on historical accuracy

**Key Files**:
- `lib/pattern-matcher.ts` - Core engine
- `hooks/use-categorization-patterns.ts` - Pattern CRUD
- `hooks/use-category-suggestions.ts` - Get suggestions for transactions
- `components/patterns/pattern-management.tsx`

### 7. Financial Reports

**Location**: `app/(dashboard)/reports/**`

**Report Types**:
1. **Profit & Loss** - Hierarchical P&L with capital movements
2. **Transaction Reports** - Detailed income/expenditure lists
3. **KPI Dashboard** - Key performance indicators
4. **Standard P&L** - Traditional P&L format

**Key Features**:
- Date range filtering
- Collapsible hierarchies
- Export to CSV
- Real-time calculations

**Data Engine**:
- `lib/reports-data-engine.ts` - Complex aggregations
- Handles hierarchy summing
- Separates operational vs. capital
- UK currency formatting

**Key Files**:
- `app/(dashboard)/reports/financial/profit-loss/page.tsx`
- `app/(dashboard)/reports/financial/kpis/page.tsx`
- `components/reports/` - Report components

---

## Technical Debt and Known Issues

### Known Technical Debt

1. **Migration Script Management**
   - **Issue**: Multiple SQL scripts in `scripts/` folder, manual execution required
   - **Impact**: No automated migration tracking
   - **Mitigation**: Scripts include idempotent checks (DO blocks for policies)
   - **Future**: Consider Supabase CLI migrations

2. **Pattern Matching Performance**
   - **Issue**: Regex matching in JavaScript can be slow for large datasets
   - **Impact**: Import reconciliation may slow with 1000+ transactions
   - **Mitigation**: Currently acceptable for typical usage
   - **Future**: Consider PostgreSQL regex or full-text search

3. **CSV Parser Fragility**
   - **Issue**: Revolut parser assumes specific CSV format
   - **Impact**: Breaks if Revolut changes CSV structure
   - **Location**: `lib/revolut-parser.ts`
   - **Mitigation**: Normalization logic handles some variations
   - **Future**: Version detection or configurable mapping

4. **Date Filter Context Coupling**
   - **Issue**: `DateFilterProvider` is global, affects all pages
   - **Impact**: Can cause unexpected filtering on non-report pages
   - **Location**: `lib/date-filter-context.tsx`
   - **Mitigation**: Only used where needed, but tightly coupled

5. **No E2E Testing**
   - **Issue**: No automated testing coverage
   - **Impact**: Manual testing required for regression
   - **Mitigation**: Careful code review, staging environment
   - **Future**: Implement Playwright or Cypress

### Workarounds and Gotchas

**Environment Variables:**
- MUST set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Missing variables cause silent failures in Supabase client creation

**Supabase Client Creation:**
- Use `supabase/client.ts` for client components
- Use `supabase/server.ts` for server components
- NEVER mix the two - will cause auth issues

**React Query Cache:**
- Query keys MUST include `user?.id` for multi-user safety
- Invalidate queries after mutations to trigger refetch
- Example: `queryKey: ['categories', user?.id]`

**RLS Policies:**
- Always test policies with multiple users
- Missing `user_id` filter will fail RLS checks
- Use Supabase SQL Editor to test policies

**Drag & Drop State:**
- `@dnd-kit` requires client component
- State must be controlled for optimistic updates
- Use `onDragEnd` to persist changes

**Date Handling:**
- PostgreSQL stores dates in UTC
- Frontend uses `date-fns` for UK formatting
- Always convert to user timezone for display

**Capital Transactions:**
- Type 'capital' is a later addition (not in original migration)
- Some queries may not filter correctly if not updated
- Check scripts/add-capital-type-to-hierarchies.sql for history

---

## Integration Points and External Dependencies

### External Services

| Service       | Purpose       | Integration Type | Key Files                       | Status     |
| ------------- | ------------- | ---------------- | ------------------------------- | ---------- |
| Supabase      | Backend/Auth  | SDK              | `supabase/client.ts`            | Production |
| Vercel        | Deployment    | Platform         | `vercel.json` (if exists)       | Planned    |

### Internal Integration Points

**Frontend ↔ Supabase:**
- REST API via Supabase client
- Real-time subscriptions (not currently used, but available)
- Authentication via cookies (SSR-compatible)

**Client ↔ Server Components:**
- Server components fetch data server-side
- Client components use TanStack Query
- Props passed from server to client for initial data

**Context Providers:**
- `AuthProvider` - User authentication state
- `DateFilterProvider` - Global date range filtering
- `QueryProvider` - TanStack Query client

---

## Development and Deployment

### Local Development Setup

**Prerequisites:**
1. Node.js 18+ installed
2. pnpm installed (`npm install -g pnpm`)
3. Supabase account created
4. Git installed

**Setup Steps:**
```bash
# 1. Clone repository
git clone <repo-url>
cd hdw-finance_new

# 2. Install dependencies
pnpm install

# 3. Create .env.local
cp .env.example .env.local
# Edit .env.local with Supabase credentials

# 4. Run database migrations
# - Go to Supabase SQL Editor
# - Run supabase/migrations/001_initial_schema.sql
# - Run scripts/category-hierarchy-schema.sql
# - Run scripts/bank-import-enhancement-schema.sql
# - Run scripts/user-preferences-schema.sql

# 5. Start development server
pnpm dev
```

**Development Server:**
- Runs on `http://localhost:3000`
- Uses Turbopack for fast HMR
- Watch mode for all file changes

### Build and Deployment Process

**Build Commands:**
```bash
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

**Deployment Targets:**
- **Vercel** (recommended) - Zero-config deployment
- **Docker** (possible) - Would need Dockerfile
- **Self-hosted** - Node.js server required

**Build Artifacts:**
- `.next/` folder contains optimized build
- Server and client bundles separated
- Static assets in `.next/static/`

### Database Management

**Migration Strategy:**
- SQL scripts in `scripts/` folder
- Manual execution via Supabase SQL Editor
- No automated migration tool (yet)

**Backup Strategy:**
- Supabase automatic backups (on paid plan)
- Export via Supabase dashboard
- CSV export for transaction data via app UI

**Seeding:**
- Default categories created on user registration
- See `supabase/migrations/001_initial_schema.sql` function `create_default_categories()`
- Optional seed data in `scripts/seed-data.sql`

---

## Testing Reality

### Current Test Coverage

- **Unit Tests**: None
- **Integration Tests**: None
- **E2E Tests**: None
- **Manual Testing**: Primary QA method

### Development Testing Approach

**Manual Testing Checklist:**
1. Auth flows (login, register, logout)
2. Category CRUD operations
3. Transaction CRUD operations
4. Import flow with sample Revolut CSV
5. Pattern creation and testing
6. Report generation with various date ranges
7. Drag & drop hierarchy reordering

**Browser Testing:**
- Chrome (primary)
- Safari (secondary)
- Firefox (occasional)
- Mobile responsive (Chrome DevTools)

### Running Quality Checks

```bash
# Linting
pnpm lint

# Type checking
npx tsc --noEmit

# Build test
pnpm build
```

---

## Code Patterns and Conventions

### React Patterns

**Server vs Client Components:**
- Default to server components
- Use `'use client'` directive only when needed:
  - Event handlers
  - State (useState, useReducer)
  - Effects (useEffect)
  - Browser APIs
  - Custom hooks

**Hook Patterns:**
```typescript
// Standard pattern for data fetching hooks
export function useResource() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resource', user?.id],
    queryFn: async () => {
      // Supabase query
    },
    enabled: !!user?.id,
  });
}
```

**Mutation Pattern:**
```typescript
export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      // Supabase insert/update
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource'] });
      toast.success('Success message');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
```

### TypeScript Conventions

- Strict mode enabled
- Interfaces for data models
- Types for props and return values
- No `any` types (use `unknown` if necessary)
- Zod schemas for form validation

### Styling Conventions

- Tailwind utility classes (no custom CSS except globals.css)
- Component variants using `class-variance-authority`
- Responsive design with mobile-first approach
- UK-specific formatting (£ symbol, DD/MM/YYYY dates)

### File Naming

- `kebab-case` for files and folders
- `PascalCase` for components
- `camelCase` for functions and variables
- `UPPER_CASE` for constants

---

## Performance Considerations

### Query Optimization

**Indexes**:
- All foreign keys have indexes
- Date fields indexed for report queries
- User_id indexed on all tables

**Query Patterns**:
- Select only needed columns
- Use pagination for large datasets
- Leverage TanStack Query caching
- Prefetch on route transitions (potential future optimization)

### Bundle Size

**Current State**:
- Reasonable bundle size with code splitting
- Route-based code splitting via Next.js
- Dynamic imports for heavy components (potential optimization)

**Optimization Opportunities**:
- Lazy load report components
- Optimize Recharts bundle (currently full import)
- Consider lighter date library (date-fns is 66KB)

### Database Performance

**RLS Impact**:
- Row Level Security adds minimal overhead
- All queries properly scoped to user_id
- Indexes ensure fast lookups

**Query Complexity**:
- P&L reports do complex aggregations
- Reports data engine caches calculations
- Consider database views for complex reports (future)

---

## Security Considerations

### Authentication

- Supabase Auth with secure session management
- Cookies for SSR-compatible auth
- Session refresh handled by middleware
- No password stored client-side

### Authorization

- Row Level Security on ALL tables
- No client-side auth bypass possible
- Supabase enforces policies at database level
- User can ONLY access their own data

### Data Validation

- Zod schemas for all form inputs
- Server-side validation via Supabase constraints
- SQL injection prevented by Supabase parameterized queries
- XSS prevented by React's built-in escaping

### Environment Security

- Secrets in `.env.local` (gitignored)
- Only public (anon) key in client code
- No service role key in client bundle
- HTTPS enforced in production

---

## Appendix - Useful Commands and Scripts

### Frequently Used Commands

```bash
# Development
pnpm dev              # Start dev server with Turbopack
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Custom Scripts
pnpm learn-patterns   # Learn categorization patterns from transaction history
```

### Database Scripts

**Location**: `scripts/` folder

**Key Scripts**:
- `bank-import-enhancement-schema.sql` - Transaction metadata and patterns
- `category-hierarchy-schema.sql` - Hierarchy management
- `user-preferences-schema.sql` - UI preferences storage
- `seed-data.sql` - Sample data for testing
- `fix-rls-policies.sql` - RLS policy fixes

**Execution**: Copy and paste into Supabase SQL Editor

### Debugging and Troubleshooting

**Logs**:
- Browser console for client errors
- Vercel logs for server errors (when deployed)
- Supabase logs for database queries

**Common Issues**:

1. **"User not authenticated" errors**
   - Check `.env.local` has correct Supabase credentials
   - Clear cookies and re-login
   - Check middleware.ts is protecting routes

2. **RLS policy violations**
   - Ensure query includes user_id filter
   - Check user is authenticated
   - Verify policy exists for operation

3. **Build failures**
   - Run `pnpm install` to ensure dependencies
   - Check TypeScript errors: `npx tsc --noEmit`
   - Clear `.next` folder: `rm -rf .next`

4. **Import reconciliation slow**
   - Reduce batch size
   - Optimize pattern matching in `lib/pattern-matcher.ts`
   - Consider server-side processing for large imports

---

## Future Enhancement Considerations

### Planned Features (from PROJECT_RESUME.md)

1. **Testing & Refinement**
   - Validate bank import with real data
   - Refine confidence scoring algorithms
   - Performance optimization for large datasets

2. **Additional Bank Formats**
   - Barclays, HSBC, Lloyds, NatWest CSV
   - Generic CSV with column mapping
   - OFX and QIF file formats

3. **Analytics Dashboard**
   - Pattern performance metrics
   - Categorization accuracy trends
   - Import history statistics

4. **Mobile Optimization**
   - Mobile-responsive transaction panels
   - Touch-friendly pattern management
   - PWA capabilities

### Architecture Evolution

**Current State**: Monolithic Next.js app with Supabase backend

**Potential Future State**:
- Microservices for heavy processing (pattern learning, report generation)
- Background jobs for scheduled tasks
- Real-time websockets for collaborative features
- Mobile app with shared backend

---

## Document Maintenance

This document should be updated when:
- New major features are added
- Database schema changes
- Tech stack updates
- Performance optimizations are implemented
- Known issues are resolved or new ones discovered

**Last Updated**: 2025-10-22 by Winston (Architect AI Agent)
