import { Section, Text, Button, Row, Column, Img } from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";
import { colors, typography, spacing, layout, buttons, cards } from "./design-tokens";

interface WelcomeEmailProps {
  name: string;
  role: "host" | "guest";
}

export const WelcomeEmail = ({ name, role }: WelcomeEmailProps) => {
  const isHost = role === "host";

  return (
    <EmailLayout
      preview={
        isHost
          ? "Welcome to HiddyStays — Keep 100% of your earnings"
          : "Welcome to HiddyStays — Book with zero hidden fees"
      }
    >
      {/* Hero Image with Overlay */}
      <Section style={heroWrapper}>
        <Img
          src={
            isHost
              ? "https://hiddystays.com/images/welcome-host.jpg"
              : "https://hiddystays.com/images/welcome-guest.jpg"
          }
          alt="Welcome"
          width="640"
          height="280"
          style={heroImage}
        />
        <Section style={heroOverlay}>
          <Text style={heroTitle}>
            {isHost ? "Welcome to the Zero‑Fee Revolution" : "Welcome to HiddyStays"}
          </Text>
        </Section>
      </Section>

      {/* Greeting */}
      <Section style={greetingSection}>
        <Text style={greeting}>Hi {name},</Text>
        <Text style={message}>
          {isHost ? (
            <>
              Welcome to HiddyStays — keep{" "}
              <strong>100% of your earnings</strong> with zero platform fees.
            </>
          ) : (
            <>
              Welcome to HiddyStays — book amazing stays with{" "}
              <strong>transparent pricing</strong> and no hidden fees.
            </>
          )}
        </Text>
      </Section>

      {/* Value Props - 3 Columns */}
      <Section style={valuePropsSection}>
        <Row style={propsRow}>
          <Column style={propColumn}>
            <Text style={propEmoji}>💰</Text>
            <Text style={propTitle}>
              {isHost ? "Zero Fees" : "Transparent Pricing"}
            </Text>
            <Text style={propText}>
              {isHost
                ? "Keep 100% of every booking"
                : "Clear prices with no surprises"}
            </Text>
          </Column>

          <Column style={propColumn}>
            <Text style={propEmoji}>🤝</Text>
            <Text style={propTitle}>Direct Connection</Text>
            <Text style={propText}>
              {isHost
                ? "Build real guest relationships"
                : "Communicate directly with your host"}
            </Text>
          </Column>

          <Column style={propColumn}>
            <Text style={propEmoji}>🚀</Text>
            <Text style={propTitle}>
              {isHost ? "Modern Tools" : "Easy Booking"}
            </Text>
            <Text style={propText}>
              {isHost
                ? "Manage your property effortlessly"
                : "A smooth, simple booking experience"}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Host Quick Start */}
      {isHost && (
        <Section style={quickStartSection}>
          <Text style={quickStartTitle}>Get Started in 4 Steps</Text>

          {[
            "List your property",
            "Add photos and details",
            "Set your pricing",
            "Start accepting bookings",
          ].map((step, i) => (
            <Row key={i} style={quickStartRow}>
              <Column style={quickStartNumberCol}>
                <Text style={quickStartNumber}>{i + 1}</Text>
              </Column>
              <Column>
                <Text style={quickStartText}>{step}</Text>
              </Column>
            </Row>
          ))}
        </Section>
      )}

      {/* CTA Section */}
      <Section style={ctaSection}>
        {isHost ? (
          <Button
            href="https://hiddystays.com/host-dashboard?utm_source=email&utm_medium=welcome_host&utm_campaign=onboarding"
            style={primaryButton}
          >
            Add Your Property
          </Button>
        ) : (
          <Button
            href="https://hiddystays.com/properties?utm_source=email&utm_medium=welcome_guest&utm_campaign=onboarding"
            style={primaryButton}
          >
            Browse Properties
          </Button>
        )}
      </Section>

      {/* Help Section */}
      <Section style={helpSection}>
        <Text style={helpTitle}>Questions?</Text>
        <Text style={helpText}>
          Contact us at{" "}
          <a href="mailto:admin@hiddystays.com" style={emailLink}>
            admin@hiddystays.com
          </a>
        </Text>
      </Section>

      {/* Closing */}
      <Section style={closingSection}>
        <Text style={closingText}>
          {isHost ? "Here's to your success!" : "Happy browsing!"}
        </Text>
        <Text style={closingText}>— The HiddyStays Team</Text>
      </Section>
    </EmailLayout>
  );
};

