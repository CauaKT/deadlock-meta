import { NextResponse } from "next/server";
import { fetchItemsAnalytics, SAMPLE_THRESHOLDS } from "@/lib/deadlock";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const heroIdRaw = searchParams.get("heroId")?.trim();
  const heroId = heroIdRaw && /^\d+$/.test(heroIdRaw) ? Number(heroIdRaw) : undefined;

  try {
    const raw = await fetchItemsAnalytics(undefined, undefined, heroId);
    const stats: Record<number, { winRate: number; matches: number }> = {};

    for (const row of raw) {
      if (!row.item_id || !row.matches || row.matches < SAMPLE_THRESHOLDS.itemStatsCalculator) {
        continue;
      }
      stats[row.item_id] = {
        winRate: (row.wins / row.matches) * 100,
        matches: row.matches,
      };
    }

    return NextResponse.json({ stats });
  } catch {
    return NextResponse.json({ stats: {} }, { status: 200 });
  }
}