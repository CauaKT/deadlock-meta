import type { Metadata } from "next";
import TierMakerView from "./TierMakerView";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • TierMaker de Deadlock",
  description: "Crie, personalize e compartilhe sua própria Tier List de heróis do Deadlock.",
};

export default function TierMakerPage() {
  return <TierMakerView />;
}