import {
  Section,
  Text,
  Img,
  Button,
  Row,
  Column,
  Hr,
} from '@react-email/components';
import { EmailLayout } from './components/EmailLayout';
import { colors, typography, spacing, layout, cards, buttons } from './design-tokens';
import { buildAppUrl } from '../lib/app-url';

interface BookingConfirmationProps {
  guestName: string;
  propertyName: string;
  propertyImage?: string;
  propertyAddress: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  guests: number;
  totalAmount: number;
  bookingId: string;
  hostName: string;
  hostEmail?: string;
  specialInstructions?: string;
  googleMapsUrl?: string;
}

export const BookingConfirmation = ({
  guestName,
  propertyName,
  propertyImage,
  propertyAddress,
  checkInDate,
  checkInTime,
  checkOutDate,
  checkOutTime,
  guests,
  totalAmount,
  bookingId,
  hostName,
  hostEmail,
  specialInstructions,
  googleMapsUrl,
}: BookingConfirmationProps) => {
  return (
    <EmailLayout preview={`Your stay at ${propertyName} is confirmed`}>
      {/* Hero Title Section */}
      <Section style={heroTitleSection}>
        <Text style={heroTitle}>Your stay is confirmed</Text>
      </Section>

      {/* Property Image */}
      {propertyImage ? (
        <Section style={imageSection}>
          <Img
            src={propertyImage}
            alt={propertyName}
            width="640"
            height="320"
            style={propertyImageStyle}
          />
        </Section>
      ) : null}

      {/* Greeting */}
      <Section style={greetingSection}>
        <Text style={greeting}>Hi {guestName},</Text>
        <Text style={mainMessage}>
          Your booking at <strong>{propertyName}</strong> is confirmed and paid.
        </Text>
      </Section>

      {/* Booking Summary Card */}
      <Section style={cardSection}>
        <Section style={bookingCard}>
          <Text style={cardTitle}>{propertyName}</Text>
          
          <Hr style={softDivider} />
          
          <Row style={detailRow}>
            <Column style={detailColumn}>
              <Text style={detailLabel}>Check-in</Text>
              <Text style={detailValue}>{checkInDate}</Text>
              <Text style={detailSubtext}>{checkInTime}</Text>
            </Column>
            <Column style={detailColumn}>
              <Text style={detailLabel}>Check-out</Text>
              <Text style={detailValue}>{checkOutDate}</Text>
              <Text style={detailSubtext}>{checkOutTime}</Text>
            </Column>
            <Column style={detailColumn}>
              <Text style={detailLabel}>Guests</Text>
              <Text style={detailValue}>{guests}</Text>
            </Column>
          </Row>

          <Hr style={softDivider} />

          <Row style={paymentRow}>
            <Column>
              <Text style={paymentLabel}>Total Paid</Text>
            </Column>
            <Column align="right">
              <Text style={totalAmountStyle}>${totalAmount.toFixed(2)}</Text>
            </Column>
          </Row>
        </Section>
      </Section>

      {/* CTA Button */}
      <Section style={ctaSection}>
        <Button
          href={buildAppUrl(
            `/bookings/${bookingId}?utm_source=email&utm_medium=booking_confirmation&utm_campaign=guest_experience`
          )}
          style={primaryButton}
        >
          View Booking
        </Button>
      </Section>

      {/* Host + Address (simple, reliable links) */}
      <Section style={locationSection}>
        <Text style={locationTitle}>Host</Text>
        <Text style={locationAddress}>{hostName}</Text>
        {hostEmail ? (
          <Text style={locationAddress}>
            Email: <a href={`mailto:${hostEmail}`} style={emailLink}>{hostEmail}</a>
          </Text>
        ) : null}

        <Hr style={softDivider} />

        <Text style={locationTitle}>Address</Text>
        <Text style={locationAddress}>{propertyAddress}</Text>
        {googleMapsUrl ? (
          <Text style={locationAddress}>
            Map: <a href={googleMapsUrl} style={emailLink}>Open Google Maps</a>
          </Text>
        ) : null}
      </Section>

      {/* Special Instructions */}
      {specialInstructions && (
        <Section style={instructionsSection}>
          <Text style={instructionsTitle}>Important Notes</Text>
          <Text style={instructionsText}>{specialInstructions}</Text>
        </Section>
      )}

      {/* Footer Message */}
      <Section style={footerMessageSection}>
        <Text style={footerMessageText}>
          Questions? Contact us at{' '}
          <a href="mailto:admin@hiddystays.com" style={emailLink}>
            admin@hiddystays.com
          </a>
        </Text>
        <Text style={footerMessageText}>— The HiddyStays Team</Text>
      </Section>
    </EmailLayout>
  );
};

