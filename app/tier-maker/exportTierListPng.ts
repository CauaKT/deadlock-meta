export interface ExportTierHero {
  id: number;
  name: string;
  image: string;
  rgb?: [number, number, number] | null;
}

export interface ExportTierRow {
  label: string;
  color: string;
  heroes: ExportTierHero[];
}

export interface ExportQuadrantHero extends ExportTierHero {
  x: number;
  y: number;
}

export interface ExportQuadrantBoard {
  topLabel: string;
  bottomLabel: string;
  leftLabel: string;
  rightLabel: string;
  axes?: string[];
  heroes: ExportQuadrantHero[];
}

export interface ExportTierListOptions {
  title: string;
  author?: string;
  dateLabel?: string;
  style?: "classic" | "quadrant";
  tiers: ExportTierRow[];
  quadrant?: ExportQuadrantBoard | null;
}

async function loadBitmap(url: string): Promise<ImageBitmap | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors", cache: "no-store" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const paragraphs = text.replace(/\r/g, "").split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
        if (lines.length >= maxLines) break;
      }
    }
    if (lines.length < maxLines) lines.push(current);
    if (lines.length >= maxLines) break;
  }

  return lines.length > 0 ? lines.slice(0, maxLines) : [""];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

async function exportQuadrantBoardToPng(options: ExportTierListOptions): Promise<void> {
  const quadrant = options.quadrant;
  if (!quadrant) return;

  const WIDTH = 1200;
  const PADDING = 36;
  const HEADER_H = 88;
  const TOP_OUTER = 52;
  const BOTTOM_OUTER = 52;
  const BOARD_SIZE = 740;
  const totalHeight = PADDING + HEADER_H + TOP_OUTER + BOARD_SIZE + BOTTOM_OUTER + PADDING;

  const uniqueUrls = Array.from(
    new Set(quadrant.heroes.map((h) => h.image).filter(Boolean)),
  );
  const bitmaps = new Map<string, ImageBitmap | null>();
  await Promise.all(
    uniqueUrls.map(async (url) => {
      bitmaps.set(url, await loadBitmap(url));
    }),
  );

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * scale;
  canvas.height = totalHeight * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível neste navegador.");
  ctx.scale(scale, scale);

  ctx.fillStyle = "#090c0b";
  ctx.fillRect(0, 0, WIDTH, totalHeight);

  const cleanTitle = options.title.trim() || "Minha Tier List";
  ctx.fillStyle = "#f4efe6";
  ctx.font = "900 32px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(cleanTitle, PADDING, PADDING, WIDTH - PADDING * 2 - 220);

  const metaParts: string[] = [];
  if (options.author?.trim()) metaParts.push(`Por ${options.author.trim()}`);
  if (options.dateLabel?.trim()) metaParts.push(options.dateLabel.trim());
  if (metaParts.length > 0) {
    ctx.fillStyle = "#a3a3a3";
    ctx.font = "600 14px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(metaParts.join("  •  "), PADDING, PADDING + 42);
  }

  ctx.textAlign = "right";
  ctx.fillStyle = "#f59e0b";
  ctx.font = "900 20px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("LOCKPRO", WIDTH - PADDING, PADDING + 6);
  ctx.fillStyle = "#737373";
  ctx.font = "600 11px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("lockpro.vercel.app", WIDTH - PADDING, PADDING + 32);
  ctx.textAlign = "left";

  const bx = (WIDTH - BOARD_SIZE) / 2;
  const by = PADDING + HEADER_H + TOP_OUTER;
  const cx = bx + BOARD_SIZE / 2;
  const cy = by + BOARD_SIZE / 2;

  const axes =
    Array.isArray(quadrant.axes) && quadrant.axes.length >= 3
      ? quadrant.axes.slice(0, 10)
      : [
          quadrant.topLabel,
          quadrant.rightLabel,
          quadrant.bottomLabel,
          quadrant.leftLabel,
        ];
  const axisCount = axes.length;
  const isSquare = axisCount === 4;

  const vertices =
    axisCount === 3
      ? [
          { x: bx + 0.5 * BOARD_SIZE, y: by + 0.015 * BOARD_SIZE },
          { x: bx + 0.985 * BOARD_SIZE, y: by + 0.985 * BOARD_SIZE },
          { x: bx + 0.015 * BOARD_SIZE, y: by + 0.985 * BOARD_SIZE },
        ]
      : (() => {
          const raw = Array.from({ length: axisCount }, (_, i) => {
            const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axisCount;
            return { x: Math.cos(angle), y: Math.sin(angle) };
          });
          const minX = Math.min(...raw.map((p) => p.x));
          const maxX = Math.max(...raw.map((p) => p.x));
          const minY = Math.min(...raw.map((p) => p.y));
          const maxY = Math.max(...raw.map((p) => p.y));
          const scale = (BOARD_SIZE * 0.97) / (Math.max(maxX - minX, maxY - minY) || 1);
          const rx = (minX + maxX) / 2;
          const ry = (minY + maxY) / 2;
          return raw.map((p) => ({ x: cx + (p.x - rx) * scale, y: cy + (p.y - ry) * scale }));
        })();

  const polyCenter =
    axisCount === 3
      ? { x: bx + 0.5 * BOARD_SIZE, y: by + 0.6617 * BOARD_SIZE }
      : { x: cx, y: cy };

  const traceScaledPolygon = (scaleFactor: number) => {
    const scaled = vertices.map((v) => ({
      x: polyCenter.x + (v.x - polyCenter.x) * scaleFactor,
      y: polyCenter.y + (v.y - polyCenter.y) * scaleFactor,
    }));
    const n = scaled.length;
    const corners = scaled.map((curr, i) => {
      const prev = scaled[(i - 1 + n) % n];
      const next = scaled[(i + 1) % n];
      const d1x = prev.x - curr.x;
      const d1y = prev.y - curr.y;
      const d2x = next.x - curr.x;
      const d2y = next.y - curr.y;
      const len1 = Math.hypot(d1x, d1y) || 1;
      const len2 = Math.hypot(d2x, d2y) || 1;
      const r = Math.min(20 * scaleFactor, len1 * 0.35, len2 * 0.35);
      return {
        cx: curr.x,
        cy: curr.y,
        p1x: curr.x + (d1x / len1) * r,
        p1y: curr.y + (d1y / len1) * r,
        p2x: curr.x + (d2x / len2) * r,
        p2y: curr.y + (d2y / len2) * r,
      };
    });
    ctx.beginPath();
    ctx.moveTo(corners[0].p2x, corners[0].p2y);
    for (let i = 1; i < n; i++) {
      ctx.lineTo(corners[i].p1x, corners[i].p1y);
      ctx.quadraticCurveTo(corners[i].cx, corners[i].cy, corners[i].p2x, corners[i].p2y);
    }
    ctx.lineTo(corners[0].p1x, corners[0].p1y);
    ctx.quadraticCurveTo(corners[0].cx, corners[0].cy, corners[0].p2x, corners[0].p2y);
    ctx.closePath();
  };

  const traceBoardShape = () => {
    if (isSquare) {
      drawRoundedRect(ctx, bx, by, BOARD_SIZE, BOARD_SIZE, 18);
      return;
    }
    traceScaledPolygon(1);
  };

  ctx.save();
  traceBoardShape();
  ctx.fillStyle = "#070a09";
  ctx.fill();
  ctx.clip();

  const glow = ctx.createRadialGradient(
    polyCenter.x,
    polyCenter.y,
    10,
    polyCenter.x,
    polyCenter.y,
    BOARD_SIZE * 0.55,
  );
  glow.addColorStop(0, "rgba(245, 158, 11, 0.08)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(bx, by, BOARD_SIZE, BOARD_SIZE);

  // Grade sutil coerente com a forma
  ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
  ctx.lineWidth = 1;
  if (isSquare) {
    const step = BOARD_SIZE / 8;
    for (let i = 1; i < 8; i++) {
      const px = bx + i * step;
      const py = by + i * step;
      ctx.beginPath();
      ctx.moveTo(px, by);
      ctx.lineTo(px, by + BOARD_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, py);
      ctx.lineTo(bx + BOARD_SIZE, py);
      ctx.stroke();
    }
  } else {
    const ringScales = axisCount === 3 ? [0.34, 0.67] : [0.25, 0.5, 0.75];
    for (const s of ringScales) {
      traceScaledPolygon(s);
      ctx.stroke();
    }
  }

  if (isSquare) {
    const hGrad = ctx.createLinearGradient(bx + 24, cy, bx + BOARD_SIZE - 24, cy);
    hGrad.addColorStop(0, "rgba(255, 255, 255, 0.03)");
    hGrad.addColorStop(0.5, "rgba(244, 239, 230, 0.14)");
    hGrad.addColorStop(1, "rgba(255, 255, 255, 0.03)");
    ctx.strokeStyle = hGrad;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx + 24, cy);
    ctx.lineTo(bx + BOARD_SIZE - 24, cy);
    ctx.stroke();

    const vGrad = ctx.createLinearGradient(cx, by + 24, cx, by + BOARD_SIZE - 24);
    vGrad.addColorStop(0, "rgba(255, 255, 255, 0.03)");
    vGrad.addColorStop(0.5, "rgba(244, 239, 230, 0.14)");
    vGrad.addColorStop(1, "rgba(255, 255, 255, 0.03)");
    ctx.strokeStyle = vGrad;
    ctx.beginPath();
    ctx.moveTo(cx, by + 24);
    ctx.lineTo(cx, by + BOARD_SIZE - 24);
    ctx.stroke();
  } else {
    const rGrad = ctx.createRadialGradient(
      polyCenter.x,
      polyCenter.y,
      0,
      polyCenter.x,
      polyCenter.y,
      BOARD_SIZE * 0.45,
    );
    rGrad.addColorStop(0, "rgba(244, 239, 230, 0.14)");
    rGrad.addColorStop(1, "rgba(255, 255, 255, 0.03)");
    ctx.strokeStyle = rGrad;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const v of vertices) {
      const x2 = polyCenter.x + (v.x - polyCenter.x) * 0.93;
      const y2 = polyCenter.y + (v.y - polyCenter.y) * 0.93;
      ctx.moveTo(polyCenter.x, polyCenter.y);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }

  // Heróis posicionados
  const HERO_SIZE = 74;
  for (const h of quadrant.heroes) {
    const hx = bx + (Math.min(95, Math.max(5, h.x)) / 100) * BOARD_SIZE;
    const hy = by + (Math.min(95, Math.max(5, h.y)) / 100) * BOARD_SIZE;
    const rgb = h.rgb ? `${h.rgb[0]}, ${h.rgb[1]}, ${h.rgb[2]}` : "245, 158, 11";

    const aura = ctx.createRadialGradient(hx, hy, 4, hx, hy, HERO_SIZE * 0.68);
    aura.addColorStop(0, `rgba(${rgb}, 0.34)`);
    aura.addColorStop(0.6, `rgba(${rgb}, 0.08)`);
    aura.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(hx, hy, HERO_SIZE * 0.68, 0, Math.PI * 2);
    ctx.fill();

    const bmp = bitmaps.get(h.image);
    if (bmp) {
      const ratio = bmp.width / bmp.height;
      const drawW = ratio >= 1 ? HERO_SIZE : HERO_SIZE * ratio;
      const drawH = ratio >= 1 ? HERO_SIZE / ratio : HERO_SIZE;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 14;
      ctx.drawImage(bmp, hx - drawW / 2, hy - drawH / 2, drawW, drawH);
      ctx.restore();
    }
  }

  ctx.restore();

  traceBoardShape();
  ctx.strokeStyle = "#262626";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rótulos das pontas (fora do clip para nunca cortar quinas)
  const drawPill = (text: string, pillX: number, pillY: number, pillW: number, pillH: number) => {
    const label = text.trim().toUpperCase();
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 6);
    ctx.fillStyle = "rgba(9, 13, 12, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#f4efe6";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, pillX + pillW / 2, pillY + pillH / 2, pillW - 14);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  };

  const PNG_LABEL_GAP = 14;
  if (isSquare) {
    const drawSquarePill = (text: string, x: number, y: number, align: "center" | "left" | "right") => {
      const label = text.trim().toUpperCase();
      ctx.font = "900 13px system-ui, -apple-system, Segoe UI, sans-serif";
      const textW = Math.min(210, ctx.measureText(label).width);
      const pillW = textW + 24;
      const pillH = 28;
      const pillX = align === "center" ? x - pillW / 2 : align === "left" ? x : x - pillW;
      drawPill(text, pillX, y - pillH / 2, pillW, pillH);
    };
    drawSquarePill(axes[0], cx, by - PNG_LABEL_GAP - 14, "center");
    drawSquarePill(axes[1], bx + BOARD_SIZE + PNG_LABEL_GAP, cy, "left");
    drawSquarePill(axes[2], cx, by + BOARD_SIZE + PNG_LABEL_GAP + 14, "center");
    drawSquarePill(axes[3], bx - PNG_LABEL_GAP, cy, "right");
  } else {
    axes.forEach((rawLabel, i) => {
      const v = vertices[i];
      const dx = Math.max(-1, Math.min(1, (v.x - polyCenter.x) / (BOARD_SIZE * 0.485)));
      const dy = Math.max(-1, Math.min(1, (v.y - polyCenter.y) / (BOARD_SIZE * 0.485)));
      const label = rawLabel.trim().toUpperCase();
      ctx.font = `900 ${axisCount >= 9 ? 11 : 13}px system-ui, -apple-system, Segoe UI, sans-serif`;
      const textW = Math.min(200, ctx.measureText(label).width);
      const pillW = textW + 22;
      const pillH = 28;
      const pillX = v.x + dx * PNG_LABEL_GAP - ((1 - dx) / 2) * pillW;
      const pillY = v.y + dy * PNG_LABEL_GAP - ((1 - dy) / 2) * pillH;
      drawPill(rawLabel, pillX, pillY, pillW, pillH);
    });
  }

  bitmaps.forEach((bmp) => bmp?.close());

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Não foi possível gerar a imagem PNG.");

  const slug =
    cleanTitle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tier-list";

  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `${slug}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(downloadUrl);
}

export async function exportTierListToPng(options: ExportTierListOptions): Promise<void> {
  if (options.style === "quadrant" && options.quadrant) {
    return exportQuadrantBoardToPng(options);
  }
  const WIDTH = 1200;
  const PADDING = 36;
  const HEADER_H = 88;
  const LABEL_W = 164;
  const CELL_GAP = 10;
  const CELL_PAD_X = 16;
  const CELL_PAD_Y = 14;
  const CHIP_W = 78;
  const CHIP_H = 102;
  const COLS = Math.floor((WIDTH - PADDING * 2 - LABEL_W - CELL_PAD_X * 2 + CELL_GAP) / (CHIP_W + CELL_GAP));

  const uniqueUrls = Array.from(
    new Set(options.tiers.flatMap((t) => t.heroes.map((h) => h.image)).filter(Boolean)),
  );
  const bitmaps = new Map<string, ImageBitmap | null>();
  await Promise.all(
    uniqueUrls.map(async (url) => {
      bitmaps.set(url, await loadBitmap(url));
    }),
  );

  const rowHeights = options.tiers.map((tier) => {
    const rowsNeeded = Math.max(1, Math.ceil(tier.heroes.length / COLS));
    const contentH = rowsNeeded * CHIP_H + (rowsNeeded - 1) * CELL_GAP + CELL_PAD_Y * 2;
    return Math.max(108, contentH);
  });

  const boardHeight = rowHeights.reduce((sum, h) => sum + h, 0);
  const totalHeight = PADDING + HEADER_H + boardHeight + PADDING;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * scale;
  canvas.height = totalHeight * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível neste navegador.");
  ctx.scale(scale, scale);

  // Fundo principal
  ctx.fillStyle = "#090c0b";
  ctx.fillRect(0, 0, WIDTH, totalHeight);

  // Cabeçalho
  const cleanTitle = options.title.trim() || "Minha Tier List";
  ctx.fillStyle = "#f4efe6";
  ctx.font = "900 32px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(cleanTitle, PADDING, PADDING, WIDTH - PADDING * 2 - 220);

  const metaParts: string[] = [];
  if (options.author?.trim()) metaParts.push(`Por ${options.author.trim()}`);
  if (options.dateLabel?.trim()) metaParts.push(options.dateLabel.trim());
  if (metaParts.length > 0) {
    ctx.fillStyle = "#a3a3a3";
    ctx.font = "600 14px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(metaParts.join("  •  "), PADDING, PADDING + 42);
  }

  // Marca LockPro no canto direito do cabeçalho
  ctx.textAlign = "right";
  ctx.fillStyle = "#f59e0b";
  ctx.font = "900 20px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("LOCKPRO", WIDTH - PADDING, PADDING + 6);
  ctx.fillStyle = "#737373";
  ctx.font = "600 11px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("lockpro.vercel.app", WIDTH - PADDING, PADDING + 32);
  ctx.textAlign = "left";

  // Prancha
  const boardX = PADDING;
  const boardY = PADDING + HEADER_H;
  const boardW = WIDTH - PADDING * 2;

  ctx.save();
  drawRoundedRect(ctx, boardX, boardY, boardW, boardHeight, 16);
  ctx.clip();

  let cursorY = boardY;
  for (let r = 0; r < options.tiers.length; r++) {
    const tier = options.tiers[r];
    const rowH = rowHeights[r];

    // Fundo da linha
    ctx.fillStyle = "#0d1110";
    ctx.fillRect(boardX, cursorY, boardW, rowH);

    // Bloco colorido do tier
    ctx.fillStyle = /^#[0-9a-fA-F]{6}$/.test(tier.color) ? tier.color : "#64748b";
    ctx.fillRect(boardX, cursorY, LABEL_W, rowH);

    // Texto do tier
    const labelText = (tier.label || "").trim().toUpperCase();
    const fontSize = labelText.length > 14 ? 14 : labelText.length > 8 ? 16 : labelText.length > 4 ? 20 : 24;
    ctx.fillStyle = "#050505";
    ctx.font = `900 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = wrapText(ctx, labelText, LABEL_W - 20, 3);
    const lineH = fontSize * 1.2;
    const startTextY = cursorY + rowH / 2 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((line, idx) => {
      ctx.fillText(line, boardX + LABEL_W / 2, startTextY + idx * lineH);
    });
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Chips dos heróis
    const startX = boardX + LABEL_W + CELL_PAD_X;
    const startY = cursorY + CELL_PAD_Y;

    tier.heroes.forEach((hero, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (CHIP_W + CELL_GAP);
      const y = startY + row * (CHIP_H + CELL_GAP);

      ctx.save();
      drawRoundedRect(ctx, x, y, CHIP_W, CHIP_H, 10);
      ctx.fillStyle = "#161b19";
      ctx.fill();
      ctx.strokeStyle = "#262c29";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.clip();

      const bmp = bitmaps.get(hero.image);
      if (bmp) {
        const imgAspect = bmp.width / bmp.height;
        const boxSize = CHIP_W;
        let sx = 0;
        let sy = 0;
        let sw = bmp.width;
        let sh = bmp.height;
        if (imgAspect > 1) {
          sw = bmp.height;
          sx = (bmp.width - sw) / 2;
        } else if (imgAspect < 1) {
          sh = bmp.width;
          sy = (bmp.height - sh) / 2;
        }
        ctx.drawImage(bmp, sx, sy, sw, sh, x, y, boxSize, boxSize);
      }

      ctx.fillStyle = "#e5e5e5";
      ctx.font = "700 10px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const shortName =
        hero.name.length > 12 ? `${hero.name.slice(0, 11)}…` : hero.name;
      ctx.fillText(shortName, x + CHIP_W / 2, y + CHIP_W + (CHIP_H - CHIP_W) / 2);
      ctx.restore();
    });

    // Divisória horizontal
    if (r < options.tiers.length - 1) {
      ctx.fillStyle = "#262626";
      ctx.fillRect(boardX, cursorY + rowH - 1, boardW, 1);
    }

    cursorY += rowH;
  }

  ctx.restore();

  // Borda externa da prancha
  drawRoundedRect(ctx, boardX, boardY, boardW, boardHeight, 16);
  ctx.strokeStyle = "#262626";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  bitmaps.forEach((bmp) => bmp?.close());

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Não foi possível gerar a imagem PNG.");

  const slug = cleanTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "tier-list";

  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `${slug}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(downloadUrl);
}