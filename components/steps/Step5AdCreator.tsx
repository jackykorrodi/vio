'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BriefingData } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DrawConfig {
  orgText: string;
  lpUrl: string;
  headline: string;
  subline: string;
  cta: string;
  bgStyle: 'overlay' | 'pure' | 'split';
  bgColor: string;
  textColor: string;
  accentColor: string;
  logoMode: 'text' | 'image';
  bgImageEl: HTMLImageElement | null;
  logoEl: HTMLImageElement | null;
  qrEl: HTMLImageElement | null;
}

interface AdFormat {
  id: string;
  label: string;
  w: number;
  h: number;
  preview: number;
  isDooh: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  primary: '#C1666B',
  pl: '#F9ECEC',
  pd: '#A84E53',
  taupe: '#5C4F3D',
  muted: '#8A8490',
  border: '#EDE8E0',
  bg: '#FAF7F2',
  white: '#FFFFFF',
  teal: '#2A7F7F',
} as const;

const DOOH_FORMATS: AdFormat[] = [
  { id: 'dooh-ls', label: 'Querformat 1920×1080', w: 1920, h: 1080, preview: 640, isDooh: true },
  { id: 'dooh-pt', label: 'Hochformat 1080×1920', w: 1080, h: 1920, preview: 270, isDooh: true },
];

