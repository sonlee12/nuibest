export interface Review {
  id: string;
  contentId: number;
  contentType: "movie" | "tv";
  userId: string;
  userName: string;
  rating: number; // 1-5 stars
  reviewText: string;
  helpful: number;
  notHelpful: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// Get all reviews for a piece of content
export async function getContentReviews(
  contentId: number,
  contentType: "movie" | "tv",
  limit = 10,
  offset = 0
): Promise<{ reviews: Review[]; hasMore: boolean }> {
  try {
    const response = await fetch(
      `/api/reviews/${contentType}/${contentId}?limit=${limit}&offset=${offset}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return { reviews: [], hasMore: false };
    }

    const data = await response.json();
    return {
      reviews: data.reviews.map((review: Review & { createdAt: string; updatedAt: string }) => ({
        ...review,
        createdAt: new Date(review.createdAt),
        updatedAt: new Date(review.updatedAt),
      })),
      hasMore: data.hasMore || false,
    };
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return { reviews: [], hasMore: false };
  }
}

// Get review statistics
export async function getReviewStats(
  contentId: number,
  contentType: "movie" | "tv"
): Promise<ReviewStats | null> {
  try {
    const response = await fetch(
      `/api/reviews/${contentType}/${contentId}/stats`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching review stats:", error);
    return null;
  }
}

// Submit a new review
export async function submitReview(
  contentId: number,
  contentType: "movie" | "tv",
  rating: number,
  reviewText: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; reviewId?: string; error?: string }> {
  try {
    const response = await fetch(`/api/reviews/${contentType}/${contentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rating, reviewText, userId, userName }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to submit review" };
    }

    return { success: true, reviewId: data.reviewId };
  } catch (error) {
    console.error("Error submitting review:", error);
    return { success: false, error: "Failed to submit review" };
  }
}

// Update an existing review
export async function updateReview(
  reviewId: string,
  rating: number,
  reviewText: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/review/${reviewId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rating, reviewText, userId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to update review" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating review:", error);
    return { success: false, error: "Failed to update review" };
  }
}

// Delete a review
export async function deleteReview(reviewId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/review/${reviewId}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to delete review" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting review:", error);
    return { success: false, error: "Failed to delete review" };
  }
}

// Mark review as helpful/not helpful
export async function markReviewHelpful(
  reviewId: string,
  isHelpful: boolean,
  userId: string
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`/api/review/${reviewId}/helpful`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isHelpful, userId }),
    });

    return { success: response.ok };
  } catch (error) {
    console.error("Error marking review as helpful:", error);
    return { success: false };
  }
}

// Get user's review for content
export async function getUserReview(
  contentId: number,
  contentType: "movie" | "tv",
  userId: string
): Promise<Review | null> {
  try {
    const response = await fetch(
      `/api/reviews/${contentType}/${contentId}/user?userId=${encodeURIComponent(userId)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.review) {
      return null;
    }

    return {
      ...data.review,
      createdAt: new Date(data.review.createdAt),
      updatedAt: new Date(data.review.updatedAt),
    };
  } catch (error) {
    console.error("Error fetching user review:", error);
    return null;
  }
}
