export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getSeasonDetails } from "@/lib/tmdb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tvId: string; seasonNumber: string }> }
) {
  const { tvId, seasonNumber } = await params;
  
  try {
    const season = await getSeasonDetails(
      parseInt(tvId),
      parseInt(seasonNumber)
    );
    return NextResponse.json(season);
  } catch (error) {
    console.error("Error fetching season details:", error);
    return NextResponse.json(
      { error: "Failed to fetch season details" },
      { status: 500 }
    );
  }
}
