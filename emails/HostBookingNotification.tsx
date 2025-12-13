import {
  Section,
  Text,
  Button,
  Row,
  Column,
  Hr,
} from '@react-email/components';
import { EmailLayout } from './components/EmailLayout';
import { colors, typography, spacing, layout, cards, buttons } from './design-tokens';

interface HostBookingNotificationProps {
  hostName: string;
  propertyName: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  guests: number;
  bookingAmount: number;
  stripeFee: number;
  netAmount: number;
  bookingId: string;
  specialRequests?: string;
}

export const HostBookingNotification = ({
  hostName,
  propertyName,
  guestName,
  guestEmail,
  guestPhone,
  checkInDate,
  checkInTime,
  checkOutDate,
  checkOutTime,
  guests,
  bookingAmount,
  stripeFee,
  netAmount,
  bookingId,
  specialRequests,
}: HostBookingNotificationProps) => {
  return (
    <EmailLayout preview={`New booking for ${propertyName} - You earned $${netAmount}!`}>
      {/* Earnings Hero */}
      <Section style={earningsHero}>
        <Text style={heroTitle}>New Booking</Text>
        <Text style={heroAmount}>${netAmount.toFixed(2)}</Text>
        <Text style={heroSubtext}>You keep 100%</Text>
      </Section>

      {/* Greeting */}
      <Section style={greetingSection}>
        <Text style={greeting}>Hey {hostName} 🎉</Text>
        <Text style={mainMessage}>
          You have a new booking for <strong>{propertyName}</strong>.
        </Text>
      </Section>

      {/* Micro Summary Block */}
      <Section style={summarySection}>
        <Section style={summaryCard}>
          <Text style={summaryText}>
            <strong>{guestName}</strong> booked <strong>{propertyName}</strong>
          </Text>
          <Text style={summaryMeta}>
            {checkInDate} – {checkOutDate} • {guests} {guests === 1 ? 'guest' : 'guests'}
          </Text>
        </Section>
      </Section>

      {/* Earnings Breakdown */}
      <Section style={earningsSection}>
        <Section style={earningsCard}>
          <Text style={earningsTitle}>Earnings Breakdown</Text>
          
          <Hr style={softDivider} />

          <Row style={earningsRow}>
            <Column>
              <Text style={earningsLabel}>Amount</Text>
            </Column>
            <Column align="right">
              <Text style={earningsValue}>${bookingAmount.toFixed(2)}</Text>
            </Column>
          </Row>

          <Row style={earningsRow}>
            <Column>
              <Text style={earningsLabel}>Platform fee</Text>
            </Column>
            <Column align="right">
              <Text style={zeroFee}>$0.00 ✨</Text>
            </Column>
          </Row>

          <Row style={earningsRow}>
            <Column>
              <Text style={earningsLabel}>Processing</Text>
            </Column>
            <Column align="right">
              <Text style={earningsValue}>-${stripeFee.toFixed(2)}</Text>
            </Column>
          </Row>

          <Hr style={softDivider} />

          <Row style={totalRow}>
            <Column>
              <Text style={totalLabel}>You keep</Text>
            </Column>
            <Column align="right">
              <Text style={totalValue}>${netAmount.toFixed(2)} 🎉</Text>
            </Column>
          </Row>
        </Section>
      </Section>

      {/* Guest Contact Info */}
      <Section style={guestInfoSection}>
        <Section style={guestInfoCard}>
          <Text style={guestInfoTitle}>Guest Contact</Text>
          <Text style={guestInfoText}>
            <strong>Email:</strong> {guestEmail}
          </Text>
          {guestPhone && (
            <Text style={guestInfoText}>
              <strong>Phone:</strong> {guestPhone}
            </Text>
          )}
        </Section>
      </Section>

      {/* Special Requests */}
      {specialRequests && (
        <Section style={requestsSection}>
          <Text style={requestsTitle}>Special Requests</Text>
          <Text style={requestsText}>{specialRequests}</Text>
        </Section>
      )}

      {/* Action Buttons */}
      <Section style={ctaSection}>
        <Button
          href={`https://hiddystays.com/bookings/${bookingId}?utm_source=email&utm_medium=host_notification&utm_campaign=host_experience`}
          style={primaryButton}
        >
          View Booking
        </Button>
        <Button
          href={`mailto:${guestEmail}`}
          style={secondaryButton}
        >
          Contact Guest
        </Button>
      </Section>

      {/* Footer Message */}
      <Section style={footerMessageSection}>
        <Text style={footerMessageText}>
          Need help? Contact us anytime at{' '}
          <a href="mailto:admin@hiddystays.com" style={emailLink}>
            admin@hiddystays.com
          </a>
        </Text>
        <Text style={footerMessageText}>— The HiddyStays Team</Text>
      </Section>
    </EmailLayout>
  );
};

