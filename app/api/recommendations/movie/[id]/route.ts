export const runtime = "edge";

import { NextResponse } from "next/server";

const TMDB_API_KEY = "27a762a871783dd36ae2b8b74c6bf8de";
const BASE_URL = "https://api.themoviedb.org/3";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId)) {
      return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
    }

    // Get recommendations from TMDB
    const response = await fetch(
      `${BASE_URL}/movie/${movieId}/recommendations?api_key=${TMDB_API_KEY}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch recommendations");
    }

    const data = await response.json();

    return NextResponse.json({
      results: data.results.map((movie: Record<string, unknown>) => ({
        ...movie,
        media_type: "movie",
      })),
    });
  } catch (error) {
    console.error("Error fetching movie recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
