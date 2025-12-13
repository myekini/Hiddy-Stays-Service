"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DateRange } from "react-day-picker";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  ArrowLeft,
  Share,
  Heart,
  Star,
  MapPin,
  Users,
  Bed,
  Bath,
  Wifi,
  Car,
  Coffee,
  Waves,
  Shield,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { EnhancedBookingModal } from "@/components/EnhancedBookingModal";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { PropertyReviews } from "@/components/PropertyReviews";

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
  images: string[];
  is_featured: boolean;
  rating?: number;
  review_count?: number;
  host_id: string;
  host?: {
    id: string;
    name: string;
    avatar?: string;
    verified: boolean;
  };
}

const amenityIcons: Record<string, any> = {
  wifi: Wifi,
  "wi-fi": Wifi,
  internet: Wifi,
  parking: Car,
  "free parking": Car,
  kitchen: Coffee,
  pool: Waves,
  swimming: Waves,
  gym: Users,
  fitness: Users,
  "air conditioning": Waves,
  ac: Waves,
  heating: Waves,
  tv: Coffee,
  television: Coffee,
  washer: Coffee,
  dryer: Coffee,
  "hot tub": Waves,
  jacuzzi: Waves,
  balcony: MapPin,
  patio: MapPin,
  garden: MapPin,
  workspace: Coffee,
  desk: Coffee,
};

const PropertyDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Fetch property data from API
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/properties/${params.id}`);
        const data = await response.json();

        if (data.success && data.property) {
          // Use host profile from API response (already fetched)
          const profile = data.property.profiles;
          const hostInfo = {
            id: data.property.host_id,
            name: "Hiddy", // Set host name to Hiddy
            avatar: profile?.avatar_url || "/placeholder.svg",
            verified: true,
          };

          // Transform the property data
          // Get images from multiple possible locations
          // Use the pre-processed images array from the API
          // The API already handles getting signed URLs and falling back to public_urls
          const images = Array.isArray(data.property.images) 
            ? data.property.images 
            : [];

          const transformedProperty: Property = {
            id: data.property.id,
            title: data.property.title,
            description: data.property.description,
            address: data.property.address,
            price_per_night: data.property.price_per_night,
            max_guests: data.property.max_guests,
            bedrooms: data.property.bedrooms,
            bathrooms: data.property.bathrooms,
            property_type: data.property.property_type,
            amenities: data.property.amenities || [],
            images: images.length > 0 ? images : ["/placeholder.svg"],
            is_featured: data.property.is_featured || false,
            rating: data.property.rating || data.property.metrics?.avg_rating || 4.5,
            review_count: data.property.review_count || data.property.metrics?.review_count || 0,
            host_id: data.property.host_id,
            host: hostInfo,
          };

          setProperty(transformedProperty);
        } else {
          console.error("Failed to fetch property:", data.error);
        }
      } catch (error) {
        console.error("Error fetching property:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProperty();
    }
  }, [params.id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied!",
      description: "Property link has been copied to clipboard",
    });
  };

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removed from favorites" : "Added to favorites",
      description: isFavorite
        ? "Property removed from your favorites"
        : "Property added to your favorites",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-white mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-400 font-light">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
            <MapPin className="w-8 h-8 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-light text-slate-900 dark:text-white">Property Not Found</h2>
            <p className="text-slate-600 dark:text-slate-400">The property you're looking for doesn't exist or has been removed.</p>
          </div>
          <Button 
            onClick={() => router.push("/properties")}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 py-3 font-medium transition-all duration-200"
          >
            Browse All Properties
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950">
      {/* Fixed Header */}
      <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 font-medium transition-colors -ml-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Properties</span>
              <span className="sm:hidden">Back</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
              >
                <Share className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavorite}
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
                />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Images and Details */}
          <div className="lg:col-span-8 space-y-8">
            {/* Image Gallery - Modern & Sleek */}
            <div className="relative group">
              {/* Ambient Glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-[2rem] blur-2xl opacity-50 dark:opacity-20 pointer-events-none" />
              
              <div className="relative bg-slate-100 dark:bg-slate-900 rounded-[2rem] overflow-hidden aspect-[16/10] shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
                <img
                  src={property.images[currentImageIndex]}
                  alt={property.title}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />

                {/* Navigation Arrows - Glassmorphism */}
                {property.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((currentImageIndex - 1 + property.images.length) % property.images.length)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full hover:bg-white/20 text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((currentImageIndex + 1) % property.images.length)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full hover:bg-white/20 text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
                    >
                      <ArrowLeft className="w-5 h-5 rotate-180" />
                    </button>
                  </>
                )}

                {/* Image Counter - Clean */}
                <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-md border border-white/10 text-white px-4 py-1.5 rounded-full text-xs font-medium tracking-wide">
                  {currentImageIndex + 1} / {property.images.length}
                </div>

                {/* View on Map Badge - Clean */}
                <div className="absolute bottom-6 left-6">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`, '_blank');
                    }}
                    className="bg-white/90 hover:bg-white text-slate-900 backdrop-blur-xl shadow-lg border border-white/20 rounded-full px-5 py-2 text-xs font-semibold tracking-wide transition-all duration-200"
                  >
                    <MapPin className="w-3 h-3 mr-2" />
                    View Map
                  </Button>
                </div>
              </div>
            </div>

            {/* Image Thumbnails - Refined */}
            {property.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {property.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden transition-all duration-300 ${
                      currentImageIndex === index
                        ? "ring-2 ring-slate-900 dark:ring-white ring-offset-2 dark:ring-offset-slate-950 opacity-100 scale-105"
                        : "opacity-60 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${property.title} - ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Property Information - Minimalist */}
            <div className="space-y-8 pt-4">
              {/* Header Section */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {property.is_featured && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold tracking-wide uppercase mb-3 border border-amber-100 dark:border-amber-800">
                        <Star className="w-3 h-3 fill-current" /> Featured
                      </div>
                    )}
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                      {property.title}
                    </h1>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-2 font-medium">
                      <MapPin className="w-4 h-4" />
                      <span>{property.address}</span>
                    </div>
                  </div>
                  
                  {/* Rating Badge - Modern */}
                  {property.rating && (
                    <div className="hidden sm:flex flex-col items-end">
                      <div className="flex items-center gap-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-lg font-bold shadow-lg">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {property.rating.toFixed(1)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        {property.review_count} reviews
                      </div>
                    </div>
                  )}
                </div>

                {/* Sleek Divider Stats */}
                <div className="flex items-center gap-4 sm:gap-8 py-6 border-y border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-white">{property.max_guests}</span> Guests
                    </span>
                  </div>
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                  <div className="flex items-center gap-3">
                    <Bed className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-white">{property.bedrooms}</span> Bedrooms
                    </span>
                  </div>
                  <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                  <div className="flex items-center gap-3">
                    <Bath className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-white">{property.bathrooms}</span> Baths
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">About this space</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                  {property.description || "Modern, well-appointed space with premium amenities. Ideal for comfortable short or extended stays."}
                </p>
              </div>

              {/* Amenities - Clean Grid */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {property.amenities.map((amenity, index) => {
                    const amenityKey = amenity.toLowerCase().trim();
                    const Icon = amenityIcons[amenityKey] || CheckCircle;
                    return (
                      <div key={index} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                          <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                        </div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 capitalize">{amenity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Booking and Host */}
          <div className="lg:col-span-4 space-y-6">
            {/* Booking Card - Sticky */}
            <div className="lg:sticky lg:top-24 space-y-6">
              <Card className="p-6 space-y-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                      Book your stay
                    </h3>
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
                      Best Price
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-100 dark:border-slate-700/50">
                    <AvailabilityCalendar
                      propertyId={property.id}
                      onRangeSelect={(range) => setDateRange(range)}
                      selectedRange={dateRange}
                      showSelectedDateOnly={true}
                    />
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white py-6 rounded-xl font-bold text-base transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    onClick={() => setIsBookingModalOpen(true)}
                  >
                    Check Availability
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Shield className="w-4 h-4" />
                    <span>You won't be charged yet</span>
                  </div>
                </div>
              </Card>

              {/* Host Information */}
              {property.host && (
                <Card className="p-6 space-y-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                      Meet your host
                    </h3>

                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 ring-2 ring-slate-100 dark:ring-slate-800">
                        <AvatarImage src={property.host.avatar} alt={property.host.name} />
                        <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-300 text-lg font-bold">
                          {property.host.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-base font-bold text-slate-900 dark:text-white">
                            {property.host.name}
                          </div>
                          {property.host.verified && (
                            <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800/50 text-[10px] font-bold uppercase tracking-wider">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          Superhost • Joined 2024
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-lg font-bold text-slate-900 dark:text-white">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          {property.rating || 4.9}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Rating</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-900 dark:text-white">{property.review_count || 128}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Reviews</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-900 dark:text-white">2+</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Years</div>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {property.host.name === 'Hiddy'
                        ? 'Premium stays with zero fees. Exceptional service guaranteed.'
                        : `Passionate about hosting. Committed to amazing experiences.`
                      }
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Message
                      </Button>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Call
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Enhanced Booking Modal */}
      <EnhancedBookingModal
        property={{
          id: property.id,
          title: property.title,
          price_per_night: property.price_per_night,
          max_guests: property.max_guests,
          images: property.images,
          location: property.address,
          rating: property.rating,
          review_count: property.review_count,
          cleaning_fee: 0, // Zero fees
          service_fee_percentage: 0, // Zero fees
          cancellation_policy: "Free cancellation up to 24 hours before check-in",
          check_in_time: "3:00 PM",
          check_out_time: "11:00 AM",
          house_rules: ["No smoking", "No pets", "No parties"],
          amenities: property.amenities,
          host_id: property.host_id,
        }}
        isOpen={isBookingModalOpen}
        onClose={() => {
          console.log("Closing modal");
          setIsBookingModalOpen(false);
        }}
        initialDateRange={dateRange}
      />

      {/* Reviews Section */}
      <div className="container mx-auto px-4 py-12">
        <PropertyReviews propertyId={property.id} />
      </div>
    </div>
  );
};

const PropertyDetailWithErrorBoundary = () => (
  <ErrorBoundary>
    <PropertyDetailPage />
  </ErrorBoundary>
);

export default PropertyDetailWithErrorBoundary;
