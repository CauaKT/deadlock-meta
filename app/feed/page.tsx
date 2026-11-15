import type { Metadata } from "next";
import { connection } from "next/server";
import { getServerAuthUser, getServerFeedPosts } from "@/lib/backend/server";
import FeedClient from "./FeedClient";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Feed da Comunidade",
  description: "Publicações, dicas e discussões da comunidade brasileira de Deadlock.",
};

export default async function FeedPage() {
  await connection();
  const [user, initialFeed] = await Promise.all([
    getServerAuthUser(),
    getServerFeedPosts(1, 20),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-10">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-[#f4efe6] md:text-5xl">
          Feed da <span className="text-amber-500">Comunidade</span>
        </h1>
        <p className="mt-2 text-xs font-medium tracking-wide text-neutral-400 md:text-sm">
          Compartilhe ideias de builds, clipes, patch notes e opiniões com outros jogadores de Deadlock.
        </p>
      </header>

      <FeedClient initialFeed={initialFeed} initialUser={user} />
    </div>
  );
}