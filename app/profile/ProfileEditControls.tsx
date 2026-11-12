"use client";
// app/profile/ProfileEditControls.tsx
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { BannerHero } from "./ProfileBanner";
import { toBannerDataUrl } from "./ProfileBannerEditor";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const AVATAR_SIZE = 256;

// Recorte quadrado centralizado, igual ao resultado do ajuste de avatar de /welcome
function toAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        (img.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        AVATAR_SIZE,
        AVATAR_SIZE,
      );
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load"));
    };
    img.src = url;
  });
}

async function handleFile(
  e: ChangeEvent<HTMLInputElement>,
  convert: (f: File) => Promise<string>,
  onImage: (data: string) => void,
  onError: (msg: string) => void,
) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) return onError("Escolha um arquivo de imagem.");
  if (file.size > MAX_FILE_BYTES) return onError("A imagem passa de 8 MB.");
  try {
    onImage(await convert(file));
    onError("");
  } catch {
    onError("Não foi possível processar essa imagem.");
  }
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Escolher herói do banner"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-[#0a0d0c] p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-deadlock text-lg font-black uppercase tracking-wider text-[#f4efe6]">Herói do banner</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="cursor-pointer text-neutral-400 hover:text-white">
            <Icon>
              <path d="M6 6l12 12M18 6L6 18" />
            </Icon>
          </button>
        </div>
        <div className="grid max-h-[60vh] grid-cols-4 gap-2 overflow-y-auto [scrollbar-width:thin] sm:grid-cols-6 md:grid-cols-8">
          {heroes
            .filter((h) => h.playable)
            .map((h) => {
              const active = h.id === selectedId;
              const color = h.rgb ? `rgb(${h.rgb.join(",")})` : "#f59e0b";
              return (
                <button
                  key={h.id}
                  type="button"
                  title={h.name}
                  aria-label={h.name}
                  aria-pressed={active}
                  onClick={() => {
                    onSelect(h.id);
                    onClose();
                  }}
                  className={`aspect-square cursor-pointer overflow-hidden rounded-lg border-2 bg-neutral-900 transition-all ${
                    active ? "scale-105" : "border-transparent opacity-75 hover:opacity-100"
                  }`}
                  style={active ? { borderColor: color, boxShadow: `0 0 12px ${color}` } : undefined}
                >
                  {h.image && <img src={h.image} alt="" loading="lazy" className="h-full w-full object-cover object-top" />}
                </button>
              );
            })}
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

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 bg-black/45">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e, toBannerDataUrl, onImage, onError)}
      />
      <RoundBtn title="Enviar imagem para o banner" onClick={() => fileRef.current?.click()}>
        <CameraPlus />
      </RoundBtn>
      <RoundBtn title="Usar um herói no banner" onClick={() => setPicking(true)}>
        <Icon>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </Icon>
      </RoundBtn>
      {canReset && (
        <RoundBtn title="Voltar ao banner padrão" onClick={onReset}>
          <Icon>
            <path d="M6 6l12 12M18 6L6 18" />
          </Icon>
        </RoundBtn>
      )}
      {picking && <HeroPicker heroes={heroes} selectedId={heroId} onSelect={onHero} onClose={() => setPicking(false)} />}
    </div>
  );
}

export function AvatarEditButton({ onImage, onError }: { onImage: (data: string) => void; onError: (msg: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e, toAvatarDataUrl, onImage, onError)}
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
    </>
  );
}