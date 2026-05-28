/**
 * Generates a JPG image of the teams using HTML5 Canvas (zero dependencies).
 * Output: 1080x1350 (Instagram/WhatsApp friendly, ~150-300KB JPG)
 */
import logoVerticalUrl from '@/assets/logo-baba-play-vertical.svg';

interface PlayerLite {
  name: string;
  isSeed?: boolean;
  seedLevel?: number;
}

interface TeamLite {
  id: number;
  players: PlayerLite[];
  goalkeeper: { name: string } | null;
  isComplete: boolean;
}

interface GenerateOptions {
  teams: TeamLite[];
  queue: string[];
  showSeedBadge: boolean;
}

// Brand palette (HSL converted to hex for canvas)
const COLORS = {
  bg: '#0a0f0a',
  bgGradientTop: '#0d1f12',
  bgGradientBottom: '#050805',
  card: '#121a14',
  cardBorder: '#1f3528',
  primary: '#21C45D',
  primaryDim: '#1a9e4b',
  text: '#ffffff',
  textMuted: '#9ca3af',
  textDim: '#6b7280',
  accent: '#16a34a',
  warning: '#f59e0b',
};

const ensureFont = async (): Promise<void> => {
  // Wait for DM Sans to be available (already loaded by the app)
  if ('fonts' in document) {
    try {
      await document.fonts.load('700 48px "DM Sans"');
      await document.fonts.load('500 28px "DM Sans"');
      await document.fonts.load('400 24px "DM Sans"');
    } catch {
      // ignore — fallback to system font
    }
  }
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const drawShield = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) => {
  // Simple stylized shield
  const w = size;
  const h = size * 1.18;
  ctx.save();
  ctx.translate(cx - w / 2, cy - h / 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 0);
  ctx.lineTo(w, h * 0.18);
  ctx.lineTo(w, h * 0.55);
  ctx.bezierCurveTo(w, h * 0.85, w * 0.75, h, w * 0.5, h);
  ctx.bezierCurveTo(w * 0.25, h, 0, h * 0.85, 0, h * 0.55);
  ctx.lineTo(0, h * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawBall = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string
) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  // pentagon hint
  ctx.fillStyle = COLORS.bg;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const seedBadge = (player: PlayerLite, showSeedBadge: boolean): string => {
  if (!showSeedBadge || !player.isSeed) return '';
  if (!player.seedLevel || player.seedLevel === 1) return '🔑';
  return `${player.seedLevel}`;
};

export const generateTeamsImage = async (
  options: GenerateOptions
): Promise<Blob> => {
  await ensureFont();

  const { teams, queue, showSeedBadge } = options;

  // Layout constants
  const W = 1080;
  const PAD_X = 60;
  const HEADER_H = 300;
  const FOOTER_H = 80;

  // Preload vertical logo (async, with timeout safeguard)
  const logoImg = await loadImage(logoVerticalUrl).catch(() => null);

  // Adaptive grid + scale based on team count
  const n = teams.length;
  let cols: number;
  let s: number; // scale factor for fonts/heights
  if (n <= 2) { cols = 1; s = 1.0; }
  else if (n <= 4) { cols = 2; s = 1.0; }
  else if (n <= 6) { cols = 2; s = 0.9; }
  else if (n <= 9) { cols = 3; s = 0.85; }
  else { cols = 3; s = 0.75; }

  const rows = Math.ceil(n / cols);
  const cardGap = Math.round(28 * s);
  const cardW = (W - PAD_X * 2 - cardGap * (cols - 1)) / cols;

  // Estimate card height by max players (line + GK row)
  const maxPlayers = teams.reduce(
    (m, t) => Math.max(m, t.players.length + 1),
    0
  );
  const cardHeader = Math.round(90 * s);
  const playerRowH = Math.round(58 * s);
  const cardPadV = Math.round(28 * s);
  const gkRowH = Math.round(72 * s);
  const cardH = cardHeader + cardPadV * 2 + gkRowH + (maxPlayers - 1) * playerRowH - Math.round(8 * s);

  const queueBlockH = queue.length > 0 ? 80 + Math.ceil(queue.length / 3) * 50 : 0;

  const H = Math.max(
    1350,
    HEADER_H + rows * cardH + (rows - 1) * cardGap + queueBlockH + FOOTER_H + 80
  );

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background — vertical gradient + subtle radial green glow
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, COLORS.bgGradientTop);
  bgGrad.addColorStop(1, COLORS.bgGradientBottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Top green glow
  const glow = ctx.createRadialGradient(W / 2, 0, 50, W / 2, 0, 700);
  glow.addColorStop(0, 'rgba(33, 196, 93, 0.25)');
  glow.addColorStop(1, 'rgba(33, 196, 93, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 600);

  // === HEADER ===
  // Vertical logo centered
  const logoCx = W / 2;
  let subtitleY = 110;

  if (logoImg) {
    // SVG natural ratio 874x380
    const logoW = 290;
    const logoH = (logoImg.naturalHeight / logoImg.naturalWidth) * logoW;
    const logoX = logoCx - logoW / 2;
    const logoY = 40;
    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
    subtitleY = logoY + logoH + 90;
  } else {
    // Fallback: stylized text
    ctx.fillStyle = COLORS.text;
    ctx.font = '800 64px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BabaPlay', logoCx, 110);
    subtitleY = 200;
  }

  // Subtitle — bigger, bolder, with more breathing room
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 40px "DM Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Times do baba de hoje', W / 2, subtitleY);

  // === TEAM CARDS ===
  let cardY = HEADER_H + 20;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= teams.length) break;
      const team = teams[idx];
      const x = PAD_X + c * (cardW + cardGap);
      const y = cardY;

      const sc = (v: number) => Math.round(v * s);

      // Card background
      ctx.fillStyle = COLORS.card;
      roundRect(ctx, x, y, cardW, cardH, sc(28));
      ctx.fill();

      // Card border
      ctx.strokeStyle = team.isComplete ? COLORS.cardBorder : '#7f1d1d';
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, cardW, cardH, sc(28));
      ctx.stroke();

      // Header pill: shield + "Time N"
      const headerPillX = x + sc(24);
      const headerPillY = y + sc(24);
      const headerPillH = sc(50);
      const headerPillW = sc(180);

      ctx.fillStyle = 'rgba(33, 196, 93, 0.18)';
      roundRect(ctx, headerPillX, headerPillY, headerPillW, headerPillH, sc(14));
      ctx.fill();

      drawShield(ctx, headerPillX + sc(28), headerPillY + headerPillH / 2, sc(26), COLORS.primary);

      ctx.fillStyle = COLORS.primary;
      ctx.font = `700 ${sc(26)}px "DM Sans", sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Time ${team.id}`, headerPillX + sc(56), headerPillY + headerPillH / 2 + 1);

      // "Incompleto" badge
      if (!team.isComplete) {
        const badgeW = sc(130);
        const badgeX = x + cardW - sc(24) - badgeW;
        const badgeY = headerPillY + sc(6);
        const badgeH = sc(38);
        ctx.fillStyle = '#7f1d1d';
        roundRect(ctx, badgeX, badgeY, badgeW, badgeH, sc(10));
        ctx.fill();
        ctx.fillStyle = '#fecaca';
        ctx.font = `600 ${sc(18)}px "DM Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('Incompleto', badgeX + badgeW / 2, badgeY + badgeH / 2);
      }

      // Players list
      const listY = y + cardHeader + cardPadV - sc(10);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Goalkeeper row
      let rowY = listY;
      const gkBoxH = sc(64);
      const gkBoxW = cardW - sc(40);
      const hasGk = !!team.goalkeeper;
      ctx.fillStyle = hasGk ? 'rgba(33, 196, 93, 0.10)' : 'rgba(245, 158, 11, 0.10)';
      roundRect(ctx, x + sc(20), rowY, gkBoxW, gkBoxH, sc(12));
      ctx.fill();

      ctx.fillStyle = hasGk ? COLORS.primary : COLORS.warning;
      ctx.font = `700 ${sc(14)}px "DM Sans", sans-serif`;
      ctx.fillText('GOLEIRO', x + sc(36), rowY + sc(18));

      ctx.fillStyle = hasGk ? COLORS.text : COLORS.textMuted;
      ctx.font = `${hasGk ? 600 : 500} ${sc(hasGk ? 22 : 20)}px "DM Sans", sans-serif`;
      ctx.fillText(
        truncate(ctx, hasGk ? team.goalkeeper!.name : 'Sem goleiro', gkBoxW - sc(32)),
        x + sc(36),
        rowY + sc(46)
      );

      rowY += gkRowH;

      // Line players
      team.players.forEach((p, i) => {
        const numCx = x + sc(40);
        const numCy = rowY + sc(24);
        const circleR = sc(18);

        ctx.fillStyle = 'rgba(33, 196, 93, 0.15)';
        ctx.beginPath();
        ctx.arc(numCx, numCy, circleR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = COLORS.primary;
        ctx.font = `700 ${sc(18)}px "DM Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}`, numCx, numCy + 1);

        ctx.textAlign = 'left';
        ctx.fillStyle = COLORS.text;
        ctx.font = `500 ${sc(24)}px "DM Sans", sans-serif`;
        const badge = seedBadge(p, showSeedBadge);
        const nameMaxW = cardW - sc(90) - (badge ? sc(50) : 0);
        const displayName = truncate(ctx, p.name, nameMaxW);
        ctx.fillText(displayName, numCx + sc(32), numCy + 1);

        if (badge) {
          ctx.fillStyle = COLORS.primary;
          ctx.font = `700 ${sc(22)}px "DM Sans", sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText(badge, x + cardW - sc(28), numCy + 1);
        }

        rowY += playerRowH;
      });
    }
    cardY += cardH + cardGap;
  }

  // === QUEUE ===
  if (queue.length > 0) {
    const qY = cardY + 20;
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 28px "DM Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('⏳ Fila de espera', PAD_X, qY);

    const qBgY = qY + 30;
    const colsQ = 3;
    const colW = (W - PAD_X * 2) / colsQ;
    queue.forEach((name, i) => {
      const cx = PAD_X + (i % colsQ) * colW;
      const cy = qBgY + Math.floor(i / colsQ) * 50;
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '500 22px "DM Sans", sans-serif';
      ctx.fillText(`${i + 1}. ${truncate(ctx, name, colW - 30)}`, cx, cy + 25);
    });
  }

  // === FOOTER ===
  const footerY = H - 50;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '500 22px "DM Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('babaplay.online', W / 2, footerY);

  // Convert to JPG blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao gerar imagem'));
      },
      'image/jpeg',
      0.92
    );
  });
};

const truncate = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
};

export const downloadTeamsImage = async (options: GenerateOptions): Promise<void> => {
  const blob = await generateTeamsImage(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `baba-play-times-${date}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
