/**
 * HiddyStays Email Design Tokens
 * World-class SaaS email design system
 */

export const colors = {
  // Primary Colors
  primaryBlue: '#102334', // Darker, richer, premium
  accentGreen: '#10B981', // Fresh & modern (keep as-is)
  
  // Backgrounds
  softBackground: '#F5F7FA', // Cleaner than #F9FAFB
  white: '#FFFFFF',
  
  // Borders & Dividers
  divider: '#E5E7EB', // Light neutral
  
  // Text Colors
  textStrong: '#0F172A', // Deep slate
  textMedium: '#475569', // For paragraphs
  textLight: '#94A3B8', // Muted meta-data
  
  // Legacy (for backward compatibility during transition)
  legacyBlue: '#1E3A5F',
  legacyTextDark: '#111827',
  legacyTextLight: '#6B7280',
  legacyBackground: '#F9FAFB',
};

export const typography = {
  headingXL: {
    fontSize: '28px',
    fontWeight: 'bold',
    lineHeight: '1.2',
  },
  headingL: {
    fontSize: '22px',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  headingM: {
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '1.4',
  },
  body: {
    fontSize: '16px',
    fontWeight: '400',
    lineHeight: '1.6',
  },
  bodySmall: {
    fontSize: '15px',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  micro: {
    fontSize: '13px',
    fontWeight: '500',
    lineHeight: '1.4',
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

export const spacing = {
  xs: '8px',
  sm: '16px',
  md: '24px',
  lg: '32px',
  xl: '40px',
};

export const layout = {
  maxWidth: '640px',
  containerPadding: '32px',
  sectionPadding: '24px',
  cardPadding: '24px',
};

export const cards = {
  borderRadius: '12px',
  border: '1px solid #E5E7EB',
  padding: '24px',
  shadow: '0 2px 6px rgba(0,0,0,0.04)',
  backgroundColor: '#FFFFFF',
};

export const buttons = {
  primary: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    height: '48px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    padding: '16px 32px',
  },
  secondary: {
    backgroundColor: 'transparent',
    color: '#102334',
    border: '1px solid #102334',
    height: '48px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    padding: '16px 32px',
  },
};

export const dividers = {
  soft: {
    borderTop: '1px solid #E5E7EB',
    margin: '24px 0',
  },
};

