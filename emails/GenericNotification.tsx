import {
  Section,
  Text,
  Button,
} from '@react-email/components';
import { EmailLayout } from './components/EmailLayout';
import { colors, typography, spacing, layout, cards, buttons } from './design-tokens';

interface GenericNotificationProps {
  subject: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

export const GenericNotification = ({
  subject,
  message,
  actionUrl,
  actionText,
}: GenericNotificationProps) => {
  return (
    <EmailLayout preview={subject}>
      {/* Header Section */}
      <Section style={headerSection}>
        <Text style={headerTitle}>{subject}</Text>
      </Section>

      {/* Message Body */}
      <Section style={bodySection}>
        <Section style={card}>
           <Text style={messageText} dangerouslySetInnerHTML={{ __html: message.replace(/\n/g, '<br/>') }} />
        </Section>
      </Section>

      {/* Optional Action Button */}
      {actionUrl && actionText && (
        <Section style={ctaSection}>
          <Button href={actionUrl} style={primaryButton}>
            {actionText}
          </Button>
        </Section>
      )}

      {/* Footer */}
      <Section style={footerMessageSection}>
        <Text style={footerMessageText}>
          Need help? Contact us at{' '}
          <a href="mailto:admin@hiddystays.com" style={emailLink}>
            admin@hiddystays.com
          </a>
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default GenericNotification;

// Styles
const headerSection = {
  backgroundColor: colors.softBackground,
  padding: `${spacing.xl} ${layout.containerPadding}`,
  textAlign: 'center' as const,
};

const headerTitle = {
  ...typography.headingL,
  color: colors.textStrong,
  margin: '0',
};

const bodySection = {
  padding: `${spacing.lg} ${layout.containerPadding}`,
};

const card = {
  ...cards,
  backgroundColor: colors.white,
};

const messageText = {
  ...typography.body,
  color: colors.textMedium,
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
};

const emailLink = {
  color: colors.primaryBlue,
  textDecoration: 'none',
};
