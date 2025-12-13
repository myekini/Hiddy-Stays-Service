# HiddyStays Email Template System

Professional email templates built with React Email and Resend for the HiddyStays platform.

> **See also:** [Template Specifications](./TEMPLATE_SPECIFICATIONS.md) - Detailed design specifications and requirements

## 📧 Available Email Templates

### 1. **Booking Confirmation** (`BookingConfirmation.tsx`)
Sent to guests when their booking is confirmed.
- Property details and images
- Check-in/out information
- Host contact card
- Google Maps integration
- Zero-fee messaging

### 2. **Host Booking Notification** (`HostBookingNotification.tsx`)
Sent to hosts when they receive a new booking.
- Guest information
- Earnings breakdown (highlighting 100% kept)
- Check-in details
- Guest special requests
- Quick action buttons

### 3. **Payment Receipt** (`PaymentReceipt.tsx`)
Sent to guests after successful payment.
- Transaction details
- Itemized cost breakdown
- Zero platform fee highlight
- PDF download option

### 4. **Welcome Email** (`WelcomeEmail.tsx`)
Sent to new users (host or guest versions).
- Platform value propositions
- Quick start guide for hosts
- Property browsing CTA for guests
- Brand introduction

### 5. **Check-in Reminder** (`CheckInReminder.tsx`)
Sent 24 hours before check-in.
- Check-in time and location
- WiFi and parking details
- Entry instructions
- Host contact information

## 🎨 Design System

### Brand Colors
- **Primary Blue**: `#1E3A5F`
- **Accent Green**: `#10B981`
- **Background**: `#F9FAFB`
- **Text Dark**: `#111827`
- **Text Light**: `#6B7280`

### Typography
- **Font**: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **Headings**: Bold, 24-32px
- **Body**: Regular, 16px, line-height 1.6

### Components
All templates use the shared `EmailLayout` component for consistent branding:
- Header with HiddyStays logo
- Standardized footer with links
- Social media integration
- Unsubscribe functionality

## 🚀 Usage

### Send Email via Service

```typescript
import { emailService } from '@/lib/email/unified-email-service';

// Send booking confirmation
await emailService.sendBookingConfirmation({
  guestName: 'John Doe',
  guestEmail: 'john@example.com',
  propertyName: 'Cozy Downtown Loft',
  propertyImage: 'https://...',
  // ... other required fields
});

// Send host notification
await emailService.sendHostNotification({
  hostName: 'Sarah Smith',
  hostEmail: 'sarah@example.com',
  propertyName: 'Cozy Downtown Loft',
  // ... other required fields
});

// Send welcome email
await emailService.sendWelcomeEmail({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'host', // or 'guest'
});
```

### Test Templates Locally

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Run the test script:**
   ```bash
   node scripts/test-emails.js [email-type] [recipient-email]
   ```

   Examples:
   ```bash
   node scripts/test-emails.js booking-confirmation test@example.com
   node scripts/test-emails.js host-notification myemail@gmail.com
   node scripts/test-emails.js welcome admin@company.com
   ```

3. **Use the API endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/email/test \
     -H "Content-Type: application/json" \
     -d '{
       "type": "booking-confirmation",
       "data": {
         "guestName": "John Doe",
         "guestEmail": "test@example.com",
         ...
       }
     }'
   ```

## 🔧 Environment Setup

### Required Environment Variables

Add to your `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Create a new API key
3. Verify your sending domain (or use Resend's test domain for development)

## 📦 Dependencies

```json
{
  "@react-email/components": "^0.4.0",
  "resend": "^3.0.0"
}
```

Already installed in the project.

## 🧪 Testing Checklist

### Email Client Compatibility
Test all templates on:
- [ ] Gmail (Desktop & Mobile)
- [ ] Outlook (Desktop & Mobile)
- [ ] Apple Mail (iOS & macOS)
- [ ] Yahoo Mail
- [ ] ProtonMail
- [ ] Dark mode compatibility

### Content Verification
- [ ] All dynamic variables populate correctly
- [ ] Links work and include tracking
- [ ] Images load with proper alt text
- [ ] Buttons are tappable (44px minimum)
- [ ] Responsive on all screen sizes
- [ ] Plain text fallback available

### Compliance
- [ ] Unsubscribe link present
- [ ] Physical address in footer
- [ ] CAN-SPAM compliant
- [ ] GDPR compliant
- [ ] Proper from/reply-to addresses

## 📊 Email Tracking

The service automatically logs all email sends. Monitor:
- Open rates
- Click-through rates
- Delivery status
- Bounce rates

Access logs via Resend dashboard or your logging service.

## 🔄 Integration Points

### Booking Flow
```typescript
// After booking creation
await emailService.sendBookingConfirmation(bookingData);
await emailService.sendHostNotification(hostData);
await emailService.sendPaymentReceipt(receiptData);
```

### User Registration
```typescript
// After user signs up
await emailService.sendWelcomeEmail({
  name: user.name,
  email: user.email,
  role: user.role, // 'host' or 'guest'
});
```

### Scheduled Reminders
```typescript
// 24 hours before check-in (use cron job or scheduled function)
await emailService.sendCheckInReminder(reminderData);
```

## 🐛 Troubleshooting

### Emails not sending
1. Check `RESEND_API_KEY` is set correctly
2. Verify domain is verified in Resend
3. Check console logs for errors
4. Ensure recipient email is valid

### Styling issues
1. Always use inline styles for email clients
2. Test on multiple clients
3. Use table-based layouts for complex structures
4. Avoid modern CSS (flexbox, grid) - use tables

### Template errors
1. Ensure all required props are provided
2. Check for undefined values
3. Validate image URLs are accessible
4. Test with real data before production

## 📝 Adding New Templates

1. Create new template in `/emails/[TemplateName].tsx`
2. Use `EmailLayout` component for consistency
3. Add method to `UnifiedEmailService`
4. Add test data to `scripts/test-emails.js`
5. Update this README
6. Test thoroughly

Example:
```tsx
// emails/NewTemplate.tsx
import { EmailLayout } from './components/EmailLayout';

export const NewTemplate = ({ name, data }) => {
  return (
    <EmailLayout preview="Preview text">
      {/* Your template content */}
    </EmailLayout>
  );
};
```

## 🤝 Support

For issues or questions:
- Email: admin@hiddystays.com
- Documentation: [Resend Docs](https://resend.com/docs)
- React Email: [react.email](https://react.email)

---

**Built with ❤️ for HiddyStays - Zero Fee Stays**
