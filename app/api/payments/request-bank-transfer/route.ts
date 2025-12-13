import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BankInstructions {
  accountName: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode?: string;
  iban?: string;
  reference: string;
  notes: string;
}

const defaultInstructions = (bookingId: string): BankInstructions => ({
  accountName: process.env.BANK_TRANSFER_ACCOUNT_NAME || "Zero Fee Stays",
  bankName: process.env.BANK_TRANSFER_BANK_NAME || "Your Preferred Bank",
  accountNumber:
    process.env.BANK_TRANSFER_ACCOUNT_NUMBER?.replace(/\s+/g, "") ||
    "1234567890",
  routingNumber:
    process.env.BANK_TRANSFER_ROUTING_NUMBER?.replace(/\s+/g, "") ||
    "000111222",
  swiftCode: process.env.BANK_TRANSFER_SWIFT_CODE,
  iban: process.env.BANK_TRANSFER_IBAN,
  reference: bookingId,
  notes:
    process.env.BANK_TRANSFER_NOTES ||
    "Include your booking ID as the transfer reference so we can match your payment quickly.",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        status,
        payment_status,
        payment_method,
        total_amount,
        currency,
        guest_email,
        guest_name,
        property_id
      `
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Cancelled bookings cannot be updated" },
        { status: 400 }
      );
    }

    if (booking.payment_status === "paid") {
      return NextResponse.json(
        { error: "This booking has already been paid" },
        { status: 400 }
      );
    }

    const instructions = defaultInstructions(bookingId);

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_method: "bank_transfer",
        payment_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Failed to update booking for bank transfer:", updateError);
      return NextResponse.json(
        { error: "Unable to update booking" },
        { status: 500 }
      );
    }

    try {
      await supabase.from("payment_transactions").insert({
        booking_id: bookingId,
        transaction_type: "bank_transfer",
        amount: booking.total_amount,
        currency: booking.currency || "USD",
        status: "pending",
        payment_method_type: "bank_transfer",
        metadata: {
          instructions_sent_at: new Date().toISOString(),
          bank_name: instructions.bankName,
        },
      });
    } catch (transactionError) {
      console.warn("Unable to log bank transfer transaction", transactionError);
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: bookingId,
        payment_status: "pending",
        payment_method: "bank_transfer",
        total_amount: booking.total_amount,
        currency: booking.currency || "USD",
      },
      instructions,
    });
  } catch (error) {
    console.error("Error handling bank transfer request:", error);
    return NextResponse.json(
      {
        error: "Failed to process bank transfer request",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