export default HostBookingNotification;

// Styles - World-class design system
const earningsHero = {
  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  padding: `${spacing.xl} ${layout.containerPadding}`,
  textAlign: 'center' as const,
};

const heroTitle = {
  ...typography.headingL,
  color: colors.white,
  margin: `0 0 ${spacing.xs} 0`,
  fontWeight: '600',
};

const heroAmount = {
  fontSize: '40px',
  fontWeight: 'bold',
  color: colors.white,
  margin: `0 0 ${spacing.xs} 0`,
};

const heroSubtext = {
  ...typography.bodySmall,
  color: colors.white,
  opacity: 0.9,
  margin: '0',
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

const summarySection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
};

const summaryCard = {
  ...cards,
  backgroundColor: colors.softBackground,
  textAlign: 'center' as const,
};

const summaryText = {
  ...typography.body,
  color: colors.textStrong,
  margin: `0 0 ${spacing.xs} 0`,
};

const summaryMeta = {
  ...typography.bodySmall,
  color: colors.textLight,
  margin: '0',
};

const earningsSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
};

const earningsCard = {
  ...cards,
  backgroundColor: colors.white,
};

const earningsTitle = {
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

const earningsRow = {
  margin: `${spacing.sm} 0`,
};

const earningsLabel = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: '0',
};

const earningsValue = {
  ...typography.bodySmall,
  fontWeight: '600',
  color: colors.textStrong,
  margin: '0',
};

const zeroFee = {
  ...typography.bodySmall,
  fontWeight: '600',
  color: colors.accentGreen,
  margin: '0',
};

const totalRow = {
  margin: '0',
};

const totalLabel = {
  ...typography.headingM,
  color: colors.textStrong,
  margin: '0',
};

const totalValue = {
  ...typography.headingL,
  fontWeight: 'bold',
  color: colors.accentGreen,
  margin: '0',
};

const guestInfoSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
};

const guestInfoCard = {
  ...cards,
  backgroundColor: colors.softBackground,
};

const guestInfoTitle = {
  ...typography.headingM,
  color: colors.textStrong,
  margin: `0 0 ${spacing.sm} 0`,
};

const guestInfoText = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: `${spacing.xs} 0`,
};

const requestsSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
};

const requestsTitle = {
  ...typography.headingM,
  color: colors.textStrong,
  margin: `0 0 ${spacing.sm} 0`,
};

const requestsText = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: '0',
  lineHeight: '1.5',
};

const ctaSection = {
  padding: `0 ${layout.containerPadding} ${spacing.xl}`,
  textAlign: 'center' as const,
};

const primaryButton = {
  ...buttons.primary,
  textDecoration: 'none',
  display: 'inline-block',
  margin: `0 ${spacing.xs} ${spacing.sm} ${spacing.xs}`,
};

const secondaryButton = {
  ...buttons.secondary,
  textDecoration: 'none',
  display: 'inline-block',
  margin: `0 ${spacing.xs} ${spacing.sm} ${spacing.xs}`,
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
