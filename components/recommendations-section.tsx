"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { MovieCarousel } from "@/components/movie-carousel";
import { Sparkles } from "lucide-react";
import type { Movie } from "@/lib/tmdb";

interface RecommendationsResponse {
  movies: Movie[];
  tvShows: Movie[];
  basedOn: string[];
}

export function RecommendationsSection() {
  const { user, userProfile } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!userProfile?.ratings || userProfile.ratings.length === 0) {
      return;
    }

    // Get liked items only
    const likedItems = userProfile.ratings.filter((r) => r.rating === "like");
    if (likedItems.length === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get recommendations based on similar content
      const recommendations: Movie[] = [];
      const seenIds = new Set<number>();
      const basedOnTitles: string[] = [];

      // Take up to 5 most recently liked items
      const recentLikes = likedItems.slice(0, 5);

      for (const item of recentLikes) {
        try {
          const endpoint = item.type === "movie" 
            ? `/api/recommendations/movie/${item.id}`
            : `/api/recommendations/tv/${item.id}`;
          
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            basedOnTitles.push(item.title);
            
            for (const movie of data.results || []) {
              if (!seenIds.has(movie.id)) {
                seenIds.add(movie.id);
                recommendations.push(movie);
              }
            }
          }
        } catch (err) {
          // Continue with other items if one fails
          console.error(`Failed to get recommendations for ${item.title}:`, err);
        }
      }

      // Shuffle and limit recommendations
      const shuffled = recommendations.sort(() => Math.random() - 0.5);
      
      setRecommendations({
        movies: shuffled.filter((m) => m.title || m.media_type === "movie").slice(0, 20),
        tvShows: shuffled.filter((m) => m.name || m.media_type === "tv").slice(0, 20),
        basedOn: basedOnTitles.slice(0, 3),
      });
    } catch (err) {
      setError("Failed to load recommendations");
      console.error("Error fetching recommendations:", err);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.ratings]);

  useEffect(() => {
    if (user && userProfile?.ratings && userProfile.ratings.length > 0) {
      fetchRecommendations();
    }
  }, [user, userProfile?.ratings, fetchRecommendations]);

  // Don't show anything if user is not logged in or has no ratings
  if (!user || !userProfile?.ratings || userProfile.ratings.length === 0) {
    return null;
  }

  const likedCount = userProfile.ratings.filter((r) => r.rating === "like").length;
  if (likedCount === 0) {
    return null;
  }

  if (loading) {
    return (
      <section className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <h2 className="text-xl font-semibold text-foreground">Loading recommendations...</h2>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[140px] md:w-[180px] lg:w-[200px] aspect-[2/3] rounded-md bg-secondary animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error || !recommendations) {
    return null;
  }

  const allRecommendations = [...recommendations.movies, ...recommendations.tvShows];
  if (allRecommendations.length === 0) {
    return null;
  }

  return (
    <MovieCarousel
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>Recommended For You</span>
          {recommendations.basedOn.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              Based on {recommendations.basedOn.join(", ")}
            </span>
          )}
        </div>
      }
      movies={allRecommendations}
    />
  );
}
