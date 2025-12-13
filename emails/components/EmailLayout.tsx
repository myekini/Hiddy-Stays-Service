import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Img,
  Hr,
} from "@react-email/components";
import { colors, typography, spacing, layout } from "../design-tokens";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header - Clean, centered, white background */}
          <Section style={header}>
            <Img
              src="https://hiddystays.com/icons/light_email_400px.png"
              alt="HiddyStays"
              width="160"
              height="40"
              style={logo}
            />
          </Section>

          {/* Main Content */}
          <Section style={content}>{children}</Section>

          {/* Footer - Light background, clean spacing */}
          <Section style={footer}>
            <Text style={footerTitle}>HiddyStays</Text>
            <Text style={footerTagline}>Zero‑Fee Stays • Keep 100% of your earnings</Text>
            <Hr style={footerDivider} />
            <Text style={footerLinks}>
              <Link href="https://hiddystays.com" style={link}>
                Website
              </Link>
              {" • "}
              <Link href="mailto:admin@hiddystays.com" style={link}>
                Support
              </Link>
              {" • "}
              <Link href="https://hiddystays.com/unsubscribe" style={link}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={footerSmall}>
              © 2025 HiddyStays. All rights reserved.
            </Text>
            <Text style={footerSmall}>
              123 Main Street, Toronto, ON M5V 3A8, Canada
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles - World-class design system
const main = {
  backgroundColor: colors.softBackground,
  fontFamily: typography.fontFamily,
};

const container = {
  margin: "0 auto",
  maxWidth: layout.maxWidth,
  backgroundColor: colors.white,
};

const header = {
  backgroundColor: colors.white,
  padding: `${spacing.md} ${layout.containerPadding}`,
  textAlign: "center" as const,
  minHeight: "60px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const logo = {
  display: "block",
  margin: "0 auto",
};

const content = {
  padding: "0",
};

const footer = {
  backgroundColor: colors.softBackground,
  padding: `${spacing.xl} ${layout.containerPadding}`,
  textAlign: "center" as const,
};

const footerTitle = {
  ...typography.bodySmall,
  fontWeight: "700",
  color: colors.textStrong,
  margin: `0 0 ${spacing.xs} 0`,
};

const footerTagline = {
  ...typography.micro,
  color: colors.textMedium,
  margin: `0 0 ${spacing.md} 0`,
};

const footerDivider = {
  borderColor: colors.divider,
  borderWidth: "1px",
  borderStyle: "solid",
  borderLeft: "none",
  borderRight: "none",
  borderBottom: "none",
  margin: `${spacing.md} 0`,
};

const footerLinks = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: `${spacing.md} 0`,
};

const link = {
  color: colors.primaryBlue,
  textDecoration: "none",
};

const footerSmall = {
  ...typography.micro,
  color: colors.textLight,
  margin: `${spacing.xs} 0`,
};
