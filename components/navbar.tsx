"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Search, Menu, X, User, LogOut, Clock, Heart, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const navLinks = [
  { href: "/", label: "Discover" },
  { href: "/movies", label: "Cinema" },
  { href: "/tv", label: "Series" },
  { href: "/browse", label: "Explore" },
  { href: "/watch-party", label: "Together" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, loading, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isWatchPartyRoom = pathname?.startsWith("/watch-party/") && pathname !== "/watch-party/";
  
  if (isWatchPartyRoom) {
    return null;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery("");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    router.push("/");
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          "px-4 md:px-6 lg:px-8"
        )}
      >
        <div 
          className={cn(
            "mx-auto max-w-7xl transition-all duration-500",
            isScrolled 
              ? "mt-3 rounded-3xl glass-strong shadow-2xl border border-white/10" 
              : "mt-6 rounded-full glass border border-white/5"
          )}
        >
          <div className="flex items-center justify-between px-4 md:px-6 h-16 md:h-18">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <Sparkles className="h-6 w-6 text-primary transition-transform group-hover:scale-110 group-hover:rotate-12" />
                <div className="absolute inset-0 blur-xl opacity-50 group-hover:opacity-100 transition-opacity bg-primary rounded-full" />
              </div>
              <span className="text-xl md:text-2xl font-display font-bold text-gradient tracking-tight hidden sm:inline">
                StreamVerse
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative px-4 py-2 text-sm font-medium transition-all duration-300 rounded-full",
                      "hover:bg-white/5",
                      isActive 
                        ? "text-primary" 
                        : "text-foreground/70 hover:text-foreground"
                    )}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute inset-x-2 -bottom-0.5 h-0.5 bg-gradient-to-r from-primary via-accent to-primary rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                {showSearch ? (
                  <form onSubmit={handleSearch} className="flex items-center animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search everything..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-48 md:w-64 h-10 pl-4 pr-10 bg-black/30 border-white/20 text-foreground placeholder:text-muted-foreground rounded-full backdrop-blur-xl"
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-white/10"
                        onClick={() => {
                          setShowSearch(false);
                          setSearchQuery("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSearch(true)}
                    className="h-10 w-10 rounded-full text-foreground/70 hover:text-foreground hover:bg-white/5"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Auth Section - Desktop */}
              <div className="hidden md:flex items-center gap-2">
                {!loading && (
                  <>
                    {user ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="relative rounded-full p-0 h-10 w-10 hover:bg-white/5">
                            <Avatar className="w-10 h-10 ring-2 ring-primary/20 transition-all hover:ring-primary/40">
                              {userProfile?.photoURL && <AvatarImage src={userProfile.photoURL || "/placeholder.svg"} alt={userProfile.displayName || "User"} />}
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary text-sm font-medium">
                                {(userProfile?.displayName || user.email || "U").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 mt-2 bg-background border-2 border-primary/30 shadow-xl shadow-primary/20">
                          <div className="px-3 py-3 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
                            <p className="text-sm font-semibold text-foreground">
                              {userProfile?.displayName || "User"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {user.email}
                            </p>
                          </div>
                          <DropdownMenuSeparator className="bg-primary/20" />
                          <DropdownMenuItem asChild>
                            <Link href="/profile" className="cursor-pointer flex items-center gap-3 px-3 py-2 focus:bg-primary/10 hover:bg-primary/10 focus:text-foreground hover:text-foreground">
                              <User className="h-4 w-4 text-primary" />
                              <span>Profile</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/profile?tab=history" className="cursor-pointer flex items-center gap-3 px-3 py-2 focus:bg-primary/10 hover:bg-primary/10 focus:text-foreground hover:text-foreground">
                              <Clock className="h-4 w-4 text-primary" />
                              <span>Watch History</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/profile?tab=mylist" className="cursor-pointer flex items-center gap-3 px-3 py-2 focus:bg-primary/10 hover:bg-primary/10 focus:text-foreground hover:text-foreground">
                              <Heart className="h-4 w-4 text-primary" />
                              <span>My List</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/watch-party" className="cursor-pointer flex items-center gap-3 px-3 py-2 focus:bg-primary/10 hover:bg-primary/10 focus:text-foreground hover:text-foreground">
                              <Users className="h-4 w-4 text-primary" />
                              <span>Watch Party</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer flex items-center gap-3 px-3 py-2 focus:bg-primary/10 hover:bg-primary/10 focus:text-foreground hover:text-foreground">
                            <LogOut className="h-4 w-4 text-primary" />
                            <span>Sign Out</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          asChild
                          className="rounded-full hover:bg-white/5"
                        >
                          <Link href="/login">Sign In</Link>
                        </Button>
                        <Button 
                          size="sm" 
                          asChild
                          className="rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
                        >
                          <Link href="/register">Get Started</Link>
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-10 w-10 rounded-full text-foreground hover:bg-white/5"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute top-24 left-4 right-4 glass-card rounded-3xl p-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "px-4 py-3 text-sm font-medium transition-all rounded-2xl",
                      isActive 
                        ? "bg-gradient-to-r from-primary/20 to-accent/20 text-primary" 
                        : "text-foreground/80 hover:bg-white/5"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
              
              <div className="h-px bg-white/10 my-2" />
              
              {!loading && (
                <>
                  {user ? (
                    <>
                      <Link
                        href="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-white/5 rounded-2xl"
                      >
                        <User className="h-4 w-4 text-primary" />
                        Profile
                      </Link>
                      <Link
                        href="/watch-party"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-white/5 rounded-2xl"
                      >
                        <Users className="h-4 w-4 text-primary" />
                        Watch Party
                      </Link>
                      <button
                        onClick={() => {
                          handleSignOut();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-white/5 rounded-2xl cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 text-primary" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-white/5 rounded-2xl block text-center"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/register"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 text-sm font-medium text-primary hover:bg-white/5 rounded-2xl block text-center bg-gradient-to-r from-primary/10 to-accent/10"
                      >
                        Get Started
                      </Link>
                    </>
                  )}
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
