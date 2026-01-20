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
    const tvId = parseInt(id);

    if (isNaN(tvId)) {
      return NextResponse.json({ error: "Invalid TV show ID" }, { status: 400 });
    }

    // Get recommendations from TMDB
    const response = await fetch(
      `${BASE_URL}/tv/${tvId}/recommendations?api_key=${TMDB_API_KEY}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch recommendations");
    }

    const data = await response.json();

    return NextResponse.json({
      results: data.results.map((show: Record<string, unknown>) => ({
        ...show,
        media_type: "tv",
      })),
    });
  } catch (error) {
    console.error("Error fetching TV recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
