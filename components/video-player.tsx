"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  Tv,
  Film,
  SkipBack,
  SkipForward,
  Loader2,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/auth-context";

interface VideoPlayerProps {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  posterPath?: string | null;
  seasons?: number;
  episodes?: { season: number; episodeCount: number }[];
  initialSeason?: number;
  initialEpisode?: number;
}

// Video embed source - URLs use TMDB IDs
const getVideoUrl = (type: string, id: number, s?: number, e?: number) =>
  type === "movie"
    ? `https://vidsrc.cc/v2/embed/movie/${id}`
    : `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`;

export function VideoPlayer({
  tmdbId,
  type,
  title,
  posterPath,
  seasons = 1,
  episodes = [],
  initialSeason = 1,
  initialEpisode = 1,
}: VideoPlayerProps) {
  const { user, userProfile, addToWatchHistory } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const [selectedEpisode, setSelectedEpisode] = useState(initialEpisode);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const hasTrackedRef = useRef(false);
  const hasInitializedFromHistory = useRef(false);

  // Find the user's last watched episode for this TV show
  const lastWatchedEpisode = useMemo(() => {
    if (type !== "tv" || !userProfile?.watchHistory) return null;
    
    const historyItem = userProfile.watchHistory.find(
      (item) => item.id === tmdbId && item.type === "tv"
    );
    
    if (historyItem && historyItem.season && historyItem.episode) {
      return {
        season: historyItem.season,
        episode: historyItem.episode,
        watchedAt: historyItem.watchedAt,
      };
    }
    return null;
  }, [tmdbId, type, userProfile?.watchHistory]);

  // Initialize season/episode from props or watch history ONLY when dialog opens
  useEffect(() => {
    if (!isOpen) {
      // Reset the initialization flag when dialog closes
      hasInitializedFromHistory.current = false;
      return;
    }

    // Only initialize once when dialog opens
    if (hasInitializedFromHistory.current) return;
    hasInitializedFromHistory.current = true;

    // Use initial props if specified (not default values)
    if (initialSeason !== 1 || initialEpisode !== 1) {
      setSelectedSeason(initialSeason);
      setSelectedEpisode(initialEpisode);
    } 
    // Otherwise use watch history if available
    else if (lastWatchedEpisode) {
      setSelectedSeason(lastWatchedEpisode.season);
      setSelectedEpisode(lastWatchedEpisode.episode);
    }
  }, [isOpen, lastWatchedEpisode, initialSeason, initialEpisode]);

  // Track the last tracked episode to avoid duplicate tracking
  const lastTrackedEpisodeRef = useRef<{ season: number; episode: number } | null>(null);

  // Track watch history when video starts playing or episode changes
  useEffect(() => {
    if (!isOpen || !user || isLoading) return;
    
    // Check if we already tracked this exact episode
    const alreadyTracked = 
      lastTrackedEpisodeRef.current?.season === selectedSeason &&
      lastTrackedEpisodeRef.current?.episode === selectedEpisode;
    
    if (alreadyTracked) return;
    
    // Track the new episode
    lastTrackedEpisodeRef.current = { season: selectedSeason, episode: selectedEpisode };
    
    addToWatchHistory({
      id: tmdbId,
      type,
      title,
      posterPath: posterPath || null,
      ...(type === "tv" && { season: selectedSeason, episode: selectedEpisode }),
    });
  }, [isOpen, user, isLoading, tmdbId, type, title, posterPath, selectedSeason, selectedEpisode, addToWatchHistory]);

  // Reset tracking when dialog closes
  useEffect(() => {
    if (!isOpen) {
      lastTrackedEpisodeRef.current = null;
    }
  }, [isOpen]);

  // Get episode count for selected season
  const getEpisodeCount = useCallback(() => {
    const seasonData = episodes.find((e) => e.season === selectedSeason);
    return seasonData?.episodeCount || 10;
  }, [episodes, selectedSeason]);

  // Navigation functions
  const goToPrevEpisode = useCallback(() => {
    if (selectedEpisode > 1) {
      setSelectedEpisode((e) => e - 1);
      setIsLoading(true);
    } else if (selectedSeason > 1) {
      const prevSeason = selectedSeason - 1;
      const prevSeasonData = episodes.find((e) => e.season === prevSeason);
      setSelectedSeason(prevSeason);
      setSelectedEpisode(prevSeasonData?.episodeCount || 10);
      setIsLoading(true);
    }
  }, [selectedEpisode, selectedSeason, episodes]);

  const goToNextEpisode = useCallback(() => {
    const episodeCount = getEpisodeCount();
    if (selectedEpisode < episodeCount) {
      setSelectedEpisode((e) => e + 1);
      setIsLoading(true);
    } else if (selectedSeason < seasons) {
      setSelectedSeason((s) => s + 1);
      setSelectedEpisode(1);
      setIsLoading(true);
    }
  }, [selectedEpisode, selectedSeason, seasons, getEpisodeCount]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            setIsOpen(false);
          }
          break;
        case "f":
        case "F":
          setIsFullscreen((f) => !f);
          break;
        case "ArrowLeft":
          if (type === "tv" && e.shiftKey) {
            goToPrevEpisode();
          }
          break;
        case "ArrowRight":
          if (type === "tv" && e.shiftKey) {
            goToNextEpisode();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFullscreen, type, goToPrevEpisode, goToNextEpisode]);

  const getEmbedUrl = () => {
    return getVideoUrl(type, tmdbId, selectedSeason, selectedEpisode);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const canGoPrev = type === "tv" && (selectedEpisode > 1 || selectedSeason > 1);
  const canGoNext =
    type === "tv" &&
    (selectedEpisode < getEpisodeCount() || selectedSeason < seasons);

  // Determine button text and style based on watch history
  const getButtonContent = () => {
    if (type === "tv" && lastWatchedEpisode) {
      return {
        text: `Continue S${lastWatchedEpisode.season}E${lastWatchedEpisode.episode}`,
        hasProgress: true,
      };
    }
    return {
      text: "Watch Now",
      hasProgress: false,
    };
  };

  const buttonContent = getButtonContent();

  return (
    <>
      <Button
        size="lg"
        className={`font-semibold gap-2 group relative overflow-hidden rounded-full h-12 transition-all duration-200 ${
          buttonContent.hasProgress
            ? "bg-gradient-to-r from-[oklch(0.72_0.19_210)] to-[oklch(0.68_0.18_35)] text-white hover:from-[oklch(0.68_0.19_210)] hover:to-[oklch(0.64_0.18_35)] shadow-lg shadow-[oklch(0.72_0.19_210)]/30 hover:shadow-xl hover:shadow-[oklch(0.72_0.19_210)]/50"
            : "bg-[oklch(0.72_0.19_210)] text-white hover:bg-[oklch(0.68_0.19_210)] shadow-md hover:shadow-lg shadow-[oklch(0.72_0.19_210)]/30"
        }`}
        onClick={() => setIsOpen(true)}
      >
        {/* Static center glow effect for all buttons */}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
        
        <span className={`relative flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
          buttonContent.hasProgress
            ? "bg-white/20 group-hover:bg-white/30"
            : "bg-white/20 group-hover:bg-white/30"
        }`}>
          {buttonContent.hasProgress ? (
            <History className="h-3 w-3" />
          ) : (
            <svg
              className="h-3 w-3 fill-current ml-0.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </span>
        
        <span className="flex flex-col items-start leading-tight">
          <span className="text-sm font-bold">{buttonContent.text}</span>
          {buttonContent.hasProgress && (
            <span className="text-[10px] opacity-90 font-normal text-white/80">
              Pick up where you left off
            </span>
          )}
        </span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogPortal>
          <DialogOverlay className="bg-black/98 backdrop-blur-sm" />
          <div
            className={`fixed z-50 flex flex-col bg-zinc-950 ${
              isFullscreen
                ? "inset-0"
                : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1400px] h-[90vh] rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5"
            }`}
          >
            <DialogTitle className="sr-only">{title}</DialogTitle>

            {/* Top Header Bar - OUTSIDE video area */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-4">
                {/* Content Type Badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-white">
                  {type === "movie" ? (
                    <Film className="h-3.5 w-3.5" />
                  ) : (
                    <Tv className="h-3.5 w-3.5" />
                  )}
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {type === "movie" ? "Movie" : "Series"}
                  </span>
                </div>

                {/* Title */}
                <div className="flex flex-col">
                  <h3 className="text-white font-semibold text-sm md:text-base truncate max-w-[200px] md:max-w-[400px]">
                    {title}
                  </h3>
                  {type === "tv" && (
                    <span className="text-white/60 text-xs">
                      Season {selectedSeason}, Episode {selectedEpisode}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-full bg-transparent"
                        onClick={toggleFullscreen}
                      >
                        {isFullscreen ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-full bg-transparent"
                        onClick={() => setIsOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Close (Esc)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Video Player - Clean, no overlays */}
            <div className="relative flex-1 min-h-0 bg-black">
              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <span className="text-white/60 text-sm">Loading video...</span>
                  </div>
                </div>
              )}

              <iframe
                src={getEmbedUrl()}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="origin"
                sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups"
                onLoad={() => setIsLoading(false)}
              />

              {/* Episode Navigation Arrows (TV Shows only) */}
              {type === "tv" && (
                <>
                  {canGoPrev && (
                    <button
                      onClick={goToPrevEpisode}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-full bg-black/70 hover:bg-primary text-white/90 hover:text-white transition-all duration-200 hover:scale-110"
                      aria-label="Previous episode"
                    >
                      <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                    </button>
                  )}
                  {canGoNext && (
                    <button
                      onClick={goToNextEpisode}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-full bg-black/70 hover:bg-primary text-white/90 hover:text-white transition-all duration-200 hover:scale-110"
                      aria-label="Next episode"
                    >
                      <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Bottom Controls Bar - OUTSIDE video area */}
            <div className={`flex items-center justify-between px-4 py-3 bg-zinc-900 border-t border-white/10 shrink-0 ${showControls ? '' : 'hidden'}`}>
              {/* TV Show Episode Controls */}
              {type === "tv" ? (
                <div className="flex items-center gap-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-white/80 hover:text-white hover:bg-white/10 gap-1.5 bg-transparent"
                          onClick={goToPrevEpisode}
                          disabled={!canGoPrev}
                        >
                          <SkipBack className="h-4 w-4" />
                          <span className="hidden sm:inline text-xs">Prev</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Previous Episode (Shift + Left)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <div className="flex items-center gap-2">
                    <Select
                      value={String(selectedSeason)}
                      onValueChange={(v) => {
                        setSelectedSeason(Number(v));
                        setSelectedEpisode(1);
                        setIsLoading(true);
                      }}
                    >
                      <SelectTrigger className="w-[100px] h-8 text-xs bg-white/10 border-white/10 text-white hover:bg-white/20">
                        <SelectValue placeholder="Season" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: seasons }, (_, i) => i + 1).map((s) => (
                          <SelectItem key={s} value={String(s)}>
                            Season {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={String(selectedEpisode)}
                      onValueChange={(v) => {
                        setSelectedEpisode(Number(v));
                        setIsLoading(true);
                      }}
                    >
                      <SelectTrigger className="w-[110px] h-8 text-xs bg-white/10 border-white/10 text-white hover:bg-white/20">
                        <SelectValue placeholder="Episode" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: getEpisodeCount() }, (_, i) => i + 1).map(
                          (e) => (
                            <SelectItem key={e} value={String(e)}>
                              Episode {e}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-white/80 hover:text-white hover:bg-white/10 gap-1.5 bg-transparent"
                          onClick={goToNextEpisode}
                          disabled={!canGoNext}
                        >
                          <span className="hidden sm:inline text-xs">Next</span>
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Next Episode (Shift + Right)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <div className="text-white/40 text-xs">
                  Enjoy the movie
                </div>
              )}

              {/* Keyboard Shortcuts Hint */}
              <div className="hidden md:flex items-center gap-3 text-white/40 text-xs">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">F</kbd>
                  <span>Fullscreen</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Esc</kbd>
                  <span>Close</span>
                </span>
                {type === "tv" && (
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Shift</kbd>
                    <span>+</span>
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Arrows</kbd>
                    <span>Navigate</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogPortal>
      </Dialog>
    </>
  );
}
