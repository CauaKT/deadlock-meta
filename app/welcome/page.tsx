import { connection } from "next/server";
import { fetchHeroesAssets, fetchWikiColors, extractColor } from "@/lib/deadlock";
import WelcomeClient from "./WelcomeClient";

export const instant = false;

export default async function WelcomePage() {
  await connection();

  // Falha na API não pode travar o cadastro: sem nomes, o campo usa um exemplo genérico
  let heroNames: string[] = [];
  try {
    const [heroesMap, wikiColors] = await Promise.all([fetchHeroesAssets(), fetchWikiColors()]);
    heroNames = Object.values(heroesMap)
      .filter((h) => !h.name.startsWith("hero_") && extractColor(h, wikiColors) !== null)
      .map((h) => h.name);
  } catch {}

  return <WelcomeClient heroNames={heroNames} />;
}