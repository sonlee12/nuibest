import { MovieCarousel } from "@/components/movie-carousel";
import { Footer } from "@/components/footer";
import {
  getPopularTVShows,
  getTopRatedTVShows,
  discoverTVShows,
} from "@/lib/tmdb";

// TV Genre IDs from TMDB
const TV_GENRES = {
  actionAdventure: 10759,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  mystery: 9648,
  sciFiFantasy: 10765,
  reality: 10764,
};

export default async function TVShowsPage() {
  const [
    popular,
    topRated,
    actionAdventure,
    animation,
    comedy,
    crime,
    documentary,
    drama,
    mystery,
    sciFiFantasy,
  ] = await Promise.all([
    getPopularTVShows(),
    getTopRatedTVShows(),
    discoverTVShows(TV_GENRES.actionAdventure),
    discoverTVShows(TV_GENRES.animation),
    discoverTVShows(TV_GENRES.comedy),
    discoverTVShows(TV_GENRES.crime),
    discoverTVShows(TV_GENRES.documentary),
    discoverTVShows(TV_GENRES.drama),
    discoverTVShows(TV_GENRES.mystery),
    discoverTVShows(TV_GENRES.sciFiFantasy),
  ]);

  return (
    <div className="min-h-screen pt-20 md:pt-24">
      {/* Header */}
      <div className="container mx-auto px-4 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">TV Shows</h1>
        <p className="text-muted-foreground mt-2">
          Binge-worthy series and shows
        </p>
      </div>

      {/* TV Show Carousels */}
      <div className="space-y-8 pb-8">
        <MovieCarousel title="Popular TV Shows" movies={popular.results} />
        <MovieCarousel title="Top Rated" movies={topRated.results} />
        <MovieCarousel title="Action & Adventure" movies={actionAdventure.results} />
        <MovieCarousel title="Animation" movies={animation.results} />
        <MovieCarousel title="Comedy" movies={comedy.results} />
        <MovieCarousel title="Crime" movies={crime.results} />
        <MovieCarousel title="Documentary" movies={documentary.results} />
        <MovieCarousel title="Drama" movies={drama.results} />
        <MovieCarousel title="Mystery" movies={mystery.results} />
        <MovieCarousel title="Sci-Fi & Fantasy" movies={sciFiFantasy.results} />
      </div>

      <Footer />
    </div>
  );
}
