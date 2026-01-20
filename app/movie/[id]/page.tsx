import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Calendar, Star, Play, Info, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MovieCarousel } from "@/components/movie-carousel";
import { Footer } from "@/components/footer";
import { VideoPlayer } from "@/components/video-player";
import { MyListButton } from "@/components/my-list-button";
import { RateButton } from "@/components/rate-button";
import { CommunityRating } from "@/components/community-rating";
import { ReviewsSection } from "@/components/reviews-section";
import {
  getMovieDetails,
  getMovieCredits,
  getMovieVideos,
  getSimilarMovies,
  getImageUrl,
} from "@/lib/tmdb";

interface MoviePageProps {
  params: Promise<{ id: string }>;
}

export default async function MoviePage({ params }: MoviePageProps) {
  const { id } = await params;
  const movieId = parseInt(id);

  if (isNaN(movieId)) {
    notFound();
  }

  const [movie, credits, videos, similar] = await Promise.all([
    getMovieDetails(movieId).catch(() => null),
    getMovieCredits(movieId).catch(() => []),
    getMovieVideos(movieId).catch(() => []),
    getSimilarMovies(movieId).catch(() => []),
  ]);

  if (!movie) {
    notFound();
  }

  const backdropUrl = getImageUrl(movie.backdrop_path, "original");
  const posterUrl = getImageUrl(movie.poster_path, "w500");
  const year = (movie.release_date || "").split("-")[0];
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;
  const trailer = videos.find(
    (v) => v.type === "Trailer" && v.site === "YouTube"
  );
  const director = credits.find((c) => c.order === 0);
  const cast = credits.slice(0, 10);

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
                alt={movie.title || ""}
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
                          alt={movie.title || ""}
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
                    <span className="font-semibold">{movie.vote_count.toLocaleString()}</span>
                  </div>
                  {runtime && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Runtime</span>
                      <span className="font-semibold">{runtime}</span>
                    </div>
                  )}
                  {year && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Release</span>
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
                  <TrendingUp className="h-3 w-3 mr-1 text-primary" />
                  Featured
                </Badge>
                {year && (
                  <Badge variant="outline" className="border-white/20 bg-white/5 backdrop-blur-sm px-3 py-1 text-foreground">
                    {year}
                  </Badge>
                )}
                {runtime && (
                  <Badge variant="outline" className="border-white/20 bg-white/5 backdrop-blur-sm px-3 py-1 text-foreground">
                    {runtime}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <div className="space-y-3">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-gradient leading-tight">
                  {movie.title}
                </h1>
                {movie.tagline && (
                  <p className="text-lg md:text-xl text-muted-foreground italic">
                    &ldquo;{movie.tagline}&rdquo;
                  </p>
                )}
              </div>

              {/* Rating Stats */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <span className="font-bold text-lg">{movie.vote_average.toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm">/10</span>
                </div>
                <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{movie.vote_count.toLocaleString()} votes</span>
                </div>
                <div className="glass px-4 py-2 rounded-full">
                  <span className="font-semibold text-primary text-sm">
                    {Math.round(movie.vote_average * 10)}% Match
                  </span>
                </div>
              </div>

              {/* Community Rating */}
              <div className="glass-card rounded-2xl p-6">
                <CommunityRating
                  contentId={movieId}
                  contentType="movie"
                  variant="detailed"
                />
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((genre) => (
                  <Link
                    key={genre.id}
                    href={`/browse?genre=${genre.id}`}
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
                  {movie.overview}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <VideoPlayer
                  tmdbId={movieId}
                  type="movie"
                  title={movie.title || ""}
                  posterPath={movie.poster_path}
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
                  id={movieId}
                  type="movie"
                  title={movie.title || ""}
                  posterPath={movie.poster_path}
                />
                <RateButton
                  id={movieId}
                  type="movie"
                  title={movie.title || ""}
                  posterPath={movie.poster_path}
                />
              </div>

              {/* Director/Starring */}
              {director && (
                <div className="glass-card rounded-2xl p-4">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Starring:</span>{" "}
                    <span className="text-foreground font-medium">{director.name}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

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

      {/* Similar Movies */}
      {similar.length > 0 && (
        <div className="py-8">
          <MovieCarousel title="More Like This" movies={similar} />
        </div>
      )}

      {/* Reviews Section */}
      <div className="container mx-auto px-4">
        <ReviewsSection
          contentId={movieId}
          contentType="movie"
          contentTitle={movie.title || ""}
        />
      </div>

      <Footer />
    </div>
  );
}
