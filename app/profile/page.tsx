import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchHeroesAssets } from "@/lib/deadlock";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const heroesMap = await fetchHeroesAssets();
  const heroesList = Object.values(heroesMap)
    .filter((h) => !h.name.startsWith("hero_"))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((h) => ({
      id: h.id,
      name: h.name,
      image: h.images?.icon_hero_card || h.images?.icon_image_small || h.images?.minimap_image || "",
    }));

  const createdAtDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");

  const initialProfile = {
    id: user.id,
    username: profile?.username || user.user_metadata?.username || "",
    steam_id: profile?.steam_id || "",
    favorite_hero_id: profile?.favorite_hero_id ?? null,
    createdAt: createdAtDate,
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-10 space-y-6">
      <header className="border-b border-neutral-800 pb-4">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#f4efe6]">
          Minha <span className="text-amber-500">Conta</span>
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm font-medium tracking-wide mt-1">
          Gerencie seu perfil, preferências e vínculo com o Deadlock.
        </p>
      </header>

      <ProfileForm
        initialProfile={initialProfile}
        heroes={heroesList}
        userEmail={user.email || ""}
      />
    </div>
  );
}