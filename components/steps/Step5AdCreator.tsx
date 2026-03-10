'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BriefingData } from '@/lib/types';

interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  isActive?: boolean;
}

type ElPos = { top: number; left: number };
type FormatPositions = Record<string, ElPos>;
type AllPositions = Record<string, FormatPositions>;
type AllSizes = Record<string, Record<string, number>>;

interface Colors {
  bg: string;
  hl: string;
  sub: string;
  logo: string;
  ctaTxt: string;
  ctaBg: string;
  domain: string;
}

interface DragState {
  fmtId: string;
  elId: string;
  startPos: ElPos;
  startMouse: { x: number; y: number };
  layerEl: HTMLElement;
}

// Default positions from V11b HTML (converted bottom/right → top/left approx.)
const DEF_POS: AllPositions = {
  quer: {
    logo:   { top: 5,  left: 3  },
    hl:     { top: 30, left: 3  },
    sub:    { top: 62, left: 3  },
    cta:    { top: 88, left: 3  },
    domain: { top: 88, left: 72 },
    qr:     { top: 84, left: 88 },
  },
  hoch: {
    logo:   { top: 4,  left: 6  },
    hl:     { top: 24, left: 6  },
    sub:    { top: 54, left: 6  },
    cta:    { top: 82, left: 6  },
    domain: { top: 90, left: 6  },
    qr:     { top: 85, left: 80 },
  },
  wide: {
    logo: { top: 43, left: 2  },
    hl:   { top: 43, left: 20 },
    sub:  { top: 68, left: 20 },
    cta:  { top: 43, left: 82 },
  },
  med: {
    logo: { top: 6,  left: 6 },
    hl:   { top: 28, left: 6 },
    sub:  { top: 58, left: 6 },
    cta:  { top: 85, left: 6 },
  },
  tall: {
    logo: { top: 4,  left: 6 },
    hl:   { top: 22, left: 6 },
    sub:  { top: 50, left: 6 },
    cta:  { top: 82, left: 6 },
  },
};

// Default font sizes from V11b HTML
const DEF_SIZES: AllSizes = {
  quer: { logo: 18, hl: 60, sub: 22, cta: 18, domain: 14, qr: 72 },
  hoch: { logo: 12, hl: 26, sub: 11, cta: 11, domain: 9,  qr: 44 },
  wide: { logo: 14, hl: 22, sub: 13, cta: 14 },
  med:  { logo: 11, hl: 20, sub: 11, cta: 11 },
  tall: { logo: 12, hl: 28, sub: 13, cta: 13 },
};

// Resize deltas per element per format
const RESIZE_DELTA: Record<string, Record<string, number>> = {
  quer: { logo: 1, hl: 2, sub: 1, cta: 1, domain: 1, qr: 4 },
  hoch: { logo: 1, hl: 1, sub: 1, cta: 1, domain: 1, qr: 3 },
  wide: { logo: 1, hl: 1, sub: 1, cta: 1 },
  med:  { logo: 1, hl: 1, sub: 1, cta: 1 },
  tall: { logo: 1, hl: 1, sub: 1, cta: 1 },
};

const FOCUS_POS = [
  ['0% 0%',   '50% 0%',   '100% 0%'  ],
  ['0% 50%',  '50% 50%',  '100% 50%' ],
  ['0% 100%', '50% 100%', '100% 100%'],
];

const ANIM_TIPS: Record<string, string> = {
  cta:  '✓ CTA pulsiert sanft',
  qr:   '✓ QR blendet ein/aus',
  hl:   '✓ Headline gleitet ein',
  none: '⏸ Statisch',
};

function hexRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function makeSuggestions(org: string, domain: string) {
  return {
    hl: [
      { text: `Willkommen bei ${org}`, tag: 'DOOH · generiert' },
      { text: `Jetzt ${org} entdecken`, tag: 'Display · generiert' },
      { text: `${org} – echt gut`,      tag: 'DOOH · kurz' },
    ],
    sub: [
      { text: domain,                       tag: 'Domain' },
      { text: 'Jetzt online informieren',   tag: 'Generisch' },
    ],
  };
}

// ─── Ad Preview Component ────────────────────────────────────────────────────

