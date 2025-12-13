"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Review {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  created_at: string;
  host_response?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  guest?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface PropertyReviewsProps {
  propertyId: string;
}

export function PropertyReviews({ propertyId }: PropertyReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recent");
  const [stats, setStats] = useState({ total: 0, avg: 0 });

  useEffect(() => {
    const loadReviews = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reviews?property_id=${propertyId}&status=published`);
        if (res.ok) {
          const data = await res.json();
          const sorted = data.reviews || [];

          // Sort
          if (sortBy === "highest") {
            sorted.sort((a: Review, b: Review) => b.rating - a.rating);
          } else if (sortBy === "lowest") {
            sorted.sort((a: Review, b: Review) => a.rating - b.rating);
          } else {
            sorted.sort((a: Review, b: Review) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          }

          setReviews(sorted);
          
          // Calculate stats
          if (sorted.length > 0) {
            const avg = sorted.reduce((sum: number, r: Review) => sum + r.rating, 0) / sorted.length;
            setStats({ total: sorted.length, avg });
          }
        }
      } catch (err) {
        console.error("Error loading reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [propertyId, sortBy]);

  const formatDate = (date: string) => 
    new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short" });

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-900 mx-auto" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl">
        <Star className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="text-slate-600 dark:text-slate-400 font-medium">No reviews yet</p>
        <p className="text-sm text-slate-500 mt-1">Be the first to share your experience</p>
      </div>
    );
  }

  // Rating distribution
  const distribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => Math.round(r.rating) === stars).length
  }));

  return (
    <div className="space-y-10">
      {/* Header & Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Overall Rating */}
        <div className="md:col-span-4 text-center md:text-left space-y-2">
          <div className="text-6xl font-bold text-slate-900 dark:text-white tracking-tighter">
            {stats.avg.toFixed(1)}
          </div>
          <div className="flex justify-center md:justify-start gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${star <= Math.round(stats.avg) ? "fill-slate-900 text-slate-900 dark:fill-white dark:text-white" : "text-slate-200 dark:text-slate-700"}`}
              />
            ))}
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Based on {stats.total} reviews
          </p>
        </div>

        {/* Distribution Bars */}
        <div className="md:col-span-5 space-y-2">
          {distribution.map(({ stars, count }) => (
            <div key={stars} className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-3">{stars}</span>
              <Progress value={(count / stats.total) * 100} className="h-1.5 bg-slate-100 dark:bg-slate-800 [&>div]:bg-slate-900 dark:[&>div]:bg-white" />
            </div>
          ))}
        </div>

        {/* Sort Controls */}
        <div className="md:col-span-3 flex justify-end">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-40 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="highest">Highest Rated</SelectItem>
              <SelectItem value="lowest">Lowest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-8">
        {reviews.map((review) => {
          const guest = review.guest || review.profiles;
          const name = guest ? `${guest.first_name || ""} ${guest.last_name || ""}`.trim() : "Guest";
          
          return (
            <div key={review.id} className="border-b border-slate-100 dark:border-slate-800 pb-8 last:border-0">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12 ring-2 ring-white dark:ring-slate-900">
                  <AvatarImage src={guest?.avatar_url} />
                  <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    {name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                        {name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                    <StarRating rating={review.rating} />
                  </div>

                  {review.title && (
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {review.title}
                    </p>
                  )}
                  
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {review.comment}
                  </p>

                  {review.host_response && (
                    <div className="mt-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700 py-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">Response from Host</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                        {review.host_response}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
