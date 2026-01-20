"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Info, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Movie, getImageUrl } from "@/lib/tmdb";
import { VideoPlayer } from "@/components/video-player";
import { Badge } from "@/components/ui/badge";

interface HeroBannerProps {
  movies: Movie[];
}

export function HeroBanner({ movies }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [playerMovie, setPlayerMovie] = useState<Movie | null>(null);
  const featuredMovies = movies.slice(0, 5);
  const current = featuredMovies[currentIndex];

  useEffect(() => {
    // Set initial player movie
    if (!playerMovie && current) {
      setPlayerMovie(current);
    }
  }, [current, playerMovie]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
        setIsTransitioning(false);
      }, 300);
    }, 10000);
    return () => clearInterval(interval);
  }, [featuredMovies.length]);

  if (!current) return null;

  const title = current.title || current.name || "";
  const mediaType = current.media_type || (current.title ? "movie" : "tv");
  const backdropUrl = getImageUrl(current.backdrop_path, "original");
  const posterUrl = getImageUrl(current.poster_path, "w500");
  const year = (current.release_date || current.first_air_date || "").split("-")[0];

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Animated Background with Parallax Effect */}
      <div className="absolute inset-0">
        {backdropUrl && (
          <div className={`absolute inset-0 transition-opacity duration-700 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            <Image
              src={backdropUrl || "/placeholder.svg"}
              alt={title}
              fill
              className="object-cover object-center scale-105 animate-in zoom-in-105 duration-[20s]"
              priority
              sizes="100vw"
            />
          </div>
        )}
        
        {/* Multi-layer Gradient Overlays for Depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background" />
        
        {/* Radial gradient for focus */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* Content Container */}
      <div className="relative h-full min-h-screen container mx-auto px-4 flex items-center pt-32 pb-24">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Text Content */}
          <div className={`lg:col-span-7 space-y-6 transition-all duration-700 ${isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="glass-strong border-0 text-xs font-semibold px-3 py-1 text-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-primary" />
                Trending Now
              </Badge>
              {year && (
                <Badge variant="outline" className="border-white/20 bg-white/5 backdrop-blur-sm text-xs px-3 py-1 text-foreground">
                  {year}
                </Badge>
              )}
              <Badge variant="outline" className="border-white/20 bg-white/5 backdrop-blur-sm text-xs px-3 py-1 uppercase text-foreground">
                {mediaType === "movie" ? "Film" : "Series"}
              </Badge>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-balance leading-[0.95] tracking-tight">
              <span className="text-gradient block">{title}</span>
            </h1>

            {/* Rating & Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 glass px-3 py-2 rounded-full">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="font-bold text-foreground">{current.vote_average.toFixed(1)}</span>
                <span className="text-muted-foreground">/10</span>
              </div>
              <div className="flex items-center gap-2 glass px-3 py-2 rounded-full">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-semibold text-primary">
                  {Math.round(current.vote_average * 10)}% Match
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-base md:text-lg leading-relaxed text-foreground/90 max-w-2xl line-clamp-4 md:line-clamp-none">
              {current.overview}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              {playerMovie && (
                <div onClick={() => setPlayerMovie(current)}>
                  <VideoPlayer
                    tmdbId={playerMovie.id}
                    type={(playerMovie.media_type || (playerMovie.title ? "movie" : "tv")) as "movie" | "tv"}
                    title={playerMovie.title || playerMovie.name || ""}
                  />
                </div>
              )}
              <Button
                size="lg"
                variant="secondary"
                className="glass-strong border-white/10 hover:bg-white/10 font-semibold h-12 px-6 rounded-full group"
                asChild
              >
                <Link href={`/${mediaType}/${current.id}`}>
                  <Info className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                  Details
                </Link>
              </Button>
            </div>
          </div>

          {/* Floating Poster Card */}
          <div className={`lg:col-span-5 hidden lg:block transition-all duration-700 ${isTransitioning ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}`}>
            <div className="relative float">
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-accent/30 rounded-3xl blur-3xl opacity-75" />
              
              {/* Card */}
              <div className="relative glass-card rounded-3xl p-2 depth-4">
                {posterUrl && (
                  <div className="relative aspect-[2/3] overflow-hidden rounded-2xl">
                    <Image
                      src={posterUrl || "/placeholder.svg"}
                      alt={title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 0vw, 40vw"
                    />
                    {/* Inner gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 glass-strong px-4 py-2 rounded-full">
        {featuredMovies.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setIsTransitioning(true);
              setTimeout(() => {
                setCurrentIndex(index);
                setIsTransitioning(false);
              }, 300);
            }}
            className={`transition-all rounded-full ${
              index === currentIndex 
                ? "w-8 h-2 bg-gradient-to-r from-primary to-accent" 
                : "w-2 h-2 bg-foreground/30 hover:bg-foreground/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 hidden lg:block animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 rounded-full bg-white/60" />
        </div>
      </div>
    </section>
  );
}
