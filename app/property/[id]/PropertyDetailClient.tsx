"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DateRange } from "react-day-picker";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Share,
  Heart,
  Star,
  X,
  MapPin,
  Mail,
  Phone,
  Users,
  Bed,
  Bath,
  Wifi,
  Car,
  Coffee,
  Waves,
  Shield,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "./types";

const EnhancedBookingModal = dynamic(
  () => import("@/components/EnhancedBookingModal").then((m) => m.EnhancedBookingModal),
  { ssr: false }
);

const AvailabilityCalendar = dynamic(() => import("@/components/AvailabilityCalendar"), {
  ssr: false,
});

const PropertyReviews = dynamic(
  () => import("@/components/PropertyReviews").then((m) => m.PropertyReviews),
  { ssr: false }
);

const amenityIcons: Record<string, LucideIcon> = {
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

interface PropertyDetailClientProps {
  property: Property;
}

export default function PropertyDetailClient({ property }: PropertyDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied!",
      description: "Property link has been copied to clipboard",
    });
  };

  const handleFavorite = () => {
    setIsFavorite((prev) => !prev);
    toast({
      title: isFavorite ? "Removed from favorites" : "Added to favorites",
      description: isFavorite
        ? "Property removed from your favorites"
        : "Property added to your favorites",
    });
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950">
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-[2rem] blur-2xl opacity-50 dark:opacity-20 pointer-events-none" />

                <div className="relative bg-slate-100 dark:bg-slate-900 rounded-[2rem] overflow-hidden aspect-[16/10] shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
                  <Image
                    src={property.images[currentImageIndex]}
                    alt={property.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-cover transition-transform duration-700 hover:scale-105"
                  />

                  {property.images.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setCurrentImageIndex(
                            (currentImageIndex - 1 + property.images.length) % property.images.length
                          )
                        }
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/25 backdrop-blur-md border border-white/15 p-3 rounded-full hover:bg-black/35 text-white transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((currentImageIndex + 1) % property.images.length)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/25 backdrop-blur-md border border-white/15 p-3 rounded-full hover:bg-black/35 text-white transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <ArrowLeft className="w-5 h-5 rotate-180" />
                      </button>
                    </>
                  )}

                  <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-md border border-white/10 text-white px-4 py-1.5 rounded-full text-xs font-medium tracking-wide">
                    {currentImageIndex + 1} / {property.images.length}
                  </div>

                  {property.images.length > 1 && (
                    <div className="absolute bottom-6 right-6 -translate-y-10">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsGalleryOpen(true);
                        }}
                        className="bg-white/90 hover:bg-white text-slate-900 backdrop-blur-xl shadow-lg border border-white/20 rounded-full px-5 py-2 text-xs font-semibold tracking-wide transition-all duration-200"
                      >
                        View all photos
                      </Button>
                    </div>
                  )}

                  <div className="absolute bottom-6 left-6">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`,
                          "_blank"
                        );
                      }}
                      className="bg-white/90 hover:bg-white text-slate-900 backdrop-blur-xl shadow-lg border border-white/20 rounded-full px-5 py-2 text-xs font-semibold tracking-wide transition-all duration-200"
                    >
                      <MapPin className="w-3 h-3 mr-2" />
                      View Map
                    </Button>
                  </div>
                </div>
              </div>

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
                      <Image src={image} alt={`${property.title} - ${index + 1}`} fill sizes="96px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {isGalleryOpen && (
                <div
                  className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Photo gallery"
                  onClick={() => setIsGalleryOpen(false)}
                >
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <div className="text-white/80 text-sm font-medium">
                      {currentImageIndex + 1} / {property.images.length}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => setIsGalleryOpen(false)}
                      className="text-white hover:bg-white/10 rounded-full"
                    >
                      <span className="sr-only">Close</span>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  <div
                    className="h-full w-full flex items-center justify-center px-4 pt-16 pb-28"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative w-full max-w-6xl aspect-[16/10]">
                      <Image
                        src={property.images[currentImageIndex]}
                        alt={`${property.title} - ${currentImageIndex + 1}`}
                        fill
                        sizes="(max-width: 1024px) 100vw, 1024px"
                        className="object-contain"
                      />

                      {property.images.length > 1 && (
                        <>
                          <button
                            onClick={() =>
                              setCurrentImageIndex(
                                (currentImageIndex - 1 + property.images.length) % property.images.length
                              )
                            }
                            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-colors"
                            aria-label="Previous photo"
                          >
                            <ArrowLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setCurrentImageIndex((currentImageIndex + 1) % property.images.length)}
                            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-colors"
                            aria-label="Next photo"
                          >
                            <ArrowLeft className="w-5 h-5 rotate-180" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {property.images.length > 1 && (
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-5" onClick={(e) => e.stopPropagation()}>
                      <div className="mx-auto max-w-6xl">
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                          {property.images.map((image, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={cn(
                                "relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-2xl overflow-hidden transition-all duration-200",
                                currentImageIndex === index
                                  ? "ring-2 ring-white ring-offset-2 ring-offset-black/60 opacity-100"
                                  : "opacity-60 hover:opacity-100"
                              )}
                              aria-label={`View photo ${index + 1}`}
                            >
                              <Image src={image} alt="" fill sizes="96px" className="object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-8 pt-4">
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

                  <div className="flex items-center gap-4 sm:gap-8 py-6 border-y border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-white">{property.max_guests}</span> Guests
                      </span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="flex items-center gap-3">
                      <Bed className="w-5 h-5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-white">{property.bedrooms}</span> Bedrooms
                      </span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="flex items-center gap-3">
                      <Bath className="w-5 h-5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-white">{property.bathrooms}</span> Baths
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">About this space</h3>
                  {(() => {
                    const description =
                      property.description ||
                      "A modern, well-appointed stay with thoughtful comforts—ideal for short visits or extended trips.";
                    const isLong = description.length > 220;

                    return (
                      <div className="space-y-3">
                        <div className="relative">
                          <p
                            className={cn(
                              "text-base sm:text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed",
                              !isDescriptionExpanded && isLong && "max-h-[7.5rem] overflow-hidden"
                            )}
                          >
                            {description}
                          </p>
                          {!isDescriptionExpanded && isLong && (
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent" />
                          )}
                        </div>

                        {isLong && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-auto p-0 text-slate-900 dark:text-white hover:bg-transparent hover:underline underline-offset-4"
                            onClick={() => setIsDescriptionExpanded((v) => !v)}
                          >
                            {isDescriptionExpanded ? "Show less" : "Read more"}
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </div>

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

            <div className="lg:col-span-4 space-y-6">
              <div className="lg:sticky lg:top-24 space-y-6">
                <Card
                  id="availability"
                  className="p-6 space-y-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-2xl ring-1 ring-black/5 dark:ring-white/10"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Book your stay</h3>
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

                {property.host && (
                  <Card className="p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/70 dark:border-slate-800/70 rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Meet your host</h3>
                        {property.host.verified && (
                          <Badge
                            variant="secondary"
                            className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800/50 text-[10px] font-bold uppercase tracking-wider"
                          >
                            Verified
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-start gap-4">
                        <Avatar className="h-14 w-14 ring-2 ring-slate-100 dark:ring-slate-800 shadow-sm">
                          <AvatarImage
                            src={property.host.avatar || "/assets/hiddy.png"}
                            alt={property.host.name}
                            className="object-cover"
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              if (img.src.endsWith("/assets/hiddy.png")) return;
                              img.src = "/assets/hiddy.png";
                            }}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-300 text-lg font-bold">
                            {property.host.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-base font-bold text-slate-900 dark:text-white leading-tight">{property.host.name}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Superhost • Joined 2024</div>

                          <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            <a
                              href="mailto:admin@hiddystays.com"
                              className="inline-flex items-center gap-2 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                              <Mail className="w-4 h-4" />
                              <span>admin@hiddystays.com</span>
                            </a>
                            <a
                              href="tel:+16723392121"
                              className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                              <Phone className="w-4 h-4" />
                              <span>+1 (672) 339-2121</span>
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 p-3 text-center">
                          <div className="flex items-center justify-center gap-1 text-base font-bold text-slate-900 dark:text-white">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            {property.rating || 4.9}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Rating</div>
                        </div>
                        <div className="rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 p-3 text-center">
                          <div className="text-base font-bold text-slate-900 dark:text-white">{property.review_count || 128}</div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Reviews</div>
                        </div>
                        <div className="rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 p-3 text-center">
                          <div className="text-base font-bold text-slate-900 dark:text-white">2+</div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Hosting</div>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {property.host.name === "Hiddy"
                          ? "Premium stays, zero fees. Fast replies, smooth check-in, and local recommendations when you need them."
                          : "Your host is here to help with a smooth check-in and a great stay."}
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="flex items-center gap-2 rounded-xl" asChild>
                          <a href="mailto:admin@hiddystays.com">
                            <Mail className="w-4 h-4" />
                            Message
                          </a>
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2 rounded-xl" asChild>
                          <a href="tel:+16723392121">
                            <Phone className="w-4 h-4" />
                            Call
                          </a>
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>

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
            cleaning_fee: 0,
            service_fee_percentage: 0,
            cancellation_policy: "Free cancellation up to 24 hours before check-in",
            check_in_time: "3:00 PM",
            check_out_time: "11:00 AM",
            house_rules: ["No smoking", "No pets", "No parties"],
            amenities: property.amenities,
            host_id: property.host_id,
          }}
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          initialDateRange={dateRange}
        />

        <div className="container mx-auto px-4 py-12">
          <PropertyReviews propertyId={property.id} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
