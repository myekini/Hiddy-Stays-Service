import { Suspense } from "react";
import { BookingPaymentScreen } from "@/components/booking/BookingPaymentScreen";

interface BookingPaymentPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingPaymentPage({ params }: BookingPaymentPageProps) {
  const { id } = await params;
  
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}> 
      <BookingPaymentScreen bookingId={id} />
    </Suspense>
  );
}
