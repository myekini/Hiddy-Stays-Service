"use client";

import Link from "next/link";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function BookingCancelPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Payment Cancelled
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            No charges were made to your account.
          </p>
        </div>

        {/* Info Card */}
        <Card className="p-5 mb-6 bg-white dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-3">What happened?</h2>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>• Payment was cancelled before completion</li>
            <li>• Your booking is saved as pending</li>
            <li>• You can complete payment anytime</li>
          </ul>
        </Card>

        {/* Zero fees reminder */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 text-center">
          <p className="text-blue-800 dark:text-blue-300 text-sm font-medium">
            💡 Remember: Zero platform fees = more savings!
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button asChild className="w-full h-12">
            <Link href="/bookings">
              <RefreshCw className="w-4 h-4 mr-2" />
              View My Bookings
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full h-12">
            <Link href="/properties">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Properties
            </Link>
          </Button>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Need help?{" "}
          <a href="mailto:support@hiddystays.com" className="underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
