import type { Metadata } from "next";
import PlayerbaseClient from "./PlayerbaseClient";

export const metadata: Metadata = {
  title: "LockPro • Playerbase de Deadlock",
  description: "Atividade diária de jogadores, partidas, regiões e distribuição de patentes em Deadlock.",
};

export default function PlayerbasePage() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <PlayerbaseClient />
    </div>
  );
}