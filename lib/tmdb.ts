const TMDB_API_KEY = "27a762a871783dd36ae2b8b74c6bf8de";
const BASE_URL = "https://api.themoviedb.org/3";
export const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export interface Movie {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  media_type?: "movie" | "tv";
  popularity: number;
  adult?: boolean;
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  overview: string;
}

export interface Episode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
}

export interface SeasonDetails extends Season {
  episodes: Episode[];
}

export interface MovieDetails extends Movie {
  runtime?: number;
  episode_run_time?: number[];
  genres: { id: number; name: string }[];
  tagline?: string;
  status: string;
  budget?: number;
  revenue?: number;
  production_companies: { id: number; name: string; logo_path: string | null }[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  created_by?: { id: number; name: string; profile_path: string | null }[];
  seasons?: Season[];
  imdb_id?: string;
}

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface Genre {
  id: number;
  name: string;
}

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  if (!TMDB_API_KEY) {
    throw new Error("TMDB_API_KEY is not configured. Please add your TMDB API key to the environment variables.");
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
  
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`fetch to ${url.toString()} failed with status ${response.status} and body: ${body}`);
  }
  
  return response.json();
}

export async function getTrending(mediaType: "all" | "movie" | "tv" = "all", timeWindow: "day" | "week" = "week") {
  const data = await fetchTMDB<{ results: Movie[] }>(`/trending/${mediaType}/${timeWindow}`);
  return data.results;
}

export async function getPopularMovies(page = 1) {
  const data = await fetchTMDB<{ results: Movie[]; total_pages: number }>("/movie/popular", { page: String(page) });
  return data;
}

export async function getTopRatedMovies(page = 1) {
  const data = await fetchTMDB<{ results: Movie[]; total_pages: number }>("/movie/top_rated", { page: String(page) });
  return data;
}

export async function getUpcomingMovies(page = 1) {
  const data = await fetchTMDB<{ results: Movie[]; total_pages: number }>("/movie/upcoming", { page: String(page) });
  return data;
}

export async function getNowPlayingMovies(page = 1) {
  const data = await fetchTMDB<{ results: Movie[]; total_pages: number }>("/movie/now_playing", { page: String(page) });
  return data;
}

export async function getPopularTVShows(page = 1) {
  const data = await fetchTMDB<{ results: Movie[]; total_pages: number }>("/tv/popular", { page: String(page) });
  return data;
}

export async function getTopRatedTVShows(page = 1) {
  const data = await fetchTMDB<{ results: Movie[]; total_pages: number }>("/tv/top_rated", { page: String(page) });
  return data;
}

export async function getMovieDetails(id: number) {
  return fetchTMDB<MovieDetails>(`/movie/${id}`);
}

export async function getTVDetails(id: number) {
  return fetchTMDB<MovieDetails>(`/tv/${id}`);
}

export async function getMovieCredits(id: number) {
  const data = await fetchTMDB<{ cast: Cast[] }>(`/movie/${id}/credits`);
  return data.cast;
}

export async function getTVCredits(id: number) {
  const data = await fetchTMDB<{ cast: Cast[] }>(`/tv/${id}/credits`);
  return data.cast;
}

export async function getMovieVideos(id: number) {
  const data = await fetchTMDB<{ results: Video[] }>(`/movie/${id}/videos`);
  return data.results;
}

export async function getTVVideos(id: number) {
  const data = await fetchTMDB<{ results: Video[] }>(`/tv/${id}/videos`);
  return data.results;
}

export async function getSimilarMovies(id: number) {
  const data = await fetchTMDB<{ results: Movie[] }>(`/movie/${id}/similar`);
  return data.results;
}

export async function getSimilarTVShows(id: number) {
  const data = await fetchTMDB<{ results: Movie[] }>(`/tv/${id}/similar`);
  return data.results;
}

export async function searchMulti(query: string, page = 1) {
  const data = await fetchTMDB<{ results: Movie[]; total_pages: number; total_results: number }>("/search/multi", {
    query,
    page: String(page),
  });
  return data;
}

export async function getMovieGenres() {
  const data = await fetchTMDB<{ genres: Genre[] }>("/genre/movie/list");
  return data.genres;
}

export async function getTVGenres() {
  const data = await fetchTMDB<{ genres: Genre[] }>("/genre/tv/list");
  return data.genres;
}

export async function discoverMovies(genreId?: number, page = 1, sortBy = "popularity.desc") {
  const params: Record<string, string> = {
    page: String(page),
    sort_by: sortBy,
  };
  if (genreId) {
    params.with_genres = String(genreId);
  }
  const data = await fetchTMDB<{ results: Movie[]; total_pages: number }>("/discover/movie", params);
  return data;
}

export async function discoverTVShows(genreId?: number, page = 1, sortBy = "popularity.desc") {
  const params: Record<string, string> = {
    page: String(page),
    sort_by: sortBy,
  };
  if (genreId) {
    params.with_genres = String(genreId);
  }
  const data = await fetchTMDB<{ results: Movie[]; total_pages: number }>("/discover/tv", params);
  return data;
}

export async function getSeasonDetails(tvId: number, seasonNumber: number) {
  return fetchTMDB<SeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
}

export function getImageUrl(path: string | null, size: "w200" | "w300" | "w400" | "w500" | "w780" | "w1280" | "original" = "w500") {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
}
