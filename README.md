# Herbarium Finance

Business finance management application built with Next.js, Supabase, and TypeScript.

## Features

- Transaction tracking (income & expenditure)
- Bank statement import (Revolut CSV)
- Pattern-based auto-categorisation
- Financial reports (P&L, cash flow, comparisons)
- Category hierarchy management
- UK formatting (GBP, April-March financial year)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack React Query
- **Language**: TypeScript

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy env file and add your Supabase credentials
cp .env.example .env.local

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

## Project Structure

```
app/                  # Next.js App Router
  (auth)/             # Authentication pages
  (dashboard)/        # Main application pages
components/           # UI components
  ui/                 # Base shadcn/ui components
  dashboard/          # Dashboard widgets
hooks/                # Custom React hooks
lib/                  # Utilities, Supabase client, report engine
supabase/             # Migrations
```

## License

MIT
