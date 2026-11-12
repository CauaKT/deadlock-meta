import type { Metadata } from "next";
import ProfileView from "../ProfileView";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Meu Perfil",
  description: "Gerencie sua conta e personalize suas preferências no LockPro.",
};

export default async function ProfileByHandlePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <ProfileView handle={handle} />;
}