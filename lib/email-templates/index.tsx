import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

interface EmailTemplateProps {
  name?: string;
  email?: string;
  [key: string]: any;
}

// Base template with consistent branding (premium minimal)
const brand = "#1E3A5F"; // deep navy
const accent = "#F59E0B"; // amber
const textMain = "#0F172A"; // slate-900
const textMuted = "#475569"; // slate-600

export const BaseTemplate = ({
  children,
  preview,
  title,
}: {
  children: React.ReactNode;
  preview?: string;
  title?: string;
}) => (
  <Html>
    <Head />
    <Preview>{preview || title || ""}</Preview>
    <Body style={{ backgroundColor: "#f9fafb", margin: "0", fontFamily: 'system-ui, sans-serif' }}>
      <Container style={{ backgroundColor: "#ffffff", margin: "32px auto", padding: "32px", maxWidth: "560px", borderRadius: "8px" }}>
        {/* Header */}
        <Section>
          <Heading style={{ color: "#111827", fontSize: "24px", fontWeight: "600", margin: "0 0 8px 0" }}>
            HiddyStays
          </Heading>
          <Text style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 32px 0" }}>
            Direct stays. Zero fees.
          </Text>
        </Section>

        {/* Content */}
        {children}

        {/* Footer */}
        <Hr style={{ borderColor: "#e5e7eb", margin: "32px 0 24px 0" }} />
        <Text style={{ color: "#9ca3af", fontSize: "12px", textAlign: "center", margin: "0" }}>
          © {new Date().getFullYear()} HiddyStays • hello@hiddystays.com
        </Text>
      </Container>
    </Body>
  </Html>
);

// Welcome Email Template
export const WelcomeEmail = ({ name, email }: EmailTemplateProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://hiddystays.com";
  return (
    <BaseTemplate
      title="Welcome to HiddyStays!"
      preview="Your journey to authentic travel begins here"
    >
      <Heading style={{ color: textMain, fontSize: 20, fontWeight: 800, margin: 0 }}>
        Welcome to HiddyStays{name ? `, ${name}` : ''}
      </Heading>

      <Text style={{ color: textMuted, fontSize: 14, lineHeight: '22px' }}>
        Thanks for joining. Book direct and skip platform fees.
      </Text>

      <Section style={{ textAlign: 'center', margin: '20px 0' }}>
        <Button
          style={{ backgroundColor: brand, color: '#FFFFFF', padding: '10px 16px', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}
          href={`${baseUrl}/properties`}
        >
          Explore properties
        </Button>
      </Section>

      <Text style={{ color: textMuted, fontSize: 14 }}>Questions? Reply to this email.</Text>
    </BaseTemplate>
  );
};

// Booking Confirmation Template
export const BookingConfirmationEmail = ({
  guestName,
  propertyTitle,
  checkInDate,
  checkOutDate,
  guests,
  totalAmount,
  bookingId,
}: EmailTemplateProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://hiddystays.com";
  return (
    <BaseTemplate
      title="Booking Confirmed!"
      preview={`Your stay at ${propertyTitle} is confirmed`}
    >
      <Heading style={{ color: "#111827", fontSize: "20px", fontWeight: "600", margin: "0 0 16px 0" }}>
        Booking Confirmed
      </Heading>

      <Text style={{ color: "#374151", fontSize: "16px", margin: "0 0 24px 0" }}>
        Hi {guestName}, your booking is confirmed for <strong>{propertyTitle}</strong>.
      </Text>

      <Section style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '24px', margin: '24px 0' }}>
        <Text style={{ color: "#111827", fontSize: "16px", fontWeight: "600", margin: "0 0 16px 0" }}>
          Booking Details
        </Text>
        
        <Text style={{ color: "#374151", fontSize: "14px", margin: "8px 0" }}>
          <strong>Property:</strong> {propertyTitle}
        </Text>
        <Text style={{ color: "#374151", fontSize: "14px", margin: "8px 0" }}>
          <strong>Check-in:</strong> {checkInDate}
        </Text>
        <Text style={{ color: "#374151", fontSize: "14px", margin: "8px 0" }}>
          <strong>Check-out:</strong> {checkOutDate}
        </Text>
        <Text style={{ color: "#374151", fontSize: "14px", margin: "8px 0" }}>
          <strong>Guests:</strong> {guests}
        </Text>
        <Text style={{ color: "#374151", fontSize: "14px", margin: "8px 0" }}>
          <strong>Total:</strong> ${totalAmount}
        </Text>
        <Text style={{ color: "#6b7280", fontSize: "12px", margin: "16px 0 0 0" }}>
          Booking ID: {bookingId}
        </Text>
      </Section>

      <Section style={{ textAlign: "center", margin: "32px 0" }}>
        <Button
          style={{ backgroundColor: "#111827", color: "#ffffff", padding: "12px 24px", borderRadius: "6px", fontWeight: "600", textDecoration: "none" }}
          href={`${baseUrl}/bookings/${bookingId}`}
        >
          View Booking
        </Button>
      </Section>

      <Text style={{ color: "#6b7280", fontSize: "14px", margin: "24px 0 0 0" }}>
        Questions? Reply to this email or contact hello@hiddystays.com
      </Text>
    </BaseTemplate>
  );
};

