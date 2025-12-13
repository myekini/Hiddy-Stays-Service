"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  format,
  addDays,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Lock,
  Unlock,
  Clock,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface CalendarDay {
  date: string;
  is_available: boolean;
  is_booked: boolean;
  is_blocked: boolean;
  booking?: any;
}

interface CalendarManagementProps {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
  properties?: Array<{ id: string; title: string; address: string }>;
}

export function CalendarManagement({
  propertyId: initialPropertyId,
  isOpen,
  onClose,
  properties = [],
}: CalendarManagementProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(initialPropertyId);
  const propertyId = selectedPropertyId;
  const [selectedDates, setSelectedDates] = useState<{
    start: string | null;
    end: string | null;
  }>({
    start: null,
    end: null,
  });
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [priceOverride, setPriceOverride] = useState<number | null>(null);

  useEffect(() => {
    setSelectedPropertyId(initialPropertyId);
  }, [initialPropertyId]);

  useEffect(() => {
    if (isOpen && propertyId) {
      loadCalendarData();
    }
  }, [isOpen, propertyId, currentMonth]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const startDate = startOfMonth(currentMonth).toISOString().split("T")[0];
      const endDate = endOfMonth(currentMonth).toISOString().split("T")[0];

      const response = await fetch(
        `/api/calendar?property_id=${propertyId}&start_date=${startDate}&end_date=${endDate}`
      );

      if (response.ok) {
        const data = await response.json();
        setCalendarData(data.calendar);
        setBookings(data.bookings);
      } else {
        throw new Error("Failed to load calendar data");
      }
    } catch (error) {
      console.error("Error loading calendar:", error);
      toast({
        title: "Error",
        description: "Failed to load calendar data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date: string) => {
    if (!selectedDates.start) {
      setSelectedDates({ start: date, end: null });
    } else if (!selectedDates.end) {
      if (date >= selectedDates.start) {
        setSelectedDates({ start: selectedDates.start, end: date });
      } else {
        setSelectedDates({ start: date, end: selectedDates.start });
      }
    } else {
      setSelectedDates({ start: date, end: null });
    }
  };

  const handleBlockDates = async () => {
    if (!selectedDates.start || !selectedDates.end) {
      toast({
        title: "Error",
        description: "Please select start and end dates",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          start_date: selectedDates.start,
          end_date: selectedDates.end,
          action: "block",
          reason: blockReason,
          price_override: priceOverride,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success! 🎉",
          description: "Dates blocked successfully",
        });
        setShowBlockModal(false);
        setSelectedDates({ start: null, end: null });
        setBlockReason("");
        setPriceOverride(null);
        loadCalendarData();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to block dates");
      }
    } catch (error) {
      console.error("Error blocking dates:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to block dates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockDates = async () => {
    if (!selectedDates.start || !selectedDates.end) {
      toast({
        title: "Error",
        description: "Please select start and end dates",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          start_date: selectedDates.start,
          end_date: selectedDates.end,
          action: "unblock",
        }),
      });

      if (response.ok) {
        toast({
          title: "Success! 🎉",
          description: "Dates unblocked successfully",
        });
        setSelectedDates({ start: null, end: null });
        loadCalendarData();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to unblock dates");
      }
    } catch (error) {
      console.error("Error unblocking dates:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to unblock dates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === "prev") {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const getDayStatus = (date: string) => {
    const dayData = calendarData.find((d) => d.date === date);
    if (!dayData) return "unknown";

    if (dayData.is_booked) return "booked";
    if (dayData.is_blocked) return "blocked";
    if (dayData.is_available) return "available";
    return "unavailable";
  };

  const getBlockedDateInfo = (date: string) => {
    const dayData = calendarData.find((d) => d.date === date);
    return (dayData as any)?.blocked_date || null;
  };

  const isDateSelected = (date: string) => {
    if (!selectedDates.start) return false;
    if (!selectedDates.end) return date === selectedDates.start;
    return date >= selectedDates.start && date <= selectedDates.end;
  };

  const renderCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    return days.map((day) => {
      const dateStr = day.toISOString().split("T")[0] as string;
      const status = getDayStatus(dateStr as string);
      const isSelected = isDateSelected(dateStr as string);
      const isToday = dateStr === new Date().toISOString().split("T")[0];
      const isPast = day < new Date();

      const blockedInfo = getBlockedDateInfo(dateStr as string);

      return (
        <TooltipProvider key={dateStr}>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                className={`
                  aspect-square flex items-center justify-center text-sm cursor-pointer rounded-lg transition-all
                  ${isPast ? "text-muted-foreground bg-muted/50" : ""}
                  ${status === "booked" ? "bg-destructive/10 text-destructive hover:bg-destructive/20 dark:bg-destructive/20 dark:text-destructive-foreground" : ""}
                  ${status === "blocked" ? "bg-accentCustom-100 dark:bg-accentCustom-900/20 text-accentCustom-700 dark:text-accentCustom-300 hover:dark:bg-accentCustom-900/30" : ""}
                  ${status === "available" && !isPast ? "bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary hover:bg-primary/20 dark:hover:bg-primary/30" : ""}
                  ${status === "unavailable" && !isPast ? "bg-muted/30 text-muted-foreground" : ""}
                  ${isSelected ? "ring-2 ring-primary bg-primary/10" : ""}
                  ${isToday ? "font-bold" : ""}
                `}
                onClick={() => !isPast && handleDateClick(dateStr as string)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {day.getDate()}
              </motion.div>
            </TooltipTrigger>
            {blockedInfo && (
              <TooltipContent>
                <p className="text-sm">
                  <strong>Blocked:</strong>{" "}
                  {blockedInfo.reason || "Host blocked"}
                  {blockedInfo.price_override && (
                    <>
                      <br />
                      <strong>Price:</strong> ${blockedInfo.price_override}
                    </>
                  )}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      );
    });
  };

  const getSelectedDateRange = () => {
    if (!selectedDates.start) return null;
    if (!selectedDates.end) return selectedDates.start;
    return `${selectedDates.start} to ${selectedDates.end}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-semibold text-slate-900 tracking-tight">
            Calendar Management
          </DialogTitle>
          <p className="text-slate-600 mt-2">
            Manage your property availability, block dates, and view upcoming bookings
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Calendar Navigation */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                  className="hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="text-xl font-semibold text-slate-900">
                  {format(currentMonth, "MMMM yyyy")}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                  className="hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                  className="hover:bg-slate-50"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Today
                </Button>
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
                )}
              </div>
            </div>
          </div>

          {/* Calendar Legend */}
          <div className="flex items-center gap-4 text-sm text-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary/10 dark:bg-primary/20 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-destructive/10 dark:bg-destructive/20 rounded"></div>
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-accentCustom-100 dark:bg-accentCustom-900/20 rounded"></div>
              <span>Blocked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-muted/30 rounded"></div>
              <span>Unavailable</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <Card className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground p-2"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">{renderCalendarDays()}</div>
          </Card>

          {/* Selected Dates Actions */}
          {selectedDates.start && (
            <Card className="p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 text-foreground">Selected Dates</h4>
                  <p className="text-sm text-muted-foreground">
                    {getSelectedDateRange()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBlockModal(true)}
                    disabled={loading}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Block Dates
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnblockDates}
                    disabled={loading}
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Unblock Dates
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDates({ start: null, end: null })}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Recent Bookings */}
          <Card className="p-4">
            <h4 className="font-semibold mb-4 text-foreground">Recent Bookings</h4>
            <div className="space-y-3">
              {bookings.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {format(new Date(booking.check_in_date), "MMM d")} -{" "}
                        {format(new Date(booking.check_out_date), "MMM d")}
                      </span>
                    </div>
                    <Badge
                      variant={
                        booking.status === "confirmed" ? "default" : "secondary"
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{booking.guests_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>${booking.total_amount}</span>
                    </div>
                  </div>
                </div>
              ))}

              {bookings.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No bookings found
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Block Dates Modal */}
        <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Block Dates</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Selected Dates</Label>
                <p className="text-sm text-muted-foreground">
                  {getSelectedDateRange()}
                </p>
              </div>

              <div>
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Input
                  id="reason"
                  placeholder="Maintenance, personal use, etc."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="price_override">
                  Price Override (Optional)
                </Label>
                <Input
                  id="price_override"
                  type="number"
                  placeholder="Special price for these dates"
                  value={priceOverride || ""}
                  onChange={(e) =>
                    setPriceOverride(
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBlockModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleBlockDates} disabled={loading}>
                  {loading ? "Blocking..." : "Block Dates"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
