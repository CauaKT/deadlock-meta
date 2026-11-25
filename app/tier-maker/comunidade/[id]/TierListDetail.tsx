"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmModal";
import type { MakerHero } from "@/app/tiers";
import { exportTierListToPng } from "@/app/tier-maker/exportTierListPng";
import TierAuthorBadge from "@/app/tier-maker/TierAuthorBadge";
import TierQuadrantBoard, {
  getPolygonShapeName,
  getQuadrantAxes,
} from "@/app/tier-maker/TierQuadrantBoard";
import {
  createFeedPost,
  createTierListComment,
  deleteTierListComment,
  getCurrentClientUser,
  getTierListById,
  recordTierListView,
  toggleTierListLike,
} from "@/lib/backend/client";
import type { AuthUser, TierListComment, TierListItem } from "@/lib/backend/types";

export default function TierListDetail({ id, heroes }: { id: string; heroes: MakerHero[] }) {
  const { confirm, modal } = useConfirm();
  const [item, setItem] = useState<TierListItem | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [comments, setComments] = useState<TierListComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
    actionHref?: string;
    actionLabel?: string;
    needsLogin?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [feedModalOpen, setFeedModalOpen] = useState(false);
  const [feedContent, setFeedContent] = useState("");
  const [postingToFeed, setPostingToFeed] = useState(false);

  const byId = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  useEffect(() => {
    let active = true;
    Promise.all([getTierListById(id), getCurrentClientUser()]).then(([res, user]) => {
      if (!active) return;
      setCurrentUser(user);
      if (res.ok) {
        setItem(res.data);
        setComments(res.data.comments ?? res.data.recentComments ?? []);
      } else {
        setNotFound(true);
      }
    });

    void recordTierListView(id).then((views) => {
      if (!active || views === null) return;
      setItem((prev) => (prev ? { ...prev, viewsCount: views } : prev));
    });

    return () => {
      active = false;
    };
  }, [id]);

  const heroesOf = (ids: number[] | undefined) =>
    (ids || []).map((hId) => byId.get(hId)).filter((h): h is MakerHero => Boolean(h));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleNativeShare = async () => {
    if (!item) return;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${item.title} • LockPro`,
          text: `Confira esta tier list de Deadlock por ${item.author}`,
          url: window.location.href,
        });
        return;
      } catch {}
    }
    await copyLink();
  };

  const handleToggleLike = async () => {
    if (!item) return;
    if (!currentUser) {
      setFeedback({
        type: "error",
        text: "Entre na sua conta para curtir esta tier list.",
        needsLogin: true,
      });
      return;
    }
    if (likeBusy) return;

    const prevLiked = Boolean(item.likedByMe);
    const prevCount = item.likesCount ?? 0;

    setLikeBusy(true);
    setItem((prev) =>
      prev
        ? {
            ...prev,
            likedByMe: !prevLiked,
            likesCount: Math.max(0, prevCount + (prevLiked ? -1 : 1)),
          }
        : prev,
    );

    const res = await toggleTierListLike(item.id);
    setLikeBusy(false);

    if (!res.ok) {
      setItem((prev) =>
        prev ? { ...prev, likedByMe: prevLiked, likesCount: prevCount } : prev,
      );
      setFeedback({
        type: "error",
        text: res.message ?? "Não foi possível curtir.",
        needsLogin: res.status === 401,
      });
      return;
    }

    setItem((prev) =>
      prev ? { ...prev, likedByMe: res.liked, likesCount: res.likesCount } : prev,
    );
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !commentText.trim() || commentBusy) return;
    if (!currentUser) {
      setFeedback({
        type: "error",
        text: "Entre na sua conta para comentar.",
        needsLogin: true,
      });
      return;
    }

    setCommentBusy(true);
    setFeedback(null);
    const { comment, status, error } = await createTierListComment(item.id, commentText.trim());
    setCommentBusy(false);

    if (error || !comment) {
      setFeedback({
        type: "error",
        text: error ?? "Não foi possível comentar.",
        needsLogin: status === 401,
      });
      return;
    }

    setComments((prev) => [...prev, comment]);
    setCommentText("");
    setItem((prev) =>
      prev ? { ...prev, commentsCount: (prev.commentsCount ?? 0) + 1 } : prev,
    );
  };

  const handleDeleteComment = async (commentId: string) => {
    const ok = await confirm({
      title: "Excluir comentário?",
      description: "Este comentário será removido permanentemente.",
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;

    const res = await deleteTierListComment(commentId);
    if (!res.ok) {
      setFeedback({ type: "error", text: res.error ?? "Não foi possível excluir." });
      return;
    }

    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setItem((prev) =>
      prev
        ? { ...prev, commentsCount: Math.max(0, (prev.commentsCount ?? 0) - 1) }
        : prev,
    );
  };

  const openFeedModal = () => {
    if (!item) return;
    if (!currentUser) {
      setFeedback({
        type: "error",
        text: "Entre na sua conta para postar esta tier list no Feed.",
        needsLogin: true,
      });
      return;
    }
    setFeedContent(
      item.userId === currentUser.id
        ? `Confira minha tier list "${item.title}"!`
        : `Olhem essa tier list "${item.title}" de ${item.author}:`,
    );
    setFeedModalOpen(true);
  };

  const handlePostToFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !feedContent.trim() || postingToFeed) return;
    setPostingToFeed(true);
    const { post, error } = await createFeedPost({
      content: feedContent.trim(),
      tierListId: item.id,
    });
    setPostingToFeed(false);
    if (error || !post) {
      setFeedback({ type: "error", text: error ?? "Não foi possível postar no Feed." });
      return;
    }
    setFeedModalOpen(false);
    setFeedback({
      type: "success",
      text: "Tier list publicada no Feed da Comunidade!",
      actionHref: "/feed",
      actionLabel: "Ver no Feed",
    });
  };

  const exportPng = async () => {
    if (!item) return;
    setExporting(true);
    setFeedback(null);
    try {
      if (item.style === "quadrant" && item.quadrant) {
        await exportTierListToPng({
          title: item.title,
          author: item.author,
          dateLabel: new Date(item.createdAt).toLocaleDateString("pt-BR"),
          style: "quadrant",
          tiers: [],
          quadrant: {
            topLabel: item.quadrant.topLabel,
            bottomLabel: item.quadrant.bottomLabel,
            leftLabel: item.quadrant.leftLabel,
            rightLabel: item.quadrant.rightLabel,
            axes: getQuadrantAxes(item.quadrant),
            heroes: item.quadrant.items
              .map((it) => {
                const h = byId.get(it.heroId);
                if (!h) return null;
                return {
                  id: h.id,
                  name: h.name,
                  image: h.icon || h.image,
                  rgb: h.rgb,
                  x: it.x,
                  y: it.y,
                };
              })
              .filter((h): h is NonNullable<typeof h> => Boolean(h)),
          },
        });
      } else {
        await exportTierListToPng({
          title: item.title,
          author: item.author,
          dateLabel: new Date(item.createdAt).toLocaleDateString("pt-BR"),
          style: "classic",
          tiers: item.tiers.map((t) => ({
            label: t.label,
            color: t.color,
            heroes: heroesOf(t.heroes).map((h) => ({ id: h.id, name: h.name, image: h.image })),
          })),
        });
      }
    } catch {
      setFeedback({ type: "error", text: "Não foi possível gerar o arquivo PNG." });
    } finally {
      setExporting(false);
    }
  };

  if (notFound) {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-neutral-800/90 bg-neutral-900/20 px-4 py-16 text-center">
        <p className="font-deadlock text-xl font-black text-[#f4efe6]">Tier list não encontrada</p>
        <p className="text-xs text-neutral-400">O link pode estar incorreto ou a tier list foi excluída.</p>
        <Link
          href="/tier-maker/comunidade"
          className="inline-block rounded-lg border border-amber-500 bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black"
        >
          Ver a Comunidade
        </Link>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/30 py-16 text-center text-xs text-neutral-400">
        Carregando tier list...
      </div>
    );
  }

  const isQuadrant = item.style === "quadrant" && Boolean(item.quadrant);
  const totalPlaced =
    isQuadrant && item.quadrant
      ? item.quadrant.items.length
      : item.tiers.reduce((acc, t) => acc + (t.heroes?.length || 0), 0);
  const dateText = new Date(item.createdAt).toLocaleDateString("pt-BR");
  const shapeLabel =
    isQuadrant && item.quadrant
      ? getPolygonShapeName(getQuadrantAxes(item.quadrant).length)
      : "Clássica";
  const likesCount = item.likesCount ?? 0;
  const viewsCount = item.viewsCount ?? 0;

  return (
    <div className="space-y-6">
      <Link
        href="/tier-maker/comunidade"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-400 transition-colors hover:text-amber-400"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3 5 8l5 5" />
        </svg>
        <span>Voltar para a Comunidade</span>
      </Link>

      <div className="flex flex-col gap-4 border-b border-neutral-800 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-white/10 bg-neutral-900 px-2 py-0.5 font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-300">
              {shapeLabel}
            </span>
            <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-300">
              {totalPlaced} {totalPlaced === 1 ? "herói" : "heróis"}
            </span>
            <span className="text-[11px] font-semibold text-neutral-500">
              {viewsCount} {viewsCount === 1 ? "visualização" : "visualizações"}
            </span>
          </div>

          <h1 className="font-deadlock text-3xl font-black text-[#f4efe6] md:text-4xl">{item.title}</h1>

          {item.description && (
            <p className="max-w-2xl text-sm leading-relaxed text-neutral-300">{item.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <TierAuthorBadge
              name={item.author}
              handle={item.authorHandle}
              avatarUrl={item.authorAvatarUrl}
              size="md"
              prefix="Por"
            />
            <span>•</span>
            <span>{dateText}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={likeBusy}
            onClick={() => void handleToggleLike()}
            className={`cursor-pointer rounded-[5px] border px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider shadow transition-all ${
              item.likedByMe
                ? "border-rose-500/60 bg-rose-500/15 text-rose-300"
                : "border-neutral-700/80 bg-neutral-900/90 text-neutral-200 hover:border-rose-500/50 hover:text-rose-300"
            }`}
          >
            {item.likedByMe ? "♥" : "♡"} Curtir ({likesCount})
          </button>

          <button
            type="button"
            onClick={openFeedModal}
            className="cursor-pointer rounded-[5px] border border-emerald-500/50 bg-emerald-950/30 px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-emerald-300 shadow transition-all hover:border-emerald-400 hover:bg-emerald-950/50"
          >
            Postar no Feed
          </button>

          <button
            type="button"
            onClick={() => void handleNativeShare()}
            className="cursor-pointer rounded-[5px] border border-neutral-700/80 bg-neutral-900/90 px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300 shadow transition-all hover:border-amber-500/70 hover:bg-neutral-800 hover:text-[#f4efe6]"
          >
            {copied ? "Link copiado!" : "Compartilhar"}
          </button>

          <button
            type="button"
            disabled={exporting}
            onClick={exportPng}
            className="cursor-pointer rounded-[5px] border border-neutral-700/80 bg-neutral-900/90 px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-amber-400 shadow transition-all hover:border-amber-400 hover:bg-neutral-800 disabled:opacity-50"
          >
            {exporting ? "Gerando..." : "Exportar PNG"}
          </button>

          <Link
            href={`/tier-maker?duplicate=${item.id}`}
            className="rounded-[5px] border border-neutral-700/80 bg-neutral-900/90 px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-200 shadow transition-all hover:border-neutral-500 hover:text-white"
          >
            Duplicar
          </Link>

          {item.canEdit && (
            <Link
              href={`/tier-maker?edit=${item.id}`}
              className="rounded-[5px] border border-neutral-700/80 bg-neutral-800/80 px-3.5 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] shadow transition-all hover:border-amber-500/80 hover:text-amber-400"
            >
              Abrir no Editor
            </Link>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-bold ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
              : "border-rose-500/40 bg-rose-950/30 text-rose-300"
          }`}
        >
          <span>{feedback.text}</span>
          <div className="flex flex-wrap gap-2">
            {feedback.actionHref && feedback.actionLabel && (
              <Link
                href={feedback.actionHref}
                className="rounded-lg bg-emerald-500 px-3 py-1 font-deadlock text-[11px] font-black uppercase text-black"
              >
                {feedback.actionLabel}
              </Link>
            )}
            {feedback.needsLogin && (
              <Link
                href={`/login?next=${encodeURIComponent(`/tier-maker/comunidade/${item.id}`)}`}
                className="rounded-lg bg-amber-500 px-3 py-1 font-deadlock text-[11px] font-black uppercase text-black"
              >
                Fazer Login
              </Link>
            )}
          </div>
        </div>
      )}

      {isQuadrant && item.quadrant ? (
        <TierQuadrantBoard
          mode="detail"
          quadrant={item.quadrant}
          byId={byId}
        />
      ) : item.tiers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 py-14 text-center text-xs italic text-neutral-500">
          Esta tier list não possui categorias visíveis.
        </div>
      ) : (
        <div className="divide-y divide-neutral-800/90 overflow-hidden rounded-2xl border border-neutral-800/90 bg-neutral-900/50 shadow-2xl">
          {item.tiers.map((t, idx) => {
            const tierHeroes = heroesOf(t.heroes);
            return (
              <div key={idx} className="flex min-h-[72px] flex-row">
                <div
                  style={{ backgroundColor: t.color }}
                  className="flex w-24 shrink-0 items-center justify-center p-2 text-center select-none sm:w-36"
                >
                  <span className="font-deadlock break-words px-1 text-sm font-black uppercase leading-tight text-black sm:text-base">
                    {t.label.replace(/\n+/g, " ")}
                  </span>
                </div>
                <div className="flex flex-1 flex-wrap content-center items-center gap-2 bg-neutral-950/75 p-3">
                  {tierHeroes.length === 0 ? (
                    <span className="px-1 text-xs italic text-neutral-600">—</span>
                  ) : (
                    tierHeroes.map((h) => (
                      <div
                        key={h.id}
                        title={h.name}
                        className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-sm sm:h-14 sm:w-14"
                      >
                        <img src={h.image} alt={h.name} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-neutral-800/90 bg-neutral-900/40 p-5 shadow-xl">
        <h2 className="font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">
          Comentários ({comments.length})
        </h2>

        {currentUser ? (
          <form onSubmit={(e) => void handleAddComment(e)} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              maxLength={300}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva o que achou desta tier list..."
              className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-black/50 px-3.5 py-2 text-xs text-[#f4efe6] placeholder:text-neutral-500 outline-none focus:border-amber-500/60"
            />
            <button
              type="submit"
              disabled={commentBusy || !commentText.trim()}
              className="cursor-pointer rounded-lg border border-amber-500/60 bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {commentBusy ? "Enviando..." : "Comentar"}
            </button>
          </form>
        ) : (
          <p className="text-xs text-neutral-400">
            <Link
              href={`/login?next=${encodeURIComponent(`/tier-maker/comunidade/${item.id}`)}`}
              className="font-bold text-amber-400 hover:underline"
            >
              Entre na sua conta
            </Link>{" "}
            para curtir e comentar.
          </p>
        )}

        {comments.length === 0 ? (
          <p className="py-4 text-center text-xs italic text-neutral-500">
            Nenhum comentário ainda. Seja o primeiro!
          </p>
        ) : (
          <div className="space-y-2.5">
            {comments.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-neutral-800/70 bg-black/35 px-3.5 py-3"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  {c.author.avatarUrl ? (
                    <img
                      src={c.author.avatarUrl}
                      alt={c.author.username}
                      className="h-8 w-8 shrink-0 rounded-full border border-neutral-700 object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 text-xs font-black uppercase text-amber-400">
                      {c.author.username.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {c.author.handle ? (
                        <Link
                          href={`/profile/${encodeURIComponent(c.author.handle)}`}
                          className="font-bold text-[#f4efe6] hover:text-amber-400"
                        >
                          {c.author.username}{" "}
                          <span className="font-mono text-[11px] font-normal text-neutral-400">
                            @{c.author.handle}
                          </span>
                        </Link>
                      ) : (
                        <span className="font-bold text-[#f4efe6]">{c.author.username}</span>
                      )}
                      <span className="text-[10px] text-neutral-500">
                        {new Date(c.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-neutral-300">
                      {c.content}
                    </p>
                  </div>
                </div>
                {c.canDelete && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteComment(c.id)}
                    className="shrink-0 cursor-pointer text-[10px] font-bold uppercase text-rose-400 hover:underline"
                  >
                    Excluir
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {feedModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Postar tier list no Feed"
          onClick={() => {
            if (!postingToFeed) setFeedModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">
                  Postar no Feed da Comunidade
                </h3>
                <p className="text-xs text-neutral-400">
                  A postagem incluirá um card interativo desta tier list.
                </p>
              </div>
              <button
                type="button"
                disabled={postingToFeed}
                onClick={() => setFeedModalOpen(false)}
                className="cursor-pointer rounded-lg px-2 py-1 text-sm font-bold text-neutral-400 hover:bg-neutral-900 hover:text-white"
              >
                ×
              </button>
            </div>
            <form onSubmit={(e) => void handlePostToFeed(e)} className="space-y-3">
              <textarea
                rows={3}
                maxLength={500}
                value={feedContent}
                onChange={(e) => setFeedContent(e.target.value)}
                className="w-full resize-y rounded-lg border border-neutral-800 bg-black/60 p-3 text-sm text-[#f4efe6] outline-none focus:border-amber-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={postingToFeed}
                  onClick={() => setFeedModalOpen(false)}
                  className="cursor-pointer rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2 font-deadlock text-xs font-black uppercase text-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={postingToFeed || !feedContent.trim()}
                  className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 font-deadlock text-xs font-black uppercase text-black hover:bg-emerald-400 disabled:opacity-50"
                >
                  {postingToFeed ? "Publicando..." : "Publicar no Feed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {modal}
    </div>
  );
}