// Host Notification Template
export const HostNotificationEmail = ({
  hostName,
  guestName,
  propertyTitle,
  checkInDate,
  checkOutDate,
  guests,
  totalAmount,
  bookingId,
}: EmailTemplateProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://hiddystays.com";
  return (
    <BaseTemplate
      title="New Booking Received!"
      preview={`${guestName} booked your ${propertyTitle}`}
    >
      <Heading style={{ color: textMain, fontSize: 20, fontWeight: 800, margin: 0 }}>
        New booking received
      </Heading>

      <Text style={{ color: textMuted, fontSize: 14 }}>
        Hi {hostName}, you have a new booking for <strong>{propertyTitle}</strong>.
      </Text>

      <Section style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, margin: '16px 0' }}>
        <Heading className="text-lg font-semibold text-gray-900 m-0 mb-4">
          📋 Guest & Booking Information
        </Heading>

        <Row className="mb-2">
          <Column>
            <Text className="text-sm text-gray-600 m-0">Guest:</Text>
          </Column>
          <Column>
            <Text className="text-sm font-semibold text-gray-900 m-0">
              {guestName}
            </Text>
          </Column>
        </Row>

        <Row className="mb-2">
          <Column>
            <Text className="text-sm text-gray-600 m-0">Property:</Text>
          </Column>
          <Column>
            <Text className="text-sm font-semibold text-gray-900 m-0">
              {propertyTitle}
            </Text>
          </Column>
        </Row>

        <Row className="mb-2">
          <Column>
            <Text className="text-sm text-gray-600 m-0">Check-in:</Text>
          </Column>
          <Column>
            <Text className="text-sm font-semibold text-gray-900 m-0">
              {checkInDate}
            </Text>
          </Column>
        </Row>

        <Row className="mb-2">
          <Column>
            <Text className="text-sm text-gray-600 m-0">Check-out:</Text>
          </Column>
          <Column>
            <Text className="text-sm font-semibold text-gray-900 m-0">
              {checkOutDate}
            </Text>
          </Column>
        </Row>

        <Row className="mb-2">
          <Column>
            <Text className="text-sm text-gray-600 m-0">Guests:</Text>
          </Column>
          <Column>
            <Text className="text-sm font-semibold text-gray-900 m-0">
              {guests}
            </Text>
          </Column>
        </Row>

        <Row className="mb-2">
          <Column>
            <Text className="text-sm text-gray-600 m-0">Earnings:</Text>
          </Column>
          <Column>
            <Text style={{ color: brand, fontSize: 16, fontWeight: 700, margin: 0 }}>
              ${totalAmount}
            </Text>
          </Column>
        </Row>

        <Row>
          <Column>
            <Text className="text-sm text-gray-600 m-0">Booking ID:</Text>
          </Column>
          <Column>
            <Text className="text-sm font-mono text-gray-900 m-0">
              #{bookingId}
            </Text>
          </Column>
        </Row>
      </Section>

      <Section className="text-center my-8">
        <Button
          style={{ backgroundColor: brand, color: '#FFFFFF', padding: '10px 16px', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}
          href={`${baseUrl}/host-dashboard?booking=${bookingId}`}
        >
          View booking
        </Button>
      </Section>

      <Text className="text-base text-gray-700 leading-6">
        Pro tip: Send a personal welcome message within 24 hours! Guests who
        receive a warm welcome are 73% more likely to leave 5-star reviews.
      </Text>

      <Text className="text-base text-gray-700 leading-6 font-semibold">
        Here's to another amazing authentic experience!
        <br />
        Your Host Success Team at HiddyStays 🌟
      </Text>
    </BaseTemplate>
  );
};

