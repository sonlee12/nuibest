"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as queryLimit,
  startAfter,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export interface Review {
  id: string;
  contentId: number;
  contentType: "movie" | "tv";
  userId: string;
  userName: string;
  userPhotoURL?: string | null;
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

// Helper to convert Firestore timestamp to Date
function convertTimestamp(timestamp: any): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date();
}

// Get all reviews for a piece of content
export async function getContentReviews(
  contentId: number,
  contentType: "movie" | "tv",
  limitCount = 10,
  lastReviewId?: string
): Promise<{ reviews: Review[]; hasMore: boolean }> {
  if (!isFirebaseConfigured || !db) {
    return { reviews: [], hasMore: false };
  }

  try {
    const reviewsRef = collection(db, "reviews");
    // Query without orderBy to avoid needing a composite index
    const q = query(
      reviewsRef,
      where("contentId", "==", contentId),
      where("contentType", "==", contentType)
    );

    const snapshot = await getDocs(q);
    const allReviews: Review[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      allReviews.push({
        id: doc.id,
        contentId: data.contentId,
        contentType: data.contentType,
        userId: data.userId,
        userName: data.userName,
        rating: data.rating,
        reviewText: data.reviewText,
        helpful: data.helpful || 0,
        notHelpful: data.notHelpful || 0,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      });
    });

    // Sort by createdAt descending (newest first) client-side
    allReviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Handle pagination client-side
    let startIndex = 0;
    if (lastReviewId) {
      startIndex = allReviews.findIndex((r) => r.id === lastReviewId) + 1;
    }

    const reviews = allReviews.slice(startIndex, startIndex + limitCount);
    const hasMore = startIndex + limitCount < allReviews.length;

    return {
      reviews,
      hasMore,
    };
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return { reviews: [], hasMore: false };
  }
}

// Get review statistics - calculated from reviews directly
export async function getReviewStats(
  contentId: number,
  contentType: "movie" | "tv"
): Promise<ReviewStats | null> {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    // Fetch all reviews for this content
    const reviewsRef = collection(db, "reviews");
    const q = query(
      reviewsRef,
      where("contentId", "==", contentId),
      where("contentType", "==", contentType)
    );
    const snapshot = await getDocs(q);

    const totalReviews = snapshot.docs.length;
    let totalRating = 0;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    // Calculate stats from reviews
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      totalRating += data.rating;
      distribution[data.rating as keyof typeof distribution]++;
    });

    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

    return {
      totalReviews,
      averageRating,
      ratingDistribution: distribution,
    };
  } catch (error) {
    console.error("Error fetching review stats:", error);
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
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
  if (!isFirebaseConfigured || !db) {
    return { success: false, error: "Reviews feature is not available" };
  }

  try {
    // Check if user already has a review
    const reviewsRef = collection(db, "reviews");
    const existingQuery = query(
      reviewsRef,
      where("contentId", "==", contentId),
      where("contentType", "==", contentType),
      where("userId", "==", userId)
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      return {
        success: false,
        error: "You have already reviewed this content. Please edit your existing review.",
      };
    }

    // Create new review
    const reviewRef = doc(collection(db, "reviews"));
    const reviewData = {
      contentId,
      contentType,
      userId,
      userName,
      rating,
      reviewText: reviewText.trim(),
      helpful: 0,
      notHelpful: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(reviewRef, reviewData);

    return { success: true, reviewId: reviewRef.id };
  } catch (error) {
    console.error("Error submitting review:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit review",
    };
  }
}

// Update an existing review
export async function updateReview(
  reviewId: string,
  rating: number,
  reviewText: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured || !db) {
    return { success: false, error: "Reviews feature is not available" };
  }

  try {
    const reviewRef = doc(db, "reviews", reviewId);
    const reviewDoc = await getDoc(reviewRef);

    if (!reviewDoc.exists()) {
      return { success: false, error: "Review not found" };
    }

    const reviewData = reviewDoc.data();
    if (reviewData.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await updateDoc(reviewRef, {
      rating,
      reviewText: reviewText.trim(),
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating review:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update review",
    };
  }
}

// Delete a review
export async function deleteReview(
  reviewId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured || !db) {
    return { success: false, error: "Reviews feature is not available" };
  }

  try {
    const reviewRef = doc(db, "reviews", reviewId);
    const reviewDoc = await getDoc(reviewRef);

    if (!reviewDoc.exists()) {
      return { success: false, error: "Review not found" };
    }

    const reviewData = reviewDoc.data();
    if (reviewData.userId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await deleteDoc(reviewRef);

    return { success: true };
  } catch (error) {
    console.error("Error deleting review:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete review",
    };
  }
}

// Mark review as helpful/not helpful
export async function markReviewHelpful(
  reviewId: string,
  isHelpful: boolean,
  userId: string
): Promise<{ success: boolean }> {
  if (!isFirebaseConfigured || !db) {
    return { success: false };
  }

  try {
    const reviewRef = doc(db, "reviews", reviewId);
    const reviewDoc = await getDoc(reviewRef);

    if (!reviewDoc.exists()) {
      return { success: false };
    }

    const data = reviewDoc.data();
    const currentHelpful = data.helpful || 0;
    const currentNotHelpful = data.notHelpful || 0;

    await updateDoc(reviewRef, {
      helpful: isHelpful ? currentHelpful + 1 : currentHelpful,
      notHelpful: !isHelpful ? currentNotHelpful + 1 : currentNotHelpful,
    });

    return { success: true };
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
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const reviewsRef = collection(db, "reviews");
    const q = query(
      reviewsRef,
      where("contentId", "==", contentId),
      where("contentType", "==", contentType),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      contentId: data.contentId,
      contentType: data.contentType,
      userId: data.userId,
      userName: data.userName,
      rating: data.rating,
      reviewText: data.reviewText,
      helpful: data.helpful || 0,
      notHelpful: data.notHelpful || 0,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    };
  } catch (error) {
    console.error("Error fetching user review:", error);
    return null;
  }
}
