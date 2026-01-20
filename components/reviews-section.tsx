"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Star, ThumbsUp, ThumbsDown, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getContentReviews,
  getReviewStats,
  markReviewHelpful,
  deleteReview,
  type Review,
  type ReviewStats,
} from "@/lib/reviews-client";
import { WriteReview } from "@/components/write-review";

interface ReviewsSectionProps {
  contentId: number;
  contentType: "movie" | "tv";
  contentTitle: string;
}

export function ReviewsSection({
  contentId,
  contentType,
  contentTitle,
}: ReviewsSectionProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);

  const fetchReviews = async (lastReviewId?: string) => {
    try {
      const { reviews: newReviews, hasMore: more } = await getContentReviews(
        contentId,
        contentType,
        10,
        lastReviewId
      );

      if (!lastReviewId) {
        setReviews(newReviews);
      } else {
        setReviews((prev) => [...prev, ...newReviews]);
      }

      setHasMore(more);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const reviewStats = await getReviewStats(contentId, contentType);
      setStats(reviewStats);
    } catch (error) {
      console.error("Error fetching review stats:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchReviews(), fetchStats()]);
      setLoading(false);
    };

    loadData();
  }, [contentId, contentType]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const lastReview = reviews[reviews.length - 1];
    await fetchReviews(lastReview?.id);
    setLoadingMore(false);
  };

  const handleReviewSubmitted = () => {
    fetchReviews();
    fetchStats();
  };

  const handleMarkHelpful = async (reviewId: string, isHelpful: boolean) => {
    if (!user) {
      toast.info("Please sign in to rate reviews");
      return;
    }

    await markReviewHelpful(reviewId, isHelpful, user.uid);
    
    // Optimistically update the UI
    setReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              helpful: isHelpful ? review.helpful + 1 : review.helpful,
              notHelpful: !isHelpful ? review.notHelpful + 1 : review.notHelpful,
            }
          : review
      )
    );
  };

  const handleDeleteReview = async () => {
    if (!reviewToDelete || !user) return;

    const result = await deleteReview(reviewToDelete, user.uid);
    
    if (result.success) {
      toast.success("Review deleted");
      setReviews((prev) => prev.filter((r) => r.id !== reviewToDelete));
      fetchStats();
    } else {
      toast.error(result.error || "Failed to delete review");
    }

    setDeleteDialogOpen(false);
    setReviewToDelete(null);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  if (loading) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">User Reviews</h2>
            {stats && stats.totalReviews > 0 && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-primary text-primary" />
                  <span className="text-2xl font-semibold text-foreground">
                    {stats.averageRating.toFixed(1)}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
          <WriteReview
            contentId={contentId}
            contentType={contentType}
            contentTitle={contentTitle}
            onReviewSubmitted={handleReviewSubmitted}
          />
        </div>

        {/* Rating Distribution */}
        {stats && stats.totalReviews > 0 && (
          <div className="bg-secondary/30 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-foreground mb-4">Rating Distribution</h3>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.ratingDistribution[star as keyof typeof stats.ratingDistribution];
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{star}</span>
                    <Star className="h-4 w-4 fill-primary text-primary" />
                  </div>
                  <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">
              No reviews yet. Be the first to share your thoughts!
            </p>
            <WriteReview
              contentId={contentId}
              contentType={contentType}
              contentTitle={contentTitle}
              onReviewSubmitted={handleReviewSubmitted}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-secondary/20 rounded-lg p-6 space-y-4"
              >
                {/* Review Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Link href={`/user/${review.userId}`}>
                      <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                        {review.userPhotoURL && (
                          <AvatarImage src={review.userPhotoURL || "/placeholder.svg"} alt={review.userName} />
                        )}
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {review.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <Link href={`/user/${review.userId}`}>
                        <p className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">
                          {review.userName}
                        </p>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                  </div>
                  {user?.uid === review.userId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setReviewToDelete(review.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-5 w-5",
                        star <= review.rating
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {review.reviewText}
                </p>

                {/* Helpful Actions */}
                <div className="flex items-center gap-4 pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    Was this review helpful?
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkHelpful(review.id, true)}
                      disabled={!user}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      {review.helpful}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkHelpful(review.id, false)}
                      disabled={!user}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      {review.notHelpful}
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More Reviews"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReview} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
