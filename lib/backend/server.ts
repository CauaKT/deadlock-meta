import { cookies } from "next/headers";
import type {
  AuthUser,
  CommunityProfileItem,
  FullProfile,
  PublicProfile,
  TierListItem,
} from "./types";

const SESSION_COOKIE = "lockpro_session";

function apiUrl(path: string): string {
  const base = (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001"
  ).replace(/\/+$/, "");
  return `${base}${path}`;
}

async function getCookieHeader(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? { Cookie: `${SESSION_COOKIE}=${token}` } : {};
}

interface ApiUserPayload {
  id: string;
  email: string;
  createdAt: string;
  profile: {
    username: string | null;
    handle: string | null;
    avatarUrl: string | null;
  } | null;
}

export async function getServerAuthUser(): Promise<AuthUser | null> {
  const headers = await getCookieHeader();
  if (!headers.Cookie) return null;

  try {
    const res = await fetch(apiUrl("/auth/me"), {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: ApiUserPayload };
    const u = data.user;
    if (!u) return null;
    const fallbackName = u.email.split("@")[0] || "";
    return {
      id: u.id,
      email: u.email,
      createdAt: u.createdAt ?? null,
      suggestedUsername: u.profile?.username || fallbackName,
      suggestedFullName: u.profile?.username || fallbackName,
      suggestedAvatarUrl: u.profile?.avatarUrl ?? null,
    };
  } catch {
    return null;
  }
}

interface ApiOwnProfileResponse {
  profile: {
    id: string;
    username: string | null;
    bio: string | null;
    handle: string | null;
    avatarUrl: string | null;
    steamId: string | null;
    favoriteHeroId: number | null;
    bannerHeroId: number | null;
    bannerImage: string | null;
    profileColor: string | null;
  } | null;
}

export async function getOwnFullProfile(
  _userId: string,
): Promise<FullProfile | null> {
  const headers = await getCookieHeader();
  if (!headers.Cookie) return null;

  try {
    const res = await fetch(apiUrl("/profiles/me"), {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ApiOwnProfileResponse;
    const p = data.profile;
    if (!p) return null;
    return {
      id: p.id,
      username: p.username,
      bio: p.bio,
      handle: p.handle,
      avatar_url: p.avatarUrl,
      steam_id: p.steamId,
      favorite_hero_id: p.favoriteHeroId,
      banner_hero_id: p.bannerHeroId,
      banner_image: p.bannerImage,
      profile_color: p.profileColor,
    };
  } catch {
    return null;
  }
}

interface ApiCommunityItem {
  id: string;
  username: string | null;
  handle: string | null;
  avatarUrl: string | null;
  favoriteHeroId: number | null;
}

export async function getCommunityProfiles(
  _excludeUserId: string,
  limit = 8,
): Promise<CommunityProfileItem[]> {
  const headers = await getCookieHeader();
  try {
    const res = await fetch(apiUrl(`/profiles/community?limit=${limit}`), {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as ApiCommunityItem[];
    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      handle: r.handle,
      avatar_url: r.avatarUrl,
      favorite_hero_id: r.favoriteHeroId,
    }));
  } catch {
    return [];
  }
}

interface ApiPublicProfileResponse {
  id: string;
  username: string | null;
  handle: string | null;
  avatarUrl: string | null;
  favoriteHeroId: number | null;
  bio: string | null;
  bannerHeroId: number | null;
  bannerImage: string | null;
  profileColor: string | null;
  createdAt?: string | null;
}

export async function getPublicProfileByHandle(
  handle: string,
): Promise<PublicProfile | null> {
  try {
    const res = await fetch(
      apiUrl(`/profiles/by-handle/${encodeURIComponent(handle)}`),
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const p = (await res.json()) as ApiPublicProfileResponse;
    return {
      id: p.id,
      username: p.username,
      handle: p.handle,
      avatar_url: p.avatarUrl,
      favorite_hero_id: p.favoriteHeroId,
      bio: p.bio,
      banner_hero_id: p.bannerHeroId,
      banner_image: p.bannerImage,
      profile_color: p.profileColor,
      createdAt: p.createdAt ?? null,
    };
  } catch {
    return null;
  }
}

export async function getServerTierLists(params?: {
  handle?: string | null;
  userId?: string | null;
}): Promise<TierListItem[]> {
  const headers = await getCookieHeader();
  const qs = new URLSearchParams();
  if (params?.handle) qs.set("handle", params.handle);
  else if (params?.userId) qs.set("userId", params.userId);
  const query = qs.toString();

  try {
    const res = await fetch(apiUrl(`/tier-lists${query ? `?${query}` : ""}`), {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as TierListItem[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getPublicTierListById(
  id: string,
): Promise<TierListItem | null> {
  try {
    const res = await fetch(apiUrl(`/tier-lists/${encodeURIComponent(id)}`), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as TierListItem;
  } catch {
    return null;
  }
}