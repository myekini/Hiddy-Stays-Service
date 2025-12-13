import { render } from "@react-email/components";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { EmailTemplates } from "./email-templates";
import { HiddyStaysEmailTemplates } from "./email-templates/hiddystays-templates";

const resend = new Resend(process.env.RESEND_API_KEY!);

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface EmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export interface UserData {
  name: string;
  email: string;
  userId?: string;
}

export interface BookingEmailData {
  bookingId: string;
  guestName: string;
  guestEmail: string;
  hostName: string;
  hostEmail: string;
  propertyTitle: string;
  propertyLocation: string;
  checkInDate: string;
  checkOutDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  guests: number;
  totalAmount: number;
  specialRequests?: string;
  hostInstructions?: string;
  propertyImage?: string;
  hostAvatar?: string;
  propertyAddress?: string;
  googleMapsLink?: string;
  stripeFee?: number;
  netAmount?: number;
  guestPhone?: string;
}

export interface NewsletterSubscriptionData {
  email: string;
  name?: string;
  source?: string;
}

export interface PaymentReceiptData {
  guestName: string;
  guestEmail: string;
  propertyName: string;
  transactionId: string;
  paymentDate: string;
  paymentTime: string;
  paymentMethod: string;
  accommodationAmount: number;
  cleaningFee?: number;
  serviceFee: number;
  paymentProcessingFee: number;
  totalAmount: number;
  bookingId: string;
  receiptUrl?: string;
}

export interface CheckInReminderData {
  guestName: string;
  guestEmail: string;
  propertyName: string;
  checkInDate: string;
  checkInTime: string;
  propertyAddress: string;
  hostName: string;
  hostPhone: string;
  bookingId: string;
  wifiNetwork?: string;
  wifiPassword?: string;
  parkingInstructions?: string;
  entryInstructions?: string;
}

export interface WelcomeEmailData {
  name: string;
  email: string;
  role?: "host" | "guest";
}

class UnifiedEmailService {
  private static instance: UnifiedEmailService;

  private constructor() {}

  static getInstance(): UnifiedEmailService {
    if (!UnifiedEmailService.instance) {
      UnifiedEmailService.instance = new UnifiedEmailService();
    }
    return UnifiedEmailService.instance;
  }

