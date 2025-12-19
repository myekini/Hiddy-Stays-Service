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
  Row,
  Column,
} from "@react-email/components";
import { colors, typography, spacing, layout } from "../design-tokens";

declare global {
  interface CSSProperties {
    WebkitFontSmoothing?: string;
    msoPaddingAlt?: string;
    msoTextRaise?: string;
    msoHide?: string;
  }
}

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>HiddyStays - {preview}</title>
        <style type="text/css">
          {`
            /* Reset styles for email clients */
            body, p, h1, h2, h3, h4, h5, h6 {
              margin: 0;
              padding: 0;
            }
            
            /* Prevent iOS from auto-linking phone numbers */
            a[x-apple-data-detectors] {
              color: inherit !important;
              text-decoration: none !important;
              font-size: inherit !important;
              font-family: inherit !important;
              font-weight: inherit !important;
              line-height: inherit !important;
            }
            
            /* Fix for Gmail app dark mode */
            .dark-bg { 
              background-color: ${colors.softBackground} !important;
            }
            
            /* Responsive images */
            img {
              -ms-interpolation-mode: bicubic;
              border: 0;
              height: auto;
              line-height: 100%;
              outline: none;
              text-decoration: none;
            }
            
            /* Prevent Outlook from adding spacing around tables */
            table {
              border-collapse: collapse;
              mso-table-lspace: 0pt;
              mso-table-rspace: 0pt;
            }
            
            /* Fix for Outlook 2019 */
            .wrapper {
              width: 100% !important;
              table-layout: fixed;
              -premailer-width: 100%;
            }
            
            /* Responsive container */
            @media only screen and (max-width: 600px) {
              .container {
                width: 100% !important;
                border-radius: 0 !important;
              }
              
              .content {
                padding: ${spacing.md}px !important;
              }
              
              .footer {
                text-align: center !important;
              }
              
              .button {
                width: 100% !important;
                display: block !important;
              }
            }
          `}
        </style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={main} className="dark-bg">
        <Container style={container} className="wrapper">
          {/* Header - Optimized for email clients */}
          <Section style={header}>
            <Row>
              <Column align="center">
                <Img
                  src="https://hiddystays.com/icons/light_email_400px.png"
                  alt="HiddyStays"
                  width="168"
                  height="42"
                  style={logo}
                />
                <Text style={brandTitle}>HiddyStays</Text>
                <Text style={brandTagline}>Zero‑Fee Stays</Text>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={content} className="content">
            {children}
          </Section>

          {/* Footer - Responsive and email client friendly */}
          <Section style={footer} className="footer">
            <Row>
              <Column align="center">
                <Text style={footerTitle}>HiddyStays</Text>
                <Text style={footerTagline}>Zero‑Fee Stays • Keep 100% of your earnings</Text>
                <Hr style={footerDivider} />
                <Text style={footerLinks}>
                  <Link href="https://hiddystays.com" style={link} target="_blank">
                    Website
                  </Link>
                  <span style={{ color: colors.textLight }}> • </span>
                  <Link href="mailto:admin@hiddystays.com" style={link}>
                    Support
                  </Link>
                </Text>
                <Text style={footerSmall}>
                  © 2025 HiddyStays. All rights reserved.
                </Text>
                
                {/* Email client specific fixes */}
                <div style={{ display: 'none' }}>
                  {Array(10).fill(0).map((_, i) => (
                    <span key={i} style={hiddenText}>&zwnj;</span>
                  ))}
                </div>
              </Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles - Optimized for email clients
const main = {
  backgroundColor: colors.softBackground,
  fontFamily: `${typography.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
  WebkitFontSmoothing: 'antialiased',
  fontSize: '16px',
  lineHeight: '1.5',
  color: colors.textStrong,
  padding: `${spacing.md}px 0`,
  margin: 0,
  width: '100%',
  WebkitTextSizeAdjust: '100%',
  msTextSizeAdjust: '100%',
};

const container = {
  margin: '0 auto',
  maxWidth: layout.maxWidth,
  width: '100%',
  backgroundColor: colors.white,
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  border: '1px solid rgba(0, 0, 0, 0.1)',
  // For Outlook
  msoHide: 'all',
  msoLineHeightRule: 'exactly',
};

const header = {
  backgroundColor: colors.white,
  padding: `${spacing.lg} ${layout.containerPadding}`,
  textAlign: "center" as const,
  minHeight: "84px",
  borderBottom: `1px solid ${colors.divider}`,
};

const logo = {
  display: "block",
  margin: "0 auto",
  width: "168px",
  maxWidth: "100%",
  height: "auto",
};

const brandTitle = {
  ...typography.micro,
  fontWeight: "700",
  color: colors.textStrong,
  margin: `${spacing.xs} 0 0 0`,
};

const brandTagline = {
  ...typography.micro,
  color: colors.textMedium,
  margin: `${spacing.xs} 0 0 0`,
};

const content = {
  padding: "0",
};

const footer = {
  backgroundColor: colors.softBackground,
  padding: `${spacing.xl} ${layout.containerPadding}`,
  textAlign: "center" as const,
  borderTop: `1px solid ${colors.divider}`,
};

const footerTitle = {
  ...typography.bodySmall,
  fontWeight: "700",
  color: colors.textStrong,
  margin: `0 0 ${spacing.xs} 0`,
};

const hiddenText = {
  fontSize: "0px",
  lineHeight: "0px",
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
  textDecoration: 'none',
  // For Outlook
  msoColorAlt: colors.primaryBlue,
  msoTextRaise: '0',
  // Hover state for clients that support it
  '&:hover': {
    textDecoration: 'underline',
  },
  // For iOS
  WebkitTextDecorationSkip: 'none',
  textDecorationSkip: 'none',
};

const footerSmall = {
  ...typography.micro,
  color: colors.textLight,
  margin: `${spacing.xs} 0`,
};
