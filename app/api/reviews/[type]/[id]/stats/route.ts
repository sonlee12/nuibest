export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

// GET - Fetch review statistics for content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;

  if (!isFirebaseConfigured || !db) {
    return NextResponse.json({
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  }

  const contentId = parseInt(id, 10);
  if (isNaN(contentId)) {
    return NextResponse.json({ error: "Invalid content ID" }, { status: 400 });
  }

  if (type !== "movie" && type !== "tv") {
    return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
  }

  try {
    const statsRef = doc(db, "reviewStats", `${contentId}_${type}`);
    const statsDoc = await getDoc(statsRef);

    if (statsDoc.exists()) {
      const data = statsDoc.data();
      return NextResponse.json({
        totalReviews: data.totalReviews || 0,
        averageRating: data.averageRating || 0,
        ratingDistribution: data.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
    }

    return NextResponse.json({
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  } catch (error) {
    console.error("Error fetching review stats:", error);
    return NextResponse.json({
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  }
}
