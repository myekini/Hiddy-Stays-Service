# 📁 HiddyStays - Clean Project Structure

> **Organized and optimized project structure for easy navigation and maintenance**

---

## 🗂️ **Current Structure**

```
zero-fee-stays/
├── 📱 app/                          # Next.js App Router (Pages & API)
│   ├── api/                        # API Routes (64 endpoints)
│   │   ├── admin/                  # Admin management APIs
│   │   │   ├── bookings/          # Admin booking management
│   │   │   ├── properties/        # Property moderation
│   │   │   ├── reviews/           # Review moderation
│   │   │   ├── roles/             # Role management
│   │   │   ├── stats/             # Platform statistics
│   │   │   └── users/             # User management
│   │   ├── auth/                   # Authentication endpoints
│   │   │   └── callback/          # OAuth callbacks
│   │   ├── bookings/              # Booking management APIs
│   │   │   ├── [id]/             # Booking by ID
│   │   │   ├── cancel/            # Cancel booking
│   │   │   └── create/            # Create booking
│   │   ├── calendar/              # Calendar & availability
│   │   ├── email/                 # Email sending APIs
│   │   ├── host/                  # Host-specific APIs
│   │   ├── payments/              # Payment processing
│   │   │   ├── [bookingId]/      # Payment by booking
│   │   │   ├── create-payment-intent/
│   │   │   ├── process-card-payment/
│   │   │   ├── process-bank-payment/
│   │   │   ├── webhook/           # Stripe webhooks
│   │   │   └── ...
│   │   ├── properties/            # Property management APIs
│   │   │   ├── [id]/             # Property by ID
│   │   │   │   ├── analytics/    # Property analytics
│   │   │   │   ├── availability/ # Availability check
│   │   │   │   ├── bookings/     # Property bookings
│   │   │   │   ├── images/       # Image management
│   │   │   │   └── reviews/      # Property reviews
│   │   │   └── stats/            # Property statistics
│   │   ├── reviews/               # Review APIs
│   │   └── ...
│   ├── (auth)/                     # Auth pages group
│   │   ├── auth/                  # Login/signup pages
│   │   │   ├── callback/          # OAuth callback
│   │   │   ├── forgot-password/  # Password reset
│   │   │   └── reset-password/    # Password reset confirm
│   ├── (dashboard)/               # Dashboard pages group
│   │   ├── admin/                 # Admin dashboard
│   │   ├── host-dashboard/        # Host dashboard
│   │   ├── bookings/              # User bookings
│   │   └── profile/               # User profile
│   ├── properties/                 # Property pages
│   │   └── [id]/                  # Property detail page
│   ├── property/                   # Property listing page
│   ├── booking/                    # Booking page
│   ├── about/                      # About page
│   ├── contact/                    # Contact page
│   ├── help/                       # Help page
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Home page
│   └── globals.css                 # Global styles
│
├── 🧩 components/                  # React Components
│   ├── ui/                        # UI Primitives (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   └── ... (56 components)
│   ├── auth/                      # Authentication components
│   │   └── ModernAuthForm.tsx
│   ├── admin/                     # Admin components
│   │   ├── AdminBookingManagement.tsx
│   │   ├── AdminPropertyManagement.tsx
│   │   ├── AdminPropertyModeration.tsx
│   │   └── AdminUserManagement.tsx
│   ├── booking/                   # Booking components
│   │   ├── BookingManagement.tsx
│   │   ├── BookingModalStack.tsx
│   │   └── EnhancedBookingModal.tsx
│   ├── property/                  # Property components
│   │   ├── PropertyCard.tsx
│   │   ├── PropertyForm.tsx
│   │   ├── PropertyImageUpload.tsx
│   │   ├── PropertyMap.tsx
│   │   ├── PropertyReviews.tsx
│   │   └── PropertyShowcase.tsx
│   ├── shared/                    # Shared components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Features.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── ...
│   ├── StreamlinedHero.tsx        # Main hero component (used)
│   ├── AvailabilityCalendar.tsx
│   ├── CalendarManagement.tsx
│   ├── DestinationSearch.tsx
│   ├── HostAnalyticsDashboard.tsx
│   ├── MessagingPanel.tsx
│   ├── PlatformAnalytics.tsx
│   ├── ThemeProvider.tsx
│   └── ...
│
├── 🛠️ lib/                         # Utilities & Helpers
│   ├── auth/                      # Authentication utilities
│   │   ├── auth.ts
│   │   ├── auth-middleware.ts
│   │   ├── auth-validation.ts
│   │   ├── mfa.ts
│   │   └── session.ts
│   ├── email/                     # Email utilities
│   │   ├── email-templates/       # Email template components
│   │   ├── email-utils.ts
│   │   ├── emailRenderer.ts
│   │   └── unified-email-service.ts
│   ├── supabase.ts                # Supabase client
│   ├── supabase-admin.ts          # Supabase admin client
│   ├── payment-service.ts         # Payment utilities
│   ├── cache.ts                   # Caching utilities
│   ├── utils.ts                   # General utilities
│   └── ...
│
├── 🎣 hooks/                       # React Hooks
│   ├── useAuth.tsx                # Authentication hook
│   ├── useMFA.ts                  # MFA hook
│   ├── useHostAnalytics.ts        # Host analytics hook
│   ├── usePlatformAnalytics.ts   # Platform analytics hook
│   ├── usePWA.tsx                 # PWA hook
│   └── ...
│
├── 🔌 services/                    # Business Logic Services
│   └── ... (6 service files)
│
├── 🔗 integrations/                # Third-party Integrations
│   └── supabase/                  # Supabase integration
│       └── ... (4 integration files)
│
├── 📧 emails/                      # Email Templates
│   ├── BookingConfirmation.tsx
│   ├── PaymentReceipt.tsx
│   ├── CheckInReminder.tsx
│   ├── WelcomeEmail.tsx
│   ├── HostBookingNotification.tsx
│   └── components/                # Email components
│
├── 🗄️ supabase/                    # Supabase Configuration
│   ├── migrations/                # Database migrations (33 files)
│   ├── functions/                 # Edge Functions
│   │   └── email-service/         # Email service function
│   ├── config.toml                # Supabase config
│   └── seed.sql                   # Seed data
│
├── 📜 scripts/                     # Utility Scripts
│   ├── setup/                     # Setup scripts
│   │   ├── setup-dev.js
│   │   ├── setup-mock-data.js
│   │   └── setup-sample-properties.js
│   ├── test/                      # Test scripts
│   │   ├── test-all-new-features.js
│   │   ├── test-property-approval.js
│   │   ├── test-payment-status.js
│   │   └── ...
│   └── migration/                 # Migration scripts
│       └── ...
│
├── 📚 docs/                        # Documentation
│   ├── system-guides/             # System documentation
│   │   ├── 01-project-overview.md
│   │   └── 02-authentication-system.md
│   ├── setup-guides/              # Setup documentation
│   │   ├── 01-deployment-guide.md
│   │   ├── 02-email-configuration.md
│   │   └── 03-stripe-webhooks.md
│   ├── implementation-guides/     # Implementation docs
│   │   ├── 01-payment-system-basics.md
│   │   ├── 02-payment-system-advanced.md
│   │   └── 03-booking-flow.md
│   └── database-migrations/        # Migration docs
│
├── 🖼️ public/                      # Static Assets
│   ├── images/                    # Image assets
│   ├── icons/                     # Icon assets
│   └── manifest.json              # PWA manifest
│
├── 📄 Configuration Files
│   ├── package.json               # Dependencies
│   ├── tsconfig.json              # TypeScript config
│   ├── next.config.js             # Next.js config
│   ├── tailwind.config.ts         # Tailwind config
│   ├── eslint.config.js           # ESLint config
│   ├── jest.config.js             # Jest config
│   ├── postcss.config.js          # PostCSS config
│   ├── components.json            # shadcn/ui config
│   └── env.template               # Environment template
│
└── 📋 Documentation Files
    ├── README.md                  # Project README
    ├── PROJECT_BREAKDOWN.md       # Feature breakdown
    ├── PROJECT_STRUCTURE.md       # This file
    ├── CLEANUP_PLAN.md            # Cleanup documentation
    └── LICENSE                    # MIT License
```

