/**
 * Database Query Optimization Utilities
 * 
 * Provides optimized query patterns and connection management
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Create optimized Supabase client with connection pooling
 */
export function createOptimizedClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "public",
      },
      auth: {
        persistSession: false, // Don't persist in server context
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          "x-client-info": "hiddystays-optimized",
        },
      },
    }
  );
}

/**
 * Optimized query builder with common patterns
 */
export class OptimizedQuery {
  private query: any;
  private selectFields: string[] = [];

  constructor(query: any) {
    this.query = query;
  }

  /**
   * Select only required fields (reduces data transfer)
   */
  select(fields: string[]): this {
    this.selectFields = fields;
    return this;
  }

  /**
   * Apply pagination with limit and offset
   */
  paginate(page: number, limit: number): this {
    const offset = (page - 1) * limit;
    this.query = this.query.range(offset, offset + limit - 1);
    return this;
  }

  /**
   * Apply common filters efficiently
   */
  filter(filters: {
    isActive?: boolean;
    hostId?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
  }): this {
    if (filters.isActive !== undefined) {
      this.query = this.query.eq("is_active", filters.isActive);
    }
    if (filters.hostId) {
      this.query = this.query.eq("host_id", filters.hostId);
    }
    if (filters.propertyType) {
      this.query = this.query.eq("property_type", filters.propertyType);
    }
    if (filters.minPrice !== undefined) {
      this.query = this.query.gte("price_per_night", filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      this.query = this.query.lte("price_per_night", filters.maxPrice);
    }
    if (filters.minRating !== undefined) {
      this.query = this.query.gte("rating", filters.minRating);
    }
    return this;
  }

  /**
   * Apply sorting
   */
  sortBy(field: string, ascending: boolean = true): this {
    this.query = this.query.order(field, { ascending });
    return this;
  }

  /**
   * Execute query with count
   */
  async execute<T>(): Promise<{ data: T[]; count: number; error: any }> {
    const selectString = this.selectFields.length > 0 
      ? this.selectFields.join(", ")
      : "*";

    const { data, error, count } = await this.query
      .select(selectString, { count: "exact" });

    return { data: data || [], count: count || 0, error };
  }
}

/**
 * Batch query helper for multiple related queries
 */
export async function batchQuery<T>(
  queries: Array<() => Promise<T>>
): Promise<T[]> {
  return Promise.all(queries.map((q) => q()));
}

/**
 * Query with retry logic
 */
export async function queryWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data, error } = await queryFn();
      
      if (error) {
        // Don't retry on client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }
        lastError = error;
        continue;
      }
      
      if (data) {
        return data;
      }
    } catch (error) {
      lastError = error;
      // Exponential backoff
      if (i < maxRetries - 1) {
        await new Promise((resolve) => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    }
  }
  
  throw lastError || new Error("Query failed after retries");
}

/**
 * Optimize property list query
 */
export function optimizePropertyQuery(query: any, filters: {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  guests?: number;
  propertyType?: string;
  checkIn?: string;
  checkOut?: string;
}) {
  // Always filter active properties first (uses index)
  query = query.eq("is_active", true);

  // Apply indexed filters first for better performance
  if (filters.propertyType) {
    query = query.eq("property_type", filters.propertyType);
  }
  if (filters.minPrice !== undefined) {
    query = query.gte("price_per_night", filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte("price_per_night", filters.maxPrice);
  }
  if (filters.guests) {
    query = query.gte("max_guests", filters.guests);
  }

  return query;
}

