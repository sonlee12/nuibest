import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Calendar, Star, Play, Info, TrendingUp, Users, Tv, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MovieCarousel } from "@/components/movie-carousel";
import { Footer } from "@/components/footer";
import { VideoPlayer } from "@/components/video-player";
import { MyListButton } from "@/components/my-list-button";
import { RateButton } from "@/components/rate-button";
import { CommunityRating } from "@/components/community-rating";
import { ReviewsSection } from "@/components/reviews-section";
import { SeasonsEpisodes } from "@/components/seasons-episodes";
import {
  getTVDetails,
  getTVCredits,
  getTVVideos,
  getSimilarTVShows,
  getImageUrl,
} from "@/lib/tmdb";

interface TVPageProps {
  params: Promise<{ id: string }>;
}

export default async function TVPage({ params }: TVPageProps) {
  const { id } = await params;
  const tvId = parseInt(id);

  if (isNaN(tvId)) {
    notFound();
  }

  const [show, credits, videos, similar] = await Promise.all([
    getTVDetails(tvId).catch(() => null),
    getTVCredits(tvId).catch(() => []),
    getTVVideos(tvId).catch(() => []),
    getSimilarTVShows(tvId).catch(() => []),
  ]);

  if (!show) {
    notFound();
  }

  const backdropUrl = getImageUrl(show.backdrop_path, "original");
  const posterUrl = getImageUrl(show.poster_path, "w500");
  const year = (show.first_air_date || "").split("-")[0];
  const trailer = videos.find(
    (v) => v.type === "Trailer" && v.site === "YouTube"
  );
  const cast = credits.slice(0, 10);

  // Prepare episode data for the video player
  const episodeData = show.seasons
    ?.filter((s) => s.season_number > 0) // Filter out specials (season 0)
    .map((s) => ({
      season: s.season_number,
      episodeCount: s.episode_count,
    })) || [];

  return (
    <div className="min-h-screen">
      {/* Hero Section with Layered Depth */}
      <section className="relative min-h-screen flex items-center">
        {/* Multi-layer Background */}
        <div className="absolute inset-0">
          {backdropUrl && (
            <>
              <Image
                src={backdropUrl || "/placeholder.svg"}
                alt={show.name || ""}
                fill
                className="object-cover object-center scale-105"
                priority
                sizes="100vw"
              />
              {/* Dark overlay layers */}
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-transparent to-background" />
            </>
          )}
        </div>

        {/* Content */}
        <div className="relative container mx-auto px-4 pt-32 pb-20">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Floating Poster Card */}
            <div className="lg:col-span-4 hidden lg:block">
              <div className="sticky top-32">
                <div className="relative float">
                  {/* Glow */}
                  <div className="absolute -inset-4 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 rounded-3xl blur-3xl opacity-75" />
                  
                  {/* Poster Card */}
                  <div className="relative glass-card rounded-3xl p-3 depth-4">
                    {posterUrl ? (
                      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl">
                        <Image
                          src={posterUrl || "/placeholder.svg"}
                          alt={show.name || ""}
                          fill
                          className="object-cover"
                          priority
                          sizes="(max-width: 1024px) 0vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[2/3] glass-strong rounded-2xl flex items-center justify-center">
                        <span className="text-muted-foreground">No poster</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-6 glass-card rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Votes</span>
                    <span className="font-semibold">{show.vote_count.toLocaleString()}</span>
                  </div>
                  {show.number_of_episodes && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Episodes</span>
                      <span className="font-semibold">{show.number_of_episodes}</span>
                    </div>
                  )}
                  {year && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">First Air</span>
                      <span className="font-semibold">{year}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info Column */}
            <div className="lg:col-span-8 space-y-6">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="glass-strong border-0 px-3 py-1 text-foreground font-semibold">
                  <Tv className="h-3 w-3 mr-1 text-primary" />
                  TV Series
                </Badge>
                {year && (
                  <Badge variant="outline" className="border-white/20 bg-white/5 backdrop-blur-sm px-3 py-1 text-foreground">
                    {year}
                  </Badge>
                )}
                {show.number_of_seasons && (
                  <Badge variant="outline" className="border-white/20 bg-white/5 backdrop-blur-sm px-3 py-1 text-foreground">
                    {show.number_of_seasons} {show.number_of_seasons === 1 ? 'Season' : 'Seasons'}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <div className="space-y-3">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-gradient leading-tight">
                  {show.name}
                </h1>
                {show.tagline && (
                  <p className="text-lg md:text-xl text-muted-foreground italic">
                    &ldquo;{show.tagline}&rdquo;
                  </p>
                )}
              </div>

              {/* Rating Stats */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <span className="font-bold text-lg">{show.vote_average.toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm">/10</span>
                </div>
                <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{show.vote_count.toLocaleString()} votes</span>
                </div>
                <div className="glass px-4 py-2 rounded-full">
                  <span className="font-semibold text-primary text-sm">
                    {Math.round(show.vote_average * 10)}% Match
                  </span>
                </div>
              </div>

              {/* Community Rating */}
              <div className="glass-card rounded-2xl p-6">
                <CommunityRating
                  contentId={tvId}
                  contentType="tv"
                  variant="detailed"
                />
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2">
                {show.genres.map((genre) => (
                  <Link
                    key={genre.id}
                    href={`/browse?genre=${genre.id}&type=tv`}
                    className="glass-strong px-4 py-2 text-sm rounded-full hover:bg-white/10 transition-all border border-white/10 font-medium"
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>

              {/* Overview */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <h2 className="text-xl font-display font-bold flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Overview
                </h2>
                <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
                  {show.overview}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <VideoPlayer
                  tmdbId={tvId}
                  type="tv"
                  title={show.name || ""}
                  posterPath={show.poster_path}
                  seasons={show.number_of_seasons || 1}
                  episodes={episodeData}
                />
                {trailer && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full h-12 bg-transparent"
                    asChild
                  >
                    <a
                      href={`https://www.youtube.com/watch?v=${trailer.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Play className="h-5 w-5 mr-2 fill-current" />
                      Watch Trailer
                    </a>
                  </Button>
                )}
                <MyListButton
                  id={tvId}
                  type="tv"
                  title={show.name || ""}
                  posterPath={show.poster_path}
                />
                <RateButton
                  id={tvId}
                  type="tv"
                  title={show.name || ""}
                  posterPath={show.poster_path}
                />
              </div>

              {/* Creators */}
              {show.created_by && show.created_by.length > 0 && (
                <div className="glass-card rounded-2xl p-4">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Created by:</span>{" "}
                    <span className="text-foreground font-medium">{show.created_by.map((c) => c.name).join(", ")}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Seasons & Episodes Section */}
      {show.seasons && show.seasons.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <SeasonsEpisodes 
            tvId={tvId} 
            seasons={show.seasons}
            title={show.name || ""}
            posterPath={show.poster_path}
          />
        </section>
      )}

      {/* Cast Section */}
      {cast.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-8">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-display font-bold">Cast</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-white/20 via-white/10 to-transparent" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {cast.map((person) => (
              <div key={person.id} className="glass-card rounded-xl p-2 text-center hover:scale-105 transition-transform">
                <div className="relative aspect-[2/3] mb-2 rounded-lg overflow-hidden bg-secondary">
                  {person.profile_path ? (
                    <Image
                      src={getImageUrl(person.profile_path, "w185") || ""}
                      alt={person.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 12vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                      No Image
                    </div>
                  )}
                </div>
                <p className="font-semibold text-xs text-foreground line-clamp-1">{person.name}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                  {person.character}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Similar Shows */}
      {similar.length > 0 && (
        <div className="py-8">
          <MovieCarousel title="More Like This" movies={similar} />
        </div>
      )}

      {/* Reviews Section */}
      <div className="container mx-auto px-4">
        <ReviewsSection
          contentId={tvId}
          contentType="tv"
          contentTitle={show.name || ""}
        />
      </div>

      <Footer />
    </div>
  );
}
