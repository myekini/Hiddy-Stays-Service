"use client";

import { useState } from "react";
import {
  DollarSign,
  Calendar,
  Star,
  Activity,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHostAnalytics } from "@/hooks/useHostAnalytics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface HostAnalyticsDashboardProps {
  hostId: string;
}

export function HostAnalyticsDashboard({ hostId }: HostAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState("30days");
  const { data: analytics, isLoading, error, refetch } = useHostAnalytics(hostId, timeRange);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="h-7 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-full sm:w-[180px] bg-muted rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-5">
              <div className="flex items-center justify-between animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
              <div className="mt-4 space-y-2 animate-pulse">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-7 w-32 rounded bg-muted" />
                <div className="h-3 w-40 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-5">
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
          <div className="mt-3 h-[260px] bg-muted/50 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border border-destructive/40 bg-destructive/5">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-destructive" />
                <h3 className="text-base font-semibold text-foreground">
                  Failed to load analytics
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1 break-words">
                {error.message}
              </p>
            </div>
            <Button variant="outline" onClick={refetch}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Analytics Data
          </h3>
          <p className="text-muted-foreground">
            Start getting bookings to see your analytics dashboard
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (n: number) => new Intl.NumberFormat("en-CA").format(n);

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Analytics Overview
          </h2>
          <p className="text-muted-foreground mt-1">
            Key performance insights for your listings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="12months">Last 12 months</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refetch}>
            <RefreshCw className="w-4 h-4" />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <p className="text-xs text-muted-foreground">Earnings</p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatCurrency(analytics.summary.totalEarnings)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Avg {formatCurrency(analytics.summary.avgBookingValue)} / booking
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="text-xs text-muted-foreground">Bookings</p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatNumber(analytics.summary.totalBookings)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatNumber(analytics.summary.confirmedBookings)} confirmed
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-700 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <p className="text-xs text-muted-foreground">Occupancy</p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Rate</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatPercent(analytics.summary.occupancyRate)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {formatNumber(analytics.summary.activeProperties)} properties
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
                <Star className="w-5 h-5" />
              </div>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Average</p>
            <p className="text-2xl font-semibold text-foreground">
              {analytics.guests.avgRating ? analytics.guests.avgRating.toFixed(1) : "0.0"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatNumber(analytics.guests.totalGuests)} unique guests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card className="border border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Revenue</CardTitle>
          <CardDescription>Monthly earnings and booking volume</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.trends.monthlyEarnings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                stroke="#64748b"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                yAxisId="left"
                stroke="#0ea5e9"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#10b981"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value: unknown, name: string) => {
                  if (name === 'earnings') {
                    const n = typeof value === "number" ? value : Number(value);
                    return [formatCurrency(Number.isFinite(n) ? n : 0), 'Revenue'];
                  }
                  const n = typeof value === "number" ? value : Number(value);
                  return [Number.isFinite(n) ? n : 0, 'Bookings'];
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="earnings"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ fill: '#0ea5e9', r: 4 }}
                activeDot={{ r: 6 }}
                name="Revenue"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bookings"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
                name="Bookings"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-5 rounded-lg border border-border/50 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Projected monthly (based on selected range)</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {formatCurrency(analytics.trends.projectedMonthlyEarnings)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Top properties</CardTitle>
            <CardDescription>Revenue and bookings (confirmed)</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.properties.performance.length === 0 ? (
              <div className="text-sm text-muted-foreground">No confirmed bookings yet.</div>
            ) : (
              <div className="space-y-3">
                {analytics.properties.performance
                  .slice()
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 6)
                  .map((p) => (
                    <div key={p.propertyId} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(p.bookings)} booking{p.bookings === 1 ? "" : "s"}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                        {formatCurrency(p.revenue)}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Guests</CardTitle>
            <CardDescription>Quality and retention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Unique guests</p>
              <p className="text-sm font-semibold text-foreground">
                {formatNumber(analytics.guests.totalGuests)}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Repeat guests</p>
              <p className="text-sm font-semibold text-foreground">
                {formatNumber(analytics.guests.repeatGuests)}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Avg stay</p>
              <p className="text-sm font-semibold text-foreground">
                {analytics.guests.avgStayDuration.toFixed(1)} nights
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
