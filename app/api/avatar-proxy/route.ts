import { NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "avatars.steamstatic.com",
  "avatars.akamai.steamstatic.com",
  "avatars.fastly.steamstatic.com",
  "steamcdn-a.akamaihd.net",
  "cdn.cloudflare.steamstatic.com",
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url")?.trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "URL ausente." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    return NextResponse.json({ error: "Host não permitido." }, { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86400 },
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: "Falha ao carregar avatar." }, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Conteúdo inválido." }, { status: 415 });
    }

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar avatar." }, { status: 502 });
  }
}