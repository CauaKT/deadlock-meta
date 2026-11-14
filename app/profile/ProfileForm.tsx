"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ColdStartNotice from "@/app/ColdStartNotice";
import { changeOwnPassword, deleteOwnAccount, deleteTierList, resendVerificationEmail, updateProfileLook, updateProfileSettings } from "@/lib/backend/client";
import type { SocialLinks, TierListItem } from "@/lib/backend/types";
import { exportTierListToPng } from "@/app/tier-maker/exportTierListPng";
import { AvatarEditButton, BannerEditOverlay } from "./ProfileEditControls";
import ProfileBanner, { type BannerMode } from "./ProfileBanner";
import FavoriteHeroSelect from "./FavoriteHeroSelect";
import PlayerDeadlockStats from "./PlayerDeadlockStats";

type SocialKey = keyof SocialLinks;

const SOCIAL_FIELDS: Array<{ key: SocialKey; label: string; placeholder: string }> = [
  { key: "steam", label: "Steam", placeholder: "https://steamcommunity.com/id/seu_id" },
  { key: "twitter", label: "X / Twitter", placeholder: "@usuario ou https://x.com/usuario" },
  { key: "instagram", label: "Instagram", placeholder: "@usuario ou https://instagram.com/usuario" },
  { key: "discord", label: "Discord", placeholder: "seu_usuario ou convite" },
  { key: "youtube", label: "YouTube", placeholder: "@canal ou https://youtube.com/@canal" },
  { key: "twitch", label: "Twitch", placeholder: "usuario ou https://twitch.tv/usuario" },
];

