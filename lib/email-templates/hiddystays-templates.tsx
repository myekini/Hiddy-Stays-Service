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

// HiddyStays Brand Colors
const brandColors = {
  primaryBlue: "#1E3A5F",
  accentGreen: "#10B981",
  background: "#F9FAFB",
  textDark: "#111827",
  textLight: "#6B7280",
  border: "#E5E7EB",
  success: "#059669",
  warning: "#FEF3C7",
};

interface EmailTemplateProps {
  [key: string]: any;
}

// Base template with HiddyStays branding
export const HiddyStaysBaseTemplate = ({
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
    <Tailwind>
      <Body
        style={{
          backgroundColor: brandColors.background,
          margin: "0",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <Container
          style={{
            backgroundColor: "#FFFFFF",
            margin: "40px auto",
            maxWidth: 600,
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* Header */}
          <Section
            style={{
              backgroundColor: brandColors.primaryBlue,
              padding: "20px 30px",
              textAlign: "center",
            }}
          >
            <Heading
              style={{
                color: "#FFFFFF",
                fontSize: "28px",
                fontWeight: "800",
                margin: "0",
                fontFamily: "Inter, sans-serif",
              }}
            >
              HiddyStays
            </Heading>
            <Text
              style={{
                color: "#E5E7EB",
                fontSize: "14px",
                margin: "4px 0 0",
                fontWeight: "500",
              }}
            >
              Zero Fee Stays
            </Text>
          </Section>

          {/* Content */}
          <Section style={{ padding: "40px 30px" }}>{children}</Section>

          {/* Footer */}
          <Section
            style={{
              backgroundColor: brandColors.background,
              padding: "30px",
              textAlign: "center",
            }}
          >
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "12px",
                margin: "0 0 8px",
                fontWeight: "500",
              }}
            >
              © {new Date().getFullYear()} HiddyStays - Keep 100% of your
              earnings
            </Text>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "12px",
                margin: "0 0 8px",
              }}
            >
              Support: admin@hiddystays.com
            </Text>
            <Link
              href="#"
              style={{
                color: brandColors.textLight,
                fontSize: "12px",
                textDecoration: "underline",
              }}
            >
              Unsubscribe
            </Link>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

// Template 1: Booking Confirmation (Guest)
export const BookingConfirmationTemplate = ({
  guestName,
  propertyName,
  propertyImage,
  hostName,
  hostAvatar,
  checkInDate,
  checkInTime,
  checkOutDate,
  checkOutTime,
  guests,
  totalAmount,
  bookingId,
  propertyAddress,
  hostInstructions,
  googleMapsLink,
}: EmailTemplateProps) => {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://hiddystays.com";

  return (
    <HiddyStaysBaseTemplate
      title="Booking Confirmed!"
      preview={`Your stay at ${propertyName} is confirmed! 🏠`}
    >
      {/* Hero Image */}
      {propertyImage && (
        <Section style={{ margin: "0 0 30px", textAlign: "center" }}>
          <Img
            src={propertyImage}
            alt={propertyName}
            style={{
              width: "100%",
              height: "200px",
              objectFit: "cover",
              borderRadius: "12px",
            }}
          />
        </Section>
      )}

      {/* Greeting */}
      <Heading
        style={{
          color: brandColors.textDark,
          fontSize: "24px",
          fontWeight: "700",
          margin: "0 0 16px",
          textAlign: "center",
        }}
      >
        Hey {guestName}! 🎉
      </Heading>

      <Text
        style={{
          color: brandColors.textDark,
          fontSize: "16px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "0 0 30px",
        }}
      >
        Great news! Your booking at <strong>{propertyName}</strong> is
        confirmed.
      </Text>

      <Text
        style={{
          color: brandColors.textLight,
          fontSize: "16px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "0 0 30px",
        }}
      >
        <strong>{hostName}</strong> is excited to welcome you on {checkInDate}.
      </Text>

      {/* Booking Details Card */}
      <Section
        style={{
          backgroundColor: brandColors.background,
          borderRadius: "12px",
          padding: "30px",
          margin: "30px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "18px",
            fontWeight: "700",
            margin: "0 0 20px",
            textAlign: "center",
          }}
        >
          🏠 Your Booking Details
        </Heading>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "30%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Property:
            </Text>
          </Column>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              {propertyName}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "30%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Address:
            </Text>
          </Column>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
              }}
            >
              {propertyAddress}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "30%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Check-in:
            </Text>
          </Column>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
              }}
            >
              {checkInDate} at {checkInTime}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "30%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Check-out:
            </Text>
          </Column>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
              }}
            >
              {checkOutDate} at {checkOutTime}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "30%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Guests:
            </Text>
          </Column>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
              }}
            >
              {guests}
            </Text>
          </Column>
        </Row>

        <Hr style={{ borderColor: brandColors.border, margin: "20px 0" }} />

        <Row style={{ margin: "0" }}>
          <Column style={{ width: "30%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Total Paid:
            </Text>
          </Column>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                color: brandColors.accentGreen,
                fontSize: "18px",
                margin: "0",
                fontWeight: "700",
              }}
            >
              ${totalAmount}
            </Text>
          </Column>
        </Row>

        <Text
          style={{
            color: brandColors.textLight,
            fontSize: "12px",
            textAlign: "center",
            margin: "16px 0 0",
            fontStyle: "italic",
          }}
        >
          (Zero platform fees - transparent pricing!)
        </Text>
      </Section>

      {/* Primary CTA */}
      <Section style={{ textAlign: "center", margin: "40px 0" }}>
        <Button
          style={{
            backgroundColor: brandColors.accentGreen,
            color: "#FFFFFF",
            padding: "16px 32px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "16px",
            textDecoration: "none",
            display: "inline-block",
          }}
          href={`${baseUrl}/bookings/${bookingId}`}
        >
          View Booking Details
        </Button>
      </Section>

      {/* Host Contact Card */}
      <Section
        style={{
          backgroundColor: "#FFFFFF",
          border: `1px solid ${brandColors.border}`,
          borderRadius: "12px",
          padding: "20px",
          margin: "30px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "16px",
            fontWeight: "700",
            margin: "0 0 16px",
            textAlign: "center",
          }}
        >
          Your Host
        </Heading>

        <Row>
          <Column style={{ width: "20%", textAlign: "center" }}>
            {hostAvatar && (
              <Img
                src={hostAvatar}
                alt={hostName}
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            )}
          </Column>
          <Column style={{ width: "80%", paddingLeft: "16px" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "16px",
                margin: "0 0 8px",
                fontWeight: "600",
              }}
            >
              {hostName}
            </Text>
            <Button
              style={{
                backgroundColor: brandColors.primaryBlue,
                color: "#FFFFFF",
                padding: "8px 16px",
                borderRadius: "6px",
                fontWeight: "500",
                fontSize: "14px",
                textDecoration: "none",
                display: "inline-block",
              }}
              href={`${baseUrl}/messages?host=${hostName}`}
            >
              Message Host
            </Button>
          </Column>
        </Row>
      </Section>

      {/* Important Notes */}
      {hostInstructions && (
        <Section
          style={{
            backgroundColor: brandColors.warning,
            borderRadius: "12px",
            padding: "20px",
            margin: "30px 0",
          }}
        >
          <Heading
            style={{
              color: brandColors.textDark,
              fontSize: "16px",
              fontWeight: "700",
              margin: "0 0 12px",
            }}
          >
            📝 Important Notes
          </Heading>
          <Text
            style={{
              color: brandColors.textDark,
              fontSize: "14px",
              lineHeight: "1.5",
              margin: "0",
            }}
          >
            • Check-in time: {checkInTime}
            <br />• {hostInstructions}
          </Text>
        </Section>
      )}

      {/* Getting There */}
      {googleMapsLink && (
        <Section style={{ textAlign: "center", margin: "30px 0" }}>
          <Button
            style={{
              backgroundColor: "#FFFFFF",
              color: brandColors.primaryBlue,
              border: `2px solid ${brandColors.primaryBlue}`,
              padding: "12px 24px",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "14px",
              textDecoration: "none",
              display: "inline-block",
            }}
            href={googleMapsLink}
          >
            📍 View on Google Maps
          </Button>
        </Section>
      )}

      <Text
        style={{
          color: brandColors.textLight,
          fontSize: "14px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "30px 0 0",
        }}
      >
        Need to make changes? Contact us at admin@hiddystays.com
      </Text>

      <Text
        style={{
          color: brandColors.textDark,
          fontSize: "16px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "20px 0 0",
          fontWeight: "600",
        }}
      >
        Happy travels!
        <br />
        The HiddyStays Team
      </Text>
    </HiddyStaysBaseTemplate>
  );
};

