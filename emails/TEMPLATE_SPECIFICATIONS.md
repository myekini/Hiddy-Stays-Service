# HiddyStays Email Template System

## 🎨 Design Requirements

### Brand Colors
- **Primary Blue**: `#1E3A5F`
- **Accent Green**: `#10B981`
- **Background**: `#F9FAFB`
- **Text Dark**: `#111827`
- **Text Light**: `#6B7280`

### Typography
- **Font Family**: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **Headings**: Bold, 24-32px
- **Body**: Regular, 16px, line-height 1.6
- **Small**: 14px

---

## 📧 Email Template Specifications

### **Template 1: Booking Confirmation (Guest)**

#### Subject Line
`Your stay at [Property Name] is confirmed! 🏠`

#### Structure
```
┌─────────────────────────────────────┐
│ HEADER                              │
│ [HiddyStays Logo - Left aligned]    │
│ Background: #1E3A5F, Height: 80px   │
├─────────────────────────────────────┤
│ HERO IMAGE                          │
│ Property featured image             │
│ Height: 300px, Full width           │
├─────────────────────────────────────┤
│ GREETING                            │
│ "Hey [Guest Name]! 🎉"              │
│ Padding: 40px 30px 20px            │
├─────────────────────────────────────┤
│ MAIN MESSAGE                        │
│ "Your booking is confirmed!"        │
│ Padding: 0 30px 30px              │
├─────────────────────────────────────┤
│ BOOKING DETAILS CARD                │
│ Background: #F9FAFB                 │
│ Border-radius: 12px                 │
│ Padding: 30px                       │
│ Margin: 0 30px                      │
│                                     │
│ • Property: [Name]                  │
│ • Check-in: [Date, Time]            │
│ • Check-out: [Date, Time]           │
│ • Guests: [Number]                  │
│ • Total Paid: $[Amount]             │
├─────────────────────────────────────┤
│ PRIMARY CTA                         │
│ Button: "View Booking Details"      │
│ Background: #10B981                 │
│ Color: white, Bold                  │
│ Padding: 16px 32px                  │
│ Border-radius: 8px                  │
│ Margin: 40px auto                   │
├─────────────────────────────────────┤
│ HOST CONTACT CARD                   │
│ Background: white                   │
│ Border: 1px solid #E5E7EB          │
│ Border-radius: 12px                 │
│ Padding: 20px                       │
│                                     │
│ • Host Avatar (circular, 60px)      │
│ • Host Name                         │
│ • "Message Host" button             │
├─────────────────────────────────────┤
│ FOOTER                              │
│ Background: #F9FAFB                 │
│ Padding: 40px 30px                  │
│                                     │
│ • Social media links                │
│ • Support email                     │
│ • Unsubscribe link                  │
│ • © 2025 HiddyStays                 │
└─────────────────────────────────────┘
```

#### Copy Template
```
Hey [Guest Name]! 🎉

Great news! Your booking at [Property Name] is confirmed.

[Host Name] is excited to welcome you on [Check-in Date].

🏠 Your Booking Details
━━━━━━━━━━━━━━━━━━━━
Property: [Property Name]
Address: [Full Address]
Check-in: [Date] at [Time]
Check-out: [Date] at [Time]
Guests: [Number]
━━━━━━━━━━━━━━━━━━━━

💰 Payment Summary
Total Paid: $[Amount]
(Zero platform fees - transparent pricing!)

📍 Getting There
[Google Maps Link]

📝 Important Notes
• Check-in time: [Time]
• [Any special instructions from host]

Need to make changes? Contact us at admin@hiddystays.com

Happy travels!
The HiddyStays Team

━━━━━━━━━━━━━━━━━━━━
HiddyStays - Zero Fee Stays
Keep 100% of your earnings
```

---

### **Template 2: New Booking Alert (Host)**

#### Subject Line
`New booking for [Property Name] - You earned $[Amount]! 🎉`

#### Structure
```
┌─────────────────────────────────────┐
│ HEADER (same as above)              │
├─────────────────────────────────────┤
│ EARNINGS HERO                       │
│ Background: Linear gradient         │
│ (#10B981 to #059669)                │
│ Padding: 60px 30px                  │
│                                     │
│ "💰 New Booking!"                   │
│ "You earned $[Amount]"              │
│ (Large, bold, white text)           │
├─────────────────────────────────────┤
│ GUEST INFO CARD                     │
│ Similar styling to booking card     │
│                                     │
│ • Guest name                        │
│ • Check-in/out dates                │
│ • Number of guests                  │
│ • Contact info                      │
├─────────────────────────────────────┤
│ EARNINGS BREAKDOWN                  │
│ Background: #FEF3C7 (light yellow)  │
│ Highlighting 100% kept              │
│                                     │
│ Booking Amount:    $[Amount]        │
│ Platform Fee:      $0.00 ✨         │
│ Stripe Fee:        -$[Fee]          │
│ You Keep:          $[Net] (100%)    │
├─────────────────────────────────────┤
│ ACTION BUTTONS                      │
│ • "View Booking" (primary)          │
│ • "Contact Guest" (secondary)       │
└─────────────────────────────────────┘
```

