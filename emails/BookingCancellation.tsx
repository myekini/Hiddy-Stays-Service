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
import { buildAppUrl } from '../lib/app-url';

interface BookingCancellationProps {
  guestName: string;
  propertyName: string;
  bookingId: string;
  checkInDate: string;
  refundAmount?: number;
  cancellationReason?: string;
}

export const BookingCancellation = ({
  guestName,
  propertyName,
  bookingId,
  checkInDate,
  refundAmount,
  cancellationReason,
}: BookingCancellationProps) => {
  return (
    <EmailLayout preview={`Booking Cancelled - ${propertyName}`}>
      <Section style={heroTitleSection}>
        <Text style={heroTitle}>Booking Cancelled 😔</Text>
      </Section>

      <Section style={greetingSection}>
        <Text style={greeting}>Hi {guestName},</Text>
        <Text style={mainMessage}>
          Your booking at <strong>{propertyName}</strong> has been cancelled.
        </Text>
      </Section>

      <Section style={cardSection}>
        <Section style={bookingCard}>
          <Text style={cardTitle}>{propertyName}</Text>
          
          <Hr style={softDivider} />
          
          <Row style={detailRow}>
            <Column style={detailColumn}>
              <Text style={detailLabel}>Check-in</Text>
              <Text style={detailValue}>{checkInDate}</Text>
            </Column>
            <Column style={detailColumn}>
              <Text style={detailLabel}>Booking ID</Text>
              <Text style={detailValue}>{bookingId.split('-')[0]}</Text>
            </Column>
          </Row>

          {refundAmount !== undefined && refundAmount > 0 && (
             <>
                <Hr style={softDivider} />
                <Row style={paymentRow}>
                  <Column>
                    <Text style={paymentLabel}>Refund Amount</Text>
                  </Column>
                  <Column align="right">
                    <Text style={totalAmountStyle}>${refundAmount.toFixed(2)}</Text>
                  </Column>
                </Row>
                <Text style={detailSubtext}>Refunds typically take 5-10 business days to appear on your statement.</Text>
             </>
          )}
        </Section>
      </Section>

      {cancellationReason && (
        <Section style={instructionsSection}>
          <Text style={instructionsTitle}>Reason for cancellation</Text>
          <Text style={instructionsText}>{cancellationReason}</Text>
        </Section>
      )}

      <Section style={ctaSection}>
        <Button
          href={buildAppUrl(
            `/properties?utm_source=email&utm_medium=booking_cancellation&utm_campaign=guest_experience`
          )}
          style={primaryButton}
        >
          Find another stay
        </Button>
      </Section>

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

export default BookingCancellation;

// Styles
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