export default WelcomeEmail;

// Styles - World-class design system
const heroWrapper = {
  position: "relative" as const,
  padding: `0 ${layout.containerPadding}`,
};

const heroImage = {
  width: "100%",
  borderRadius: cards.borderRadius,
  display: "block",
};

const heroOverlay = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  textAlign: "center" as const,
  width: "100%",
};

const heroTitle = {
  ...typography.headingXL,
  fontWeight: "700",
  color: colors.white,
  textShadow: "0 2px 6px rgba(0,0,0,0.4)",
  margin: "0",
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
  margin: "0",
};

const valuePropsSection = {
  padding: `${spacing.lg} ${layout.containerPadding}`,
  backgroundColor: colors.softBackground,
  borderRadius: cards.borderRadius,
  margin: `0 ${layout.containerPadding} ${spacing.lg} ${layout.containerPadding}`,
};

const propsRow = {
  margin: "0",
};

const propColumn = {
  textAlign: "center" as const,
  padding: `0 ${spacing.sm}`,
  verticalAlign: "top" as const,
};

const propEmoji = {
  fontSize: "36px",
  margin: `0 0 ${spacing.sm} 0`,
  lineHeight: "1",
};

const propTitle = {
  ...typography.headingM,
  color: colors.textStrong,
  margin: `0 0 ${spacing.xs} 0`,
};

const propText = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: "0",
  lineHeight: "1.5",
};

const quickStartSection = {
  padding: `${spacing.lg} ${layout.containerPadding}`,
};

const quickStartTitle = {
  ...typography.headingM,
  color: colors.textStrong,
  margin: `0 0 ${spacing.md} 0`,
};

const quickStartRow = {
  margin: `${spacing.sm} 0`,
};

const quickStartNumberCol = {
  width: "40px",
  verticalAlign: "top" as const,
};

const quickStartNumber = {
  width: "32px",
  height: "32px",
  backgroundColor: colors.accentGreen,
  color: colors.white,
  borderRadius: "50%",
  display: "inline-block",
  textAlign: "center" as const,
  lineHeight: "32px",
  fontWeight: "700",
  fontSize: "16px",
  margin: "0",
};

const quickStartText = {
  ...typography.body,
  color: colors.textStrong,
  margin: "0",
  paddingTop: "4px",
};

const ctaSection = {
  padding: `${spacing.xl} ${layout.containerPadding}`,
  textAlign: "center" as const,
};

const primaryButton = {
  ...buttons.primary,
  textDecoration: "none",
  display: "inline-block",
};

const helpSection = {
  padding: `${spacing.lg} ${layout.containerPadding}`,
  textAlign: "center" as const,
  backgroundColor: colors.softBackground,
};

const helpTitle = {
  ...typography.headingM,
  color: colors.textStrong,
  margin: `0 0 ${spacing.sm} 0`,
};

const helpText = {
  ...typography.bodySmall,
  color: colors.textMedium,
  margin: "0",
};

const emailLink = {
  color: colors.primaryBlue,
  textDecoration: "none",
};

const closingSection = {
  padding: `${spacing.lg} ${layout.containerPadding}`,
  textAlign: "center" as const,
};

const closingText = {
  ...typography.body,
  color: colors.textMedium,
  margin: `${spacing.xs} 0`,
};