interface PreviewProps {
  fmtId: string;
  width: number;
  height: number;
  positions: AllPositions;
  sizes: AllSizes;
  colors: Colors;
  headline: string;
  subline: string;
  cta: string;
  domain: string;
  org: string;
  bgUrl: string;
  logoUrl: string;
  logoMode: 'text' | 'image';
  bgStyle: 'overlay' | 'pure' | 'split';
  anim: string;
  bgPos: string;
  lpUrl: string;
  selEl: string | null;
  onElMouseDown: (e: React.MouseEvent, fmtId: string, elId: string) => void;
  onLayerClick: (fmtId: string) => void;
  onResize: (fmtId: string, elId: string, delta: number) => void;
}

function AdPreview({
  fmtId, width, height, positions, sizes, colors,
  headline, subline, cta, domain, org,
  bgUrl, logoUrl, logoMode, bgStyle, anim, bgPos, lpUrl,
  selEl, onElMouseDown, onLayerClick, onResize,
}: PreviewProps) {
  const pos    = positions[fmtId] || DEF_POS[fmtId] || {};
  const sz     = sizes[fmtId]     || DEF_SIZES[fmtId] || {};
  const hasQr  = fmtId === 'quer' || fmtId === 'hoch';
  const elD    = RESIZE_DELTA[fmtId] || {};

  const animClass  = anim !== 'none' ? `anim-${anim}` : '';
  const styleClass = bgStyle === 'pure'  ? 'pure-mode'
                   : bgStyle === 'split' ? 'split-mode'
                   : '';

  function isSel(el: string) { return selEl === `${fmtId}:${el}`; }

  function Toolbar({ elId, delta }: { elId: string; delta: number }) {
    return (
      <div className="ac-tb">
        <button
          className="ac-tb-btn"
          onMouseDown={e => { e.stopPropagation(); onResize(fmtId, elId, -delta); }}
        >
          {elId === 'qr' ? '−' : 'A−'}
        </button>
        <div className="ac-tb-sep" />
        <button
          className="ac-tb-btn"
          onMouseDown={e => { e.stopPropagation(); onResize(fmtId, elId, delta); }}
        >
          {elId === 'qr' ? '+' : 'A+'}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`ad-wrap ac-ad ${animClass} ${styleClass}`.trim()}
      style={{ width, height, flexShrink: 0 }}
    >
      {/* Background */}
      <div
        className="ac-bg"
        style={{
          backgroundColor:   colors.bg,
          backgroundImage:   bgUrl ? `url('${bgUrl}')` : undefined,
          backgroundPosition: bgPos,
        }}
      />
      {/* Overlay */}
      <div className="ac-ov" style={{ background: hexRgba(colors.bg, 0.82) }} />
      {/* Split color */}
      <div className="ac-sc" style={{ background: colors.bg }} />

      {/* Drag layer */}
      <div
        className="ac-dl"
        onMouseDown={e => { if (e.target === e.currentTarget) onLayerClick(fmtId); }}
      >

        {/* Logo */}
        <div
          className={`ac-el${isSel('logo') ? ' sel' : ''}`}
          style={{ top: `${pos.logo?.top ?? 5}%`, left: `${pos.logo?.left ?? 3}%` }}
          onMouseDown={e => onElMouseDown(e, fmtId, 'logo')}
        >
          <Toolbar elId="logo" delta={elD.logo ?? 1} />
          {logoMode === 'image' && logoUrl ? (
            <img
              className="ac-logo-img"
              src={logoUrl}
              alt=""
              style={{ height: sz.logo ?? 18 }}
            />
          ) : (
            <div className="ac-logo-txt" style={{ fontSize: sz.logo ?? 18, color: colors.logo }}>
              {org || 'Organisation'}
            </div>
          )}
        </div>

        {/* Headline */}
        <div
          className={`ac-el${isSel('hl') ? ' sel' : ''}`}
          style={{
            top:      `${pos.hl?.top  ?? 30}%`,
            left:     `${pos.hl?.left ?? 3}%`,
            maxWidth: fmtId === 'quer' ? '55%' : fmtId === 'hoch' ? '82%' : '85%',
          }}
          onMouseDown={e => onElMouseDown(e, fmtId, 'hl')}
        >
          <Toolbar elId="hl" delta={elD.hl ?? 2} />
          <div className="ac-hl" style={{ fontSize: sz.hl ?? 28, color: colors.hl }}>
            {headline || 'Headline'}
          </div>
        </div>

        {/* Subline */}
        <div
          className={`ac-el${isSel('sub') ? ' sel' : ''}`}
          style={{ top: `${pos.sub?.top ?? 62}%`, left: `${pos.sub?.left ?? 3}%` }}
          onMouseDown={e => onElMouseDown(e, fmtId, 'sub')}
        >
          <Toolbar elId="sub" delta={elD.sub ?? 1} />
          <div className="ac-sub" style={{ fontSize: sz.sub ?? 13, color: colors.sub }}>
            {subline}
          </div>
        </div>

        {/* CTA */}
        <div
          className={`ac-el${isSel('cta') ? ' sel' : ''}`}
          style={{ top: `${pos.cta?.top ?? 88}%`, left: `${pos.cta?.left ?? 3}%` }}
          onMouseDown={e => onElMouseDown(e, fmtId, 'cta')}
        >
          <Toolbar elId="cta" delta={elD.cta ?? 1} />
          <div
            className="ac-cta"
            style={{
              fontSize:   sz.cta ?? 12,
              padding:    fmtId === 'quer' ? '10px 24px'
                        : fmtId === 'hoch' ? '6px 14px'
                        : fmtId === 'wide' ? '8px 18px'
                        : fmtId === 'tall' ? '8px 18px'
                        : '5px 12px',
              color:      colors.ctaTxt,
              background: colors.ctaBg,
            }}
          >
            {cta || 'Jetzt entdecken →'}
          </div>
        </div>

        {/* Domain – DOOH only */}
        {hasQr && (
          <div
            className={`ac-el${isSel('domain') ? ' sel' : ''}`}
            style={{ top: `${pos.domain?.top ?? 88}%`, left: `${pos.domain?.left ?? 72}%` }}
            onMouseDown={e => onElMouseDown(e, fmtId, 'domain')}
          >
            <Toolbar elId="domain" delta={elD.domain ?? 1} />
            <div className="ac-domain" style={{ fontSize: sz.domain ?? 12, color: colors.domain }}>
              {domain}
            </div>
          </div>
        )}

        {/* QR – DOOH only */}
        {hasQr && (
          <div
            className={`ac-el${isSel('qr') ? ' sel' : ''}`}
            style={{ top: `${pos.qr?.top ?? 84}%`, left: `${pos.qr?.left ?? 80}%` }}
            onMouseDown={e => onElMouseDown(e, fmtId, 'qr')}
          >
            <Toolbar elId="qr" delta={elD.qr ?? 4} />
            <div className="ac-qr" style={{ width: sz.qr ?? 60, height: sz.qr ?? 60 }}>
              <QRCodeSVG
                value={lpUrl || 'https://vio.ch'}
                size={sz.qr ?? 60}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Step5AdCreator({ briefing, updateBriefing, nextStep }: Props) {
  const ana = briefing.analysis;

  const initDomain = (() => {
    try { return new URL(briefing.url).hostname.replace('www.', ''); } catch { return briefing.url || ''; }
  })();
  const initOrg  = ana?.organisation || '';
  const initSugs = makeSuggestions(initOrg, initDomain);

  // ── Text ────────────────────────────────────────────────────────────────────
  const [org,      setOrg]      = useState(initOrg);
  const [headline, setHeadline] = useState(briefing.adHeadline || initSugs.hl[0]?.text || '');
  const [subline,  setSubline]  = useState(briefing.adSubline  || initSugs.sub[0]?.text || '');
  const [cta,      setCta]      = useState(briefing.adCta      || 'Jetzt reservieren →');
  const [lpUrl,    setLpUrl]    = useState(briefing.url        || '');
  const [crawlUrl, setCrawlUrl] = useState(briefing.url        || '');

  // ── Crawl UI ────────────────────────────────────────────────────────────────
  const [crawlStatus, setCrawlStatus] = useState('Im echten Flow automatisch befüllt.');
  const [crawlAssets, setCrawlAssets] = useState<{ color: string; logoUrl: string; text: string } | null>(null);

  // ── Suggestions ─────────────────────────────────────────────────────────────
  const [hlSugs,      setHlSugs]      = useState(initSugs.hl);
  const [subSugs,     setSubSugs]     = useState(initSugs.sub);
  const [activeHlSug, setActiveHlSug] = useState<number | null>(0);
  const [activeSubSug,setActiveSubSug]= useState<number | null>(0);

  // ── Logo ────────────────────────────────────────────────────────────────────
  const [logoMode,  setLogoMode]  = useState<'text' | 'image'>(briefing.adLogoMode || 'image');
  const [logoUrl,   setLogoUrl]   = useState(briefing.adLogoImageData || ana?.ogLogo || ana?.favicon || '');
  const [logoThumb, setLogoThumb] = useState(briefing.adLogoImageData || ana?.ogLogo || ana?.favicon || '');
  const logoFileRef = useRef<HTMLInputElement>(null);

  // ── Background ──────────────────────────────────────────────────────────────
  const [bgUrl,    setBgUrl]    = useState(briefing.adBgImageData || ana?.ogImage || '');
  const [bgThumb,  setBgThumb]  = useState(briefing.adBgImageData || ana?.ogImage || '');
  const [qualInfo, setQualInfo] = useState<{ cls: string; text: string } | null>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

  // ── Style & animation ───────────────────────────────────────────────────────
  const [bgStyle,   setBgStyle]   = useState<'overlay' | 'pure' | 'split'>(briefing.adBgStyle || 'overlay');
  const [bgPos,     setBgPos]     = useState('50% 50%');
  const [focusSel,  setFocusSel]  = useState<[number, number]>([1, 1]);
  const [anim,      setAnim]      = useState(briefing.adAnimation || 'cta');
  const [activeTab, setActiveTab] = useState<'dooh' | 'display'>('dooh');

  // ── Colors ──────────────────────────────────────────────────────────────────
  const themeColor = ana?.themeColor || '#C1666B';
  const [colors, setColors] = useState<Colors>({
    bg:     briefing.adBgColor   || themeColor,
    hl:     briefing.adTextColor || '#FFFFFF',
    sub:    '#FFFFFF',
    logo:   '#FFFFFF',
    ctaTxt: briefing.adAccentColor || '#5C4F3D',
    ctaBg:  '#FFFFFF',
    domain: '#FFFFFF',
  });

  // ── Positions & Sizes ───────────────────────────────────────────────────────
  const [positions, setPositions] = useState<AllPositions>(() => ({
    quer: { ...DEF_POS.quer },
    hoch: { ...DEF_POS.hoch },
    wide: { ...DEF_POS.wide },
    med:  { ...DEF_POS.med  },
    tall: { ...DEF_POS.tall },
  }));
  const [sizes, setSizes] = useState<AllSizes>(() => ({
    quer: { ...DEF_SIZES.quer },
    hoch: { ...DEF_SIZES.hoch },
    wide: { ...DEF_SIZES.wide },
    med:  { ...DEF_SIZES.med  },
    tall: { ...DEF_SIZES.tall },
  }));

  // ── Selection & Drag ────────────────────────────────────────────────────────
  const [selEl,  setSelEl]  = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const rect = d.layerEl.getBoundingClientRect();
      const dx = ((e.clientX - d.startMouse.x) / rect.width)  * 100;
      const dy = ((e.clientY - d.startMouse.y) / rect.height) * 100;
      setPositions(prev => ({
        ...prev,
        [d.fmtId]: {
          ...prev[d.fmtId],
          [d.elId]: {
            left: Math.max(0, Math.min(90, d.startPos.left + dx)),
            top:  Math.max(0, Math.min(90, d.startPos.top  + dy)),
          },
        },
      }));
    }
    function onUp() { dragRef.current = null; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, []);

  const handleElMouseDown = useCallback((e: React.MouseEvent, fmtId: string, elId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const layerEl = (e.currentTarget as HTMLElement).closest('.ac-dl') as HTMLElement;
    if (!layerEl) return;
    const curPos = positions[fmtId]?.[elId] ?? DEF_POS[fmtId]?.[elId] ?? { top: 5, left: 5 };
    dragRef.current = {
      fmtId, elId,
      startPos:   { ...curPos },
      startMouse: { x: e.clientX, y: e.clientY },
      layerEl,
    };
    setSelEl(`${fmtId}:${elId}`);
  }, [positions]);

  const handleLayerClick = useCallback((_fmtId: string) => { setSelEl(null); }, []);

  const handleResize = useCallback((fmtId: string, elId: string, delta: number) => {
    setSizes(prev => {
      const fmt = { ...(prev[fmtId] || {}) };
      if (elId === 'qr') {
        fmt.qr = Math.max(20, (fmt.qr ?? 60) + delta * 3);
      } else {
        fmt[elId] = Math.max(6, Math.min(120, (fmt[elId] ?? 12) + delta));
      }
      return { ...prev, [fmtId]: fmt };
    });
  }, []);

  // ── Domain derived from lpUrl ────────────────────────────────────────────────
  const domain = (() => {
    try { return new URL(lpUrl).hostname.replace('www.', ''); }
    catch { return lpUrl || ''; }
  })();

  // ── Crawl ────────────────────────────────────────────────────────────────────
  const handleCrawl = async () => {
    const url = crawlUrl.trim();
    if (!url) return;
    setCrawlStatus('Lade Daten…');
    try {
      const res = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, campaignType: briefing.campaignType }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const result = data.analysis || data;
      const newOrg = result.organisation || '';
      let newDomain = '';
      try { newDomain = new URL(url).hostname.replace('www.', ''); } catch { newDomain = url; }
      const newLogoUrl = result.ogLogo || result.favicon
        || `https://www.google.com/s2/favicons?domain=${newDomain}&sz=128`;
      const newColor = result.themeColor || '#C1666B';
      const newSugs  = makeSuggestions(newOrg, newDomain);

      setOrg(newOrg);
      setLpUrl(url);
      setLogoUrl(newLogoUrl); setLogoThumb(newLogoUrl); setLogoMode('image');
      setColors(prev => ({ ...prev, bg: newColor }));
      setHlSugs(newSugs.hl);  setSubSugs(newSugs.sub);
      setHeadline(newSugs.hl[0]?.text || '');
      setSubline(newSugs.sub[0]?.text || '');
      setActiveHlSug(0); setActiveSubSug(0);
      if (result.ogImage) { setBgUrl(result.ogImage); setBgThumb(result.ogImage); }
      setCrawlAssets({ color: newColor, logoUrl: newLogoUrl, text: `${newDomain} · Logo + Farbe geladen` });
      setCrawlStatus('✓ Geladen – bitte Bild manuell hochladen');
    } catch {
      setCrawlStatus('Fehler beim Laden – bitte URL prüfen');
    }
  };

  // ── Logo image ───────────────────────────────────────────────────────────────
  const loadLogoFromFile = (file: File) => {
    const r = new FileReader();
    r.onload = e => {
      const data = e.target?.result as string;
      setLogoUrl(data); setLogoThumb(data);
    };
    r.readAsDataURL(file);
  };

  // ── BG image ─────────────────────────────────────────────────────────────────
  const loadBgFromUrl = (url: string) => { setBgUrl(url); setBgThumb(url); };
  const loadBgFromFile = (file: File) => {
    const r = new FileReader();
    r.onload = e => {
      const data = e.target?.result as string;
      const img  = new Image();
      img.onload = () => {
        const w = img.naturalWidth, h = img.naturalHeight;
        if      (w >= 1920 && h >= 1080) setQualInfo({ cls: 'ac-qdot-g', text: `Top (${w}×${h})` });
        else if (w >= 1200)              setQualInfo({ cls: 'ac-qdot-w', text: `Evtl. unscharf (${w}×${h})` });
        else                              setQualInfo({ cls: 'ac-qdot-b', text: `Zu klein (${w}×${h})` });
      };
      img.src = data;
      setBgUrl(data); setBgThumb(data);
    };
    r.readAsDataURL(file);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    updateBriefing({
      adHeadline:      headline,
      adSubline:       subline,
      adCta:           cta,
      adBgStyle:       bgStyle,
      adBgColor:       colors.bg,
      adTextColor:     colors.hl,
      adAccentColor:   colors.ctaTxt,
      adLogoMode:      logoMode,
      adBgImageData:   bgUrl,
      adLogoImageData: logoUrl,
      adAnimation:     anim,
      adPositionsQuer: positions.quer as unknown as Record<string, { x: number; y: number }>,
    });
    nextStep();
  };

  // ─── Shared preview props ────────────────────────────────────────────────────
  const previewProps = {
    positions, sizes, colors, headline, subline, cta, domain, org,
    bgUrl, logoUrl, logoMode, bgStyle, anim, bgPos, lpUrl,
    selEl,
    onElMouseDown: handleElMouseDown,
    onLayerClick:  handleLayerClick,
    onResize:      handleResize,
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="ad-creator" style={{ display: 'flex', minHeight: '80vh', fontFamily: "'Outfit', sans-serif" }}>

      {/* ══════════════ SIDEBAR ══════════════ */}
      <div className="ac-sidebar">

        {/* Crawl card */}
        <div className="ac-crawl-card">
          <div className="ac-crawl-label">🔗 Von Website laden</div>
          <div className="ac-crawl-row">
            <input
              type="url"
              className="ac-crawl-inp"
              placeholder="https://deine-website.ch"
              value={crawlUrl}
              onChange={e => setCrawlUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCrawl()}
            />
            <button className="ac-crawl-btn" onClick={handleCrawl}>Laden</button>
          </div>
          <div className="ac-crawl-status">{crawlStatus}</div>
          {crawlAssets && (
            <div className="ac-crawl-assets">
              <div className="ac-crawl-chip" style={{ background: crawlAssets.color }} />
              {crawlAssets.logoUrl && <img className="ac-crawl-logo" src={crawlAssets.logoUrl} alt="" />}
              <span className="ac-crawl-txt">{crawlAssets.text}</span>
            </div>
          )}
        </div>

        {/* Kampagne */}
        <div className="ac-stitle">Kampagne</div>

        <div className="ac-fg">
          <label>Organisation / Marke</label>
          <input type="text" className="ac-inp" value={org} onChange={e => setOrg(e.target.value)} />
        </div>

        {/* Headline */}
        <div className="ac-fg">
          <label>Headline</label>
          <div className="ac-sug-wrap">
            {hlSugs.map((s, i) => (
              <div
                key={i}
                className={`ac-sug-chip${activeHlSug === i ? ' active' : ''}`}
                onClick={() => { setHeadline(s.text); setActiveHlSug(i); }}
              >
                {s.text}<span className="ac-sug-tag">{s.tag}</span>
              </div>
            ))}
          </div>
          <input
            type="text" className="ac-inp" placeholder="Eigene Headline…"
            value={headline}
            onChange={e => { setHeadline(e.target.value); setActiveHlSug(null); }}
          />
        </div>

        {/* Subline */}
        <div className="ac-fg">
          <label>Subline <span style={{ fontWeight: 300, fontSize: 10 }}>(optional)</span></label>
          <div className="ac-sug-wrap">
            {subSugs.map((s, i) => (
              <div
                key={i}
                className={`ac-sug-chip${activeSubSug === i ? ' active' : ''}`}
                onClick={() => { setSubline(s.text); setActiveSubSug(i); }}
              >
                {s.text}<span className="ac-sug-tag">{s.tag}</span>
              </div>
            ))}
          </div>
          <input
            type="text" className="ac-inp" placeholder="Eigene Subline…"
            value={subline}
            onChange={e => { setSubline(e.target.value); setActiveSubSug(null); }}
          />
        </div>

        <div className="ac-fg">
          <label>CTA-Button</label>
          <input type="text" className="ac-inp" value={cta} onChange={e => setCta(e.target.value)} />
        </div>

        <div className="ac-fg">
          <label>Landingpage URL (QR Code)</label>
          <input type="url" className="ac-inp" value={lpUrl} onChange={e => setLpUrl(e.target.value)} />
        </div>

        <div className="ac-hr" />

        {/* Logo */}
        <div className="ac-stitle">Logo</div>
        <div className="ac-logo-mode">
          <button
            className={`ac-logo-mode-btn${logoMode === 'text' ? ' active' : ''}`}
            onClick={() => setLogoMode('text')}
          >Text</button>
          <button
            className={`ac-logo-mode-btn${logoMode === 'image' ? ' active' : ''}`}
            onClick={() => setLogoMode('image')}
          >Bild-Logo</button>
        </div>

        {logoMode === 'text' && (
          <div className="ac-fg" style={{ marginTop: 7 }}>
            <input type="text" className="ac-inp" value={org} onChange={e => setOrg(e.target.value)} />
          </div>
        )}

        {logoMode === 'image' && (
          <div className="ac-fg" style={{ marginTop: 7 }}>
            {logoThumb && <img className="ac-img-thumb" src={logoThumb} alt="" />}
            <div className="ac-img-row">
              <input
                type="url" className="ac-img-inp" placeholder="https://… (auto befüllt)"
                value={logoUrl}
                onChange={e => { setLogoUrl(e.target.value); setLogoThumb(e.target.value); }}
              />
              <label className="ac-img-upload">
                📁
                <input
                  ref={logoFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && loadLogoFromFile(e.target.files[0])}
                />
              </label>
            </div>
          </div>
        )}

        <div className="ac-hr" />

        {/* Hintergrundbild */}
        <div className="ac-stitle">Hintergrundbild</div>
        <div className="ac-fg">
          {bgThumb && <img className="ac-img-thumb" src={bgThumb} alt="" />}
          <div className="ac-img-row">
            <input
              type="url" className="ac-img-inp" placeholder="https://… (auto befüllt)"
              value={bgUrl}
              onChange={e => loadBgFromUrl(e.target.value)}
            />
            <label className="ac-img-upload">
              📁
              <input
                ref={bgFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && loadBgFromFile(e.target.files[0])}
              />
            </label>
          </div>
          {qualInfo && (
            <div className="ac-qual-row">
              <div className={`ac-qdot ${qualInfo.cls}`} />
              <div className="ac-qual-txt">{qualInfo.text}</div>
            </div>
          )}
        </div>

        <div className="ac-fg">
          <label>Bildstil</label>
          <div className="ac-style-row">
            {(['overlay', 'pure', 'split'] as const).map(s => (
              <button
                key={s}
                className={`ac-style-btn${bgStyle === s ? ' active' : ''}`}
                onClick={() => setBgStyle(s)}
              >
                {s === 'overlay' ? 'Overlay' : s === 'pure' ? 'Bild pur' : 'Split'}
              </button>
            ))}
          </div>
        </div>

        <div className="ac-fg">
          <label>Bildfokus</label>
          <div className="ac-focus-wrap">
            <div
              className="ac-focus-bg"
              style={{
                backgroundImage:    bgUrl ? `url('${bgUrl}')` : undefined,
                backgroundPosition: bgPos,
              }}
            />
            <div className="ac-focus-inner">
              {[0, 1, 2].map(r =>
                [0, 1, 2].map(c => (
                  <div
                    key={`${r}-${c}`}
                    className={`ac-fcell${focusSel[0] === r && focusSel[1] === c ? ' active' : ''}`}
                    onClick={() => { setFocusSel([r, c]); setBgPos(FOCUS_POS[r][c]); }}
                  />
                ))
              )}
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#8a7a67', textAlign: 'center', marginTop: 3 }}>
            Klicke auf den wichtigsten Bildbereich
          </div>
        </div>

        <div className="ac-hr" />

        {/* Farben */}
        <div className="ac-stitle">Farben</div>
        <div style={{ fontSize: 10, color: '#8a7a67', marginBottom: 8 }}>
          Jedes Element hat eine eigene Farbe
        </div>

        <div className="ac-fg">
          <label>Hintergrundfarbe / Overlay</label>
          <div className="ac-ci-row">
            <input
              type="color" value={colors.bg}
              onChange={e => setColors(prev => ({ ...prev, bg: e.target.value }))}
            />
            <span className="ac-hex-lbl">{colors.bg}</span>
          </div>
        </div>

        <div className="ac-color-grid">
          {(
            [
              ['hl',     'Headline'  ],
              ['sub',    'Subline'   ],
              ['logo',   'Logo-Text' ],
              ['ctaTxt', 'CTA Text'  ],
              ['ctaBg',  'CTA Bubble'],
              ['domain', 'Domain'    ],
            ] as [keyof Colors, string][]
          ).map(([key, label]) => (
            <div key={key} className="ac-ci">
              <label>{label}</label>
              <div className="ac-ci-row">
                <input
                  type="color" value={colors[key]}
                  onChange={e => setColors(prev => ({ ...prev, [key]: e.target.value }))}
                />
                <span className="ac-hex-lbl">{colors[key]}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="ac-hr" />

        {/* Animation */}
        <div className="ac-stitle">
          Bewegung{' '}
          <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0, fontSize: 9 }}>
            (alle Formate)
          </span>
        </div>
        <div className="ac-anim-grid">
          {[
            { id: 'cta',  icon: '👆', label: 'CTA-Button' },
            { id: 'qr',   icon: '📱', label: 'QR-Code'    },
            { id: 'hl',   icon: '✏️', label: 'Headline'   },
            { id: 'none', icon: '⏸',  label: 'Statisch'   },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              className={`ac-anim-btn${anim === id ? ' active' : ''}`}
              onClick={() => setAnim(id)}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>
        <div className="ac-anim-tip">{ANIM_TIPS[anim]}</div>

        <div className="ac-hr" />

        {/* Submit */}
        <div className="ac-submit-sec">
          <button className="ac-btn-p" onClick={handleSubmit}>
            ✓ Werbemittel einreichen
          </button>
          <button className="ac-btn-s">
            💾 Link zum Weiterarbeiten senden
          </button>
        </div>

      </div>
      {/* ═══════════════════════════════════════ */}

      {/* ══════════════ CANVAS ══════════════ */}
      <div className="ac-canvas">

        {/* Tabs */}
        <div className="ac-tabs">
          {(['dooh', 'display'] as const).map(t => (
            <button
              key={t}
              className={`ac-tab${activeTab === t ? ' active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t === 'dooh' ? 'DOOH' : 'Display'}
            </button>
          ))}
        </div>

        {/* DOOH */}
        {activeTab === 'dooh' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="sec-label" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#8a7a67', display: 'flex', alignItems: 'center', gap: 10 }}>
              DOOH Formate
              <span style={{ flex: 1, height: 1, background: '#DDD5C8', display: 'block' }} />
            </div>

            {/* Quer 845×475 */}
            <div className="ac-format-card">
              <div className="ac-format-header">
                <div>
                  <div className="ac-format-name">Querformat</div>
                  <div className="ac-format-spec">1920 × 1080 px</div>
                </div>
              </div>
              <AdPreview fmtId="quer" width={845} height={475} {...previewProps} />
            </div>

            {/* Hoch 259×461 */}
            <div className="ac-format-card">
              <div className="ac-format-header">
                <div>
                  <div className="ac-format-name">Hochformat</div>
                  <div className="ac-format-spec">1080 × 1920 px</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                <AdPreview fmtId="hoch" width={259} height={461} {...previewProps} />
              </div>
            </div>
          </div>
        )}

        {/* Display */}
        {activeTab === 'display' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#8a7a67', display: 'flex', alignItems: 'center', gap: 10 }}>
              Display Formate
              <span style={{ flex: 1, height: 1, background: '#DDD5C8', display: 'block' }} />
            </div>

            {/* Billboard 970×250 scaled */}
            <div className="ac-format-card">
              <div className="ac-format-header">
                <div>
                  <div className="ac-format-name">Billboard</div>
                  <div className="ac-format-spec">970 × 250 px</div>
                </div>
              </div>
              <div style={{ overflow: 'hidden', borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,.12)' }}>
                <div style={{ transformOrigin: 'top left', transform: 'scale(0.845)', width: 970, height: 250, position: 'relative' }}>
                  <AdPreview fmtId="wide" width={970} height={250} {...previewProps} />
                </div>
              </div>
              {/* Height placeholder for scaled content: 250 * 0.845 ≈ 211px */}
              <div style={{ height: 211, marginTop: -211, pointerEvents: 'none' }} />
            </div>

            {/* Med 300×250 + Tall 300×600 */}
            <div className="ac-format-card">
              <div className="ac-format-header">
                <div>
                  <div className="ac-format-name">Rectangle &amp; Half Page</div>
                  <div className="ac-format-spec">300 × 250 / 300 × 600 px</div>
                </div>
              </div>
              <div className="display-pair">
                <div className="display-item">
                  <AdPreview fmtId="med" width={300} height={250} {...previewProps} />
                  <div className="dim-lbl">300 × 250 px</div>
                </div>
                <div className="display-item">
                  <AdPreview fmtId="tall" width={300} height={600} {...previewProps} />
                  <div className="dim-lbl">300 × 600 px</div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
      {/* ═══════════════════════════════════ */}

    </div>
  );
}