export default BookingConfirmation;

// Styles - World-class design system
const heroTitleSection = {
  backgroundColor: colors.softBackground,
  padding: `${spacing.xl} ${layout.containerPadding}`,
  textAlign: 'center' as const,
};

const heroTitle = {
  ...typography.headingXL,
  color: colors.textStrong,
  margin: '0',
};

const imageSection = {
  padding: '0',
};

const propertyImageStyle = {
  width: '100%',
  height: 'auto',
  display: 'block',
  borderRadius: '12px',
};

const greetingSection = {
  padding: `${spacing.xl} ${layout.containerPadding} ${spacing.md}`,
};

const greeting = {
  ...typography.headingL,
  color: colors.textStrong,
  margin: `0 0 ${spacing.sm} 0`,
};

const mainMessage = {
  ...typography.body,
  color: colors.textMedium,
  margin: '0',
};

const cardSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
};

const bookingCard = {
  ...cards,
  backgroundColor: colors.white,
};

const cardTitle = {
  ...typography.headingM,
  color: colors.textStrong,
  margin: `0 0 ${spacing.md} 0`,
};

const softDivider = {
  borderColor: colors.divider,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderLeft: 'none',
  borderRight: 'none',
  borderBottom: 'none',
  margin: `${spacing.md} 0`,
};

const detailRow = {
  margin: '0',
};

const detailColumn = {
  padding: `0 ${spacing.xs}`,
  verticalAlign: 'top' as const,
};

const detailLabel = {
  ...typography.micro,
  color: colors.textLight,
  margin: `0 0 ${spacing.xs} 0`,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const detailValue = {
  ...typography.body,
  fontWeight: '600',
  color: colors.textStrong,
  margin: '0',
};

const detailSubtext = {
  ...typography.micro,
  color: colors.textLight,
  margin: `${spacing.xs} 0 0 0`,
};

const paymentRow = {
  margin: '0',
};

const paymentLabel = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: '0',
};

const totalAmountStyle = {
  ...typography.headingM,
  color: colors.accentGreen,
  margin: "0",
};

const ctaSection = {
  padding: `0 ${layout.containerPadding} ${spacing.xl}`,
  textAlign: 'center' as const,
};

const primaryButton = {
  ...buttons.primary,
  textDecoration: 'none',
  display: 'inline-block',
};

const locationSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
};

const locationTitle = {
  ...typography.headingM,
  color: colors.textStrong,
  margin: `0 0 ${spacing.sm} 0`,
};

const locationAddress = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: `0 0 ${spacing.md} 0`,
  lineHeight: '1.5',
};

const instructionsSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
};

const instructionsTitle = {
  ...typography.headingM,
  color: colors.textStrong,
  margin: `0 0 ${spacing.sm} 0`,
};

const instructionsText = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: '0',
  lineHeight: '1.5',
};

const footerMessageSection = {
  padding: `${spacing.lg} ${layout.containerPadding}`,
  textAlign: 'center' as const,
  borderTop: `1px solid ${colors.divider}`,
};

const footerMessageText = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: `${spacing.xs} 0`,
};

const emailLink = {
  color: colors.primaryBlue,
  textDecoration: 'none',
};
