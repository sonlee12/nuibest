"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Play, X, AlertCircle, History } from "lucide-react";
import { Dialog, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

interface QuickPlayButtonProps {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  className?: string;
}

// Video embed source - URLs use TMDB IDs
const getVideoUrl = (type: string, id: number, s?: number, e?: number) =>
  type === "movie"
    ? `https://vidsrc.cc/v2/embed/movie/${id}`
    : `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`;

export function QuickPlayButton({
  tmdbId,
  type,
  title,
  className,
}: QuickPlayButtonProps) {
  const { userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
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
      };
    }
    return null;
  }, [tmdbId, type, userProfile?.watchHistory]);

  // Initialize season/episode from watch history when available
  useEffect(() => {
    if (lastWatchedEpisode && !hasInitializedFromHistory.current) {
      hasInitializedFromHistory.current = true;
      setSelectedSeason(lastWatchedEpisode.season);
      setSelectedEpisode(lastWatchedEpisode.episode);
    }
  }, [lastWatchedEpisode]);

  const getEmbedUrl = () => {
    return getVideoUrl(type, tmdbId, selectedSeason, selectedEpisode);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  const hasProgress = type === "tv" && lastWatchedEpisode !== null;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleClick}
              className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                hasProgress
                  ? "bg-cyan-600 hover:bg-cyan-500 ring-2 ring-cyan-400/50"
                  : "bg-foreground hover:bg-foreground/90"
              } ${className}`}
              aria-label={
                hasProgress
                  ? `Continue ${title} - S${lastWatchedEpisode.season}E${lastWatchedEpisode.episode}`
                  : `Play ${title}`
              }
            >
              {hasProgress ? (
                <History className="h-4 w-4 text-white" />
              ) : (
                <Play className="h-4 w-4 fill-background text-background" />
              )}
              
              {/* Progress indicator dot */}
              {hasProgress && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-white rounded-full border-2 border-cyan-600 animate-pulse" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            className={hasProgress ? "bg-cyan-600 text-white border-cyan-500" : ""}
          >
            {hasProgress ? (
              <p className="font-medium">Continue S{lastWatchedEpisode.season}E{lastWatchedEpisode.episode}</p>
            ) : (
              <p>Play {type === "tv" ? "Episode" : "Movie"}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogPortal>
          <DialogOverlay className="bg-black/95" />
          <div className="fixed z-50 flex flex-col bg-black top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1400px] h-[90vh] rounded-lg overflow-hidden">
            <DialogTitle className="sr-only">{title}</DialogTitle>

            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-black/80 border-b border-white/10">
              <div className="flex items-center gap-3">
                <h3 className="text-white font-medium text-sm truncate max-w-[150px] md:max-w-[250px]">
                  {title}
                  {type === "tv" && ` - S${selectedSeason}E${selectedEpisode}`}
                </h3>

                {type === "tv" && (
                  <div className="flex items-center gap-1">
                    <Select
                      value={String(selectedSeason)}
                      onValueChange={(v) => {
                        setSelectedSeason(Number(v));
                        setSelectedEpisode(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-7 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="S" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 20 }, (_, i) => i + 1).map((s) => (
                          <SelectItem key={s} value={String(s)}>
                            S{s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={String(selectedEpisode)}
                      onValueChange={(v) => setSelectedEpisode(Number(v))}
                    >
                      <SelectTrigger className="w-[70px] h-7 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="E" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 30 }, (_, i) => i + 1).map((e) => (
                          <SelectItem key={e} value={String(e)}>
                            E{e}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Player */}
            <div className="relative flex-1 min-h-0 bg-black">
              <iframe
                src={getEmbedUrl()}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="origin"
                sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups"
              />
            </div>

            {/* Disclaimer */}
            <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border-t border-yellow-500/20 text-yellow-500 text-xs">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              <span>Content provided by third-party sources.</span>
            </div>
          </div>
        </DialogPortal>
      </Dialog>
    </>
  );
}
