import { Suspense } from "react";
import { BookingPaymentScreen } from "@/components/booking/BookingPaymentScreen";

interface BookingPaymentPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BookingPaymentPage({
  params,
  searchParams,
}: BookingPaymentPageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const rawToken = sp?.token;
  const token = typeof rawToken === "string" ? rawToken : undefined;
  
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}> 
      <BookingPaymentScreen bookingId={id} accessToken={token} />
    </Suspense>
  );
}
