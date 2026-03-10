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

// ── Default positions (FIX #7: non-overlapping for each format) ──────────────
const DEF_POS: AllPositions = {
  // Quer 845×475: logo top-left, hl upper-left large, sub mid-left, cta bottom-left, domain+qr bottom-right
  quer: {
    logo:   { top: 4,  left: 3  },
    hl:     { top: 22, left: 3  },
    sub:    { top: 60, left: 3  },
    cta:    { top: 82, left: 3  },
    domain: { top: 85, left: 62 },
    qr:     { top: 78, left: 88 },
  },
  // Hoch 259×461: logo top, hl upper-third, sub middle, cta lower, domain+qr bottom
  hoch: {
    logo:   { top: 3,  left: 6  },
    hl:     { top: 18, left: 6  },
    sub:    { top: 50, left: 6  },
    cta:    { top: 72, left: 6  },
    domain: { top: 87, left: 6  },
    qr:     { top: 82, left: 74 },
  },
  // Wide 970×250: logo left, hl+sub center, cta right — all vertically centered
  wide: {
    logo: { top: 35, left: 2  },
    hl:   { top: 22, left: 18 },
    sub:  { top: 58, left: 18 },
    cta:  { top: 30, left: 80 },
  },
  // Med 300×250: logo top, hl mid, sub upper-mid, cta bottom
  med: {
    logo: { top: 5,  left: 6 },
    hl:   { top: 28, left: 6 },
    sub:  { top: 56, left: 6 },
    cta:  { top: 78, left: 6 },
  },
  // Tall 300×600: logo top, hl upper-third, sub middle, cta lower-third
  tall: {
    logo: { top: 4,  left: 6 },
    hl:   { top: 18, left: 6 },
    sub:  { top: 44, left: 6 },
    cta:  { top: 72, left: 6 },
  },
};

// ── Default font sizes ───────────────────────────────────────────────────────
const DEF_SIZES: AllSizes = {
  quer: { logo: 18, hl: 58, sub: 22, cta: 18, domain: 13, qr: 70 },
  hoch: { logo: 12, hl: 26, sub: 11, cta: 11, domain: 9,  qr: 44 },
  wide: { logo: 14, hl: 22, sub: 13, cta: 14 },
  med:  { logo: 11, hl: 20, sub: 11, cta: 11 },
  tall: { logo: 12, hl: 26, sub: 13, cta: 13 },
};

// ── Resize deltas ────────────────────────────────────────────────────────────
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

// ── FIX #3: simplified suggestion tags ──────────────────────────────────────
function makeSuggestions(org: string, domain: string) {
  return {
    hl: [
      { text: `Willkommen bei ${org}`, tag: 'kurz' },
      { text: `Jetzt ${org} entdecken`, tag: 'einladend' },
      { text: `${org} – echt gut`,      tag: 'prägnant' },
    ],
    sub: [
      { text: domain,                     tag: 'Domain' },
      { text: 'Jetzt online informieren', tag: 'generisch' },
    ],
  };
}

