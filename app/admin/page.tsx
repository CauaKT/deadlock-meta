import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerAuthState } from "@/lib/backend/server";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "Painel Admin — LockPro",
};

export default async function AdminPage() {
  await connection();
  const { user } = await getServerAuthState();

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <AdminClient currentUserId={user.id} />
    </div>
  );
}