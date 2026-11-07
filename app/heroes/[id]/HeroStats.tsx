"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, type ReactNode } from "react";
import type { HeroWeapon } from "@/lib/deadlock";

const MAX_BOONS = 35;

const n1 = (n: number) => n.toFixed(1);
const n2 = (n: number) => n.toFixed(2);

// Ícones ficam em public/icons/stats/<nome>.<extensão>.
// Por padrão são .svg; os que forem de outro tipo entram aqui.
const ICON_EXT: Record<string, string> = {
  weapon: "webp",
  vitality: "webp",
  spirit: "webp",
};

// Os ícones são formas de uma cor só: pintamos com a cor desejada usando máscara.
// Se o arquivo não existir, o ícone simplesmente não aparece (ou usa o fallback).
function FileIcon({
  name,
  className = "h-5 w-5",
  color = "#efe7da",
  fallback = null,
}: {
  name: string;
  className?: string;
  color?: string;
  fallback?: ReactNode;
}) {
  const [ok, setOk] = useState(true);
  if (!ok) return <>{fallback}</>;
  const url = `/icons/stats/${name}.${ICON_EXT[name] ?? "svg"}`;
  return (
    <>
      <img src={url} alt="" hidden onError={() => setOk(false)} />
      <span
        aria-hidden
        className={`${className} inline-block shrink-0`}
        style={{
          backgroundColor: color,
          WebkitMaskImage: `url(${url})`,
          maskImage: `url(${url})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
      />
    </>
  );
}

// Ícones próprios, desenhados em SVG (não dependem de arquivos).
const GLYPHS: Record<string, ReactNode> = {
  "damage-per-bullet": (
    <>
      <path d="M8 21v-9c0-3 1.5-6 4-9 2.5 3 4 6 4 9v9z" />
      <path d="M8 17h8" />
    </>
  ),
  dps: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  "bullets-per-second": (
    <>
      <path d="M3 7h8M3 12h12M3 17h8" />
      <circle cx="19" cy="12" r="2" />
    </>
  ),
  magazine: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h6" />
    </>
  ),
  reload: (
    <>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 4v5h-5" />
    </>
  ),
  "light-melee": (
    <>
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
    </>
  ),
  "heavy-melee": (
    <>
      <path d="M15 4l5 5-3 3-5-5z" />
      <path d="M12 7L4 15v3h3l8-8" />
    </>
  ),
  health: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
  ),
  regeneration: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  "move-speed": <path d="M6 6l6 6-6 6M13 6l6 6-6 6" />,
  sprint: (
    <>
      <path d="M4 8h6M4 16h6M4 12h12" />
      <path d="M12 6l6 6-6 6" />
    </>
  ),
  stamina: (
    <>
      <path d="M4 16a8 8 0 0 1 16 0" />
      <path d="M12 16l4-5" />
    </>
  ),
  dash: (
    <>
      <path d="M3 8h6M3 12h10M3 16h6" />
      <path d="M15 7l5 5-5 5" />
    </>
  ),
  "spirit-power": (
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  ),
  // Fallbacks dos cabeçalhos (usados se os arquivos weapon/vitality/spirit não existirem)
  weapon: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="1.5" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>
  ),
  vitality: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  spirit: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3L17.29 19.28 3.44 9.22 20.56 9.22 6.71 19.28z" />
    </>
  ),
};

function Icon({
  name,
  className = "h-5 w-5",
  color = "#efe7da",
}: {
  name: string;
  className?: string;
  color?: string;
}) {
  const glyph = GLYPHS[name];
  if (!glyph) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`${className} shrink-0`}
      style={{ color }}
    >
      {glyph}
    </svg>
  );
}

function Row({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-black/30 px-3 py-2.5">
      <Icon name={icon} />
      <span className="font-deadlock text-lg font-black leading-none text-[#f4efe6]">{value}</span>
      <span className="text-[11px] font-semibold text-neutral-400">{label}</span>
      {sub && <span className="text-[10px] font-bold text-emerald-400">{sub}</span>}
    </div>
  );
}

function Header({
  icon,
  label,
  colorClass,
  iconColor,
}: {
  icon: string;
  label: string;
  colorClass: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <FileIcon
        name={icon}
        className="h-6 w-6"
        color={iconColor}
        fallback={<Icon name={icon} className="h-6 w-6" color={iconColor} />}
      />
      <div className={`font-deadlock text-sm font-black uppercase tracking-wider ${colorClass}`}>
        {label}
      </div>
    </div>
  );
}

export default function HeroStats({
  stats,
  levelUp,
  weapon,
  weaponImage,
  accent,
}: {
  stats: Record<string, { value?: number | string }>;
  levelUp: Record<string, number>;
  weapon: HeroWeapon | null;
  weaponImage?: string;
  accent: string;
}) {
  const [boons, setBoons] = useState(0);

  const get = (k: string) => Number(stats?.[k]?.value ?? 0) || 0;
  const up = (k: string) => Number(levelUp?.[k] ?? 0) || 0;

  // Vitalidade
  const healthPer = up("MODIFIER_VALUE_BASE_HEALTH_FROM_LEVEL");
  const health = get("max_health") + healthPer * boons;

  // Corpo a corpo (o pesado cresce na mesma proporção do leve)
  const lightBase = get("light_melee_damage");
  const heavyBase = get("heavy_melee_damage");
  const lightPer = up("MODIFIER_VALUE_BASE_MELEE_DAMAGE_FROM_LEVEL");
  const heavyPer = lightBase > 0 ? (lightPer * heavyBase) / lightBase : 0;

  // Arma
  const dmgPer = up("MODIFIER_VALUE_BASE_BULLET_DAMAGE_FROM_LEVEL");
  const bulletDamage = weapon ? weapon.bulletDamage + dmgPer * boons : 0;
  const dps =
    weapon && weapon.bulletDamage > 0
      ? (weapon.damagePerSecond * bulletDamage) / weapon.bulletDamage
      : 0;

  // Espírito
  const spiritPer = up("MODIFIER_VALUE_TECH_POWER");
  const spirit = spiritPer * boons;

  const weaponTitle = weapon?.name || "Arma principal";

  return (
    <div className="space-y-4">
      {/* Cabeçalho + slider de boons */}
      <div
        className="rounded-2xl border border-neutral-800/80 p-5"
        style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 22%, transparent), #0e1512 70%)` }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-deadlock text-2xl font-black uppercase tracking-wide text-[#f4efe6]">Stats Base</h3>
            <p className="text-xs text-neutral-400">
              Sem itens. O slider adiciona os boons: os ganhos de nível que você recebe com as almas.
            </p>
          </div>
          <div className="flex items-center gap-3 sm:min-w-[320px]">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-300">Boons</span>
            <input
              type="range"
              min={0}
              max={MAX_BOONS}
              value={boons}
              onChange={(e) => setBoons(Number(e.target.value))}
              style={{ accentColor: accent }}
              className="h-2 flex-1 cursor-pointer"
              aria-label="Boons"
            />
            <span className="font-deadlock w-8 text-right text-3xl font-black text-[#f4efe6]">{boons}</span>
          </div>
        </div>
      </div>

      {/* Arma */}
      <div className="rounded-2xl border border-amber-700/40 bg-gradient-to-br from-amber-950/40 to-[#0e1512] p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Header icon="weapon" label="Arma" colorClass="text-amber-400" iconColor="#fbbf24" />
            <div className="font-deadlock text-xl font-black text-[#f4efe6]">{weaponTitle}</div>
          </div>
          <div className="flex items-center gap-4">
            {weaponImage && (
              <img src={weaponImage} alt="" className="hidden h-12 w-auto opacity-90 sm:block" />
            )}
            {weapon && (
              <div className="flex flex-col items-end">
                <Icon name="dps" className="mb-1 h-5 w-5" />
                <div className="font-deadlock text-5xl font-black leading-none text-[#f4efe6]">{n1(dps)}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Dano por segundo
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {weapon && (
            <>
              <Row
                icon="damage-per-bullet"
                label="Dano por bala"
                value={n2(bulletDamage)}
                sub={dmgPer > 0 ? `+${n2(dmgPer)}/boon` : undefined}
              />
              <Row icon="bullets-per-second" label="Balas por segundo" value={n2(weapon.bulletsPerSecond)} />
              <Row icon="magazine" label="Pente" value={String(weapon.clipSize)} />
              <Row icon="reload" label="Recarga" value={`${n2(weapon.reloadDuration)} s`} />
            </>
          )}
          <Row
            icon="light-melee"
            label="Melee leve"
            value={String(Math.round(lightBase + lightPer * boons))}
            sub={lightPer > 0 ? `+${n2(lightPer)}/boon` : undefined}
          />
          <Row
            icon="heavy-melee"
            label="Melee pesado"
            value={String(Math.round(heavyBase + heavyPer * boons))}
            sub={heavyPer > 0 ? `+${n2(heavyPer)}/boon` : undefined}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Vitalidade */}
        <div className="rounded-2xl border border-emerald-700/40 bg-gradient-to-br from-emerald-950/40 to-[#0e1512] p-5 space-y-4">
          <Header icon="vitality" label="Vitalidade" colorClass="text-emerald-400" iconColor="#34d399" />
          <div className="flex items-center gap-3 rounded-lg bg-black/30 px-4 py-3">
            <Icon name="health" className="h-7 w-7" />
            <span className="font-deadlock text-4xl font-black leading-none text-[#f4efe6]">{Math.round(health)}</span>
            <span className="text-[11px] font-semibold text-neutral-400">Vida</span>
            {healthPer > 0 && (
              <span className="text-[10px] font-bold text-emerald-400">+{n2(healthPer)}/boon</span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Row icon="regeneration" label="Regeneração" value={`${n1(get("base_health_regen"))}/s`} />
            <Row icon="move-speed" label="Velocidade" value={`${n1(get("max_move_speed"))} m/s`} />
            <Row icon="sprint" label="Sprint" value={`+${n1(get("sprint_speed"))} m/s`} />
            <Row icon="stamina" label="Stamina" value={String(get("stamina"))} />
            <Row icon="dash" label="Dash" value={`${n1(get("ground_dash_distance_in_meters"))} m`} />
          </div>
        </div>

        {/* Espírito */}
        <div className="rounded-2xl border border-purple-700/40 bg-gradient-to-br from-purple-950/40 to-[#0e1512] p-5 space-y-4">
          <Header icon="spirit" label="Espírito" colorClass="text-purple-400" iconColor="#c084fc" />
          <div className="flex items-center gap-3 rounded-lg bg-black/30 px-4 py-3">
            <Icon name="spirit-power" className="h-7 w-7" />
            <span className="font-deadlock text-4xl font-black leading-none text-[#f4efe6]">{n1(spirit)}</span>
            <span className="text-[11px] font-semibold text-neutral-400">Poder de espírito</span>
            {spiritPer > 0 && (
              <span className="text-[10px] font-bold text-emerald-400">+{n2(spiritPer)}/boon</span>
            )}
          </div>
          <p className="text-xs leading-relaxed text-neutral-400">
            O poder de espírito vem dos boons e dos itens. Cada ponto fortalece as habilidades que escalam com ele.
          </p>
        </div>
      </div>
    </div>
  );
}