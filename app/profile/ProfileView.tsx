import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchHeroesAssets, fetchWikiColors, extractColor, extractHeroTheme } from "@/lib/deadlock";
import ProfileForm from "./ProfileForm";
import fs from "fs";
import path from "path";

export default async function ProfileView({ handle }: { handle?: string }) {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, heroesMap, wikiColors] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    fetchHeroesAssets(),
    fetchWikiColors(),
  ]);

  // O endereço só abre para o dono; /profile redireciona para /profile/<@>
  const ownHandle: string | null = profile?.handle ?? null;
  if (handle === undefined && ownHandle) redirect(`/profile/${ownHandle}`);
  if (handle !== undefined && handle !== ownHandle) notFound();

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
        art: local ? `/heroes/${local}` : `https://cdn.deadlock.wiki/thumb/${file}_Render.png/800px-${file}_Render.png`,
        tagBg: theme.tagBg,
        playable: extractColor(h, wikiColors) !== null,
        rgb: theme.rgb,
      };
    });

  const createdAtDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
    : "Recentemente";

  const initialProfile = {
    id: user.id,
    username: profile?.username || user.user_metadata?.username || "",
    bio: profile?.bio ?? "",
    handle: ownHandle ?? "",
    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    steam_id: profile?.steam_id || "",
    favorite_hero_id: profile?.favorite_hero_id ?? null,
    banner_hero_id: profile?.banner_hero_id ?? null,
    banner_image: profile?.banner_image ?? null,
    createdAt: createdAtDate,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-4 md:px-8 md:pb-8 space-y-6">

      <ProfileForm
        initialProfile={initialProfile}
        heroes={heroesList}
        userEmail={user.email || ""}
      />
    </div>
  );
}