# Booking Lifecycle Flow - HiddyStays

## Current Booking Status Flow

### 📊 Status States
- **`pending`** - Initial state when booking is created, awaiting payment/confirmation
- **`confirmed`** - Payment successful, booking is active
- **`cancelled`** - Booking was cancelled (by guest, host, or system)
- **`completed`** - Stay has ended (check-out date passed)

---

## 🔄 Status Transitions

### 1. **PENDING → CONFIRMED** ✅ (IMPLEMENTED)

**Trigger:** Successful payment via Stripe

**Flow:**
1. Guest creates booking → Status: `pending`
   - File: `app/api/bookings/create/route.ts`
   - Creates booking with `status: "pending"`, `payment_status: "pending"`

2. Guest completes payment via Stripe Checkout
   - Stripe creates checkout session with `booking_id` in metadata

3. **Webhook receives payment confirmation:**
   - Primary: `app/api/webhooks/stripe/route.ts` → `handleCheckoutSessionCompleted()`
   - Alternative: `app/api/payments/webhook/route.ts` → `handleCheckoutSessionCompleted()`
   - Supabase Function: `supabase/functions/stripe-webhook/index.ts`

4. **Status Update:**
   ```typescript
   status: "confirmed"
   payment_status: "paid"
   stripe_payment_intent_id: <payment_intent_id>
   ```

5. **Actions After Confirmation:**
   - ✅ Email notifications sent (guest & host)
   - ✅ Payment transaction logged
   - ✅ Booking confirmation emails

**Alternative Paths:**
- Manual verification: `app/api/payments/verify-payment/route.ts`
- Payment response handler: `app/api/payments/handle-payment-response/route.ts`

---

### 2. **PENDING → CONFIRMED** (Host Acceptance) ✅ (IMPLEMENTED)

**Trigger:** Host manually accepts booking

**Flow:**
1. Host receives pending booking notification
2. Host calls: `POST /api/bookings/[id]/accept`
   - File: `app/api/bookings/[id]/accept/route.ts`
3. **Status Update:**
   ```typescript
   status: "confirmed"
   ```
4. ✅ Email notifications sent

**Restrictions:**
- Only `pending` bookings can be accepted
- Returns error if status is not `pending`

---

### 3. **ANY → CANCELLED** ✅ (IMPLEMENTED)

**Trigger:** User cancellation or host rejection

**Flow A: Guest Cancellation**
1. Guest clicks "Cancel Booking"
2. Calls: `POST /api/bookings/cancel`
   - File: `app/api/bookings/cancel/route.ts`
3. **Cancellation Policy Applied:**
   - More than 7 days before check-in: 100% refund
   - 3-7 days before check-in: 50% refund
   - Less than 3 days: No refund
4. **Status Update:**
   ```typescript
   status: "cancelled"
   ```
5. ✅ Refund processed (if eligible)
6. ✅ Email notifications sent
7. ✅ Notifications created

**Flow B: Host Rejection**
1. Host clicks "Reject Booking"
2. Calls: `POST /api/bookings/[id]/reject`
   - File: `app/api/bookings/[id]/reject/route.ts`
3. **Status Update:**
   ```typescript
   status: "cancelled"
   ```
4. ✅ Email notifications sent

**Flow C: Automatic Cancellation (System)**
- File: `app/api/bookings/[id]/route.ts` (DELETE endpoint)
- Cancels booking if within 24 hours of check-in and status is `confirmed`

**Flow D: Abandoned Booking Cleanup**
- Function: `cleanup_abandoned_bookings()` in migration
- Deletes bookings that are:
  - Status: `pending`
  - Payment status: `pending`
  - Created more than 1 hour ago
- ⚠️ **Note:** This DELETES the booking, doesn't set to cancelled

**Restrictions:**
- Cannot cancel if status is already `cancelled` or `completed`
- Cannot cancel confirmed bookings within 24 hours of check-in
- Only `pending` bookings can be rejected by host

---

### 4. **CONFIRMED → COMPLETED** ✅ (IMPLEMENTED)

