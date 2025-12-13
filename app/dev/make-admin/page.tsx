"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MakeAdminPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleMakeAdmin = async () => {
    if (!email) {
      setResult({ success: false, message: "Please enter an email address" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/dev/make-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message });
      } else {
        setResult({ success: false, message: data.error || "Failed to make user admin" });
      }
    } catch (error) {
      setResult({ success: false, message: "Network error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Make User Admin</CardTitle>
          <CardDescription>
            Development tool to grant admin privileges to a user
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button 
            onClick={handleMakeAdmin}
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? "Processing..." : "Make Admin"}
          </Button>

          {result && (
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                {result.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Note:</strong> This is a development tool.</p>
            <p>After making yourself admin, refresh the page and log out/in to see admin features.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
