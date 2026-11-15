import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const heroId = searchParams.get("heroId")?.trim();

  try {
    const apiUrl = new URL("https://api.deadlock-api.com/v1/analytics/item-stats");
    if (heroId && /^\d+$/.test(heroId)) {
      apiUrl.searchParams.set("hero_id", heroId);
    }

    const res = await fetch(apiUrl.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ stats: {} }, { status: 200 });
    }

    const raw = (await res.json()) as Array<{
      item_id: number;
      wins: number;
      matches: number;
    }>;

    const stats: Record<number, { winRate: number; matches: number }> = {};
    if (Array.isArray(raw)) {
      for (const row of raw) {
        if (!row.item_id || !row.matches || row.matches < 50) continue;
        stats[row.item_id] = {
          winRate: (row.wins / row.matches) * 100,
          matches: row.matches,
        };
      }
    }

    return NextResponse.json({ stats });
  } catch {
    return NextResponse.json({ stats: {} }, { status: 200 });
  }
}