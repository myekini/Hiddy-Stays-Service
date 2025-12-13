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

interface CheckInReminderProps {
  guestName: string;
  propertyName: string;
  propertyAddress: string;
  checkInDate: string;
  checkInTime: string;
  hostName: string;
  hostPhone: string;
  wifiNetwork?: string;
  wifiPassword?: string;
  parkingInstructions?: string;
  entryInstructions?: string;
  specialInstructions?: string;
  googleMapsUrl: string;
  bookingId: string;
}

export const CheckInReminder = ({
  guestName,
  propertyName,
  propertyAddress,
  checkInDate,
  checkInTime,
  hostName,
  hostPhone,
  wifiNetwork,
  wifiPassword,
  parkingInstructions,
  entryInstructions,
  specialInstructions,
  googleMapsUrl,
  bookingId,
}: CheckInReminderProps) => {
  return (
    <EmailLayout preview={`Your stay begins tomorrow at ${propertyName}!`}>
      {/* Hero Title */}
      <Section style={heroSection}>
        <Text style={heroTitle}>Your stay begins tomorrow</Text>
        <Text style={heroSubtitle}>{propertyName}</Text>
      </Section>

      {/* Greeting */}
      <Section style={greetingSection}>
        <Text style={greeting}>Hey {guestName} 🎉</Text>
        <Text style={message}>
          Your stay at <strong>{propertyName}</strong> begins tomorrow.
        </Text>
      </Section>

      {/* Check-in Card */}
      <Section style={cardSection}>
        <Section style={checkInCard}>
          <Text style={cardTitle}>Check-in Details</Text>
          
          <Hr style={softDivider} />

          <Row style={detailRow}>
            <Column>
              <Text style={detailLabel}>Date</Text>
              <Text style={detailValueBold}>{checkInDate}</Text>
            </Column>
            <Column>
              <Text style={detailLabel}>Time</Text>
              <Text style={detailValue}>{checkInTime}</Text>
            </Column>
          </Row>

          <Hr style={softDivider} />

          <Text style={addressLabel}>Address</Text>
          <Text style={addressValue}>{propertyAddress}</Text>
        </Section>
      </Section>

      {/* Google Maps Button */}
      <Section style={mapSection}>
        <Button
          href={`${googleMapsUrl}?utm_source=email&utm_medium=checkin_reminder&utm_campaign=guest_experience`}
          style={mapsButton}
        >
          Open in Google Maps
        </Button>
      </Section>

      {/* Host Contact */}
      <Section style={contactSection}>
        <Section style={contactCard}>
          <Text style={contactTitle}>Host Contact</Text>
          <Text style={contactText}>
            <strong>{hostName}</strong>
          </Text>
          <Text style={contactPhone}>
            <a href={`tel:${hostPhone}`} style={phoneLink}>{hostPhone}</a>
          </Text>
        </Section>
      </Section>

      {/* Property Details */}
      {(wifiNetwork || parkingInstructions || entryInstructions) && (
        <Section style={detailsSection}>
          <Text style={detailsTitle}>Property Details</Text>

          {wifiNetwork && (
            <Section style={infoBox}>
              <Text style={infoLabel}>WiFi</Text>
              <Text style={infoValue}>{wifiNetwork}</Text>
              {wifiPassword && (
                <Text style={infoValue}>{wifiPassword}</Text>
              )}
            </Section>
          )}

          {parkingInstructions && (
            <Section style={infoBox}>
              <Text style={infoLabel}>Parking</Text>
              <Text style={infoValue}>{parkingInstructions}</Text>
            </Section>
          )}

          {entryInstructions && (
            <Section style={infoBox}>
              <Text style={infoLabel}>Entry</Text>
              <Text style={infoValue}>{entryInstructions}</Text>
            </Section>
          )}
        </Section>
      )}

      {/* Important Reminders */}
      <Section style={remindersSection}>
        <Text style={remindersTitle}>Important Reminders</Text>
        <Text style={reminderText}>
          Bring a valid ID • Check-in time: {checkInTime}
        </Text>
        {specialInstructions && (
          <Text style={reminderText}>{specialInstructions}</Text>
        )}
      </Section>

      {/* CTA */}
      <Section style={ctaSection}>
        <Button
          href={`https://hiddystays.com/bookings/${bookingId}?utm_source=email&utm_medium=checkin_reminder&utm_campaign=guest_experience`}
          style={primaryButton}
        >
          View Booking Details
        </Button>
      </Section>

      {/* Footer Message */}
      <Section style={footerMessageSection}>
        <Text style={footerMessageText}>
          Need help? Contact {hostName} directly or reach us at{' '}
          <a href="mailto:admin@hiddystays.com" style={emailLink}>
            admin@hiddystays.com
          </a>
        </Text>
        <Text style={footerMessageText}>— The HiddyStays Team</Text>
      </Section>
    </EmailLayout>
  );
};

export default CheckInReminder;

// Styles - World-class design system
const heroSection = {
  backgroundColor: colors.softBackground,
  padding: `${spacing.xl} ${layout.containerPadding}`,
  textAlign: 'center' as const,
};

const heroTitle = {
  ...typography.headingXL,
  color: colors.textStrong,
  margin: `0 0 ${spacing.xs} 0`,
};

const heroSubtitle = {
  ...typography.body,
  color: colors.textMedium,
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

const message = {
  ...typography.body,
  color: colors.textMedium,
  margin: '0',
};

const cardSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
};

const checkInCard = {
  ...cards,
  backgroundColor: colors.white,
  border: `2px solid ${colors.accentGreen}`,
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

const detailValueBold = {
  ...typography.headingM,
  color: colors.textStrong,
  margin: '0',
};

const addressLabel = {
  ...typography.micro,
  color: colors.textLight,
  margin: `0 0 ${spacing.xs} 0`,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const addressValue = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: '0',
  lineHeight: '1.5',
};

const mapSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
  textAlign: 'center' as const,
};

const mapsButton = {
  ...buttons.secondary,
  textDecoration: 'none',
  display: 'inline-block',
};

const contactSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
};

const contactCard = {
  ...cards,
  backgroundColor: colors.softBackground,
  textAlign: 'center' as const,
};

const contactTitle = {
  ...typography.headingM,
  color: colors.textStrong,
  margin: `0 0 ${spacing.sm} 0`,
};

const contactText = {
  ...typography.body,
  color: colors.textStrong,
  margin: `0 0 ${spacing.xs} 0`,
};

const contactPhone = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: '0',
};

const phoneLink = {
  color: colors.primaryBlue,
  textDecoration: 'none',
  fontWeight: '600',
};

const detailsSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
};

const detailsTitle = {
  ...typography.headingM,
  color: colors.textStrong,
  margin: `0 0 ${spacing.md} 0`,
};

const infoBox = {
  backgroundColor: colors.softBackground,
  borderRadius: '8px',
  padding: spacing.md,
  margin: `0 0 ${spacing.sm} 0`,
};

const infoLabel = {
  ...typography.micro,
  fontWeight: '600',
  color: colors.textLight,
  margin: `0 0 ${spacing.xs} 0`,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const infoValue = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: `${spacing.xs} 0 0 0`,
};

const remindersSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
};

const remindersTitle = {
  ...typography.headingM,
  color: colors.textStrong,
  margin: `0 0 ${spacing.sm} 0`,
};

const reminderText = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: `${spacing.xs} 0`,
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
