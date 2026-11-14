export interface ExportTierHero {
  id: number;
  name: string;
  image: string;
}

export interface ExportTierRow {
  label: string;
  color: string;
  heroes: ExportTierHero[];
}

export interface ExportTierListOptions {
  title: string;
  author?: string;
  dateLabel?: string;
  tiers: ExportTierRow[];
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

export async function exportTierListToPng(options: ExportTierListOptions): Promise<void> {
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