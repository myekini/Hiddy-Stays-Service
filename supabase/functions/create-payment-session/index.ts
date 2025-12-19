import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  bookingId: string;
  propertyId: string;
  propertyTitle: string;
  totalAmount: number;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const enabled = (Deno.env.get("ENABLE_SUPABASE_CREATE_PAYMENT_SESSION") || "").toLowerCase();
  if (enabled !== "true") {
    return new Response(JSON.stringify({ error: "Not found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
    });
  }

  try {
    console.log("🚀 Starting payment session creation");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const { 
      bookingId, 
      propertyId, 
      propertyTitle, 
      totalAmount, 
      guestName, 
      guestEmail,
      checkIn,
      checkOut 
    }: PaymentRequest = await req.json();

    console.log("💳 Creating Stripe session for booking:", bookingId);

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: guestEmail,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: `${propertyTitle} - ${checkIn} to ${checkOut}`,
              description: `Accommodation for ${guestName}`,
            },
            unit_amount: Math.round(totalAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/property/${propertyId}`,
      metadata: {
        bookingId,
        propertyId,
        guestName,
        guestEmail,
      },
    });

    console.log("✅ Stripe session created:", session.id);

    // Update booking with Stripe session ID
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ stripe_payment_intent_id: session.id })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Error updating booking with session ID:", updateError);
    }

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error creating payment session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});