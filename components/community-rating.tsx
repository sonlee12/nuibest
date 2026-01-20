"use client";

import { useEffect, useState } from "react";
import { Star, Users } from "lucide-react";
import { getReviewStats, type ReviewStats } from "@/lib/reviews-client";
import { cn } from "@/lib/utils";

interface CommunityRatingProps {
  contentId: number;
  contentType: "movie" | "tv";
  className?: string;
  variant?: "default" | "compact" | "detailed";
}

export function CommunityRating({
  contentId,
  contentType,
  className,
  variant = "default",
}: CommunityRatingProps) {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const averageRating = stats ? stats.averageRating : 0; // Declare averageRating variable

  useEffect(() => {
    const fetchRating = async () => {
      setLoading(true);
      const data = await getReviewStats(contentId, contentType);
      setStats(data);
      setLoading(false);
    };

    fetchRating();
  }, [contentId, contentType]);

  if (loading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-6 w-32 bg-secondary rounded" />
      </div>
    );
  }

  if (!stats || stats.totalReviews === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground text-sm", className)}>
        <Users className="h-4 w-4" />
        <span>No community ratings yet</span>
      </div>
    );
  }

  const starPercentage = (averageRating / 5) * 100;

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1">
          <Star className={cn("h-4 w-4", averageRating >= 3 ? "text-primary fill-primary" : "text-muted-foreground")} />
          <span className={cn("text-sm font-medium", averageRating >= 3 ? "text-primary" : "text-foreground")}>
            {averageRating.toFixed(1)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">({stats.totalReviews})</span>
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-foreground">Community Rating</span>
          <span className="text-sm text-muted-foreground">({stats.totalReviews} reviews)</span>
        </div>

        {/* Star Rating Display */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "h-5 w-5",
                  star <= Math.round(averageRating)
                    ? "text-primary fill-primary"
                    : "text-muted-foreground"
                )}
              />
            ))}
          </div>
          <span className="text-lg font-semibold">{averageRating.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">out of 5</span>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center gap-1.5">
        <Star className="h-4 w-4 text-primary fill-primary" />
        <span className="font-semibold text-foreground">
          {averageRating.toFixed(1)}
        </span>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-1 text-muted-foreground text-sm">
        <Users className="h-4 w-4" />
        <span>{stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}</span>
      </div>
    </div>
  );
}
