import type { Metadata } from "next";
import { loadMakerData } from "../../loadMakerData";
import { getPublicTierListById } from "@/lib/backend/server";
import TierListDetail from "./TierListDetail";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = await getPublicTierListById(id);

  if (!item) {
    return {
      title: "LockPro • Tier List não encontrada",
      robots: { index: false },
    };
  }

  const total = item.tiers.reduce((acc, t) => acc + (t.heroes?.length || 0), 0);
  const title = `${item.title} • LockPro`;
  const description = `Tier list de Deadlock por ${item.author}, com ${total} ${total === 1 ? "herói" : "heróis"}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TierListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { makerHeroes } = await loadMakerData();

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10">
      <TierListDetail id={id} heroes={makerHeroes} />
    </div>
  );
}