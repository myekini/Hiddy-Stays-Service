# 🏠 HiddyStays - Zero-Fee Property Rental Platform

> **Built by hosts, for hosts. Helping property owners keep 100% of their earnings.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-green)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-14-blue)](https://stripe.com/)

---

## 🎯 **What is HiddyStays?**

HiddyStays is a **zero-fee property rental platform** that connects property owners (hosts) directly with guests, eliminating platform fees. Unlike traditional booking platforms, hosts keep 100% of their earnings while guests enjoy authentic, premium accommodations.

### **Key Features**

- ✅ **Zero Platform Fees** - Hosts keep 100% of earnings
- ✅ **Direct Communication** - Hosts and guests communicate directly
- ✅ **Secure Payments** - Stripe-powered payment processing
- ✅ **Property Management** - Full-featured host dashboard
- ✅ **Booking System** - Complete booking workflow
- ✅ **Reviews & Ratings** - Trust-building review system
- ✅ **Admin Dashboard** - Platform management tools
- ✅ **Mobile Optimized** - Responsive design with PWA support

---

## 🚀 **Quick Start**

### **Prerequisites**

- Node.js 18+ and npm 8+
- Supabase account and project
- Stripe account (for payments)
- Resend account (for emails)

### **Installation**

```bash
# 1. Clone the repository
git clone https://github.com/hiddystays/zero-fee-stays.git
cd zero-fee-stays

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp env.template .env.local
# Edit .env.local with your credentials

# 4. Set up database
# Apply migrations from supabase/migrations/ in Supabase SQL Editor

# 5. Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

---

## 📁 **Project Structure**

```
zero-fee-stays/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (64 endpoints)
│   ├── auth/              # Authentication pages
│   ├── admin/             # Admin dashboard
│   ├── host-dashboard/    # Host dashboard
│   ├── properties/        # Property pages
│   └── booking/           # Booking pages
├── components/            # React components
│   ├── ui/               # UI primitives (shadcn/ui)
│   └── ...               # Feature components
├── lib/                  # Utilities and helpers
├── hooks/                # React hooks
├── services/             # Business logic
├── emails/               # Email templates
├── supabase/             # Supabase config & migrations
├── scripts/              # Utility scripts
└── docs/                 # Documentation
```

For detailed structure, see [PROJECT_BREAKDOWN.md](./PROJECT_BREAKDOWN.md).

---

## 🛠️ **Technology Stack**

| Component          | Technology              | Purpose                    |
| ------------------ | ----------------------- | -------------------------- |
| **Frontend**       | Next.js 15 + React 18   | Full-stack web application |
| **Language**       | TypeScript              | Type-safe development      |
| **Styling**        | Tailwind CSS + Radix UI | Modern, accessible UI      |
| **Database**       | Supabase (PostgreSQL)   | Backend-as-a-Service       |
| **Authentication** | Supabase Auth           | User management & security |
| **Payments**       | Stripe                  | Payment processing         |
| **Email**          | Resend                  | Transactional emails       |
| **Deployment**     | Vercel                  | Hosting & CDN              |

---

## 📚 **Documentation**

- **[Documentation Index](./docs/README.md)** - Full documentation index
- **[Project Breakdown](./docs/project-analysis/PROJECT_BREAKDOWN.md)** - Complete feature breakdown and testing guide
- **[Project Structure](./docs/project-analysis/PROJECT_STRUCTURE.md)** - Clean project structure
- **[Setup Guide](./docs/setup-guides/01-deployment-guide.md)** - Deployment instructions
- **[Authentication Guide](./docs/system-guides/02-authentication-system.md)** - Auth system details

---

## 🧪 **Testing**

### **Available Test Scripts**

```bash
# Run all tests
npm test

# Test specific features
npm run test:auth              # Authentication tests
npm run test:property-approval # Property approval workflow
npm run test:payment-status    # Payment status tests
npm run test:reviews          # Review workflow tests
npm run test:roles            # Role-based access tests
npm run test:all-features     # All feature tests
```

### **End-to-End Testing**

See [PROJECT_BREAKDOWN.md](./PROJECT_BREAKDOWN.md) for complete E2E testing checklist.

---

## 🔧 **Development Scripts**

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
npm run format           # Format code with Prettier

# Setup scripts
npm run setup:dev        # Set up development environment
npm run setup:mock       # Set up mock data
npm run create:admin     # Create admin user

# Database scripts
npm run migrate:auto     # Apply database migrations
npm run check:migration  # Check migration status
```

---

## 🌐 **Environment Variables**

See [env.template](./env.template) for all required environment variables.

**Required Variables:**

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `RESEND_API_KEY` - Resend API key for emails

---

## 🚢 **Deployment**

### **Vercel Deployment**

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### **Supabase Setup**

1. Create Supabase project
2. Apply migrations from `supabase/migrations/`
3. Configure authentication providers
4. Set up database functions

### **Stripe Setup**

1. Create Stripe account
2. Get API keys
3. Configure webhooks
4. Set up payment methods

See [Deployment Guide](./docs/setup-guides/01-deployment-guide.md) for detailed instructions.

---

## 🤝 **Contributing**

We welcome contributions! Please see our contributing guidelines (coming soon).

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 📞 **Support**

- **Documentation**: [docs/README.md](./docs/README.md)
- **Issues**: [GitHub Issues](https://github.com/hiddystays/zero-fee-stays/issues)
- **Email**: support@hiddystays.com

---

## 🎉 **Features Roadmap**

- ✅ Core platform (Property listings, bookings, payments)
- 🚧 Advanced search and filtering
- 🚧 Real-time messaging
- 📋 Mobile app (iOS/Android)
- 📋 Multi-language support
- 📋 AI-powered recommendations

---

**Built with ❤️ by the HiddyStays Team**
