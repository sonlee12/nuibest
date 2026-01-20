import { Suspense } from "react";
import { Search } from "lucide-react";
import { searchMulti, type Movie } from "@/lib/tmdb";
import { MovieCard } from "@/components/movie-card";
import { Footer } from "@/components/footer";
import { SearchPagination } from "./search-pagination";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

async function SearchResults({ query, page }: { query: string; page: number }) {
  const results = await searchMulti(query, page);
  
  // Filter out people and items without poster
  const filteredResults = results.results.filter(
    (item: Movie) => 
      (item.media_type === "movie" || item.media_type === "tv") && 
      item.poster_path
  );

  if (filteredResults.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 glass-strong rounded-full flex items-center justify-center">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-xl font-semibold text-foreground mb-2">
          No results found
        </p>
        <p className="text-muted-foreground">
          We couldn&apos;t find anything matching &ldquo;{query}&rdquo;
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Try different keywords or check your spelling
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card rounded-2xl p-4 mb-8">
        <p className="text-foreground">
          Found <span className="font-bold text-primary">{results.total_results.toLocaleString()}</span> results for <span className="font-semibold">&ldquo;{query}&rdquo;</span>
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {filteredResults.map((item: Movie) => (
          <MovieCard key={`${item.media_type}-${item.id}`} movie={item} />
        ))}
      </div>

      {results.total_pages > 1 && (
        <div className="mt-12">
          <SearchPagination 
            currentPage={page} 
            totalPages={Math.min(results.total_pages, 500)} 
            query={query}
          />
        </div>
      )}
    </>
  );
}

function SearchSkeleton() {
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

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1");

  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-8 w-8 text-primary" />
              <div className="absolute inset-0 blur-xl opacity-50 bg-primary rounded-full" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient">
              Search Results
            </h1>
          </div>
        </div>

        {query ? (
          <Suspense fallback={<SearchSkeleton />}>
            <SearchResults query={query} page={page} />
          </Suspense>
        ) : (
          <div className="glass-card rounded-3xl p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 glass-strong rounded-full flex items-center justify-center">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">
              Start Your Search
            </p>
            <p className="text-muted-foreground">
              Enter a search term to discover movies and series
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
