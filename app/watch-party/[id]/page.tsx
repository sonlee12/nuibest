"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useParams } from "next/navigation";
import { WatchPartyChat } from "@/components/watch-party-chat";
import { Button } from "@/components/ui/button";
import {
  X,
  Maximize2,
  Minimize2,
  Users,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  Film,
  Tv,
  Monitor,
  MonitorOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

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
  isScreenSharing: boolean;
}

interface Participant {
  id: string;
  odisplayName: string;
  displayName: string;
  joinedAt: Date;
}

// Simple WebRTC signaling through Firebase
interface SignalData {
  type: "offer" | "answer" | "ice-candidate";
  data: string;
  from: string;
  to: string;
  timestamp: number;
}

export default function WatchPartyRoomPage() {
  const params = useParams();
  const roomId = params.id as string;
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [room, setRoom] = useState<WatchPartyRoom | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [copied, setCopied] = useState(false);
  const participantDocRef = useRef<string | null>(null);

  // Screen sharing state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  // Track which participants we've already initiated connections with (to prevent duplicate offers)
  const initiatedConnectionsRef = useRef<Set<string>>(new Set());
  // Track pending offers to prevent processing duplicate answers
  const pendingOffersRef = useRef<Map<string, boolean>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected");
  const [screenShareError, setScreenShareError] = useState<string | null>(null);

  const isHost = user?.uid === room?.hostId;

  // ICE servers for WebRTC - using multiple STUN servers and free TURN servers for better connectivity
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      // OpenRelay TURN servers (free, public)
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ],
    iceCandidatePoolSize: 10,
  };

  // Load room data with real-time sync
  useEffect(() => {
    if (!db || !roomId) return;

    const unsubscribe = onSnapshot(
      doc(db, "watchParties", roomId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const roomData = {
            id: snapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
          } as WatchPartyRoom;

          setRoom(roomData);
        } else {
          setError("Party not found or has ended");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error loading room:", err);
        setError("Failed to load party");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  // Load participants
  useEffect(() => {
    if (!db || !roomId) return;

    const q = query(
      collection(db, "watchParties", roomId, "participants"),
      orderBy("joinedAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const parts = snapshot.docs.map((doc) => {
        const data = doc.data();
        console.log("[v0] Participant data:", { id: doc.id, odisplayName: data.odisplayName, displayName: data.displayName });
        return {
          id: doc.id,
          odisplayName: data.odisplayName,
          displayName: data.displayName,
          joinedAt: data.joinedAt?.toDate() || new Date(),
        };
      }) as Participant[];
      console.log("[v0] All participants loaded:", parts.length);
      setParticipants(parts);
    });

    return () => unsubscribe();
  }, [roomId]);

  // Join as participant
  useEffect(() => {
    if (!db || !roomId || !user || !userProfile || participantDocRef.current)
      return;

    const joinParty = async () => {
      try {
        console.log("[v0] Joining party as:", user.uid);
        
        const q = query(
          collection(db, "watchParties", roomId, "participants"),
          where("odisplayName", "==", user.uid)
        );
        const existing = await getDocs(q);

        if (existing.empty) {
          console.log("[v0] Creating new participant record");
          const docRef = await addDoc(
            collection(db, "watchParties", roomId, "participants"),
            {
              odisplayName: user.uid,
              displayName:
                userProfile.displayName || user.email?.split("@")[0] || "Guest",
              joinedAt: serverTimestamp(),
            }
          );
          participantDocRef.current = docRef.id;
          console.log("[v0] Joined party with doc id:", docRef.id);
        } else {
          participantDocRef.current = existing.docs[0].id;
          console.log("[v0] Already in party with doc id:", existing.docs[0].id);
        }
      } catch (err) {
        console.error("[v0] Error joining party:", err);
      }
    };

    joinParty();

    return () => {
      if (participantDocRef.current && db) {
        deleteDoc(
          doc(db, "watchParties", roomId, "participants", participantDocRef.current)
        ).catch(console.error);
      }
    };
  }, [roomId, user, userProfile]);

  // Store isHost in a ref to avoid dependency issues
  const isHostRef = useRef(isHost);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // Listen for WebRTC signals - using messages subcollection which has permissions
  useEffect(() => {
    if (!db || !roomId || !user) return;

    console.log("[v0] Setting up signal listener for user:", user.uid);

    const q = query(
      collection(db, "watchParties", roomId, "messages"),
      where("isSignal", "==", true),
      where("to", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === "added") {
            const data = change.doc.data();
            console.log("[v0] Received signal:", data.signalType, "from:", data.from);
            
            const signal: SignalData = {
              type: data.signalType,
              data: data.signalData,
              from: data.from,
              to: data.to,
              timestamp: data.timestamp,
            };

            // Delete processed signal
            try {
              await deleteDoc(change.doc.ref);
            } catch {
              // Ignore delete errors - may not have permission
            }

            try {
              if (signal.type === "offer" && !isHostRef.current) {
                console.log("[v0] Processing offer from host");
                await handleOffer(signal.from, JSON.parse(signal.data));
              } else if (signal.type === "answer" && isHostRef.current) {
                console.log("[v0] Processing answer from guest");
                await handleAnswer(signal.from, JSON.parse(signal.data));
              } else if (signal.type === "ice-candidate") {
                console.log("[v0] Processing ICE candidate");
                await handleIceCandidate(signal.from, JSON.parse(signal.data));
              }
            } catch (err) {
              console.error("[v0] Error processing signal:", err);
            }
          }
        }
      },
      (err) => {
        // Silently handle permission errors for signals
        console.log("[v0] Signal listener error (may be expected):", err.code);
      }
    );

    return () => unsubscribe();
  }, [roomId, user]);

  // Track if we're currently processing an offer (guest side)
  const processingOfferRef = useRef<boolean>(false);
  
  // Handle incoming offer (guest side)
  const handleOffer = async (
    fromId: string,
    offer: RTCSessionDescriptionInit
  ) => {
    if (!user || !db) return;

    // Prevent processing multiple offers simultaneously
    if (processingOfferRef.current) {
      console.log("[v0] Already processing an offer, ignoring duplicate");
      return;
    }
    
    // If we already have a working connection, don't replace it
    const existingPc = peerConnectionsRef.current.get(fromId);
    if (existingPc && (existingPc.connectionState === "connected" || existingPc.iceConnectionState === "connected")) {
      console.log("[v0] Already connected, ignoring new offer");
      return;
    }

    processingOfferRef.current = true;
    console.log("[v0] Creating peer connection for offer from:", fromId);

    // Close existing connection if any
    if (existingPc) {
      console.log("[v0] Closing existing connection");
      existingPc.close();
    }

    const pc = new RTCPeerConnection(iceServers);
    peerConnectionsRef.current.set(fromId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[v0] Sending ICE candidate to host");
        sendSignal(fromId, "ice-candidate", JSON.stringify(event.candidate));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[v0] ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        setConnectionStatus("failed");
        processingOfferRef.current = false;
        // Try to restart ICE
        pc.restartIce();
      } else if (pc.iceConnectionState === "disconnected") {
        setConnectionStatus("disconnected");
        processingOfferRef.current = false;
      } else if (pc.iceConnectionState === "connected") {
        setConnectionStatus("connected");
        processingOfferRef.current = false;
      }
    };

    pc.ontrack = (event) => {
      console.log("[v0] Received track:", event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        // Don't set connected here - wait for ICE connection
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[v0] Connection state:", pc.connectionState);
      setConnectionStatus(pc.connectionState);
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("[v0] Remote description set");
      
      const answer = await pc.createAnswer();
      console.log("[v0] Answer created");
      
      await pc.setLocalDescription(answer);
      console.log("[v0] Local description set");

      await sendSignal(fromId, "answer", JSON.stringify(answer));
      console.log("[v0] Answer sent to host");
      
      setConnectionStatus("connecting");
      // Keep processingOfferRef true until we're connected or failed
    } catch (err) {
      console.error("[v0] Error handling offer:", err);
      setConnectionStatus("failed");
      processingOfferRef.current = false;
    }
  };

  // Handle incoming answer (host side)
  const handleAnswer = async (
    fromId: string,
    answer: RTCSessionDescriptionInit
  ) => {
    console.log("[v0] Handling answer from:", fromId);
    
    // Check if we have a pending offer for this participant
    if (!pendingOffersRef.current.get(fromId)) {
      console.log("[v0] No pending offer for:", fromId, "- ignoring stale answer");
      return;
    }
    
    const pc = peerConnectionsRef.current.get(fromId);
    if (pc) {
      // Check if connection is in the right state to receive an answer
      if (pc.signalingState !== "have-local-offer") {
        console.log("[v0] Connection not in have-local-offer state:", pc.signalingState, "- ignoring answer");
        return;
      }
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("[v0] Remote description set for guest:", fromId);
        // Clear the pending offer flag
        pendingOffersRef.current.set(fromId, false);
      } catch (err) {
        console.error("[v0] Error setting remote description:", err);
      }
    } else {
      console.warn("[v0] No peer connection found for:", fromId);
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (
    fromId: string,
    candidate: RTCIceCandidateInit
  ) => {
    const pc = peerConnectionsRef.current.get(fromId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("[v0] ICE candidate added from:", fromId);
      } catch (err) {
        console.error("[v0] Error adding ICE candidate:", err);
      }
    } else {
      console.warn("[v0] No peer connection for ICE candidate from:", fromId);
    }
  };

  // Send signal through Firebase - using messages subcollection
  const sendSignal = useCallback(async (
    toId: string,
    type: SignalData["type"],
    data: string
  ) => {
    if (!db || !user) return;

    console.log("[v0] Sending signal:", type, "to:", toId);
    
    try {
      await addDoc(collection(db, "watchParties", roomId, "messages"), {
        isSignal: true,
        signalType: type,
        signalData: data,
        from: user.uid,
        to: toId,
        timestamp: Date.now(),
        // Regular message fields for compatibility
        userId: user.uid,
        userName: "System",
        content: "",
        createdAt: serverTimestamp(),
      });
      console.log("[v0] Signal sent successfully");
    } catch (err) {
      console.error("[v0] Error sending signal:", err);
    }
  }, [roomId, user]);

  // Start screen sharing (host only)
  const startScreenShare = async () => {
    if (!isHost || !db) return;

    setScreenShareError(null);

    try {
      // Request screen share with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
        },
        audio: true,
      });

      localStreamRef.current = stream;
      setIsScreenSharing(true);

      // Update room state
      await updateDoc(doc(db, "watchParties", roomId), {
        isScreenSharing: true,
      });

      // Show local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connections for all existing participants
      const otherParticipants = participants.filter(
        (p) => p.odisplayName && p.odisplayName !== user?.uid
      );

      console.log("[v0] Starting screen share, participants to connect:", otherParticipants.length);
      console.log("[v0] Other participants UIDs:", otherParticipants.map(p => p.odisplayName));

      // Clear any previous tracking state
      initiatedConnectionsRef.current.clear();
      pendingOffersRef.current.clear();

      for (const participant of otherParticipants) {
        const pid = participant.odisplayName;
        if (pid) {
          console.log("[v0] Creating connection for participant:", pid);
          initiatedConnectionsRef.current.add(pid);
          await createPeerConnection(pid, stream);
        }
      }

      // Handle stream end (user clicks "Stop sharing")
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message?.includes("disallowed by permissions policy")) {
        setScreenShareError(
          "Screen sharing is not available in this preview. Please deploy the app to Vercel to use screen sharing, or open the app in a new tab."
        );
      } else if (error.name === "NotAllowedError") {
        setScreenShareError("Screen sharing was cancelled or denied.");
      } else {
        setScreenShareError("Failed to start screen sharing. Please try again.");
      }
    }
  };

  // Create peer connection for a participant (host side)
  const createPeerConnection = useCallback(async (participantId: string, stream: MediaStream) => {
    if (!user) return;

    console.log("[v0] Creating peer connection for participant:", participantId);

    // Close existing connection if any
    const existingPc = peerConnectionsRef.current.get(participantId);
    if (existingPc) {
      console.log("[v0] Closing existing connection to:", participantId);
      existingPc.close();
    }

    const pc = new RTCPeerConnection(iceServers);
    peerConnectionsRef.current.set(participantId, pc);

    // Add tracks to peer connection
    stream.getTracks().forEach((track) => {
      console.log("[v0] Adding track to peer connection:", track.kind);
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[v0] Sending ICE candidate to:", participantId);
        sendSignal(participantId, "ice-candidate", JSON.stringify(event.candidate));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[v0] ICE connection to ${participantId}: ${pc.iceConnectionState}`);
    };

    pc.onconnectionstatechange = () => {
      console.log(`[v0] Connection to ${participantId}: ${pc.connectionState}`);
    };

    try {
      // Create and send offer
      const offer = await pc.createOffer();
      console.log("[v0] Created offer for:", participantId);
      
      await pc.setLocalDescription(offer);
      console.log("[v0] Local description set for:", participantId);
      
      // Mark that we have a pending offer for this participant
      pendingOffersRef.current.set(participantId, true);
      
      await sendSignal(participantId, "offer", JSON.stringify(offer));
      console.log("[v0] Offer sent to:", participantId);
    } catch (err) {
      console.error("[v0] Error creating peer connection:", err);
      pendingOffersRef.current.set(participantId, false);
    }
  }, [user, sendSignal]);

  // Stop screen sharing
  const stopScreenShare = async () => {
    if (!db) return;

    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    
    // Clear tracking refs
    initiatedConnectionsRef.current.clear();
    pendingOffersRef.current.clear();

    setIsScreenSharing(false);
    setConnectionStatus("disconnected");

    // Update room state
    await updateDoc(doc(db, "watchParties", roomId), {
      isScreenSharing: false,
    });
  };

  // Handle new participant joining (host sends offer to new participant)
  useEffect(() => {
    if (!isHost || !isScreenSharing || !localStreamRef.current) return;

    console.log("[v0] Checking for new participants to connect, total:", participants.length);

    const otherParticipants = participants.filter(
      (p) => p.odisplayName && p.odisplayName !== user?.uid
    );

    console.log("[v0] Other participants:", otherParticipants.map(p => p.odisplayName));

    for (const participant of otherParticipants) {
      const pid = participant.odisplayName;
      // Only create connection if we haven't already initiated one for this participant
      if (pid && !initiatedConnectionsRef.current.has(pid)) {
        console.log("[v0] Creating connection for new participant:", pid);
        initiatedConnectionsRef.current.add(pid);
        createPeerConnection(pid, localStreamRef.current);
      }
    }
  }, [participants, isHost, isScreenSharing, user?.uid, createPeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
    };
  }, []);

  const handleCopyCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEndParty = async () => {
    if (!db || !room || room.hostId !== user?.uid) return;

    try {
      await stopScreenShare();
      await updateDoc(doc(db, "watchParties", roomId), {
        isActive: false,
      });
      router.push("/watch-party");
    } catch (err) {
      console.error("Error ending party:", err);
    }
  };

  const toggleMute = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          if (isFullscreen) {
            setIsFullscreen(false);
          }
          break;
        case "f":
        case "F":
          setIsFullscreen((f) => !f);
          break;
        case "c":
        case "C":
          setShowChat((s) => !s);
          break;
        case "m":
        case "M":
          toggleMute();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-cyan-600 animate-spin" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            {error || "Party not found"}
          </h1>
          <Link href="/watch-party">
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
              Back to Watch Party
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!room.isActive) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            This party has ended
          </h1>
          <Link href="/watch-party">
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
              Back to Watch Party
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-zinc-950 flex flex-col ${
        isFullscreen ? "fixed inset-0 z-50" : "min-h-screen"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/watch-party">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10 bg-transparent"
            >
              <X className="h-4 w-4" />
            </Button>
          </Link>

          {/* Content Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-600 text-white">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-sm font-medium">LIVE</span>
            </div>

          {/* Screen Share Status */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
              room.isScreenSharing
                ? "bg-green-600/20 text-green-400"
                : "bg-yellow-600/20 text-yellow-400"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                room.isScreenSharing
                  ? "bg-green-400 animate-pulse"
                  : "bg-yellow-400"
              }`}
            />
            {room.isScreenSharing ? "LIVE" : "WAITING"}
          </div>

          {/* Title */}
          <div className="flex flex-col">
            <h3 className="text-white font-semibold text-sm md:text-base truncate max-w-[200px] md:max-w-[400px]">
              {room.contentTitle}
            </h3>
            <span className="text-white/60 text-xs">
              Hosted by {room.hostName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Party Code */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyCode}
            className="text-white/80 hover:text-white hover:bg-white/10 gap-2 bg-transparent"
          >
            <span className="font-mono text-sm">{room.code}</span>
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>

          {/* Participants Count */}
          <div className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded text-white/80 text-sm">
            <Users className="h-4 w-4" />
            <span>{participants.length}</span>
          </div>

          {/* Mute/Unmute for guests */}
          {!isHost && room.isScreenSharing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-full bg-transparent"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Toggle Chat */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowChat(!showChat)}
            className={`h-9 w-9 rounded-full bg-transparent ${
              showChat
                    ? "text-cyan-500 hover:text-cyan-400"
                : "text-white/80 hover:text-white"
            } hover:bg-white/10`}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-full bg-transparent"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          {/* End Party (Host Only) */}
          {isHost && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEndParty}
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-600/20 bg-transparent"
            >
              End Party
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Video Area */}
        <div
          className={`relative flex-1 bg-black ${showChat ? "md:mr-80" : ""}`}
        >
          {/* Host View - Screen Share Controls */}
          {isHost && (
            <>
              {!isScreenSharing ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <div className="flex flex-col items-center gap-6 text-center p-8 max-w-md">
            <div className="w-24 h-24 rounded-full bg-cyan-600/20 flex items-center justify-center">
              <Monitor className="h-12 w-12 text-cyan-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        Share Your Screen
                      </h2>
                      <p className="text-white/60 mb-4">
                        Share your screen to start the watch party. Your guests
                        will see exactly what you see - including the video and
                        audio.
                      </p>
                      <p className="text-white/40 text-sm mb-6">
                        Tip: Open the video in another tab, then share that tab
                        for best results.
                      </p>
                    </div>
                    <Button
                      onClick={startScreenShare}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2 px-6 py-3"
                    >
                      <Monitor className="h-5 w-5" />
                      Start Screen Share
                    </Button>
                    {screenShareError && (
            <div className="bg-cyan-900/30 border border-cyan-500/50 rounded-lg p-4 text-left">
              <p className="text-cyan-400 text-sm">{screenShareError}</p>
                      </div>
                    )}
                    <p className="text-white/40 text-xs">
                      {participants.length} participant
                      {participants.length !== 1 ? "s" : ""} waiting
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Host's local preview */}
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                  />

                  {/* Stop sharing button */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                    <Button
                      onClick={stopScreenShare}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
                    >
                      <MonitorOff className="h-4 w-4" />
                      Stop Sharing
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Guest View - Remote Video */}
          {!isHost && (
            <>
              {room.isScreenSharing ? (
                <>
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                  />

                  {/* Connection status overlay */}
                  {connectionStatus !== "connected" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                      <div className="flex flex-col items-center gap-4 text-center max-w-md p-6">
                        {connectionStatus === "failed" ? (
                          <>
        <div className="w-16 h-16 rounded-full bg-cyan-600/20 flex items-center justify-center">
          <X className="h-8 w-8 text-cyan-500" />
                            </div>
                            <div>
                              <p className="text-white font-medium mb-2">
                                Connection Failed
                              </p>
                              <p className="text-white/60 text-sm mb-4">
                                Unable to connect to the host. This can happen due to network restrictions.
                              </p>
                              <Button
                                onClick={() => window.location.reload()}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                              >
                                Retry Connection
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <Loader2 className="h-10 w-10 text-cyan-600 animate-spin" />
                            <div>
                              <p className="text-white font-medium">
                                {connectionStatus === "connecting" ? "Establishing connection..." : "Connecting to host..."}
                              </p>
                              <p className="text-white/60 text-sm">
                                Status: {connectionStatus}
                              </p>
                              <p className="text-white/40 text-xs mt-2">
                                This may take a few seconds...
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <div className="flex flex-col items-center gap-6 text-center p-8 max-w-md">
            <div className="w-24 h-24 rounded-full bg-cyan-600/20 flex items-center justify-center">
              <Users className="h-12 w-12 text-cyan-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        Waiting for Host
                      </h2>
                      <p className="text-white/60">
                        {room.hostName} will start sharing their screen soon.
                        Get comfortable and chat with others while you wait!
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-white/40 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Waiting for screen share...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="fixed right-0 top-[57px] bottom-0 w-80 bg-zinc-900 border-l border-white/10 flex flex-col">
            {/* Participants */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-medium text-sm">
                  Participants ({participants.length})
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                      p.id === room.hostId
                        ? "bg-cyan-600/20 text-cyan-400 ring-1 ring-cyan-500/50"
                        : "bg-white/10 text-white/80"
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        p.id === room.hostId
                          ? "bg-cyan-500"
                          : "bg-green-500"
                      }`}
                    />
                    <span className="truncate max-w-[80px]">
                      {p.displayName}
                    </span>
                    {p.id === room.hostId && (
                      <span className="text-[10px] opacity-60">(Host)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Component */}
            <div className="flex-1 min-h-0">
              <WatchPartyChat roomId={roomId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
