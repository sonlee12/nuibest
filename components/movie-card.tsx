"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, ThumbsUp, Star, Play } from "lucide-react";
import { type Movie, getImageUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { QuickPlayButton } from "@/components/quick-play-button";
import { useState } from "react";

interface MovieCardProps {
  movie: Movie;
  className?: string;
  priority?: boolean;
}

export function MovieCard({ movie, className, priority = false }: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const title = movie.title || movie.name || "";
  const mediaType = movie.media_type || (movie.title ? "movie" : "tv");
  const posterUrl = getImageUrl(movie.poster_path, "w500");
  const backdropUrl = getImageUrl(movie.backdrop_path, "w780");
  const year = (movie.release_date || movie.first_air_date || "").split("-")[0];

  return (
    <div
      className={cn(
        "group relative flex-shrink-0 w-[160px] md:w-[200px] lg:w-[240px] transition-all duration-500",
        isHovered && "scale-[1.02] z-20",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href={`/${mediaType}/${movie.id}`}
        className="block"
      >
        {/* Main Card */}
        <div className={cn(
          "relative aspect-[2/3] rounded-2xl overflow-hidden glass-card transition-all duration-500",
          isHovered && "shadow-[0_0_30px_rgba(255,255,255,0.3)]"
        )}>
          {/* Poster Image */}
          {posterUrl ? (
            <Image
              src={posterUrl || "/placeholder.svg"}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 160px, (max-width: 1024px) 200px, 240px"
              priority={priority}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center glass-strong">
              <span className="text-muted-foreground text-sm text-center px-4">{title}</span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent transition-opacity duration-500",
            isHovered ? "opacity-90" : "opacity-0"
          )} />

          {/* Hover Content */}
          <div className={cn(
            "absolute inset-0 flex flex-col justify-end p-4 transition-all duration-500",
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            {/* Quick Actions */}
            <div className="flex items-center gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
              <QuickPlayButton
                tmdbId={movie.id}
                type={mediaType as "movie" | "tv"}
                title={title}
              />
              <button
                className="w-9 h-9 rounded-full glass-strong border border-white/20 flex items-center justify-center hover:bg-white/20 hover:border-white/40 hover:scale-110 transition-all cursor-pointer"
                aria-label="Add to list"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <Plus className="h-4 w-4 text-foreground" />
              </button>
              <button
                className="w-9 h-9 rounded-full glass-strong border border-white/20 flex items-center justify-center hover:bg-white/20 hover:border-white/40 hover:scale-110 transition-all cursor-pointer"
                aria-label="Like"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <ThumbsUp className="h-4 w-4 text-foreground" />
              </button>
            </div>

            {/* Title & Info */}
            <h3 className="font-display font-bold text-sm md:text-base text-foreground line-clamp-2 mb-2 leading-tight">
              {title}
            </h3>
            
            <div className="flex items-center gap-2 text-xs">
              <div className="glass px-2 py-0.5 rounded-full">
                <span className="font-semibold text-primary">
                  {Math.round(movie.vote_average * 10)}% Match
                </span>
              </div>
              {year && (
                <span className="text-muted-foreground font-medium">{year}</span>
              )}
            </div>
          </div>
        </div>
      </Link>


    </div>
  );
}
