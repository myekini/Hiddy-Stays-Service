export interface Property {
  id: string;
  host_id: string;
  title: string;
  description: string;
  address: string;
  location: string;
  city: string;
  country: string;
  property_type: string;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  house_rules: string[];
  cancellation_policy: string;
  min_nights: number;
  max_nights: number;
  advance_notice_hours: number;
  same_day_booking: boolean;
  status: string;
  is_active: boolean;
  is_featured: boolean;
  is_verified?: boolean;
  rating: number;
  review_count: number;
  availability_rules: Record<string, any>;
  created_at: string;
  updated_at: string;
  host: {
    id: string;
    name: string;
    email: string;
  };
  images: string[];
  metrics?: {
    total_bookings?: number;
    total_revenue?: number;
    average_rating?: number;
    occupancy_rate?: number;
  };
}

export interface PropertyStats {
  totalProperties: number;
  activeProperties: number;
  featuredProperties: number;
  totalRevenue: number;
  averageRating: number;
  averageOccupancy: number;
  newThisMonth: number;
  topPerforming: number;
}

export interface PropertyFilters {
  status?: string;
  property_type?: string;
  country?: string;
  search?: string;
}

class PropertyService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
  }

  /**
   * Get all properties with optional filtering
   */
  async getProperties(filters?: PropertyFilters, authToken?: string): Promise<Property[]> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== "all") {
            params.append(key, value);
          }
        });
      }

      const queryString = params.toString();
      
      // Use admin endpoint if auth token is provided (for admin access)
      const endpoint = authToken ? "/admin/properties" : "/properties";
      const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ""}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch properties");
      }

      const data = await response.json();
      const properties = data.properties || [];
      
      // Map admin API response to Property interface
      if (authToken && properties.length > 0) {
        return properties.map((prop: any) => ({
          ...prop,
          location: prop.city || prop.address || "",
          host: {
            id: prop.host?.user_id || prop.host?.id || "",
            name: `${prop.host?.first_name || ""} ${prop.host?.last_name || ""}`.trim() || "Host",
            email: prop.host?.email || "",
          },
          total_bookings: prop.total_bookings || 0,
          total_revenue: prop.total_revenue || 0,
          average_rating: prop.average_rating || prop.rating || 0,
          images: prop.images || [],
        }));
      }
      
      return properties;
    } catch (error) {
      console.error("Error fetching properties:", error);
      throw error;
    }
  }

  /**
   * Get a specific property by ID
   */
  async getProperty(propertyId: string): Promise<Property> {
    try {
      const response = await fetch(`${this.baseUrl}/properties/${propertyId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch property");
      }

      const data = await response.json();
      return data.property;
    } catch (error) {
      console.error("Error fetching property:", error);
      throw error;
    }
  }

  /**
   * Update a property
   */
  async updateProperty(
    propertyId: string,
    updateData: Partial<Property>,
    authToken?: string
  ): Promise<Property> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseUrl}/properties/${propertyId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update property");
      }

      const data = await response.json();
      return data.property;
    } catch (error) {
      console.error("Error updating property:", error);
      throw error;
    }
  }

  /**
   * Delete a property
   */
  async deleteProperty(
    propertyId: string,
    authToken?: string
  ): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseUrl}/properties/${propertyId}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete property");
      }

      return true;
    } catch (error) {
      console.error("Error deleting property:", error);
      throw error;
    }
  }

  /**
   * Create a new property
   */
  async createProperty(
    propertyData: Partial<Property>,
    authToken?: string
  ): Promise<Property> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseUrl}/properties`, {
        method: "POST",
        headers,
        body: JSON.stringify(propertyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create property");
      }

      const data = await response.json();
      return data.property;
    } catch (error) {
      console.error("Error creating property:", error);
      throw error;
    }
  }

  /**
   * Get property statistics
   */
  async getPropertyStats(): Promise<PropertyStats> {
    try {
      const response = await fetch(`${this.baseUrl}/properties/stats/summary`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to fetch property statistics"
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching property stats:", error);
      throw error;
    }
  }

  /**
   * Toggle property status (activate/deactivate)
   */
  async togglePropertyStatus(
    propertyId: string,
    isActive: boolean,
    authToken?: string
  ): Promise<Property> {
    return this.updateProperty(propertyId, { is_active: isActive }, authToken);
  }

  /**
   * Toggle property featured status
   */
  async togglePropertyFeatured(
    propertyId: string,
    isFeatured: boolean,
    authToken?: string
  ): Promise<Property> {
    return this.updateProperty(
      propertyId,
      { is_featured: isFeatured },
      authToken
    );
  }
}

// Export singleton instance
export const propertyService = new PropertyService();
