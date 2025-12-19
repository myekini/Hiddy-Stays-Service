import { useState, useEffect, useCallback } from 'react';

interface HostAnalyticsData {
  summary: {
    totalEarnings: number;
    totalBookings: number;
    confirmedBookings: number;
    avgBookingValue: number;
    occupancyRate: number;
    activeProperties: number;
  };
  trends: {
    monthlyEarnings: Array<{ month: string; earnings: number; bookings: number }>;
    projectedMonthlyEarnings: number;
  };
  properties: {
    performance: Array<{
      propertyId: string;
      title: string;
      bookings: number;
      revenue: number;
    }>;
    topPerformer: any;
  };
  guests: {
    totalGuests: number;
    avgStayDuration: number;
    repeatGuests: number;
    avgRating: number;
  };
  timeRange: string;
  lastUpdated: string;
}

export const useHostAnalytics = (
  hostId: string | undefined,
  timeRange: string = '30days'
) => {
  const [data, setData] = useState<HostAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refetch = useCallback(() => {
    setRefreshIndex((i) => i + 1);
  }, []);

  useEffect(() => {
    if (!hostId) return;

    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/host/analytics?host_id=${hostId}&time_range=${timeRange}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error || 'Failed to fetch analytics data');
        }
        
        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [hostId, timeRange, refreshIndex]);

  return { data, isLoading, error, refetch };
};

export const usePropertyAnalytics = (
  propertyId: string | undefined,
  timeRange: string = '30days'
) => {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!propertyId) return;

    const fetchPropertyAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // For now, return mock data since property analytics isn't implemented
        const mockData = {
          revenue: 0,
          bookings: 0,
          views: 0,
          conversionRate: 0
        };
        setData(mockData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPropertyAnalytics();
  }, [propertyId, timeRange]);

  return { data, isLoading, error };
};