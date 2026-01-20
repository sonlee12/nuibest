"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Star, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { submitReview, updateReview, getUserReview, type Review } from "@/lib/reviews-client";

interface WriteReviewProps {
  contentId: number;
  contentType: "movie" | "tv";
  contentTitle: string;
  onReviewSubmitted?: () => void;
}

export function WriteReview({
  contentId,
  contentType,
  contentTitle,
  onReviewSubmitted,
}: WriteReviewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [fetchingReview, setFetchingReview] = useState(false);

  // Fetch user's existing review when dialog opens
  useEffect(() => {
    if (open && user) {
      setFetchingReview(true);
      getUserReview(contentId, contentType, user.uid).then((review) => {
        setExistingReview(review);
        if (review) {
          setRating(review.rating);
          setReviewText(review.reviewText);
        }
        setFetchingReview(false);
      });
    }
  }, [open, user, contentId, contentType]);

  const handleSubmit = async () => {
    if (!user) {
      toast.info("Please sign in to write a review");
      router.push("/login");
      return;
    }

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (reviewText.trim().length < 10) {
      toast.error("Review must be at least 10 characters long");
      return;
    }

    setLoading(true);
    try {
      let result;
      
      if (existingReview) {
        // Update existing review
        result = await updateReview(existingReview.id, rating, reviewText.trim(), user.uid);
      } else {
        // Submit new review
        result = await submitReview(
          contentId,
          contentType,
          rating,
          reviewText.trim(),
          user.uid,
          user.displayName || user.email || "Anonymous"
        );
      }

      if (result.success) {
        toast.success(existingReview ? "Review updated!" : "Review submitted!");
        setOpen(false);
        setRating(0);
        setReviewText("");
        setExistingReview(null);
        onReviewSubmitted?.();
      } else {
        toast.error(result.error || "Failed to submit review");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const buttonText = existingReview ? "Edit Review" : "Write a Review";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline">
          <Pencil className="h-5 w-5 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {existingReview ? "Edit Your Review" : "Write a Review"}
          </DialogTitle>
          <DialogDescription>
            Share your thoughts about {contentTitle}
          </DialogDescription>
        </DialogHeader>

        {fetchingReview ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Star Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  >
                    <Star
                      className={cn(
                        "h-10 w-10 transition-colors",
                        (hoverRating || rating) >= star
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    {rating} out of 5 stars
                  </span>
                )}
              </div>
            </div>

            {/* Review Text */}
            <div className="space-y-2">
              <label htmlFor="review-text" className="text-sm font-medium">
                Your Review
              </label>
              <Textarea
                id="review-text"
                placeholder="What did you think? Share your experience..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={6}
                maxLength={2000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {reviewText.length}/2000 characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="bg-[oklch(0.72_0.19_210)] hover:bg-[oklch(0.68_0.19_210)] text-white shadow-lg shadow-[oklch(0.72_0.19_210)]/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {existingReview ? "Updating..." : "Submitting..."}
                  </>
                ) : (
                  existingReview ? "Update Review" : "Submit Review"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