// Password Reset Template
export const PasswordResetEmail = ({ name, resetUrl }: EmailTemplateProps) => (
  <BaseTemplate
    title="Reset Your Password"
    preview="Reset your HiddyStays password"
  >
      <Heading style={{ color: textMain, fontSize: 20, fontWeight: 800, margin: 0 }}>
      Password reset
    </Heading>

    <Text className="text-base text-gray-700 leading-6">
      Hi {name}, we received a request to reset your password. If this was you,
      click the button below.
    </Text>

    <Section style={{ textAlign: 'center', margin: '20px 0' }}>
      <Button
        style={{ backgroundColor: brand, color: '#FFFFFF', padding: '10px 16px', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}
        href={resetUrl}
      >
        Reset password
      </Button>
    </Section>

    <Text className="text-sm text-gray-600 leading-6">
      This link expires in 30 minutes. If you didn't request this, you can
      ignore this email or contact support.
    </Text>

    <Text className="text-base text-gray-700 leading-6">
      Need help? Contact us at support@hiddystays.com
    </Text>
  </BaseTemplate>
);

// Check-in Reminder Template
export const CheckInReminderEmail = ({
  guestName,
  propertyTitle,
  checkInDate,
  checkInTime,
  hostName,
  hostPhone,
  propertyAddress,
  bookingId,
}: EmailTemplateProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://hiddystays.com";
  return (
    <BaseTemplate
      title="Check-in Reminder"
      preview={`Your stay at ${propertyTitle} starts soon`}
    >
      <Heading style={{ color: textMain, fontSize: 20, fontWeight: 800, margin: 0 }}>
        Check‑in reminder
      </Heading>

      <Text className="text-base text-gray-700 leading-6">
        Hi {guestName}, just a friendly reminder that your stay at <strong>{propertyTitle}</strong> starts soon.
      </Text>

      <Section style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, margin: '16px 0' }}>
        <Row className="mb-2">
          <Column>
            <Text className="text-sm text-gray-600 m-0">Check-in date:</Text>
          </Column>
          <Column>
            <Text className="text-sm font-semibold text-gray-900 m-0">{checkInDate}</Text>
          </Column>
        </Row>
        {checkInTime && (
          <Row className="mb-2">
            <Column>
              <Text className="text-sm text-gray-600 m-0">Check-in time:</Text>
            </Column>
            <Column>
              <Text className="text-sm font-semibold text-gray-900 m-0">{checkInTime}</Text>
            </Column>
          </Row>
        )}
        {propertyAddress && (
          <Row>
            <Column>
              <Text className="text-sm text-gray-600 m-0">Address:</Text>
            </Column>
            <Column>
              <Text className="text-sm font-semibold text-gray-900 m-0">{propertyAddress}</Text>
            </Column>
          </Row>
        )}
      </Section>

      {hostName && (
        <Section style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, margin: '16px 0' }}>
          <Heading className="text-lg font-semibold text-gray-900 m-0 mb-4">Your Host</Heading>
          <Text className="text-sm text-gray-700 m-0"><strong>{hostName}</strong>{hostPhone ? ` • ${hostPhone}` : ""}</Text>
        </Section>
      )}

      <Section style={{ textAlign: 'center', margin: '20px 0' }}>
        <Button
          style={{ backgroundColor: brand, color: '#FFFFFF', padding: '10px 16px', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}
          href={`${baseUrl}/bookings/${bookingId}`}
        >
          View booking
        </Button>
      </Section>
    </BaseTemplate>
  );
};

