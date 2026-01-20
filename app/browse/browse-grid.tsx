"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MovieCard } from "@/components/movie-card";
import type { Movie } from "@/lib/tmdb";

interface BrowseGridProps {
  items: Movie[];
  type: "movie" | "tv";
  currentPage: number;
  totalPages: number;
  genreId?: number;
  sort: string;
  selectedGenre: string | null;
}

export function BrowseGrid({
  items,
  type,
  currentPage,
  totalPages,
  genreId,
  sort,
  selectedGenre,
}: BrowseGridProps) {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set("type", type);
    if (genreId) params.set("genre", genreId.toString());
    params.set("sort", sort);
    params.set("page", page.toString());
    return `/browse?${params.toString()}`;
  };

  // Add media_type to items for proper linking
  const itemsWithType = items.map((item) => ({
    ...item,
    media_type: type,
  }));

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;

    let start = Math.max(1, currentPage - Math.floor(showPages / 2));
    const end = Math.min(totalPages, start + showPages - 1);

    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push("...");
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">
          No {type === "movie" ? "movies" : "TV shows"} found
          {selectedGenre && ` in ${selectedGenre}`}
        </p>
      </div>
    );
  }

  return (
    <>
      {selectedGenre && (
        <p className="text-muted-foreground mb-4">
          Showing {type === "movie" ? "movies" : "TV shows"} in {selectedGenre}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {itemsWithType.map((item) => (
          <MovieCard key={item.id} movie={item} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12 pb-8">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage <= 1}
            asChild={currentPage > 1}
          >
            {currentPage > 1 ? (
              <Link href={buildUrl(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <span>
                <ChevronLeft className="h-4 w-4" />
              </span>
            )}
          </Button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) =>
              typeof page === "number" ? (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="icon"
                  asChild={page !== currentPage}
                >
                  {page === currentPage ? (
                    <span>{page}</span>
                  ) : (
                    <Link href={buildUrl(page)}>{page}</Link>
                  )}
                </Button>
              ) : (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-muted-foreground"
                >
                  {page}
                </span>
              )
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages}
            asChild={currentPage < totalPages}
          >
            {currentPage < totalPages ? (
              <Link href={buildUrl(currentPage + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span>
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      )}
    </>
  );
}