const DISPLAY_FORMATS: AdFormat[] = [
  { id: 'disp-970', label: '970×250', w: 970, h: 250, preview: 680, isDooh: false },
  { id: 'disp-300-250', label: '300×250', w: 300, h: 250, preview: 300, isDooh: false },
  { id: 'disp-300-600', label: '300×600', w: 300, h: 600, preview: 280, isDooh: false },
];

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function shadeHex(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(parseInt(h.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(h.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(h.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function contrastColor(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1A1A1A' : '#FFFFFF';
}

function coverCrop(img: HTMLImageElement, ar: number): [number, number, number, number] {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const imgAr = iw / ih;
  let sx = 0, sy = 0, sw = iw, sh = ih;
  if (imgAr > ar) { sw = sh * ar; sx = (iw - sw) / 2; }
  else { sh = sw / ar; sy = (ih - sh) / 2; }
  return [sx, sy, sw, sh];
}

function fillWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  baseline: number,
  maxW: number,
  lineH: number,
  maxLines = 4,
): number {
  const words = text.split(' ').filter(Boolean);
  let line = '';
  let y = baseline;
  let linesDrawn = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = words[i];
      y += lineH;
      linesDrawn++;
      if (linesDrawn >= maxLines - 1) { line = words.slice(i).join(' '); break; }
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y;
}

function roundFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

// ─── Draw engine ──────────────────────────────────────────────────────────────

function getFontSizes(w: number, h: number) {
  const isDooh = w >= 1080 && h >= 1080;
  const isLB = w >= 900 && h <= 300;
  if (isDooh && w > h) return { headline: 68, subline: 30, cta: 24, logo: 22, domain: 18, qr: 160 };
  if (isDooh)          return { headline: 64, subline: 30, cta: 24, logo: 22, domain: 18, qr: 180 };
  if (isLB)            return { headline: 22, subline: 13, cta: 14, logo: 14, domain: 10, qr: 0 };
  if (h >= 500)        return { headline: 28, subline: 15, cta: 15, logo: 14, domain: 11, qr: 0 };
  return                      { headline: 22, subline: 13, cta: 13, logo: 13, domain: 10, qr: 0 };
}

function drawLeaderboard(
  ctx: CanvasRenderingContext2D,
  cfg: DrawConfig,
  w: number, h: number,
  pad: number, tc: string,
  FS: ReturnType<typeof getFontSizes>,
) {
  const cy = h / 2;

  // Logo left ~18%
  if (cfg.logoMode === 'image' && cfg.logoEl) {
    const lh = Math.min(h * 0.48, Math.max(36, FS.logo * 2.2));
    const lw = (cfg.logoEl.naturalWidth / cfg.logoEl.naturalHeight) * lh;
    ctx.drawImage(cfg.logoEl, pad, cy - lh / 2, Math.min(lw, w * 0.16), lh);
  } else if (cfg.orgText) {
    ctx.font = `600 ${FS.logo}px Outfit, sans-serif`;
    ctx.fillStyle = tc;
    ctx.globalAlpha = 0.88;
    ctx.fillText(cfg.orgText.toUpperCase(), pad, cy + FS.logo * 0.38);
    ctx.globalAlpha = 1;
  }

  // Headline + subline center
  const hlX = w * 0.22;
  ctx.font = `300 ${FS.headline}px Fraunces, Georgia, serif`;
  ctx.fillStyle = tc;
  ctx.fillText(cfg.headline || 'Ihre Botschaft hier', hlX, cy + FS.headline * 0.38);

  if (cfg.subline) {
    ctx.font = `400 ${FS.subline}px Outfit, sans-serif`;
    ctx.fillStyle = tc;
    ctx.globalAlpha = 0.68;
    ctx.fillText(cfg.subline, hlX, cy + FS.headline * 0.38 + FS.headline + 2);
    ctx.globalAlpha = 1;
  }

  // CTA right
  const ctaText = cfg.cta || 'Jetzt informieren';
  ctx.font = `600 ${FS.cta}px Outfit, sans-serif`;
  const ctaW = ctx.measureText(ctaText).width + 28;
  const ctaH = FS.cta + 18;
  const ctaX = w - pad - ctaW;
  const ctaY = cy - ctaH / 2;
  ctx.fillStyle = cfg.accentColor;
  roundFill(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  ctx.fillStyle = contrastColor(cfg.accentColor);
  ctx.fillText(ctaText, ctaX + 14, ctaY + ctaH * 0.73);
}

function drawStandard(
  ctx: CanvasRenderingContext2D,
  cfg: DrawConfig,
  w: number, h: number,
  pad: number, tc: string,
  FS: ReturnType<typeof getFontSizes>,
  isDooh: boolean,
) {
  const isSplit = cfg.bgStyle === 'split';
  const tX = isSplit ? w * 0.52 : pad;
  const tMaxW = isSplit ? w - tX - pad : w - pad * 2;

  // Logo
  if (cfg.logoMode === 'image' && cfg.logoEl) {
    const lh = isDooh
      ? (w > h ? Math.max(80, FS.logo * 2) : Math.max(64, FS.logo * 2))
      : Math.max(36, FS.logo * 2);
    const lw = (cfg.logoEl.naturalWidth / cfg.logoEl.naturalHeight) * lh;
    ctx.drawImage(cfg.logoEl, tX, pad, Math.min(lw, tMaxW), lh);
  } else if (cfg.orgText) {
    ctx.font = `600 ${FS.logo}px Outfit, sans-serif`;
    ctx.fillStyle = tc;
    ctx.globalAlpha = 0.85;
    ctx.fillText(cfg.orgText.toUpperCase(), tX, pad + FS.logo);
    ctx.globalAlpha = 1;
  }

  // Headline
  const isPure = cfg.bgStyle === 'pure' && cfg.bgImageEl;
  const hlBaseY = isPure ? h * 0.60 : h * 0.45;
  ctx.font = `300 ${FS.headline}px Fraunces, Georgia, serif`;
  ctx.fillStyle = tc;
  const hlEndY = fillWrapped(ctx, cfg.headline || 'Ihre Botschaft hier', tX, hlBaseY, tMaxW, FS.headline * 1.18, 3);

  // Subline
  let nextY = hlEndY + FS.subline * 0.9;
  if (cfg.subline) {
    ctx.font = `400 ${FS.subline}px Outfit, sans-serif`;
    ctx.fillStyle = tc;
    ctx.globalAlpha = 0.72;
    const slEndY = fillWrapped(ctx, cfg.subline, tX, nextY, tMaxW, FS.subline * 1.4, 3);
    ctx.globalAlpha = 1;
    nextY = slEndY + FS.subline * 0.65;
  }

  // CTA button
  const ctaText = cfg.cta || 'Jetzt informieren';
  const ctaPx = Math.max(10, FS.cta * 0.7);
  const ctaPy = Math.max(7, FS.cta * 0.46);
  ctx.font = `600 ${FS.cta}px Outfit, sans-serif`;
  const ctaW = ctx.measureText(ctaText).width + ctaPx * 2;
  const ctaH = FS.cta + ctaPy * 2;
  const ctaTop = nextY + FS.cta * 0.3;
  ctx.fillStyle = cfg.accentColor;
  roundFill(ctx, tX, ctaTop, ctaW, ctaH, ctaH / 2);
  ctx.fillStyle = contrastColor(cfg.accentColor);
  ctx.fillText(ctaText, tX + ctaPx, ctaTop + ctaPy + FS.cta * 0.8);

  // Domain (bottom-left of text area)
  if (cfg.lpUrl) {
    const domain = cfg.lpUrl.replace(/^https?:\/\//, '').split('/')[0];
    ctx.font = `400 ${FS.domain}px Outfit, sans-serif`;
    ctx.fillStyle = tc;
    ctx.globalAlpha = 0.5;
    ctx.fillText(domain, tX, h - pad);
    ctx.globalAlpha = 1;
  }

  // QR code (DOOH only, bottom-right)
  if (isDooh && cfg.qrEl && FS.qr > 0) {
    const qrSize = FS.qr;
    const qrPad = qrSize * 0.1;
    const qrX = w - pad - qrSize - qrPad * 2;
    const qrY = h - pad - qrSize - qrPad * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    roundFill(ctx, qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 10);
    ctx.drawImage(cfg.qrEl, qrX, qrY, qrSize, qrSize);
  }
}

function drawAd(canvas: HTMLCanvasElement, cfg: DrawConfig, w: number, h: number, isDooh: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = w;
  canvas.height = h;

  const pad = Math.min(w, h) * 0.065;
  const isLB = w >= 900 && h <= 300;
  const FS = getFontSizes(w, h);

  // Background base fill
  ctx.fillStyle = cfg.bgColor;
  ctx.fillRect(0, 0, w, h);

  if (cfg.bgImageEl) {
    const img = cfg.bgImageEl;
    const [sx, sy, sw, sh] = coverCrop(img, w / h);

    if (cfg.bgStyle === 'overlay') {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      ctx.fillStyle = hexToRgba(cfg.bgColor, 0.82);
      ctx.fillRect(0, 0, w, h);
    } else if (cfg.bgStyle === 'pure') {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      const g = ctx.createLinearGradient(0, h * 0.36, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.82)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    } else { // split
      // left 48% = image
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w * 0.48, h);
      ctx.clip();
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      ctx.restore();
      // gradient bridge 40%–52%
      const g = ctx.createLinearGradient(w * 0.40, 0, w * 0.52, 0);
      g.addColorStop(0, hexToRgba(cfg.bgColor, 0));
      g.addColorStop(1, hexToRgba(cfg.bgColor, 1));
      ctx.fillStyle = g;
      ctx.fillRect(w * 0.40, 0, w * 0.12, h);
    }
  } else {
    // No image: subtle diagonal gradient
    const g = ctx.createLinearGradient(0, 0, w * 0.6, h);
    g.addColorStop(0, cfg.bgColor);
    g.addColorStop(1, shadeHex(cfg.bgColor, -30));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  const tc = cfg.bgStyle === 'pure' && cfg.bgImageEl ? '#FFFFFF' : cfg.textColor;

  if (isLB) {
    drawLeaderboard(ctx, cfg, w, h, pad, tc, FS);
  } else {
    drawStandard(ctx, cfg, w, h, pad, tc, FS, isDooh);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  isActive: boolean;
}

const label: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, letterSpacing: '.1em',
  textTransform: 'uppercase', color: C.muted, display: 'block', marginBottom: '5px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 11px', borderRadius: '8px',
  border: `1px solid ${C.border}`, background: C.white,
  fontFamily: 'var(--font-outfit), sans-serif', fontSize: '13px', color: C.taupe,
  outline: 'none',
};

export default function Step5AdCreator({ briefing, updateBriefing, nextStep }: Props) {
  const analysis = briefing.analysis;
  const ogImageUrl = analysis?.ogImage || '';
  const ogLogoUrl = analysis?.ogLogo || analysis?.favicon || '';
  const themeColor = analysis?.themeColor || '';

  // ── Ad state ──
  const [orgText, setOrgText] = useState(analysis?.organisation || '');
  const [lpUrl, setLpUrl] = useState(briefing.url || '');
  const [headline, setHeadline] = useState('');
  const [subline, setSubline] = useState('');
  const [cta, setCta] = useState('Jetzt informieren');
  const [bgStyle, setBgStyle] = useState<'overlay' | 'pure' | 'split'>('overlay');
  const [bgColor, setBgColor] = useState(themeColor || '#C1666B');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [accentColor, setAccentColor] = useState(themeColor || '#C1666B');
  const [logoMode, setLogoMode] = useState<'text' | 'image'>('text');

  // ── Image elements ──
  const [bgImageEl, setBgImageEl] = useState<HTMLImageElement | null>(null);
  const [logoEl, setLogoEl] = useState<HTMLImageElement | null>(null);
  const [qrEl, setQrEl] = useState<HTMLImageElement | null>(null);

  // ── Status ──
  const [ogImageStatus, setOgImageStatus] = useState<'none' | 'loading' | 'ok' | 'error'>('none');
  const [ogLogoStatus, setOgLogoStatus] = useState<'none' | 'loading' | 'ok' | 'error'>('none');
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'dooh' | 'display'>('dooh');
  const [kiLoading, setKiLoading] = useState(false);
  const [headlineSuggestions, setHeadlineSuggestions] = useState<string[]>([]);

  // ── Canvas refs ──
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  // ── Load fonts ──
  useEffect(() => {
    if (!document.getElementById('vio-adcreator-fonts')) {
      const link = document.createElement('link');
      link.id = 'vio-adcreator-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400&family=Outfit:wght@400;500;600&display=swap';
      document.head.appendChild(link);
    }
    document.fonts.ready.then(() => setFontsLoaded(true));
  }, []);

  // ── Load bg image via proxy ──
  useEffect(() => {
    console.log('[VIO AdCreator] ogImage URL from Firecrawl:', ogImageUrl || '(none)');
    if (!ogImageUrl) { setOgImageStatus('none'); return; }
    setOgImageStatus('loading');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { setBgImageEl(img); setOgImageStatus('ok'); };
    img.onerror = () => {
      console.warn('[VIO AdCreator] ogImage proxy failed for URL:', ogImageUrl);
      setOgImageStatus('error');
    };
    img.src = `/api/proxy-image?url=${encodeURIComponent(ogImageUrl)}`;
  }, [ogImageUrl]);

  // ── Load logo via proxy ──
  useEffect(() => {
    if (!ogLogoUrl) { setOgLogoStatus('none'); return; }
    setOgLogoStatus('loading');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { setLogoEl(img); setLogoMode('image'); setOgLogoStatus('ok'); };
    img.onerror = () => setOgLogoStatus('error');
    img.src = `/api/proxy-image?url=${encodeURIComponent(ogLogoUrl)}`;
  }, [ogLogoUrl]);

  // ── QR code ──
  useEffect(() => {
    if (!lpUrl) { setQrEl(null); return; }
    (async () => {
      const QRCode = (await import('qrcode')).default;
      const dataUrl = await QRCode.toDataURL(lpUrl, {
        width: 200, margin: 1,
        color: { dark: '#000000ff', light: '#ffffffff' },
      });
      const img = new Image();
      img.onload = () => setQrEl(img);
      img.src = dataUrl;
    })();
  }, [lpUrl]);

  // ── Redraw all canvases ──
  const redraw = useCallback(() => {
    if (!fontsLoaded) return;
    const cfg: DrawConfig = { orgText, lpUrl, headline, subline, cta, bgStyle, bgColor, textColor, accentColor, logoMode, bgImageEl, logoEl, qrEl };
    [...DOOH_FORMATS, ...DISPLAY_FORMATS].forEach(fmt => {
      const canvas = canvasRefs.current[fmt.id];
      if (canvas) drawAd(canvas, cfg, fmt.w, fmt.h, fmt.isDooh);
    });
  }, [fontsLoaded, orgText, lpUrl, headline, subline, cta, bgStyle, bgColor, textColor, accentColor, logoMode, bgImageEl, logoEl, qrEl]);

  useEffect(() => { redraw(); }, [redraw]);

  // ── File uploads ──
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => { setBgImageEl(img); setOgImageStatus('ok'); };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => { setLogoEl(img); setLogoMode('image'); setOgLogoStatus('ok'); };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ── Download ──
  const download = (id: string, label: string) => {
    const canvas = canvasRefs.current[id];
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `vio-${label.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
    a.href = canvas.toDataURL('image/jpeg', 0.95);
    a.click();
  };

  // ── KI headlines ──
  const generateKiHeadlines = async () => {
    setKiLoading(true);
    try {
      const res = await fetch('/api/generate-headlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organisation: orgText, beschreibung: analysis?.beschreibung, url: lpUrl }),
      });
      const data = await res.json();
      setHeadlineSuggestions(data.headlines || []);
    } catch { /* ignore */ }
    setKiLoading(false);
  };

  // ── Auto-generate KI headlines on mount ──
  useEffect(() => {
    generateKiHeadlines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save & next ──
  const handleWeiter = () => {
    updateBriefing({
      werbemittel: 'erstellen',
      werbemittelErstellt: true,
      adHeadline: headline,
      adSubline: subline,
      adCta: cta,
      adBgStyle: bgStyle,
      adBgColor: bgColor,
      adTextColor: textColor,
      adAccentColor: accentColor,
    });
    nextStep();
  };

  const handleSkip = () => {
    updateBriefing({ werbemittel: 'spaeter', werbemittelErstellt: false });
    nextStep();
  };

  // ── Status badge helper ──
  const statusBadge = (s: 'none' | 'loading' | 'ok' | 'error', label: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: s === 'ok' ? C.teal : C.muted }}>
      <span style={{ fontSize: '10px' }}>{s === 'ok' ? '✓' : s === 'loading' ? '…' : '–'}</span>
      {label}
    </span>
  );

  const wordCount = headline.trim() ? headline.trim().split(/\s+/).length : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section style={{ backgroundColor: C.bg, minHeight: '100vh' }}>
      {/* Eyebrow + title */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '18px', height: '2px', background: C.primary, borderRadius: '2px' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' }}>
            Schritt 5
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '30px', fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: '6px', color: C.taupe }}>
          Werbemittel erstellen.
        </h1>
        <p style={{ fontSize: '14px', color: C.muted, marginBottom: '24px', lineHeight: 1.6 }}>
          Gestalte deine Anzeigen direkt im Browser – für DOOH und Display.
        </p>
      </div>

      {/* Main layout: sidebar + canvas */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 80px', display: 'flex', gap: '28px', alignItems: 'flex-start' }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: '320px', flexShrink: 0, position: 'sticky', top: '72px' }}>
          <div style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Status bar */}
            <div style={{ background: C.bg, borderRadius: '8px', padding: '10px 12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.08em', color: C.muted, textTransform: 'uppercase', width: '100%', marginBottom: '2px' }}>
                Von Website geladen
              </span>
              {statusBadge(ogImageStatus, 'Hintergrundbild')}
              {statusBadge(ogLogoStatus, 'Logo')}
              {(ogImageStatus === 'error' || (ogImageStatus === 'none' && !ogImageUrl)) && (
                <span style={{ fontSize: '11px', color: C.muted, width: '100%', marginTop: '2px' }}>
                  Kein Bild von der Website gefunden – bitte hochladen
                </span>
              )}
            </div>

            {/* Org */}
            <div>
              <span style={label}>Marke / Organisation</span>
              <input
                type="text"
                value={orgText}
                onChange={e => setOrgText(e.target.value)}
                placeholder="Firmenname"
                style={inputStyle}
              />
            </div>

            {/* URL */}
            <div>
              <span style={label}>Landingpage URL</span>
              <input
                type="url"
                value={lpUrl}
                onChange={e => setLpUrl(e.target.value)}
                placeholder="https://…"
                style={inputStyle}
              />
            </div>

            {/* Headline */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <span style={{ ...label, marginBottom: 0 }}>Headline</span>
                <span style={{ fontSize: '11px', color: wordCount > 5 ? C.primary : C.muted }}>
                  {wordCount}/5 Wörter
                </span>
              </div>
              <input
                type="text"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                placeholder="Max. 5 Wörter empfohlen"
                style={inputStyle}
              />
              {/* KI button */}
              <button
                type="button"
                onClick={generateKiHeadlines}
                disabled={kiLoading}
                style={{
                  marginTop: '7px', fontSize: '11px', fontWeight: 600,
                  color: C.primary, background: C.pl, border: 'none',
                  borderRadius: '100px', padding: '5px 12px',
                  cursor: kiLoading ? 'default' : 'pointer', opacity: kiLoading ? 0.6 : 1,
                  fontFamily: 'var(--font-outfit), sans-serif',
                }}
              >
                {kiLoading ? '…' : '✦ KI Headlines'}
              </button>
              {headlineSuggestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                  {headlineSuggestions.map((hl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setHeadline(hl)}
                      style={{
                        textAlign: 'left', fontSize: '12px', color: C.taupe,
                        background: headline === hl ? C.pl : C.bg,
                        border: `1px solid ${headline === hl ? C.primary : C.border}`,
                        borderRadius: '6px', padding: '6px 10px',
                        cursor: 'pointer', fontFamily: 'var(--font-outfit), sans-serif',
                      }}
                    >
                      {hl}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subline */}
            <div>
              <span style={label}>Subline</span>
              <input
                type="text"
                value={subline}
                onChange={e => setSubline(e.target.value)}
                placeholder="Kurze Ergänzung…"
                style={inputStyle}
              />
            </div>

            {/* CTA */}
            <div>
              <span style={label}>Call to Action</span>
              <input
                type="text"
                value={cta}
                onChange={e => setCta(e.target.value)}
                placeholder="Jetzt informieren"
                style={inputStyle}
              />
            </div>

            {/* Logo section */}
            <div>
              <span style={label}>Logo</span>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {(['text', 'image'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLogoMode(m)}
                    style={{
                      flex: 1, fontSize: '12px', fontWeight: 600,
                      padding: '7px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                      background: logoMode === m ? C.primary : C.bg,
                      color: logoMode === m ? '#fff' : C.taupe,
                      fontFamily: 'var(--font-outfit), sans-serif',
                    }}
                  >
                    {m === 'text' ? 'Text' : 'Bild'}
                  </button>
                ))}
              </div>
              {logoMode === 'image' && (
                <label style={{ display: 'block', cursor: 'pointer' }}>
                  <div style={{
                    border: `1.5px dashed ${C.border}`, borderRadius: '8px',
                    padding: '10px', textAlign: 'center', background: C.bg,
                    fontSize: '12px', color: C.muted,
                  }}>
                    {logoEl ? '✓ Logo geladen – ersetzen' : '↑ Logo hochladen'}
                  </div>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                </label>
              )}
            </div>

            {/* Background image */}
            <div>
              <span style={label}>Hintergrundbild</span>
              {bgImageEl && ogImageStatus === 'ok' && (
                <div style={{
                  width: '100%', height: '60px', borderRadius: '6px', marginBottom: '7px',
                  backgroundImage: `url(/api/proxy-image?url=${encodeURIComponent(ogImageUrl)})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  border: `1px solid ${C.border}`,
                }} />
              )}
              <label style={{ display: 'block', cursor: 'pointer' }}>
                <div style={{
                  border: `1.5px dashed ${C.border}`, borderRadius: '8px',
                  padding: '10px', textAlign: 'center', background: C.bg,
                  fontSize: '12px', color: C.muted,
                }}>
                  {bgImageEl ? '↑ Bild ersetzen' : '↑ Bild hochladen'}
                </div>
                <input type="file" accept="image/*" onChange={handleBgUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Background style */}
            <div>
              <span style={label}>Hintergrundstil</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {([['overlay', 'A Overlay'], ['pure', 'B Bild pur'], ['split', 'C Split']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBgStyle(v)}
                    style={{
                      flex: 1, fontSize: '11px', fontWeight: 600, padding: '7px 4px',
                      borderRadius: '7px', border: `1.5px solid ${bgStyle === v ? C.primary : C.border}`,
                      background: bgStyle === v ? C.pl : C.white,
                      color: bgStyle === v ? C.pd : C.taupe,
                      cursor: 'pointer', fontFamily: 'var(--font-outfit), sans-serif',
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <span style={label}>Farben</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {([
                  ['Hauptfarbe', bgColor, setBgColor],
                  ['Textfarbe', textColor, setTextColor],
                  ['CTA-Farbe', accentColor, setAccentColor],
                ] as [string, string, (v: string) => void][]).map(([lbl, val, setter]) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="color"
                      value={val}
                      onChange={e => setter(e.target.value)}
                      style={{ width: '30px', height: '30px', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: 0 }}
                    />
                    <span style={{ fontSize: '13px', color: C.taupe }}>{lbl}</span>
                    {lbl === 'Hauptfarbe' && themeColor && (
                      <span style={{ fontSize: '10px', color: C.teal, background: '#e8f5f2', borderRadius: '4px', padding: '2px 6px', marginLeft: '2px' }}>
                        Von Website
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: C.muted, marginLeft: 'auto', fontFamily: 'monospace' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Canvas area ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
            {(['dooh', 'display'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '9px 20px', borderRadius: '100px',
                  border: `1.5px solid ${activeTab === tab ? C.primary : C.border}`,
                  fontFamily: 'var(--font-outfit), sans-serif', fontSize: '13px', fontWeight: 600,
                  background: activeTab === tab ? C.primary : C.white,
                  color: activeTab === tab ? '#fff' : C.taupe,
                  cursor: 'pointer',
                }}
              >
                {tab === 'dooh' ? 'DOOH' : 'Display'}
              </button>
            ))}
          </div>

          {/* DOOH canvases */}
          {activeTab === 'dooh' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {DOOH_FORMATS.map(fmt => {
                const previewH = Math.round((fmt.preview / fmt.w) * fmt.h);
                return (
                  <div key={fmt.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: C.taupe }}>{fmt.label}</span>
                      <button
                        type="button"
                        onClick={() => download(fmt.id, fmt.label)}
                        style={{
                          fontSize: '12px', fontWeight: 600, color: C.primary, background: C.pl,
                          border: 'none', borderRadius: '100px', padding: '5px 14px', cursor: 'pointer',
                          fontFamily: 'var(--font-outfit), sans-serif',
                        }}
                      >
                        ↓ JPG
                      </button>
                    </div>
                    <div style={{ borderRadius: '8px', overflow: 'hidden', border: `1px solid ${C.border}` }}>
                      <canvas
                        ref={el => { canvasRefs.current[fmt.id] = el; }}
                        style={{ width: `${fmt.preview}px`, height: `${previewH}px`, display: 'block' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Display canvases */}
          {activeTab === 'display' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {DISPLAY_FORMATS.map(fmt => {
                const previewH = Math.round((fmt.preview / fmt.w) * fmt.h);
                return (
                  <div key={fmt.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: C.taupe }}>{fmt.label}</span>
                      <button
                        type="button"
                        onClick={() => download(fmt.id, fmt.label)}
                        style={{
                          fontSize: '12px', fontWeight: 600, color: C.primary, background: C.pl,
                          border: 'none', borderRadius: '100px', padding: '5px 14px', cursor: 'pointer',
                          fontFamily: 'var(--font-outfit), sans-serif',
                        }}
                      >
                        ↓ JPG
                      </button>
                    </div>
                    <div style={{ borderRadius: '8px', overflow: 'hidden', border: `1px solid ${C.border}`, display: 'inline-block' }}>
                      <canvas
                        ref={el => { canvasRefs.current[fmt.id] = el; }}
                        style={{ width: `${fmt.preview}px`, height: `${previewH}px`, display: 'block' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* All canvases rendered (but hidden when tab not active) – kept in DOM for download */}
          <div style={{ display: 'none' }}>
            {(activeTab === 'dooh' ? DISPLAY_FORMATS : DOOH_FORMATS).map(fmt => (
              <canvas
                key={fmt.id}
                ref={el => { canvasRefs.current[fmt.id] = el; }}
              />
            ))}
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button
              type="button"
              onClick={handleWeiter}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: C.primary, color: '#fff', border: 'none',
                borderRadius: '100px', padding: '15px 32px',
                fontFamily: 'var(--font-outfit), sans-serif', fontSize: '16px', fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(193,102,107,.3)',
                transition: 'all .18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
            >
              Weiter zum Abschluss →
            </button>
            <button
              type="button"
              onClick={handleSkip}
              style={{
                background: 'none', border: `1.5px solid ${C.border}`, borderRadius: '100px',
                padding: '15px 24px', fontFamily: 'var(--font-outfit), sans-serif',
                fontSize: '15px', fontWeight: 500, color: C.muted, cursor: 'pointer',
                transition: 'all .18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.muted; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
            >
              Überspringen
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
