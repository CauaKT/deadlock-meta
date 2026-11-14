import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import {
  getCommunityProfiles,
  getOwnFullProfile,
  getPublicProfileByHandle,
  getServerAuthUser,
  getServerTierLists,
} from "@/lib/backend/server";
import { fetchHeroesAssets, fetchHeroesAnalytics, fetchHeroBlurbs, fetchWikiColors, extractColor, extractHeroTheme, PATCHES } from "@/lib/deadlock";
import ProfileForm from "./ProfileForm";
import fs from "fs";
import path from "path";

export default async function ProfileView({ handle }: { handle?: string }) {
  await connection();
  const user = await getServerAuthUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, heroesMap, wikiColors, stats, blurbs] = await Promise.all([
    getOwnFullProfile(user.id),
    fetchHeroesAssets(),
    fetchWikiColors(),
    fetchHeroesAnalytics(PATCHES[0].since),
    fetchHeroBlurbs(),
  ]);
  const withMatches = new Set(stats.filter((s) => (s.matches || 0) > 0).map((s) => s.hero_id));

  const community = await getCommunityProfiles(user.id, 8);

  // O endereço só abre para o dono; /profile redireciona para /profile/<@>
  const ownHandle: string | null = profile?.handle ?? null;
  if (handle === undefined && ownHandle) redirect(`/profile/${ownHandle}`);
  const isOwner = handle === undefined || handle === ownHandle;

  const heroesDir = path.join(process.cwd(), "public", "heroes");
  const localArt = fs.existsSync(heroesDir) ? fs.readdirSync(heroesDir) : [];

  const heroesList = Object.values(heroesMap)
    .filter((h) => !h.name.startsWith("hero_"))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((h) => {
      const theme = extractHeroTheme(h, wikiColors);
      const bg = h.images?.background_image_webp || h.images?.background_image || "";
      const file = h.name.trim().replace(/ /g, "_");
      const slug = h.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const local = slug ? localArt.find((f) => f.toLowerCase().startsWith(slug)) : undefined;
      return {
        id: h.id,
        name: h.name,
        image: h.images?.icon_hero_card || h.images?.icon_image_small || h.images?.minimap_image || "",
        banner: bg,
        head: h.images?.icon_image_small || "",
        art: local ? `/heroes/${local}` : `https://cdn.deadlock.wiki/thumb/${file}_Render.png/800px-${file}_Render.png`,
        tagBg: theme.tagBg,
        tagText: theme.tagText,
        tags: blurbs[h.id]?.tags ?? [],
        nameSvg: `https://cdn.deadlock.wiki/${file}_name.svg`,
        // Mesma regra de "lançado" da /heroes
        playable:
          extractColor(h, wikiColors) !== null &&
          (withMatches.has(h.id) || (h.player_selectable === true && h.disabled !== true && h.in_development !== true)),
        rgb: theme.rgb,
      };
    });

  const createdAtDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
    : "Recentemente";

  const initialProfile = {
    id: user.id,
    username: profile?.username || user.suggestedUsername || "",
    bio: profile?.bio ?? "",
    handle: ownHandle ?? "",
    avatar_url: profile?.avatar_url || user.suggestedAvatarUrl,
    steam_id: profile?.steam_id || "",
    favorite_hero_id: profile?.favorite_hero_id ?? null,
    banner_hero_id: profile?.banner_hero_id ?? null,
    banner_image: profile?.banner_image ?? null,
    profile_color: profile?.profile_color ?? null,
    createdAt: createdAtDate,
  };

  let shownProfile = initialProfile;
  if (!isOwner) {
    const other = await getPublicProfileByHandle(handle);
    if (!other) notFound();
    shownProfile = {
      id: other.id,
      username: other.username ?? "",
      bio: other.bio ?? "",
      handle: other.handle ?? "",
      avatar_url: other.avatar_url ?? null,
      steam_id: "",
      favorite_hero_id: other.favorite_hero_id ?? null,
      banner_hero_id: other.banner_hero_id ?? null,
      banner_image: other.banner_image ?? null,
      profile_color: other.profile_color ?? null,
      createdAt: other.createdAt
        ? new Date(other.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
        : "Recentemente",
    };
  }

  const tierLists = await getServerTierLists(
    shownProfile.handle
      ? { handle: shownProfile.handle }
      : isOwner
        ? { userId: user.id }
        : undefined,
  );

  return (
    <div className="max-w-6xl mx-auto px-4 pb-4 md:px-8 md:pb-8 space-y-6">

      <ProfileForm
        initialProfile={shownProfile}
        readOnly={!isOwner}
        heroes={heroesList}
        userEmail={user.email}
        community={community}
        initialTierLists={tierLists}
      />
    </div>
  );
}