---

## ⚠️ **Known Issues & Notes**

### **Duplicate API Routes**
- ✅ **Resolved**: `app/api/bookings/[booking_id]/` removed, using `[id]` consistently

### **Empty Directories**
- `__tests__/components/` - Empty, can be removed or populated with tests

### **Removed Files** ✅
- `components/Hero.tsx` - Unused, replaced by StreamlinedHero
- `components/ModernHero.tsx` - Unused
- `components/EnhancedHero.tsx` - Unused
- `components/InspiredHero.tsx` - Unused
- `components/LoginForm.tsx` - Unused
- `components/SocialProof.tsx` - Unused
- `components/Testimonials.tsx` - Unused

---

## 🎯 **Recommended Improvements**

### **1. Component Organization**
Consider organizing components by feature:
```
components/
├── ui/              # UI primitives (keep as is)
├── auth/            # Auth components ✅
├── booking/         # Booking components (create)
├── property/        # Property components (create)
├── admin/           # Admin components (create)
└── shared/          # Shared components (create)
```

### **2. API Route Organization**
Consider grouping by feature:
```
app/api/
├── v1/              # API versioning
│   ├── bookings/
│   ├── properties/
│   └── ...
```

### **3. Script Organization**
Organize scripts by purpose:
```
scripts/
├── setup/           # Setup scripts
├── test/            # Test scripts
└── migration/       # Migration scripts
```

### **4. Testing Structure**
Add proper test structure:
```
__tests__/
├── components/
├── api/
├── lib/
└── e2e/
```

---

## 📊 **File Count Summary**

| Category | Count | Status |
|----------|-------|--------|
| **API Routes** | 64 | ✅ Complete |
| **Components** | 100+ | ✅ Complete |
| **UI Components** | 56 | ✅ Complete |
| **Hooks** | 10+ | ✅ Complete |
| **Migrations** | 33 | ✅ Complete |
| **Scripts** | 18 | ✅ Complete |
| **Email Templates** | 5 | ✅ Complete |
| **Documentation** | 15+ | ✅ Complete |

---

## 🚀 **Next Steps**

1. ✅ **Cleanup Complete** - Removed unused files
2. ⚠️ **Fix Duplicate Routes** - Resolve booking route duplicates
3. 📝 **Add Tests** - Implement unit and E2E tests
4. 📚 **API Documentation** - Add OpenAPI/Swagger docs
5. 🔍 **Performance Audit** - Optimize images and queries

---

**Last Updated**: January 2025  
**Status**: Clean and Organized ✅

