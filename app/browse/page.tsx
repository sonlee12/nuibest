import { Suspense } from "react";
import { Compass, Filter } from "lucide-react";
import {
  getMovieGenres,
  getTVGenres,
  discoverMovies,
  discoverTVShows,
  type Genre,
} from "@/lib/tmdb";
import { Footer } from "@/components/footer";
import { BrowseFilters } from "./browse-filters";
import { BrowseGrid } from "./browse-grid";

interface BrowsePageProps {
  searchParams: Promise<{
    type?: string;
    genre?: string;
    sort?: string;
    page?: string;
  }>;
}

async function BrowseContent({
  type,
  genreId,
  sort,
  page,
  genres,
}: {
  type: "movie" | "tv";
  genreId?: number;
  sort: string;
  page: number;
  genres: Genre[];
}) {
  const results =
    type === "movie"
      ? await discoverMovies(genreId, page, sort)
      : await discoverTVShows(genreId, page, sort);

  const selectedGenre = genreId
    ? genres.find((g) => g.id === genreId)?.name
    : null;

  return (
    <BrowseGrid
      items={results.results}
      type={type}
      currentPage={page}
      totalPages={Math.min(results.total_pages, 500)}
      genreId={genreId}
      sort={sort}
      selectedGenre={selectedGenre}
    />
  );
}

function BrowseSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[2/3] glass-card rounded-2xl animate-pulse shimmer"
        />
      ))}
    </div>
  );
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const type = (params.type === "tv" ? "tv" : "movie") as "movie" | "tv";
  const genreId = params.genre ? parseInt(params.genre) : undefined;
  const sort = params.sort || "popularity.desc";
  const page = parseInt(params.page || "1");

  const [movieGenres, tvGenres] = await Promise.all([
    getMovieGenres(),
    getTVGenres(),
  ]);

  const genres = type === "movie" ? movieGenres : tvGenres;

  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Compass className="h-8 w-8 text-primary" />
              <div className="absolute inset-0 blur-xl opacity-50 bg-primary rounded-full" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient">
              Explore
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Discover your next favorite {type === "movie" ? "film" : "series"} from our curated collection
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 glass-card rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-display font-bold">Filters</h2>
          </div>
          <BrowseFilters
            currentType={type}
            currentGenre={genreId}
            currentSort={sort}
            movieGenres={movieGenres}
            tvGenres={tvGenres}
          />
        </div>

        {/* Content Grid */}
        <Suspense fallback={<BrowseSkeleton />}>
          <BrowseContent
            type={type}
            genreId={genreId}
            sort={sort}
            page={page}
            genres={genres}
          />
        </Suspense>
      </div>

      <Footer />
    </div>
  );
}
