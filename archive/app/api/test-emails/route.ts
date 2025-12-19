import { NextRequest, NextResponse } from "next/server";
import { unifiedEmailService } from "@/lib/unified-email-service";

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Email testing is only available in development" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, testType = "all" } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hiddystays.com";
    const results = [];

    // Test Welcome Email (Host)
    if (testType === "all" || testType === "welcome") {
      try {
        const welcomeResult = await unifiedEmailService.sendWelcomeEmail({
          email,
          name: "Test Host",
          role: "host",
        });
        results.push({
          type: "welcome",
          success: welcomeResult.success,
          error: welcomeResult.error,
        });
      } catch (error) {
        results.push({
          type: "welcome",
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Test Booking Confirmation Email
    if (testType === "all" || testType === "booking-confirmation") {
      try {
        const bookingConfirmationResult =
          await unifiedEmailService.sendBookingConfirmation({
            bookingId: "test-booking-123",
            guestName: "Test Guest",
            guestEmail: email,
            hostName: "Test Host",
            hostEmail: "host@example.com",
            propertyTitle: "Beautiful Lake House",
            propertyLocation: "Muskoka, ON",
            propertyAddress: "123 Lake Shore Drive, Muskoka, ON",
            checkInDate: "2024-08-15",
            checkInTime: "3:00 PM",
            checkOutDate: "2024-08-18",
            checkOutTime: "11:00 AM",
            guests: 2,
            totalAmount: 450,
            specialRequests: "Late check-in requested",
            hostInstructions: "Use the side door entrance",
            propertyImage:
              "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=300&fit=crop",
            hostAvatar:
              "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
            googleMapsLink: `https://maps.google.com/?q=${encodeURIComponent("123 Lake Shore Drive, Muskoka, ON")}`,
          });
        results.push({
          type: "booking-confirmation",
          success: bookingConfirmationResult.success,
          error: bookingConfirmationResult.error,
        });
      } catch (error) {
        results.push({
          type: "booking-confirmation",
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Test Host Notification Email
    if (testType === "all" || testType === "host-notification") {
      try {
        const hostNotificationResult =
          await unifiedEmailService.sendHostNotification({
            bookingId: "test-booking-123",
            guestName: "Test Guest",
            guestEmail: "guest@example.com",
            hostName: "Test Host",
            hostEmail: email,
            propertyTitle: "Beautiful Lake House",
            propertyLocation: "Muskoka, ON",
            propertyAddress: "123 Lake Shore Drive, Muskoka, ON",
            checkInDate: "2024-08-15",
            checkInTime: "3:00 PM",
            checkOutDate: "2024-08-18",
            checkOutTime: "11:00 AM",
            guests: 2,
            totalAmount: 450,
            stripeFee: 13.05,
            netAmount: 436.95,
            specialRequests: "Late check-in requested",
            guestPhone: "+1-416-555-0123",
          });
        results.push({
          type: "host-notification",
          success: hostNotificationResult.success,
          error: hostNotificationResult.error,
        });
      } catch (error) {
        results.push({
          type: "host-notification",
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Test Payment Receipt Email
    if (testType === "all" || testType === "payment-receipt") {
      try {
        const paymentReceiptResult =
          await unifiedEmailService.sendPaymentReceipt({
            guestName: "Test Guest",
            guestEmail: email,
            propertyName: "Beautiful Lake House",
            transactionId: "pi_test_1234567890",
            paymentDate: new Date().toLocaleDateString(),
            paymentTime: new Date().toLocaleTimeString(),
            paymentMethod: "4242",
            accommodationAmount: 420,
            cleaningFee: 30,
            serviceFee: 0,
            paymentProcessingFee: 13.05,
            totalAmount: 450,
            bookingId: "test-booking-123",
            receiptUrl: `${baseUrl}/bookings/test-booking-123/receipt`,
          });
        results.push({
          type: "payment-receipt",
          success: paymentReceiptResult.success,
          error: paymentReceiptResult.error,
        });
      } catch (error) {
        results.push({
          type: "payment-receipt",
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Test Check-in Reminder Email
    if (testType === "all" || testType === "checkin-reminder") {
      try {
        const checkInReminderResult =
          await unifiedEmailService.sendCheckInReminder({
            guestName: "Test Guest",
            guestEmail: email,
            propertyName: "Beautiful Lake House",
            checkInDate: "2024-08-15",
            checkInTime: "3:00 PM",
            propertyAddress: "123 Lake Shore Drive, Muskoka, ON",
            hostName: "Test Host",
            hostPhone: "+1-416-555-0123",
            bookingId: "test-booking-123",
            wifiNetwork: "LakeHouse_WiFi",
            wifiPassword: "Welcome2024",
            parkingInstructions: "Park in the driveway on the left side",
            entryInstructions: "Use the side door, key is under the flower pot",
          });
        results.push({
          type: "checkin-reminder",
          success: checkInReminderResult.success,
          error: checkInReminderResult.error,
        });
      } catch (error) {
        results.push({
          type: "checkin-reminder",
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Email testing completed. ${successful} successful, ${failed} failed.`,
      results,
      summary: {
        total: results.length,
        successful,
        failed,
      },
    });
  } catch (error) {
    console.error("Error testing emails:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

