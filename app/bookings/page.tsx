"use client";

import { UserBookingDashboard } from "@/components/UserBookingDashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function BookingsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#F5F7FA]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ErrorBoundary>
            <UserBookingDashboard />
          </ErrorBoundary>
        </div>
      </div>
    </ProtectedRoute>
  );
}