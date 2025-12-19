export interface PropertyHost {
  id: string;
  name: string;
  avatar?: string;
  verified: boolean;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  address: string;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  property_type: string;
  amenities: string[];
  images: string[];
  is_featured: boolean;
  rating?: number;
  review_count?: number;
  host_id: string;
  host?: PropertyHost;
}
