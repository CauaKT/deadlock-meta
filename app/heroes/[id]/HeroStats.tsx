"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { HeroWeapon } from "@/lib/deadlock";
import SlantFrame, { type Slant } from "./SlantFrame";

const MAX_BOONS = 35;

const n1 = (n: number) => n.toFixed(1);
const n2 = (n: number) => n.toFixed(2);

const WEAPON_TAG_LABELS: Record<string, string> = {
  EWeaponAttribute_MediumRange: "Alcance médio",
  EWeaponAttribute_BurstFire: "Rajada",
  EWeaponAttribute_BeamWeapon: "Arma de feixe",
  EWeaponAttribute_Bouncy: "Ricochete",
  EWeaponAttribute_CloseRange: "Alcance curto",
  EWeaponAttribute_HeavyHitter: "Golpe pesado",
  EWeaponAttribute_LongRange: "Alcance longo",
  EWeaponAttribute_RapidFire: "Tiro rápido",
  EWeaponAttribute_Spreadshot: "Tiro espalhado",
};
// Atributo sem tradução cadastrada cai no nome do enum separado em palavras
const weaponTagLabel = (raw: string) =>
  WEAPON_TAG_LABELS[raw] ??
  raw.replace(/^EWeaponAttribute_/, "").replace(/([a-z])([A-Z])/g, "$1 $2");

// Ícones ficam em public/icons/stats/<nome>.<extensão>.
// Por padrão são .webp; os que forem de outro tipo entram aqui (ex.: dps: "svg").
const ICON_EXT: Record<string, string> = {
  weapon: "webp",
  vitality: "webp",
  spirit: "webp",
};

