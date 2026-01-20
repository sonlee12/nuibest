"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { getImageUrl } from "@/lib/tmdb";
import { Play, Film, Tv, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MyListSection() {
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
  }, [checkScrollButtons, userProfile?.myList]);

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

  // Don't render if not logged in or no items in list
  if (loading || !user || !userProfile || userProfile.myList.length === 0) {
    return null;
  }

  return (
    <section className="relative px-4 md:px-8 lg:px-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-semibold text-foreground">
          My List
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
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
          {userProfile.myList.slice(0, 20).map((item, index) => (
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
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="h-5 w-5 text-black fill-black ml-0.5" />
                  </div>
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
            </Link>
          ))}
        </div>

        {/* Right scroll button */}
        {canScrollRight && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}
      </div>
    </section>
  );
}
