# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

HiddyStays is a zero-fee property rental platform built with Next.js 15, TypeScript, Supabase, and Stripe. The platform connects property owners (hosts) directly with guests, with hosts keeping 100% of earnings.

**Tech Stack:**
- Next.js 15 (App Router) + React 18
- TypeScript 5.5
- Supabase (PostgreSQL + Auth + Realtime)
- Stripe for payments
- Resend for emails
- Tailwind CSS + Radix UI (shadcn/ui)

## Common Development Commands

### Development & Building
```powershell
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Type checking
npm run type-check

# Watch mode type checking
npm run type-check:watch

# Linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Testing
```powershell
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Feature-specific test scripts
npm run test:property-approval
npm run test:payment-status
npm run test:reviews
npm run test:roles
npm run test:all-features
npm run test:comprehensive
```

### Database & Setup
```powershell
# Create admin user
npm run create:admin

# Setup development environment
npm run setup:dev

# Setup mock data
npm run setup:mock

# Setup sample properties
npm run setup:properties

# Seed dummy data
npm run seed:dummy

# Apply database migrations
npm run migrate:auto

# Check migration status
npm run check:migration
```

### Cache Management
```powershell
# Clear all cache (Windows PowerShell)
npm run clean

# Clear Next.js cache only
npm run clean:cache
```

## Architecture & Code Organization

### Core Application Structure

**Next.js App Router** (`app/`)
- **Pages:** Uses App Router with route groups `(auth)` and `(dashboard)` for layout organization
- **API Routes:** 64+ REST endpoints organized by domain (`admin/`, `bookings/`, `properties/`, `payments/`, etc.)
- **Middleware:** `middleware.ts` handles authentication, role-based access control (RBAC), rate limiting, and profile caching

**Components** (`components/`)
- **UI Primitives:** 56+ shadcn/ui components in `components/ui/`
- **Feature Components:** Organized by domain (`auth/`, `admin/`, `booking/`, `property/`, `shared/`)
- **Active Hero:** `StreamlinedHero.tsx` is the currently used hero component

**Business Logic** (`lib/`, `services/`, `hooks/`)
- **lib/:** Core utilities including auth, Supabase clients, email services, caching, validation
- **services/:** Domain services (analytics, booking management, payments, property, maps, offline booking)
- **hooks/:** React hooks for state management and business logic (useAuth, useMFA, useHostAnalytics, usePlatformAnalytics, usePWA)

### Authentication & Authorization

**Role-Based Access Control (RBAC):**
- **Roles:** `guest`, `host`, `admin` (hierarchical with admin > host > guest)
- **Source of Truth:** `profiles` table in Supabase (NOT user metadata)
- **Middleware:** Implements profile caching (5-minute TTL) to reduce database calls
- **Route Protection:**
  - `/admin/*` - Admin only
  - `/host-dashboard/*` - Host or Admin
  - `/auth/*` - Public (redirects authenticated users)
  - Root and `/properties/*` - Public

**Important:** Always query the `profiles` table for role checks in API routes. Use `AuthUtils.getUserRoleFromProfile()` for server-side role verification.

### Supabase Integration

**Client Types:**
- **Client-side:** `lib/supabase.ts` - Uses anonymous key with localStorage session persistence
- **Server-side:** `createServerSupabaseClient()` - Uses service role key for privileged operations
- **Middleware:** Creates per-request SSR client with cookie-based auth

**Database Schema:**
- `profiles` - User profiles with role and is_host flags
- `properties` - Property listings with host references
- `bookings` - Bookings with payment_status enum (pending, paid, failed, refunded)
- `notifications` - User notifications
- `messages` - Real-time messaging (Supabase Realtime enabled)

**Key Features:**
- Row Level Security (RLS) policies for data isolation
- Realtime subscriptions for live updates
- Edge Functions for email service

### Payment System Architecture

**Stripe Integration:**
- **Flow:** Checkout Sessions → Payment Intents → Webhook verification → Booking update
- **Payment Methods:** Cards, Apple Pay, Google Pay, bank transfers
- **Fee Structure:** 0% platform fee, ~2.9% + $0.30 Stripe processing fee
- **Webhook Handling:** `/api/payments/webhook/route.ts` processes payment events
- **Security:** Webhook signature verification, CSRF tokens for sensitive operations

**Payment Status Tracking:** The `bookings.payment_status` field is the source of truth. Update it via webhooks, not directly in payment flow.

### Email System

**Provider:** Resend API
**Templates:** Located in `emails/` directory using React Email components
**Service:** `lib/email/unified-email-service.ts` handles all email sending
**Template Types:**
- Booking confirmation (guest)
- Host notification (new booking)
- Payment receipt
- Welcome email
- Check-in reminders
- Password reset

### Image Optimization

**Next.js Image Component:**
- Automatic WebP/AVIF conversion
- Remote patterns configured for: Unsplash, Cloudinary, Google, Supabase storage
- Responsive sizes: 640, 750, 828, 1080, 1200, 1920, 2048, 3840
- 1-year cache TTL for optimized images

### Performance Optimizations

**Middleware:**
- Profile caching (5-minute TTL) reduces database calls by ~70%
- Rate limiting on auth routes (60 requests per 5 minutes per IP)
- Skips Supabase client creation for public routes

**Next.js Config:**
- Code splitting with vendor and common chunks
- Package import optimization for lucide-react, Radix UI, recharts
- Console removal in production builds
- Deterministic module/chunk IDs for better caching

**Build Optimizations:**
- Tree shaking and minification
- Image optimization with WebP/AVIF
- Automatic static optimization where possible

## Development Guidelines

### When Writing API Routes

1. **Always verify authentication:**
   ```typescript
   const { data: { session }, error } = await supabase.auth.getSession();
   if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   ```

2. **Check roles using profiles table:**
   ```typescript
   const { role, isHost, error } = await AuthUtils.getUserRoleFromProfile(supabase, session.user.id);
   if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
   ```

3. **Use server-side Supabase client for privileged operations:**
   ```typescript
   import { createServerSupabaseClient } from "@/lib/supabase";
   const adminClient = createServerSupabaseClient();
   ```

4. **Validate inputs with Zod schemas** (see `lib/auth-validation.ts` for examples)

5. **Handle errors consistently:**
   ```typescript
   return NextResponse.json({ error: "Error message" }, { status: 500 });
   ```

### When Modifying Middleware

- The middleware uses an in-memory profile cache to avoid excessive database queries
- Cache invalidation: Call `invalidateProfileCache(userId)` when updating user roles
- Profile cache TTL is 5 minutes (configurable via `CACHE_TTL`)
- Rate limiting state is also in-memory and will reset on deployment

### Working with Supabase

**Migrations:** Located in `supabase/migrations/` (33 migration files)
- Apply via Supabase dashboard SQL Editor or `npm run migrate:auto`
- Migration naming convention: `YYYYMMDDHHMMSS_description.sql`

**RLS Policies:** Query policies are enforced at database level. Test with appropriate role context.

**Realtime:** Enabled on `messages` and `bookings` tables. Use subscriptions in components:
```typescript
const subscription = supabase
  .channel('channel-name')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' }, handler)
  .subscribe();
```

### State Management Patterns

- **Context API:** Used for global auth state (`hooks/useAuth.tsx`)
- **TanStack Query:** For server state caching and synchronization
- **Local State:** React hooks (useState, useReducer) for component-level state
- **Real-time Subscriptions:** Supabase realtime for live updates

### Component Development

- Use shadcn/ui components from `components/ui/` as building blocks
- Follow existing patterns for feature components (see `components/booking/`, `components/property/`)
- Ensure mobile responsiveness (mobile-first design)
- Use Tailwind CSS utilities, not custom CSS
- Components should be typed with TypeScript interfaces

### Testing Strategy

**Unit Tests:** Jest + React Testing Library
- Test files: `__tests__/` directory
- Component tests: `__tests__/components/`
- Setup: `jest.setup.js` and `__tests__/setup.js`
- Coverage threshold: 70% for branches, functions, lines, statements

**E2E Tests:** Node.js test scripts in `scripts/` directory
- Test entire workflows (booking, payment, review, role access)
- Run with `npm run test:*` commands

### Environment Variables

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)
- `STRIPE_SECRET_KEY` - Stripe secret key (server-only)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `RESEND_API_KEY` - Resend API key for emails (server-only)

**Template:** See `env.template` for full list

## Common Patterns & Conventions

### File Naming
- Components: PascalCase (`PropertyCard.tsx`)
- Utilities: camelCase (`email-utils.ts`)
- API routes: lowercase with hyphens (`route.ts` in directory structure)
- Types: PascalCase with `.d.ts` extension

### Import Aliases
- `@/` maps to project root (configured in `tsconfig.json` and `jest.config.js`)
- Example: `import { supabase } from "@/lib/supabase"`

### Error Handling
- Log errors with context: `console.error("Context:", error)`
- Return user-friendly messages
- Use appropriate HTTP status codes
- Handle Supabase errors gracefully (check `error` object)

### Security Considerations
- Never expose service role key to client
- Validate all inputs (use Zod schemas)
- Verify webhook signatures for Stripe events
- Use CSRF tokens for state-changing operations
- Rate limit sensitive endpoints
- Apply RLS policies at database level

## Project-Specific Notes

### Booking Lifecycle
1. Guest selects property and dates
2. Create booking record (status: 'pending', payment_status: 'pending')
3. Generate Stripe checkout session
4. Redirect to Stripe
5. Webhook updates booking status and payment_status
6. Send confirmation emails (guest + host)
7. Update property availability

### Property Approval Workflow
- New properties start as `is_active: false`
- Admin reviews via `/admin` dashboard
- Approval triggers host notification email
- Only active properties appear in search

### Email Sending
- Always use `lib/email/unified-email-service.ts`
- Templates in `emails/` are React Email components
- Test emails in development before deploying

### Cache Clearing
- Run `npm run clean` if experiencing weird Next.js build issues
- Development: `.next/` directory regenerates automatically
- Production: Vercel handles cache automatically

## Known Issues & Workarounds

1. **ESLint disabled during builds:** `eslint.ignoreDuringBuilds: true` in `next.config.js`. Run `npm run lint` manually.
2. **Empty test directory:** `__tests__/components/` exists but has no tests. Add component tests as needed.
3. **Windows-specific scripts:** Cache clearing uses PowerShell scripts (`clear-all-cache.ps1`). Linux/Mac users should adapt.

## Documentation

**Main Docs:** `docs/` directory with comprehensive guides
- `docs/README.md` - Documentation index
- `docs/project-analysis/PROJECT_BREAKDOWN.md` - Complete feature breakdown
- `docs/system-guides/` - System architecture and auth documentation
- `docs/setup-guides/` - Deployment and configuration guides
- `docs/implementation-guides/` - Payment system and booking flow guides

**Key Documents:**
- `docs/project-analysis/PROJECT_STRUCTURE.md` - Detailed project structure
- `docs/system-guides/01-project-overview.md` - Architecture overview
- `docs/system-guides/02-authentication-system.md` - Auth system details
- `docs/setup-guides/01-deployment-guide.md` - Deployment instructions

## Quick Reference

**Local Development URL:** http://localhost:3000

**Default Port:** 3000 (Next.js dev server)

**Database:** Supabase PostgreSQL (remote, not local)

**Authentication:** Supabase Auth with email/password and OAuth providers

**Payment Testing:** Use Stripe test mode with test card `4242 4242 4242 4242`

**Admin Access:** Create admin user with `npm run create:admin` script
