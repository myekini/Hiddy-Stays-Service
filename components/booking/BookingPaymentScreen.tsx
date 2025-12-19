"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Copy,
  Home,
  Loader2,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface BookingDetails {
  id: string;
  property_id: string;
  status: string;
  payment_status: string;
  payment_method?: string | null;
  total_amount: number;
  currency?: string;
  check_in_date: string;
  check_out_date: string;
  guests_count: number;
  property?: {
    id: string;
    title: string;
    address?: string;
    location?: string;
    images?: string[];
  };
}

interface BookingResponse {
  success: boolean;
  booking?: BookingDetails;
  data?: BookingDetails; // fallback for older responses
  message?: string;
  error?: string;
}

interface BookingPaymentScreenProps {
  bookingId: string;
  accessToken?: string;
}

interface BankTransferInstructions {
  accountName: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode?: string;
  iban?: string;
  reference: string;
  notes: string;
}

export function BookingPaymentScreen({ bookingId, accessToken }: BookingPaymentScreenProps) {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [requestingBankTransfer, setRequestingBankTransfer] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">("card");
  const [bankInstructions, setBankInstructions] = useState<BankTransferInstructions | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBooking = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const bookingUrl = accessToken
          ? `/api/bookings/${bookingId}?token=${encodeURIComponent(accessToken)}`
          : `/api/bookings/${bookingId}`;

        const res = await fetch(bookingUrl, {
          headers: session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : undefined,
        });
        const body: BookingResponse = await res.json();

        if (!res.ok || !(body.booking || body.data)) {
          throw new Error(body.message || body.error || "Unable to load booking.");
        }

        setBooking(body.booking || body.data || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load booking.");
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [bookingId, accessToken]);

  const propertyTitle = booking?.property?.title || "Property";
  const propertyAddress = booking?.property?.address || booking?.property?.location;
  const propertyImage = booking?.property?.images?.[0];

  const displayCurrency = (booking?.currency || "CAD").toUpperCase();
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: displayCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const nights = booking
    ? Math.max(
        1,
        Math.ceil(
          (new Date(booking.check_out_date).getTime() -
            new Date(booking.check_in_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const handlePayOnline = async () => {
    if (!booking) return;

    setPaying(true);
    try {
      const tokenParam = accessToken ? `&token=${encodeURIComponent(accessToken)}` : "";
      const response = await fetch("/api/payments/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          propertyId: booking.property_id,
          success_url: `${window.location.origin}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}${tokenParam}`,
          cancel_url: `${window.location.origin}/booking/cancel?booking_id=${booking.id}${tokenParam}`,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to start payment.");
      }

      const { url, existingSession } = await response.json();
      if (!url) {
        throw new Error("Missing checkout URL.");
      }

      if (existingSession) {
        toast({
          title: "Resuming payment session",
          description: "Redirecting you back to Stripe Checkout.",
        });
      }

      window.location.href = url;
    } catch (err) {
      toast({
        title: "Unable to start payment",
        description:
          err instanceof Error
            ? err.message
            : "Please try again or contact support.",
        variant: "destructive",
      });
      setPaying(false);
    }
  };

  const fetchBankInstructions = useCallback(async () => {
    if (!booking) return;
    if (bankInstructions) return;

    setRequestingBankTransfer(true);
    try {
      const response = await fetch("/api/payments/request-bank-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      const data = await response.json();
      if (!response.ok || !data.instructions) {
        throw new Error(
          data.error || data.message || "Unable to prepare bank transfer instructions."
        );
      }

      if (data.booking) {
        setBooking(prev =>
          prev
            ? {
                ...prev,
                payment_status: data.booking.payment_status || prev.payment_status,
                payment_method: data.booking.payment_method || prev.payment_method,
              }
            : prev
        );
      }

      setBankInstructions(data.instructions);
    } catch (err) {
      toast({
        title: "Unable to fetch instructions",
        description:
          err instanceof Error
            ? err.message
            : "Please try again or use the online payment option.",
        variant: "destructive",
      });
    } finally {
      setRequestingBankTransfer(false);
    }
  }, [bankInstructions, booking]);

  // Fetch bank instructions when bank method is selected
  useEffect(() => {
    if (paymentMethod === "bank" && !bankInstructions) {
      fetchBankInstructions();
    }
  }, [paymentMethod, bankInstructions, fetchBankInstructions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-slate-600 dark:text-slate-400">Loading your booking...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Booking unavailable
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error || "We couldn’t find that booking. Please check My Bookings."}
          </p>
          <Button asChild className="w-full">
            <Link href="/bookings">View My Bookings</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 pb-20">
      <header className="border-b py-4 sticky top-0 bg-white/80 backdrop-blur-sm z-10 dark:bg-slate-950/80">
        <div className="container max-w-6xl mx-auto px-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Confirm and pay</h1>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* Mobile Summary - Shows on small screens only */}
        <div className="md:hidden mb-8">
          <div className="border rounded-xl p-4 bg-slate-50 dark:bg-slate-900 space-y-4">
            <div className="flex gap-3">
              {propertyImage ? (
                <div className="relative w-20 h-20 flex-shrink-0">
                  <Image
                    src={propertyImage}
                    alt={propertyTitle}
                    fill
                    sizes="80px"
                    className="object-cover rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Home className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm line-clamp-2 leading-snug">
                  {propertyTitle}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {nights} night{nights !== 1 ? 's' : ''}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {booking.guests_count} guest{booking.guests_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Total</span>
              <span className="text-lg font-bold">{formatMoney(Number(booking.total_amount) || 0)}</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_380px] gap-12">
          {/* Left Column: Payment Options */}
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-6">Pay with</h2>
              
              <RadioGroup 
                defaultValue="card" 
                value={paymentMethod} 
                onValueChange={(v) => setPaymentMethod(v as "card" | "bank")}
                className="space-y-4"
              >
                {/* Card Payment Option */}
                <div className={`border rounded-xl p-4 transition-all ${paymentMethod === "card" ? "border-black ring-1 ring-black dark:border-white dark:ring-white" : "border-slate-200 dark:border-slate-800 hover:border-slate-300"}`}>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="card" id="card" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="card" className="font-semibold text-base cursor-pointer flex items-center justify-between w-full">
                        <span>Pay with Card</span>
                        <div className="flex gap-1">
                          <div className="h-5 w-8 bg-slate-100 rounded flex items-center justify-center text-[10px] font-bold text-slate-500">VISA</div>
                          <div className="h-5 w-8 bg-slate-100 rounded flex items-center justify-center text-[10px] font-bold text-slate-500">MC</div>
                        </div>
                      </Label>
                      <p className="text-sm text-slate-500 mt-1">
                        Secure, instant confirmation. No hidden fees.
                      </p>
                      
                      {paymentMethod === "card" && (
                        <div className="mt-4">
                          <Button 
                            onClick={handlePayOnline} 
                            disabled={paying || booking.payment_status === "paid"}
                            className="w-full h-12 text-base"
                          >
                            {paying ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                              </>
                            ) : (
                              "Confirm and pay"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bank Transfer Option */}
                <div className={`border rounded-xl p-4 transition-all ${paymentMethod === "bank" ? "border-black ring-1 ring-black dark:border-white dark:ring-white" : "border-slate-200 dark:border-slate-800 hover:border-slate-300"}`}>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="bank" id="bank" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="bank" className="font-semibold text-base cursor-pointer">
                        Bank Transfer
                      </Label>
                      <p className="text-sm text-slate-500 mt-1">
                        Pay manually. Confirmation takes up to 24h.
                      </p>

                      {paymentMethod === "bank" && (
                        <div className="mt-4 space-y-4">
                           {requestingBankTransfer ? (
                            <div className="flex items-center justify-center py-8 text-slate-500">
                              <Loader2 className="w-6 h-6 animate-spin mr-2" />
                              Preparing instructions...
                            </div>
                          ) : bankInstructions ? (
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-sm space-y-3 border">
                              <div className="flex justify-between py-1 border-b border-dashed border-slate-200 dark:border-slate-700">
                                <span className="text-slate-500">Bank Name</span>
                                <span className="font-medium">{bankInstructions.bankName}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-dashed border-slate-200 dark:border-slate-700">
                                <span className="text-slate-500">Account Name</span>
                                <span className="font-medium">{bankInstructions.accountName}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-dashed border-slate-200 dark:border-slate-700">
                                <span className="text-slate-500">Account Number / Email</span>
                                <span className="font-medium">{bankInstructions.accountNumber}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-dashed border-slate-200 dark:border-slate-700">
                                <span className="text-slate-500">Reference Code</span>
                                <span className="font-bold text-primary">{bankInstructions.reference}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-2 pt-2">
                                {bankInstructions.notes}
                              </p>
                              <Button 
                                className="w-full mt-2" 
                                variant="outline" 
                                onClick={() => {
                                  const details = `Bank: ${bankInstructions.bankName}\nAccount: ${bankInstructions.accountName}\nAccount #: ${bankInstructions.accountNumber}\nReference: ${bankInstructions.reference}`;
                                  navigator.clipboard.writeText(details).then(() => {
                                    toast({ title: "Copied!", description: "Bank details copied to clipboard" });
                                  }).catch(() => {
                                    toast({ title: "Copy failed", description: "Please copy the details manually", variant: "destructive" });
                                  });
                                }}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy details
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              onClick={fetchBankInstructions}
                              className="w-full"
                            >
                              Get transfer instructions
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </section>

            <div className="pt-6 border-t">
               <p className="text-xs text-slate-500 text-center max-w-md mx-auto">
                 By selecting the button below, I agree to the <Link href="/terms" className="underline font-medium">Host's House Rules</Link>, <Link href="/rules" className="underline font-medium">Ground rules for guests</Link>, <Link href="/policy" className="underline font-medium">HiddyStays' Rebooking and Refund Policy</Link>, and that HiddyStays can charge my payment method if I'm responsible for damage.
               </p>
            </div>
          </div>

          {/* Right Column: Sticky Summary */}
          <div className="relative hidden md:block">
             <div className="sticky top-24 border rounded-xl p-6 shadow-lg bg-white dark:bg-slate-900 space-y-6">
                <div className="flex gap-4">
                  {propertyImage ? (
                    <div className="relative w-28 h-28 flex-shrink-0">
                      <Image
                        src={propertyImage}
                        alt={propertyTitle}
                        fill
                        sizes="112px"
                        className="object-cover rounded-xl"
                      />
                    </div>
                  ) : (
                    <div className="w-28 h-28 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl flex items-center justify-center">
                      <Home className="w-10 h-10 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base line-clamp-2 leading-snug mb-2">
                      {propertyTitle}
                    </h3>
                    {propertyAddress && (
                      <div className="flex items-center text-sm text-slate-500 mb-2">
                        <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                        <span className="truncate">{propertyAddress}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {nights} night{nights !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {booking.guests_count} guest{booking.guests_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Price details</h3>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Total for {nights} night{nights !== 1 ? 's' : ''}</span>
                    <span>{formatMoney(Number(booking.total_amount) || 0)}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Includes all fees and taxes
                  </p>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total ({displayCurrency})</span>
                    <span>{formatMoney(Number(booking.total_amount) || 0)}</span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
