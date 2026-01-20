import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { Review } from "@/lib/reviews-client";
import type { WatchHistoryItem } from "@/contexts/auth-context";

const TMDB_API_KEY = "27a762a871783dd36ae2b8b74c6bf8de";
const BASE_URL = "https://api.themoviedb.org/3";

export interface UserPublicProfile {
  userId: string;
  displayName: string;
  photoURL: string | null;
  memberSince: Date;
  reviewCount: number;
  averageRating: number;
  reviews: (Review & { contentTitle: string; contentPoster?: string })[];
  watchHistory: WatchHistoryItem[];
  myList: { id: number; type: "movie" | "tv"; title: string; posterPath: string | null }[];
}

// Fetch movie or TV show details from TMDB
async function fetchContentDetails(contentId: number, contentType: "movie" | "tv") {
  try {
    const endpoint = contentType === "movie" ? `/movie/${contentId}` : `/tv/${contentId}`;
    const url = `${BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url, { next: { revalidate: 3600 } });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return {
      title: data.title || data.name,
      posterPath: data.poster_path,
    };
  } catch (error) {
    console.error(`Error fetching ${contentType} ${contentId}:`, error);
    return null;
  }
}

// Helper to convert Firestore Timestamp to Date
function convertTimestamp(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp.toDate) {
    return timestamp.toDate();
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date(timestamp);
}

export async function getUserPublicProfile(
  userId: string
): Promise<UserPublicProfile | null> {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    let watchHistory: WatchHistoryItem[] = [];
    let myList: { id: number; type: "movie" | "tv"; title: string; posterPath: string | null }[] = [];
    let displayName = "";
    let photoURL: string | null = null;
    let memberSince = new Date();
    
    // Always try to fetch user data (watch history, my list, display name)
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        displayName = userData.displayName || "";
        photoURL = userData.photoURL || null;
        memberSince = convertTimestamp(userData.createdAt);

        // Get watch history and enrich with TMDB data if missing
        const rawWatchHistory = userData.watchHistory || [];
        const watchHistoryPromises = rawWatchHistory.map(async (item: any) => {
          // If title or posterPath is missing, fetch from TMDB
          if (!item.title || item.posterPath === undefined) {
            const details = await fetchContentDetails(item.id, item.type);
            return {
              ...item,
              title: item.title || details?.title || `${item.type === "movie" ? "Movie" : "TV Show"} #${item.id}`,
              posterPath: item.posterPath ?? details?.posterPath ?? null,
              watchedAt: convertTimestamp(item.watchedAt),
            };
          }
          return {
            ...item,
            watchedAt: convertTimestamp(item.watchedAt),
          };
        });
        watchHistory = await Promise.all(watchHistoryPromises);

        // Get my list and enrich with TMDB data if missing
        const rawMyList = userData.myList || [];
        const myListPromises = rawMyList.map(async (item: any) => {
          if (!item.title || item.posterPath === undefined) {
            const details = await fetchContentDetails(item.id, item.type);
            return {
              ...item,
              title: item.title || details?.title || `${item.type === "movie" ? "Movie" : "TV Show"} #${item.id}`,
              posterPath: item.posterPath ?? details?.posterPath ?? null,
            };
          }
          return item;
        });
        myList = await Promise.all(myListPromises);
      }
    } catch (userDataError) {
      // If we can't access user data, continue with reviews only
      console.log("Could not fetch user data, showing reviews only");
    }

    // Fetch user's reviews without orderBy to avoid index requirement
    const reviewsRef = collection(db, "reviews");
    const q = query(
      reviewsRef,
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty && watchHistory.length === 0 && myList.length === 0) {
      return null;
    }

    const reviews: (Review & { contentTitle: string; contentPoster?: string })[] = [];
    let totalRating = 0;
    let oldestReviewDate = new Date();

    if (!snapshot.empty) {
      // Get review data
      const reviewsData = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          data,
          createdAt: convertTimestamp(data.createdAt),
        };
      });

      // Fetch all content details in parallel
      const contentDetailsPromises = reviewsData.map((review) =>
        fetchContentDetails(review.data.contentId, review.data.contentType)
      );
      const contentDetails = await Promise.all(contentDetailsPromises);

      // Build reviews array with TMDB data
      for (let i = 0; i < reviewsData.length; i++) {
        const reviewDoc = reviewsData[i];
        const data = reviewDoc.data;
        const content = contentDetails[i];

        // Get display name from review if not already set from user doc
        if (!displayName) {
          displayName = data.userName || "";
        }

        // Track oldest review for member since date as fallback
        const createdAt = reviewDoc.createdAt;
        if (createdAt < oldestReviewDate) {
          oldestReviewDate = createdAt;
        }

        totalRating += data.rating;

        reviews.push({
          id: reviewDoc.id,
          contentId: data.contentId,
          contentType: data.contentType,
          userId: data.userId,
          userName: data.userName,
          userPhotoURL: photoURL,
          rating: data.rating,
          reviewText: data.reviewText,
          helpful: data.helpful || 0,
          notHelpful: data.notHelpful || 0,
          createdAt: reviewDoc.createdAt,
          updatedAt: convertTimestamp(data.updatedAt),
          contentTitle: content?.title || `${data.contentType === "movie" ? "Movie" : "TV Show"} #${data.contentId}`,
          contentPoster: content?.posterPath || undefined,
        });
      }

      // Sort reviews by createdAt descending (newest first) and limit to 50
      reviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Use oldest review date for memberSince if we didn't get it from user doc
    if (memberSince.getTime() === new Date().getTime() && reviews.length > 0) {
      memberSince = oldestReviewDate;
    }

    const limitedReviews = reviews.slice(0, 50);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    return {
      userId,
      displayName: displayName || "Anonymous",
      photoURL,
      memberSince,
      reviewCount: reviews.length,
      averageRating,
      reviews: limitedReviews,
      watchHistory,
      myList,
    };
  } catch (error) {
    console.error("Error fetching user public profile:", error);
    return null;
  }
}
