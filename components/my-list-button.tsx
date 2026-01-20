"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MyListButtonProps {
  id: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "secondary" | "outline" | "ghost";
}

export function MyListButton({
  id,
  type,
  title,
  posterPath,
  size = "lg",
  variant = "secondary",
}: MyListButtonProps) {
  const router = useRouter();
  const { user, isInMyList, addToMyList, removeFromMyList } = useAuth();
  const [loading, setLoading] = useState(false);

  const inList = isInMyList(id, type);

  const handleClick = async () => {
    if (!user) {
      toast.info("Please sign in to add to your list");
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      if (inList) {
        await removeFromMyList(id, type);
        toast.success("Removed from My List");
      } else {
        await addToMyList({ id, type, title, posterPath });
        toast.success("Added to My List");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      size={size} 
      variant="secondary"
      onClick={handleClick} 
      disabled={loading}
      className="rounded-full h-12"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : inList ? (
        <>
          <Check className="h-5 w-5 mr-2" />
          In My List
        </>
      ) : (
        <>
          <Plus className="h-5 w-5 mr-2" />
          My List
        </>
      )}
    </Button>
  );
}
