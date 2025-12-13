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

interface PaymentReceiptProps {
  guestName: string;
  propertyName: string;
  bookingId: string;
  transactionId: string;
  paymentDate: string;
  paymentMethod: string;
  accommodationFee: number;
  cleaningFee: number;
  serviceFee: number;
  paymentProcessing: number;
  totalAmount: number;
}

export const PaymentReceipt = ({
  guestName,
  propertyName,
  bookingId,
  transactionId,
  paymentDate,
  paymentMethod,
  accommodationFee,
  cleaningFee,
  serviceFee,
  paymentProcessing,
  totalAmount,
}: PaymentReceiptProps) => {
  return (
    <EmailLayout preview={`Payment Receipt - Booking at ${propertyName}`}>
      {/* Header with Transaction ID */}
      <Section style={headerSection}>
        <Row>
          <Column>
            <Text style={title}>Payment Receipt</Text>
            <Text style={subtitle}>Thank you for your payment</Text>
          </Column>
          <Column align="right" style={transactionColumn}>
            <Section style={transactionBadge}>
              <Text style={transactionLabel}>Transaction ID</Text>
              <Text style={transactionIdStyle}>{transactionId}</Text>
            </Section>
          </Column>
        </Row>
      </Section>

      {/* Greeting */}
      <Section style={greetingSection}>
        <Text style={greeting}>Hi {guestName},</Text>
        <Text style={message}>
          This is your payment receipt for your booking at <strong>{propertyName}</strong>.
        </Text>
      </Section>

      {/* Payment Method Badge */}
      <Section style={paymentMethodSection}>
        <Section style={paymentMethodBadge}>
          <Text style={paymentMethodLabel}>Payment Method</Text>
          <Text style={paymentMethodValue}>{paymentMethod}</Text>
        </Section>
      </Section>

      {/* Payment Breakdown */}
      <Section style={breakdownSection}>
        <Section style={breakdownCard}>
          <Text style={breakdownTitle}>Payment Breakdown</Text>
          
          <Hr style={softDivider} />

          <Row style={lineItem}>
            <Column>
              <Text style={lineLabel}>Accommodation</Text>
            </Column>
            <Column align="right">
              <Text style={lineValue}>${accommodationFee.toFixed(2)}</Text>
            </Column>
          </Row>

          {cleaningFee > 0 && (
            <Row style={lineItem}>
              <Column>
                <Text style={lineLabel}>Cleaning fee</Text>
              </Column>
              <Column align="right">
                <Text style={lineValue}>${cleaningFee.toFixed(2)}</Text>
              </Column>
            </Row>
          )}

          <Row style={lineItem}>
            <Column>
              <Text style={lineLabel}>Service fee</Text>
            </Column>
            <Column align="right">
              <Text style={zeroFee}>$0.00 ✨</Text>
            </Column>
          </Row>

          <Row style={lineItem}>
            <Column>
              <Text style={lineLabel}>Payment processing</Text>
            </Column>
            <Column align="right">
              <Text style={lineValue}>${paymentProcessing.toFixed(2)}</Text>
            </Column>
          </Row>

          <Hr style={softDivider} />

          <Row style={totalRow}>
            <Column>
              <Text style={totalLabel}>Total Paid</Text>
            </Column>
            <Column align="right">
              <Text style={totalValue}>${totalAmount.toFixed(2)}</Text>
            </Column>
          </Row>
        </Section>
      </Section>

      {/* Transaction Details */}
      <Section style={detailsSection}>
        <Section style={detailsCard}>
          <Row style={detailRow}>
            <Column>
              <Text style={detailLabel}>Payment Date</Text>
            </Column>
            <Column>
              <Text style={detailValue}>{paymentDate}</Text>
            </Column>
          </Row>
          <Row style={detailRow}>
            <Column>
              <Text style={detailLabel}>Booking ID</Text>
            </Column>
            <Column>
              <Text style={detailValue}>{bookingId}</Text>
            </Column>
          </Row>
        </Section>
      </Section>

      {/* Download Button */}
      <Section style={ctaSection}>
        <Button
          href={`https://hiddystays.com/receipts/${transactionId}/download?utm_source=email&utm_medium=payment_receipt&utm_campaign=guest_experience`}
          style={primaryButton}
        >
          Download PDF Receipt
        </Button>
      </Section>

      {/* Footer Message */}
      <Section style={footerMessageSection}>
        <Text style={footerMessageText}>
          Keep this receipt for your records. If you have any questions about this payment,
          please contact us at{' '}
          <a href="mailto:admin@hiddystays.com" style={emailLink}>
            admin@hiddystays.com
          </a>
        </Text>
        <Text style={footerMessageText}>— The HiddyStays Team</Text>
      </Section>
    </EmailLayout>
  );
};

export default PaymentReceipt;

// Styles - World-class design system
const headerSection = {
  padding: `${spacing.xl} ${layout.containerPadding} ${spacing.md}`,
};

const title = {
  ...typography.headingXL,
  color: colors.textStrong,
  margin: `0 0 ${spacing.xs} 0`,
};

const subtitle = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: '0',
};

const transactionColumn = {
  verticalAlign: 'top' as const,
};

const transactionBadge = {
  backgroundColor: colors.softBackground,
  borderRadius: '8px',
  padding: `${spacing.sm} ${spacing.md}`,
  textAlign: 'right' as const,
};

const transactionLabel = {
  ...typography.micro,
  color: colors.textLight,
  margin: `0 0 ${spacing.xs} 0`,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const transactionIdStyle = {
  ...typography.bodySmall,
  fontWeight: "600",
  color: colors.textStrong,
  margin: "0",
  fontFamily: "monospace",
};

const greetingSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
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

const paymentMethodSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
};

const paymentMethodBadge = {
  backgroundColor: colors.softBackground,
  borderRadius: '8px',
  padding: spacing.md,
  textAlign: 'center' as const,
};

const paymentMethodLabel = {
  ...typography.micro,
  color: colors.textLight,
  margin: `0 0 ${spacing.xs} 0`,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const paymentMethodValue = {
  ...typography.body,
  fontWeight: '600',
  color: colors.textStrong,
  margin: '0',
};

const breakdownSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
};

const breakdownCard = {
  ...cards,
  backgroundColor: colors.white,
};

const breakdownTitle = {
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

const lineItem = {
  margin: `${spacing.sm} 0`,
};

const lineLabel = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: '0',
};

const lineValue = {
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

const detailsSection = {
  padding: `0 ${layout.containerPadding} ${spacing.lg}`,
};

const detailsCard = {
  ...cards,
  backgroundColor: colors.softBackground,
};

const detailRow = {
  margin: `${spacing.sm} 0`,
};

const detailLabel = {
  ...typography.micro,
  color: colors.textLight,
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const detailValue = {
  ...typography.bodySmall,
  fontWeight: '600',
  color: colors.textStrong,
  margin: '0',
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
  lineHeight: '1.6',
};

const emailLink = {
  color: colors.primaryBlue,
  textDecoration: 'none',
};