// Booking Cancellation Template
export const BookingCancellationEmail = ({
  guestName,
  propertyTitle,
  checkInDate,
  checkOutDate,
  refundAmount,
  refundPercentage,
  cancellationReason,
  bookingId,
}: EmailTemplateProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://hiddystays.com";
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <BaseTemplate
      title="Booking Cancelled - We're Sorry to See You Go"
      preview={`Your booking at ${propertyTitle} has been cancelled`}
    >
      <Heading style={{ color: textMain, fontSize: 24, fontWeight: 800, margin: '0 0 16px 0' }}>
        Booking Cancelled
      </Heading>

      <Text style={{ fontSize: 16, color: '#374151', lineHeight: '24px', margin: '0 0 20px 0' }}>
        Hi {guestName},
      </Text>

      <Text style={{ fontSize: 16, color: '#374151', lineHeight: '24px', margin: '0 0 24px 0' }}>
        We're sorry to confirm that your booking for <strong>{propertyTitle}</strong> has been cancelled. 
        We understand that plans can change, and we're here to help make your next booking experience even better.
      </Text>

      <Section style={{ 
        backgroundColor: '#F9FAFB', 
        border: '2px solid #E5E7EB', 
        borderRadius: 12, 
        padding: 20, 
        margin: '24px 0' 
      }}>
        <Heading style={{ color: '#111827', fontSize: 18, fontWeight: 600, margin: '0 0 16px 0' }}>
          Cancelled Booking Details
        </Heading>
        
        <Row style={{ marginBottom: 12 }}>
          <Column style={{ width: '40%' }}>
            <Text style={{ fontSize: 14, color: '#6B7280', margin: 0, fontWeight: 500 }}>Property:</Text>
          </Column>
          <Column style={{ width: '60%' }}>
            <Text style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{propertyTitle}</Text>
          </Column>
        </Row>
        
        <Row style={{ marginBottom: 12 }}>
          <Column style={{ width: '40%' }}>
            <Text style={{ fontSize: 14, color: '#6B7280', margin: 0, fontWeight: 500 }}>Check-in:</Text>
          </Column>
          <Column style={{ width: '60%' }}>
            <Text style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{formatDate(checkInDate)}</Text>
          </Column>
        </Row>
        
        <Row style={{ marginBottom: 12 }}>
          <Column style={{ width: '40%' }}>
            <Text style={{ fontSize: 14, color: '#6B7280', margin: 0, fontWeight: 500 }}>Check-out:</Text>
          </Column>
          <Column style={{ width: '60%' }}>
            <Text style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{formatDate(checkOutDate)}</Text>
          </Column>
        </Row>

        {typeof refundAmount !== "undefined" && refundAmount > 0 && (
          <Row style={{ marginBottom: 12 }}>
            <Column style={{ width: '40%' }}>
              <Text style={{ fontSize: 14, color: '#6B7280', margin: 0, fontWeight: 500 }}>Refund Amount:</Text>
            </Column>
            <Column style={{ width: '60%' }}>
              <Text style={{ fontSize: 14, fontWeight: 600, color: '#059669', margin: 0 }}>
                ${refundAmount.toFixed(2)}{refundPercentage ? ` (${refundPercentage}% refund)` : ""}
              </Text>
            </Column>
          </Row>
        )}

        {cancellationReason && (
          <Row>
            <Column style={{ width: '40%' }}>
              <Text style={{ fontSize: 14, color: '#6B7280', margin: 0, fontWeight: 500 }}>Reason:</Text>
            </Column>
            <Column style={{ width: '60%' }}>
              <Text style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{cancellationReason}</Text>
            </Column>
          </Row>
        )}
      </Section>

      {typeof refundAmount !== "undefined" && refundAmount > 0 && (
        <Section style={{ 
          backgroundColor: '#ECFDF5', 
          border: '1px solid #A7F3D0', 
          borderRadius: 8, 
          padding: 16, 
          margin: '20px 0' 
        }}>
          <Text style={{ fontSize: 14, color: '#065F46', margin: 0, fontWeight: 500 }}>
            💰 <strong>Refund Processing:</strong> Your refund of ${refundAmount.toFixed(2)} will be processed within 3-5 business days 
            and will appear on your original payment method.
          </Text>
        </Section>
      )}

      <Text style={{ fontSize: 16, color: '#374151', lineHeight: '24px', margin: '24px 0' }}>
        We'd love to help you find another perfect stay! Browse our collection of unique properties and discover your next adventure.
      </Text>

      <Section style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button 
          style={{ 
            backgroundColor: brand, 
            color: '#FFFFFF', 
            padding: '12px 24px', 
            borderRadius: 8, 
            fontWeight: 600, 
            textDecoration: 'none',
            fontSize: 16
          }} 
          href={`${baseUrl}/properties`}
        >
          🏠 Browse Available Properties
        </Button>
      </Section>

      <Hr style={{ margin: '32px 0', borderColor: '#E5E7EB' }} />

      <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: '20px', margin: '16px 0' }}>
        Need help with your next booking or have questions about this cancellation? 
        <Link href={`${baseUrl}/contact`} style={{ color: brand, textDecoration: 'none' }}>Contact our support team</Link> - we're here to help!
      </Text>

      <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: '20px', margin: 0 }}>
        Thank you for choosing HiddyStays. We hope to welcome you back soon!
      </Text>
    </BaseTemplate>
  );
};

