import { MovieCarousel } from "@/components/movie-carousel";
import { Footer } from "@/components/footer";
import {
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getUpcomingMovies,
  discoverMovies,
} from "@/lib/tmdb";

// Genre IDs from TMDB
const GENRES = {
  action: 28,
  comedy: 35,
  drama: 18,
  horror: 27,
  romance: 10749,
  sciFi: 878,
  thriller: 53,
  animation: 16,
};

export default async function MoviesPage() {
  const [
    popular,
    topRated,
    nowPlaying,
    upcoming,
    actionMovies,
    comedyMovies,
    dramaMovies,
    horrorMovies,
    sciFiMovies,
    animationMovies,
  ] = await Promise.all([
    getPopularMovies(),
    getTopRatedMovies(),
    getNowPlayingMovies(),
    getUpcomingMovies(),
    discoverMovies(GENRES.action),
    discoverMovies(GENRES.comedy),
    discoverMovies(GENRES.drama),
    discoverMovies(GENRES.horror),
    discoverMovies(GENRES.sciFi),
    discoverMovies(GENRES.animation),
  ]);

  return (
    <div className="min-h-screen pt-20 md:pt-24">
      {/* Header */}
      <div className="container mx-auto px-4 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Movies</h1>
        <p className="text-muted-foreground mt-2">
          Discover the latest and greatest films
        </p>
      </div>

      {/* Movie Carousels */}
      <div className="space-y-8 pb-8">
        <MovieCarousel title="Popular Movies" movies={popular.results} />
        <MovieCarousel title="Now Playing" movies={nowPlaying.results} />
        <MovieCarousel title="Top Rated" movies={topRated.results} />
        <MovieCarousel title="Coming Soon" movies={upcoming.results} />
        <MovieCarousel title="Action & Adventure" movies={actionMovies.results} />
        <MovieCarousel title="Comedy" movies={comedyMovies.results} />
        <MovieCarousel title="Drama" movies={dramaMovies.results} />
        <MovieCarousel title="Horror" movies={horrorMovies.results} />
        <MovieCarousel title="Science Fiction" movies={sciFiMovies.results} />
        <MovieCarousel title="Animation" movies={animationMovies.results} />
      </div>

      <Footer />
    </div>
  );
}
