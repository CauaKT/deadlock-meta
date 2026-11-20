import type {
  AdminOverview,
  AdminUsersResponse,
  AuthUser,
  CommunityBuildItem,
  CommunityProfileItem,
  SaveBuildInput,
  FeedComment,
  FeedPost,
  FeedResponse,
  FriendsOverview,
  OnboardingProfile,
  ProfileSummary,
  SavedAccount,
  SaveTierListInput,
  SocialLinks,
  TierListItem,
} from "./types";

const AUTH_EVENT = "lockpro-auth-changed";

function apiUrl(path: string): string {
  return `/api/backend${path}`;
}

function notifyAuthChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

interface ApiUserPayload {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  emailVerified: boolean;
  emailVerificationRequired?: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  profile: {
    username: string | null;
    handle: string | null;
    handleConfirmed?: boolean;
    avatarUrl: string | null;
    favoriteHeroId: number | null;
  } | null;
}

function mapApiUser(u: ApiUserPayload): AuthUser {
  const fallbackName = u.email.split("@")[0] || "";
  return {
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
          favorite_hero_id: u.profile.favoriteHeroId,
        }
      : null,
  };
}

async function parseJsonSafe(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractError(data: Record<string, unknown> | null, fallback: string): string {
  if (!data) return fallback;
  const msg = data.message;
  if (Array.isArray(msg) && msg.length > 0) return String(msg[0]);
  if (typeof msg === "string" && msg.trim()) return msg;
  return fallback;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; message: string; unverified?: boolean }> {
  try {
    const res = await fetch(apiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      const message = extractError(data, "Não foi possível fazer login.");
      return {
        ok: false,
        message,
        unverified: res.status === 403 && message.toLowerCase().includes("confirmado"),
      };
    }
    notifyAuthChanged();
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export type ApiWakeStage = "connecting" | "waking" | "checking_db" | "ready";

export async function waitForApiReady(options?: {
  timeoutMs?: number;
  signal?: AbortSignal;
  onStage?: (stage: ApiWakeStage) => void;
}): Promise<{ ready: boolean; aborted?: boolean }> {
  const timeoutMs = options?.timeoutMs ?? 90_000;
  const startedAt = Date.now();
  let attempt = 0;

  options?.onStage?.("connecting");

  while (Date.now() - startedAt < timeoutMs) {
    if (options?.signal?.aborted) {
      return { ready: false, aborted: true };
    }

    attempt += 1;
    if (attempt >= 1 && Date.now() - startedAt > 1200) {
      options?.onStage?.("waking");
    }

    const attemptController = new AbortController();
    const attemptTimer = setTimeout(() => attemptController.abort(), 8000);
    const onExternalAbort = () => attemptController.abort();
    options?.signal?.addEventListener("abort", onExternalAbort, { once: true });

    try {
      const res = await fetch(apiUrl("/health"), {
        method: "GET",
        cache: "no-store",
        signal: attemptController.signal,
      });

      if (res.ok) {
        options?.onStage?.("checking_db");
        const data = (await res.json().catch(() => null)) as { status?: string; db?: string } | null;
        if (data?.status === "ok" && data?.db === "up") {
          options?.onStage?.("ready");
          return { ready: true };
        }
      }
    } catch {
      // Render em cold start ou timeout curto desta tentativa; tenta novamente abaixo
    } finally {
      clearTimeout(attemptTimer);
      options?.signal?.removeEventListener("abort", onExternalAbort);
    }

    if (options?.signal?.aborted) {
      return { ready: false, aborted: true };
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  return { ready: false };
}

export async function signInWithGoogle(
  nextRoute: string,
  options?: {
    onSlowWake?: () => void;
    onStage?: (stage: ApiWakeStage) => void;
    signal?: AbortSignal;
  },
): Promise<{ ok: true } | { ok: false; message: string; aborted?: boolean }> {
  const slowTimer = options?.onSlowWake
    ? setTimeout(() => {
        options.onSlowWake?.();
      }, 700)
    : null;

  const { ready, aborted } = await waitForApiReady({
    signal: options?.signal,
    onStage: options?.onStage,
  });

  if (slowTimer) clearTimeout(slowTimer);

  if (aborted) {
    return { ok: false, message: "", aborted: true };
  }

  if (!ready) {
    return {
      ok: false,
      message: "O servidor demorou para responder. Tente novamente em alguns segundos.",
    };
  }

  window.location.href = apiUrl(`/auth/google?next=${encodeURIComponent(nextRoute)}`);
  return { ok: true };
}

export async function signInWithSteam(
  nextRoute: string,
  options?: {
    onSlowWake?: () => void;
    onStage?: (stage: ApiWakeStage) => void;
    signal?: AbortSignal;
  },
): Promise<{ ok: true } | { ok: false; message: string; aborted?: boolean }> {
  const slowTimer = options?.onSlowWake
    ? setTimeout(() => {
        options.onSlowWake?.();
      }, 700)
    : null;

  const { ready, aborted } = await waitForApiReady({
    signal: options?.signal,
    onStage: options?.onStage,
  });

  if (slowTimer) clearTimeout(slowTimer);

  if (aborted) {
    return { ok: false, message: "", aborted: true };
  }

  if (!ready) {
    return {
      ok: false,
      message: "O servidor demorou para responder. Tente novamente em alguns segundos.",
    };
  }

  window.location.href = apiUrl(`/auth/steam?next=${encodeURIComponent(nextRoute)}`);
  return { ok: true };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  username: string,
): Promise<{ ok: true; sessionActive: boolean } | { ok: false; message: string }> {
  try {
    const res = await fetch(apiUrl("/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, username }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Erro ao criar conta.") };
    }
    const sessionActive = data?.requiresEmailVerification === false;
    if (sessionActive) notifyAuthChanged();
    return { ok: true, sessionActive };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function resendVerificationEmail(
  email: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(apiUrl("/auth/resend-verification"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Não foi possível reenviar.") };
    }
    return {
      ok: true,
      message: extractError(data, "Se o e-mail estiver pendente, enviaremos um novo link."),
    };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function requestPasswordReset(
  email: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(apiUrl("/auth/forgot-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Não foi possível enviar o e-mail.") };
    }
    return {
      ok: true,
      message: extractError(data, "Se o e-mail estiver cadastrado, enviaremos as instruções."),
    };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(apiUrl("/auth/reset-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Token inválido ou expirado.") };
    }
    return { ok: true, message: extractError(data, "Senha redefinida com sucesso!") };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function signOut(options?: { keepSavedAccount?: boolean }): Promise<void> {
  const path = options?.keepSavedAccount ? "/auth/logout?keepAccount=1" : "/auth/logout";
  try {
    await fetch(apiUrl(path), {
      method: "POST",
      credentials: "include",
    });
  } finally {
    notifyAuthChanged();
  }
}

export async function getCurrentClientUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch(apiUrl("/auth/me"), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: ApiUserPayload };
    return data.user ? mapApiUser(data.user) : null;
  } catch {
    return null;
  }
}

export function subscribeToAuthChanges(
  onChange: (user: AuthUser | null) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    void getCurrentClientUser().then(onChange);
  };
  window.addEventListener(AUTH_EVENT, handler);
  return () => window.removeEventListener(AUTH_EVENT, handler);
}

interface ApiOwnProfileResponse {
  profile: {
    username: string | null;
    handle: string | null;
    avatarUrl: string | null;
    favoriteHeroId: number | null;
  } | null;
}

export async function getNavProfileSummary(
  _userId: string,
): Promise<{ data: ProfileSummary | null; error: boolean }> {
  try {
    const res = await fetch(apiUrl("/profiles/me"), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return { data: null, error: true };
    const data = (await res.json()) as ApiOwnProfileResponse;
    const p = data.profile;
    return {
      data: p
        ? {
            username: p.username,
            avatar_url: p.avatarUrl,
            favorite_hero_id: p.favoriteHeroId,
            handle: p.handle,
          }
        : null,
      error: false,
    };
  } catch {
    return { data: null, error: true };
  }
}

export async function getOnboardingStatus(
  _userId: string,
): Promise<OnboardingProfile | null> {
  try {
    const res = await fetch(apiUrl("/profiles/me"), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ApiOwnProfileResponse;
    const p = data.profile;
    return p
      ? {
          username: p.username,
          avatar_url: p.avatarUrl,
          handle: p.handle,
        }
      : null;
  } catch {
    return null;
  }
}

export async function saveOnboardingProfile(
  _userId: string,
  input: {
    username: string;
    handle: string;
    avatar_url: string | null;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(apiUrl("/profiles/onboarding"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username: input.username,
        handle: input.handle,
        avatarUrl: input.avatar_url,
      }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Erro ao salvar perfil.") };
    }
    notifyAuthChanged();
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function updateProfileLook(
  _profileId: string,
  input: {
    username: string;
    bio: string | null;
    handle: string | null;
    avatar_url: string | null;
    banner_hero_id: number | null;
    banner_image: string | null;
    social_links?: SocialLinks | null;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(apiUrl("/profiles/me/look"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username: input.username,
        bio: input.bio,
        handle: input.handle,
        avatarUrl: input.avatar_url,
        bannerHeroId: input.banner_hero_id,
        bannerImage: input.banner_image,
        ...(input.social_links !== undefined ? { socialLinks: input.social_links } : {}),
      }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Não foi possível salvar.") };
    }
    notifyAuthChanged();
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function updateProfileSettings(
  _profileId: string,
  input: {
    username: string;
    steam_id: string;
    profile_color: string | null;
    favorite_hero_id: number | null;
    banner_hero_id: number | null;
    banner_image: string | null;
    social_links?: SocialLinks | null;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(apiUrl("/profiles/me/settings"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username: input.username,
        steamId: input.steam_id,
        profileColor: input.profile_color,
        favoriteHeroId: input.favorite_hero_id,
        bannerHeroId: input.banner_hero_id,
        bannerImage: input.banner_image,
        ...(input.social_links !== undefined ? { socialLinks: input.social_links } : {}),
      }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Erro ao salvar alterações.") };
    }
    notifyAuthChanged();
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function getCommunityTierLists(): Promise<TierListItem[]> {
  try {
    const res = await fetch(apiUrl("/tier-lists"), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as TierListItem[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getTierListById(
  id: string,
): Promise<{ ok: true; data: TierListItem } | { ok: false; message: string }> {
  try {
    const res = await fetch(apiUrl(`/tier-lists/${encodeURIComponent(id)}`), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      return { ok: false, message: extractError(data, "Tier list não encontrada.") };
    }
    const data = (await res.json()) as TierListItem;
    return { ok: true, data };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function createTierList(
  input: SaveTierListInput,
): Promise<{ ok: true; data: TierListItem } | { ok: false; status: number; message: string }> {
  try {
    const res = await fetch(apiUrl("/tier-lists"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      return {
        ok: false,
        status: res.status,
        message: extractError(data, "Não foi possível publicar a tier list."),
      };
    }
    const data = (await res.json()) as TierListItem;
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0, message: "Erro de conexão com a API." };
  }
}

export async function updateTierList(
  id: string,
  input: SaveTierListInput,
): Promise<{ ok: true; data: TierListItem } | { ok: false; status: number; message: string }> {
  try {
    const res = await fetch(apiUrl(`/tier-lists/${encodeURIComponent(id)}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      return {
        ok: false,
        status: res.status,
        message: extractError(data, "Não foi possível atualizar a tier list."),
      };
    }
    const data = (await res.json()) as TierListItem;
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0, message: "Erro de conexão com a API." };
  }
}

export async function deleteTierList(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(apiUrl(`/tier-lists/${encodeURIComponent(id)}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      return { ok: false, message: extractError(data, "Não foi possível excluir a tier list.") };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function getSavedAccounts(): Promise<SavedAccount[]> {
  try {
    const res = await fetch(apiUrl("/auth/accounts"), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { accounts?: SavedAccount[] };
    return Array.isArray(data.accounts) ? data.accounts : [];
  } catch {
    return [];
  }
}

export async function switchAccount(
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(apiUrl("/auth/switch-account"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Não foi possível trocar de conta.") };
    }
    notifyAuthChanged();
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function removeSavedAccount(
  userId: string,
): Promise<{ ok: boolean; removedCurrent: boolean }> {
  try {
    const res = await fetch(apiUrl("/auth/accounts/remove"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return { ok: false, removedCurrent: false };
    const data = (await res.json()) as { removedCurrent?: boolean };
    const removedCurrent = Boolean(data.removedCurrent);
    if (removedCurrent) notifyAuthChanged();
    return { ok: true, removedCurrent };
  } catch {
    return { ok: false, removedCurrent: false };
  }
}

let lastWarmupAt = 0;

export function warmUpApi(): void {
  const now = Date.now();
  if (now - lastWarmupAt < 30_000) return;
  lastWarmupAt = now;
  fetch(apiUrl("/health"), { method: "GET", cache: "no-store" }).catch(() => {});
}

export async function getAdminOverview(): Promise<AdminOverview | null> {
  try {
    const res = await fetch(apiUrl("/admin/overview"), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as AdminOverview;
  } catch {
    return null;
  }
}

export async function getAdminUsers(params: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AdminUsersResponse | null> {
  const qs = new URLSearchParams();
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();

  try {
    const res = await fetch(apiUrl(`/admin/users${query ? `?${query}` : ""}`), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as AdminUsersResponse;
  } catch {
    return null;
  }
}

export async function requestEmailChange(
  newEmail: string,
  password: string,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  try {
    const res = await fetch(apiUrl("/auth/email-change/request"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newEmail, password }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Não foi possível enviar o código.") };
    }
    return {
      ok: true,
      message: typeof data?.message === "string" ? data.message : "Código enviado para o novo e-mail.",
    };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function confirmEmailChange(
  code: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(apiUrl("/auth/email-change/confirm"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Não foi possível confirmar o código.") };
    }
    notifyAuthChanged();
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function changeOwnPassword(
  newPassword: string,
  currentPassword?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(apiUrl("/auth/change-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        newPassword,
        ...(currentPassword ? { currentPassword } : {}),
      }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Não foi possível atualizar a senha.") };
    }
    notifyAuthChanged();
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function deleteOwnAccount(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(apiUrl("/auth/me"), {
      method: "DELETE",
      credentials: "include",
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Não foi possível apagar a conta.") };
    }
    notifyAuthChanged();
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function deleteAdminUser(
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(apiUrl(`/admin/users/${encodeURIComponent(userId)}`), {
      method: "DELETE",
      credentials: "include",
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Não foi possível apagar a conta.") };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function searchCommunityProfiles(params?: {
  search?: string;
  limit?: number;
}): Promise<CommunityProfileItem[]> {
  try {
    const qs = new URLSearchParams();
    qs.set("limit", String(params?.limit ?? 100));
    if (params?.search?.trim()) {
      qs.set("search", params.search.trim());
    }
    const res = await fetch(apiUrl(`/profiles/community?${qs.toString()}`), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      id: string;
      userId?: string;
      username: string | null;
      handle: string | null;
      avatarUrl: string | null;
      favoriteHeroId: number | null;
      mutualFriendsCount?: number;
    }>;
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

export async function getFeedPosts(page = 1, limit = 20): Promise<FeedResponse> {
  try {
    const res = await fetch(apiUrl(`/feed?page=${page}&limit=${limit}`), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return { items: [], page, hasMore: false };
    return (await res.json()) as FeedResponse;
  } catch {
    return { items: [], page, hasMore: false };
  }
}

export async function createFeedPost(input: {
  content: string;
  mediaUrl?: string | null;
}): Promise<{ post: FeedPost | null; error: string | null }> {
  try {
    const res = await fetch(apiUrl("/feed"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { post: null, error: extractError(data, "Não foi possível publicar.") };
    }
    return { post: data as unknown as FeedPost, error: null };
  } catch {
    return { post: null, error: "Erro de conexão ao publicar." };
  }
}

export async function deleteFeedPost(
  id: string,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const res = await fetch(apiUrl(`/feed/${encodeURIComponent(id)}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      return { ok: false, error: extractError(data, "Não foi possível excluir a postagem.") };
    }
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Erro de conexão ao excluir." };
  }
}

export async function toggleFeedPostLike(
  id: string,
): Promise<{ liked: boolean; likesCount: number; error: string | null }> {
  try {
    const res = await fetch(apiUrl(`/feed/${encodeURIComponent(id)}/like`), {
      method: "POST",
      credentials: "include",
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { liked: false, likesCount: 0, error: extractError(data, "Erro ao curtir.") };
    }
    return {
      liked: Boolean(data?.liked),
      likesCount: Number(data?.likesCount ?? 0),
      error: null,
    };
  } catch {
    return { liked: false, likesCount: 0, error: "Erro de conexão." };
  }
}

export async function createFeedComment(
  postId: string,
  content: string,
): Promise<{ comment: FeedComment | null; error: string | null }> {
  try {
    const res = await fetch(apiUrl(`/feed/${encodeURIComponent(postId)}/comments`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { comment: null, error: extractError(data, "Não foi possível comentar.") };
    }
    return { comment: data as unknown as FeedComment, error: null };
  } catch {
    return { comment: null, error: "Erro de conexão ao comentar." };
  }
}

export async function deleteFeedComment(
  commentId: string,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const res = await fetch(apiUrl(`/feed/comments/${encodeURIComponent(commentId)}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      return { ok: false, error: extractError(data, "Não foi possível excluir o comentário.") };
    }
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Erro de conexão ao excluir." };
  }
}

export async function getMyFriendsOverview(): Promise<FriendsOverview> {
  try {
    const res = await fetch(apiUrl("/friends/me"), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return { friends: [], incoming: [], outgoing: [] };
    return (await res.json()) as FriendsOverview;
  } catch {
    return { friends: [], incoming: [], outgoing: [] };
  }
}

export async function sendFriendRequest(
  targetUserId: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(apiUrl("/friends/requests"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ targetUserId }),
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      return { ok: false, message: extractError(data, "Não foi possível enviar pedido.") };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão ao enviar pedido." };
  }
}

export async function acceptFriendRequest(
  friendshipId: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(apiUrl(`/friends/requests/${encodeURIComponent(friendshipId)}/accept`), {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      return { ok: false, message: extractError(data, "Não foi possível aceitar pedido.") };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão ao aceitar pedido." };
  }
}

export async function removeFriendship(
  friendshipId: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(apiUrl(`/friends/${encodeURIComponent(friendshipId)}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      return { ok: false, message: extractError(data, "Não foi possível remover vínculo.") };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão ao remover vínculo." };
  }
}

export async function updateFriendsPrivacy(
  friendsPublic: boolean,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(apiUrl("/friends/privacy"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ friendsPublic }),
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      return { ok: false, message: extractError(data, "Erro ao salvar privacidade.") };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão ao salvar privacidade." };
  }
}

export async function getCommunityBuilds(params?: {
  heroId?: number;
  userId?: string;
  handle?: string;
}): Promise<CommunityBuildItem[]> {
  try {
    const qs = new URLSearchParams();
    if (params?.heroId) qs.set("heroId", String(params.heroId));
    if (params?.userId) qs.set("userId", params.userId);
    if (params?.handle) qs.set("handle", params.handle);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    const res = await fetch(apiUrl(`/builds${suffix}`), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as CommunityBuildItem[];
  } catch {
    return [];
  }
}

export async function getBuildById(
  id: string,
): Promise<CommunityBuildItem | null> {
  try {
    const res = await fetch(apiUrl(`/builds/${encodeURIComponent(id)}`), {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as CommunityBuildItem;
  } catch {
    return null;
  }
}

export async function createBuild(
  input: SaveBuildInput,
): Promise<{ ok: true; item: CommunityBuildItem } | { ok: false; message: string }> {
  const res = await fetch(apiUrl("/builds"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok || !data) {
    return { ok: false, message: extractError(data, "Erro ao publicar build.") };
  }
  return { ok: true, item: data as unknown as CommunityBuildItem };
}

export async function updateBuild(
  id: string,
  input: SaveBuildInput,
): Promise<{ ok: true; item: CommunityBuildItem } | { ok: false; message: string }> {
  const res = await fetch(apiUrl(`/builds/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok || !data) {
    return { ok: false, message: extractError(data, "Erro ao atualizar build.") };
  }
  return { ok: true, item: data as unknown as CommunityBuildItem };
}

export async function deleteBuild(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(apiUrl(`/builds/${encodeURIComponent(id)}`), {
    method: "DELETE",
    credentials: "include",
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    return { ok: false, message: extractError(data, "Erro ao remover build.") };
  }
  return { ok: true };
}