// Ícones da Deadlock API. A máscara exige CORS: se o bucket bloquear, cai no SVG de reserva.
const ICON_BASE = "https://assets-bucket.deadlock-api.com/assets-api-res/icons/icons/properties/";
const ASSET_ROOT = "https://assets-bucket.deadlock-api.com/assets-api-res/";
const REMOTE_ICONS: Record<string, string> = {
  reload: "ammo_reload",
  magazine: "ammo_clip_size",
  "light-melee": "melee",
  "heavy-melee": "melee",
  regeneration: "heal",
  stamina: "move_stamina_recharge",
  sprint: "icons/hud/icons/icon_speed.svg",
  dash: "images/upgrades/mods_utility/sprint_booster.webp",
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
  const [ok, setOk] = useState(false);
  const remote = REMOTE_ICONS[name];
    const url = !remote
    ? `/icons/stats/${name}.${ICON_EXT[name] ?? "webp"}`
    : remote.includes("/")
      ? `${ASSET_ROOT}${remote}`
      : `${ICON_BASE}${remote}.svg`;
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setOk(true);
    img.onerror = () => setOk(false);
    img.src = url;
  }, [url]);
  if (!ok) return <>{fallback}</>;
  return (
    <>
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

const THEMES = {
  weapon: {
    border: "rgba(236, 152, 26, 0.4)",
    bg: "linear-gradient(135deg, rgba(236, 152, 26, 0.16), #0e1512 68%)",
    color: "#e2a23f",
  },
  vitality: {
    border: "rgba(124, 187, 30, 0.4)",
    bg: "linear-gradient(135deg, rgba(124, 187, 30, 0.15), #0e1512 68%)",
    color: "#8fc43a",
  },
  spirit: {
    border: "rgba(206, 145, 255, 0.4)",
    bg: "linear-gradient(135deg, rgba(206, 145, 255, 0.15), #0e1512 68%)",
    color: "#c79af0",
  },
} as const;
type Theme = keyof typeof THEMES;

const PLATE = "rounded-[3px] border border-black/40 bg-black/45 shadow-[inset_0_2px_6px_rgba(0,0,0,0.55)]";

const GAME_ICON_BASE = "https://assets-bucket.deadlock-api.com/assets-api-res/icons";
const GAME_ICONS: Record<string, string> = {
  health: "health.svg",
  regeneration: "heal.svg",
  "move-speed": "move_speed.svg",
  "bullets-per-second": "fire_rate.svg",
  "damage-per-bullet": "damage_bullet_color.svg",
  "spirit-power": "spirit.svg",
};
// brightness(0) + invert deixa qualquer ícone do jogo numa cor só (creme)
const CREAM_FILTER =
  "brightness(0) saturate(100%) invert(93%) sepia(12%) saturate(500%) hue-rotate(0deg) brightness(105%)";

function StatIcon({
  name,
  className = "h-5 w-5",
  color = "#efe7da",
}: {
  name: string;
  className?: string;
  color?: string;
}) {
  const [failed, setFailed] = useState(false);
  const file = GAME_ICONS[name];

  if (!file || failed) {
    return (
      <FileIcon
        name={name}
        className={className}
        color={color}
        fallback={<Icon name={name} className={className} color={color} />}
      />
    );
  }

  return (
    <img
      src={`${GAME_ICON_BASE}/${file}`}
      alt=""
      aria-hidden
      className={`${className} shrink-0 object-contain`}
      style={{ filter: CREAM_FILTER }}
      onError={() => setFailed(true)}
      ref={(el) => {
        if (el && el.complete && el.naturalWidth === 0) setFailed(true);
      }}
    />
  );
}

function Panel({
  theme,
  slant,
  className = "",
  children,
}: {
  theme: Theme;
  slant?: Slant;
  className?: string;
  children: ReactNode;
}) {
  const t = THEMES[theme];
    if (slant) {
    return (
      <SlantFrame shape={slant} border={t.border} background={`${t.bg}, #0e1512`} className={className}>
        {children}
      </SlantFrame>
    );
  }
  return (
    <div
      className={`dl-noise dl-halftone relative overflow-hidden rounded-[3px_8px_3px_6px] border-2 p-5 ${className}`}
      style={{
        borderColor: t.border,
        background: t.bg,
        boxShadow: "inset 0 0 40px rgba(0,0,0,0.55), 0 10px 28px rgba(0,0,0,0.7)",
      }}
    >
      {children}
    </div>
  );
}

function Header({ icon, label, theme }: { icon: string; label: string; theme: Theme }) {
  const color = THEMES[theme].color;
  return (
    <div className="flex items-center gap-2.5">
      <StatIcon name={icon} className="h-7 w-7" color={color} />
      <div className="font-deadlock text-base font-black uppercase tracking-wider" style={{ color }}>
        {label}
      </div>
    </div>
  );
}

function Row({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 ${PLATE}`}>
      <StatIcon name={icon} />
      <span className="font-deadlock text-lg font-black leading-none text-[#f4efe6]">{value}</span>
      <span className="text-[11px] font-semibold text-[#d6c9b4]/80">{label}</span>
      {sub && <span className="text-[10px] font-bold text-[#99f051]">{sub}</span>}
    </div>
  );
}

function BigStat({ icon, value, label, sub }: { icon: string; value: string; label: string; sub?: string }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${PLATE}`}>
      <StatIcon name={icon} className="h-8 w-8" />
      <span className="font-deadlock text-4xl font-black leading-none text-[#f4efe6]">{value}</span>
      <span className="text-[11px] font-semibold text-[#d6c9b4]/80">{label}</span>
      {sub && <span className="text-[10px] font-bold text-[#99f051]">{sub}</span>}
    </div>
  );
}

