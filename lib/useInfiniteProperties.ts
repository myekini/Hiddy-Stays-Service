import { useState, useEffect, useCallback, useRef } from "react";

interface Property {
  id: string;
  title: string;
  [key: string]: any;
}

interface UseInfinitePropertiesOptions {
  filters: Record<string, any>;
  limit?: number;
}

export function useInfiniteProperties({
  filters,
  limit = 20,
}: UseInfinitePropertiesOptions) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);
  const filtersRef = useRef(filters);

  // Reset when filters change
  useEffect(() => {
    if (JSON.stringify(filtersRef.current) !== JSON.stringify(filters)) {
      filtersRef.current = filters;
      setProperties([]);
      setPage(1);
      setHasMore(true);
      setError(null);
    }
  }, [filters]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (key === "amenities" && Array.isArray(value) && value.length > 0) {
          queryParams.append(key, value.join(","));
        } else if (value && value !== "all") {
          queryParams.append(key, value);
        }
      });

      // Add pagination
      queryParams.append("page", page.toString());
      queryParams.append("limit", limit.toString());

      const response = await fetch(`/api/properties?${queryParams.toString()}`);
      
      // Check if response is OK before parsing JSON
      if (!response.ok) {
        let errorMessage = `Failed to fetch properties (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        setError(errorMessage);
        return;
      }

      const data = await response.json();

      if (data.success) {
        const newProperties = data.properties || [];

        setProperties((prev) =>
          page === 1 ? newProperties : [...prev, ...newProperties]
        );

        setHasMore(newProperties.length === limit);
        setPage((prev) => prev + 1);
      } else {
        setError(data.error || "Failed to fetch properties");
      }
    } catch (err: any) {
      // Handle network errors, CORS errors, etc.
      const errorMessage = err instanceof TypeError && err.message === "Failed to fetch"
        ? "Network error. Please check your connection and try again."
        : err instanceof Error
        ? err.message
        : "An error occurred while fetching properties";
      
      setError(errorMessage);
      console.error("Error fetching properties:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, filters, page, limit]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore, hasMore, loading]);

  // Initial load
  useEffect(() => {
    if (properties.length === 0 && !loading) {
      loadMore();
    }
  }, []);

  return {
    properties,
    loading,
    error,
    hasMore,
    loadMore,
    observerTarget,
  };
}
