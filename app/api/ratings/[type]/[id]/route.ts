export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

// GET - Fetch public rating for content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  
  if (!isFirebaseConfigured || !db) {
    return NextResponse.json({ likes: 0, dislikes: 0, totalRatings: 0 });
  }

  const contentId = parseInt(id, 10);
  if (isNaN(contentId)) {
    return NextResponse.json({ error: "Invalid content ID" }, { status: 400 });
  }

  if (type !== "movie" && type !== "tv") {
    return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
  }

  try {
    const docRef = doc(db, "publicRatings", `${contentId}_${type}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return NextResponse.json({
        likes: data.likes || 0,
        dislikes: data.dislikes || 0,
        totalRatings: data.totalRatings || 0,
      });
    }

    return NextResponse.json({ likes: 0, dislikes: 0, totalRatings: 0 });
  } catch (error: unknown) {
    // Silently return empty ratings on any error (including permission errors)
    // This prevents spamming the console and allows the app to work even without ratings
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes('permission')) {
      console.error("Error fetching rating:", errorMessage);
    }
    return NextResponse.json({ likes: 0, dislikes: 0, totalRatings: 0 });
  }
}

// POST - Update public rating (called when user rates content)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  
  if (!isFirebaseConfigured || !db) {
    return NextResponse.json({ success: true }); // Silently succeed if Firebase not configured
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
    const { action, rating, previousRating } = body;

    const docRef = doc(db, "publicRatings", `${contentId}_${type}`);
    const docSnap = await getDoc(docRef);

    if (action === "add") {
      if (docSnap.exists()) {
        const updates: Record<string, ReturnType<typeof increment> | ReturnType<typeof serverTimestamp>> = {
          lastUpdated: serverTimestamp(),
        };

        // If changing from a previous rating
        if (previousRating === "like") {
          updates.likes = increment(-1);
        } else if (previousRating === "dislike") {
          updates.dislikes = increment(-1);
        } else {
          // New rating, increment total
          updates.totalRatings = increment(1);
        }

        // Add new rating
        if (rating === "like") {
          updates.likes = increment(previousRating === "like" ? 0 : 1);
        } else {
          updates.dislikes = increment(previousRating === "dislike" ? 0 : 1);
        }

        await updateDoc(docRef, updates);
      } else {
        // Create new document
        await setDoc(docRef, {
          contentId,
          contentType: type,
          likes: rating === "like" ? 1 : 0,
          dislikes: rating === "dislike" ? 1 : 0,
          totalRatings: 1,
          lastUpdated: serverTimestamp(),
        });
      }
    } else if (action === "remove") {
      if (docSnap.exists()) {
        const updates: Record<string, ReturnType<typeof increment> | ReturnType<typeof serverTimestamp>> = {
          totalRatings: increment(-1),
          lastUpdated: serverTimestamp(),
        };

        if (previousRating === "like") {
          updates.likes = increment(-1);
        } else if (previousRating === "dislike") {
          updates.dislikes = increment(-1);
        }

        await updateDoc(docRef, updates);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating rating:", error);
    // Return success anyway to not break the user experience
    return NextResponse.json({ success: true });
  }
}
