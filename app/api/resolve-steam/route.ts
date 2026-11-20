import { NextResponse } from "next/server";

const STEAM64_BASE = BigInt("76561197960265728");

function parseSteamIdString(raw: string): string | null {
  if (/^\d{5,20}$/.test(raw)) return raw;

  // SteamID3: [U:1:888394530]
  const id3 = raw.match(/^\[U:1:(\d+)\]$/i);
  if (id3) {
    return (STEAM64_BASE + BigInt(id3[1])).toString();
  }

  // SteamID2: STEAM_0:1:444197265
  const id2 = raw.match(/^STEAM_[01]:([01]):(\d+)$/i);
  if (id2) {
    const y = BigInt(id2[1]);
    const z = BigInt(id2[2]);
    return (STEAM64_BASE + z * BigInt(2) + y).toString();
  }

  return null;
}

async function resolveVanity(vanity: string) {
  const clean = encodeURIComponent(vanity);
  const res = await fetch(`https://steamcommunity.com/id/${clean}/?xml=1`, {
    signal: AbortSignal.timeout(4500),
  });
  if (!res.ok) return null;

  const xml = await res.text();
  const idMatch = xml.match(/<steamID64>(\d{17})<\/steamID64>/);
  if (!idMatch) return null;

  const nameMatch = xml.match(/<steamID><!\[CDATA\[([\s\S]*?)\]\]><\/steamID>/);
  return {
    steamId: idMatch[1],
    personaName: nameMatch?.[1]?.trim() || null,
  };
}

async function resolveViaDeadlockSearch(query: string) {
  const res = await fetch(
    `https://api.deadlock-api.com/v1/players/steam-search?search_query=${encodeURIComponent(query)}&limit=5`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4500),
    },
  );
  if (!res.ok) return null;

  const rows = (await res.json()) as Array<{
    account_id?: number;
    personaname?: string | null;
  }>;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const lower = query.trim().toLowerCase();
  const exact = rows.find(
    (r) => typeof r.personaname === "string" && r.personaname.trim().toLowerCase() === lower,
  );
  const chosen = exact ?? rows[0];
  if (!chosen || typeof chosen.account_id !== "number" || chosen.account_id <= 0) return null;

  return {
    steamId: (STEAM64_BASE + BigInt(chosen.account_id)).toString(),
    personaName: chosen.personaname?.trim() || null,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawInput = (searchParams.get("q") || "").trim();
  const mode = searchParams.get("mode");
  const raw = rawInput.replace(/^@+/, "").trim();

  if (!raw) {
    return NextResponse.json({ error: "Parâmetro vazio." }, { status: 400 });
  }

  const directId = parseSteamIdString(raw);
  if (directId) {
    return NextResponse.json({ steamId: directId });
  }

  // Link /profiles/7656119...
  const profileMatch = raw.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (profileMatch) {
    return NextResponse.json({ steamId: profileMatch[1] });
  }

  try {
    // Link curto s.team/p/...
    if (/s\.team\/p\//i.test(raw)) {
      const target = raw.startsWith("http") ? raw : `https://${raw}`;
      const res = await fetch(target, {
        redirect: "follow",
        signal: AbortSignal.timeout(4500),
      });
      const finalUrl = res.url || "";
      const pMatch = finalUrl.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
      if (pMatch) return NextResponse.json({ steamId: pMatch[1] });

      const vMatch = finalUrl.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
      if (vMatch) {
        const resolved = await resolveVanity(vMatch[1]);
        if (resolved) return NextResponse.json(resolved);
      }
      return NextResponse.json({ error: "Não foi possível resolver este link curto da Steam." }, { status: 404 });
    }

    // Link /id/vanity
    const vanityMatch = raw.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
    if (vanityMatch) {
      const resolved = await resolveVanity(vanityMatch[1]);
      if (!resolved) {
        return NextResponse.json({ error: "Perfil Steam não encontrado." }, { status: 404 });
      }
      return NextResponse.json(resolved);
    }

    // Busca explícita por vanity name ou nick (sem URL)
    if (mode === "vanity" && raw.length >= 2 && raw.length <= 64) {
      const resolved =
        (/^[a-zA-Z0-9_-]{2,64}$/.test(raw) ? await resolveVanity(raw) : null) ??
        (await resolveViaDeadlockSearch(raw));
      if (!resolved) {
        return NextResponse.json({ error: "Perfil Steam não encontrado." }, { status: 404 });
      }
      return NextResponse.json(resolved);
    }
  } catch {
    return NextResponse.json({ error: "Tempo esgotado ao consultar a Steam." }, { status: 504 });
  }

  return NextResponse.json({ error: "Formato de link Steam inválido." }, { status: 400 });
}