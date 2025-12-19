# Complete Booking Flow Guide

This guide documents the end-to-end booking flow from property selection to payment confirmation and email notifications.

## Overview

The booking flow consists of 4 main steps:

1. **Booking Creation** - Guest submits booking request
2. **Payment Session** - Stripe checkout session is created
3. **Payment Processing** - Guest completes payment via Stripe
4. **Payment Verification** - Booking is confirmed and emails are sent

---

## Step 1: Create Booking

**Endpoint:** `POST /api/bookings/create`

**Purpose:** Creates a booking record in pending state and validates availability.

### Request Body

```json
{
  "propertyId": "uuid",
  "checkIn": "2025-10-15",
  "checkOut": "2025-10-20",
  "guests": 2,
  "totalAmount": 500.00,
  "guestInfo": {
    "userId": "uuid (optional)",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "specialRequests": "Late check-in preferred"
  }
}
```

### Validation Checks

- ✅ Property exists and is active
- ✅ Check-in date is not in the past
- ✅ Check-out date is after check-in date
- ✅ Maximum stay is 30 nights
- ✅ Number of guests is within property limits (1-16)
- ✅ No conflicting bookings exist
- ✅ Valid guest information provided

### Response

```json
{
  "success": true,
  "bookingId": "booking-uuid",
  "status": "pending",
  "message": "Booking created successfully!",
  "booking": {
    "id": "booking-uuid",
    "propertyId": "property-uuid",
    "checkIn": "2025-10-15",
    "checkOut": "2025-10-20",
    "guests": 2,
    "totalAmount": 500.00,
    "status": "pending",
    "createdAt": "2025-10-01T12:00:00Z"
  }
}
```

### Side Effects

- Creates booking record with status `pending`
- Creates in-app notification for host
- **Does NOT send email yet** (emails sent after payment)

---

## Step 2: Create Payment Session

**Endpoint:** `POST /api/payments/create-session`

**Purpose:** Creates a Stripe checkout session for payment processing.

### Request Body

```json
{
  "bookingId": "booking-uuid",
  "amount": 500.00,
  "currency": "cad",
  "success_url": "http://localhost:3000/booking-success?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "http://localhost:3000/booking-cancel"
}
```

### Response

```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

### What Happens

1. Stripe checkout session is created with:
   - Payment method types: `card`
   - Line item with booking amount
   - Success/cancel redirect URLs
   - Booking ID stored in metadata

2. Client receives checkout URL
3. Client redirects user to Stripe hosted checkout

---

## Step 3: Payment Processing

**Platform:** Stripe Hosted Checkout

**User Actions:**

1. User enters payment details on Stripe's secure checkout page
2. Stripe processes the payment
3. User is redirected to success/cancel URL based on payment result

**Success URL:** `{APP_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`
**Cancel URL:** `{APP_URL}/booking-cancel`

---

## Step 4: Verify Payment & Send Emails

**Endpoint:** `POST /api/payments/verify-payment`

**Purpose:** Verifies payment status, updates booking, and sends confirmation emails.

### Request Body

```json
{
  "sessionId": "cs_test_..."
}
```

### What Happens

#### 4.1 Retrieve Stripe Session

```javascript
const session = await stripe.checkout.sessions.retrieve(sessionId);
```

#### 4.2 Update Booking Status

If payment is successful (`payment_status === "paid"`):

```sql
UPDATE bookings
SET status = 'confirmed',
    stripe_payment_intent_id = 'pi_...'
WHERE id = bookingId;
```

#### 4.3 Fetch Booking & Host Details

Retrieves complete booking information including:
- Guest details
- Property information
- Host profile (name, email)
- Special requests

#### 4.4 Send Email Notifications

**Guest Confirmation Email:**
```javascript
await supabase.functions.invoke("send-email-notification", {
  body: {
    to: "guest@example.com",
    template: "booking_confirmation_guest",
    data: {
      propertyTitle: "Cozy Cottage",
      guestName: "John Doe",
      checkInDate: "2025-10-15",
      checkOutDate: "2025-10-20",
      guestsCount: 2,
      totalAmount: 500.00,
      propertyUrl: "http://localhost:3000/bookings/uuid"
    }
  }
});
```

**Host Notification Email:**
```javascript
await supabase.functions.invoke("send-email-notification", {
  body: {
    to: "host@example.com",
    template: "new_booking_host",
    data: {
      propertyTitle: "Cozy Cottage",
      hostName: "Jane Host",
      guestName: "John Doe",
      guestEmail: "john@example.com",
      guestPhone: "+1234567890",
      checkInDate: "2025-10-15",
      checkOutDate: "2025-10-20",
      guestsCount: 2,
      totalAmount: 500.00,
      specialRequests: "Late check-in preferred",
      dashboardUrl: "http://localhost:3000/host-dashboard"
    }
  }
});
```

#### 4.5 Create In-App Notification

```sql
INSERT INTO notifications (
  user_id,
  type,
  title,
  message,
  data,
  is_read,
  created_at
) VALUES (
  host_id,
  'booking_confirmed',
  'Booking Confirmed! 💳',
  'Payment received for Cozy Cottage',
  {...booking_details...},
  false,
  NOW()
);
```

### Response

```json
{
  "sessionId": "cs_test_...",
  "paymentStatus": "paid",
  "checkInDate": "2025-10-15",
  "checkOutDate": "2025-10-20",
  "guestsCount": 2,
  "totalAmount": 500.00,
  "propertyTitle": "Cozy Cottage",
  "guestName": "John Doe",
  "guestEmail": "john@example.com"
}
```

---

## Email Templates

### Available Templates

1. **`booking_confirmation_guest`** - Sent to guest after payment
2. **`new_booking_host`** - Sent to host after payment
3. **`check_in_reminder`** - Sent 24 hours before check-in (not automated yet)
4. **`new_message_notification`** - Sent when messages are received

### Email Service

**Supabase Edge Function:** `send-email-notification`
**Email Provider:** Resend
**From Address:** `HiddyStays <admin@hiddystays.com>`

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Selects Property                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: POST /api/bookings/create                              │
│  - Validate dates, guests, availability                         │
│  - Create booking (status: pending)                             │
│  - Create host notification (in-app only)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: POST /api/payments/create-session                      │
│  - Create Stripe checkout session                               │
│  - Return checkout URL                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Redirect to Stripe Hosted Checkout                     │
│  - User enters payment details                                  │
│  - Stripe processes payment                                     │
│  - Redirect to success/cancel URL                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: POST /api/payments/verify-payment                      │
│  - Verify payment status with Stripe                            │
│  - Update booking status to 'confirmed'                         │
│  - Send guest confirmation email                                │
│  - Send host notification email                                 │
│  - Create 'booking_confirmed' notification                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Booking Complete! ✅                           │
│  - Guest receives confirmation email                            │
│  - Host receives new booking email                              │
│  - Both have access to booking details                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

Required environment variables for the booking flow:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (Resend)
RESEND_API_KEY=re_...
FROM_EMAIL=admin@hiddystays.com
FROM_NAME=HiddyStays
SUPPORT_EMAIL=support@hiddystays.com

# App
APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

---

## Database Schema

### bookings

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id),
  guest_id UUID REFERENCES auth.users(id) NULL,
  host_id UUID REFERENCES profiles(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guests_count INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Testing the Flow

### 1. Test Booking Creation

```bash
curl -X POST http://localhost:3000/api/bookings/create \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "your-property-uuid",
    "checkIn": "2025-10-15",
    "checkOut": "2025-10-20",
    "guests": 2,
    "totalAmount": 500.00,
    "guestInfo": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    }
  }'
