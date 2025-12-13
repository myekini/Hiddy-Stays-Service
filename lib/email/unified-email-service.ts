import { Resend } from 'resend';
import { render } from '@react-email/components';
import BookingConfirmation from '@/emails/BookingConfirmation';
import HostBookingNotification from '@/emails/HostBookingNotification';
import PaymentReceipt from '@/emails/PaymentReceipt';
import WelcomeEmail from '@/emails/WelcomeEmail';
import CheckInReminder from '@/emails/CheckInReminder';
import BookingCancellation from '@/emails/BookingCancellation';
import GenericNotification from '@/emails/GenericNotification';

const resend = new Resend(process.env.RESEND_API_KEY);

// Type definitions
export interface BookingConfirmationData {
  guestName: string;
  guestEmail: string;
  propertyName: string;
  propertyImage: string;
  propertyAddress: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  guests: number;
  totalAmount: number;
  bookingId: string;
  hostName: string;
  hostAvatar?: string;
  hostEmail: string;
  specialInstructions?: string;
  googleMapsUrl: string;
}

export interface HostNotificationData {
  hostName: string;
  hostEmail: string;
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

export interface PaymentReceiptData {
  guestName: string;
  email: string;
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

export interface WelcomeEmailData {
  name: string;
  email: string;
  role: 'host' | 'guest';
}

export interface CheckInReminderData {
  guestName: string;
  guestEmail: string;
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

export class UnifiedEmailService {
  private from = 'HiddyStays <admin@hiddystays.com>';

  /**
   * Send booking confirmation to guest
   */
  async sendBookingConfirmation(data: BookingConfirmationData) {
    try {
      const html = await render(BookingConfirmation(data));

      const result = await resend.emails.send({
        from: this.from,
        to: data.guestEmail,
        subject: `Your stay at ${data.propertyName} is confirmed! 🏠`,
        html,
      });

      console.log('Booking confirmation sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
      throw error;
    }
  }

  /**
   * Send new booking notification to host
   */
  async sendHostNotification(data: HostNotificationData) {
    try {
      const html = await render(HostBookingNotification(data));

      const result = await resend.emails.send({
        from: this.from,
        to: data.hostEmail,
        subject: `New booking for ${data.propertyName} - You earned $${data.netAmount.toFixed(2)}! 🎉`,
        html,
      });

      console.log('Host notification sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending host notification:', error);
      throw error;
    }
  }

  /**
   * Send payment receipt to guest
   */
  async sendPaymentReceipt(data: PaymentReceiptData) {
    try {
      const html = await render(PaymentReceipt(data));

      const result = await resend.emails.send({
        from: this.from,
        to: data.email,
        subject: `Payment Receipt - Booking at ${data.propertyName}`,
        html,
      });

      console.log('Payment receipt sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending payment receipt:', error);
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(data: WelcomeEmailData) {
    try {
      const html = await render(WelcomeEmail(data));

      const subject = data.role === 'host'
        ? 'Welcome to HiddyStays - List your property and keep 100%! 👋'
        : 'Welcome to HiddyStays - Discover your next stay! 👋';

      const result = await resend.emails.send({
        from: this.from,
        to: data.email,
        subject,
        html,
      });

      console.log('Welcome email sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  /**
   * Send check-in reminder (24 hours before)
   */
  async sendCheckInReminder(data: CheckInReminderData) {
    try {
      const html = await render(CheckInReminder(data));

      const result = await resend.emails.send({
        from: this.from,
        to: data.guestEmail,
        subject: `Your stay begins tomorrow at ${data.propertyName}! 🗓️`,
        html,
      });

      console.log('Check-in reminder sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending check-in reminder:', error);
      throw error;
    }
  }

  /**
   * Send booking cancellation notification
   */
  async sendCancellationNotification(data: {
    recipientEmail: string;
    recipientName: string;
    propertyName: string;
    checkInDate: string;
    bookingId: string;
    cancellationReason?: string;
    refundAmount?: number;
  }) {
    try {
      const html = await render(BookingCancellation({
        guestName: data.recipientName,
        propertyName: data.propertyName,
        bookingId: data.bookingId,
        checkInDate: data.checkInDate,
        refundAmount: data.refundAmount,
        cancellationReason: data.cancellationReason,
      }));

      const result = await resend.emails.send({
        from: this.from,
        to: data.recipientEmail,
        subject: `Booking Cancelled - ${data.propertyName}`,
        html,
      });

      console.log('Cancellation notification sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending cancellation notification:', error);
      throw error;
    }
  }

  /**
   * Send generic notification email
   */
  async sendNotification(data: {
    to: string;
    subject: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
  }) {
    try {
      const html = await render(GenericNotification({
        subject: data.subject,
        message: data.message,
        actionUrl: data.actionUrl,
        actionText: data.actionText,
      }));

      const result = await resend.emails.send({
        from: this.from,
        to: data.to,
        subject: data.subject,
        html,
      });

      console.log('Notification sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const emailService = new UnifiedEmailService();
