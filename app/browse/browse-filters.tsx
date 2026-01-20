"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Genre } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

interface BrowseFiltersProps {
  currentType: "movie" | "tv";
  currentGenre?: number;
  currentSort: string;
  movieGenres: Genre[];
  tvGenres: Genre[];
}

const sortOptions = [
  { value: "popularity.desc", label: "Most Popular" },
  { value: "vote_average.desc", label: "Highest Rated" },
  { value: "primary_release_date.desc", label: "Newest First" },
  { value: "primary_release_date.asc", label: "Oldest First" },
  { value: "revenue.desc", label: "Highest Grossing" },
];

export function BrowseFilters({
  currentType,
  currentGenre,
  currentSort,
  movieGenres,
  tvGenres,
}: BrowseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    // Reset to page 1 when filters change
    params.delete("page");
    
    router.push(`/browse?${params.toString()}`);
  };

  const genres = currentType === "movie" ? movieGenres : tvGenres;

  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* Type Toggle */}
      <div className="flex gap-2">
        <Button
          variant={currentType === "movie" ? "default" : "outline"}
          onClick={() => updateFilters({ type: "movie", genre: undefined })}
          className={cn(
            currentType === "movie" && "bg-primary text-primary-foreground"
          )}
        >
          Movies
        </Button>
        <Button
          variant={currentType === "tv" ? "default" : "outline"}
          onClick={() => updateFilters({ type: "tv", genre: undefined })}
          className={cn(
            currentType === "tv" && "bg-primary text-primary-foreground"
          )}
        >
          TV Shows
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Genre Select */}
        <Select
          value={currentGenre?.toString() || "all"}
          onValueChange={(value) =>
            updateFilters({ genre: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger className="w-[180px] bg-secondary border-border">
            <SelectValue placeholder="Select Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genres</SelectItem>
            {genres.map((genre) => (
              <SelectItem key={genre.id} value={genre.id.toString()}>
                {genre.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Select */}
        <Select
          value={currentSort}
          onValueChange={(value) => updateFilters({ sort: value })}
        >
          <SelectTrigger className="w-[180px] bg-secondary border-border">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Genre Pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!currentGenre ? "default" : "outline"}
          size="sm"
          onClick={() => updateFilters({ genre: undefined })}
          className={cn(
            "rounded-full",
            !currentGenre && "bg-primary text-primary-foreground"
          )}
        >
          All
        </Button>
        {genres.slice(0, 10).map((genre) => (
          <Button
            key={genre.id}
            variant={currentGenre === genre.id ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilters({ genre: genre.id.toString() })}
            className={cn(
              "rounded-full",
              currentGenre === genre.id && "bg-primary text-primary-foreground"
            )}
          >
            {genre.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
