# 🧹 Project Cleanup Plan

## Files to Remove (Unused/Duplicate)

### **Unused Hero Components**
- `components/Hero.tsx` - Not imported anywhere, replaced by StreamlinedHero
- `components/ModernHero.tsx` - Not imported anywhere
- `components/EnhancedHero.tsx` - Not imported anywhere  
- `components/InspiredHero.tsx` - Not imported anywhere

**Note**: Only `StreamlinedHero.tsx` is actively used in `app/page.tsx`

### **Unused Components (Verify First)**
- `components/LoginForm.tsx` - Check if used (appears unused)
- `components/SocialProof.tsx` - Not imported in app pages
- `components/Testimonials.tsx` - Not imported in app pages
- `components/NewsletterSubscription.tsx` - Check if used

### **Empty/Unused Directories**
- `__tests__/components/` - Empty directory, no test files

### **Incorrect README**
- `README.md` - Contains Supabase CLI README, should be project README

### **Potential Duplicates**
- ✅ Resolved: Removed duplicate `bookings/[booking_id]`, using `[id]` consistently

---

## Files to Keep But Organize

### **Documentation**
- Move all docs to `docs/` (already done)
- Keep `PROJECT_BREAKDOWN.md` in root
- Keep `CLEANUP_PLAN.md` in root (temporary)

### **Scripts**
- All scripts in `scripts/` are useful, keep them
- Consider organizing by category (setup, test, migration)

### **Components**
- Keep all UI components in `components/ui/`
- Keep all feature components in `components/`
- Consider organizing by feature (booking, property, auth, etc.)

---

## Recommended Project Structure

```
zero-fee-stays/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── admin/               # Admin endpoints
│   │   ├── auth/                # Auth endpoints
│   │   ├── bookings/            # Booking endpoints
│   │   ├── payments/            # Payment endpoints
│   │   ├── properties/          # Property endpoints
│   │   └── ...
│   ├── (auth)/                   # Auth pages group
│   │   ├── auth/
│   │   └── ...
│   ├── (dashboard)/              # Dashboard pages group
│   │   ├── admin/
│   │   ├── host-dashboard/
│   │   └── bookings/
│   ├── properties/               # Property pages
│   └── ...
├── components/
│   ├── ui/                      # UI primitives (shadcn)
│   ├── auth/                    # Auth components
│   ├── booking/                 # Booking components
│   ├── property/                # Property components
│   ├── admin/                   # Admin components
│   └── shared/                  # Shared components
├── lib/                         # Utilities
│   ├── auth/                    # Auth utilities
│   ├── email/                   # Email utilities
│   └── ...
├── hooks/                       # React hooks
├── services/                    # Business logic
├── integrations/                # Third-party integrations
├── emails/                      # Email templates
├── supabase/                    # Supabase config
│   ├── migrations/              # Database migrations
│   └── functions/               # Edge functions
├── scripts/                     # Utility scripts
│   ├── setup/                   # Setup scripts
│   ├── test/                    # Test scripts
│   └── migration/               # Migration scripts
├── docs/                        # Documentation
├── public/                      # Static assets
├── PROJECT_BREAKDOWN.md         # Project analysis
├── README.md                     # Project README (needs update)
└── package.json
```

---

## Action Items

### **Phase 1: Safe Removals**
1. ✅ Remove unused Hero components
2. ✅ Remove empty test directory
3. ✅ Update README.md with project info

### **Phase 2: Verification**
1. Verify LoginForm usage
2. Verify SocialProof/Testimonials usage
3. Check for duplicate API routes

### **Phase 3: Organization (Optional)**
1. Reorganize components by feature
2. Organize scripts by category
3. Add feature-based API route grouping

---

## Notes

- **Be careful**: Some components might be used dynamically or conditionally
- **Test after cleanup**: Run the app to ensure nothing breaks
- **Git**: Commit before cleanup for easy rollback