// Payment Receipt Template
export const PaymentReceiptEmail = ({
  guestName,
  propertyTitle,
  amountPaid,
  paymentDate,
  bookingId,
  receiptUrl,
}: EmailTemplateProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://hiddystays.com";
  return (
    <BaseTemplate
      title="Payment Receipt"
      preview={`Your payment for ${propertyTitle} was received`}
    >
      <Heading style={{ color: textMain, fontSize: 20, fontWeight: 800, margin: 0 }}>Payment receipt</Heading>

      <Text className="text-base text-gray-700 leading-6">
        Hi {guestName}, we've received your payment for <strong>{propertyTitle}</strong>.
      </Text>

      <Section style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, margin: '16px 0' }}>
        <Row className="mb-2">
          <Column>
            <Text className="text-sm text-gray-600 m-0">Amount:</Text>
          </Column>
          <Column>
            <Text style={{ color: brand, fontSize: 16, fontWeight: 700, margin: 0 }}>${'{'}amountPaid{'}'}</Text>
          </Column>
        </Row>
        {paymentDate && (
          <Row>
            <Column>
              <Text className="text-sm text-gray-600 m-0">Date:</Text>
            </Column>
            <Column>
              <Text className="text-sm font-semibold text-gray-900 m-0">{paymentDate}</Text>
            </Column>
          </Row>
        )}
      </Section>

      <Section style={{ textAlign: 'center', margin: '20px 0' }}>
        <Button
          style={{ backgroundColor: brand, color: '#FFFFFF', padding: '10px 16px', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}
          href={receiptUrl || `${baseUrl}/bookings/${bookingId}`}
        >
          View receipt
        </Button>
      </Section>
    </BaseTemplate>
  );
};

// Newsletter Subscription Template
export const NewsletterWelcomeEmail = ({ name, email }: EmailTemplateProps) => (
  <BaseTemplate
    title="Welcome to Our Newsletter!"
    preview="Stay updated with the latest travel tips and deals"
  >
      <Heading style={{ color: textMain, fontSize: 20, fontWeight: 800, margin: 0 }}>
      Welcome to our newsletter
    </Heading>

    <Text style={{ color: textMuted, fontSize: 14 }}>
      Thanks for subscribing. Expect occasional tips, deals, and new stays.
    </Text>

    <Section style={{ textAlign: 'center', margin: '20px 0' }}>
      <Button
        style={{ backgroundColor: brand, color: '#FFFFFF', padding: '10px 16px', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}
        href="/properties"
      >
        Explore properties
      </Button>
    </Section>

    <Text style={{ color: textMuted, fontSize: 14 }}>You can unsubscribe any time.</Text>
  </BaseTemplate>
);

// Export all templates
export const EmailTemplates = {
  WelcomeEmail,
  BookingConfirmationEmail,
  HostNotificationEmail,
  PasswordResetEmail,
  NewsletterWelcomeEmail,
  CheckInReminderEmail,
  BookingCancellationEmail,
  PaymentReceiptEmail,
};
