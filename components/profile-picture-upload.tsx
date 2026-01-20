"use client";

import React from "react"

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ProfilePictureUploadProps {
  currentPhotoURL?: string | null;
  onUpload: (file: File) => Promise<void>;
  size?: "sm" | "md" | "lg";
}

export function ProfilePictureUpload({
  currentPhotoURL,
  onUpload,
  size = "md",
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentPhotoURL || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-20 h-20 md:w-24 md:h-24",
    lg: "w-32 h-32",
  };

  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10 md:w-12 md:h-12",
    lg: "w-16 h-16",
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    try {
      await onUpload(file);
      toast.success("Profile picture updated!");
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast.error("Failed to upload profile picture");
      setPreview(currentPhotoURL || null);
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative group">
      <div
        className={`${sizeClasses[size]} rounded-full bg-primary/20 flex items-center justify-center overflow-hidden relative cursor-pointer`}
        onClick={handleClick}
      >
        {preview ? (
          <Image
            src={preview || "/placeholder.svg"}
            alt="Profile"
            fill
            className="object-cover"
            sizes={size === "sm" ? "64px" : size === "md" ? "96px" : "128px"}
          />
        ) : (
          <User className={`${iconSizes[size]} text-primary`} />
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Change photo button (optional, shows on hover) */}
      <Button
        size="sm"
        variant="secondary"
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs gap-1"
        onClick={handleClick}
        disabled={uploading}
      >
        <Camera className="w-3 h-3" />
        Change
      </Button>
    </div>
  );
}
