/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { getPublicTierListById } from "@/lib/backend/server";
import { loadMakerData } from "../../loadMakerData";

export const alt = "Tier list de Deadlock no LockPro";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MAX_TIERS = 7;

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