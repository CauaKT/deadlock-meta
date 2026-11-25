"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useMemo, useState } from "react";
import type { MakerHero } from "@/app/tiers";
import TierQuadrantBoard from "@/app/tier-maker/TierQuadrantBoard";
import { useConfirm } from "@/components/ui/ConfirmModal";
import SlantFrame from "@/components/ui/SlantFrame";
import {
  createFeedComment,
  createFeedPost,
  deleteFeedComment,
  deleteFeedPost,
  getFeedPosts,
  toggleFeedPostLike,
} from "@/lib/backend/client";
import type { AuthUser, FeedPost, FeedResponse } from "@/lib/backend/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Avatar({
  url,
  name,
  size = "md",
}: {
  url: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "h-7 w-7 text-[11px]" : "h-10 w-10 text-sm";
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${cls} shrink-0 rounded-full border border-neutral-700 object-cover`}
      />
    );
  }
  return (
    <div
      className={`${cls} flex shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 font-black uppercase text-amber-400`}
    >
      {name.slice(0, 1)}
    </div>
  );
}

export default function FeedClient({
  initialFeed,
  initialUser,
  heroes = [],
}: {
  initialFeed: FeedResponse;
  initialUser: AuthUser | null;
  heroes?: MakerHero[];
}) {
  const { confirm, modal } = useConfirm();
  const heroById = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const [posts, setPosts] = useState<FeedPost[]>(initialFeed.items);
  const [page, setPage] = useState(initialFeed.page);
  const [hasMore, setHasMore] = useState(initialFeed.hasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState<Record<string, boolean>>({});
  const [likeBusy, setLikeBusy] = useState<Record<string, boolean>>({});

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || posting) return;
    setPosting(true);
    setError(null);
    const { post, error: err } = await createFeedPost({
      content: content.trim(),
      mediaUrl: mediaUrl.trim() || null,
    });
    setPosting(false);
    if (err || !post) {
      setError(err ?? "Erro ao publicar.");
      return;
    }
    setPosts((prev) => [post, ...prev]);
    setContent("");
    setMediaUrl("");
  };

  const handleDeletePost = async (id: string) => {
    const confirmed = await confirm({
      title: "Excluir publicação?",
      description: "A publicação e todos os comentários nela serão removidos permanentemente.",
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!confirmed) return;
    const { ok, error: err } = await deleteFeedPost(id);
    if (!ok) {
      setError(err ?? "Não foi possível excluir.");
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleToggleLike = async (postId: string) => {
    if (!initialUser || likeBusy[postId]) return;
    setLikeBusy((m) => ({ ...m, [postId]: true }));
    const res = await toggleFeedPostLike(postId);
    setLikeBusy((m) => ({ ...m, [postId]: false }));
    if (res.error) {
      setError(res.error);
      return;
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, likedByMe: res.liked, likesCount: res.likesCount } : p,
      ),
    );
  };

  const handleCreateComment = async (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const draft = (commentDrafts[postId] ?? "").trim();
    if (!draft || commentBusy[postId]) return;
    setCommentBusy((m) => ({ ...m, [postId]: true }));
    setError(null);
    const { comment, error: err } = await createFeedComment(postId, draft);
    setCommentBusy((m) => ({ ...m, [postId]: false }));
    if (err || !comment) {
      setError(err ?? "Não foi possível comentar.");
      return;
    }
    setCommentDrafts((m) => ({ ...m, [postId]: "" }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, commentsCount: p.commentsCount + 1, comments: [...p.comments, comment] }
          : p,
      ),
    );
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    const confirmed = await confirm({
      title: "Excluir comentário?",
      description: "Este comentário será removido permanentemente da publicação.",
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!confirmed) return;
    const { ok, error: err } = await deleteFeedComment(commentId);
    if (!ok) {
      setError(err ?? "Não foi possível excluir o comentário.");
      return;
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              commentsCount: Math.max(0, p.commentsCount - 1),
              comments: p.comments.filter((c) => c.id !== commentId),
            }
          : p,
      ),
    );
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const res = await getFeedPosts(nextPage, 20);
    setPosts((prev) => [...prev, ...res.items]);
    setPage(nextPage);
    setHasMore(res.hasMore);
    setLoadingMore(false);
  };

  return (
    <div className="space-y-6">
      {initialUser ? (
        <SlantFrame
          shape="narrowTop"
          border="#c97a2e"
          background="linear-gradient(160deg, rgba(44,28,12,0.88), rgba(8,10,10,0.96))"
        >
          <form onSubmit={handleCreatePost} className="space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Compartilhe algo sobre Deadlock..."
              className="w-full resize-y rounded-[4px] border border-white/15 bg-black/50 p-3 text-sm text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500/60 focus:outline-none"
            />
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              maxLength={400}
              placeholder="Link de imagem opcional (https://... — sem base64)"
              className="w-full rounded-[4px] border border-white/15 bg-black/50 px-3 py-2 text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500/60 focus:outline-none"
            />
            {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold text-neutral-400">
                {content.length}/500 caracteres
              </span>
              <button
                type="submit"
                disabled={posting || !content.trim()}
                className="cursor-pointer rounded-[4px] bg-amber-500 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {posting ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </form>
        </SlantFrame>
      ) : (
        <SlantFrame
          shape="narrowTop"
          border="#c97a2e"
          background="linear-gradient(160deg, rgba(44,28,12,0.88), rgba(8,10,10,0.96))"
          className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-200"
        >
          <span>Entre na sua conta para publicar, curtir e comentar.</span>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="rounded-[4px] bg-amber-500 px-4 py-1.5 font-deadlock text-xs font-black uppercase text-black hover:bg-amber-400"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-[4px] border border-white/20 bg-black/40 px-4 py-1.5 font-deadlock text-xs font-black uppercase text-[#f4efe6] hover:border-amber-400/60"
            >
              Criar conta
            </Link>
          </div>
        </SlantFrame>
      )}

      {!initialUser && error && (
        <p className="text-xs font-semibold text-rose-400">{error}</p>
      )}

      {posts.length === 0 ? (
        <p className="py-10 text-center text-sm italic text-neutral-500">
          Nenhuma publicação ainda. Seja o primeiro a postar!
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="dl-noise relative space-y-4 rounded-[5px] border border-white/15 bg-[#0a0d0c]/95 p-4 shadow-lg sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar url={post.author.avatarUrl} name={post.author.username} />
                  <div>
                    {post.author.handle ? (
                      <Link
                        href={`/profile/${encodeURIComponent(post.author.handle)}`}
                        className="font-bold text-[#f4efe6] hover:text-amber-400"
                      >
                        {post.author.username}{" "}
                        <span className="text-xs font-normal text-neutral-400">
                          @{post.author.handle}
                        </span>
                      </Link>
                    ) : (
                      <span className="font-bold text-[#f4efe6]">{post.author.username}</span>
                    )}
                    <p className="text-[11px] text-neutral-500">{formatDate(post.createdAt)}</p>
                  </div>
                </div>

                {Boolean(initialUser && post.canDelete) && (
                  <button
                    type="button"
                    onClick={() => handleDeletePost(post.id)}
                    className="cursor-pointer rounded px-2 py-1 text-[11px] font-bold uppercase text-rose-400 hover:bg-rose-500/10"
                  >
                    Excluir
                  </button>
                )}
              </div>

              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-200">
                {post.content}
              </p>

              {post.mediaUrl && (
                <img
                  src={post.mediaUrl}
                  alt="Mídia da publicação"
                  loading="lazy"
                  className="max-h-96 w-full rounded-lg border border-neutral-800 bg-black/40 object-contain"
                />
              )}

              {post.tierList && (
                <Link
                  href={`/tier-maker/comunidade/${post.tierList.id}`}
                  className="block space-y-3 rounded-xl border border-amber-500/30 bg-neutral-950/75 p-3.5 transition-colors hover:border-amber-400/70"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-deadlock text-[10px] font-black uppercase tracking-wider text-amber-400">
                        Tier List Anexada
                      </p>
                      <h4 className="font-deadlock truncate text-base font-black text-[#f4efe6]">
                        {post.tierList.title}
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        por {post.tierList.author} • ♥ {post.tierList.likesCount} •{" "}
                        {post.tierList.commentsCount} comentários
                      </p>
                    </div>
                    <span className="shrink-0 rounded border border-neutral-700 bg-neutral-900 px-2.5 py-1 font-deadlock text-[10px] font-black uppercase text-amber-300">
                      Abrir
                    </span>
                  </div>

                  {post.tierList.style === "quadrant" && post.tierList.quadrant ? (
                    <TierQuadrantBoard
                      mode="preview"
                      quadrant={post.tierList.quadrant}
                      byId={heroById}
                    />
                  ) : (
                    <div className="divide-y divide-neutral-900 overflow-hidden rounded-lg border border-neutral-800/80 bg-black/50">
                      {post.tierList.tiers.slice(0, 4).map((t, idx) => (
                        <div key={idx} className="flex min-h-[30px] items-stretch">
                          <div
                            style={{ backgroundColor: t.color }}
                            className="flex w-14 shrink-0 items-center justify-center px-1 text-center"
                          >
                            <span className="font-deadlock truncate text-[10px] font-black uppercase text-black">
                              {t.label.replace(/\n+/g, " ")}
                            </span>
                          </div>
                          <div className="flex flex-1 flex-wrap items-center gap-1 px-2 py-1">
                            {t.heroes.slice(0, 8).map((hId) => {
                              const h = heroById.get(hId);
                              if (!h) return null;
                              return (
                                <img
                                  key={hId}
                                  src={h.image}
                                  alt={h.name}
                                  className="h-5 w-5 rounded-[3px] border border-neutral-800 object-cover"
                                  loading="lazy"
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              )}

              <div className="flex items-center gap-4 border-t border-neutral-800/70 pt-3 text-xs font-bold">
                <button
                  type="button"
                  disabled={!initialUser || likeBusy[post.id]}
                  onClick={() => handleToggleLike(post.id)}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors ${
                    post.likedByMe
                      ? "bg-amber-500/20 text-amber-400"
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                  } ${!initialUser ? "cursor-default opacity-70" : "cursor-pointer"}`}
                >
                  <span>♥</span>
                  <span>{post.likesCount}</span>
                </button>
                <span className="text-neutral-400">
                  {post.commentsCount}{" "}
                  {post.commentsCount === 1 ? "comentário" : "comentários"}
                </span>
              </div>

              {(post.comments.length > 0 || initialUser) && (
                <div className="space-y-3 border-t border-neutral-800/60 pt-3">
                  {post.comments.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start justify-between gap-2 rounded-lg bg-black/30 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <Avatar url={c.author.avatarUrl} name={c.author.username} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs">
                            <span className="font-bold text-[#f4efe6]">{c.author.username}</span>{" "}
                            <span className="text-[10px] text-neutral-500">
                              {formatDate(c.createdAt)}
                            </span>
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-neutral-300">
                            {c.content}
                          </p>
                        </div>
                      </div>
                      {Boolean(initialUser && c.canDelete) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(post.id, c.id)}
                          className="shrink-0 cursor-pointer text-[10px] font-bold uppercase text-rose-400 hover:underline"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  ))}

                  {initialUser && (
                    <form
                      onSubmit={(e) => handleCreateComment(post.id, e)}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={commentDrafts[post.id] ?? ""}
                        onChange={(e) =>
                          setCommentDrafts((m) => ({ ...m, [post.id]: e.target.value }))
                        }
                        maxLength={300}
                        placeholder="Escreva um comentário..."
                        className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-black/50 px-3 py-1.5 text-xs text-[#f4efe6] placeholder:text-neutral-500 focus:border-amber-500/60 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={
                          commentBusy[post.id] || !(commentDrafts[post.id] ?? "").trim()
                        }
                        className="cursor-pointer rounded-lg border border-amber-500/60 bg-amber-500/15 px-3 py-1.5 text-xs font-black uppercase text-amber-300 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Enviar
                      </button>
                    </form>
                  )}
                </div>
              )}
            </article>
          ))}

          {hasMore && (
            <div className="pt-2 text-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={handleLoadMore}
                className="cursor-pointer rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-2 text-xs font-black uppercase tracking-wider text-neutral-200 hover:border-amber-500/60 hover:text-white disabled:opacity-50"
              >
                {loadingMore ? "Carregando..." : "Carregar mais"}
              </button>
            </div>
          )}
        </div>
      )}
      {modal}
    </div>
  );
}