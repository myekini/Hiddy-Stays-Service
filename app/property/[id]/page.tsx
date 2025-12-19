import { Button } from "@/components/ui/button";
import Link from "next/link";
import PropertyDetailClient from "./PropertyDetailClient";
import type { Property } from "./types";
import { buildAppUrl } from "@/lib/app-url";

interface PropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const { id } = await params;

  try {
    const response = await fetch(buildAppUrl(`/api/properties/${id}`), {
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success || !data?.property) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950">
          <div className="text-center space-y-6 max-w-md mx-auto px-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-light text-slate-900 dark:text-white">Property Not Found</h2>
              <p className="text-slate-600 dark:text-slate-400">The property you're looking for doesn't exist or has been removed.</p>
            </div>
            <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 py-3 font-medium transition-all duration-200">
              <Link href="/properties">Browse All Properties</Link>
            </Button>
          </div>
        </div>
      );
    }

    const images = Array.isArray(data.property.images) ? data.property.images : [];
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
      host: {
        id: data.property.host_id,
        name: "Hiddy",
        avatar: "/assets/hiddy.png",
        verified: true,
      },
    };

    return <PropertyDetailClient property={transformedProperty} />;
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-light text-slate-900 dark:text-white">Unable to load property</h2>
            <p className="text-slate-600 dark:text-slate-400">Please check your connection and try again.</p>
          </div>
          <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 py-3 font-medium transition-all duration-200">
            <Link href="/properties">Browse All Properties</Link>
          </Button>
        </div>
      </div>
    );
  }
}
