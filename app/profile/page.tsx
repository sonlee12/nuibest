"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from "@/components/footer";
import { ProfilePictureUpload } from "@/components/profile-picture-upload";
import { getImageUrl } from "@/lib/tmdb";
import { 
  User, 
  Clock, 
  Heart, 
  Play, 
  LogOut, 
  Calendar,
  Film,
  Tv,
  Loader2,
  X
} from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const router = useRouter();
  const { user, userProfile, loading, signOut, removeFromMyList, uploadProfilePicture } = useAuth();

  // Redirect if not logged in
  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    router.push("/");
  };

  const handleRemoveFromList = async (id: number, type: "movie" | "tv") => {
    await removeFromMyList(id, type);
    toast.success("Removed from My List");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const formatRelativeDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(date);
  };

  return (
    <div className="min-h-screen pt-20">
      {/* Profile Header */}
      <section className="container mx-auto px-4 py-8">
        <div className="bg-card/50 rounded-xl p-6 md:p-8 border border-border/50">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Picture */}
            <ProfilePictureUpload
              currentPhotoURL={userProfile.photoURL}
              onUpload={uploadProfilePicture}
              size="md"
            />

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                {userProfile.displayName}
              </h1>
              <p className="text-muted-foreground mb-2">{userProfile.email}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {new Date(userProfile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Sign Out Button */}
            <Button variant="outline" onClick={handleSignOut} className="gap-2 bg-transparent">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          {/* Last Watched */}
          {userProfile.lastWatched && (
            <div className="mt-6 pt-6 border-t border-border/50">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Continue Watching</h3>
              <Link
                href={`/${userProfile.lastWatched.type}/${userProfile.lastWatched.id}`}
                className="flex items-center gap-4 bg-secondary/50 rounded-lg p-3 hover:bg-secondary/80 transition-colors group"
              >
                {userProfile.lastWatched.posterPath ? (
                  <Image
                    src={getImageUrl(userProfile.lastWatched.posterPath, "w154") || ""}
                    alt={userProfile.lastWatched.title}
                    width={60}
                    height={90}
                    className="rounded object-cover"
                  />
                ) : (
                  <div className="w-[60px] h-[90px] bg-muted rounded flex items-center justify-center">
                    {userProfile.lastWatched.type === "movie" ? (
                      <Film className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <Tv className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {userProfile.lastWatched.title}
                  </p>
                  {userProfile.lastWatched.type === "tv" && userProfile.lastWatched.season && userProfile.lastWatched.episode && (
                    <p className="text-sm text-muted-foreground">
                      S{userProfile.lastWatched.season} E{userProfile.lastWatched.episode}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeDate(userProfile.lastWatched.watchedAt)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" className="gap-1">
                  <Play className="h-4 w-4 fill-current" />
                  Resume
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Tabs Section */}
      <section className="container mx-auto px-4 pb-12">
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" />
              Watch History
            </TabsTrigger>
            <TabsTrigger value="mylist" className="gap-2">
              <Heart className="h-4 w-4" />
              My List
            </TabsTrigger>
          </TabsList>

          {/* Watch History Tab */}
          <TabsContent value="history">
            {userProfile.watchHistory.length === 0 ? (
              <div className="text-center py-12 bg-card/30 rounded-lg border border-border/50">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No watch history yet</h3>
                <p className="text-muted-foreground mb-4">Start watching movies and TV shows to track your history</p>
                <Button asChild>
                  <Link href="/browse">Browse Content</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {userProfile.watchHistory.map((item, index) => (
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
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <Play className="h-6 w-6 text-white fill-white" />
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 bg-black/60 rounded text-xs text-white capitalize">
                          {item.type}
                        </span>
                      </div>
                    </div>
                    <h4 className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    {item.type === "tv" && item.season && item.episode && (
                      <p className="text-xs text-muted-foreground">
                        S{item.season} E{item.episode}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDate(item.watchedAt)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* My List Tab */}
          <TabsContent value="mylist">
            {userProfile.myList.length === 0 ? (
              <div className="text-center py-12 bg-card/30 rounded-lg border border-border/50">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Your list is empty</h3>
                <p className="text-muted-foreground mb-4">Add movies and TV shows to your list to watch later</p>
                <Button asChild>
                  <Link href="/browse">Browse Content</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {userProfile.myList.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="group relative">
                    <Link href={`/${item.type}/${item.id}`}>
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-2">
                        {item.posterPath ? (
                          <Image
                            src={getImageUrl(item.posterPath, "w300") || ""}
                            alt={item.title}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <Play className="h-6 w-6 text-white fill-white" />
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-0.5 bg-black/60 rounded text-xs text-white capitalize">
                            {item.type}
                          </span>
                        </div>
                      </div>
                      <h4 className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemoveFromList(item.id, item.type);
                      }}
                      className="absolute top-2 left-2 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      <Footer />
    </div>
  );
}
