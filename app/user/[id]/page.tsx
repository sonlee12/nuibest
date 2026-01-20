"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Calendar, Film, Tv, Star, Loader2, ArrowLeft, Clock, Heart, MessageSquare, UserPlus } from "lucide-react";
import { getImageUrl } from "@/lib/tmdb";
import { getUserPublicProfile } from "@/lib/user-profile";
import type { Review } from "@/lib/reviews-client";
import type { WatchHistoryItem } from "@/contexts/auth-context";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

interface UserPublicProfile {
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

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const userProfile = await getUserPublicProfile(userId);
        if (userProfile) {
          setProfile(userProfile);
        } else {
          setError("User not found");
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto text-center">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {error || "User not found"}
            </h1>
            <p className="text-muted-foreground mb-6">
              The user profile you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Profile Header */}
      <section className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-6 bg-transparent"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="bg-card/50 rounded-xl p-6 md:p-8 border border-border/50">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <Avatar className="w-20 h-20 md:w-24 md:h-24">
              {profile.photoURL && <AvatarImage src={profile.photoURL || "/placeholder.svg"} alt={profile.displayName} />}
              <AvatarFallback className="bg-primary/20 text-primary text-3xl">
                {profile.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                {profile.displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {profile.memberSince.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  {profile.reviewCount} review{profile.reviewCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Register Banner for Non-Logged In Users */}
      {!user && (
        <section className="container mx-auto px-4 py-8">
          <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-xl p-6 md:p-8 text-center">
            <UserPlus className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              Want to see more?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Register to view this user's complete watch history and favorite list, plus create your own profile to track what you watch!
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link href="/register">
                <UserPlus className="h-5 w-5" />
                Register Now
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* Watch History Section */}
      {user && profile.watchHistory.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Watch History</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {profile.watchHistory.map((item, index) => (
              <Link
                key={`${item.type}-${item.id}-${index}`}
                href={`/${item.type}/${item.id}`}
                className="group"
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-2">
                  {item.posterPath ? (
                    <Image
                      src={getImageUrl(item.posterPath, "w300") || ""}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {item.type === "movie" ? (
                        <Film className="h-8 w-8 text-muted-foreground" />
                      ) : (
                        <Tv className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 bg-black/60 rounded text-xs text-white capitalize">
                      {item.type}
                    </span>
                  </div>
                </div>
                <h4 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-1">
                  {item.title}
                </h4>
                {item.type === "tv" && item.season && item.episode && (
                  <p className="text-xs text-muted-foreground">
                    S{item.season} E{item.episode}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatDate(item.watchedAt)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* My List Section */}
      {user && profile.myList.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-6">
            <Heart className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">My List</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {profile.myList.map((item, index) => (
              <Link
                key={`${item.type}-${item.id}-${index}`}
                href={`/${item.type}/${item.id}`}
                className="group"
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-2">
                  {item.posterPath ? (
                    <Image
                      src={getImageUrl(item.posterPath, "w300") || ""}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {item.type === "movie" ? (
                        <Film className="h-8 w-8 text-muted-foreground" />
                      ) : (
                        <Tv className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 bg-black/60 rounded text-xs text-white capitalize">
                      {item.type}
                    </span>
                  </div>
                </div>
                <h4 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h4>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Reviews Section */}
      {profile.reviews.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Reviews ({profile.reviewCount})</h2>
          </div>
          <div className="space-y-6">
            {profile.reviews.map((review) => (
              <div
                key={review.id}
                className="bg-secondary/20 rounded-lg p-6 space-y-4"
              >
                {/* Review Header with Content Info */}
                <div className="flex items-start gap-4">
                  {review.contentPoster ? (
                    <Link
                      href={`/${review.contentType}/${review.contentId}`}
                      className="shrink-0"
                    >
                      <Image
                        src={getImageUrl(review.contentPoster, "w154") || ""}
                        alt={review.contentTitle}
                        width={60}
                        height={90}
                        className="rounded object-cover hover:opacity-80 transition-opacity"
                      />
                    </Link>
                  ) : (
                    <div className="w-[60px] h-[90px] bg-muted rounded flex items-center justify-center shrink-0">
                      {review.contentType === "movie" ? (
                        <Film className="h-6 w-6 text-muted-foreground" />
                      ) : (
                        <Tv className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/${review.contentType}/${review.contentId}`}
                      className="group"
                    >
                      <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {review.contentTitle}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-secondary rounded">
                        {review.contentType}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-5 w-5",
                        star <= review.rating
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {review.reviewText}
                </p>

                {/* Review Stats */}
                <div className="flex items-center gap-4 pt-2 border-t border-border text-sm text-muted-foreground">
                  <span>{review.helpful} found this helpful</span>
                  {review.notHelpful > 0 && (
                    <span>{review.notHelpful} found this not helpful</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State if no content */}
      {profile.reviews.length === 0 && profile.watchHistory.length === 0 && profile.myList.length === 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="text-center bg-card/30 rounded-lg border border-border/50 py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No activity yet</h3>
            <p className="text-muted-foreground">
              {profile.displayName} hasn't added any reviews, watched anything, or saved items yet.
            </p>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
