import { unifiedEmailService } from "./unified-email-service";
import { buildAppUrl } from "./app-url";

/**
 * Utility functions for common email operations
 */

// Send welcome email to new user
export const sendWelcomeEmail = async (userData: {
  name: string;
  email: string;
  userId?: string;
}) => {
  return unifiedEmailService.sendWelcomeEmail(userData);
};

// Send booking confirmation to guest
export const sendBookingConfirmation = async (bookingData: {
  bookingId: string;
  guestName: string;
  guestEmail: string;
  hostName: string;
  hostEmail: string;
  propertyTitle: string;
  propertyLocation: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalAmount: number;
  specialRequests?: string;
  hostInstructions?: string;
}) => {
  return unifiedEmailService.sendBookingConfirmation(bookingData);
};

// Send booking notification to host
export const sendHostNotification = async (bookingData: {
  bookingId: string;
  guestName: string;
  guestEmail: string;
  hostName: string;
  hostEmail: string;
  propertyTitle: string;
  propertyLocation: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalAmount: number;
  specialRequests?: string;
  hostInstructions?: string;
}) => {
  return unifiedEmailService.sendHostNotification(bookingData);
};

// Send both guest and host emails
export const sendBookingEmails = async (bookingData: {
  bookingId: string;
  guestName: string;
  guestEmail: string;
  hostName: string;
  hostEmail: string;
  propertyTitle: string;
  propertyLocation: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalAmount: number;
  specialRequests?: string;
  hostInstructions?: string;
}) => {
  return unifiedEmailService.sendBookingEmails(bookingData);
};

// Send password reset email
export const sendPasswordReset = async (
  email: string,
  name: string,
  resetUrl: string
) => {
  return unifiedEmailService.sendPasswordReset(email, name, resetUrl);
};

// Send check-in reminder
export const sendCheckInReminder = async (bookingData: {
  bookingId: string;
  guestName: string;
  guestEmail: string;
  hostName: string;
  hostEmail: string;
  propertyTitle: string;
  propertyLocation: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalAmount: number;
  specialRequests?: string;
  hostInstructions?: string;
  checkInTime?: string;
  propertyAddress?: string;
  hostPhone?: string;
}) => {
  return unifiedEmailService.sendCheckInReminder({
    guestName: bookingData.guestName,
    guestEmail: bookingData.guestEmail,
    propertyName: bookingData.propertyTitle,
    checkInDate: bookingData.checkInDate,
    checkInTime: bookingData.checkInTime || '3:00 PM',
    propertyAddress: bookingData.propertyAddress || bookingData.propertyLocation,
    hostName: bookingData.hostName,
    hostPhone: bookingData.hostPhone || '',
    bookingId: bookingData.bookingId,
    wifiNetwork: undefined,
    wifiPassword: undefined,
    parkingInstructions: undefined,
    entryInstructions: bookingData.hostInstructions,
  });
};

// Send post-stay follow-up
export const sendPostStayFollowup = async (bookingData: {
  bookingId: string;
  guestName: string;
  guestEmail: string;
  hostName: string;
  hostEmail: string;
  propertyTitle: string;
  propertyLocation: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalAmount: number;
  specialRequests?: string;
  hostInstructions?: string;
}) => {
  return unifiedEmailService.sendPostStayFollowup(bookingData);
};

// Get email analytics
export const getEmailAnalytics = async (
  emailType?: string,
  days: number = 30
) => {
  return unifiedEmailService.getEmailAnalytics(emailType, days);
};

// Format date for email display
export const formatEmailDate = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Format currency for email display
export const formatEmailCurrency = (
  amount: number,
  currency: string = "CAD"
): string => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(amount);
};

// Validate email address
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Generate unsubscribe URL
export const generateUnsubscribeUrl = (
  email: string,
  type: string = "newsletter"
): string => {
  return buildAppUrl(
    `/unsubscribe?email=${encodeURIComponent(email)}&type=${encodeURIComponent(type)}`
  );
};

// Generate email tracking pixel URL
export const generateTrackingPixelUrl = (
  emailId: string,
  recipientEmail: string
): string => {
  return buildAppUrl(
    `/api/email/track?emailId=${encodeURIComponent(emailId)}&email=${encodeURIComponent(recipientEmail)}`
  );
};