function resolveSocialHref(key: SocialKey, raw: string): string | null {
  const val = raw.trim();
  if (!val || key === "discord") return null;
  if (/^https?:\/\//i.test(val)) return val;
  const clean = val.replace(/^@+/, "");
  if (key === "steam") return `https://steamcommunity.com/id/${encodeURIComponent(clean)}`;
  if (key === "twitter") return `https://x.com/${encodeURIComponent(clean)}`;
  if (key === "instagram") return `https://instagram.com/${encodeURIComponent(clean)}`;
  if (key === "youtube") return `https://youtube.com/@${encodeURIComponent(clean)}`;
  if (key === "twitch") return `https://twitch.tv/${encodeURIComponent(clean)}`;
  return null;
}

const COLOR_PRESETS = ["#f59e0b", "#f97316", "#f43f5e", "#ec4899", "#8b5cf6", "#38bdf8", "#10b981", "#a3e635"];

interface HeroOption {
  tagText?: string;
  tags?: string[];
  nameSvg?: string;
  id: number;
  name: string;
  image: string;
  banner?: string;
  art: string;
  tagBg: string;
  playable: boolean;
  rgb?: [number, number, number];
}

interface CommunityProfile {
  id: string;
  username: string | null;
  handle: string | null;
  avatar_url: string | null;
  favorite_hero_id: number | null;
}

interface ProfileData {
  id: string;
  username: string;
  bio?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
  steam_id: string;
  favorite_hero_id: number | null;
  banner_hero_id: number | null;
  banner_image: string | null;
  banner_nsfw?: boolean;
  profile_color?: string | null;
  social_links?: SocialLinks | null;
  createdAt: string;
}

function CommunityRow({ p }: { p: CommunityProfile }) {
  return (
    <li>
      <Link
        href={`/profile/${p.handle}`}
        className="-m-1 flex items-center gap-3 rounded-lg p-1 transition-colors hover:bg-neutral-800/60"
      >
      {p.avatar_url ? (
        <img src={p.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full border border-neutral-700 object-cover" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 font-deadlock text-sm font-black text-neutral-300">
          {(p.username || "?").charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[#f4efe6]">{p.username}</p>
        <p className="truncate text-[11px] text-neutral-500">{p.handle ? `@${p.handle}` : ""}</p>
      </div>
      </Link>
    </li>
  );
}

function SocialIcon({ network }: { network: SocialKey }) {
  switch (network) {
    case "discord":
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-full w-full">
          <rect width="24" height="24" fill="#5865F2" />
          <path
            fill="#FFFFFF"
            transform="translate(4.2, 4.2) scale(0.65)"
            d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
          />
        </svg>
      );
    case "steam":
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-full w-full">
          <defs>
            <linearGradient id="lockpro-steam-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#111D2E" />
              <stop offset="65%" stopColor="#174878" />
              <stop offset="100%" stopColor="#1B82C5" />
            </linearGradient>
            <mask id="lockpro-steam-mask">
              <circle cx="12" cy="12" r="8.2" fill="#FFFFFF" />
              <path
                fill="#000000"
                transform="translate(3.6, 3.6) scale(0.7)"
                d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658a3.387 3.387 0 0 1 1.912-.59c.063 0 .125.002.188.006l2.861-4.142V8.91a4.528 4.528 0 0 1 4.524-4.524c2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z"
              />
            </mask>
          </defs>
          <rect width="24" height="24" fill="url(#lockpro-steam-grad)" />
          <rect width="24" height="24" fill="#FFFFFF" mask="url(#lockpro-steam-mask)" />
        </svg>
      );
    case "twitter":
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-full w-full">
          <rect width="24" height="24" fill="#000000" />
          <path
            fill="#FFFFFF"
            transform="translate(4.8, 4.8) scale(0.6)"
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-full w-full">
          <defs>
            <radialGradient id="lockpro-ig-grad" cx="30%" cy="107%" r="150%">
              <stop offset="0%" stopColor="#FDF497" />
              <stop offset="5%" stopColor="#FDF497" />
              <stop offset="45%" stopColor="#FD5949" />
              <stop offset="60%" stopColor="#D6249F" />
              <stop offset="90%" stopColor="#285AEB" />
            </radialGradient>
          </defs>
          <rect width="24" height="24" fill="url(#lockpro-ig-grad)" />
          <rect x="4.75" y="4.75" width="14.5" height="14.5" rx="4.2" fill="none" stroke="#FFFFFF" strokeWidth="1.75" />
          <circle cx="12" cy="12" r="3.4" fill="none" stroke="#FFFFFF" strokeWidth="1.75" />
          <circle cx="16.4" cy="7.6" r="1.1" fill="#FFFFFF" />
        </svg>
      );
    case "youtube":
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-full w-full">
          <rect width="24" height="24" fill="#FF0000" />
          <polygon points="9.25,7.5 17,12 9.25,16.5" fill="#FFFFFF" />
        </svg>
      );
    case "twitch":
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-full w-full">
          <rect width="24" height="24" fill="#9146FF" />
          <path
            fill="#FFFFFF"
            transform="translate(4.8, 4.8) scale(0.6)"
            d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0 1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"
          />
        </svg>
      );
  }
}

export default function ProfileForm({
  initialProfile,
  heroes,
  userEmail,
  emailVerified = true,
  community = [],
  readOnly = false,
  initialTierLists = [],
}: {
  initialProfile: ProfileData;
  heroes: HeroOption[];
  userEmail: string;
  emailVerified?: boolean;
  community?: CommunityProfile[];
  readOnly?: boolean;
  initialTierLists?: TierListItem[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "tierlists" | "settings">("overview");

  // Estados do formulário de edição
  const [username, setUsername] = useState(initialProfile.username || "");
  const [steamId, setSteamId] = useState(initialProfile.steam_id || "");
  const [bio, setBio] = useState(initialProfile.bio || "");
  const [handle, setHandle] = useState(initialProfile.handle || "");
  const [favoriteHeroId, setFavoriteHeroId] = useState<number | null>(initialProfile.favorite_hero_id);
  const [profileColor, setProfileColor] = useState<string | null>(initialProfile.profile_color ?? null);
  const [editing, setEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile.avatar_url ?? null);
  const [lookSaving, setLookSaving] = useState(false);
  const [lookError, setLookError] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(initialProfile.social_links ?? {});
  const [copiedDiscord, setCopiedDiscord] = useState(false);
  const [actionsInView, setActionsInView] = useState(true);
  const actionsAnchorRef = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = useState<{
    mode: BannerMode;
    heroId: number | null;
    image: string | null;
    avatar: string | null;
    username: string;
    bio: string;
    handle: string;
    favoriteHeroId: number | null;
    profileColor: string | null;
    steamId: string;
    socialLinks: SocialLinks;
  } | null>(null);
  const [bannerMode, setBannerMode] = useState<BannerMode>(
    initialProfile.banner_image ? "custom" : initialProfile.banner_hero_id != null ? "hero" : "default",
  );
  const [bannerHeroId, setBannerHeroId] = useState<number | null>(initialProfile.banner_hero_id);
  const [bannerImage, setBannerImage] = useState<string | null>(initialProfile.banner_image);
  const [bannerNsfw, setBannerNsfw] = useState<boolean>(Boolean(initialProfile.banner_nsfw));

  useEffect(() => {
    setBannerNsfw(Boolean(initialProfile.banner_nsfw));
  }, [initialProfile.banner_nsfw]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleChangePassword = async () => {
    setPasswordFeedback(null);
    if (newPassword.length < 8) {
      setPasswordFeedback({ type: "error", text: "A nova senha deve ter pelo menos 8 caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", text: "As senhas digitadas não coincidem." });
      return;
    }
    setPasswordSaving(true);
    const res = await changeOwnPassword(newPassword, currentPassword || undefined);
    setPasswordSaving(false);
    if (!res.ok) {
      setPasswordFeedback({ type: "error", text: res.message });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordFeedback({
      type: "success",
      text: "Senha alterada com sucesso! Outras sessões ativas foram encerradas.",
    });
  };

  const handleDeleteOwnAccount = async () => {
    setDeletingAccount(true);
    setDeleteError("");
    const res = await deleteOwnAccount();
    setDeletingAccount(false);
    if (!res.ok) {
      setDeleteError(res.message);
      return;
    }
    router.push("/");
    router.refresh();
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setVerifyFeedback(null);
    const res = await resendVerificationEmail(userEmail);
    setResendingEmail(false);
    setVerifyFeedback({
      type: res.ok ? "success" : "error",
      text: res.ok
        ? "Link de confirmação reenviado. Verifique sua caixa de entrada e a pasta Spam."
        : res.message,
    });
  };

  useEffect(() => {
    if (!editing) {
      setActionsInView(true);
      return;
    }
    const el = actionsAnchorRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActionsInView(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [editing]);

  const [savedTierLists, setSavedTierLists] = useState<TierListItem[]>(initialTierLists);
  const [exportingTierId, setExportingTierId] = useState<string | null>(null);

  const heroesById = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const selectedHero = heroesById.get(favoriteHeroId ?? -1);
  const sortedCommunity = [...community].sort((a, b) => {
    const sa = a.favorite_hero_id != null && a.favorite_hero_id === favoriteHeroId ? 0 : 1;
    const sb = b.favorite_hero_id != null && b.favorite_hero_id === favoriteHeroId ? 0 : 1;
    return sa - sb || (a.username ?? "").localeCompare(b.username ?? "", "pt-BR");
  });
  const suggestions = sortedCommunity.slice(0, 3);
  const otherAccounts = sortedCommunity.slice(3, 8);
  const heroColor = profileColor ?? (selectedHero?.rgb ? `rgb(${selectedHero.rgb.join(",")})` : "#f59e0b");
  const avatarImage = avatarUrl || selectedHero?.image;
  const bannerHero = heroesById.get((bannerMode === "hero" ? bannerHeroId : favoriteHeroId) ?? -1) ?? null;
  const bannerNode =
    bannerMode === "custom" && bannerImage ? (
      <ProfileBanner customImage={bannerImage} nsfw={bannerNsfw && !editing} />
    ) : bannerHero ? (
      <ProfileBanner hero={bannerHero} />
    ) : null;

  const startEdit = () => {
    setSnapshot({
      mode: bannerMode,
      heroId: bannerHeroId,
      image: bannerImage,
      avatar: avatarUrl,
      username,
      bio,
      handle,
      favoriteHeroId,
      profileColor,
      steamId,
      socialLinks: { ...socialLinks },
    });
    setLookError("");
    setMessage(null);
    setEditing(true);
    setActiveTab("settings");
  };

  const cancelEdit = () => {
    if (snapshot) {
      setBannerMode(snapshot.mode);
      setBannerHeroId(snapshot.heroId);
      setBannerImage(snapshot.image);
      setAvatarUrl(snapshot.avatar);
      setUsername(snapshot.username);
      setBio(snapshot.bio);
      setHandle(snapshot.handle);
      setFavoriteHeroId(snapshot.favoriteHeroId);
      setProfileColor(snapshot.profileColor);
      setSteamId(snapshot.steamId);
      setSocialLinks(snapshot.socialLinks);
    }
    setSnapshot(null);
    setLookError("");
    setMessage(null);
    setEditing(false);
    setActiveTab("overview");
  };

  const saveLook = async () => {
    const cleanName = username.trim();
    if (cleanName.length < 3) {
      setLookError("O apelido deve ter no mínimo 3 caracteres.");
      return;
    }
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(cleanName)) {
      setLookError("O apelido só pode conter letras, números, espaços, traço e sublinhado.");
      return;
    }
    const cleanHandle = handle.trim();
    if (cleanHandle && cleanHandle.length < 3) {
      setLookError("O @ deve ter de 3 a 20 caracteres (minúsculas, números e _).");
      return;
    }
    setLookSaving(true);
    setLookError("");
    setMessage(null);

    const lookResult = await updateProfileLook(initialProfile.id, {
      username: cleanName,
      bio: bio.trim() || null,
      handle: cleanHandle || null,
      avatar_url: avatarUrl,
      banner_hero_id: bannerMode === "hero" ? bannerHeroId : null,
      banner_image: bannerMode === "custom" ? bannerImage : null,
      social_links: socialLinks,
    });
    if (!lookResult.ok) {
      setLookSaving(false);
      setLookError(lookResult.message);
      return;
    }

    const settingsResult = await updateProfileSettings(initialProfile.id, {
      username: cleanName,
      steam_id: steamId.trim(),
      profile_color: profileColor,
      favorite_hero_id: favoriteHeroId,
      banner_hero_id: bannerMode === "hero" ? bannerHeroId : null,
      banner_image: bannerMode === "custom" ? bannerImage : null,
      social_links: socialLinks,
    });
    setLookSaving(false);
    if (!settingsResult.ok) {
      setLookError(settingsResult.message);
      return;
    }

    setUsername(cleanName);
    setBio(bio.trim());
    setSnapshot(null);
    setEditing(false);
    setActiveTab("overview");
    setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
    const target = cleanHandle ? `/profile/${cleanHandle}` : "/profile";
    if (target !== window.location.pathname) router.replace(target);
    else router.refresh();
  };

  const tabClass = (tab: typeof activeTab) =>
    `-mb-px flex items-center gap-2 border-b-2 px-4 py-3 font-deadlock text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${ tab === "tierlists" ? "hidden" : "flex"} items-center gap-2 border-b-2 px-4 py-3 font-deadlock text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
      activeTab === tab
        ? "border-amber-500 text-[#f4efe6]"
        : "border-transparent text-neutral-400 hover:text-white"
    }`;

  return (
    <div className={editing ? "space-y-0" : "space-y-6"}>
      {/* ========================================================================= */}
      {/* 1. HEADER CINEMÁTICO GAMER (IDÊNTICO À REFERÊNCIA)                       */}
      {/* ========================================================================= */}
      <section
        className={`relative overflow-hidden border border-t-0 border-neutral-800/90 bg-[#0a0d0c] ${
          editing
            ? "rounded-none border-b-0 shadow-none"
            : "rounded-b-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
        }`}
      >
        {/* Banner Panorâmico */}
        <div className="relative aspect-[4/1] min-h-40 w-full overflow-hidden bg-neutral-900">
{bannerNode ? (
            bannerNode
          ) : selectedHero?.banner ? (
            <img
              src={selectedHero.banner}
              alt=""
              className="h-full w-full object-cover object-top filter brightness-80 transition-all duration-700"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-neutral-800 via-neutral-900 to-[#0a0d0c]" />
          )}

          {editing && (
            <>
              <BannerEditOverlay
                heroes={heroes}
                heroId={bannerHeroId}
                canReset={bannerMode !== "default"}
                onImage={(data) => {
                  setBannerImage(data);
                  setBannerNsfw(false);
                  setBannerMode("custom");
                }}
                onHero={(id) => {
                  setBannerHeroId(id);
                  setBannerMode("hero");
                }}
                onReset={() => {
                  setBannerMode("default");
                  setBannerHeroId(null);
                  setBannerImage(null);
                }}
                onError={setLookError}
              />
            </>
          )}

          {/* Lápis (visualização) ou Cancelar/Salvar (modo edição) no canto superior do Banner */}
          <div
            ref={actionsAnchorRef}
            className={`absolute right-4 top-4 z-20 ${readOnly ? "hidden" : "flex"} flex-wrap items-center justify-end gap-2`}
          >
            {editing ? (
              <>
                {lookError && <span className="rounded bg-black/75 px-2.5 py-1 text-xs font-semibold text-rose-400">{lookError}</span>}
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={lookSaving}
                  className="cursor-pointer rounded-xl border border-neutral-700 bg-black/70 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] backdrop-blur-md transition-colors hover:border-neutral-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveLook}
                  disabled={lookSaving}
                  className="cursor-pointer rounded-xl border border-amber-500 bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black transition-[filter] hover:brightness-110 disabled:opacity-50"
                >
                  {lookSaving ? "Salvando..." : "Salvar"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startEdit}
                title="Personalizar Perfil"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-700/80 bg-black/60 text-neutral-300 backdrop-blur-md transition-all hover:border-amber-400 hover:text-amber-400 hover:scale-105 cursor-pointer shadow-lg"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            )}
          </div>

          {!readOnly && editing && !actionsInView && (
            <div className="pointer-events-none fixed inset-x-0 top-20 z-50">
              <div className="mx-auto flex max-w-6xl justify-end px-8 sm:px-11">
                <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-neutral-800/90 bg-[#0a0d0c]/95 p-2 shadow-[0_12px_30px_rgba(0,0,0,0.85)] backdrop-blur-md">
                  {lookError && <span className="rounded bg-black/70 px-2 py-1 text-xs font-semibold text-rose-400">{lookError}</span>}
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={lookSaving}
                    className="cursor-pointer rounded-xl border border-neutral-700 bg-black/70 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] transition-colors hover:border-neutral-500 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveLook}
                    disabled={lookSaving}
                    className="cursor-pointer rounded-xl border border-amber-500 bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black transition-[filter] hover:brightness-110 disabled:opacity-50"
                  >
                    {lookSaving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Informações de Perfil e Estatísticas Sobrepostas */}
        <div className="relative px-6 pb-6 pt-0 sm:px-8 sm:pb-7">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 -mt-14 sm:-mt-16">
            
            {/* Bloco de Avatar e Identidade */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar Circular Sobreposto */}
              <div
                className="relative z-30 flex h-28 w-28 sm:h-32 sm:w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 bg-[#0c100e] shadow-[0_0_30px_rgba(0,0,0,0.9)]"
                style={{
                  borderColor: heroColor,
                  boxShadow: `0 0 24px color-mix(in srgb, ${heroColor} 45%, transparent)`,
                }}
              >
                {editing && <AvatarEditButton onImageAction={setAvatarUrl} onErrorAction={setLookError} />}
                {avatarImage ? (
                  <img
                    src={avatarImage}
                    alt={username || "Avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-deadlock text-4xl font-black text-amber-500">
                    {(username || "LP").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Nome, E-mail e Badges */}
              <div className="w-full min-w-0 flex-1 text-center sm:text-left space-y-1.5 sm:mt-[5.5rem]">
                {editing ? (
                  <div className="mx-auto w-full max-w-full space-y-2 sm:mx-0 sm:w-[28rem]">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={20}
                      placeholder="Seu apelido"
                      aria-label="Apelido"
                      className="font-deadlock w-full min-w-0 rounded-lg border border-dashed border-neutral-600 bg-black/40 px-2.5 py-1 text-center text-2xl font-black uppercase tracking-tight text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none sm:text-left sm:text-3xl"
                    />
                    <div className="flex w-full items-center gap-1 rounded-lg border border-dashed border-neutral-600 bg-black/40 px-2.5 py-1 focus-within:border-amber-500">
                      <span className="font-mono text-sm text-neutral-500">@</span>
                      <input
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
                        maxLength={20}
                        placeholder="seu_usuario"
                        aria-label="@ do perfil"
                        className="w-full min-w-0 bg-transparent font-mono text-sm text-neutral-300 placeholder:text-neutral-600 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={160}
                        rows={3}
                        placeholder="Escreva uma bio..."
                        aria-label="Bio"
                        className="w-full min-h-[4.5rem] resize rounded-lg border border-dashed border-neutral-600 bg-black/40 px-2.5 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
                      />
                      <p className="text-right text-[10px] text-neutral-500">{bio.length}/160</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                      <h1 className="font-deadlock truncate text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#f4efe6]">
                        {username || "Sem Nickname"}
                      </h1>
                    </div>
                    {handle && <p className="font-mono text-sm text-neutral-400">@{handle}</p>}
                    {bio && <p className="max-w-md whitespace-pre-line break-words text-sm text-neutral-300">{bio}</p>}
                    {SOCIAL_FIELDS.some(({ key }) => Boolean(socialLinks[key]?.trim())) && (
                      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 sm:justify-start">
                        {SOCIAL_FIELDS.map(({ key, label }) => {
                          const raw = socialLinks[key]?.trim();
                          if (!raw) return null;
                          const href = resolveSocialHref(key, raw);
                          if (key === "discord") {
                            return (
                              <button
                                key={key}
                                type="button"
                                aria-label={copiedDiscord ? "Discord copiado!" : `Copiar Discord ${raw}`}
                                title={copiedDiscord ? "Discord copiado!" : `Discord: ${raw} (clique para copiar)`}
                                onClick={() => {
                                  void navigator.clipboard?.writeText(raw);
                                  setCopiedDiscord(true);
                                  setTimeout(() => setCopiedDiscord(false), 1800);
                                }}
                                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-[6px] border border-[#2F3336] bg-black transition-transform hover:scale-110"
                              >
                                {copiedDiscord ? (
                                  <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                ) : (
                                  <SocialIcon network="discord" />
                                )}
                              </button>
                            );
                          }
                          if (!href) return null;
                          return (
                            <a
                              key={key}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={label}
                              title={`${label}: ${raw}`}
                              className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-[6px] border border-[#2F3336] bg-black transition-transform hover:scale-110"
                            >
                              <SocialIcon network={key} />
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Ação Rápida: Alternar para aba de Configurações */}
            <div className="flex justify-center sm:justify-end sm:self-start sm:mt-[5.75rem]">
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. BARRA DE NAVEGAÇÃO EM ABAS (OCULTA DURANTE A EDIÇÃO)                   */}
      {/* ========================================================================= */}
      {!editing && (
        <div className="flex items-center gap-1 border-b border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={tabClass("overview")}
          >
            <span>Visão Geral</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tierlists")}
            className={tabClass("tierlists")}
          >
            <span>{readOnly ? "Tier Lists" : "Minhas Tier Lists"}</span>
            <span className="rounded bg-black/30 px-1.5 py-0.2 text-[10px] font-black">
              {savedTierLists.length}
            </span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CONTEÚDO DINÂMICO DAS ABAS                                            */}
      {/* ========================================================================= */}

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === "overview" && (
        <div className={`grid grid-cols-1 gap-6 ${readOnly ? "" : "lg:grid-cols-[minmax(0,1fr)_320px]"}`}>
        <div className="space-y-6">
          {/* Card Destaque do Herói Favorito */}
          {selectedHero ? (
            <div className="relative overflow-hidden rounded-3xl border border-neutral-800/90 bg-[#0a0d0c] p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 z-10 text-center md:text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                  Herói Selecionado em Destaque
                </span>
                <h3 className="font-deadlock text-3xl font-black text-[#f4efe6]">
                  {selectedHero.name}
                </h3>
                <p className="text-xs text-neutral-400 max-w-md">
                  Seu perfil está sintonizado com os atributos deste herói. O banner, tema de cores e preferências visuais são personalizados automaticamente.
                </p>
                <div className="pt-2">
                  <Link
                    href={`/heroes/${selectedHero.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] hover:border-amber-400 hover:text-amber-400 transition-colors"
                  >
                    <span>Ver Habilidades & Builds</span>
                    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12 12 4M6 4h6v6" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Render do Herói */}
              <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/80 shadow-inner flex items-center justify-center">
                <img
                  src={selectedHero.image}
                  alt={selectedHero.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ) : !readOnly ? (
            <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-8 text-center space-y-3">
              <p className="font-deadlock text-lg font-black text-neutral-300">
                Nenhum Herói Assinatura Selecionado
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Escolha seu herói favorito nas configurações para personalizar a capa e as cores de destaque do seu perfil.
              </p>
              <button
                type="button"
                onClick={() => !readOnly && startEdit()}
                className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black transition-transform hover:scale-105"
              >
                Definir Herói Agora
              </button>
            </div>
          ) : null}

          <PlayerDeadlockStats steamId={steamId} heroes={heroes} heroColor={heroColor} />
        </div>
        <aside className={`space-y-4 ${readOnly ? "hidden" : ""}`}>
          <section className="space-y-3 rounded-2xl border border-neutral-800/90 bg-[#0a0d0c] p-5">
            <h3 className="border-l-2 border-amber-500 pl-2 font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
              Atividade
            </h3>
            <dl className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-neutral-400">Tier lists salvas</dt>
                <dd className="font-deadlock text-base font-black text-amber-400">{savedTierLists.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-neutral-400">Heróis classificados</dt>
                <dd className="font-deadlock text-base font-black text-amber-400">
                  {savedTierLists.reduce(
                    (acc, tl) => acc + tl.tiers.reduce((sum, t) => sum + (t.heroes?.length || 0), 0),
                    0
                  )}
                </dd>
              </div>
            </dl>
            <p className="text-[11px] text-neutral-500">
              Tier lists sincronizadas com a conta.
            </p>
          </section>

          <section className="space-y-3 rounded-2xl border border-neutral-800/90 bg-[#0a0d0c] p-5">
            <h3 className="border-l-2 border-amber-500 pl-2 font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
              Sugestões de Amigos
            </h3>
            {suggestions.length > 0 ? (
              <ul className="space-y-3">
                {suggestions.map((p) => (
                  <CommunityRow key={p.id} p={p} />
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-neutral-500">Ainda não há outras contas cadastradas.</p>
            )}
          </section>

          {otherAccounts.length > 0 && (
            <section className="space-y-3 rounded-2xl border border-neutral-800/90 bg-[#0a0d0c] p-5">
              <h3 className="border-l-2 border-amber-500 pl-2 font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
                Outras Contas do Site
              </h3>
              <ul className="space-y-3">
                {otherAccounts.map((p) => (
                  <CommunityRow key={p.id} p={p} />
                ))}
              </ul>
            </section>
          )}
        </aside>
        </div>
      )}

      {/* ABA 2: MINHAS TIER LISTS */}
      {activeTab === "tierlists" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">
              {readOnly ? "Classificações Publicadas" : "Minhas Classificações Publicadas"}
            </h3>
            {!readOnly && (
              <Link
                href="/tier-maker"
                className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-1.5 font-deadlock text-xs font-black uppercase tracking-wider text-black transition-transform hover:scale-105"
              >
                Criar no TierMaker
              </Link>
            )}
          </div>

          {savedTierLists.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center text-xs text-neutral-500">
              Nenhuma tier list publicada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {savedTierLists.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-neutral-800/90 bg-[#0a0d0c] p-5 space-y-3 shadow-xl"
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-deadlock text-lg font-black text-[#f4efe6] truncate">
                      {item.title}
                    </p>
                    <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                      {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Contém {item.tiers.reduce((acc, t) => acc + (t.heroes?.length || 0), 0)} heróis distribuídos.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={exportingTierId === item.id}
                      onClick={async () => {
                        setExportingTierId(item.id);
                        try {
                          await exportTierListToPng({
                            title: item.title,
                            author: item.author,
                            dateLabel: new Date(item.createdAt).toLocaleDateString("pt-BR"),
                            tiers: item.tiers.map((t) => ({
                              label: t.label,
                              color: t.color,
                              heroes: (t.heroes || [])
                                .map((hId) => heroesById.get(hId))
                                .filter((h): h is HeroOption => Boolean(h))
                                .map((h) => ({ id: h.id, name: h.name, image: h.image })),
                            })),
                          });
                        } finally {
                          setExportingTierId(null);
                        }
                      }}
                      className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 font-deadlock text-xs font-black uppercase text-amber-400 hover:border-amber-400 transition-colors disabled:opacity-50"
                    >
                      {exportingTierId === item.id ? "Gerando..." : "Exportar PNG"}
                    </button>

                    {item.canEdit && (
                      <Link
                        href={`/tier-maker?edit=${item.id}`}
                        className="inline-block rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 font-deadlock text-xs font-black uppercase text-[#f4efe6] hover:border-amber-400 hover:text-amber-400 transition-colors"
                      >
                        Abrir no Editor
                      </Link>
                    )}

                    {item.canDelete && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm("Deseja excluir esta tier list permanentemente?")) return;
                          const res = await deleteTierList(item.id);
                          if (res.ok) {
                            setSavedTierLists((prev) => prev.filter((tl) => tl.id !== item.id));
                          }
                        }}
                        className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-1.5 font-deadlock text-xs font-black uppercase text-rose-300 hover:border-rose-500 transition-colors"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

     {/* ABA 3: CONFIGURAÇÕES E FORMULÁRIO DE EDIÇÃO */}
      {!readOnly && activeTab === "settings" && (
        <div
          className={`overflow-hidden border border-neutral-800/90 bg-[#0a0d0c] shadow-2xl backdrop-blur-md ${
            editing ? "rounded-b-3xl rounded-t-none border-t" : "rounded-3xl"
          }`}
        >
          <div className="relative border-b border-neutral-800/80 px-6 py-6 sm:px-8">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: `radial-gradient(ellipse at 0% 0%, color-mix(in srgb, ${heroColor} 20%, transparent), transparent 65%)` }}
            />
            <h2 className="relative font-deadlock text-xl font-black uppercase tracking-wider text-[#f4efe6]">
              Personalizar Perfil
            </h2>
            <p className="relative mt-1 text-xs text-neutral-400">
              Atualize seus dados de exibição pública e vincule seu código de Deadlock.
            </p>
          </div>

          <div className="space-y-8 p-6 sm:p-8">

          {message && (
            <div
              className={`rounded-xl p-3.5 text-xs font-bold border transition-all ${
                message.type === "success"
                  ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
                  : "border-rose-500/40 bg-rose-950/30 text-rose-300"
              }`}
            >
              {message.text}
            </div>
          )}

          <section className="space-y-3">
            <h3 className="flex items-center gap-2.5 font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
              <span className="h-4 w-1 rounded-full" style={{ backgroundColor: heroColor }} />
              E-mail da Conta
            </h3>
            <div
              className={`rounded-xl border p-4 ${
                emailVerified
                  ? "border-neutral-800 bg-black/40"
                  : "border-amber-500/40 bg-amber-950/20"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-mono text-xs text-[#f4efe6]">{userEmail}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        emailVerified
                          ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                          : "border-amber-500/40 bg-amber-950/40 text-amber-300"
                      }`}
                    >
                      {emailVerified ? "Confirmado" : "Pendente"}
                    </span>
                  </div>
                  {!emailVerified && (
                    <p className="text-[11px] text-amber-200/80">
                      Seu e-mail ainda não foi confirmado. Confira sua caixa de entrada e a pasta Spam ou solicite um novo link.
                    </p>
                  )}
                </div>
                {!emailVerified && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    className="shrink-0 cursor-pointer rounded-lg border border-amber-400/60 bg-amber-500/15 px-3.5 py-2 font-deadlock text-[11px] font-black uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
                  >
                    {resendingEmail ? "Reenviando..." : "Reenviar confirmação"}
                  </button>
                )}
              </div>
              {verifyFeedback && (
                <p
                  className={`mt-3 text-xs font-semibold ${
                    verifyFeedback.type === "success" ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {verifyFeedback.text}
                </p>
              )}
            </div>
          </section>

          <section className="space-y-5">
            <h3 className="flex items-center gap-2.5 font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
              <span className="h-4 w-1 rounded-full" style={{ backgroundColor: heroColor }} />
              Aparência
            </h3>

            <div className="space-y-1.5">
              <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
                Herói Favorito
              </label>
              <FavoriteHeroSelect heroes={heroes} value={favoriteHeroId} onChange={setFavoriteHeroId} />
              <p className="text-[11px] text-neutral-500">Define o banner padrão e a cor do perfil, quando nenhuma cor é escolhida.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
                  Cor do Perfil
                </label>
                {profileColor && (
                  <button
                    type="button"
                    onClick={() => setProfileColor(null)}
                    className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-neutral-400 transition-colors hover:text-white"
                  >
                    Usar cor do herói
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-neutral-800 bg-black/40 p-3">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    aria-pressed={profileColor === c}
                    onClick={() => setProfileColor(c)}
                    className={`h-8 w-8 cursor-pointer rounded-full border-2 transition-transform hover:scale-110 ${
                      profileColor === c ? "scale-110 border-white" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c, boxShadow: profileColor === c ? `0 0 12px ${c}` : undefined }}
                  />
                ))}
                <span aria-hidden className="mx-1 h-6 w-px bg-neutral-800" />
                <label className="relative flex h-8 cursor-pointer items-center gap-2 rounded-full border border-neutral-700 px-3 text-[11px] font-bold uppercase tracking-wider text-neutral-300 transition-colors hover:border-neutral-500">
                  <span className="h-3.5 w-3.5 rounded-full border border-white/30" style={{ backgroundColor: heroColor }} />
                  Personalizada
                  <input
                    type="color"
                    value={profileColor ?? "#f59e0b"}
                    onChange={(e) => setProfileColor(e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="flex items-center gap-2.5 font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
              <span className="h-4 w-1 rounded-full" style={{ backgroundColor: heroColor }} />
              Conta de Jogo
            </h3>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
                  Steam ID ou Friend Code de Deadlock
                </label>
                <span className="rounded-full border border-neutral-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Opcional
                </span>
              </div>
              <input
                type="text"
                value={steamId}
                onChange={(e) => setSteamId(e.target.value)}
                placeholder="Ex: 76561198000000000 ou seu código de amigo"
                className="w-full rounded-xl border border-neutral-800 bg-black/60 px-4 py-3 font-mono text-sm text-[#f4efe6] transition-colors placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
              />
              <p className="text-[11px] text-neutral-500">
                Utilizado para sincronização de estatísticas táticas e win rate individual nas próximas atualizações.
              </p>
            </div>
          </section>

         <section className="space-y-4">
            <h3 className="flex items-center gap-2.5 font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
              <span className="h-4 w-1 rounded-full" style={{ backgroundColor: heroColor }} />
              Redes Sociais
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1">
                  <label className="font-deadlock text-[11px] font-black uppercase tracking-wider text-neutral-400">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={socialLinks[key] ?? ""}
                    onChange={(e) =>
                      setSocialLinks((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    placeholder={placeholder}
                    maxLength={120}
                    className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3.5 py-2.5 text-xs text-[#f4efe6] transition-colors placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 items-start gap-8 border-t border-neutral-800/80 pt-6 md:grid-cols-2">
            <section className="space-y-4">
              <h3 className="flex items-center gap-2.5 font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
                <span className="h-4 w-1 rounded-full" style={{ backgroundColor: heroColor }} />
                Alterar Senha
              </h3>
              <div className="space-y-3">
                <input
                  type="password"
                  maxLength={128}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Senha atual (vazio se entrou só com Google)"
                  className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3.5 py-2.5 text-xs text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
                />
                <input
                  type="password"
                  minLength={8}
                  maxLength={128}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha (mín. 8 caracteres)"
                  className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3.5 py-2.5 text-xs text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
                />
                <input
                  type="password"
                  minLength={8}
                  maxLength={128}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar nova senha"
                  className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3.5 py-2.5 text-xs text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={passwordSaving}
                  onClick={() => void handleChangePassword()}
                  className="cursor-pointer rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] hover:border-amber-400 hover:text-amber-400 disabled:opacity-50"
                >
                  {passwordSaving ? "Alterando..." : "Atualizar Senha"}
                </button>
                {passwordFeedback && (
                  <p
                    className={`text-xs font-semibold ${
                      passwordFeedback.type === "success" ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {passwordFeedback.text}
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-rose-950/60 bg-rose-950/10 p-5">
              <h3 className="flex items-center gap-2.5 font-deadlock text-sm font-black uppercase tracking-wider text-rose-400">
                <span className="h-4 w-1 rounded-full bg-rose-500" />
                Apagar Conta
              </h3>
              <p className="text-xs text-neutral-400">
                Remove permanentemente sua conta e seu perfil. Suas tier lists publicadas permanecem anônimas na comunidade.
              </p>
              {confirmDeleteAccount ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={deletingAccount}
                    onClick={() => void handleDeleteOwnAccount()}
                    className="cursor-pointer rounded-xl border border-rose-500 bg-rose-600 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-white hover:bg-rose-500 disabled:opacity-50"
                  >
                    {deletingAccount ? "Apagando..." : "Confirmar Exclusão"}
                  </button>
                  <button
                    type="button"
                    disabled={deletingAccount}
                    onClick={() => setConfirmDeleteAccount(false)}
                    className="cursor-pointer rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAccount(true)}
                  className="cursor-pointer rounded-xl border border-rose-900/70 bg-rose-950/30 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-rose-300 hover:border-rose-500 hover:bg-rose-950/50"
                >
                  Apagar minha conta
                </button>
              )}
              {deleteError && <p className="text-xs font-semibold text-rose-300">{deleteError}</p>}
            </section>
          </div>

          <ColdStartNotice active={lookSaving} />
          </div>
        </div>
      )}
    </div>
  );
}