```

### 2. Test Payment Session

```bash
curl -X POST http://localhost:3000/api/payments/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "booking-uuid",
    "amount": 500.00,
    "currency": "cad"
  }'
```

### 3. Test Payment (use Stripe test cards)

**Success:** `4242 4242 4242 4242`
**3D Secure:** `4000 0027 6000 3184`
**Declined:** `4000 0000 0000 0002`

### 4. Test Payment Verification

```bash
curl -X POST http://localhost:3000/api/payments/verify-payment \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "cs_test_..."
  }'
```

---

## Troubleshooting

### Booking Creation Fails

- ✅ Check property exists and is active
- ✅ Verify dates don't conflict with existing bookings
- ✅ Ensure guest count is within limits
- ✅ Validate all required guest info is provided

### Payment Session Creation Fails

- ✅ Verify `STRIPE_SECRET_KEY` is set correctly
- ✅ Check booking exists with correct ID
- ✅ Ensure amount is greater than 0

### Payment Verification Fails

- ✅ Verify session ID from Stripe redirect
- ✅ Check Stripe webhook secret (if using webhooks)
- ✅ Ensure `SUPABASE_SERVICE_ROLE_KEY` is set

### Emails Not Sending

- ✅ Verify `RESEND_API_KEY` is valid
- ✅ Check Supabase Edge Function is deployed
- ✅ Verify `FROM_EMAIL` is verified in Resend dashboard
- ✅ Check Supabase function logs for errors

---

## Deployment Checklist

### Before Deploying

- [ ] Set all environment variables in production
- [ ] Verify Resend domain is verified
- [ ] Deploy Supabase Edge Function
- [ ] Test with Stripe test mode first
- [ ] Update `APP_URL` to production URL
- [ ] Configure Stripe webhooks (optional, for production)

### Deploy Supabase Edge Function

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set RESEND_API_KEY=your-key
supabase secrets set FROM_EMAIL=admin@hiddystays.com
supabase secrets set FROM_NAME=HiddyStays

# Deploy function
supabase functions deploy send-email-notification
```

### Test in Production

1. Create a test booking with real email
2. Use Stripe test card `4242 4242 4242 4242`
3. Verify emails are received
4. Check booking status is updated
5. Verify notifications appear in dashboard

---

## Future Enhancements

### Planned Features

- [ ] Automated check-in reminder emails (24 hours before)
- [ ] Booking cancellation flow with refund handling
- [ ] Review request emails (after check-out)
- [ ] Webhook endpoint for real-time Stripe events
- [ ] SMS notifications via Twilio
- [ ] Calendar synchronization (iCal)
- [ ] Multi-currency support
- [ ] Automated check-out emails

### Webhook Implementation

For production, consider implementing Stripe webhooks:

```javascript
// app/api/webhooks/stripe/route.ts
export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  const body = await request.text();

  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case "checkout.session.completed":
      // Handle successful payment
      break;
    case "payment_intent.payment_failed":
      // Handle failed payment
      break;
  }
}
```

---

## Support

For questions or issues:
- Check [CLAUDE.md](./CLAUDE.md) for project structure
- Review [README.md](./README.md) for setup instructions
- Contact support at support@hiddystays.com
