"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, ArrowRight, Tv, Film, Loader2 } from "lucide-react";
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface WatchPartyRoom {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  contentId: number;
  contentType: "movie" | "tv";
  contentTitle: string;
  contentPoster: string | null;
  season?: number;
  episode?: number;
  createdAt: Date;
  isActive: boolean;
}

export default function WatchPartyPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentParties, setRecentParties] = useState<WatchPartyRoom[]>([]);
  const [loadingParties, setLoadingParties] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  // Fetch user's recent watch parties
  useEffect(() => {
    async function fetchRecentParties() {
      if (!user || !db) {
        setLoadingParties(false);
        return;
      }

      try {
        // Simple query without orderBy to avoid composite index requirement
        // Sort client-side instead
        const q = query(
          collection(db, "watchParties"),
          where("hostId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const parties = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          }))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5) as WatchPartyRoom[];
        setRecentParties(parties);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes("permission") || errorMessage.includes("insufficient")) {
          setPermissionError(true);
        }
        console.error("Error fetching parties:", err);
      } finally {
        setLoadingParties(false);
      }
    }

    fetchRecentParties();
  }, [user]);

  const handleCreateParty = async () => {
    if (!user || !userProfile || !db) return;

    // Check if user has watch history to create a party from
    if (!userProfile.watchHistory || userProfile.watchHistory.length === 0) {
      setError("Watch something first to create a party!");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const lastWatched = userProfile.lastWatched || userProfile.watchHistory[0];
      const roomCode = generateRoomCode();

      const partyData = {
        code: roomCode,
        hostId: user.uid,
        hostName: userProfile.displayName || user.email || "Host",
        contentId: lastWatched.id,
        contentType: lastWatched.type,
        contentTitle: lastWatched.title,
        contentPoster: lastWatched.posterPath,
        season: lastWatched.season || null,
        episode: lastWatched.episode || null,
        createdAt: serverTimestamp(),
        isActive: true,
        isScreenSharing: false,
      };

      const docRef = await addDoc(collection(db, "watchParties"), partyData);
      router.push(`/watch-party/${docRef.id}`);
    } catch (err) {
      console.error("Error creating party:", err);
      setError("Failed to create party. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinParty = async () => {
    if (!joinCode.trim() || !db) return;

    setIsJoining(true);
    setError(null);

    try {
      const q = query(
        collection(db, "watchParties"),
        where("code", "==", joinCode.toUpperCase()),
        where("isActive", "==", true)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Party not found or has ended. Check the code and try again.");
        return;
      }

      const partyDoc = snapshot.docs[0];
      router.push(`/watch-party/${partyDoc.id}`);
    } catch (err) {
      console.error("Error joining party:", err);
      setError("Failed to join party. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-cyan-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <Users className="h-16 w-16 text-primary mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-4">Watch Party</h1>
          <p className="text-muted-foreground mb-8">
            Sign in to create or join watch parties with friends.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Users className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-foreground mb-4">Watch Party</h1>
            <p className="text-muted-foreground text-lg">
              Watch movies and TV shows together with friends in real-time
            </p>
          </div>

          {error && (
            <div className="max-w-md mx-auto mb-8 p-4 glass-card border-destructive/50 text-destructive text-center">
              {error}
            </div>
          )}

          {permissionError && (
            <div className="max-w-2xl mx-auto mb-8 p-6 glass-card border-yellow-500/30">
              <h3 className="text-yellow-500 font-semibold mb-2">Firebase Setup Required</h3>
              <p className="text-muted-foreground text-sm mb-4">
                To enable Watch Party, you need to configure Firestore security rules in your Firebase Console.
                Go to Firestore Database &gt; Rules and add the following rules:
              </p>
              <pre className="bg-zinc-900 p-4 rounded text-xs text-zinc-300 overflow-x-auto mb-4">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /watchParties/{partyId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        resource.data.hostId == request.auth.uid;
    }
    match /watchParties/{partyId}/messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    match /watchParties/{partyId}/participants/{odisplayName} {
      allow read, write: if request.auth != null;
    }
    match /watchParties/{partyId}/signals/{signalId} {
      allow read, write: if request.auth != null;
    }
  }
}`}
              </pre>
              <p className="text-amber-200/60 text-xs">
                After updating the rules, refresh this page to continue.
              </p>
            </div>
          )}

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Create Party Card */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Create a Party
                </CardTitle>
                <CardDescription>
                  Start a new watch party and invite your friends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm mb-4">
                  Your party will start with your last watched content. You can change it anytime.
                </p>
                <Button
                  onClick={handleCreateParty}
                  disabled={isCreating}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Party
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Join Party Card */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-primary" />
                  Join a Party
                </CardTitle>
                <CardDescription>
                  Enter a party code to join your friends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter party code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="uppercase tracking-widest text-center font-mono"
                    maxLength={6}
                  />
                  <Button
                    onClick={handleJoinParty}
                    disabled={isJoining || !joinCode.trim()}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    {isJoining ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Join"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Parties */}
          {recentParties.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Your Recent Parties</h2>
              <div className="grid gap-4">
                {recentParties.map((party) => (
                  <Link key={party.id} href={`/watch-party/${party.id}`}>
                    <Card className="glass-card hover:glass-strong transition-all cursor-pointer">
                      <CardContent className="p-4 flex items-center gap-4">
                        {party.contentPoster ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${party.contentPoster}`}
                            alt={party.contentTitle}
                            className="w-12 h-18 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-18 glass-card rounded flex items-center justify-center">
                            {party.contentType === "movie" ? (
                              <Film className="h-6 w-6 text-muted-foreground" />
                            ) : (
                              <Tv className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-foreground font-medium truncate">{party.contentTitle}</h3>
                          <p className="text-muted-foreground text-sm">
                            Code: <span className="font-mono">{party.code}</span>
                            {party.contentType === "tv" && party.season && (
                              <span className="ml-2">S{party.season} E{party.episode}</span>
                            )}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs ${party.isActive ? "bg-green-500/20 text-green-500" : "glass-card text-muted-foreground"}`}>
                          {party.isActive ? "Active" : "Ended"}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
