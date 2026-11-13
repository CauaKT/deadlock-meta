"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentClientUser,
  getOnboardingStatus,
  saveOnboardingProfile,
} from "@/lib/backend/client";
import type { AuthUser } from "@/lib/backend/types";

export default function WelcomeClient({ heroNames }: { heroNames: string[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [nickname, setNickname] = useState("");
  const [handle, setHandle] = useState("");
  const [nickPlaceholder] = useState(() => {
    const pool = heroNames.filter((n) => n.length >= 3 && n.length <= 20 && /^[a-zA-Z0-9_\-\s]+$/.test(n));
    return pool.length ? `Ex: ${pool[Math.floor(Math.random() * pool.length)]}` : "Ex: Kaito";
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Estados do Modal de Recorte / Redimensionamento
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const imgSizeRef = useRef({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cropImageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Listener nativo não-passivo que impede a rolagem da página ao dar zoom no wheel
  useEffect(() => {
    if (!cropModalOpen) return;

    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const delta = e.deltaY < 0 ? 0.08 : -0.08;

      setZoom((oldZoom) => {
        const newZoom = Math.min(2.5, Math.max(1, Number((oldZoom + delta).toFixed(2))));
        if (newZoom === oldZoom) return oldZoom;

        const ratio = newZoom / oldZoom;
        const offsetX = mouseX - centerX;
        const offsetY = mouseY - centerY;

        // Desloca o pan mantendo o pixel no cursor e trava nas bordas do círculo
        setPan((oldPan) => {
          const rawX = offsetX - ratio * (offsetX - oldPan.x);
          const rawY = offsetY - ratio * (offsetY - oldPan.y);
          return clampPan(rawX, rawY, newZoom);
        });
        return newZoom;
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    document.body.style.overflow = "hidden";

    return () => {
      el.removeEventListener("wheel", onWheel);
      document.body.style.overflow = "";
    };
  }, [cropModalOpen]);

  useEffect(() => {
    getCurrentClientUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);

      // Se já possui username e @ preenchidos, libera para a home
      const profile = await getOnboardingStatus(u.id);
      if (profile?.username && profile.username.trim() !== "" && profile.handle) {
        router.push("/");
        return;
      }

      setAvatarPreview(profile?.avatar_url || u.suggestedAvatarUrl);
      const suggestedName = profile?.username?.trim() || u.suggestedUsername;
      setNickname(suggestedName.slice(0, 20));
      setLoading(false);
    });
  }, [router]);

const BOX_SIZE = 300; // Tamanho do viewport de visualização expandido para 300px

  // Ao selecionar a imagem, abre o modal de redimensionamento
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        imgSizeRef.current = { width: img.naturalWidth, height: img.naturalHeight };
        setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
        zoomRef.current = 1;
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setRawImageSrc(src);
        setCropModalOpen(true);
      };
      img.src = src;
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  // Funções de arrastar a imagem no viewport
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  // Calcula e trava os limites lendo as dimensões reais da ref em tempo real
  const clampPan = (x: number, y: number, currentZoom: number) => {
    const { width, height } = imgSizeRef.current;
    if (!width || !height) return { x: 0, y: 0 };

    const baseScale = Math.max(BOX_SIZE / width, BOX_SIZE / height);
    const scale = baseScale * currentZoom;

    // Se estiver em 100% de zoom e a imagem cobrir o eixo, o deslocamento é travado em 0
    const maxPanX = Math.max(0, (width * scale - BOX_SIZE) / 2);
    const maxPanY = Math.max(0, (height * scale - BOX_SIZE) / 2);

    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, x)),
      y: Math.min(maxPanY, Math.max(-maxPanY, y)),
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan(clampPan(e.clientX - dragStart.x, e.clientY - dragStart.y, zoom));
  };

  const handleMouseUp = () => setIsDragging(false);

  // Renderiza o recorte final em resolução otimizada de 256x256
  const applyCrop = () => {
    const img = cropImageRef.current;
    const { width, height } = imgSizeRef.current;
    if (!img || !width || !height) return;

    const canvas = document.createElement("canvas");
    const outputSize = 256;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const baseScale = Math.max(BOX_SIZE / width, BOX_SIZE / height);
    const scale = baseScale * zoom;
    const cropNaturalSize = BOX_SIZE / scale;

    // O centro do recorte mapeia o centro da imagem deslocado pelo pan
    const srcX = width / 2 - pan.x / scale - cropNaturalSize / 2;
    const srcY = height / 2 - pan.y / scale - cropNaturalSize / 2;

    ctx.drawImage(
      img,
      srcX,
      srcY,
      cropNaturalSize,
      cropNaturalSize,
      0,
      0,
      outputSize,
      outputSize
    );

    const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
    setAvatarPreview(croppedBase64);
    setCropModalOpen(false);
    setRawImageSrc(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const clean = nickname.trim();
    if (clean.length < 3) {
      setErrorMsg("O apelido deve ter no mínimo 3 caracteres.");
      return;
    }
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(clean)) {
      setErrorMsg("O apelido só pode conter letras, números, espaços, traço e sublinhado.");
      return;
    }

    const cleanHandle = handle.trim();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanHandle)) {
      setErrorMsg("O @ deve ter de 3 a 20 caracteres (minúsculas, números e _).");
      return;
    }

    if (!user) return;
    setSaving(true);

    const result = await saveOnboardingProfile(user.id, {
      username: clean,
      handle: cleanHandle,
      avatar_url: avatarPreview,
    });

    if (!result.ok) {
      setErrorMsg(result.message);
      setSaving(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100svh-140px)] items-center justify-center p-4">
        <div className="h-80 w-full max-w-md rounded-2xl bg-neutral-900/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100svh-140px)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800/90 bg-[#0a0d0c]/95 p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.95)] backdrop-blur-md space-y-6">
        
        {/* Cabeçalho */}
        <div className="text-center space-y-3 pb-5 border-b border-neutral-800/80">
          
          {/* Avatar Interativo com Seletor de Foto */}
          <div className="relative mx-auto w-24 h-24">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Clique para trocar de foto"
              className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-amber-500/70 bg-neutral-900 shadow-[0_0_24px_rgba(245,158,11,0.35)] transition-all hover:border-amber-400 hover:scale-105 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              ) : (
                <svg aria-hidden viewBox="0 0 24 24" className="h-10 w-10 text-neutral-400" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              )}

              {/* Overlay Escuro com Ícone de Câmera ao passar o mouse */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100">
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7 text-amber-400 drop-shadow"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                  <path d="M18 10h.01" />
                </svg>
                <span className="mt-1 font-deadlock text-[9px] font-black uppercase tracking-wider text-amber-300">
                  Trocar
                </span>
              </div>
            </button>

            {/* Badge de Câmerazinha no canto inferior direito para indicar que é clicável */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-[#0a0d0c] bg-amber-500 text-black shadow-md transition-transform hover:scale-110"
              title="Trocar foto"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="font-deadlock text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#f4efe6]">
              Bem-vindo ao <span className="text-amber-500">LockPro</span>
            </h1>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs font-bold text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Formulário de Nickname */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
              Seu apelido
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={nickPlaceholder}
              className="w-full rounded-lg border border-neutral-700 bg-black/60 px-3.5 py-2.5 font-deadlock text-base tracking-wide text-[#f4efe6] placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none transition-colors"
            />
            <p className="text-[11px] text-neutral-500">
              Você poderá alterar este nome a qualquer momento em seu perfil.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300">
              Seu usuário
            </label>
            <div className="flex items-center rounded-lg border border-neutral-700 bg-black/60 focus-within:border-amber-500 transition-colors">
              <span className="pl-3.5 font-mono text-base text-neutral-500">@</span>
              <input
                type="text"
                required
                minLength={3}
                maxLength={20}
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
                placeholder="seu_usuario"
                aria-label="@ do perfil"
                className="w-full bg-transparent px-2 py-2.5 font-mono text-base text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-neutral-500">
              De 3 a 20 caracteres, você poderá alterar depois no perfil.
            </p>
          </div>

          {/* Botão com Seta Vetorial Estilizada */}
          <button
            type="submit"
            disabled={saving}
            className="group w-full mt-2 rounded-lg border border-amber-300/80 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 py-3 font-deadlock text-xs sm:text-sm font-black uppercase tracking-wider text-black shadow-[0_2px_14px_rgba(245,158,11,0.35)] transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <span>Entrar na Cidade Amaldiçoada</span>
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Modal de Recorte e Redimensionamento */}
      {cropModalOpen && rawImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-[#0a0d0c] p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-6">
            <div className="text-center space-y-1">
              <h3 className="font-deadlock text-2xl font-black uppercase tracking-wider text-[#f4efe6]">
                Ajustar <span className="text-amber-500">Avatar</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Arraste para posicionar e use o scroll do mouse ou a barra para dar zoom.
              </p>
            </div>

            {/* Viewport de Recorte com Máscara Circular e Zoom no Scroll (300x300) */}
            <div
              ref={viewportRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`relative mx-auto h-[300px] w-[300px] overflow-hidden overscroll-none rounded-2xl border-2 border-neutral-800 bg-black/95 select-none ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
            >
              {/* Imagem com ancoragem pelo centro exato do viewport */}
              {rawImageSrc && (
                <img
                  ref={cropImageRef}
                  src={rawImageSrc}
                  alt="Para recortar"
                  draggable={false}
                  style={{
                    left: "50%",
                    top: "50%",
                    width: imgSize.width && imgSize.height
                      ? `${imgSize.width * Math.max(BOX_SIZE / imgSize.width, BOX_SIZE / imgSize.height)}px`
                      : `${BOX_SIZE}px`,
                    height: imgSize.width && imgSize.height
                      ? `${imgSize.height * Math.max(BOX_SIZE / imgSize.width, BOX_SIZE / imgSize.height)}px`
                      : `${BOX_SIZE}px`,
                    transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
                    transformOrigin: "center center",
                  }}
                  className="pointer-events-none absolute max-h-none max-w-none"
                />
              )}

              {/* Máscara escura exterior com abertura circular */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.75),0_0_16px_rgba(245,158,11,0.5)]"
              />
            </div>

            {/* Controle de Zoom (Trava no preenchimento total de 100% a 250%) */}
            <div className="space-y-1.5 px-2">
              <div className="flex justify-between text-[11px] font-black uppercase tracking-wider text-neutral-400 font-deadlock">
                <span>Zoom</span>
                <span className="text-amber-400">{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.02"
                value={zoom}
                onChange={(e) => {
                  const newZ = Number(e.target.value);
                  setZoom(newZ);
                  setPan((prevPan) => clampPan(prevPan.x, prevPan.y, newZ));
                }}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCropModalOpen(false);
                  setRawImageSrc(null);
                }}
                className="w-1/2 rounded-xl border border-neutral-700 bg-neutral-900 py-2.5 font-deadlock text-xs font-black uppercase tracking-wider text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyCrop}
                className="w-1/2 rounded-xl border border-amber-400 bg-amber-500 py-2.5 font-deadlock text-xs font-black uppercase tracking-wider text-black hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}