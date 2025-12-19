import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const enabled = (Deno.env.get("ENABLE_SUPABASE_VERIFY_PAYMENT") || "").toLowerCase();
  if (enabled !== "true") {
    return new Response(JSON.stringify({ error: "Not found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
    });
  }

  try {
    console.log("🔍 Verifying payment");
    
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log("📋 Session status:", session.payment_status);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const bookingId = session.metadata?.bookingId;
    
    if (!bookingId) {
      throw new Error("No booking ID found in session metadata");
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError) {
      throw new Error(`Booking not found: ${bookingError.message}`);
    }

    // Update booking status based on payment status
    if (session.payment_status === "paid" && booking.status !== "confirmed") {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ 
          status: "confirmed",
          stripe_payment_intent_id: session.payment_intent as string
        })
        .eq("id", bookingId);

      if (updateError) {
        console.error("Error updating booking:", updateError);
      } else {
        console.log("✅ Booking confirmed via verification:", bookingId);
      }
    }

    return new Response(
      JSON.stringify({
        paymentStatus: session.payment_status,
        bookingStatus: session.payment_status === "paid" ? "confirmed" : booking.status,
        booking: {
          id: booking.id,
          status: session.payment_status === "paid" ? "confirmed" : booking.status,
          checkInDate: booking.check_in_date,
          checkOutDate: booking.check_out_date,
          guestsCount: booking.guests_count,
          totalAmount: booking.total_amount
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error verifying payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});