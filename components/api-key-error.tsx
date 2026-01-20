import { AlertCircle, ExternalLink, Key } from "lucide-react";
import Link from "next/link";

interface ApiKeyErrorProps {
  error: string;
}

export function ApiKeyError({ error }: ApiKeyErrorProps) {
  const isInvalidKey = error.includes("Invalid API key") || error.includes("401");
  const isMissingKey = error.includes("TMDB_API_KEY is not configured");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-card border border-border rounded-xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          {isInvalidKey || isMissingKey ? (
            <Key className="w-8 h-8 text-primary" />
          ) : (
            <AlertCircle className="w-8 h-8 text-primary" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">
          {isMissingKey
            ? "TMDB API Key Required"
            : isInvalidKey
              ? "Invalid TMDB API Key"
              : "Connection Error"}
        </h1>

        <p className="text-muted-foreground mb-6">
          {isMissingKey
            ? "To display movies and TV shows, you need to add a valid TMDB API key to your environment variables."
            : isInvalidKey
              ? "The TMDB API key you provided is invalid or has been revoked. Please get a new API key."
              : "Unable to connect to TMDB. Please check your internet connection and try again."}
        </p>

        <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-sm text-foreground mb-2">How to get a TMDB API Key:</h3>
          <ol className="text-sm text-muted-foreground space-y-2">
            <li>1. Go to <Link href="https://www.themoviedb.org/signup" target="_blank" className="text-primary hover:underline">themoviedb.org/signup</Link> and create an account</li>
            <li>2. Go to Settings &gt; API and request an API key</li>
            <li>3. Copy the API Key (v3 auth)</li>
            <li>4. Add it to your environment variables as <code className="bg-background px-1.5 py-0.5 rounded text-xs">TMDB_API_KEY</code></li>
          </ol>
        </div>

        <Link
          href="https://www.themoviedb.org/settings/api"
          target="_blank"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          Get TMDB API Key
          <ExternalLink className="w-4 h-4" />
        </Link>

        {!isMissingKey && !isInvalidKey && (
          <div className="mt-6 p-3 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive font-mono break-all">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
