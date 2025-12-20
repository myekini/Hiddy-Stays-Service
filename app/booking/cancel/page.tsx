"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function BookingCancelPage() {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Payment Cancelled
          </h1>
          <p className="text-muted-foreground">
            No charges were made to your account.
          </p>
        </div>

        {/* Next Steps */}
        <Card className="p-5 mb-6 bg-card">
          <h2 className="font-semibold text-foreground mb-3">Next Steps</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Your booking is saved as pending. Complete payment within 24 hours to confirm your reservation.</p>
            <p className="pt-2 text-muted-foreground">Or browse other properties if you'd like to explore more options.</p>
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button asChild className="w-full h-12">
            <Link href="/bookings">
              View My Bookings
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full h-12">
            <Link href="/properties">
              Browse Properties
            </Link>
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help?{" "}
          <a href="mailto:support@hiddystays.com" className="underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
