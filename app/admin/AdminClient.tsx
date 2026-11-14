"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  deleteAdminUser,
  deleteTierList,
  getAdminOverview,
  getAdminUsers,
  getCommunityTierLists,
  resetAdminUserPassword,
  updateAdminUserRole,
} from "@/lib/backend/client";
import type {
  AdminOverview,
  AdminUserItem,
  TierListItem,
} from "@/lib/backend/types";

export default function AdminClient({ currentUserId }: { currentUserId: string }) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tierLists, setTierLists] = useState<TierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
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

  const handleRoleToggle = async (u: AdminUserItem) => {
    const nextRole = u.role === "ADMIN" ? "USER" : "ADMIN";
    setFeedback(null);
    const res = await updateAdminUserRole(u.id, nextRole);
    if (!res.ok) {
      setFeedback({ type: "error", text: res.message });
      return;
    }
    setFeedback({
      type: "success",
      text: `Permissão de ${u.email} alterada para ${nextRole}.`,
    });
    void loadData(page, search);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (newPassword.length < 8) {
      setFeedback({ type: "error", text: "A nova senha deve ter pelo menos 8 caracteres." });
      return;
    }
    setResetSaving(true);
    setFeedback(null);
    const res = await resetAdminUserPassword(resetTarget.id, { newPassword });
    setResetSaving(false);
    if (!res.ok) {
      setFeedback({ type: "error", text: res.message });
      return;
    }
    setFeedback({
      type: "success",
      text: `Senha de ${resetTarget.email} redefinida. Sessões anteriores foram encerradas.`,
    });
    setResetTarget(null);
    setNewPassword("");
  };

  const handleLetUserChoose = async () => {
    if (!resetTarget) return;
    setResetSaving(true);
    setFeedback(null);
    const res = await resetAdminUserPassword(resetTarget.id, { letUserChoose: true });
    setResetSaving(false);
    if (!res.ok) {
      setFeedback({ type: "error", text: res.message });
      return;
    }
    setFeedback({
      type: "success",
      text: `${resetTarget.email} terá que definir uma nova senha no próximo acesso.`,
    });
    setResetTarget(null);
    setNewPassword("");
  };

  const handleDeleteUser = async (u: AdminUserItem) => {
    if (!window.confirm(`Tem certeza que deseja apagar permanentemente a conta ${u.email}?`)) {
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
    setFeedback({ type: "success", text: `Conta ${u.email} apagada permanentemente.` });
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
            Visão geral de saúde, permissões de contas e moderação de tier lists.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData(page, search)}
          className="cursor-pointer rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-200 hover:border-amber-500 hover:text-amber-400"
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
          <div key={card.label} className="rounded-2xl border border-neutral-800 bg-[#0a0d0c] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500">{card.label}</p>
            <p className="mt-1 font-deadlock text-2xl font-black text-amber-400">{card.value}</p>
          </div>
        ))}
      </section>

      {/* Usuários */}
      <section className="rounded-3xl border border-neutral-800 bg-[#0a0d0c] p-6 space-y-4">
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
              className="w-full sm:w-64 rounded-xl border border-neutral-800 bg-black/60 px-3.5 py-2 text-xs text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase text-black"
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
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={u.id === currentUserId}
                          onClick={() => void handleRoleToggle(u)}
                          className="cursor-pointer rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-[11px] font-bold text-neutral-200 hover:border-amber-500 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {u.role === "ADMIN" ? "Rebaixar para USER" : "Promover a ADMIN"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(u);
                            setNewPassword("");
                          }}
                          className="cursor-pointer rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-[11px] font-bold text-neutral-200 hover:border-cyan-500 hover:text-cyan-300"
                        >
                          Redefinir senha
                        </button>
                        <button
                          type="button"
                          disabled={u.id === currentUserId || deletingUserId === u.id}
                          onClick={() => void handleDeleteUser(u)}
                          className="cursor-pointer rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-900/50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deletingUserId === u.id ? "Apagando..." : "Apagar"}
                        </button>
                      </div>
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
      <section className="rounded-3xl border border-neutral-800 bg-[#0a0d0c] p-6 space-y-4">
        <h2 className="font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">
          Tier Lists Publicadas ({tierLists.length})
        </h2>
        <div className="space-y-2">
          {tierLists.map((tl) => (
            <div
              key={tl.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800/80 bg-black/40 px-4 py-3"
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

      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => !resetSaving && setResetTarget(null)}
        >
          <form
            onSubmit={handleResetPasswordSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-2xl border border-neutral-800 bg-[#0a0d0c] p-6 shadow-2xl"
          >
            <div>
              <h3 className="font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">
                Redefinir Senha
              </h3>
              <p className="mt-1 text-xs text-neutral-400">
                Conta: <span className="font-mono text-amber-400">{resetTarget.email}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
                Nova Senha
              </label>
              <input
                type="password"
                required
                minLength={8}
                maxLength={128}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3.5 py-2.5 text-sm text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={resetSaving}
                onClick={() => setResetTarget(null)}
                className="cursor-pointer rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-deadlock text-xs font-black uppercase text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={resetSaving}
                onClick={() => void handleLetUserChoose()}
                className="cursor-pointer rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 font-deadlock text-xs font-black uppercase text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
              >
                Deixar usuário escolher
              </button>
              <button
                type="submit"
                disabled={resetSaving}
                className="cursor-pointer rounded-xl bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase text-black hover:brightness-110 disabled:opacity-50"
              >
                {resetSaving ? "Salvando..." : "Salvar Senha"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}