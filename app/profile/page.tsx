import type { Metadata } from "next";
import ProfileView from "./ProfileView";

export const instant = false;

export const metadata: Metadata = {
  title: "LockPro • Meu Perfil",
  description: "Gerencie sua conta e personalize suas preferências no LockPro.",
};

export default function ProfilePage() {
  return <ProfileView />;
}