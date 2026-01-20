"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { getImageUrl } from "@/lib/tmdb";
import { Play, Film, Tv, ChevronLeft, ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function RecentlyWatched() {
  const { user, userProfile, loading } = useAuth();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScrollButtons = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    }
  }, []);

  React.useEffect(() => {
    checkScrollButtons();
    window.addEventListener("resize", checkScrollButtons);
    return () => window.removeEventListener("resize", checkScrollButtons);
  }, [checkScrollButtons, userProfile?.watchHistory]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.75;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
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
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Don't render if not logged in or no watch history
  if (loading || !user || !userProfile || userProfile.watchHistory.length === 0) {
    return null;
  }

  return (
    <section className="relative px-4 md:px-8 lg:px-12 mt-16">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-semibold text-foreground">
          Recently Watched
        </h2>
        <Link
          href="/profile"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          View All
        </Link>
      </div>

      <div className="relative group">
        {/* Left scroll button */}
        {canScrollLeft && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all border border-white/20 backdrop-blur-sm shadow-lg h-12 w-12"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollButtons}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth py-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {userProfile.watchHistory.slice(0, 20).map((item, index) => (
            <Link
              key={`${item.type}-${item.id}-${index}`}
              href={`/${item.type}/${item.id}`}
              className="flex-shrink-0 w-[140px] md:w-[160px] group/card"
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-2">
                {item.posterPath ? (
                  <Image
                    src={getImageUrl(item.posterPath, "w300") || ""}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform group-hover/card:scale-105"
                    sizes="160px"
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity flex items-end justify-center pb-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-10 h-10 rounded-full bg-cyan-600 hover:bg-cyan-500 ring-2 ring-cyan-400/50 flex items-center justify-center relative">
                          <History className="h-5 w-5 text-white" />
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-white rounded-full border-2 border-cyan-600 animate-pulse" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-cyan-600 text-white border-cyan-500">
                        <p className="font-medium">
                          Continue {item.type === "tv" && item.season && item.episode ? `S${item.season}E${item.episode}` : ""}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 bg-black/60 rounded text-xs text-white capitalize">
                    {item.type}
                  </span>
                </div>
              </div>
              <h4 className="font-medium text-sm text-foreground line-clamp-1 group-hover/card:text-primary transition-colors">
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

        {/* Right scroll button */}
        {canScrollRight && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all border border-white/20 backdrop-blur-sm shadow-lg h-12 w-12"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}
      </div>
    </section>
  );
}
