"use client";
// app/profile/ProfileEditControls.tsx
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ProfileBanner, { type BannerHero } from "./ProfileBanner";
import { MAX_DATA_URL_CHARS } from "./ProfileBannerEditor";
import ImageCropModal from "./ImageCropModal";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

// Valida e lê o arquivo; o recorte acontece depois, no ImageCropModal
function pickImage(e: ChangeEvent<HTMLInputElement>, onPick: (src: string) => void, onError: (msg: string) => void) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) return onError("Escolha um arquivo de imagem.");
  if (file.size > MAX_FILE_BYTES) return onError("A imagem passa de 8 MB.");
  const reader = new FileReader();
  reader.onload = () => {
    onError("");
    onPick(reader.result as string);
  };
  reader.onerror = () => onError("Não foi possível processar essa imagem.");
  reader.readAsDataURL(file);
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const CameraPlus = () => (
  <Icon>
    <path d="M3 9a2 2 0 0 1 2-2h2l1.5-2h7L17 7h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
);

const PaintingIcon = () => (
  <Icon>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </Icon>
);

const PersonIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </Icon>
);

function RoundBtn({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/65 text-white backdrop-blur-sm transition-colors hover:bg-black/85"
    >
      {children}
    </button>
  );
}

// Busca sem acento e sem diferenciar maiúsculas
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function HeroPicker({
  heroes,
  selectedId,
  onSelect,
  onClose,
}: {
  heroes: BannerHero[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const [pendingId, setPendingId] = useState<number | null>(selectedId);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const playable = useMemo(() => heroes.filter((h) => h.playable), [heroes]);
  const visible = useMemo(() => {
    const q = norm(query.trim());
    return q ? playable.filter((h) => norm(h.name).includes(q)) : playable;
  }, [playable, query]);
  const pending = playable.find((h) => h.id === pendingId) ?? null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Escolher herói do banner"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col gap-4 rounded-2xl border border-neutral-800 bg-[#0a0d0c] p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">Herói do banner</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="cursor-pointer text-neutral-400 hover:text-white">
            <Icon>
              <path d="M6 6l12 12M18 6L6 18" />
            </Icon>
          </button>
        </div>

        {/* Prévia com o mesmo componente do banner real */}
        <div className="relative aspect-[4/1] w-full shrink-0 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
          {pending ? (
            <ProfileBanner hero={pending} compact />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-neutral-500">
              Selecione um herói para ver a prévia
            </div>
          )}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0d0c] via-[#0a0d0c]/30 to-black/40" />
          {pending && (
            <span className="absolute bottom-2 left-3 font-deadlock text-sm font-black uppercase tracking-wider text-[#f4efe6]">
              {pending.name}
            </span>
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar herói..."
          aria-label="Buscar herói"
          className="w-full shrink-0 rounded-xl border border-neutral-800 bg-black/60 px-4 py-2 text-sm text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
        />

        <div className="min-h-0 flex-1 overflow-y-auto p-1.5 [scrollbar-width:thin]">
          {visible.length === 0 ? (
            <p className="py-8 text-center text-xs text-neutral-500">Nenhum herói encontrado.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
              {visible.map((h) => {
                const active = h.id === pendingId;
                const color = h.rgb ? `rgb(${h.rgb.join(",")})` : "#f59e0b";
                return (
                  <button
                    key={h.id}
                    type="button"
                    title={h.name}
                    aria-label={h.name}
                    aria-pressed={active}
                    onClick={() => setPendingId(h.id)}
                    style={
                      {
                        "--hc": color,
                        ...(active
                          ? { borderColor: color, boxShadow: `0 0 14px color-mix(in srgb, ${color} 55%, transparent)` }
                          : null),
                      } as CSSProperties
                    }
                    className={`group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border-2 bg-neutral-900 transition-all ${
                      active ? "scale-[1.03]" : "border-neutral-800 hover:-translate-y-0.5 hover:border-[var(--hc)]"
                    }`}
                  >
                    {h.rgb && (
                      <span aria-hidden className="absolute inset-0 overflow-hidden" style={{ "--hc": h.rgb.join(" ") } as CSSProperties}>
                        <i className="absolute hero-tip-puff hero-tip-puff-a" />
                        <i className="absolute hero-tip-puff hero-tip-puff-b" />
                        <i className="absolute hero-tip-puff hero-tip-puff-c" />
                      </span>
                    )}
                    <img
                      src={h.art || h.image}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.dataset.fallback || !h.image) return;
                        img.dataset.fallback = "1";
                        img.src = h.image;
                      }}
                      className="relative h-full w-full object-cover object-top"
                    />
                    <span
                      className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pb-1.5 pt-6 text-center font-deadlock text-[11px] font-black uppercase tracking-wider text-[#f4efe6]"
                      style={active ? { color } : undefined}
                    >
                      {h.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 cursor-pointer rounded-xl border border-neutral-700 bg-neutral-900 py-2.5 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300 transition-colors hover:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pendingId == null}
            onClick={() => {
              if (pendingId != null) onSelect(pendingId);
              onClose();
            }}
            className="w-1/2 cursor-pointer rounded-xl border border-amber-400 bg-amber-500 py-2.5 font-deadlock text-xs font-black uppercase tracking-wider text-black shadow-md transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface BannerOverlayProps {
  heroes: BannerHero[];
  heroId: number | null;
  canReset: boolean;
  onImage: (data: string) => void;
  onHero: (id: number) => void;
  onReset: () => void;
  onError: (msg: string) => void;
}

export function BannerEditOverlay({ heroes, heroId, canReset, onImage, onHero, onReset, onError }: BannerOverlayProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 bg-black/45">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pickImage(e, setCropSrc, onError)}
      />
      <div className="relative flex items-center gap-3">
        <RoundBtn title="Enviar imagem para o banner" onClick={() => fileRef.current?.click()}>
          <PaintingIcon />
        </RoundBtn>
        <RoundBtn title="Usar um herói no banner" onClick={() => setPicking(true)}>
          <PersonIcon />
        </RoundBtn>
        {canReset && (
          <div className="absolute left-full top-1/2 ml-3 -translate-y-1/2">
            <RoundBtn title="Voltar ao banner padrão" onClick={onReset}>
              <Icon>
                <path d="M6 6l12 12M18 6L6 18" />
              </Icon>
            </RoundBtn>
          </div>
        )}
      </div>
      {picking && <HeroPicker heroes={heroes} selectedId={heroId} onSelect={onHero} onClose={() => setPicking(false)} />}
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          title="Banner"
          shape="rect"
          aspect={4}
          outputWidth={1600}
          outputHeight={400}
          maxChars={MAX_DATA_URL_CHARS}
          onCancel={() => setCropSrc(null)}
          onConfirm={(data) => {
            onImage(data);
            setCropSrc(null);
          }}
        />
      )}
    </div>
  );
}

export function AvatarEditButton({
  onImageAction: onImage,
  onErrorAction: onError,
}: {
  onImageAction: (data: string) => void;
  onErrorAction: (msg: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pickImage(e, setCropSrc, onError)}
      />
      <button
        type="button"
        title="Trocar foto"
        aria-label="Trocar foto"
        onClick={() => fileRef.current?.click()}
        className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/55 text-white transition-colors hover:bg-black/70"
      >
        <CameraPlus />
      </button>
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          title="Avatar"
          shape="circle"
          aspect={1}
          outputWidth={256}
          outputHeight={256}
          onCancel={() => setCropSrc(null)}
          onConfirm={(data) => {
            onImage(data);
            setCropSrc(null);
          }}
        />
      )}
    </>
  );
}