**Trigger:** Automatic when booking is fetched and check-out date has passed

**Flow:**
1. When bookings are fetched via `GET /api/bookings`
   - File: `app/api/bookings/route.ts`
2. **Auto-completion check:**
   - Finds bookings where `status = 'confirmed'` AND `check_out_date < today`
   - Automatically updates status to `completed`
   - Updates `updated_at` timestamp
3. **Status Update:**
   ```typescript
   status: "completed"
   updated_at: new Date().toISOString()
   ```
4. Returns updated bookings with `completed` status

**Implementation Details:**
- ✅ Runs automatically on every booking fetch
- ✅ Updates database immediately
- ✅ Updates local array before returning to client
- ⚠️ **Note:** Completion happens on-demand when bookings are fetched
- ⚠️ **Future Enhancement:** Consider adding scheduled cron job for batch completion

**Current Implementation:**
- ✅ Automatic completion on booking fetch
- ✅ Reviews can be created only for `completed` bookings (in policies)
- ✅ Status validation includes `completed`

---

## 📋 Complete Flow Diagram

```
┌─────────────┐
│   CREATE    │
│  (Booking)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   PENDING   │◄────────┐
└──────┬──────┘         │
       │                │
       ├────────────────┼────────────────┐
       │                │                │
       ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  CONFIRMED  │  │ CANCELLED   │  │ (Abandoned) │
│             │  │             │  │  (Deleted)  │
└──────┬──────┘  └─────────────┘  └─────────────┘
       │
       ├────────────────┐
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ COMPLETED   │  │  CANCELLED  │
│             │  │  (Late)     │
└─────────────┘  └─────────────┘
```

---

## 🔍 Status Transition Points

| From | To | Trigger | Location | Status |
|------|----|---------|-----------|--------| 
| - | `pending` | Booking created | `app/api/bookings/create/route.ts` | ✅ |
| `pending` | `confirmed` | Payment success | `app/api/webhooks/stripe/route.ts` | ✅ |
| `pending` | `confirmed` | Host acceptance | `app/api/bookings/[id]/accept/route.ts` | ✅ |
| `pending` | `cancelled` | Guest cancellation | `app/api/bookings/cancel/route.ts` | ✅ |
| `pending` | `cancelled` | Host rejection | `app/api/bookings/[id]/reject/route.ts` | ✅ |
| `confirmed` | `cancelled` | Guest cancellation | `app/api/bookings/cancel/route.ts` | ✅ |
| `confirmed` | `cancelled` | System (24h before) | `app/api/bookings/[id]/route.ts` | ✅ |
| `confirmed` | `completed` | Check-out date passed | `app/api/bookings/route.ts` | ✅ |

---

## ✅ Implementation Complete

### Automatic Completion ✅ IMPLEMENTED
**Implementation:**
1. **API Route Auto-Complete** (Implemented)
   - File: `app/api/bookings/route.ts` (GET handler)
   - Automatically completes bookings when fetched
   - Checks if `status = 'confirmed'` AND `check_out_date < today`
   - Updates status to `completed` immediately

2. **Future Enhancements:**
   - **Supabase Edge Function** (cron schedule: daily at midnight) - Recommended for batch processing
   - **Email Notifications:**
     - Send "Stay Completed" email to guest
     - Send "Booking Completed" notification to host
     - Prompt guest to leave review

---

## 📝 Current Status Checks

### In Codebase:
- ✅ Status validation: `["pending", "confirmed", "cancelled", "completed"]`
- ✅ Can create reviews only for `completed` bookings (RLS policy)
- ✅ Payment webhooks handle `confirmed` status
- ✅ Cancellation logic exists
- ✅ **Automatic completion logic implemented** (on booking fetch)

---

## 🎯 Recommendations

1. **Enhance Completion Notifications:**
   - Email guest thanking them for stay
   - Email host confirming completion
   - Prompt for review

3. **Consider Manual Completion:**
   - Allow host to manually mark booking as `completed`
   - Allow admin to mark as `completed`

4. **Add Status History:**
   - Track status changes with timestamps
   - Audit trail for booking lifecycle

