import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("q") || "").trim();
  if (!raw) {
    return NextResponse.json({ error: "Parâmetro vazio." }, { status: 400 });
  }

  // Já é numérico (SteamID64 ou AccountID)
  if (/^\d{5,20}$/.test(raw)) {
    return NextResponse.json({ steamId: raw });
  }

  // Link /profiles/7656119...
  const profileMatch = raw.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (profileMatch) {
    return NextResponse.json({ steamId: profileMatch[1] });
  }

  // Link /id/vanity
  const vanityMatch = raw.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  if (vanityMatch) {
    const vanity = encodeURIComponent(vanityMatch[1]);
    try {
      const res = await fetch(`https://steamcommunity.com/id/${vanity}/?xml=1`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) {
        return NextResponse.json({ error: "Perfil Steam não encontrado." }, { status: 404 });
      }
      const xml = await res.text();
      const idMatch = xml.match(/<steamID64>(\d{17})<\/steamID64>/);
      if (!idMatch) {
        return NextResponse.json({ error: "Não foi possível resolver este perfil Steam." }, { status: 404 });
      }
      return NextResponse.json({ steamId: idMatch[1] });
    } catch {
      return NextResponse.json({ error: "Tempo esgotado ao consultar a Steam." }, { status: 504 });
    }
  }

  return NextResponse.json({ error: "Formato de link Steam inválido." }, { status: 400 });
}