#### Copy Template
```
Hey [Host Name]! 🎉

Fantastic news! You have a new booking for [Property Name].

👤 Guest Information
━━━━━━━━━━━━━━━━━━━━
Name: [Guest Name]
Check-in: [Date, Time]
Check-out: [Date, Time]
Guests: [Number]
Phone: [Phone]
Email: [Email]

💰 Your Earnings (100% Kept!)
━━━━━━━━━━━━━━━━━━━━
Booking Amount:      $[Amount]
Platform Fee:        $0.00 ✨
Payment Processing:  -$[Stripe Fee]
━━━━━━━━━━━━━━━━━━━━
You Keep:           $[Net Amount]

That's 100% of the booking amount!
No hidden fees. Ever.

💬 Special Requests
[Guest special requests or "None"]

📋 Next Steps
1. Review the booking details
2. Prepare your property
3. Send a welcome message to your guest

[View Booking Button] [Contact Guest Button]

Questions? We're here to help at admin@hiddystays.com

Cheers,
The HiddyStays Team
```

---

### **Template 3: Payment Receipt**

#### Subject Line
`Payment Receipt - Booking at [Property Name]`

#### Key Elements
```
• Transaction ID
• Payment date & time
• Payment method (last 4 digits)
• Itemized breakdown:
  - Accommodation: $X
  - Cleaning fee: $X
  - Service fee: $0
  - Payment processing: $X
  - Total: $X
• "Download PDF Receipt" button
• Tax information (if applicable)
```

---

### **Template 4: Welcome Email (New User)**

#### Subject Line - Host
`Welcome to HiddyStays - List your property and keep 100%! 👋`

#### Subject Line - Guest
`Welcome to HiddyStays - Discover your next stay! 👋`

#### Structure (Host Version)
```
┌─────────────────────────────────────┐
│ HERO IMAGE                          │
│ Happy diverse hosts with keys       │
│ Overlay text: "Welcome to the       │
│ Zero-Fee Revolution"                │
├─────────────────────────────────────┤
│ WELCOME MESSAGE                     │
│ "Hey [Name]! 🎉"                    │
│ "Welcome to HiddyStays, where hosts │
│ keep 100% of their earnings."      │
├─────────────────────────────────────┤
│ VALUE PROPS (3 COLUMNS)             │
│ ┌───────┬───────┬───────┐          │
│ │ 💰    │ 🤝    │ 🚀    │          │
│ │ Zero  │Direct │Modern │          │
│ │ Fees  │Connect│Platform│         │
│ └───────┴───────┴───────┘          │
├─────────────────────────────────────┤
│ QUICK START GUIDE                   │
│ 1. List your property               │
│ 2. Set your pricing                 │
│ 3. Start earning (100%!)            │
├─────────────────────────────────────┤
│ PRIMARY CTA                         │
│ "List Your First Property"          │
└─────────────────────────────────────┘
```

#### Copy Template (Host)
```
Hey [Name]! 👋

Welcome to HiddyStays - where Canadian property owners keep 100% of their earnings!

🎉 You're Part of the Zero-Fee Revolution

Unlike other platforms that take 15-20% of your earnings, we believe hosts should keep what they earn. That's why we charge ZERO platform fees.

💰 What Makes HiddyStays Different?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Zero Platform Fees - Keep 100% of bookings
🤝 Direct Guest Connection - Build real relationships
🇨🇦 Canadian-Focused - Supporting local property owners
🚀 Modern Platform - Easy management tools

📋 Getting Started is Easy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. List your property (5 minutes)
2. Add photos and details
3. Set your pricing
4. Start accepting bookings!

[List Your First Property Button]

💡 Need Help?
Our support team is here for you at admin@hiddystays.com

Here's to your success!
The HiddyStays Team

P.S. Did we mention you keep 100% of your earnings? 😊
```

---

### **Template 5: Check-in Reminder (24h)**

#### Subject Line
`Your stay begins tomorrow at [Property Name]! 🗓️`

#### Copy Template
```
Hey [Guest Name]! 🎉

Your stay at [Property Name] begins tomorrow!

⏰ Check-in Details
━━━━━━━━━━━━━━━━━━━━
Date: [Tomorrow's Date]
Time: [Check-in Time]
Address: [Full Address]

[View on Google Maps Button]

📞 Host Contact
[Host Name]: [Phone Number]

📝 Important Reminders
• Bring a valid ID
• Check-in time: [Time]
• [Any special instructions]

🏠 Property Details
• WiFi: [Network/Password]
• Parking: [Instructions]
• Entry: [Key/code instructions]

Need to make changes or have questions?
Contact [Host Name] directly or reach us at admin@hiddystays.com

Safe travels!
The HiddyStays Team

━━━━━━━━━━━━━━━━━━━━
Your booking ID: [Booking ID]
```

