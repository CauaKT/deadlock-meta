import { cookies } from "next/headers";
import type {
  AuthUser,
  CommunityBuildItem,
  CommunityProfileItem,
  FeedResponse,
  FriendsOverview,
  FullProfile,
  PublicFriendsResponse,
  PublicProfile,
  SocialLinks,
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
  role?: "USER" | "ADMIN";
  emailVerified?: boolean;
  emailVerificationRequired?: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  profile: {
    username: string | null;
    handle: string | null;
    handleConfirmed?: boolean;
    avatarUrl: string | null;
    favoriteHeroId?: number | null;
  } | null;
}

export async function getServerAuthState(): Promise<{
  user: AuthUser | null;
  apiUnavailable: boolean;
}> {
  const headers = await getCookieHeader();
  if (!headers.Cookie) return { user: null, apiUnavailable: false };

  try {
    const res = await fetch(apiUrl("/auth/me"), {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (res.status === 401 || res.status === 403) {
      return { user: null, apiUnavailable: false };
    }
    if (!res.ok) {
      return { user: null, apiUnavailable: true };
    }
    const data = (await res.json()) as { user?: ApiUserPayload };
    const u = data.user;
    if (!u) return { user: null, apiUnavailable: false };
    const fallbackName = u.email.split("@")[0] || "";
    return {
      apiUnavailable: false,
      user: {
        id: u.id,
        email: u.email,
        role: u.role === "ADMIN" ? "ADMIN" : "USER",
        emailVerified: Boolean(u.emailVerified),
        emailVerificationRequired: Boolean(u.emailVerificationRequired),
        mustChangePassword: Boolean(u.mustChangePassword),
        createdAt: u.createdAt ?? null,
        suggestedUsername: u.profile?.username || fallbackName,
        suggestedFullName: u.profile?.username || fallbackName,
        suggestedAvatarUrl: u.profile?.avatarUrl ?? null,
        profile: u.profile
          ? {
              username: u.profile.username,
              handle: u.profile.handle,
              handle_confirmed: u.profile.handleConfirmed ?? Boolean(u.profile.handle),
              avatar_url: u.profile.avatarUrl,
              favorite_hero_id: u.profile.favoriteHeroId ?? null,
            }
          : null,
      },
    };
  } catch {
    return { user: null, apiUnavailable: true };
  }
}

export async function getServerAuthUser(): Promise<AuthUser | null> {
  const { user } = await getServerAuthState();
  return user;
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
    bannerNsfw?: boolean;
    profileColor: string | null;
    socialLinks?: SocialLinks | null;
    friendsPublic?: boolean;
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
      banner_nsfw: Boolean(p.bannerNsfw),
      profile_color: p.profileColor,
      social_links: p.socialLinks ?? null,
      friends_public: p.friendsPublic ?? true,
    };
  } catch {
    return null;
  }
}

interface ApiCommunityItem {
  id: string;
  userId?: string;
  username: string | null;
  handle: string | null;
  avatarUrl: string | null;
  favoriteHeroId: number | null;
  mutualFriendsCount?: number;
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
      user_id: r.userId,
      username: r.username,
      handle: r.handle,
      avatar_url: r.avatarUrl,
      favorite_hero_id: r.favoriteHeroId,
      mutual_friends_count: r.mutualFriendsCount ?? 0,
    }));
  } catch {
    return [];
  }
}

interface ApiPublicProfileResponse {
  id: string;
  userId?: string;
  username: string | null;
  handle: string | null;
  avatarUrl: string | null;
  favoriteHeroId: number | null;
  bio: string | null;
  bannerHeroId: number | null;
  bannerImage: string | null;
  bannerNsfw?: boolean;
  profileColor: string | null;
  socialLinks?: SocialLinks | null;
  friendsPublic?: boolean;
  createdAt?: string | null;
}

export async function getPublicProfileResult(
  handle: string,
): Promise<{ profile: PublicProfile | null; apiUnavailable: boolean }> {
  try {
    const res = await fetch(
      apiUrl(`/profiles/by-handle/${encodeURIComponent(handle)}`),
      { cache: "no-store", signal: AbortSignal.timeout(12000) },
    );
    if (res.status === 404) {
      return { profile: null, apiUnavailable: false };
    }
    if (!res.ok) {
      return { profile: null, apiUnavailable: true };
    }
    const p = (await res.json()) as ApiPublicProfileResponse;
    return {
      apiUnavailable: false,
      profile: {
        id: p.id,
        user_id: p.userId,
        username: p.username,
        handle: p.handle,
        avatar_url: p.avatarUrl,
        favorite_hero_id: p.favoriteHeroId,
        bio: p.bio,
        banner_hero_id: p.bannerHeroId,
        banner_image: p.bannerImage,
        banner_nsfw: Boolean(p.bannerNsfw),
        profile_color: p.profileColor,
        social_links: p.socialLinks ?? null,
        friends_public: p.friendsPublic ?? true,
        createdAt: p.createdAt ?? null,
      },
    };
  } catch {
    return { profile: null, apiUnavailable: true };
  }
}

export async function getPublicProfileByHandle(
  handle: string,
): Promise<PublicProfile | null> {
  const { profile } = await getPublicProfileResult(handle);
  return profile;
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

export async function getServerFeedPosts(
  page = 1,
  limit = 20,
): Promise<FeedResponse> {
  try {
    const headers = await getCookieHeader();
    const res = await fetch(apiUrl(`/feed?page=${page}&limit=${limit}`), {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return { items: [], page, hasMore: false };
    return (await res.json()) as FeedResponse;
  } catch {
    return { items: [], page, hasMore: false };
  }
}

export async function getServerFriendsOverview(): Promise<FriendsOverview> {
  const headers = await getCookieHeader();
  if (!headers.Cookie) return { friends: [], incoming: [], outgoing: [] };
  try {
    const res = await fetch(apiUrl("/friends/me"), {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return { friends: [], incoming: [], outgoing: [] };
    return (await res.json()) as FriendsOverview;
  } catch {
    return { friends: [], incoming: [], outgoing: [] };
  }
}

export async function getServerFriendsByHandle(
  handle: string,
): Promise<PublicFriendsResponse> {
  try {
    const headers = await getCookieHeader();
    const res = await fetch(apiUrl(`/friends/by-handle/${encodeURIComponent(handle)}`), {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return { friendsPublic: true, hidden: false, friends: [] };
    return (await res.json()) as PublicFriendsResponse;
  } catch {
    return { friendsPublic: true, hidden: false, friends: [] };
  }
}

export async function getServerBuilds(params?: {
  heroId?: number;
  handle?: string | null;
  userId?: string | null;
}): Promise<CommunityBuildItem[]> {
  try {
    const qs = new URLSearchParams();
    if (params?.heroId) qs.set("heroId", String(params.heroId));
    if (params?.handle) qs.set("handle", params.handle);
    if (params?.userId) qs.set("userId", params.userId);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    const res = await fetch(apiUrl(`/builds${suffix}`), {
      headers: await getCookieHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as CommunityBuildItem[];
  } catch {
    return [];
  }
}

export async function getPublicBuildById(
  id: string,
): Promise<CommunityBuildItem | null> {
  try {
    const res = await fetch(apiUrl(`/builds/${encodeURIComponent(id)}`), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as CommunityBuildItem;
  } catch {
    return null;
  }
}

export async function getPublicProfileHandleBySteam(
  steamId: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      apiUrl(`/profiles/by-steam/${encodeURIComponent(steamId)}`),
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    const data = JSON.parse(text) as { handle?: string | null };
    return data?.handle ?? null;
  } catch {
    return null;
  }
}