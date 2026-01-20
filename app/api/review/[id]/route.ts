export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

// PATCH - Update an existing review
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isFirebaseConfigured || !db) {
    return NextResponse.json(
      { error: "Reviews feature is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { rating, reviewText, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User authentication required" },
        { status: 401 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    if (!reviewText || reviewText.trim().length < 10) {
      return NextResponse.json(
        { error: "Review text must be at least 10 characters" },
        { status: 400 }
      );
    }

    const reviewRef = doc(db, "reviews", id);
    const reviewDoc = await getDoc(reviewRef);

    if (!reviewDoc.exists()) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const reviewData = reviewDoc.data();

    // Verify the user owns this review
    if (reviewData.userId !== userId) {
      return NextResponse.json(
        { error: "You can only edit your own reviews" },
        { status: 403 }
      );
    }

    await updateDoc(reviewRef, {
      rating,
      reviewText: reviewText.trim(),
      updatedAt: serverTimestamp(),
    });

    // Update stats
    await updateReviewStats(reviewData.contentId, reviewData.contentType);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!isFirebaseConfigured || !db) {
    return NextResponse.json(
      { error: "Reviews feature is not configured" },
      { status: 503 }
    );
  }

  if (!userId) {
    return NextResponse.json(
      { error: "User authentication required" },
      { status: 401 }
    );
  }

  try {
    const reviewRef = doc(db, "reviews", id);
    const reviewDoc = await getDoc(reviewRef);

    if (!reviewDoc.exists()) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const reviewData = reviewDoc.data();

    // Verify the user owns this review
    if (reviewData.userId !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own reviews" },
        { status: 403 }
      );
    }

    await deleteDoc(reviewRef);

    // Update stats
    await updateReviewStats(reviewData.contentId, reviewData.contentType);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}

// Helper function to update review statistics
async function updateReviewStats(contentId: number, contentType: string) {
  if (!db) return;

  try {
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

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      totalRating += data.rating;
      distribution[data.rating as keyof typeof distribution]++;
    }

    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

    const statsRef = doc(db, "reviewStats", `${contentId}_${contentType}`);
    const statsDoc = await getDoc(statsRef);
    
    const statsData = {
      contentId,
      contentType,
      totalReviews,
      averageRating,
      ratingDistribution: distribution,
      lastUpdated: serverTimestamp(),
    };
    
    if (statsDoc.exists()) {
      await updateDoc(statsRef, statsData);
    } else {
      await setDoc(statsRef, statsData);
    }
  } catch (error) {
    console.error("Error updating review stats:", error);
  }
}
