"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, Star, MapPin, Users, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface Property {
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
  property_images?: Array<{
    image_url: string;
    is_primary: boolean;
  }>;
  metrics?: {
    images: string[];
    avg_rating?: number;
    review_count?: number;
  };
  rating?: number;
  review_count?: number;
  is_active: boolean;
  is_featured?: boolean;
  created_at: string;
}

interface PropertyCardProps {
  property: Property;
  viewMode?: "grid" | "list";
  isFavorite?: boolean;
  onFavoriteToggle?: (id: string) => void;
}

const PropertyCard = ({
  property,
  viewMode = "grid",
  isFavorite = false,
  onFavoriteToggle,
}: PropertyCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const router = useRouter();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle?.(property.id);
  };

  const handleCardClick = () => {
    router.push(`/property/${property.id}`);
  };

  const imageUrl =
    property.property_images?.[0]?.image_url ||
    property.metrics?.images?.[0] ||
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop";

  if (viewMode === "list") {
    return (
      <Card
        className="bg-white dark:bg-gray-950 border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden"
        onClick={handleCardClick}
      >
        <div className="flex">
          <div className="relative w-80 h-64 overflow-hidden bg-gray-100 dark:bg-gray-900 flex-shrink-0">
            <Image
              src={imageUrl}
              alt={property.title}
              fill
              sizes="320px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              quality={85}
            />
            <button
              onClick={handleFavoriteClick}
              className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition-all duration-200"
            >
              <Heart
                className={`w-4 h-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-600 dark:text-gray-400"}`}
                strokeWidth={1.5}
              />
            </button>
          </div>

          <div className="flex-1 p-8">
            <div className="space-y-6 h-full flex flex-col">
              <div className="space-y-2">
                <h3 className="text-2xl font-light text-gray-900 dark:text-white leading-tight group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                  {property.title}
                </h3>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-sm font-medium">{property.address}</span>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-2">
                {property.description}
              </p>

              <div className="grid grid-cols-4 gap-4 text-center py-4 border-t border-b border-gray-100 dark:border-gray-800">
                <div>
                  <div className="text-lg font-light text-gray-900 dark:text-white">{property.max_guests}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Max</div>
                </div>
                <div>
                  <div className="text-lg font-light text-gray-900 dark:text-white">{property.bedrooms}bd</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Beds</div>
                </div>
                <div>
                  <div className="text-lg font-light text-gray-900 dark:text-white">{property.bathrooms}ba</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Baths</div>
                </div>
                <div>
                  <div className="text-lg font-light text-gray-900 dark:text-white capitalize">{property.property_type}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Type</div>
                </div>
              </div>

              <div className="flex items-end justify-between mt-auto">
                <div>
                  <div className="text-3xl font-light text-gray-900 dark:text-white">
                    ${property.price_per_night.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">per night • Zero fees</div>
                </div>
                {(property.metrics?.avg_rating || property.rating) && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" strokeWidth={1.5} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {property.metrics?.avg_rating || property.rating}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({property.metrics?.review_count || property.review_count || 0})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="bg-white dark:bg-gray-950 border-0 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Image Container */}
      <div className="relative h-72 overflow-hidden bg-gray-100 dark:bg-gray-900">
        <Image
          src={imageUrl}
          alt={property.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
          quality={85}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Loading skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse" />
        )}

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorite
                ? "fill-red-500 text-red-500"
                : "text-gray-600 dark:text-gray-400 hover:text-red-500"
            }`}
            strokeWidth={2}
          />
        </button>

        {/* Minimal Badges */}
        <div className="absolute top-4 left-4">
          {property.is_featured && (
            <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium">
              Featured
            </div>
          )}
        </div>
      </div>

      {/* Content - Monte Inspired Clean Design */}
      <div className="p-8">
        <div className="space-y-6">
          {/* Property Title */}
          <div>
            <h3 className="text-xl font-light text-gray-900 dark:text-white leading-tight mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
              {property.title}
            </h3>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-sm font-medium line-clamp-1">{property.address}</span>
            </div>
          </div>

          {/* Price */}
          <div>
            <div className="text-2xl font-light text-gray-900 dark:text-white">
              ${property.price_per_night.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
              per night • Zero fees
            </div>
          </div>

          {/* Property Stats - Minimal */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-light text-gray-900 dark:text-white">{property.max_guests}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Max</div>
            </div>
            <div>
              <div className="text-lg font-light text-gray-900 dark:text-white">{property.bedrooms}bd</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Beds</div>
            </div>
            <div>
              <div className="text-lg font-light text-gray-900 dark:text-white">{property.bathrooms}ba</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Baths</div>
            </div>
          </div>

          {/* Amenities Preview - Clean Dots */}
          <div className="space-y-4">
            <div className="uppercase text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
              FEATURES
            </div>
            <div className="grid grid-cols-2 gap-3">
              {property.amenities.slice(0, 4).map((amenity, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 flex-shrink-0"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize line-clamp-1">{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rating */}
          {(property.metrics?.avg_rating || property.rating) && (
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" strokeWidth={1.5} />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {property.metrics?.avg_rating || property.rating}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({property.metrics?.review_count || property.review_count || 0} reviews)
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PropertyCard;