// ── Ad Preview Component ─────────────────────────────────────────────────────

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
  const pos   = positions[fmtId] || DEF_POS[fmtId] || {};
  const sz    = sizes[fmtId]     || DEF_SIZES[fmtId] || {};
  const hasQr = fmtId === 'quer' || fmtId === 'hoch';
  const elD   = RESIZE_DELTA[fmtId] || {};

  const animClass  = anim !== 'none' ? `anim-${anim}` : '';
  const styleClass = bgStyle === 'pure'  ? 'pure-mode'
                   : bgStyle === 'split' ? 'split-mode'
                   : '';

  function isSel(el: string) { return selEl === `${fmtId}:${el}`; }

  function Toolbar({ elId, delta }: { elId: string; delta: number }) {
    return (
      <div className="ac-tb">
        <button className="ac-tb-btn" onMouseDown={e => { e.stopPropagation(); onResize(fmtId, elId, -delta); }}>
          {elId === 'qr' ? '−' : 'A−'}
        </button>
        <div className="ac-tb-sep" />
        <button className="ac-tb-btn" onMouseDown={e => { e.stopPropagation(); onResize(fmtId, elId, delta); }}>
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
          backgroundColor:    colors.bg,
          backgroundImage:    bgUrl ? `url('${bgUrl}')` : undefined,
          backgroundPosition: bgPos,
        }}
      />
      {/* Overlay */}
      <div className="ac-ov" style={{ background: hexRgba(colors.bg, 0.78) }} />
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
          style={{ top: `${pos.logo?.top ?? 4}%`, left: `${pos.logo?.left ?? 3}%` }}
          onMouseDown={e => onElMouseDown(e, fmtId, 'logo')}
        >
          <Toolbar elId="logo" delta={elD.logo ?? 1} />
          {/* FIX #4: no filter on logo image */}
          {logoMode === 'image' && logoUrl ? (
            <img
              className="ac-logo-img"
              src={logoUrl}
              alt=""
              style={{ height: sz.logo ?? 18, filter: 'none' }}
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
            top:      `${pos.hl?.top  ?? 22}%`,
            left:     `${pos.hl?.left ?? 3}%`,
            maxWidth: fmtId === 'quer' ? '58%' : fmtId === 'hoch' ? '82%' : '85%',
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
          style={{ top: `${pos.sub?.top ?? 60}%`, left: `${pos.sub?.left ?? 3}%` }}
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
          style={{ top: `${pos.cta?.top ?? 82}%`, left: `${pos.cta?.left ?? 3}%` }}
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
            style={{ top: `${pos.domain?.top ?? 85}%`, left: `${pos.domain?.left ?? 62}%` }}
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
            style={{ top: `${pos.qr?.top ?? 78}%`, left: `${pos.qr?.left ?? 86}%` }}
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

// ── Main Component ───────────────────────────────────────────────────────────

export default function Step5AdCreator({ briefing, updateBriefing, nextStep }: Props) {
  const ana = briefing.analysis;

  const initDomain = (() => {
    try { return new URL(briefing.url).hostname.replace('www.', ''); } catch { return briefing.url || ''; }
  })();
  const initOrg  = ana?.organisation || '';
  const initSugs = makeSuggestions(initOrg, initDomain);

  // ── Text state ──────────────────────────────────────────────────────────────
  const [org,      setOrg]      = useState(initOrg);
  const [headline, setHeadline] = useState(briefing.adHeadline || initSugs.hl[0]?.text || '');
  const [subline,  setSubline]  = useState(briefing.adSubline  || initSugs.sub[0]?.text || '');
  const [cta,      setCta]      = useState(briefing.adCta      || 'Jetzt reservieren →');
  const [lpUrl,    setLpUrl]    = useState(briefing.url        || '');
  const [crawlUrl, setCrawlUrl] = useState(briefing.url        || '');

  // ── Crawl UI ────────────────────────────────────────────────────────────────
  const [crawlStatus, setCrawlStatus] = useState('');
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [crawlAssets, setCrawlAssets] = useState<{ color: string; logoUrl: string; text: string } | null>(null);

  // ── Suggestions ─────────────────────────────────────────────────────────────
  const [hlSugs,       setHlSugs]       = useState(initSugs.hl);
  const [subSugs,      setSubSugs]      = useState(initSugs.sub);
  const [activeHlSug,  setActiveHlSug]  = useState<number | null>(initOrg ? 0 : null);
  const [activeSubSug, setActiveSubSug] = useState<number | null>(initOrg ? 0 : null);

  // ── Logo ────────────────────────────────────────────────────────────────────
  const [logoMode,  setLogoMode]  = useState<'text' | 'image'>(briefing.adLogoMode || 'image');
  const [logoUrl,   setLogoUrl]   = useState('');
  const [logoThumb, setLogoThumb] = useState('');
  const logoFileRef = useRef<HTMLInputElement>(null);

  // ── Background ──────────────────────────────────────────────────────────────
  const [bgUrl,    setBgUrl]    = useState('');
  const [bgThumb,  setBgThumb]  = useState('');
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
    bg:     briefing.adBgColor     || themeColor,
    hl:     briefing.adTextColor   || '#FFFFFF',
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
  const [selEl, setSelEl] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // FIX #5: on mount, load bg + logo from briefingData/analysis immediately
  useEffect(() => {
    const rawBg   = briefing.adBgImageData  || ana?.ogImage  || '';
    const rawLogo = briefing.adLogoImageData || ana?.ogLogo   || ana?.favicon || '';

    if (rawBg) {
      // Proxy external URLs to avoid CORS
      const bgSrc = rawBg.startsWith('data:') ? rawBg
                  : rawBg.startsWith('http')  ? `/api/proxy-image?url=${encodeURIComponent(rawBg)}`
                  : rawBg;
      setBgUrl(bgSrc);
      setBgThumb(bgSrc);
    }

    if (rawLogo) {
      const logoSrc = rawLogo.startsWith('data:') ? rawLogo
                    : rawLogo.startsWith('http')  ? rawLogo  // favicons are usually small, load directly
                    : rawLogo;
      setLogoUrl(logoSrc);
      setLogoThumb(logoSrc);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Global drag listeners ────────────────────────────────────────────────────
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

  // ── FIX #2: Crawl with immediate fast-path ───────────────────────────────────
  const handleCrawl = async () => {
    const rawUrl = crawlUrl.trim();
    if (!rawUrl) return;

    // Normalise URL
    const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

    // ── Fast-path: extract domain immediately, update state without waiting ──
    let fastDomain = '';
    try { fastDomain = new URL(url).hostname.replace('www.', ''); } catch { fastDomain = rawUrl; }
    const fastOrg     = fastDomain.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const fastLogoUrl = `https://www.google.com/s2/favicons?domain=${fastDomain}&sz=128`;
    const fastSugs    = makeSuggestions(fastOrg, fastDomain);

    setOrg(fastOrg);
    setLpUrl(url);
    setLogoUrl(fastLogoUrl);
    setLogoThumb(fastLogoUrl);
    setLogoMode('image');
    setHlSugs(fastSugs.hl);
    setSubSugs(fastSugs.sub);
    setHeadline(fastSugs.hl[0]?.text || '');
    setSubline(fastSugs.sub[0]?.text || '');
    setActiveHlSug(0);
    setActiveSubSug(0);
    setCrawlAssets({ color: colors.bg, logoUrl: fastLogoUrl, text: `${fastDomain} · Logo geladen` });
    setCrawlStatus(`${fastDomain} geladen`);

    // ── Then try full API analysis in background for richer data ──
    setCrawlLoading(true);
    try {
      const res = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, campaignType: briefing.campaignType }),
      });
      if (!res.ok) throw new Error();
      const data   = await res.json();
      const result = data.analysis || data;
      const newOrg = result.organisation || fastOrg;
      const newLogoUrl = result.ogLogo || result.favicon || fastLogoUrl;
      const newColor   = result.themeColor || colors.bg;
      const newSugs    = makeSuggestions(newOrg, fastDomain);

      setOrg(newOrg);
      setColors(prev => ({ ...prev, bg: newColor }));
      setLogoUrl(newLogoUrl);
      setLogoThumb(newLogoUrl);
      setHlSugs(newSugs.hl);
      setSubSugs(newSugs.sub);
      setHeadline(newSugs.hl[0]?.text || '');
      setSubline(newSugs.sub[0]?.text || '');
      setActiveHlSug(0);
      setActiveSubSug(0);
      if (result.ogImage) {
        const bgSrc = `/api/proxy-image?url=${encodeURIComponent(result.ogImage)}`;
        setBgUrl(bgSrc);
        setBgThumb(bgSrc);
      }
      setCrawlAssets({ color: newColor, logoUrl: newLogoUrl, text: `${fastDomain} · vollständig geladen` });
      setCrawlStatus(`✓ ${fastDomain} analysiert`);
    } catch {
      setCrawlStatus(`✓ ${fastDomain} – URL-Analyse übersprungen`);
    } finally {
      setCrawlLoading(false);
    }
  };

  // ── Logo file ────────────────────────────────────────────────────────────────
  const loadLogoFromFile = (file: File) => {
    const r = new FileReader();
    r.onload = e => {
      const data = e.target?.result as string;
      setLogoUrl(data);
      setLogoThumb(data);
    };
    r.readAsDataURL(file);
  };

  // ── BG image ─────────────────────────────────────────────────────────────────
  const loadBgFromUrl = (url: string) => {
    if (!url) { setBgUrl(''); setBgThumb(''); return; }
    const src = url.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(url)}` : url;
    setBgUrl(src);
    setBgThumb(src);
  };

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
      setBgUrl(data);
      setBgThumb(data);
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

  // ── Shared preview props ─────────────────────────────────────────────────────
  const previewProps = {
    positions, sizes, colors, headline, subline, cta, domain, org,
    bgUrl, logoUrl, logoMode, bgStyle, anim, bgPos, lpUrl,
    selEl,
    onElMouseDown: handleElMouseDown,
    onLayerClick:  handleLayerClick,
    onResize:      handleResize,
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    // FIX #1: grid layout — sidebar left (320px), canvas right (1fr)
    <div className="ad-creator">

      {/* ══════════════════════ SIDEBAR ══════════════════════ */}
      <div className="ac-sidebar">

        {/* Crawl card */}
        <div className="ac-crawl-card" style={{ marginBottom: 4 }}>
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
            <button className="ac-crawl-btn" onClick={handleCrawl} disabled={crawlLoading}>
              {crawlLoading ? '…' : 'Laden'}
            </button>
          </div>
          {crawlStatus && <div className="ac-crawl-status">{crawlStatus}</div>}
          {crawlAssets && (
            <div className="ac-crawl-assets">
              <div className="ac-crawl-chip" style={{ background: crawlAssets.color }} />
              {crawlAssets.logoUrl && <img className="ac-crawl-logo" src={crawlAssets.logoUrl} alt="" />}
              <span className="ac-crawl-txt">{crawlAssets.text}</span>
            </div>
          )}
        </div>

        {/* ── Kampagne ── */}
        <div className="ac-stitle">Kampagne</div>

        <div className="ac-fg">
          <label>Organisation / Marke</label>
          <input type="text" className="ac-inp" value={org} onChange={e => setOrg(e.target.value)} />
        </div>

        {/* Headline */}
        <div className="ac-fg">
          <label>Headline</label>
          {/* FIX #3: clear hint label for chips */}
          <div className="ac-sug-hint">Vorschläge – klicke zum Übernehmen</div>
          <div className="ac-sug-wrap">
            {hlSugs.map((s, i) => (
              <div
                key={i}
                className={`ac-sug-chip${activeHlSug === i ? ' active' : ''}`}
                onClick={() => { setHeadline(s.text); setActiveHlSug(i); }}
              >
                <span>{s.text}</span>
                <span className="ac-sug-tag">{s.tag}</span>
              </div>
            ))}
          </div>
          <input
            type="text"
            className="ac-inp"
            placeholder="Eigene Headline…"
            value={headline}
            onChange={e => { setHeadline(e.target.value); setActiveHlSug(null); }}
          />
        </div>

        {/* Subline */}
        <div className="ac-fg">
          <label>
            Subline{' '}
            <span style={{ fontWeight: 300, fontSize: 10 }}>(optional)</span>
          </label>
          <div className="ac-sug-hint">Vorschläge – klicke zum Übernehmen</div>
          <div className="ac-sug-wrap">
            {subSugs.map((s, i) => (
              <div
                key={i}
                className={`ac-sug-chip${activeSubSug === i ? ' active' : ''}`}
                onClick={() => { setSubline(s.text); setActiveSubSug(i); }}
              >
                <span>{s.text}</span>
                <span className="ac-sug-tag">{s.tag}</span>
              </div>
            ))}
          </div>
          <input
            type="text"
            className="ac-inp"
            placeholder="Eigene Subline…"
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

        {/* ── Logo ── */}
        <div className="ac-stitle">Logo</div>

        <div className="ac-logo-mode" style={{ marginBottom: 8 }}>
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
          <div className="ac-fg">
            <label>Text</label>
            <input type="text" className="ac-inp" value={org} onChange={e => setOrg(e.target.value)} />
          </div>
        )}

        {logoMode === 'image' && (
          <div className="ac-fg">
            {/* FIX #4: sidebar thumb shown at full color, no filter */}
            {logoThumb && (
              <img
                className="ac-img-thumb"
                src={logoThumb}
                alt=""
                style={{ filter: 'none', background: '#f0f0f0', objectFit: 'contain' }}
              />
            )}
            <div className="ac-img-row">
              <input
                type="url"
                className="ac-img-inp"
                placeholder="https://… (auto befüllt)"
                value={logoUrl}
                onChange={e => { setLogoUrl(e.target.value); setLogoThumb(e.target.value); }}
              />
              <label className="ac-img-upload">
                📁
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && loadLogoFromFile(e.target.files[0])}
                />
              </label>
            </div>
          </div>
        )}

        {/* ── Hintergrundbild ── */}
        <div className="ac-stitle">Hintergrundbild</div>

        <div className="ac-fg">
          {bgThumb && <img className="ac-img-thumb" src={bgThumb} alt="" />}
          <div className="ac-img-row">
            <input
              type="url"
              className="ac-img-inp"
              placeholder="https://… (auto befüllt)"
              value={bgUrl.startsWith('/api/proxy') ? '' : bgUrl}
              onChange={e => loadBgFromUrl(e.target.value)}
            />
            <label className="ac-img-upload">
              📁
              <input
                ref={bgFileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
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
          <div style={{ fontSize: 10, color: '#a8a096', textAlign: 'center', marginTop: 3 }}>
            Klicke auf den wichtigsten Bildbereich
          </div>
        </div>

        {/* ── Farben ── */}
        {/* FIX #6: 2-col color grid with BG on full width first */}
        <div className="ac-stitle">Farben</div>

        <div className="ac-fg">
          <label>Hintergrundfarbe / Overlay</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="color"
              value={colors.bg}
              style={{ width: 36, height: 36, border: '1px solid #DDD5C8', borderRadius: 6, padding: 2, cursor: 'pointer', background: 'none' }}
              onChange={e => setColors(prev => ({ ...prev, bg: e.target.value }))}
            />
            <span className="ac-hex-lbl" style={{ fontSize: 11 }}>{colors.bg}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 10 }}>
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
            <div key={key}>
              <div style={{ fontSize: 10, fontWeight: 500, color: '#8a7a67', marginBottom: 3 }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <input
                  type="color"
                  value={colors[key]}
                  style={{ width: 28, height: 28, border: '1px solid #DDD5C8', borderRadius: 5, padding: 2, cursor: 'pointer', background: 'none' }}
                  onChange={e => setColors(prev => ({ ...prev, [key]: e.target.value }))}
                />
                <span style={{ fontSize: 9, color: '#a8a096' }}>{colors[key]}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Animation ── */}
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
        <div className="ac-anim-tip" style={{ marginTop: 6 }}>{ANIM_TIPS[anim]}</div>

        {/* ── Submit ── */}
        <div className="ac-submit-sec" style={{ marginTop: 'auto', paddingTop: 16 }}>
          <button className="ac-btn-p" onClick={handleSubmit}>
            ✓ Werbemittel einreichen
          </button>
          <button className="ac-btn-s">
            💾 Link zum Weiterarbeiten senden
          </button>
        </div>

      </div>
      {/* ══════════════════════════════════════════════════════ */}

      {/* ══════════════════════ CANVAS ══════════════════════ */}
      <div className="ac-canvas">

        {/* FIX #3: clean tab header only, no section labels below */}
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

            {/* Quer 845×475 */}
            <div className="ac-format-card">
              <div className="ac-format-header">
                <div>
                  <div className="ac-format-name">Querformat</div>
                  <div className="ac-format-spec">1920 × 1080 px · skaliert 845 × 475</div>
                </div>
              </div>
              <AdPreview fmtId="quer" width={845} height={475} {...previewProps} />
            </div>

            {/* Hoch 259×461 */}
            <div className="ac-format-card">
              <div className="ac-format-header">
                <div>
                  <div className="ac-format-name">Hochformat</div>
                  <div className="ac-format-spec">1080 × 1920 px · skaliert 259 × 461</div>
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

            {/* Billboard 970×250 scaled via transform:scale(0.845) */}
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
              {/* Placeholder: 250 × 0.845 = 211px */}
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
      {/* ═══════════════════════════════════════════════════ */}

    </div>
  );
}
