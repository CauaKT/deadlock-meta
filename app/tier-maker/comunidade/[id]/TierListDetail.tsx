"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MakerHero } from "@/app/tiers";
import TierHeroCard from "@/app/tier-list/TierHeroCard";
import { exportTierListToPng } from "@/app/tier-maker/exportTierListPng";
import TierAuthorBadge from "@/app/tier-maker/TierAuthorBadge";
import TierCommentsThread from "@/app/tier-maker/TierCommentsThread";
import TierQuadrantBoard, {
  getPolygonShapeName,
  getQuadrantAxes,
} from "@/app/tier-maker/TierQuadrantBoard";
import {
  createFeedPost,
  getCurrentClientUser,
  getTierListById,
  recordTierListView,
  toggleTierListLike,
  toggleTierListSave,
} from "@/lib/backend/client";
import type { AuthUser, TierListComment, TierListItem } from "@/lib/backend/types";

export default function TierListDetail({ id, heroes }: { id: string; heroes: MakerHero[] }) {
  const [item, setItem] = useState<TierListItem | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [comments, setComments] = useState<TierListComment[]>([]);
  const [likeBusy, setLikeBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

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

    void recordTierListView(id);

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

  const handleToggleSave = async () => {
    if (!item) return;
    if (!currentUser) {
      setFeedback({
        type: "error",
        text: "Entre na sua conta para salvar esta tier list.",
        needsLogin: true,
      });
      return;
    }
    if (saveBusy) return;

    const prevSaved = Boolean(item.savedByMe);
    const prevCount = item.savesCount ?? 0;

    setSaveBusy(true);
    setItem((prev) =>
      prev
        ? {
            ...prev,
            savedByMe: !prevSaved,
            savesCount: Math.max(0, prevCount + (prevSaved ? -1 : 1)),
          }
        : prev,
    );

    const res = await toggleTierListSave(item.id);
    setSaveBusy(false);

    if (!res.ok) {
      setItem((prev) =>
        prev ? { ...prev, savedByMe: prevSaved, savesCount: prevCount } : prev,
      );
      setFeedback({
        type: "error",
        text: res.message ?? "Não foi possível salvar.",
        needsLogin: res.status === 401,
      });
      return;
    }

    setItem((prev) =>
      prev ? { ...prev, savedByMe: res.saved, savesCount: res.savesCount } : prev,
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
  const createdDate = new Date(item.createdAt);
  const diffMin = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / 60_000));
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  const dateText =
    diffMin < 1
      ? "agora"
      : diffMin < 60
        ? `${diffMin} min atrás`
        : diffHours < 24
          ? `${diffHours} h atrás`
          : diffDays < 30
            ? `${diffDays} ${diffDays === 1 ? "dia" : "dias"} atrás`
            : diffMonths < 12
              ? `${diffMonths} ${diffMonths === 1 ? "mês" : "meses"} atrás`
              : `${diffYears} ${diffYears === 1 ? "ano" : "anos"} atrás`;
  const fullDateTitle = createdDate.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const shapeLabel =
    isQuadrant && item.quadrant
      ? getPolygonShapeName(getQuadrantAxes(item.quadrant).length)
      : "Clássica";
  const likesCount = item.likesCount ?? 0;
  const savesCount = item.savesCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/tier-maker/comunidade"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-400 transition-colors hover:text-amber-400"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3 5 8l5 5" />
          </svg>
          <span>Voltar para a Comunidade</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-white/10 bg-neutral-900 px-2 py-0.5 font-deadlock text-[10px] font-black uppercase tracking-wider text-neutral-300">
            {shapeLabel}
          </span>
          <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-300">
            {totalPlaced} {totalPlaced === 1 ? "herói" : "heróis"}
          </span>
        </div>
      </div>

      <header className="space-y-4 border-b border-neutral-800 pb-5">
        <div className="space-y-2">
          <h1 className="font-deadlock text-3xl font-black leading-tight text-[#f4efe6] md:text-4xl">
            {item.title}
          </h1>
          {item.description && (
            <p className="max-w-4xl whitespace-pre-line text-sm leading-relaxed text-neutral-300">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-neutral-800/70 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5 text-xs text-neutral-400">
            <TierAuthorBadge
              name={item.author}
              handle={item.authorHandle}
              avatarUrl={item.authorAvatarUrl}
              size="md"
              prefix="Por"
              showHandle={false}
              pill={false}
            />
            <span
              title={fullDateTitle}
              className="inline-flex h-[38px] shrink-0 items-center gap-2 px-1 text-xs sm:text-sm font-semibold text-neutral-400"
            >
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="h-4 w-4 text-neutral-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="12" height="11" rx="2" />
                <path d="M5 1.5V4M11 1.5V4M2 6.5h12" />
              </svg>
              <span>{dateText}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={likeBusy}
              title={item.likedByMe ? "Remover curtida" : "Curtir"}
              aria-label={`Curtir (${likesCount})`}
              aria-pressed={Boolean(item.likedByMe)}
              onClick={() => void handleToggleLike()}
              className={`inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-2.5 font-deadlock text-sm font-black tracking-wider transition-colors ${
                item.likedByMe
                  ? "text-rose-400 hover:bg-rose-500/10"
                  : "text-neutral-300 hover:bg-rose-500/10 hover:text-rose-300"
              }`}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill={item.likedByMe ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19.5 12.572 12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572z" />
              </svg>
              <span className="tabular-nums">{likesCount}</span>
            </button>

            <button
              type="button"
              disabled={saveBusy}
              title={item.savedByMe ? "Remover dos salvos" : "Salvar"}
              aria-label={`Salvar (${savesCount})`}
              aria-pressed={Boolean(item.savedByMe)}
              onClick={() => void handleToggleSave()}
              className={`inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-2.5 font-deadlock text-sm font-black tracking-wider transition-colors ${
                item.savedByMe
                  ? "text-amber-400 hover:bg-amber-500/10"
                  : "text-neutral-300 hover:bg-amber-500/10 hover:text-amber-300"
              }`}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill={item.savedByMe ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <span className="tabular-nums">{savesCount}</span>
            </button>

            <span aria-hidden className="mx-0.5 hidden h-5 w-px bg-neutral-800 sm:block" />

            <button
              type="button"
              onClick={openFeedModal}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-500/50 bg-emerald-950/30 px-3 font-deadlock text-[11px] font-black uppercase tracking-wider text-emerald-300 shadow transition-all hover:border-emerald-400 hover:bg-emerald-950/50"
            >
              Postar no Feed
            </button>

            <button
              type="button"
              onClick={() => void copyLink()}
              className={`inline-flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 font-deadlock text-[11px] font-black uppercase tracking-wider shadow transition-all ${
                copied
                  ? "border-amber-500/70 bg-amber-500/15 text-amber-300"
                  : "border-neutral-700/80 bg-neutral-900/90 text-neutral-300 hover:border-amber-500/70 hover:bg-neutral-800 hover:text-[#f4efe6]"
              }`}
            >
              {copied ? "Link copiado!" : "Copiar link"}
            </button>

            <button
              type="button"
              disabled={exporting}
              onClick={exportPng}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-700/80 bg-neutral-900/90 px-3 font-deadlock text-[11px] font-black uppercase tracking-wider text-amber-400 shadow transition-all hover:border-amber-400 hover:bg-neutral-800 disabled:opacity-50"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13.5h11" />
              </svg>
              <span>{exporting ? "Gerando..." : "Exportar PNG"}</span>
            </button>

            {item.canEdit && (
              <Link
                href={`/tier-maker?edit=${item.id}`}
                title="Abrir no editor"
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-700/80 bg-neutral-800/80 px-3 font-deadlock text-[11px] font-black uppercase tracking-wider text-[#f4efe6] shadow transition-all hover:border-amber-500/80 hover:text-amber-400"
              >
                <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L4.5 13.5 2 14l.5-2.5L11.5 2.5z" />
                </svg>
                <span>Editar</span>
              </Link>
            )}
          </div>
        </div>
      </header>

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
        <div className="divide-y divide-neutral-800/90 rounded-2xl border border-neutral-800/90 bg-[#0a0d0c]/95 shadow-2xl">
          {item.tiers.map((t, idx) => {
            const tierHeroes = heroesOf(t.heroes);
            const isFirst = idx === 0;
            const isLast = idx === item.tiers.length - 1;
            const cleanTierLabel = t.label.replace(/\n+/g, " ");
            return (
              <div key={idx} className="flex min-h-[105px] flex-row">
                <div
                  style={{ backgroundColor: t.color }}
                  className={`flex w-24 shrink-0 items-center justify-center border-r border-black/40 p-2 text-center select-none sm:w-36 ${
                    isFirst ? "rounded-tl-[15px]" : ""
                  } ${isLast ? "rounded-bl-[15px]" : ""}`}
                >
                  <span className="font-deadlock break-words px-1 text-sm font-black uppercase leading-tight text-black sm:text-base">
                    {cleanTierLabel}
                  </span>
                </div>
                <div
                  className={`flex flex-1 flex-wrap content-center items-center gap-2 bg-[#070908]/90 p-2.5 sm:gap-2.5 sm:p-3 ${
                    isFirst ? "rounded-tr-[15px]" : ""
                  } ${isLast ? "rounded-br-[15px]" : ""}`}
                >
                  {tierHeroes.length === 0 ? (
                    <span className="px-1 text-xs italic text-neutral-600">—</span>
                  ) : (
                    tierHeroes.map((h) => (
                      <TierHeroCard
                        key={h.id}
                        href={`/heroes/${h.id}`}
                        metricId="winrate"
                        metricShortLabel="Win Rate"
                        showCardMetric={false}
                        customBadge={{ label: cleanTierLabel, color: t.color }}
                        hero={{
                          id: h.id,
                          name: h.name,
                          image: h.image,
                          bgImage: h.bgImage ?? "",
                          bannerImage: h.bannerImage ?? "",
                          rgb: h.rgb,
                          tags: h.tags ?? [],
                          matches: h.matches ?? 0,
                          winRate: h.winRate ?? 0,
                          pickRate: h.pickRate ?? 0,
                          metricValue: h.winRate ?? 0,
                          scoreBreakdown: [],
                          tier: h.metaTier ?? "B",
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section
        aria-label="Comentários"
        className="space-y-4 rounded-2xl border border-neutral-800/90 bg-[#0a0d0c]/95 p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-center justify-between gap-3 border-b border-neutral-800/80 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="h-4 w-1 rounded-full bg-amber-500" />
            <h2 className="font-deadlock text-lg sm:text-xl font-black uppercase tracking-wider text-[#f4efe6]">
              Comentários
            </h2>
            <span className="rounded-[4px] border border-neutral-800 bg-neutral-900/90 px-2 py-0.5 font-deadlock text-xs font-black tabular-nums text-amber-400">
              {comments.length}
            </span>
          </div>
        </div>

        <TierCommentsThread
          tierListId={item.id}
          comments={comments}
          currentUser={currentUser}
          loginRedirectPath={`/tier-maker/comunidade/${item.id}`}
          onCommentAdded={(newComment) => {
            setFeedback(null);
            setComments((prev) => {
              const updated = newComment.parentId
                ? prev.map((c) =>
                    c.id === newComment.parentId
                      ? { ...c, repliesCount: (c.repliesCount ?? 0) + 1 }
                      : c,
                  )
                : prev;
              return [...updated, newComment];
            });
            setItem((prev) =>
              prev ? { ...prev, commentsCount: (prev.commentsCount ?? 0) + 1 } : prev,
            );
          }}
          onCommentUpdated={(commentId, patch) => {
            setComments((prev) =>
              prev.map((c) => (c.id === commentId ? { ...c, ...patch } : c)),
            );
          }}
          onCommentDeleted={(deletedIds) => {
            const deletedSet = new Set(deletedIds);
            setComments((prev) => {
              const deletedParents = prev
                .filter((c) => deletedSet.has(c.id) && c.parentId && !deletedSet.has(c.parentId))
                .map((c) => c.parentId!);
              return prev
                .filter((c) => !deletedSet.has(c.id))
                .map((c) => {
                  const dec = deletedParents.filter((pid) => pid === c.id).length;
                  return dec > 0
                    ? { ...c, repliesCount: Math.max(0, (c.repliesCount ?? 0) - dec) }
                    : c;
                });
            });
            setItem((prev) =>
              prev
                ? {
                    ...prev,
                    commentsCount: Math.max(0, (prev.commentsCount ?? 0) - deletedIds.length),
                  }
                : prev,
            );
          }}
          onRequireLogin={(msg) =>
            setFeedback({ type: "error", text: msg, needsLogin: true })
          }
          onError={(msg) => setFeedback({ type: "error", text: msg })}
        />
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
      </div>
  );
}