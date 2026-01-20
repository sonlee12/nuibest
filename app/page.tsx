import { HeroBanner } from "@/components/hero-banner";
import { MovieCarousel } from "@/components/movie-carousel";
import { RecentlyWatched } from "@/components/recently-watched";
import { MyListSection } from "@/components/my-list-section";
import { RecommendationsSection } from "@/components/recommendations-section";
import { Footer } from "@/components/footer";
import { ApiKeyError } from "@/components/api-key-error";
import {
  getTrending,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getUpcomingMovies,
  getPopularTVShows,
  getTopRatedTVShows,
} from "@/lib/tmdb";

export default async function HomePage() {
  try {
    const [
      trending,
      popularMovies,
      topRatedMovies,
      nowPlaying,
      upcoming,
      popularTV,
      topRatedTV,
    ] = await Promise.all([
      getTrending("all", "week"),
      getPopularMovies(),
      getTopRatedMovies(),
      getNowPlayingMovies(),
      getUpcomingMovies(),
      getPopularTVShows(),
      getTopRatedTVShows(),
    ]);

    return (
      <div className="min-h-screen">
        <HeroBanner movies={trending} />

        <div className="relative z-10 space-y-4 pb-20">
          <RecentlyWatched />
          <MyListSection />
          <RecommendationsSection />
          <MovieCarousel title="Trending Now" movies={trending} />
          <MovieCarousel title="Popular Cinema" movies={popularMovies.results} />
          <MovieCarousel title="Now in Theaters" movies={nowPlaying.results} />
          <MovieCarousel title="Highly Rated" movies={topRatedMovies.results} />
          <MovieCarousel title="Coming Soon" movies={upcoming.results} />
          <MovieCarousel title="Binge-Worthy Series" movies={popularTV.results} />
          <MovieCarousel title="Critically Acclaimed" movies={topRatedTV.results} />
        </div>

        <Footer />
      </div>
    );
  } catch (error) {
    return <ApiKeyError error={error instanceof Error ? error.message : "An error occurred"} />;
  }
}