// Template 2: New Booking Alert (Host)
export const HostNotificationTemplate = ({
  hostName,
  guestName,
  propertyName,
  checkInDate,
  checkInTime,
  checkOutDate,
  checkOutTime,
  guests,
  totalAmount,
  stripeFee,
  netAmount,
  bookingId,
  guestEmail,
  guestPhone,
  specialRequests,
}: EmailTemplateProps) => {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://hiddystays.com";

  return (
    <HiddyStaysBaseTemplate
      title="New Booking Received!"
      preview={`New booking for ${propertyName} - You earned $${netAmount}! 🎉`}
    >
      {/* Earnings Hero */}
      <Section
        style={{
          background: `linear-gradient(135deg, ${brandColors.accentGreen} 0%, ${brandColors.success} 100%)`,
          padding: "60px 30px",
          textAlign: "center",
          margin: "-40px -30px 40px",
        }}
      >
        <Heading
          style={{
            color: "#FFFFFF",
            fontSize: "32px",
            fontWeight: "800",
            margin: "0 0 8px",
          }}
        >
          💰 New Booking!
        </Heading>
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: "24px",
            fontWeight: "700",
            margin: "0",
          }}
        >
          You earned ${netAmount}
        </Text>
      </Section>

      <Heading
        style={{
          color: brandColors.textDark,
          fontSize: "24px",
          fontWeight: "700",
          margin: "0 0 16px",
          textAlign: "center",
        }}
      >
        Hey {hostName}! 🎉
      </Heading>

      <Text
        style={{
          color: brandColors.textDark,
          fontSize: "16px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "0 0 30px",
        }}
      >
        Fantastic news! You have a new booking for{" "}
        <strong>{propertyName}</strong>.
      </Text>

      {/* Guest Info Card */}
      <Section
        style={{
          backgroundColor: brandColors.background,
          borderRadius: "12px",
          padding: "30px",
          margin: "30px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "18px",
            fontWeight: "700",
            margin: "0 0 20px",
            textAlign: "center",
          }}
        >
          👤 Guest Information
        </Heading>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "30%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Name:
            </Text>
          </Column>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              {guestName}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "30%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Check-in:
            </Text>
          </Column>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
              }}
            >
              {checkInDate}, {checkInTime}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "30%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Check-out:
            </Text>
          </Column>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
              }}
            >
              {checkOutDate}, {checkOutTime}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "30%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Guests:
            </Text>
          </Column>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
              }}
            >
              {guests}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "30%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Email:
            </Text>
          </Column>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
              }}
            >
              {guestEmail}
            </Text>
          </Column>
        </Row>

        {guestPhone && (
          <Row style={{ margin: "0" }}>
            <Column style={{ width: "30%" }}>
              <Text
                style={{
                  color: brandColors.textLight,
                  fontSize: "14px",
                  margin: "0",
                  fontWeight: "600",
                }}
              >
                Phone:
              </Text>
            </Column>
            <Column style={{ width: "70%" }}>
              <Text
                style={{
                  color: brandColors.textDark,
                  fontSize: "14px",
                  margin: "0",
                }}
              >
                {guestPhone}
              </Text>
            </Column>
          </Row>
        )}
      </Section>

      {/* Earnings Breakdown */}
      <Section
        style={{
          backgroundColor: brandColors.warning,
          borderRadius: "12px",
          padding: "30px",
          margin: "30px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "18px",
            fontWeight: "700",
            margin: "0 0 20px",
            textAlign: "center",
          }}
        >
          💰 Your Earnings (100% Kept!)
        </Heading>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "60%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Booking Amount:
            </Text>
          </Column>
          <Column style={{ width: "40%", textAlign: "right" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              ${totalAmount}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "60%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Platform Fee:
            </Text>
          </Column>
          <Column style={{ width: "40%", textAlign: "right" }}>
            <Text
              style={{
                color: brandColors.accentGreen,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              $0.00 ✨
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "60%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Payment Processing:
            </Text>
          </Column>
          <Column style={{ width: "40%", textAlign: "right" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              -${stripeFee}
            </Text>
          </Column>
        </Row>

        <Hr style={{ borderColor: brandColors.border, margin: "16px 0" }} />

        <Row style={{ margin: "0" }}>
          <Column style={{ width: "60%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "16px",
                margin: "0",
                fontWeight: "700",
              }}
            >
              You Keep:
            </Text>
          </Column>
          <Column style={{ width: "40%", textAlign: "right" }}>
            <Text
              style={{
                color: brandColors.accentGreen,
                fontSize: "18px",
                margin: "0",
                fontWeight: "700",
              }}
            >
              ${netAmount}
            </Text>
          </Column>
        </Row>

        <Text
          style={{
            color: brandColors.textDark,
            fontSize: "14px",
            textAlign: "center",
            margin: "16px 0 0",
            fontWeight: "600",
          }}
        >
          That's 100% of the booking amount!
          <br />
          No hidden fees. Ever.
        </Text>
      </Section>

      {/* Special Requests */}
      {specialRequests && (
        <Section
          style={{
            backgroundColor: "#FFFFFF",
            border: `1px solid ${brandColors.border}`,
            borderRadius: "12px",
            padding: "20px",
            margin: "30px 0",
          }}
        >
          <Heading
            style={{
              color: brandColors.textDark,
              fontSize: "16px",
              fontWeight: "700",
              margin: "0 0 12px",
            }}
          >
            💬 Special Requests
          </Heading>
          <Text
            style={{
              color: brandColors.textDark,
              fontSize: "14px",
              lineHeight: "1.5",
              margin: "0",
            }}
          >
            {specialRequests}
          </Text>
        </Section>
      )}

      {/* Action Buttons */}
      <Section style={{ textAlign: "center", margin: "40px 0" }}>
        <Row>
          <Column style={{ width: "48%", paddingRight: "2%" }}>
            <Button
              style={{
                backgroundColor: brandColors.accentGreen,
                color: "#FFFFFF",
                padding: "16px 24px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none",
                display: "inline-block",
                width: "100%",
              }}
              href={`${baseUrl}/host-dashboard?booking=${bookingId}`}
            >
              View Booking
            </Button>
          </Column>
          <Column style={{ width: "48%", paddingLeft: "2%" }}>
            <Button
              style={{
                backgroundColor: "#FFFFFF",
                color: brandColors.primaryBlue,
                border: `2px solid ${brandColors.primaryBlue}`,
                padding: "14px 24px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none",
                display: "inline-block",
                width: "100%",
              }}
              href={`${baseUrl}/messages?guest=${guestEmail}`}
            >
              Contact Guest
            </Button>
          </Column>
        </Row>
      </Section>

      {/* Next Steps */}
      <Section
        style={{
          backgroundColor: brandColors.background,
          borderRadius: "12px",
          padding: "20px",
          margin: "30px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "16px",
            fontWeight: "700",
            margin: "0 0 12px",
          }}
        >
          📋 Next Steps
        </Heading>
        <Text
          style={{
            color: brandColors.textDark,
            fontSize: "14px",
            lineHeight: "1.5",
            margin: "0",
          }}
        >
          1. Review the booking details
          <br />
          2. Prepare your property
          <br />
          3. Send a welcome message to your guest
        </Text>
      </Section>

      <Text
        style={{
          color: brandColors.textLight,
          fontSize: "14px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "30px 0 0",
        }}
      >
        Questions? We're here to help at admin@hiddystays.com
      </Text>

      <Text
        style={{
          color: brandColors.textDark,
          fontSize: "16px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "20px 0 0",
          fontWeight: "600",
        }}
      >
        Cheers,
        <br />
        The HiddyStays Team
      </Text>
    </HiddyStaysBaseTemplate>
  );
};

// Template 3: Payment Receipt
export const PaymentReceiptTemplate = ({
  guestName,
  propertyName,
  transactionId,
  paymentDate,
  paymentTime,
  paymentMethod,
  accommodationAmount,
  cleaningFee,
  serviceFee,
  paymentProcessingFee,
  totalAmount,
  bookingId,
  receiptUrl,
}: EmailTemplateProps) => {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://hiddystays.com";

  return (
    <HiddyStaysBaseTemplate
      title="Payment Receipt"
      preview={`Payment Receipt - Booking at ${propertyName}`}
    >
      <Heading
        style={{
          color: brandColors.textDark,
          fontSize: "24px",
          fontWeight: "700",
          margin: "0 0 16px",
          textAlign: "center",
        }}
      >
        Payment Receipt
      </Heading>

      <Text
        style={{
          color: brandColors.textDark,
          fontSize: "16px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "0 0 30px",
        }}
      >
        Hi {guestName}, here's your payment receipt for{" "}
        <strong>{propertyName}</strong>.
      </Text>

      {/* Transaction Details */}
      <Section
        style={{
          backgroundColor: brandColors.background,
          borderRadius: "12px",
          padding: "30px",
          margin: "30px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "18px",
            fontWeight: "700",
            margin: "0 0 20px",
            textAlign: "center",
          }}
        >
          📋 Transaction Details
        </Heading>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "40%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Transaction ID:
            </Text>
          </Column>
          <Column style={{ width: "60%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontFamily: "monospace",
              }}
            >
              {transactionId}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "40%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Payment Date:
            </Text>
          </Column>
          <Column style={{ width: "60%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
              }}
            >
              {paymentDate} at {paymentTime}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0" }}>
          <Column style={{ width: "40%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Payment Method:
            </Text>
          </Column>
          <Column style={{ width: "60%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
              }}
            >
              **** **** **** {paymentMethod}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Payment Breakdown */}
      <Section
        style={{
          backgroundColor: "#FFFFFF",
          border: `1px solid ${brandColors.border}`,
          borderRadius: "12px",
          padding: "30px",
          margin: "30px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "18px",
            fontWeight: "700",
            margin: "0 0 20px",
            textAlign: "center",
          }}
        >
          💰 Payment Breakdown
        </Heading>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "60%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Accommodation:
            </Text>
          </Column>
          <Column style={{ width: "40%", textAlign: "right" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              ${accommodationAmount}
            </Text>
          </Column>
        </Row>

        {cleaningFee > 0 && (
          <Row style={{ margin: "0 0 12px" }}>
            <Column style={{ width: "60%" }}>
              <Text
                style={{
                  color: brandColors.textDark,
                  fontSize: "14px",
                  margin: "0",
                  fontWeight: "600",
                }}
              >
                Cleaning Fee:
              </Text>
            </Column>
            <Column style={{ width: "40%", textAlign: "right" }}>
              <Text
                style={{
                  color: brandColors.textDark,
                  fontSize: "14px",
                  margin: "0",
                  fontWeight: "600",
                }}
              >
                ${cleaningFee}
              </Text>
            </Column>
          </Row>
        )}

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "60%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Service Fee:
            </Text>
          </Column>
          <Column style={{ width: "40%", textAlign: "right" }}>
            <Text
              style={{
                color: brandColors.accentGreen,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              ${serviceFee} ✨
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "60%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Payment Processing:
            </Text>
          </Column>
          <Column style={{ width: "40%", textAlign: "right" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              ${paymentProcessingFee}
            </Text>
          </Column>
        </Row>

        <Hr style={{ borderColor: brandColors.border, margin: "16px 0" }} />

        <Row style={{ margin: "0" }}>
          <Column style={{ width: "60%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "18px",
                margin: "0",
                fontWeight: "700",
              }}
            >
              Total Paid:
            </Text>
          </Column>
          <Column style={{ width: "40%", textAlign: "right" }}>
            <Text
              style={{
                color: brandColors.accentGreen,
                fontSize: "20px",
                margin: "0",
                fontWeight: "700",
              }}
            >
              ${totalAmount}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Download Receipt Button */}
      <Section style={{ textAlign: "center", margin: "40px 0" }}>
        <Button
          style={{
            backgroundColor: brandColors.accentGreen,
            color: "#FFFFFF",
            padding: "16px 32px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "16px",
            textDecoration: "none",
            display: "inline-block",
          }}
          href={receiptUrl || `${baseUrl}/bookings/${bookingId}/receipt`}
        >
          📄 Download PDF Receipt
        </Button>
      </Section>

      <Text
        style={{
          color: brandColors.textLight,
          fontSize: "14px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "30px 0 0",
        }}
      >
        Need help with your receipt? Contact us at admin@hiddystays.com
      </Text>

      <Text
        style={{
          color: brandColors.textDark,
          fontSize: "16px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "20px 0 0",
          fontWeight: "600",
        }}
      >
        Thank you for choosing HiddyStays!
      </Text>
    </HiddyStaysBaseTemplate>
  );
};

// Template 4: Welcome Email (Host)
export const HostWelcomeTemplate = ({
  hostName,
  hostEmail,
}: EmailTemplateProps) => {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://hiddystays.com";

  return (
    <HiddyStaysBaseTemplate
      title="Welcome to HiddyStays!"
      preview="Welcome to HiddyStays - List your property and keep 100%! 👋"
    >
      {/* Hero Image */}
      <Section style={{ margin: "0 0 30px", textAlign: "center" }}>
        <Img
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=200&fit=crop"
          alt="Happy hosts with keys"
          style={{
            width: "100%",
            height: "200px",
            objectFit: "cover",
            borderRadius: "12px",
          }}
        />
        <Text
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#FFFFFF",
            fontSize: "24px",
            fontWeight: "700",
            textAlign: "center",
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            margin: "0",
          }}
        >
          Welcome to the
          <br />
          Zero-Fee Revolution
        </Text>
      </Section>

      <Heading
        style={{
          color: brandColors.textDark,
          fontSize: "24px",
          fontWeight: "700",
          margin: "0 0 16px",
          textAlign: "center",
        }}
      >
        Hey {hostName}! 👋
      </Heading>

      <Text
        style={{
          color: brandColors.textDark,
          fontSize: "16px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "0 0 30px",
        }}
      >
        Welcome to HiddyStays - where Canadian property owners keep 100% of
        their earnings!
      </Text>

      <Text
        style={{
          color: brandColors.textDark,
          fontSize: "16px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "0 0 30px",
        }}
      >
        Unlike other platforms that take 15-20% of your earnings, we believe
        hosts should keep what they earn. That's why we charge{" "}
        <strong>ZERO platform fees</strong>.
      </Text>

      {/* Value Props */}
      <Section
        style={{
          backgroundColor: brandColors.background,
          borderRadius: "12px",
          padding: "30px",
          margin: "30px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "18px",
            fontWeight: "700",
            margin: "0 0 20px",
            textAlign: "center",
          }}
        >
          💰 What Makes HiddyStays Different?
        </Heading>

        <Row style={{ margin: "0 0 20px" }}>
          <Column
            style={{ width: "33%", textAlign: "center", padding: "0 8px" }}
          >
            <Text style={{ fontSize: "32px", margin: "0 0 8px" }}>✨</Text>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0 0 4px",
                fontWeight: "700",
              }}
            >
              Zero Platform Fees
            </Text>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "12px",
                margin: "0",
                lineHeight: "1.4",
              }}
            >
              Keep 100% of bookings
            </Text>
          </Column>
          <Column
            style={{ width: "33%", textAlign: "center", padding: "0 8px" }}
          >
            <Text style={{ fontSize: "32px", margin: "0 0 8px" }}>🤝</Text>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0 0 4px",
                fontWeight: "700",
              }}
            >
              Direct Guest Connection
            </Text>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "12px",
                margin: "0",
                lineHeight: "1.4",
              }}
            >
              Build real relationships
            </Text>
          </Column>
          <Column
            style={{ width: "33%", textAlign: "center", padding: "0 8px" }}
          >
            <Text style={{ fontSize: "32px", margin: "0 0 8px" }}>🚀</Text>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0 0 4px",
                fontWeight: "700",
              }}
            >
              Modern Platform
            </Text>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "12px",
                margin: "0",
                lineHeight: "1.4",
              }}
            >
              Easy management tools
            </Text>
          </Column>
        </Row>

        <Row>
          <Column
            style={{ width: "50%", textAlign: "center", padding: "0 8px" }}
          >
            <Text style={{ fontSize: "32px", margin: "0 0 8px" }}>🇨🇦</Text>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0 0 4px",
                fontWeight: "700",
              }}
            >
              Canadian-Focused
            </Text>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "12px",
                margin: "0",
                lineHeight: "1.4",
              }}
            >
              Supporting local property owners
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Getting Started Guide */}
      <Section
        style={{
          backgroundColor: "#FFFFFF",
          border: `1px solid ${brandColors.border}`,
          borderRadius: "12px",
          padding: "30px",
          margin: "30px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "18px",
            fontWeight: "700",
            margin: "0 0 20px",
            textAlign: "center",
          }}
        >
          📋 Getting Started is Easy
        </Heading>

        <Row style={{ margin: "0 0 16px" }}>
          <Column style={{ width: "20%", textAlign: "center" }}>
            <Text
              style={{
                backgroundColor: brandColors.primaryBlue,
                color: "#FFFFFF",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                fontSize: "12px",
                fontWeight: "700",
                lineHeight: "24px",
                margin: "0 auto",
              }}
            >
              1
            </Text>
          </Column>
          <Column style={{ width: "80%", paddingLeft: "16px" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              List your property (5 minutes)
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 16px" }}>
          <Column style={{ width: "20%", textAlign: "center" }}>
            <Text
              style={{
                backgroundColor: brandColors.primaryBlue,
                color: "#FFFFFF",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                fontSize: "12px",
                fontWeight: "700",
                lineHeight: "24px",
                margin: "0 auto",
              }}
            >
              2
            </Text>
          </Column>
          <Column style={{ width: "80%", paddingLeft: "16px" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Add photos and details
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 16px" }}>
          <Column style={{ width: "20%", textAlign: "center" }}>
            <Text
              style={{
                backgroundColor: brandColors.primaryBlue,
                color: "#FFFFFF",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                fontSize: "12px",
                fontWeight: "700",
                lineHeight: "24px",
                margin: "0 auto",
              }}
            >
              3
            </Text>
          </Column>
          <Column style={{ width: "80%", paddingLeft: "16px" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Set your pricing
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0" }}>
          <Column style={{ width: "20%", textAlign: "center" }}>
            <Text
              style={{
                backgroundColor: brandColors.primaryBlue,
                color: "#FFFFFF",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                fontSize: "12px",
                fontWeight: "700",
                lineHeight: "24px",
                margin: "0 auto",
              }}
            >
              4
            </Text>
          </Column>
          <Column style={{ width: "80%", paddingLeft: "16px" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Start accepting bookings!
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Primary CTA */}
      <Section style={{ textAlign: "center", margin: "40px 0" }}>
        <Button
          style={{
            backgroundColor: brandColors.accentGreen,
            color: "#FFFFFF",
            padding: "16px 32px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "16px",
            textDecoration: "none",
            display: "inline-block",
          }}
          href={`${baseUrl}/host-dashboard?new=true`}
        >
          List Your First Property
        </Button>
      </Section>

      {/* Help Section */}
      <Section
        style={{
          backgroundColor: brandColors.warning,
          borderRadius: "12px",
          padding: "20px",
          margin: "30px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "16px",
            fontWeight: "700",
            margin: "0 0 12px",
            textAlign: "center",
          }}
        >
          💡 Need Help?
        </Heading>
        <Text
          style={{
            color: brandColors.textDark,
            fontSize: "14px",
            lineHeight: "1.5",
            margin: "0",
            textAlign: "center",
          }}
        >
          Our support team is here for you at admin@hiddystays.com
        </Text>
      </Section>

      <Text
        style={{
          color: brandColors.textDark,
          fontSize: "16px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "30px 0 0",
          fontWeight: "600",
        }}
      >
        Here's to your success!
        <br />
        The HiddyStays Team
      </Text>

      <Text
        style={{
          color: brandColors.textLight,
          fontSize: "14px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "20px 0 0",
          fontStyle: "italic",
        }}
      >
        P.S. Did we mention you keep 100% of your earnings? 😊
      </Text>
    </HiddyStaysBaseTemplate>
  );
};

// Template 5: Check-in Reminder (24h)
export const CheckInReminderTemplate = ({
  guestName,
  propertyName,
  checkInDate,
  checkInTime,
  propertyAddress,
  hostName,
  hostPhone,
  bookingId,
  wifiNetwork,
  wifiPassword,
  parkingInstructions,
  entryInstructions,
}: EmailTemplateProps) => {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://hiddystays.com";

  return (
    <HiddyStaysBaseTemplate
      title="Check-in Reminder"
      preview={`Your stay begins tomorrow at ${propertyName}! 🗓️`}
    >
      <Heading
        style={{
          color: brandColors.textDark,
          fontSize: "24px",
          fontWeight: "700",
          margin: "0 0 16px",
          textAlign: "center",
        }}
      >
        Hey {guestName}! 🎉
      </Heading>

      <Text
        style={{
          color: brandColors.textDark,
          fontSize: "16px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "0 0 30px",
        }}
      >
        Your stay at <strong>{propertyName}</strong> begins tomorrow!
      </Text>

      {/* Check-in Details */}
      <Section
        style={{
          backgroundColor: brandColors.background,
          borderRadius: "12px",
          padding: "30px",
          margin: "30px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "18px",
            fontWeight: "700",
            margin: "0 0 20px",
            textAlign: "center",
          }}
        >
          ⏰ Check-in Details
        </Heading>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "30%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Date:
            </Text>
          </Column>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              {checkInDate}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 12px" }}>
          <Column style={{ width: "30%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Time:
            </Text>
          </Column>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              {checkInTime}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0" }}>
          <Column style={{ width: "30%" }}>
            <Text
              style={{
                color: brandColors.textLight,
                fontSize: "14px",
                margin: "0",
                fontWeight: "600",
              }}
            >
              Address:
            </Text>
          </Column>
          <Column style={{ width: "70%" }}>
            <Text
              style={{
                color: brandColors.textDark,
                fontSize: "14px",
                margin: "0",
              }}
            >
              {propertyAddress}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Google Maps Button */}
      <Section style={{ textAlign: "center", margin: "30px 0" }}>
        <Button
          style={{
            backgroundColor: "#FFFFFF",
            color: brandColors.primaryBlue,
            border: `2px solid ${brandColors.primaryBlue}`,
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "14px",
            textDecoration: "none",
            display: "inline-block",
          }}
          href={`https://maps.google.com/?q=${encodeURIComponent(propertyAddress)}`}
        >
          📍 View on Google Maps
        </Button>
      </Section>

      {/* Host Contact */}
      <Section
        style={{
          backgroundColor: "#FFFFFF",
          border: `1px solid ${brandColors.border}`,
          borderRadius: "12px",
          padding: "20px",
          margin: "30px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "16px",
            fontWeight: "700",
            margin: "0 0 12px",
            textAlign: "center",
          }}
        >
          📞 Host Contact
        </Heading>
        <Text
          style={{
            color: brandColors.textDark,
            fontSize: "14px",
            margin: "0",
            textAlign: "center",
          }}
        >
          <strong>{hostName}</strong>: {hostPhone}
        </Text>
      </Section>

      {/* Important Reminders */}
      <Section
        style={{
          backgroundColor: brandColors.warning,
          borderRadius: "12px",
          padding: "20px",
          margin: "30px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "16px",
            fontWeight: "700",
            margin: "0 0 12px",
          }}
        >
          📝 Important Reminders
        </Heading>
        <Text
          style={{
            color: brandColors.textDark,
            fontSize: "14px",
            lineHeight: "1.5",
            margin: "0",
          }}
        >
          • Bring a valid ID
          <br />• Check-in time: {checkInTime}
          <br />• Contact your host if you're running late
        </Text>
      </Section>

      {/* Property Details */}
      <Section
        style={{
          backgroundColor: brandColors.background,
          borderRadius: "12px",
          padding: "20px",
          margin: "30px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "16px",
            fontWeight: "700",
            margin: "0 0 12px",
          }}
        >
          🏠 Property Details
        </Heading>

        {wifiNetwork && (
          <Row style={{ margin: "0 0 8px" }}>
            <Column style={{ width: "30%" }}>
              <Text
                style={{
                  color: brandColors.textLight,
                  fontSize: "14px",
                  margin: "0",
                  fontWeight: "600",
                }}
              >
                WiFi:
              </Text>
            </Column>
            <Column style={{ width: "70%" }}>
              <Text
                style={{
                  color: brandColors.textDark,
                  fontSize: "14px",
                  margin: "0",
                }}
              >
                {wifiNetwork} / {wifiPassword}
              </Text>
            </Column>
          </Row>
        )}

        {parkingInstructions && (
          <Row style={{ margin: "0 0 8px" }}>
            <Column style={{ width: "30%" }}>
              <Text
                style={{
                  color: brandColors.textLight,
                  fontSize: "14px",
                  margin: "0",
                  fontWeight: "600",
                }}
              >
                Parking:
              </Text>
            </Column>
            <Column style={{ width: "70%" }}>
              <Text
                style={{
                  color: brandColors.textDark,
                  fontSize: "14px",
                  margin: "0",
                }}
              >
                {parkingInstructions}
              </Text>
            </Column>
          </Row>
        )}

        {entryInstructions && (
          <Row style={{ margin: "0" }}>
            <Column style={{ width: "30%" }}>
              <Text
                style={{
                  color: brandColors.textLight,
                  fontSize: "14px",
                  margin: "0",
                  fontWeight: "600",
                }}
              >
                Entry:
              </Text>
            </Column>
            <Column style={{ width: "70%" }}>
              <Text
                style={{
                  color: brandColors.textDark,
                  fontSize: "14px",
                  margin: "0",
                }}
              >
                {entryInstructions}
              </Text>
            </Column>
          </Row>
        )}
      </Section>

      {/* View Booking Button */}
      <Section style={{ textAlign: "center", margin: "40px 0" }}>
        <Button
          style={{
            backgroundColor: brandColors.accentGreen,
            color: "#FFFFFF",
            padding: "16px 32px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "16px",
            textDecoration: "none",
            display: "inline-block",
          }}
          href={`${baseUrl}/bookings/${bookingId}`}
        >
          View Booking Details
        </Button>
      </Section>

      <Text
        style={{
          color: brandColors.textLight,
          fontSize: "14px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "30px 0 0",
        }}
      >
        Need to make changes or have questions?
        <br />
        Contact {hostName} directly or reach us at admin@hiddystays.com
      </Text>

      <Text
        style={{
          color: brandColors.textDark,
          fontSize: "16px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "20px 0 0",
          fontWeight: "600",
        }}
      >
        Safe travels!
        <br />
        The HiddyStays Team
      </Text>

      {/* Booking ID Footer */}
      <Section
        style={{
          backgroundColor: brandColors.background,
          borderRadius: "8px",
          padding: "16px",
          margin: "30px 0 0",
          textAlign: "center",
        }}
      >
        <Text
          style={{
            color: brandColors.textLight,
            fontSize: "12px",
            margin: "0",
            fontFamily: "monospace",
          }}
        >
          Your booking ID: {bookingId}
        </Text>
      </Section>
    </HiddyStaysBaseTemplate>
  );
};

// Template 6: Booking Request (Before Payment)
export const BookingRequestTemplate = ({
  guestName,
  guestEmail,
  propertyName,
  checkInDate,
  checkOutDate,
  guests,
  totalAmount,
  bookingId,
  paymentUrl,
}: EmailTemplateProps) => {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://hiddystays.com";

  return (
    <HiddyStaysBaseTemplate
      title="Complete Your Booking"
      preview={`Complete your booking at ${propertyName} - Payment pending`}
    >
      <Heading
        style={{
          color: brandColors.textDark,
          fontSize: "24px",
          fontWeight: "700",
          margin: "0 0 16px",
          textAlign: "center",
        }}
      >
        Almost there, {guestName}! 🏠
      </Heading>

      <Text
        style={{
          color: brandColors.textDark,
          fontSize: "16px",
          lineHeight: "1.6",
          textAlign: "center",
          margin: "0 0 30px",
        }}
      >
        Your booking request for <strong>{propertyName}</strong> has been received.
        Complete your payment to confirm your reservation.
      </Text>

      {/* Booking Summary */}
      <Section
        style={{
          backgroundColor: brandColors.background,
          borderRadius: "12px",
          padding: "24px",
          margin: "24px 0",
        }}
      >
        <Heading
          style={{
            color: brandColors.textDark,
            fontSize: "16px",
            fontWeight: "700",
            margin: "0 0 16px",
          }}
        >
          📋 Booking Summary
        </Heading>

        <Row style={{ margin: "0 0 8px" }}>
          <Column style={{ width: "40%" }}>
            <Text style={{ color: brandColors.textLight, fontSize: "14px", margin: "0" }}>
              Property:
            </Text>
          </Column>
          <Column style={{ width: "60%" }}>
            <Text style={{ color: brandColors.textDark, fontSize: "14px", margin: "0", fontWeight: "600" }}>
              {propertyName}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 8px" }}>
          <Column style={{ width: "40%" }}>
            <Text style={{ color: brandColors.textLight, fontSize: "14px", margin: "0" }}>
              Check-in:
            </Text>
          </Column>
          <Column style={{ width: "60%" }}>
            <Text style={{ color: brandColors.textDark, fontSize: "14px", margin: "0" }}>
              {checkInDate}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 8px" }}>
          <Column style={{ width: "40%" }}>
            <Text style={{ color: brandColors.textLight, fontSize: "14px", margin: "0" }}>
              Check-out:
            </Text>
          </Column>
          <Column style={{ width: "60%" }}>
            <Text style={{ color: brandColors.textDark, fontSize: "14px", margin: "0" }}>
              {checkOutDate}
            </Text>
          </Column>
        </Row>

        <Row style={{ margin: "0 0 8px" }}>
          <Column style={{ width: "40%" }}>
            <Text style={{ color: brandColors.textLight, fontSize: "14px", margin: "0" }}>
              Guests:
            </Text>
          </Column>
          <Column style={{ width: "60%" }}>
            <Text style={{ color: brandColors.textDark, fontSize: "14px", margin: "0" }}>
              {guests}
            </Text>
          </Column>
        </Row>

        <Hr style={{ borderColor: brandColors.border, margin: "16px 0" }} />

        <Row>
          <Column style={{ width: "40%" }}>
            <Text style={{ color: brandColors.textDark, fontSize: "16px", margin: "0", fontWeight: "700" }}>
              Total:
            </Text>
          </Column>
          <Column style={{ width: "60%" }}>
            <Text style={{ color: brandColors.accentGreen, fontSize: "20px", margin: "0", fontWeight: "700" }}>
              ${totalAmount}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Payment CTA */}
      <Section style={{ textAlign: "center", margin: "32px 0" }}>
        <Button
          style={{
            backgroundColor: brandColors.accentGreen,
            color: "#FFFFFF",
            padding: "16px 40px",
            borderRadius: "8px",
            fontWeight: "700",
            fontSize: "16px",
            textDecoration: "none",
            display: "inline-block",
          }}
          href={paymentUrl || `${baseUrl}/bookings`}
        >
          Complete Payment →
        </Button>
      </Section>

      <Text
        style={{
          color: brandColors.textLight,
          fontSize: "13px",
          textAlign: "center",
          margin: "0 0 24px",
        }}
      >
        ⏰ Your booking will be held for 30 minutes. Complete payment to secure your dates.
      </Text>

      {/* Zero Fees Banner */}
      <Section
        style={{
          backgroundColor: "#ECFDF5",
          borderRadius: "8px",
          padding: "16px",
          textAlign: "center",
        }}
      >
        <Text style={{ color: "#059669", fontSize: "14px", margin: "0", fontWeight: "600" }}>
          🎉 Zero platform fees — You save more with HiddyStays!
        </Text>
      </Section>

      <Text
        style={{
          color: brandColors.textLight,
          fontSize: "13px",
          textAlign: "center",
          margin: "24px 0 0",
        }}
      >
        Booking ID: {bookingId}
      </Text>
    </HiddyStaysBaseTemplate>
  );
};

// Export all templates
export const HiddyStaysEmailTemplates = {
  BookingConfirmationTemplate,
  HostNotificationTemplate,
  PaymentReceiptTemplate,
  HostWelcomeTemplate,
  CheckInReminderTemplate,
  BookingRequestTemplate,
};

