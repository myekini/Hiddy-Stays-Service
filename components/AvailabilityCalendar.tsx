"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  format,
  addMonths,
  isSameMonth,
  isSameDay,
  startOfMonth,
  endOfMonth,
  isBefore,
  isAfter,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";

interface BlockedDate {
  start_date: string;
  end_date: string;
  reason?: string;
}

interface Booking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
}

interface AvailabilityCalendarProps {
  propertyId: string;
  onDateSelect?: (date: Date | undefined) => void;
  selectedDate?: Date;
  onRangeSelect?: (range: DateRange | undefined) => void;
  selectedRange?: DateRange;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  showSelectedDateOnly?: boolean;
  disabledDates?: Date[];
}

export default function AvailabilityCalendar({
  propertyId,
  onDateSelect,
  selectedDate,
  onRangeSelect,
  selectedRange,
  minDate = new Date(),
  maxDate = addMonths(new Date(), 12),
  className,
  showSelectedDateOnly = false,
  disabledDates = [],
}: AvailabilityCalendarProps) {
  const { toast } = useToast();
  const [month, setMonth] = useState<Date>(selectedRange?.from || selectedDate || new Date());
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const getDateAvailabilityType = (date: Date) => {
    const dayKey = format(date, "yyyy-MM-dd");

    const isManuallyBlocked = blockedDates.some((blockedDate) => {
      const start = new Date(blockedDate.start_date);
      const end = new Date(blockedDate.end_date);
      const startKey = format(start, "yyyy-MM-dd");
      const endKey = format(end, "yyyy-MM-dd");
      return dayKey >= startKey && dayKey <= endKey;
    });

    if (isManuallyBlocked) return "blocked" as const;

    const booking = bookings.find((b) => {
      if (b.status !== "confirmed" && b.status !== "pending") return false;

      const checkInDate = new Date(b.check_in_date);
      const checkOutDate = new Date(b.check_out_date);
      const checkInKey = format(checkInDate, "yyyy-MM-dd");
      const checkOutKey = format(checkOutDate, "yyyy-MM-dd");
      return dayKey >= checkInKey && dayKey < checkOutKey;
    });

    if (!booking) return null;
    if (booking.status === "confirmed") return "confirmed" as const;
    if (booking.status === "pending") return "pending" as const;
    return null;
  };

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = startOfMonth(month).toISOString().split("T")[0];
      const endDate = endOfMonth(month).toISOString().split("T")[0];

      const response = await fetch(
        `/api/calendar?property_id=${propertyId}&start_date=${startDate}&end_date=${endDate}`
      );

      if (response.ok) {
        const data = await response.json();
        setBlockedDates(data.blockedDates || []);
        setBookings(data.bookings || []);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch availability");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load availability calendar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [month, propertyId, toast]);

  useEffect(() => {
    if (propertyId) {
      fetchAvailability();
    }
  }, [propertyId, month, fetchAvailability]);

  const isDateBlocked = (date: Date) => {
    return getDateAvailabilityType(date) !== null;
  };

  const isDateDisabled = (date: Date) => {
    // Check if date is before minDate or after maxDate
    if (isBefore(date, minDate) || isAfter(date, maxDate)) return true;

    // Check if date is in disabledDates
    if (disabledDates.some((disabledDate) => isSameDay(disabledDate, date)))
      return true;

    // Check if date is blocked
    return isDateBlocked(date);
  };

  const getDayClass = (date: Date) => {
    const availabilityType = getDateAvailabilityType(date);
    if (availabilityType === "blocked") {
      return "bg-slate-200/70 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300";
    }
    if (availabilityType === "pending") {
      return "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:text-amber-200";
    }
    if (availabilityType === "confirmed") {
      return "bg-destructive/10 text-destructive hover:bg-destructive/20";
    }
    return "";
  };

  const getBookingInfo = (date: Date) => {
    const dayKey = format(date, "yyyy-MM-dd");
    const booking = bookings.find((booking) => {
      if (booking.status !== "confirmed" && booking.status !== "pending")
        return false;

      const checkInDate = new Date(booking.check_in_date);
      const checkOutDate = new Date(booking.check_out_date);

      const checkInKey = format(checkInDate, "yyyy-MM-dd");
      const checkOutKey = format(checkOutDate, "yyyy-MM-dd");
      return dayKey >= checkInKey && dayKey < checkOutKey;
    });

    return booking;
  };

  const getBookingStatusIcon = (date: Date) => {
    const booking = getBookingInfo(date);
    if (!booking) return null;

    switch (booking.status) {
      case "confirmed":
        return <CheckCircle className="w-3 h-3 text-primary" />;
      case "pending":
        return <Clock className="w-3 h-3 text-accentCustom-400" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("relative", className)}>
      {loading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <CalendarIcon className="mr-3 h-5 w-5 text-slate-500 dark:text-slate-400" />
          <h3 className="text-lg font-light text-slate-900 dark:text-white tracking-tight">Availability</h3>
        </div>

        {!showSelectedDateOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(new Date())}
              disabled={isSameMonth(month, new Date())}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAvailability()}
              disabled={loading}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Refresh
            </Button>
          </div>
        )}
      </div>

      {onRangeSelect ? (
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={onRangeSelect}
          month={month}
          onMonthChange={setMonth}
          disabled={isDateDisabled}
          modifiers={{
            bookedConfirmed: (date) => getDateAvailabilityType(date) === "confirmed",
            bookedPending: (date) => getDateAvailabilityType(date) === "pending",
            blocked: (date) => getDateAvailabilityType(date) === "blocked",
          }}
          modifiersClassNames={{
            bookedConfirmed:
              "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive-foreground",
            bookedPending:
              "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
            blocked:
              "bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
          }}
          className="rounded-md border shadow p-3"
          components={{
            Day: ({ date, displayMonth: _displayMonth, ...props }) => {
              const bookingIcon = getBookingStatusIcon(date);
              return (
                <button
                  {...props}
                  className={cn(
                    "select-none",
                    getDayClass(date),
                    "relative flex flex-col items-center justify-center h-8 w-8"
                  )}
                >
                  <span className="text-xs">{format(date, "d")}</span>
                  {bookingIcon && (
                    <div className="absolute -top-1 -right-1">{bookingIcon}</div>
                  )}
                </button>
              );
            },
          }}
        />
      ) : (
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          month={month}
          onMonthChange={setMonth}
          disabled={isDateDisabled}
          modifiers={{
            bookedConfirmed: (date) => getDateAvailabilityType(date) === "confirmed",
            bookedPending: (date) => getDateAvailabilityType(date) === "pending",
            blocked: (date) => getDateAvailabilityType(date) === "blocked",
          }}
          modifiersClassNames={{
            bookedConfirmed:
              "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive-foreground",
            bookedPending:
              "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
            blocked:
              "bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
          }}
          className="rounded-md border shadow p-3"
          components={{
            Day: ({ date, displayMonth: _displayMonth, ...props }) => {
              const bookingIcon = getBookingStatusIcon(date);
              return (
                <button
                  {...props}
                  className={cn(
                    "select-none",
                    getDayClass(date),
                    selectedDate &&
                      isSameDay(date, selectedDate) &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    "relative flex flex-col items-center justify-center h-8 w-8"
                  )}
                >
                  <span className="text-xs">{format(date, "d")}</span>
                  {bookingIcon && (
                    <div className="absolute -top-1 -right-1">{bookingIcon}</div>
                  )}
                </button>
              );
            },
          }}
        />
      )}

      {!showSelectedDateOnly && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-4 text-sm text-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-destructive/10 border border-destructive/20"></div>
              <span>Confirmed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500/15 border border-amber-500/20"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-slate-200/70 border border-slate-300 dark:bg-slate-800 dark:border-slate-700"></div>
              <span>Blocked</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-background border border-border"></div>
              <span>Available</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-primary" />
              <span>Confirmed Booking</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-accentCustom-400" />
              <span>Pending Booking</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
