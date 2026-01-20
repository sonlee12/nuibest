"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThumbsUp, ThumbsDown, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { addPublicRating, removePublicRating } from "@/lib/ratings";

interface RateButtonProps {
  id: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "secondary" | "outline" | "ghost";
}

export function RateButton({
  id,
  type,
  title,
  posterPath,
  size = "lg",
  variant = "secondary",
}: RateButtonProps) {
  const router = useRouter();
  const { user, getUserRating, addRating, removeRating } = useAuth();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const currentRating = getUserRating(id, type);

  const handleRate = async (rating: "like" | "dislike") => {
    if (!user) {
      toast.info("Please sign in to rate content");
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      // Add to user's personal ratings
      await addRating({ id, type, title, posterPath, rating });
      
      // Also update public rating stats
      await addPublicRating(user.uid, id, type, rating, currentRating);
      
      toast.success(rating === "like" ? "Rated as liked!" : "Rated as not for me");
      setOpen(false);
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRating = async () => {
    if (!user || !currentRating) return;

    setLoading(true);
    try {
      // Remove from user's personal ratings
      await removeRating(id, type);
      
      // Also update public rating stats
      await removePublicRating(id, type, currentRating);
      
      toast.success("Rating removed");
      setOpen(false);
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          size={size} 
          variant="secondary"
          disabled={loading}
          className="rounded-full h-12"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : currentRating === "like" ? (
            <>
              <ThumbsUp className="h-5 w-5 mr-2 fill-current" />
              Liked
            </>
          ) : currentRating === "dislike" ? (
            <>
              <ThumbsDown className="h-5 w-5 mr-2 fill-current" />
              Not for me
            </>
          ) : (
            <>
              <ThumbsUp className="h-5 w-5 mr-2" />
              Rate
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleRate("like")}
            disabled={loading}
            className={cn(
              "p-3 rounded-full transition-all hover:bg-secondary",
              currentRating === "like" && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            title="I like this"
          >
            <ThumbsUp className={cn("h-6 w-6", currentRating === "like" && "fill-current")} />
          </button>
          <button
            onClick={() => handleRate("dislike")}
            disabled={loading}
            className={cn(
              "p-3 rounded-full transition-all hover:bg-secondary",
              currentRating === "dislike" && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
            title="Not for me"
          >
            <ThumbsDown className={cn("h-6 w-6", currentRating === "dislike" && "fill-current")} />
          </button>
          {currentRating && (
            <button
              onClick={handleRemoveRating}
              disabled={loading}
              className="p-3 rounded-full transition-all hover:bg-secondary text-muted-foreground"
              title="Remove rating"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {currentRating ? "Update or remove your rating" : "How did you like this?"}
        </p>
      </PopoverContent>
    </Popover>
  );
}
