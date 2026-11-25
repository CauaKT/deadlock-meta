/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { getPublicTierListById } from "@/lib/backend/server";
import { loadMakerData } from "../../loadMakerData";

export const alt = "Tier list de Deadlock no LockPro";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MAX_TIERS = 7;

function polygonVertices(count: number): Array<{ x: number; y: number }> {
  if (count === 3) {
    return [
      { x: 50, y: 1.5 },
      { x: 98.5, y: 98.5 },
      { x: 1.5, y: 98.5 },
    ];
  }
  const raw: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    raw.push({ x: Math.cos(a), y: Math.sin(a) });
  }
  const minX = Math.min(...raw.map((p) => p.x));
  const maxX = Math.max(...raw.map((p) => p.x));
  const minY = Math.min(...raw.map((p) => p.y));
  const maxY = Math.max(...raw.map((p) => p.y));
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const scale = 97 / span;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return raw.map((p) => ({
    x: 50 + (p.x - cx) * scale,
    y: 50 + (p.y - cy) * scale,
  }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getPublicTierListById(id);

  if (!item) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#070807",
            color: "#f59e0b",
            fontSize: 96,
            fontWeight: 900,
          }}
        >
          LockPro
        </div>
      ),
      { ...size },
    );
  }

  const { makerHeroes } = await loadMakerData();

  if (item.style === "quadrant" && item.quadrant) {
    const iconById = new Map(makerHeroes.map((h) => [h.id, h.icon || h.image]));
    const BOX_W = 540;
    const BOX_H = 540;
    const ICON = 42;
    const axes =
      Array.isArray(item.quadrant.axes) && item.quadrant.axes.length >= 3
        ? item.quadrant.axes
        : [
            item.quadrant.topLabel,
            item.quadrant.rightLabel,
            item.quadrant.bottomLabel,
            item.quadrant.leftLabel,
          ];
    const isSquare = axes.length === 4;
    const verts = polygonVertices(axes.length);
    const polyPoints = verts.map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(" ");

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#070807",
            color: "#f4efe6",
            padding: 44,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: 510,
              height: BOX_H,
              paddingRight: 28,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 18, fontWeight: 900, color: "#f59e0b", letterSpacing: 2 }}>
                QUADRANTE 2D • LOCKPRO
              </div>
              <div style={{ display: "flex", fontSize: 52, fontWeight: 900, marginTop: 14, lineHeight: 1.1 }}>
                {item.title.slice(0, 42)}
              </div>
              <div style={{ display: "flex", fontSize: 24, color: "#a3a3a3", marginTop: 14 }}>
                {`por ${item.author}`}
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 20, color: "#737373" }}>
              {`${item.quadrant.items.length} heróis posicionados`}
            </div>
          </div>

          <div
            style={{
              position: "relative",
              display: "flex",
              width: BOX_W,
              height: BOX_H,
              background: "#090c0b",
              border: "2px solid #262626",
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            {isSquare ? (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: 16,
                    right: 16,
                    top: BOX_H / 2 - 1,
                    height: 2,
                    background: "rgba(244,239,230,0.35)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    bottom: 16,
                    left: BOX_W / 2 - 1,
                    width: 2,
                    background: "rgba(244,239,230,0.35)",
                  }}
                />
              </>
            ) : (
              <svg
                viewBox="0 0 100 100"
                width={BOX_W}
                height={BOX_H}
                style={{ position: "absolute", left: 0, top: 0 }}
              >
                <polygon
                  points={polyPoints}
                  fill="rgba(245,158,11,0.06)"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth={0.8}
                />
              </svg>
            )}

            {item.quadrant.items.map((it) => {
              const src = iconById.get(it.heroId);
              if (!src) return null;
              const px = Math.round((Math.min(95, Math.max(5, it.x)) / 100) * BOX_W - ICON / 2);
              const py = Math.round((Math.min(95, Math.max(5, it.y)) / 100) * BOX_H - ICON / 2);
              return (
                <img
                  key={it.heroId}
                  src={src}
                  alt=""
                  width={ICON}
                  height={ICON}
                  style={{
                    position: "absolute",
                    left: px,
                    top: py,
                    width: ICON,
                    height: ICON,
                    objectFit: "contain",
                  }}
                />
              );
            })}

            {isSquare && (
              <>
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    left: BOX_W / 2 - 90,
                    width: 180,
                    display: "flex",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#f4efe6",
                    background: "rgba(9,13,12,0.92)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 6,
                    padding: "4px 8px",
                  }}
                >
                  {item.quadrant.topLabel.slice(0, 22)}
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: BOX_W / 2 - 90,
                    width: 180,
                    display: "flex",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#f4efe6",
                    background: "rgba(9,13,12,0.92)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 6,
                    padding: "4px 8px",
                  }}
                >
                  {item.quadrant.bottomLabel.slice(0, 22)}
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 12,
                    top: BOX_H / 2 - 14,
                    display: "flex",
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#f4efe6",
                    background: "rgba(9,13,12,0.92)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 6,
                    padding: "4px 8px",
                  }}
                >
                  {item.quadrant.leftLabel.slice(0, 20)}
                </div>
                <div
                  style={{
                    position: "absolute",
                    right: 12,
                    top: BOX_H / 2 - 14,
                    display: "flex",
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#f4efe6",
                    background: "rgba(9,13,12,0.92)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 6,
                    padding: "4px 8px",
                  }}
                >
                  {item.quadrant.rightLabel.slice(0, 20)}
                </div>
              </>
            )}
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const imageById = new Map(makerHeroes.map((h) => [h.id, h.image]));

  const tiers = item.tiers.slice(0, MAX_TIERS);
  const rowH = Math.min(72, Math.floor(420 / Math.max(tiers.length, 1)));
  const icon = rowH - 8;
  const perRow = Math.floor((1200 - 80 - 150) / (icon + 6));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#070807",
          color: "#f4efe6",
          padding: 40,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 24 }}>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 900 }}>{item.title.slice(0, 40)}</div>
          <div style={{ display: "flex", fontSize: 26, color: "#a3a3a3", marginTop: 6 }}>
            {`por ${item.author} • LockPro`}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", border: "1px solid #262626" }}>
          {tiers.map((t, i) => (
            <div key={i} style={{ display: "flex", height: rowH, background: "#0a0a0a" }}>
              <div
                style={{
                  display: "flex",
                  width: 150,
                  alignItems: "center",
                  justifyContent: "center",
                  background: t.color,
                  color: "#000",
                  fontSize: 26,
                  fontWeight: 900,
                }}
              >
                {t.label.replace(/\n+/g, " ").slice(0, 10)}
              </div>
              <div style={{ display: "flex", flex: 1, alignItems: "center", paddingLeft: 6 }}>
                {(t.heroes || [])
                  .slice(0, perRow)
                  .map((hId) => imageById.get(hId))
                  .filter((src): src is string => Boolean(src))
                  .map((src, k) => (
                    <img
                      key={k}
                      src={src}
                      alt=""
                      width={icon}
                      height={icon}
                      style={{ width: icon, height: icon, marginRight: 6, borderRadius: 8, objectFit: "cover" }}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}