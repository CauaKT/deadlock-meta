import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchHeroesAssets, fetchWikiColors, extractHeroTheme } from "@/lib/deadlock";
import ProfileForm from "./ProfileForm";
import type { Metadata } from "next";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Meu Perfil",
  description: "Gerencie sua conta e personalize suas preferências no LockPro.",
};

export default async function ProfilePage() {
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

  const heroesList = Object.values(heroesMap)
    .filter((h) => !h.name.startsWith("hero_"))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((h) => {
      const theme = extractHeroTheme(h, wikiColors);
      const bg = h.images?.background_image_webp || h.images?.background_image || "";
      return {
        id: h.id,
        name: h.name,
        image: h.images?.icon_hero_card || h.images?.icon_image_small || h.images?.minimap_image || "",
        banner: bg,
        rgb: theme.rgb,
      };
    });

  const createdAtDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
    : "Recentemente";

  const initialProfile = {
    id: user.id,
    username: profile?.username || user.user_metadata?.username || "",
    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    steam_id: profile?.steam_id || "",
    favorite_hero_id: profile?.favorite_hero_id ?? null,
    createdAt: createdAtDate,
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">

      <ProfileForm
        initialProfile={initialProfile}
        heroes={heroesList}
        userEmail={user.email || ""}
      />
    </div>
  );
}