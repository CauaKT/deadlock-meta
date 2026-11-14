import type { Metadata } from "next";
import TierMakerView from "../TierMakerView";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Comunidade do TierMaker",
  description: "Tier lists de Deadlock publicadas pelos jogadores do LockPro.",
};

export default function TierMakerCommunityPage() {
  return <TierMakerView />;
}