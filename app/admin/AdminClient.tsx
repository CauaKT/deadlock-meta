"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  deleteAdminUser,
  deleteTierList,
  getAdminOverview,
  getAdminUsers,
  getCommunityTierLists,
} from "@/lib/backend/client";
import type {
  AdminOverview,
  AdminUserItem,
  TierListItem,
} from "@/lib/backend/types";

// O e-mail já chega mascarado da API; o nick ajuda a distinguir contas parecidas
const accountLabel = (u: AdminUserItem) =>
  u.profile?.username ? `${u.profile.username} (${u.email})` : u.email;

export default function AdminClient({ currentUserId }: { currentUserId: string }) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tierLists, setTierLists] = useState<TierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const loadData = async (nextPage = page, nextSearch = search) => {
    setLoading(true);
    const [ov, usr, tls] = await Promise.all([
      getAdminOverview(),
      getAdminUsers({ page: nextPage, limit: 15, search: nextSearch }),
      getCommunityTierLists(),
    ]);
    setOverview(ov);
    if (usr) {
      setUsers(usr.items);
      setTotalUsers(usr.total);
    }
    setTierLists(tls);
    setLoading(false);
  };

  useEffect(() => {
    void loadData(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void loadData(1, search);
  };

  const handleDeleteUser = async (u: AdminUserItem) => {
    if (!window.confirm(`Tem certeza que deseja apagar permanentemente a conta ${accountLabel(u)}?`)) {
      return;
    }
    setDeletingUserId(u.id);
    setFeedback(null);
    const res = await deleteAdminUser(u.id);
    setDeletingUserId(null);
    if (!res.ok) {
      setFeedback({ type: "error", text: res.message });
      return;
    }
    setFeedback({ type: "success", text: `Conta ${accountLabel(u)} apagada permanentemente.` });
    void loadData(page, search);
  };

  const handleDeleteTierList = async (tl: TierListItem) => {
    setFeedback(null);
    const res = await deleteTierList(tl.id);
    if (!res.ok) {
      setFeedback({ type: "error", text: res.message });
      return;
    }
    setTierLists((prev) => prev.filter((item) => item.id !== tl.id));
    setFeedback({ type: "success", text: `Tier list "${tl.title}" removida.` });
  };

  const totalPages = Math.max(1, Math.ceil(totalUsers / 15));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="font-deadlock text-3xl font-black uppercase tracking-tight text-[#f4efe6]">
            Painel <span className="text-amber-500">Admin</span>
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            Visão geral de saúde, contas e moderação de tier lists.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData(page, search)}
          className="cursor-pointer rounded-[5px] border border-neutral-700 bg-[#0a0d0c] px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-200 hover:border-amber-500 hover:text-amber-400"
        >
          Atualizar
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border p-3.5 text-xs font-bold ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
              : "border-rose-500/40 bg-rose-950/30 text-rose-300"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Saúde e Contagens */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Usuários", value: overview?.counts.users ?? "—" },
          { label: "Verificados", value: overview?.counts.verifiedUsers ?? "—" },
          { label: "Admins", value: overview?.counts.admins ?? "—" },
          { label: "Perfis", value: overview?.counts.profiles ?? "—" },
          { label: "Tier Lists", value: overview?.counts.tierLists ?? "—" },
        ].map((card) => (
          <div key={card.label} className="rounded-[5px] border-2 border-neutral-800/90 bg-[#0a0d0c]/95 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500">{card.label}</p>
            <p className="mt-1 font-deadlock text-2xl font-black text-amber-400">{card.value}</p>
          </div>
        ))}
      </section>

      {/* Usuários */}
      <section className="rounded-[5px] border-2 border-neutral-800/90 bg-[#0a0d0c]/95 p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">
            Usuários ({totalUsers})
          </h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar e-mail, nick ou @"
              className="w-full sm:w-64 rounded-[4px] border border-neutral-700 bg-[#070908] px-3.5 py-2 text-xs text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              className="cursor-pointer rounded-[4px] bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase text-black"
            >
              Buscar
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-800 text-[10px] uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="py-2 pr-4">Usuário</th>
                <th className="py-2 pr-4">E-mail</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-neutral-500">Carregando...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-neutral-500">Nenhum usuário encontrado.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-4">
                      <p className="font-bold text-[#f4efe6]">{u.profile?.username || "Sem nick"}</p>
                      {u.profile?.handle && (
                        <Link href={`/profile/${u.profile.handle}`} className="font-mono text-[11px] text-amber-400 hover:underline">
                          @{u.profile.handle}
                        </Link>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-mono text-neutral-300">{u.email}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          u.emailVerified
                            ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
                            : "border-amber-500/40 bg-amber-950/30 text-amber-300"
                        }`}
                      >
                        {u.emailVerified ? "Verificado" : "Pendente"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-deadlock font-black text-neutral-200">{u.role}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        disabled={u.id === currentUserId || deletingUserId === u.id}
                        onClick={() => void handleDeleteUser(u)}
                        className="cursor-pointer rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-900/50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deletingUserId === u.id ? "Apagando..." : "Apagar"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                const next = page - 1;
                setPage(next);
                void loadData(next, search);
              }}
              className="cursor-pointer rounded-lg border border-neutral-800 px-3 py-1 text-xs text-neutral-300 disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-xs text-neutral-400">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                void loadData(next, search);
              }}
              className="cursor-pointer rounded-lg border border-neutral-800 px-3 py-1 text-xs text-neutral-300 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </section>

      {/* Moderação de Tier Lists */}
      <section className="rounded-[5px] border-2 border-neutral-800/90 bg-[#0a0d0c]/95 p-6 space-y-4">
        <h2 className="font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">
          Tier Lists Publicadas ({tierLists.length})
        </h2>
        <div className="space-y-2">
          {tierLists.map((tl) => (
            <div
              key={tl.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-neutral-800/90 bg-[#070908] px-4 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/tier-maker/comunidade/${tl.id}`}
                  className="font-deadlock text-sm font-black uppercase text-[#f4efe6] hover:text-amber-400"
                >
                  {tl.title}
                </Link>
                <p className="text-[11px] text-neutral-400">
                  por {tl.author} {tl.authorHandle ? `(@${tl.authorHandle})` : ""} ·{" "}
                  {new Date(tl.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDeleteTierList(tl)}
                className="cursor-pointer rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-900/50"
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}