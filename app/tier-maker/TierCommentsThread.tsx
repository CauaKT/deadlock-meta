"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmModal";
import {
  createTierListComment,
  deleteTierListComment,
  toggleTierListCommentLike,
} from "@/lib/backend/client";
import type { AuthUser, TierListComment } from "@/lib/backend/types";

interface Props {
  tierListId: string;
  comments: TierListComment[];
  loading?: boolean;
  currentUser: AuthUser | null;
  loginRedirectPath: string;
  compact?: boolean;
  onCommentAdded: (comment: TierListComment) => void;
  onCommentUpdated: (commentId: string, patch: Partial<TierListComment>) => void;
  onCommentDeleted: (deletedIds: string[]) => void;
  onRequireLogin: (message: string) => void;
  onError: (message: string) => void;
}

function formatCommentTime(iso: string): { short: string; full: string } {
  const d = new Date(iso);
  const full = d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const diffMin = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60_000));
  if (diffMin < 1) return { short: "agora", full };
  if (diffMin < 60) return { short: `${diffMin} min`, full };
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return { short: `${diffHours} h`, full };
  const shortDate = d
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(/\bde\b/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
  return { short: shortDate, full };
}

function collectDescendantIds(rootId: string, list: TierListComment[]): string[] {
  const result = [rootId];
  const queue = [rootId];
  const seen = new Set(result);
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const item of list) {
      if (item.parentId === curr && !seen.has(item.id)) {
        seen.add(item.id);
        result.push(item.id);
        queue.push(item.id);
      }
    }
  }
  return result;
}