export default function HeroStats({
  stats,
  levelUp,
  weapon,
  weaponImage,
  weaponTags,
  accent,
}: {
  stats: Record<string, { value?: number | string }>;
  levelUp: Record<string, number>;
  weapon: HeroWeapon | null;
  weaponImage?: string;
  weaponTags: string[];
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
      <SlantFrame
        shape="narrowTop"
        border={`color-mix(in srgb, ${accent} 45%, #1b2621)`}
        background={`linear-gradient(135deg, color-mix(in srgb, ${accent} 30%, #0e1512), #0e1512 75%)`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h3
              className="font-deadlock text-4xl font-black uppercase leading-none tracking-wide"
              style={{ color: "#f4efe6", textShadow: "2px 2px 0 rgba(0,0,0,0.4)" }}
            >
              Stats Base
            </h3>
            <p className="inline-block -skew-x-6 bg-[#120c0c] px-3 py-1 text-xs font-semibold text-[#f4efe6]">
              Sem itens. O slider adiciona as bênçãos: os ganhos de nível que você recebe com as almas.
            </p>
          </div>
          <div className="flex items-center gap-3 sm:min-w-[320px]">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-300">
              Bênçãos
            </span>
            <input
              type="range"
              min={0}
              max={MAX_BOONS}
              value={boons}
              onChange={(e) => setBoons(Number(e.target.value))}
              style={{ "--p": `${(boons / MAX_BOONS) * 100}%`, "--c": accent } as CSSProperties}
              className="dl-range flex-1 cursor-pointer"
              aria-label="Bênçãos"
            />
            <span className="font-deadlock w-9 text-right text-4xl font-black text-[#f4efe6]">
              {boons}
            </span>
          </div>
        </div>
      </SlantFrame>

      <Panel theme="weapon" className="space-y-4">
        <div className="relative min-h-[11rem]">
          <div className="relative z-10 space-y-1.5 pr-36">
            <Header icon="weapon" label="Arma" theme="weapon" />
            <div className="font-deadlock text-4xl font-black text-[#f4efe6]">{weaponTitle}</div>
            {weaponTags.length > 0 && (
              <div className="flex flex-wrap gap-2.5 pt-2">
                {weaponTags.map((tag) => (
                  <span
                    key={tag}
                    className={`px-3.5 py-1.5 text-sm font-semibold text-[#f4efe6] ${PLATE}`}
                  >
                    {weaponTagLabel(tag)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="contents">
            {weaponImage && (
              <img
                src={weaponImage}
                alt=""
                className="pointer-events-none absolute right-24 top-1/2 hidden h-48 max-w-[62%] -translate-y-1/2 object-contain object-right drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] sm:block"
              />
            )}
            {weapon && (
              <div className="absolute right-0 top-0 z-10 flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <StatIcon name="damage-per-bullet" className="h-8 w-8" />
                  <div className="font-deadlock text-5xl font-black leading-none text-[#f4efe6]">{n1(dps)}</div>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#d6c9b4]/80">
                  Dano por segundo
                </div>
              </div>
            )}
          </div>
        </div>

        {weapon && weapon.falloffStart !== null && weapon.falloffEnd !== null && (
          <div className="relative z-10 -mt-12 flex justify-end">
            <div className={`flex items-center gap-2 px-3 py-1.5 ${PLATE}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#d6c9b4]/80">
                Queda de dano
              </span>
              <span className="font-deadlock text-sm font-black text-[#f4efe6]">
                {Math.round(weapon.falloffStart)} m
              </span>
              <span aria-hidden className="text-[#d6c9b4]/80">→</span>
              <span className="font-deadlock text-sm font-black text-[#f4efe6]">
                {Math.round(weapon.falloffEnd)} m
              </span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {weapon && (
            <>
              <Row
                icon="damage-per-bullet"
                label="Dano por bala"
                value={n2(bulletDamage)}
                sub={dmgPer > 0 ? `+${n2(dmgPer)}/bênção` : undefined}
              />
              <Row icon="bullets-per-second" label="Balas por segundo" value={n2(weapon.bulletsPerSecond)} />
              <Row icon="magazine" label="Pente" value={String(weapon.clipSize)} />
              <Row icon="reload" label="Recarga" value={`${n2(weapon.reloadDuration)} s`} />
            </>
          )}
          <Row
            icon="light-melee"
            label="Golpe leve"
            value={String(Math.round(lightBase + lightPer * boons))}
            sub={lightPer > 0 ? `+${n2(lightPer)}/bênção` : undefined}
          />
          <Row
            icon="heavy-melee"
            label="Golpe pesado"
            value={String(Math.round(heavyBase + heavyPer * boons))}
            sub={heavyPer > 0 ? `+${n2(heavyPer)}/bênção` : undefined}
          />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel theme="vitality" slant="slantLeft" className="space-y-4">
          <Header icon="vitality" label="Vitalidade" theme="vitality" />
          <BigStat
            icon="health"
            value={String(Math.round(health))}
            label="Vida"
            sub={healthPer > 0 ? `+${n2(healthPer)}/bênção` : undefined}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Row icon="regeneration" label="Regeneração" value={`${n1(get("base_health_regen"))}/s`} />
            <Row icon="move-speed" label="Velocidade" value={`${n1(get("max_move_speed"))} m/s`} />
            <Row icon="sprint" label="Corrida" value={`+${n1(get("sprint_speed"))} m/s`} />
            <Row icon="stamina" label="Stamina" value={String(get("stamina"))} />
            <Row icon="dash" label="Investida" value={`${n1(get("ground_dash_distance_in_meters"))} m`} />
          </div>
        </Panel>

        <Panel theme="spirit" slant="slantRight" className="space-y-4">
          <Header icon="spirit" label="Espírito" theme="spirit" />
          <BigStat
            icon="spirit-power"
            value={n1(spirit)}
            label="Poder de espírito"
            sub={spiritPer > 0 ? `+${n2(spiritPer)}/bênção` : undefined}
          />
        </Panel>
      </div>
    </div>
  );
}