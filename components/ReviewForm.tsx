"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Upload, X, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface ReviewFormProps {
  bookingId: string;
  propertyId: string;
  propertyTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface RatingCategory {
  key: string;
  label: string;
  value: number;
}

export function ReviewForm({
  bookingId,
  propertyId,
  propertyTitle,
  isOpen,
  onClose,
  onSuccess,
}: ReviewFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const [categories, setCategories] = useState<RatingCategory[]>([
    { key: "cleanliness_rating", label: "Cleanliness", value: 0 },
    { key: "accuracy_rating", label: "Accuracy", value: 0 },
    { key: "communication_rating", label: "Communication", value: 0 },
    { key: "location_rating", label: "Location", value: 0 },
    { key: "value_rating", label: "Value", value: 0 },
  ]);

  const handleCategoryRating = (index: number, value: number) => {
    const newCategories = [...categories];
    newCategories[index]!.value = value;
    setCategories(newCategories);
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      toast({
        title: "Rating required",
        description: "Select a star rating to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!comment.trim()) {
      toast({
        title: "Review required",
        description: "Write your review to continue.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const reviewData: any = {
        booking_id: bookingId,
        property_id: propertyId,
        rating: overallRating,
        title: title.trim(),
        comment: comment.trim(),
        images,
      };

      // Add category ratings
      categories.forEach((cat) => {
        if (cat.value > 0) {
          reviewData[cat.key] = cat.value;
        }
      });

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit review");
      }

      toast({
        title: "Review submitted ✓",
        description: "Thank you for your feedback.",
      });

      // Reset form
      setOverallRating(0);
      setTitle("");
      setComment("");
      setImages([]);
      setCategories([
        { key: "cleanliness_rating", label: "Cleanliness", value: 0 },
        { key: "accuracy_rating", label: "Accuracy", value: 0 },
        { key: "communication_rating", label: "Communication", value: 0 },
        { key: "location_rating", label: "Location", value: 0 },
        { key: "value_rating", label: "Value", value: 0 },
      ]);

      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({
        title: "Unable to submit review",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({
    value,
    onChange,
    onHover,
    size = "md",
  }: {
    value: number;
    onChange: (rating: number) => void;
    onHover?: (rating: number) => void;
    size?: "sm" | "md" | "lg";
  }) => {
    const sizeClasses = {
      sm: "w-5 h-5",
      md: "w-8 h-8",
      lg: "w-10 h-10",
    };

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => onHover && onHover(star)}
            onMouseLeave={() => onHover && onHover(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`${sizeClasses[size]} transition-colors ${
                star <= (onHover ? hoverRating || value : value)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-none text-slate-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light text-slate-900 tracking-tight">
            Write a Review
          </DialogTitle>
          <DialogDescription className="text-slate-600 font-light">
            Share your experience at <span className="font-medium">{propertyTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Overall Rating */}
          <div className="space-y-3">
            <Label className="text-base font-medium text-slate-900">
              Overall Rating *
            </Label>
            <div className="flex items-center gap-4">
              <StarRating
                value={overallRating}
                onChange={setOverallRating}
                onHover={setHoverRating}
                size="lg"
              />
              {overallRating > 0 && (
                <span className="text-2xl font-semibold text-slate-900">
                  {overallRating}.0
                </span>
              )}
            </div>
            {hoverRating > 0 && (
              <p className="text-sm text-slate-600">
                {hoverRating === 5 && "Excellent!"}
                {hoverRating === 4 && "Very Good"}
                {hoverRating === 3 && "Good"}
                {hoverRating === 2 && "Fair"}
                {hoverRating === 1 && "Poor"}
              </p>
            )}
          </div>

          {/* Category Ratings */}
          <div className="space-y-4">
            <Label className="text-base font-medium text-slate-900">
              Rate Your Experience
            </Label>
            <div className="grid grid-cols-1 gap-3">
              {categories.map((category, index) => (
                <div
                  key={category.key}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {category.label}
                  </span>
                  <StarRating
                    value={category.value}
                    onChange={(rating) => handleCategoryRating(index, rating)}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Review Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-medium text-slate-900">
              Review Title (Optional)
            </Label>
            <Input
              id="title"
              placeholder="Sum up your experience in a few words"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="font-light"
            />
            <p className="text-xs text-slate-500">
              {title.length}/200 characters
            </p>
          </div>

          {/* Review Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-base font-medium text-slate-900">
              Your Review *
            </Label>
            <Textarea
              id="comment"
              placeholder="Share details of your experience. What did you enjoy? What could be improved?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={6}
              className="font-light resize-none"
              maxLength={2000}
            />
            <p className="text-xs text-slate-500">
              {comment.length}/2000 characters
            </p>
          </div>

          {/* Photo Upload (Optional) */}
          <div className="space-y-2">
            <Label className="text-base font-medium text-slate-900">
              Add Photos (Optional)
            </Label>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Photo upload feature coming soon. You'll be able to add images to enhance your review.
              </AlertDescription>
            </Alert>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-slate-900 hover:bg-slate-800"
              disabled={loading || overallRating === 0 || !comment.trim()}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
