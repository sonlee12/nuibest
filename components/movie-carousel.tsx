"use client";

import React from "react"
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MovieCard } from "@/components/movie-card";
import type { Movie } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

interface MovieCarouselProps {
  title: React.ReactNode;
  movies: Movie[];
  className?: string;
}

export function MovieCarousel({ title, movies, className }: MovieCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: "left" | "right") => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    const newScrollLeft = direction === "left" 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount;
    
    container.scrollTo({ left: newScrollLeft, behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    setShowLeftArrow(container.scrollLeft > 10);
    setShowRightArrow(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  if (!movies.length) return null;

  return (
    <section className={cn("relative group/carousel py-8", className)}>
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6 px-4 md:px-8 lg:px-12">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          {title}
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-white/20 via-white/10 to-transparent" />
      </div>

      <div className="relative">
        {/* Left Arrow */}
        {showLeftArrow && (
          <div className="absolute left-0 top-0 bottom-0 z-10 w-16 md:w-20 bg-gradient-to-r from-background via-background/80 to-transparent flex items-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full glass-strong border border-white/10 hover:bg-white/10 hover:scale-110 transition-all ml-2"
              onClick={() => scroll("left")}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-6 w-6 text-foreground" />
            </Button>
          </div>
        )}

        {/* Movies Container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide scroll-smooth px-4 md:px-8 lg:px-12 py-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {movies.map((movie, index) => (
            <MovieCard 
              key={`${movie.id}-${index}`}
              movie={movie} 
              priority={index < 4}
            />
          ))}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <div className="absolute right-0 top-0 bottom-0 z-10 w-16 md:w-20 bg-gradient-to-l from-background via-background/80 to-transparent flex items-center justify-end opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full glass-strong border border-white/10 hover:bg-white/10 hover:scale-110 transition-all mr-2"
              onClick={() => scroll("right")}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-6 w-6 text-foreground" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
