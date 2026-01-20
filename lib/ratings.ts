export interface ContentRating {
  contentId: number;
  contentType: "movie" | "tv";
  likes: number;
  dislikes: number;
  totalRatings: number;
}

// Get public rating stats for a piece of content via API
export async function getContentRating(
  contentId: number,
  contentType: "movie" | "tv"
): Promise<ContentRating | null> {
  try {
    const response = await fetch(`/api/ratings/${contentType}/${contentId}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      contentId,
      contentType,
      likes: data.likes || 0,
      dislikes: data.dislikes || 0,
      totalRatings: data.totalRatings || 0,
    };
  } catch {
    // Silently fail - ratings are optional and shouldn't break the app
    return null;
  }
}

// Add or update a public rating via API
export async function addPublicRating(
  userId: string,
  contentId: number,
  contentType: "movie" | "tv",
  rating: "like" | "dislike",
  previousRating?: "like" | "dislike" | null
): Promise<void> {
  try {
    await fetch(`/api/ratings/${contentType}/${contentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "add",
        rating,
        previousRating: previousRating || null,
        userId,
      }),
    });
  } catch (error) {
    console.error("Error adding public rating:", error);
    // Don't throw - we don't want to break the user's rating experience
  }
}

// Remove a public rating via API
export async function removePublicRating(
  contentId: number,
  contentType: "movie" | "tv",
  previousRating: "like" | "dislike"
): Promise<void> {
  try {
    await fetch(`/api/ratings/${contentType}/${contentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "remove",
        previousRating,
      }),
    });
  } catch (error) {
    console.error("Error removing public rating:", error);
    // Don't throw - we don't want to break the user's rating experience
  }
}

// Get multiple content ratings at once
export async function getMultipleContentRatings(
  items: { id: number; type: "movie" | "tv" }[]
): Promise<Map<string, ContentRating>> {
  const ratings = new Map<string, ContentRating>();

  if (items.length === 0) return ratings;

  // Fetch ratings in parallel
  const promises = items.map(async (item) => {
    const rating = await getContentRating(item.id, item.type);
    if (rating) {
      ratings.set(`${item.id}_${item.type}`, rating);
    }
  });

  await Promise.all(promises);
  return ratings;
}