  /**
   * Send email using Resend with React Email templates
   */
  private async sendEmail(
    to: string,
    subject: string,
    template: React.ReactElement,
    fromAddress?: string
  ): Promise<EmailResult> {
    try {
      const html = await render(template);
      const text = this.htmlToText(html);

      const result = await resend.emails.send({
        from: fromAddress || "HiddyStays <hello@hiddystays.com>",
        to: [to],
        subject,
        html,
        text,
      });

      if (result.error) {
        console.error("Resend API error:", result.error);
        return { success: false, error: result.error.message };
      }

      console.log("Email sent successfully:", result.data?.id);
      return { success: true, emailId: result.data?.id };
    } catch (error) {
      console.error("Error sending email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Track email analytics
   */
  private async trackEmailEvent(
    eventType: string,
    emailId: string,
    recipientEmail: string,
    emailType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from("email_analytics").insert({
        event_type: eventType,
        email_id: emailId,
        recipient_email: recipientEmail,
        email_type: emailType,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error tracking email event:", error);
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(userData: WelcomeEmailData): Promise<EmailResult> {
    const template = HiddyStaysEmailTemplates.HostWelcomeTemplate({
      hostName: userData.name,
      hostEmail: userData.email,
    });

    const subject =
      userData.role === "host"
        ? "Welcome to HiddyStays - List your property and keep 100%! 👋"
        : "Welcome to HiddyStays - Discover your next stay! 👋";

    const result = await this.sendEmail(
      userData.email,
      subject,
      template,
      "HiddyStays <admin@hiddystays.com>"
    );

    if (result.success && result.emailId) {
      await this.trackEmailEvent(
        "welcome_sent",
        result.emailId,
        userData.email,
        "welcome",
        {
          role: userData.role || "host",
        }
      );
    }

    return result;
  }

  /**
   * Send booking request email (before payment)
   */
  async sendBookingRequest(data: BookingEmailData & { paymentUrl?: string }): Promise<EmailResult> {
    const template = HiddyStaysEmailTemplates.BookingRequestTemplate({
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      propertyName: data.propertyTitle,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      guests: data.guests,
      totalAmount: data.totalAmount,
      bookingId: data.bookingId,
      paymentUrl: (data as any).paymentUrl,
    });

    const result = await this.sendEmail(
      data.guestEmail,
      `Complete your booking at ${data.propertyTitle} 🏠`,
      template,
      "HiddyStays <admin@hiddystays.com>"
    );

    if (result.success && result.emailId) {
      await this.trackEmailEvent(
        "booking_request_sent",
        result.emailId,
        data.guestEmail,
        "booking_request",
        {
          bookingId: data.bookingId,
          propertyTitle: data.propertyTitle,
        }
      );
    }

    return result;
  }

  /**
   * Send booking confirmation to guest (after payment)
   */
  async sendBookingConfirmation(data: BookingEmailData): Promise<EmailResult> {
    const template = HiddyStaysEmailTemplates.BookingConfirmationTemplate({
      guestName: data.guestName,
      propertyName: data.propertyTitle,
      propertyImage: data.propertyImage,
      hostName: data.hostName,
      hostAvatar: data.hostAvatar,
      checkInDate: data.checkInDate,
      checkInTime: data.checkInTime || "3:00 PM",
      checkOutDate: data.checkOutDate,
      checkOutTime: data.checkOutTime || "11:00 AM",
      guests: data.guests,
      totalAmount: data.totalAmount,
      bookingId: data.bookingId,
      propertyAddress: data.propertyAddress || data.propertyLocation,
      hostInstructions: data.hostInstructions,
      googleMapsLink: data.googleMapsLink,
    });

    const result = await this.sendEmail(
      data.guestEmail,
      `Your stay at ${data.propertyTitle} is confirmed! 🏠`,
      template,
      "HiddyStays <admin@hiddystays.com>"
    );

    if (result.success && result.emailId) {
      await this.trackEmailEvent(
        "booking_confirmation_sent",
        result.emailId,
        data.guestEmail,
        "booking_confirmation",
        {
          bookingId: data.bookingId,
          propertyTitle: data.propertyTitle,
        }
      );
    }

    return result;
  }

  /**
   * Send booking notification to host
   */
  async sendHostNotification(data: BookingEmailData): Promise<EmailResult> {
    const template = HiddyStaysEmailTemplates.HostNotificationTemplate({
      hostName: data.hostName,
      guestName: data.guestName,
      propertyName: data.propertyTitle,
      checkInDate: data.checkInDate,
      checkInTime: data.checkInTime || "3:00 PM",
      checkOutDate: data.checkOutDate,
      checkOutTime: data.checkOutTime || "11:00 AM",
      guests: data.guests,
      totalAmount: data.totalAmount,
      stripeFee: data.stripeFee || 0,
      netAmount: data.netAmount || data.totalAmount,
      bookingId: data.bookingId,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      specialRequests: data.specialRequests,
    });

    const result = await this.sendEmail(
      data.hostEmail,
      `New booking for ${data.propertyTitle} - You earned $${data.netAmount || data.totalAmount}! 🎉`,
      template,
      "HiddyStays <admin@hiddystays.com>"
    );

    if (result.success && result.emailId) {
      await this.trackEmailEvent(
        "host_notification_sent",
        result.emailId,
        data.hostEmail,
        "host_notification",
        {
          bookingId: data.bookingId,
          propertyTitle: data.propertyTitle,
          guestName: data.guestName,
        }
      );
    }

    return result;
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    email: string,
    name: string,
    resetUrl: string
  ): Promise<EmailResult> {
    const template = EmailTemplates.PasswordResetEmail({
      name,
      resetUrl,
    });

    const result = await this.sendEmail(
      email,
      "🔒 Reset Your HiddyStays Password",
      template,
      "HiddyStays Security <security@hiddystays.com>"
    );

    if (result.success && result.emailId) {
      await this.trackEmailEvent(
        "password_reset_sent",
        result.emailId,
        email,
        "password_reset"
      );
    }

    return result;
  }

  /**
   * Send newsletter welcome email
   */
  async sendNewsletterWelcome(
    data: NewsletterSubscriptionData
  ): Promise<EmailResult> {
    const template = EmailTemplates.NewsletterWelcomeEmail({
      name: data.name || "Friend",
      email: data.email,
    });

    const result = await this.sendEmail(
      data.email,
      "📧 Welcome to Our Newsletter - Travel Tips & Deals Await!",
      template,
      "HiddyStays Newsletter <newsletter@hiddystays.com>"
    );

    if (result.success && result.emailId) {
      await this.trackEmailEvent(
        "newsletter_welcome_sent",
        result.emailId,
        data.email,
        "newsletter",
        {
          source: data.source,
        }
      );
    }

    return result;
  }

  /**
   * Send bulk booking emails (guest + host)
   */
  async sendBookingEmails(data: BookingEmailData): Promise<{
    guestEmail: EmailResult;
    hostEmail: EmailResult;
  }> {
    const [guestResult, hostResult] = await Promise.allSettled([
      this.sendBookingConfirmation(data),
      this.sendHostNotification(data),
    ]);

    return {
      guestEmail:
        guestResult.status === "fulfilled"
          ? guestResult.value
          : { success: false, error: "Failed to send guest confirmation" },
      hostEmail:
        hostResult.status === "fulfilled"
          ? hostResult.value
          : { success: false, error: "Failed to send host notification" },
    };
  }

  /**
   * Send check-in reminder email
   */
  async sendCheckInReminder(data: CheckInReminderData): Promise<EmailResult> {
    const template = HiddyStaysEmailTemplates.CheckInReminderTemplate({
      guestName: data.guestName,
      propertyName: data.propertyName,
      checkInDate: data.checkInDate,
      checkInTime: data.checkInTime,
      propertyAddress: data.propertyAddress,
      hostName: data.hostName,
      hostPhone: data.hostPhone,
      bookingId: data.bookingId,
      wifiNetwork: data.wifiNetwork,
      wifiPassword: data.wifiPassword,
      parkingInstructions: data.parkingInstructions,
      entryInstructions: data.entryInstructions,
    });

    const result = await this.sendEmail(
      data.guestEmail,
      `Your stay begins tomorrow at ${data.propertyName}! 🗓️`,
      template,
      "HiddyStays <admin@hiddystays.com>"
    );

    if (result.success && result.emailId) {
      await this.trackEmailEvent(
        "check_in_reminder_sent",
        result.emailId,
        data.guestEmail,
        "check_in_reminder",
        {
          bookingId: data.bookingId,
          propertyName: data.propertyName,
        }
      );
    }

    return result;
  }

  /**
   * Send post-stay follow-up email
   */
  async sendPostStayFollowup(data: BookingEmailData): Promise<EmailResult> {
    // For now, reuse booking confirmation template with different subject
    // You can create a dedicated post-stay template later
    const template = EmailTemplates.BookingConfirmationEmail({
      guestName: data.guestName,
      propertyTitle: data.propertyTitle,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      guests: data.guests,
      totalAmount: data.totalAmount,
      bookingId: data.bookingId,
    });

    const result = await this.sendEmail(
      data.guestEmail,
      `🌟 How was your stay at ${data.propertyTitle}?`,
      template,
      "HiddyStays Follow-up <followup@hiddystays.com>"
    );

    if (result.success && result.emailId) {
      await this.trackEmailEvent(
        "post_stay_followup_sent",
        result.emailId,
        data.guestEmail,
        "post_stay_followup",
        {
          bookingId: data.bookingId,
          propertyTitle: data.propertyTitle,
        }
      );
    }

    return result;
  }

  /**
   * Send booking cancellation email
   */
  async sendBookingCancellation(
    data: BookingEmailData & {
      refundAmount?: number;
      refundPercentage?: number;
      cancellationReason?: string;
    }
  ): Promise<EmailResult> {
    const template = EmailTemplates.BookingCancellationEmail({
      guestName: data.guestName,
      propertyTitle: data.propertyTitle,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      refundAmount: (data as any).refundAmount,
      refundPercentage: (data as any).refundPercentage,
      cancellationReason: (data as any).cancellationReason,
      bookingId: data.bookingId,
    });

    const result = await this.sendEmail(
      data.guestEmail,
      `❌ Booking Cancelled - ${data.propertyTitle}`,
      template,
      "HiddyStays Cancellations <cancellations@hiddystays.com>"
    );

    if (result.success && result.emailId) {
      await this.trackEmailEvent(
        "booking_cancellation_sent",
        result.emailId,
        data.guestEmail,
        "booking_cancellation",
        { bookingId: data.bookingId }
      );
    }

    return result;
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceipt(data: PaymentReceiptData): Promise<EmailResult> {
    const template = HiddyStaysEmailTemplates.PaymentReceiptTemplate({
      guestName: data.guestName,
      propertyName: data.propertyName,
      transactionId: data.transactionId,
      paymentDate: data.paymentDate,
      paymentTime: data.paymentTime,
      paymentMethod: data.paymentMethod,
      accommodationAmount: data.accommodationAmount,
      cleaningFee: data.cleaningFee || 0,
      serviceFee: data.serviceFee,
      paymentProcessingFee: data.paymentProcessingFee,
      totalAmount: data.totalAmount,
      bookingId: data.bookingId,
      receiptUrl: data.receiptUrl,
    });

    const result = await this.sendEmail(
      data.guestEmail,
      `Payment Receipt - Booking at ${data.propertyName}`,
      template,
      "HiddyStays <admin@hiddystays.com>"
    );

    if (result.success && result.emailId) {
      await this.trackEmailEvent(
        "payment_receipt_sent",
        result.emailId,
        data.guestEmail,
        "payment_receipt",
        { bookingId: data.bookingId }
      );
    }

    return result;
  }

  /**
   * Get email analytics
   */
  async getEmailAnalytics(
    emailType?: string,
    days: number = 30
  ): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from("email_analytics")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (emailType) {
        query = query.eq("email_type", emailType);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error fetching email analytics:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Export singleton instance
export const unifiedEmailService = UnifiedEmailService.getInstance();
export default unifiedEmailService;
