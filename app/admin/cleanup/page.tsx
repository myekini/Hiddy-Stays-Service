"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface CleanupResult {
  success: boolean;
  message: string;
  deleted_count?: number;
  deleted_bookings?: Array<{
    id: string;
    guest_name: string;
    check_in_date: string;
    check_out_date: string;
  }>;
}

interface CleanupPreview {
  success: boolean;
  count: number;
  cutoff_time: string;
  bookings_to_delete: Array<{
    id: string;
    guest_name: string;
    check_in_date: string;
    check_out_date: string;
    cancelled_at: string;
  }>;
}

export default function CleanupPage() {
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [preview, setPreview] = useState<CleanupPreview | null>(null);

  const handlePreview = async () => {
    setPreviewLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/cleanup-cancelled-bookings", {
        method: "GET",
      });

      const data = await response.json();
      setPreview(data);
    } catch (error) {
      setResult({ success: false, message: "Failed to preview cleanup" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCleanup = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/cleanup-cancelled-bookings", {
        method: "POST",
      });

      const data = await response.json();
      setResult(data);
      
      // Refresh preview after cleanup
      if (data.success) {
        setTimeout(() => handlePreview(), 1000);
      }
    } catch (error) {
      setResult({ success: false, message: "Network error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Database Cleanup</h1>
          <p className="text-muted-foreground mt-2">
            Manage cancelled bookings and keep the database clean
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cancelled Bookings Cleanup</CardTitle>
            <CardDescription>
              Remove cancelled bookings older than 24 hours to keep the database tidy and ensure calendar availability is accurate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={handlePreview}
                disabled={previewLoading}
                variant="outline"
              >
                {previewLoading ? "Loading..." : "Preview Cleanup"}
              </Button>
              
              <Button 
                onClick={handleCleanup}
                disabled={loading || (!!preview && preview.count === 0)}
                variant="destructive"
              >
                {loading ? "Cleaning..." : "Run Cleanup"}
              </Button>
            </div>

            {preview && (
              <div className="border border-border/50 rounded-lg p-4 bg-card/60 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Cleanup Preview</h3>
                  <Badge variant={preview.count > 0 ? "destructive" : "secondary"}>
                    {preview.count} bookings to delete
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  Cutoff time: {new Date(preview.cutoff_time).toLocaleString()}
                </p>

                {preview.count > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Bookings to be deleted:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {preview.bookings_to_delete.map((booking) => (
                        <div key={booking.id} className="text-xs bg-card p-2 rounded border border-border/50">
                          <div className="font-medium">{booking.guest_name}</div>
                          <div className="text-muted-foreground">
                            {booking.check_in_date} to {booking.check_out_date}
                          </div>
                          <div className="text-muted-foreground/80">
                            Cancelled: {new Date(booking.cancelled_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">No old cancelled bookings found.</p>
                )}
              </div>
            )}

            {result && (
              <Alert
                className={
                  result.success
                    ? "border-emerald-200/60 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                    : "border-red-200/60 bg-red-50/60 dark:border-red-800/50 dark:bg-red-950/20"
                }
              >
                <AlertDescription
                  className={
                    result.success
                      ? "text-emerald-800 dark:text-emerald-200"
                      : "text-red-800 dark:text-red-200"
                  }
                >
                  {result.message}
                  {result.deleted_count !== undefined && (
                    <div className="mt-2">
                      <strong>Deleted:</strong> {result.deleted_count} bookings
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>How it works:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Only deletes bookings with status "cancelled"</li>
                <li>Only deletes bookings older than the cutoff date</li>
                <li>Uses soft delete via database cleanup function</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
