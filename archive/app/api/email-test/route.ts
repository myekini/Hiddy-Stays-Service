import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email/unified-email-service';

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { type, data } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Email type is required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'booking-confirmation':
        result = await emailService.sendBookingConfirmation(data);
        break;

      case 'host-notification':
        result = await emailService.sendHostNotification(data);
        break;

      case 'payment-receipt':
        result = await emailService.sendPaymentReceipt(data);
        break;

      case 'welcome':
        result = await emailService.sendWelcomeEmail(data);
        break;

      case 'checkin-reminder':
        result = await emailService.sendCheckInReminder(data);
        break;

      case 'cancellation':
        result = await emailService.sendCancellationNotification(data);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${type} email sent successfully`,
      result,
    });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
