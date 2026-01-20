export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

// GET - Fetch reviews for content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const { searchParams } = new URL(request.url);
  const limitParam = parseInt(searchParams.get("limit") || "10");
  const offsetParam = parseInt(searchParams.get("offset") || "0");

  if (!isFirebaseConfigured || !db) {
    return NextResponse.json({ reviews: [], hasMore: false });
  }

  const contentId = parseInt(id, 10);
  if (isNaN(contentId)) {
    return NextResponse.json({ error: "Invalid content ID" }, { status: 400 });
  }

  if (type !== "movie" && type !== "tv") {
    return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
  }

  try {
    const reviewsRef = collection(db, "reviews");
    let q = query(
      reviewsRef,
      where("contentId", "==", contentId),
      where("contentType", "==", type),
      orderBy("createdAt", "desc"),
      firestoreLimit(limitParam + 1) // Fetch one extra to check if there are more
    );

    // Handle pagination with offset
    if (offsetParam > 0) {
      // Get the last document from the previous batch
      const previousQuery = query(
        reviewsRef,
        where("contentId", "==", contentId),
        where("contentType", "==", type),
        orderBy("createdAt", "desc"),
        firestoreLimit(offsetParam)
      );
      const previousSnapshot = await getDocs(previousQuery);
      const lastDoc = previousSnapshot.docs[previousSnapshot.docs.length - 1];
      
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
    }

    const snapshot = await getDocs(q);
    const hasMore = snapshot.docs.length > limitParam;
    const reviewDocs = hasMore ? snapshot.docs.slice(0, limitParam) : snapshot.docs;

    // Fetch user photoURLs for all reviews
    const reviews = await Promise.all(
      reviewDocs.map(async (reviewDoc) => {
        const data = reviewDoc.data();
        
        // Fetch user profile to get photoURL
        let userPhotoURL: string | null = null;
        try {
          const userRef = doc(db, "users", data.userId);
          console.log("[v0] Fetching user photo for userId:", data.userId);
          const userDoc = await getDoc(userRef);
          console.log("[v0] User doc exists:", userDoc.exists());
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("[v0] User data has photoURL:", !!userData.photoURL);
            console.log("[v0] PhotoURL length:", userData.photoURL?.length || 0);
            userPhotoURL = userData.photoURL || null;
          }
        } catch (error) {
          console.error("[v0] Error fetching user photo:", error);
        }
        
        return {
          id: reviewDoc.id,
          contentId: data.contentId,
          contentType: data.contentType,
          userId: data.userId,
          userName: data.userName,
          userPhotoURL,
          rating: data.rating,
          reviewText: data.reviewText,
          helpful: data.helpful || 0,
          notHelpful: data.notHelpful || 0,
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
        };
      })
    );

    return NextResponse.json({ reviews, hasMore });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json({ reviews: [], hasMore: false });
  }
}

// POST - Create a new review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;

  console.log("[v0] POST review - params:", { type, id });
  console.log("[v0] Firebase configured:", isFirebaseConfigured, "DB exists:", !!db);

  if (!isFirebaseConfigured || !db) {
    console.error("[v0] Firebase not configured");
    return NextResponse.json(
      { error: "Reviews feature is not configured" },
      { status: 503 }
    );
  }

  const contentId = parseInt(id, 10);
  if (isNaN(contentId)) {
    return NextResponse.json({ error: "Invalid content ID" }, { status: 400 });
  }

  if (type !== "movie" && type !== "tv") {
    return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
  }

  try {
    const body = await request.json();
    console.log("[v0] Request body:", body);
    const { rating, reviewText, userId, userName } = body;

    if (!userId || !userName) {
      console.error("[v0] Missing userId or userName");
      return NextResponse.json(
        { error: "User authentication required" },
        { status: 401 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      console.error("[v0] Invalid rating:", rating);
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    if (!reviewText || reviewText.trim().length < 10) {
      console.error("[v0] Review text too short");
      return NextResponse.json(
        { error: "Review text must be at least 10 characters" },
        { status: 400 }
      );
    }

    console.log("[v0] Checking for existing review...");
    // Check if user already has a review for this content
    const reviewsRef = collection(db, "reviews");
    const existingQuery = query(
      reviewsRef,
      where("contentId", "==", contentId),
      where("contentType", "==", type),
      where("userId", "==", userId)
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      console.log("[v0] User already has a review");
      return NextResponse.json(
        { error: "You have already reviewed this content. Use PATCH to update your review." },
        { status: 409 }
      );
    }

    console.log("[v0] Creating new review...");
    // Create new review
    const reviewRef = doc(collection(db, "reviews"));
    const reviewData = {
      contentId,
      contentType: type,
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
    console.log("[v0] Review created with ID:", reviewRef.id);

    // Update stats
    console.log("[v0] Updating stats...");
    await updateReviewStats(contentId, type);

    console.log("[v0] Review submission complete");
    return NextResponse.json({ success: true, reviewId: reviewRef.id });
  } catch (error) {
    console.error("[v0] Error creating review:", error);
    console.error("[v0] Error details:", error instanceof Error ? error.message : String(error));
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json(
      { error: `Failed to create review: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

// Helper function to update review statistics
async function updateReviewStats(contentId: number, contentType: string) {
  if (!db) {
    console.log("[v0] No db available for stats update");
    return;
  }

  try {
    console.log("[v0] Fetching reviews for stats...");
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

    for (const doc of snapshot.docs) {
      const data = doc.data();
      totalRating += data.rating;
      distribution[data.rating as keyof typeof distribution]++;
    }

    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;
    console.log("[v0] Stats calculated:", { totalReviews, averageRating });

    const statsRef = doc(db, "reviewStats", `${contentId}_${contentType}`);
    await setDoc(statsRef, {
      contentId,
      contentType,
      totalReviews,
      averageRating,
      ratingDistribution: distribution,
      lastUpdated: serverTimestamp(),
    });
    console.log("[v0] Stats updated successfully");
  } catch (error) {
    console.error("[v0] Error updating review stats:", error);
  }
}
