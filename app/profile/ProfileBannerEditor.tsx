"use client";
// app/profile/ProfileBannerEditor.tsx
/* eslint-disable @next/next/no-img-element */
import { useRef, useState, type ChangeEvent } from "react";
import type { BannerHero, BannerMode } from "./ProfileBanner";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_WIDTH = 1600;
// A imagem vai como Data URL para o banco da API; mantém ~450 KB no máximo
export const MAX_DATA_URL_CHARS = 600_000;

export function toBannerDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.fillStyle = "#0a0d0c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let quality = 0.85;
      let out = canvas.toDataURL("image/jpeg", quality);
      while (out.length > MAX_DATA_URL_CHARS && quality > 0.4) {
        quality -= 0.1;
        out = canvas.toDataURL("image/jpeg", quality);
      }
      if (out.length > MAX_DATA_URL_CHARS) return reject(new Error("size"));
      resolve(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load"));
    };
    img.src = url;
  });
}

interface Props {
  heroes: BannerHero[];
  mode: BannerMode;
  onMode: (m: BannerMode) => void;
  heroId: number | null;
  onHero: (id: number) => void;
  customImage: string | null;
  onCustomImage: (data: string) => void;
}

export default function ProfileBannerEditor({ heroes, mode, onMode, heroId, onHero, customImage, onCustomImage }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const playable = heroes.filter((h) => h.playable);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Escolha um arquivo de imagem.");
    if (file.size > MAX_FILE_BYTES) return setError("A imagem passa de 8 MB.");
    try {
      onCustomImage(await toBannerDataUrl(file));
      onMode("custom");
      setError("");
    } catch {
      setError("Não foi possível processar essa imagem. Tente outra ou reduza o tamanho.");
    }
  };

  const modeBtn = (id: BannerMode, label: string) => (
    <button
      type="button"
      onClick={() => onMode(id)}
      aria-pressed={mode === id}
      className={`cursor-pointer px-3 py-2 font-deadlock text-[11px] font-black uppercase tracking-wider transition-colors ${
        mode === id ? "bg-amber-500 text-black" : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mb-5 space-y-3">
      <p className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">Banner do perfil</p>
      <div className="inline-flex flex-wrap overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900/80">
        {modeBtn("default", "Herói favorito")}
        {modeBtn("hero", "Escolher herói")}
        {modeBtn("custom", "Imagem própria")}
      </div>

      {mode === "default" && (
        <p className="text-xs text-neutral-400">O banner usa o herói favorito escolhido abaixo.</p>
      )}

      {mode === "hero" && (
        <div className="grid max-h-56 grid-cols-5 gap-2 overflow-y-auto rounded-xl border border-neutral-800 bg-black/40 p-2 [scrollbar-width:thin] sm:grid-cols-8 md:grid-cols-10">
          {playable.map((h) => {
            const active = h.id === heroId;
            const color = h.rgb ? `rgb(${h.rgb.join(",")})` : "#f59e0b";
            return (
              <button
                key={h.id}
                type="button"
                title={h.name}
                aria-label={h.name}
                aria-pressed={active}
                onClick={() => onHero(h.id)}
                className={`relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 bg-neutral-900 transition-all ${
                  active ? "scale-105" : "border-transparent opacity-70 hover:opacity-100"
                }`}
                style={active ? { borderColor: color, boxShadow: `0 0 12px ${color}` } : undefined}
              >
                {h.image ? (
                  <img src={h.image} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
                ) : (
                  <span className="text-xs font-extrabold text-neutral-500">{h.name.slice(0, 2).toUpperCase()}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {mode === "custom" && (
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-deadlock text-xs font-black uppercase tracking-wider text-[#f4efe6] transition-colors hover:border-amber-400"
          >
            {customImage ? "Trocar imagem" : "Enviar imagem"}
          </button>
          <span className="text-xs text-neutral-400">Imagens largas funcionam melhor. Até 8 MB.</span>
        </div>
      )}

      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}