---

## 🎨 Technical Implementation

### HTML Email Best Practices

#### 1. Use Tables for Layout (Email compatibility)
```html
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td align="center">
      <!-- Content -->
    </td>
  </tr>
</table>
```

#### 2. Inline CSS (Required for email clients)
```html
<td style="background-color: #1E3A5F; padding: 40px 30px; text-align: center;">
  <h1 style="color: #ffffff; font-size: 32px; margin: 0;">
    Welcome to HiddyStays
  </h1>
</td>
```

#### 3. Responsive Design
```html
<style>
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .heading { font-size: 24px !important; }
  }
</style>
```

#### 4. Button Styling
```html
<table cellpadding="0" cellspacing="0" role="presentation">
  <tr>
    <td style="background-color: #10B981; border-radius: 8px;">
      <a href="[URL]" style="
        display: inline-block;
        padding: 16px 32px;
        color: #ffffff;
        text-decoration: none;
        font-weight: 600;
        font-size: 16px;
      ">
        View Booking
      </a>
    </td>
  </tr>
</table>
```

---

## 📦 Resend Integration Code

### Setup Unified Email Service

```typescript
// lib/email/unified-email-service.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export class UnifiedEmailService {
  private from = 'HiddyStays <admin@hiddystays.com>';
  
  async sendBookingConfirmation(data: BookingConfirmationData) {
    await resend.emails.send({
      from: this.from,
      to: data.guestEmail,
      subject: `Your stay at ${data.propertyName} is confirmed! 🏠`,
      html: await this.renderTemplate('booking-confirmation', data),
    });
  }
  
  async sendHostNotification(data: HostNotificationData) {
    await resend.emails.send({
      from: this.from,
      to: data.hostEmail,
      subject: `New booking for ${data.propertyName} - You earned $${data.amount}! 🎉`,
      html: await this.renderTemplate('host-notification', data),
    });
  }
  
  async sendPaymentReceipt(data: PaymentReceiptData) {
    await resend.emails.send({
      from: this.from,
      to: data.email,
      subject: `Payment Receipt - Booking at ${data.propertyName}`,
      html: await this.renderTemplate('payment-receipt', data),
    });
  }
  
  async sendWelcomeEmail(data: WelcomeEmailData) {
    const subject = data.role === 'host' 
      ? 'Welcome to HiddyStays - List your property and keep 100%! 👋'
      : 'Welcome to HiddyStays - Discover your next stay! 👋';
      
    await resend.emails.send({
      from: this.from,
      to: data.email,
      subject,
      html: await this.renderTemplate('welcome', data),
    });
  }
  
  async sendCheckInReminder(data: CheckInReminderData) {
    await resend.emails.send({
      from: this.from,
      to: data.guestEmail,
      subject: `Your stay begins tomorrow at ${data.propertyName}! 🗓️`,
      html: await this.renderTemplate('checkin-reminder', data),
    });
  }
  
  private async renderTemplate(template: string, data: any): Promise<string> {
    // Use React Email or your template engine
    return await render(EmailTemplate[template](data));
  }
}
```

---

## 🎯 Testing Checklist

### Email Client Testing
- [ ] Gmail (Desktop & Mobile)
- [ ] Outlook (Desktop & Mobile)
- [ ] Apple Mail (iOS & macOS)
- [ ] Yahoo Mail
- [ ] ProtonMail
- [ ] Dark mode compatibility

### Content Testing
- [ ] All dynamic variables populate correctly
- [ ] Links work (tracking enabled)
- [ ] Images load with alt text
- [ ] Buttons are tappable (44px minimum)
- [ ] Responsive on all screen sizes
- [ ] Plain text version available

### Compliance
- [ ] Unsubscribe link present
- [ ] Physical address in footer
- [ ] CAN-SPAM compliant
- [ ] GDPR compliant (if applicable)
- [ ] Proper from/reply-to addresses

---

## 📊 Tracking & Analytics

### Email Metrics to Track
- Open rate
- Click-through rate
- Conversion rate (bookings from emails)
- Unsubscribe rate
- Bounce rate

### Implementation
```typescript
// Add UTM parameters to links
const trackingUrl = `${baseUrl}?utm_source=email&utm_medium=booking_confirmation&utm_campaign=guest_experience`;
```

---

## 🚀 Deployment Steps

1. Create email templates in `/emails` directory
2. Set up Resend API key in environment variables
3. Implement UnifiedEmailService
4. Update webhook handlers to trigger emails
5. Test in development with test email addresses
6. Deploy to production
7. Monitor delivery rates and user feedback

---

**Questions or need clarification?**
Contact the development team or refer to:
- Resend Documentation: https://resend.com/docs
- React Email: https://react.email
