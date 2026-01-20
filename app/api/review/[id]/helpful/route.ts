export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

// POST - Mark review as helpful or not helpful
export async function POST(
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
    const { isHelpful, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User authentication required" },
        { status: 401 }
      );
    }

    if (typeof isHelpful !== "boolean") {
      return NextResponse.json(
        { error: "isHelpful must be a boolean" },
        { status: 400 }
      );
    }

    const reviewRef = doc(db, "reviews", id);
    const reviewDoc = await getDoc(reviewRef);

    if (!reviewDoc.exists()) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Update the helpful count
    await updateDoc(reviewRef, {
      [isHelpful ? "helpful" : "notHelpful"]: increment(1),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking review as helpful:", error);
    return NextResponse.json(
      { error: "Failed to mark review as helpful" },
      { status: 500 }
    );
  }
}
