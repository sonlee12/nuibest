export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

// GET - Fetch user's review for specific content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!isFirebaseConfigured || !db) {
    return NextResponse.json({ review: null });
  }

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
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
    const q = query(
      reviewsRef,
      where("contentId", "==", contentId),
      where("contentType", "==", type),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({ review: null });
    }

    const reviewDoc = snapshot.docs[0];
    const data = reviewDoc.data();

    const review = {
      id: reviewDoc.id,
      contentId: data.contentId,
      contentType: data.contentType,
      userId: data.userId,
      userName: data.userName,
      rating: data.rating,
      reviewText: data.reviewText,
      helpful: data.helpful || 0,
      notHelpful: data.notHelpful || 0,
      createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error fetching user review:", error);
    return NextResponse.json({ review: null });
  }
}