export default function TierCommentsThread({
  tierListId,
  comments,
  loading = false,
  currentUser,
  loginRedirectPath,
  compact = false,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
  onRequireLogin,
  onError,
}: Props) {
  const { confirm, modal } = useConfirm();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<TierListComment | null>(null);
  const [likeBusyIds, setLikeBusyIds] = useState<Record<string, boolean>>({});
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  const myAvatarUrl =
    currentUser?.profile?.avatar_url ?? currentUser?.suggestedAvatarUrl ?? null;
  const myName =
    currentUser?.profile?.username ??
    currentUser?.suggestedUsername ??
    "Jogador";

  const { byId, threads } = useMemo(() => {
    const map = new Map(comments.map((c) => [c.id, c]));
    const rootIdOf = (c: TierListComment): string => {
      let curr: TierListComment | undefined = c;
      const visited = new Set<string>([c.id]);
      while (curr?.parentId) {
        const parent = map.get(curr.parentId);
        if (!parent || visited.has(parent.id)) break;
        visited.add(parent.id);
        curr = parent;
      }
      return curr.id;
    };

    const grouped = new Map<string, TierListComment[]>();
    for (const c of comments) {
      const rId = rootIdOf(c);
      const list = grouped.get(rId);
      if (list) list.push(c);
      else grouped.set(rId, [c]);
    }

    return { byId: map, threads: Array.from(grouped.values()) };
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || submitting) return;
    if (!currentUser) {
      onRequireLogin("Entre na sua conta para comentar.");
      return;
    }

    setSubmitting(true);
    const { comment, status, error } = await createTierListComment(
      tierListId,
      content,
      replyTarget?.id ?? null,
    );
    setSubmitting(false);

    if (error || !comment) {
      if (status === 401) {
        onRequireLogin(error ?? "Entre na sua conta para comentar.");
      } else {
        onError(error ?? "Não foi possível enviar o comentário.");
      }
      return;
    }

    setDraft("");
    setReplyTarget(null);
    onCommentAdded(comment);
  };

  const handleToggleLike = async (c: TierListComment) => {
    if (!currentUser) {
      onRequireLogin("Entre na sua conta para curtir comentários.");
      return;
    }
    if (likeBusyIds[c.id]) return;

    const prevLiked = Boolean(c.likedByMe);
    const prevCount = c.likesCount ?? 0;

    setLikeBusyIds((m) => ({ ...m, [c.id]: true }));
    onCommentUpdated(c.id, {
      likedByMe: !prevLiked,
      likesCount: Math.max(0, prevCount + (prevLiked ? -1 : 1)),
    });

    const res = await toggleTierListCommentLike(c.id);
    setLikeBusyIds((m) => ({ ...m, [c.id]: false }));

    if (!res.ok) {
      onCommentUpdated(c.id, { likedByMe: prevLiked, likesCount: prevCount });
      if (res.status === 401) {
        onRequireLogin(res.message ?? "Entre na sua conta para curtir comentários.");
      } else {
        onError(res.message ?? "Não foi possível curtir o comentário.");
      }
      return;
    }

    onCommentUpdated(c.id, { likedByMe: res.liked, likesCount: res.likesCount });
  };

  const handleDelete = async (c: TierListComment) => {
    const ok = await confirm({
      title: "Excluir comentário?",
      description: "Este comentário e eventuais respostas serão removidos permanentemente.",
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;

    const deletedIds = collectDescendantIds(c.id, comments);
    const { ok: deleted, error } = await deleteTierListComment(c.id);
    if (!deleted) {
      onError(error ?? "Não foi possível excluir o comentário.");
      return;
    }

    if (replyTarget && deletedIds.includes(replyTarget.id)) {
      setReplyTarget(null);
    }
    onCommentDeleted(deletedIds);
  };

  const renderAvatar = (
    key: string,
    avatarUrl: string | null | undefined,
    name: string,
    handle?: string | null,
    sizeClass = compact ? "h-8 w-8" : "h-9 w-9",
  ) => {
    const showImg = Boolean(avatarUrl) && !failedAvatars[key];
    const el = showImg ? (
      <img
        src={avatarUrl!}
        alt={name}
        draggable={false}
        referrerPolicy="no-referrer"
        onError={() => setFailedAvatars((prev) => ({ ...prev, [key]: true }))}
        className={`${sizeClass} shrink-0 rounded-full border border-amber-500/30 bg-neutral-900 object-cover`}
      />
    ) : (
      <div
        aria-hidden
        className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
      </div>
    );

    const cleanHandle = handle?.trim().replace(/^@+/, "") || null;
    return cleanHandle ? (
      <Link
        href={`/profile/${encodeURIComponent(cleanHandle)}`}
        className="shrink-0 transition-opacity hover:opacity-85"
      >
        {el}
      </Link>
    ) : (
      <div className="shrink-0">{el}</div>
    );
  };

  const maxVisibleReplies = compact ? 2 : 4;

  return (
    <div className="space-y-3">
      {currentUser ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
          {replyTarget && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] text-sky-300">
              <span className="truncate">
                Respondendo a <strong className="text-white">{replyTarget.author.username}</strong>
              </span>
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                aria-label="Cancelar resposta"
                className="cursor-pointer font-bold text-neutral-400 hover:text-white"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            {renderAvatar("me", myAvatarUrl, myName, currentUser.profile?.handle)}
            <input
              ref={inputRef}
              type="text"
              maxLength={300}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                replyTarget
                  ? `Responder a ${replyTarget.author.username}...`
                  : "Postar sua resposta"
              }
              className="min-w-0 flex-1 rounded-full border border-neutral-800 bg-neutral-950/90 px-3.5 py-2 text-xs text-[#f4efe6] placeholder:text-neutral-500 outline-none focus:border-amber-500/60"
            />
            <button
              type="submit"
              disabled={submitting || !draft.trim()}
              className="shrink-0 cursor-pointer rounded-full bg-amber-500 px-3.5 py-1.5 font-deadlock text-[11px] font-black uppercase tracking-wider text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {submitting ? "..." : "Responder"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-neutral-400">
          <Link
            href={`/login?next=${encodeURIComponent(loginRedirectPath)}`}
            className="font-bold text-amber-400 hover:underline"
          >
            Entre na sua conta
          </Link>{" "}
          para responder e curtir comentários.
        </p>
      )}

      {loading ? (
        <p className="py-2 text-xs text-neutral-500">Carregando comentários...</p>
      ) : threads.length === 0 ? (
        <p className="py-2 text-xs italic text-neutral-500">
          Nenhum comentário ainda. Seja o primeiro a responder!
        </p>
      ) : (
        <div
          className={`divide-y divide-neutral-800/70 ${
            compact ? "max-h-80 overflow-y-auto pr-1 lp-scroll" : ""
          }`}
        >
          {threads.map((thread) => {
            const root = thread[0];
            const replies = thread.slice(1);
            const isExpanded = Boolean(expandedThreads[root.id]);
            const visibleReplies = isExpanded
              ? replies
              : replies.slice(0, maxVisibleReplies);
            const hiddenRepliesCount = replies.length - visibleReplies.length;
            const visibleList = [root, ...visibleReplies];

            return (
              <div key={root.id} className="py-3 first:pt-1 last:pb-0">
                {visibleList.map((c, idx) => {
                  const hasNextInThread = idx < visibleList.length - 1;
                  const time = formatCommentTime(c.createdAt);
                  const cleanHandle = c.author.handle?.trim().replace(/^@+/, "") || null;
                  const parent = c.parentId ? byId.get(c.parentId) : null;
                  const likesCount = c.likesCount ?? 0;
                  const repliesCount = c.repliesCount ?? 0;

                  return (
                    <div key={c.id} className="flex items-stretch gap-2.5">
                      <div className="flex flex-col items-center shrink-0">
                        {renderAvatar(c.id, c.author.avatarUrl, c.author.username, cleanHandle)}
                        {hasNextInThread && (
                          <div
                            aria-hidden
                            className="my-1 w-[2px] flex-1 rounded-full bg-neutral-800"
                          />
                        )}
                      </div>

                      <div className={`min-w-0 flex-1 ${hasNextInThread ? "pb-3.5" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-xs leading-tight">
                            {cleanHandle ? (
                              <Link
                                href={`/profile/${encodeURIComponent(cleanHandle)}`}
                                className="truncate font-bold text-[#f4efe6] transition-colors hover:text-amber-400"
                              >
                                {c.author.username}
                              </Link>
                            ) : (
                              <span className="truncate font-bold text-[#f4efe6]">
                                {c.author.username}
                              </span>
                            )}
                            <span aria-hidden className="text-neutral-600">
                              ·
                            </span>
                            <span
                              title={time.full}
                              className="shrink-0 text-[11px] text-neutral-500"
                            >
                              {time.short}
                            </span>
                          </div>

                          {c.canDelete && (
                            <button
                              type="button"
                              title="Excluir comentário"
                              aria-label="Excluir comentário"
                              onClick={() => void handleDelete(c)}
                              className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-rose-500/12 hover:text-rose-400"
                            >
                              <svg
                                aria-hidden
                                viewBox="0 0 16 16"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M13 4.5l-.8 9a1.5 1.5 0 0 1-1.5 1.4H5.3a1.5 1.5 0 0 1-1.5-1.4L3 4.5" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {idx > 0 && parent && parent.id !== root.id && (
                          <p className="mt-0.5 text-[11px] text-neutral-500">
                            Em resposta a{" "}
                            <span className="text-sky-400">{parent.author.username}</span>
                          </p>
                        )}

                        <p className="mt-0.5 whitespace-pre-wrap break-words text-xs sm:text-[13px] leading-relaxed text-neutral-200">
                          {c.content}
                        </p>

                        <div className="mt-1.5 flex items-center gap-4 text-neutral-500">
                          <button
                            type="button"
                            title="Responder"
                            aria-label={`Responder a ${c.author.username}`}
                            onClick={() => {
                              if (!currentUser) {
                                onRequireLogin("Entre na sua conta para responder comentários.");
                                return;
                              }
                              setReplyTarget(c);
                              setTimeout(() => inputRef.current?.focus(), 0);
                            }}
                            className="group/cact -ml-1.5 inline-flex cursor-pointer items-center gap-1 text-[11px] tabular-nums transition-colors hover:text-sky-400"
                          >
                            <span className="flex h-6 w-6 items-center justify-center rounded-full transition-colors group-hover/cact:bg-sky-500/12">
                              <svg
                                aria-hidden
                                viewBox="0 0 24 24"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                              </svg>
                            </span>
                            {repliesCount > 0 && <span>{repliesCount}</span>}
                          </button>

                          <button
                            type="button"
                            title="Curtir"
                            aria-label={`Curtir comentário (${likesCount})`}
                            disabled={likeBusyIds[c.id]}
                            onClick={() => void handleToggleLike(c)}
                            className={`group/cact inline-flex cursor-pointer items-center gap-1 text-[11px] tabular-nums transition-colors ${
                              c.likedByMe ? "text-rose-500" : "hover:text-rose-400"
                            }`}
                          >
                            <span className="flex h-6 w-6 items-center justify-center rounded-full transition-colors group-hover/cact:bg-rose-500/12">
                              <svg
                                aria-hidden
                                viewBox="0 0 24 24"
                                className="h-3.5 w-3.5"
                                fill={c.likedByMe ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M19.5 12.572 12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572z" />
                              </svg>
                            </span>
                            {likesCount > 0 && <span>{likesCount}</span>}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {hiddenRepliesCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedThreads((prev) => ({ ...prev, [root.id]: true }))
                    }
                    className="mt-1 pl-10 cursor-pointer text-[11px] font-semibold text-sky-400 hover:underline"
                  >
                    Mostrar mais {hiddenRepliesCount}{" "}
                    {hiddenRepliesCount === 1 ? "resposta" : "respostas"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal}
    </div>
  );
}