import type {
  AdminOverview,
  AdminUsersResponse,
  AuthUser,
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
  mustChangePassword?: boolean;
  createdAt: string;
  profile: {
    username: string | null;
    handle: string | null;
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
    mustChangePassword: Boolean(u.mustChangePassword),
    createdAt: u.createdAt ?? null,
    suggestedUsername: u.profile?.username || fallbackName,
    suggestedFullName: u.profile?.username || fallbackName,
    suggestedAvatarUrl: u.profile?.avatarUrl ?? null,
    profile: u.profile
      ? {
          username: u.profile.username,
          handle: u.profile.handle,
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

export async function signInWithGoogle(
  nextRoute: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  window.location.href = apiUrl(`/auth/google?next=${encodeURIComponent(nextRoute)}`);
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

export async function updateAdminUserRole(
  userId: string,
  role: "USER" | "ADMIN",
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(apiUrl(`/admin/users/${encodeURIComponent(userId)}/role`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Não foi possível alterar a permissão.") };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Erro de conexão com a API." };
  }
}

export async function resetAdminUserPassword(
  userId: string,
  options: { newPassword?: string; letUserChoose?: boolean },
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(apiUrl(`/admin/users/${encodeURIComponent(userId)}/password`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(options),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { ok: false, message: extractError(data, "Não foi possível redefinir a senha.") };
    }
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