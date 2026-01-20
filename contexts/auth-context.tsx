"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";

export interface WatchHistoryItem {
  id: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  watchedAt: Date;
  season?: number;
  episode?: number;
}

export interface RatingItem {
  id: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  rating: "like" | "dislike";
  ratedAt: Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: Date;
  lastWatched: WatchHistoryItem | null;
  watchHistory: WatchHistoryItem[];
  myList: { id: number; type: "movie" | "tv"; title: string; posterPath: string | null }[];
  ratings: RatingItem[];
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  uploadProfilePicture: (file: File) => Promise<void>;
  addToWatchHistory: (item: Omit<WatchHistoryItem, "watchedAt">) => Promise<void>;
  addToMyList: (item: { id: number; type: "movie" | "tv"; title: string; posterPath: string | null }) => Promise<void>;
  removeFromMyList: (id: number, type: "movie" | "tv") => Promise<void>;
  isInMyList: (id: number, type: "movie" | "tv") => boolean;
  addRating: (item: Omit<RatingItem, "ratedAt">) => Promise<void>;
  removeRating: (id: number, type: "movie" | "tv") => Promise<void>;
  getUserRating: (id: number, type: "movie" | "tv") => "like" | "dislike" | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile from Firestore with error handling and retry
  const fetchUserProfile = useCallback(async (uid: string, retries = 3) => {
    if (!db) return;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile({
            uid: data.uid,
            email: data.email,
            displayName: data.displayName,
            photoURL: data.photoURL || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            lastWatched: data.lastWatched
              ? {
                  ...data.lastWatched,
                  watchedAt: data.lastWatched.watchedAt?.toDate() || new Date(),
                }
              : null,
            watchHistory: (data.watchHistory || []).map((item: WatchHistoryItem & { watchedAt: Timestamp }) => ({
              ...item,
              watchedAt: item.watchedAt?.toDate ? item.watchedAt.toDate() : new Date(),
            })),
            myList: data.myList || [],
            ratings: (data.ratings || []).map((item: RatingItem & { ratedAt: Timestamp }) => ({
              ...item,
              ratedAt: item.ratedAt?.toDate ? item.ratedAt.toDate() : new Date(),
            })),
          });
          setError(null);
          return; // Success, exit the retry loop
        } else {
          // User document doesn't exist yet, that's okay for new users
          return;
        }
      } catch (err: unknown) {
        const isTransientError = err instanceof Error && 
          (err.message.includes('offline') || 
           err.message.includes('unavailable') ||
           err.message.includes('Unknown SID') ||
           err.message.includes('Bad Request'));
        
        if (isTransientError && attempt < retries - 1) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        
        // Only log on final attempt or for non-transient errors
        if (attempt === retries - 1 && !isTransientError) {
          console.error("Error fetching user profile after retries:", err);
        }
      }
    }
  }, []);

  useEffect(() => {
    // If Firebase is not configured, stop loading and show sign in/up buttons
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          await fetchUserProfile(firebaseUser.uid);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      });
    } catch (err) {
      console.error("Firebase auth error:", err);
      setLoading(false);
      setError("Firebase not configured");
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fetchUserProfile]);

  const signIn = async (email: string, password: string) => {
    if (!auth) {
      throw new Error("Firebase is not configured. Please add your Firebase credentials.");
    }
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await fetchUserProfile(result.user.uid);
    } catch (err) {
      console.error("Sign in error:", err);
      throw err;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    if (!auth || !db) {
      throw new Error("Firebase is not configured. Please add your Firebase credentials.");
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });

      // Create user profile in Firestore
      const newUserProfile: Omit<UserProfile, "createdAt" | "lastWatched" | "watchHistory" | "myList" | "ratings"> & {
        createdAt: ReturnType<typeof serverTimestamp>;
        lastWatched: null;
        watchHistory: WatchHistoryItem[];
        myList: { id: number; type: "movie" | "tv"; title: string; posterPath: string | null }[];
        ratings: RatingItem[];
      } = {
        uid: result.user.uid,
        email: result.user.email || email,
        displayName,
        photoURL: null,
        createdAt: serverTimestamp(),
        lastWatched: null,
        watchHistory: [],
        myList: [],
        ratings: [],
      };

      await setDoc(doc(db, "users", result.user.uid), newUserProfile);
      await fetchUserProfile(result.user.uid);
    } catch (err) {
      console.error("Sign up error:", err);
      throw err;
    }
  };

  const signOut = async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const uploadProfilePicture = async (file: File) => {
    if (!user || !db) {
      throw new Error("Firebase is not configured or user is not logged in");
    }

    try {
      // Convert file to base64 data URL to store directly in Firestore
      // We only store in Firestore, not Firebase Auth, because Auth has photoURL length limits
      const photoURL = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Update only Firestore (skip Firebase Auth updateProfile to avoid length limit error)
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        photoURL,
      });

      // Refresh the user profile to show the new image
      await fetchUserProfile(user.uid, 1);
    } catch (err) {
      console.error("Error uploading profile picture:", err);
      throw err;
    }
  };

  const addToWatchHistory = async (item: Omit<WatchHistoryItem, "watchedAt">) => {
    if (!user || !db) return;

    try {
      // Use regular Date for array items (serverTimestamp() not supported in arrays)
      const now = new Date();
      const watchItemForArray = {
        ...item,
        watchedAt: Timestamp.fromDate(now),
      };
      
      // For lastWatched (not in array), serverTimestamp() is allowed
      const watchItemForLastWatched = {
        ...item,
        watchedAt: serverTimestamp(),
      };

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      // Get current watch history to limit size and remove duplicates
      const currentHistory: WatchHistoryItem[] = userDoc.exists() 
        ? (userDoc.data()?.watchHistory || [])
        : [];
      
      // Remove any existing entry for the same item
      const filteredHistory = currentHistory.filter(
        (h: WatchHistoryItem) => !(h.id === item.id && h.type === item.type)
      );
      
      // Keep only last 50 items
      const updatedHistory = [watchItemForArray, ...filteredHistory].slice(0, 50);

      if (userDoc.exists()) {
        await updateDoc(userRef, {
          lastWatched: watchItemForLastWatched,
          watchHistory: updatedHistory,
        });
      } else {
        // Document doesn't exist, create it with setDoc
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          createdAt: serverTimestamp(),
          lastWatched: watchItemForLastWatched,
          watchHistory: updatedHistory,
          myList: [],
        });
      }

      await fetchUserProfile(user.uid, 1); // Only 1 retry for updates
    } catch (err: unknown) {
      const isTransientError = err instanceof Error && 
        (err.message.includes('offline') || err.message.includes('unavailable') || 
         err.message.includes('Unknown SID') || err.message.includes('Bad Request'));
      if (!isTransientError) {
        console.error("Error adding to watch history:", err);
      }
    }
  };

  const addToMyList = async (item: { id: number; type: "movie" | "tv"; title: string; posterPath: string | null }) => {
    if (!user || !db) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Document exists, use updateDoc with arrayUnion
        await updateDoc(userRef, {
          myList: arrayUnion(item),
        });
      } else {
        // Document doesn't exist, create it with setDoc
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          createdAt: serverTimestamp(),
          lastWatched: null,
          watchHistory: [],
          myList: [item],
        });
      }

      await fetchUserProfile(user.uid, 1);
    } catch (err: unknown) {
      const isTransientError = err instanceof Error && 
        (err.message.includes('offline') || err.message.includes('unavailable') || 
         err.message.includes('Unknown SID') || err.message.includes('Bad Request'));
      if (!isTransientError) {
        console.error("Error adding to my list:", err);
      }
    }
  };

  const removeFromMyList = async (id: number, type: "movie" | "tv") => {
    if (!user || !db) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // No document means nothing to remove from
        return;
      }
      
      const currentList = userDoc.data()?.myList || [];
      const updatedList = currentList.filter(
        (item: { id: number; type: "movie" | "tv" }) => !(item.id === id && item.type === type)
      );

      await updateDoc(userRef, {
        myList: updatedList,
      });

      await fetchUserProfile(user.uid, 1);
    } catch (err: unknown) {
      const isTransientError = err instanceof Error && 
        (err.message.includes('offline') || err.message.includes('unavailable') || 
         err.message.includes('Unknown SID') || err.message.includes('Bad Request'));
      if (!isTransientError) {
        console.error("Error removing from my list:", err);
      }
    }
  };

  const isInMyList = (id: number, type: "movie" | "tv"): boolean => {
    if (!userProfile) return false;
    return userProfile.myList.some((item) => item.id === id && item.type === type);
  };

  const addRating = async (item: Omit<RatingItem, "ratedAt">) => {
    if (!user || !db) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      const ratingWithTimestamp = {
        ...item,
        ratedAt: Timestamp.fromDate(new Date()),
      };

      if (userDoc.exists()) {
        const currentRatings = userDoc.data()?.ratings || [];
        // Remove existing rating for this item if it exists
        const filteredRatings = currentRatings.filter(
          (r: RatingItem) => !(r.id === item.id && r.type === item.type)
        );
        // Add new rating
        const updatedRatings = [ratingWithTimestamp, ...filteredRatings];

        await updateDoc(userRef, {
          ratings: updatedRatings,
        });
      } else {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          createdAt: serverTimestamp(),
          lastWatched: null,
          watchHistory: [],
          myList: [],
          ratings: [ratingWithTimestamp],
        });
      }

      await fetchUserProfile(user.uid, 1);
    } catch (err: unknown) {
      const isTransientError =
        err instanceof Error &&
        (err.message.includes("offline") ||
          err.message.includes("unavailable") ||
          err.message.includes("Unknown SID") ||
          err.message.includes("Bad Request"));
      if (!isTransientError) {
        console.error("Error adding rating:", err);
      }
      throw err;
    }
  };

  const removeRating = async (id: number, type: "movie" | "tv") => {
    if (!user || !db) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return;
      }

      const currentRatings = userDoc.data()?.ratings || [];
      const updatedRatings = currentRatings.filter(
        (item: RatingItem) => !(item.id === id && item.type === type)
      );

      await updateDoc(userRef, {
        ratings: updatedRatings,
      });

      await fetchUserProfile(user.uid, 1);
    } catch (err: unknown) {
      const isTransientError =
        err instanceof Error &&
        (err.message.includes("offline") ||
          err.message.includes("unavailable") ||
          err.message.includes("Unknown SID") ||
          err.message.includes("Bad Request"));
      if (!isTransientError) {
        console.error("Error removing rating:", err);
      }
      throw err;
    }
  };

  const getUserRating = (id: number, type: "movie" | "tv"): "like" | "dislike" | null => {
    if (!userProfile) return null;
    const rating = userProfile.ratings?.find((item) => item.id === id && item.type === type);
    return rating?.rating || null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signIn,
        signUp,
        signOut,
        uploadProfilePicture,
        addToWatchHistory,
        addToMyList,
        removeFromMyList,
        isInMyList,
        addRating,
        removeRating,
        getUserRating,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
