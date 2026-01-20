"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Calendar, Clock, Star, Play, Sparkles } from "lucide-react";
import { getImageUrl } from "@/lib/tmdb";
import { VideoPlayer } from "@/components/video-player";

interface Episode {
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

interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  overview: string;
}

interface SeasonsEpisodesProps {
  tvId: number;
  seasons: Season[];
  title: string;
  posterPath?: string | null;
}

export function SeasonsEpisodes({ tvId, seasons, title, posterPath }: SeasonsEpisodesProps) {
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const playerButtonRef = useRef<HTMLDivElement>(null);
  const [clickedEpisode, setClickedEpisode] = useState<{ season: number; episode: number }>({ season: 1, episode: 1 });

  const filteredSeasons = seasons.filter((s) => s.season_number > 0);
  const currentSeason = filteredSeasons.find(
    (s) => s.season_number === selectedSeason
  );

  useEffect(() => {
    const fetchEpisodes = async () => {
      if (!selectedSeason) return;
      setLoading(true);
      try {
        const response = await fetch(
          `/api/seasons/${tvId}/${selectedSeason}`
        );
        const data = await response.json();
        setEpisodes(data.episodes || []);
      } catch (error) {
        console.error("Failed to fetch episodes:", error);
        setEpisodes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEpisodes();
  }, [tvId, selectedSeason]);

  if (filteredSeasons.length === 0) return null;

  // Prepare episodes data for VideoPlayer
  const episodesData = filteredSeasons.map(season => ({
    season: season.season_number,
    episodeCount: season.episode_count
  }));

  return (
    <div className="space-y-6">
      {/* Season Selector */}
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-3xl font-display font-bold">Seasons & Episodes</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-white/20 via-white/10 to-transparent" />
      </div>

      {/* Season Navigation */}
      <div className="relative">
        <div className="overflow-x-auto py-2 scrollbar-hide">
          <div className="flex gap-3 min-w-min">
            {filteredSeasons.map((season) => (
              <button
                key={season.id}
                onClick={() => setSelectedSeason(season.season_number)}
                className={`glass-card rounded-xl p-3 transition-all shrink-0 relative ${
                  selectedSeason === season.season_number
                    ? "ring-2 ring-primary bg-primary/10 z-10"
                    : "hover:bg-white/5 hover:ring-1 hover:ring-white/20 hover:z-20"
                }`}
              >
                <div className="flex items-center gap-3">
                  {season.poster_path && (
                    <div className="relative h-16 w-12 rounded-lg overflow-hidden shrink-0 hidden sm:block">
                      <Image
                        src={getImageUrl(season.poster_path, "w200") || ""}
                        alt={season.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-bold text-sm">{season.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {season.episode_count} episodes
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Season Info Card */}
      {currentSeason && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-4">
            {currentSeason.poster_path && (
              <div className="relative h-32 w-24 rounded-xl overflow-hidden shrink-0 hidden sm:block">
                <Image
                  src={getImageUrl(currentSeason.poster_path, "w300") || ""}
                  alt={currentSeason.name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <h3 className="text-2xl font-display font-bold">
                {currentSeason.name}
              </h3>
              {currentSeason.air_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(currentSeason.air_date).getFullYear()}
                </div>
              )}
              {currentSeason.overview && (
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {currentSeason.overview}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Episodes List */}
      <div className="space-y-3">
        {loading ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
            <p className="mt-4 text-muted-foreground">Loading episodes...</p>
          </div>
        ) : episodes.length > 0 ? (
          episodes.map((episode) => (
            <div
              key={episode.id}
              className="glass-card rounded-xl overflow-hidden hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-4 p-4">
                {/* Episode Number Badge */}
                <div className="shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {episode.episode_number}
                  </span>
                </div>

                {/* Episode Still Image with Play Button */}
                {episode.still_path && (
                  <div 
                    className="relative h-20 w-36 rounded-lg overflow-hidden shrink-0 hidden md:block cursor-pointer group"
                    onClick={() => {
                      setClickedEpisode({ season: selectedSeason, episode: episode.episode_number });
                      setTimeout(() => playerButtonRef.current?.querySelector('button')?.click(), 10);
                    }}
                  >
                    <Image
                      src={getImageUrl(episode.still_path, "w300") || ""}
                      alt={episode.name}
                      fill
                      className="object-cover"
                      sizes="144px"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <div className="bg-white/70 group-hover:bg-white/90 rounded-full p-2 group-hover:scale-110 transition-transform">
                        <Play className="h-6 w-6 text-black fill-black" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Episode Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-base mb-1 line-clamp-2">
                    {episode.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                    {episode.runtime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {episode.runtime}min
                      </div>
                    )}
                    {episode.air_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(episode.air_date).toLocaleDateString()}
                      </div>
                    )}
                    {episode.vote_average > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-accent text-accent" />
                        {episode.vote_average.toFixed(1)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-foreground/70 line-clamp-2 leading-relaxed">
                    {episode.overview || "No description available."}
                  </p>
                </div>

                {/* Play Button for Mobile */}
                <div 
                  className="md:hidden shrink-0 cursor-pointer"
                  onClick={() => {
                    setClickedEpisode({ season: selectedSeason, episode: episode.episode_number });
                    setTimeout(() => playerButtonRef.current?.querySelector('button')?.click(), 10);
                  }}
                >
                  <div className="bg-white/20 hover:bg-white/30 rounded-full p-3 transition-all">
                    <Play className="h-5 w-5 text-white fill-white" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-muted-foreground">
              No episodes found for this season.
            </p>
          </div>
        )}
      </div>

      {/* Hidden VideoPlayer - Will be triggered programmatically */}
      <div ref={playerButtonRef} className="hidden">
        <VideoPlayer
          tmdbId={tvId}
          type="tv"
          title={title}
          posterPath={posterPath}
          seasons={filteredSeasons.length}
          episodes={episodesData}
          initialSeason={clickedEpisode.season}
          initialEpisode={clickedEpisode.episode}
        />
      </div>
    </div>
  );
}
