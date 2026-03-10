'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BriefingData } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ElPos = { left: number; top: number };                // %
type FormatPositions = Record<string, ElPos>;
type FormatSizes     = Record<string, number>;             // px (or box-size for qr)
type AllPositions    = Record<string, FormatPositions>;
type AllSizes        = Record<string, FormatSizes>;
type SelMap          = Record<string, string | null>;
type BgStyle         = 'overlay' | 'pure' | 'split';
type AnimType        = 'cta' | 'qr' | 'hl' | 'none';
type LogoMode        = 'text' | 'bild';

interface Props {
  briefing: BriefingData;
  updateBriefing: (d: Partial<BriefingData>) => void;
  nextStep: () => void;
  isActive: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TC   = '#C1666B';
const TAUP = '#5C4F3D';
const CRM  = '#FAF7F2';
const BDR  = '#DDD5C8';
const TXT  = '#2C2416';
const MUT  = '#8a7a67';
const GRN  = '#4CAF7D';
const YLW  = '#E8A838';
const RED  = '#E05252';

const FONTS = [
  { id: 'fraunces', label: 'Fraunces', sub: 'Elegant',  css: "'Fraunces',serif",       italic: true  },
  { id: 'outfit',   label: 'Outfit',   sub: 'Modern',   css: "'Outfit',sans-serif",    italic: false },
  { id: 'playfair', label: 'Playfair', sub: 'Klassisch', css: "'Playfair Display',serif", italic: true },
  { id: 'inter',    label: 'Inter',    sub: 'Corporate', css: "'Inter',sans-serif",     italic: false },
] as const;
type FontId = (typeof FONTS)[number]['id'];

const ANIM_OPTIONS = [
  { id: 'cta'  as AnimType, ico: '👆', label: 'CTA-Button' },
  { id: 'qr'   as AnimType, ico: '📱', label: 'QR-Code'    },
  { id: 'hl'   as AnimType, ico: '✏️', label: 'Headline'   },
  { id: 'none' as AnimType, ico: '⏸',  label: 'Statisch'   },
] as const;

const ANIM_TIPS: Record<AnimType, string> = {
  cta:  '✓ CTA pulsiert sanft – zieht Blicke an',
  qr:   '✓ QR-Code blendet ein und aus',
  hl:   '✓ Headline gleitet von links ein',
  none: '⏸ Alle Elemente statisch',
};

const BS_DESCS: Record<BgStyle, string> = {
  overlay: 'Farbige Schicht über dem Bild – Texte gut lesbar',
  pure:    'Volles Bild ohne Overlay – maximale Bildwirkung',
  split:   'Links Farbe, rechts Bild – strukturiertes Layout',
};

const FOCUS_POS = [
  ['0% 0%',  '50% 0%',  '100% 0%' ],
  ['0% 50%', '50% 50%', '100% 50%'],
  ['0% 100%','50% 100%','100% 100%'],
];

// Default element positions (left%, top%)
const DEF_POS: AllPositions = {
  quer: { logo: {left:5,top:5}, hl: {left:5,top:32}, sub: {left:5,top:58}, cta: {left:5,top:86}, domain: {left:72,top:86}, qr: {left:88,top:85} },
  hoch: { logo: {left:7,top:5}, hl: {left:7,top:26}, sub: {left:7,top:52}, cta: {left:7,top:79}, domain: {left:7,top:89}, qr:  {left:82,top:90} },
  wide: { logo: {left:2,top:36}, hl: {left:22,top:36}, cta: {left:82,top:36} },
  med:  { logo: {left:6,top:6}, hl: {left:6,top:30}, cta: {left:6,top:84}, qr: {left:82,top:84} },
  tall: { logo: {left:6,top:5}, hl: {left:6,top:22}, sub: {left:6,top:48}, cta: {left:6,top:79}, qr: {left:82,top:88} },
};

// Default element font sizes (px). QR = box dimension.
const DEF_SIZES: AllSizes = {
  quer: { logo:14, hl:32, sub:13, cta:12, domain:10, qr:40 },
  hoch: { logo:10, hl:16, sub:9,  cta:9,  domain:8,  qr:26 },
  wide: { logo:10, hl:12,         cta:10                    },
  med:  { logo:9,  hl:14,         cta:9,               qr:22 },
  tall: { logo:8,  hl:12, sub:8,  cta:8,               qr:18 },
};

// Resize delta per format+element
const RESIZE_DELTA: Record<string, Record<string, number>> = {
  quer: { logo:2, hl:2, sub:1, cta:1, domain:1, qr:4 },
  hoch: { logo:1, hl:1, sub:1, cta:1, domain:1, qr:3 },
  wide: { logo:1, hl:1, cta:1 },
  med:  { logo:1, hl:1, cta:1, qr:2 },
  tall: { logo:1, hl:1, sub:1, cta:1, qr:2 },
};

// Elements per format (order matters for rendering)
const FORMAT_ELS: Record<string, string[]> = {
  quer: ['logo','hl','sub','cta','domain','qr'],
  hoch: ['logo','hl','sub','cta','domain','qr'],
  wide: ['logo','hl','cta'],
  med:  ['logo','hl','cta','qr'],
  tall: ['logo','hl','sub','cta','qr'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

function deepCopy<T>(o: T): T { return JSON.parse(JSON.stringify(o)); }

function qualityInfo(w: number, h: number): { cls: string; label: string } {
  if (w >= 1920 && h >= 1080) return { cls: 'qg', label: `Top (${w} × ${h} px)` };
  if (w >= 1200)               return { cls: 'qw', label: `Könnte unscharf (${w} × ${h} px)` };
  return                              { cls: 'qb', label: `Zu klein für DOOH (${w} × ${h} px)` };
}

// ─── AdEl: one draggable element ─────────────────────────────────────────────

interface AdElProps {
  fmtId:    string;
  elId:     string;
  pos:      ElPos;
  size:     number;
  sel:      boolean;
  dragging: boolean;
  delta:    number;
  onSelect: (fmtId: string, elId: string) => void;
  onResize: (fmtId: string, elId: string, delta: number) => void;
  onDragStart: (fmtId: string, elId: string, e: React.MouseEvent) => void;
  // content
  headline:  string;
  subline:   string;
  ctaText:   string;
  logoText:  string;
  logoMode:  LogoMode;
  logoImgSrc: string | null;
  domainTxt: string;
  fontCss:   string;
  textColor: string;
  ctaColor:  string;
}

function AdEl(p: AdElProps) {
  const { fmtId, elId, pos, size, sel, dragging, delta } = p;

  const tbBtn = (sign: number) => (
    <button
      className="ac-tb-btn"
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); p.onResize(fmtId, elId, sign * delta); }}
    >
      {sign > 0 ? 'A+' : 'A−'}
    </button>
  );

  const toolbar = (
    <div className="ac-tb">
      {tbBtn(-1)}<div className="ac-tb-sep"/>{tbBtn(1)}
    </div>
  );

  let content: React.ReactNode = null;

  if (elId === 'logo') {
    if (p.logoMode === 'bild' && p.logoImgSrc) {
      content = <img className="ac-logo-img" src={p.logoImgSrc} alt="Logo" style={{ fontSize: size }} />;
    } else {
      content = <div className="ac-logo-txt" style={{ fontFamily: p.fontCss, fontSize: size, color: p.textColor }}>{p.logoText}</div>;
    }
  } else if (elId === 'hl') {
    content = <div className="ac-hl" style={{ fontFamily: p.fontCss, fontSize: size, color: p.textColor }}>{p.headline}</div>;
  } else if (elId === 'sub') {
    content = <div className="ac-sub" style={{ fontSize: size, color: hexRgba(p.textColor, 0.72) }}>{p.subline}</div>;
  } else if (elId === 'cta') {
    content = <div className="ac-cta" style={{ fontSize: size, color: p.ctaColor }}>{p.ctaText}</div>;
  } else if (elId === 'domain') {
    content = <div className="ac-domain" style={{ fontSize: size }}>{p.domainTxt}</div>;
  } else if (elId === 'qr') {
    content = <div className="ac-qr" style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}>⬛</div>;
  }

  return (
    <div
      className={`ac-el${sel ? ' sel' : ''}${dragging ? ' dragging' : ''}`}
      style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
      onMouseDown={e => {
        if ((e.target as HTMLElement).closest('.ac-tb')) return;
        p.onSelect(fmtId, elId);
        p.onDragStart(fmtId, elId, e);
      }}
    >
      {toolbar}
      {content}
    </div>
  );
}

// ─── AdFormat: one ad preview with all its elements ──────────────────────────

interface AdFormatProps {
  fmtId:      string;
  positions:  FormatPositions;
  sizes:      FormatSizes;
  selected:   string | null;
  draggingEl: string | null;
  headline:   string;
  subline:    string;
  ctaText:    string;
  logoText:   string;
  logoMode:   LogoMode;
  logoImgSrc: string | null;
  domainTxt:  string;
  fontCss:    string;
  textColor:  string;
  ctaColor:   string;
  mainColor:  string;
  bgDataUrl:  string | null;
  focusPos:   string;
  bgStyle:    BgStyle;
  animation:  AnimType;
  layerRef:   (el: HTMLDivElement | null) => void;
  onSelect:   (fmtId: string, elId: string) => void;
  onDeselect: (fmtId: string) => void;
  onResize:   (fmtId: string, elId: string, delta: number) => void;
  onDragStart:(fmtId: string, elId: string, e: React.MouseEvent) => void;
}

function AdFormat(p: AdFormatProps) {
  const els = FORMAT_ELS[p.fmtId] || [];
  const animClass = p.animation !== 'none' ? ` anim-${p.animation}` : '';
  const styleClass = `${p.bgStyle}-mode`;

  const bgStyle: React.CSSProperties = p.bgDataUrl
    ? { backgroundImage: `url('${p.bgDataUrl}')`, backgroundPosition: p.focusPos }
    : { background: `linear-gradient(135deg,${p.mainColor} 0%,${TAUP} 100%)` };

  const ovColor = hexRgba(p.mainColor, 0.82);

  return (
    <div className={`ac-ad ac-${p.fmtId}${animClass} ${styleClass}`}>
      <div className="ac-bg"  style={bgStyle} />
      <div className="ac-ov"  style={{ background: ovColor }} />
      <div className="ac-sc"  style={{ background: p.mainColor }} />
      <div
        className="ac-dl"
        ref={p.layerRef}
        onMouseDown={e => { if (e.target === e.currentTarget) p.onDeselect(p.fmtId); }}
      >
        {els.map(elId => (
          <AdEl
            key={elId}
            fmtId={p.fmtId}
            elId={elId}
            pos={p.positions[elId] || { left: 5, top: 10 }}
            size={p.sizes[elId] || 12}
            sel={p.selected === elId}
            dragging={p.selected === elId && p.draggingEl === elId}
            delta={RESIZE_DELTA[p.fmtId]?.[elId] ?? 1}
            onSelect={p.onSelect}
            onResize={p.onResize}
            onDragStart={p.onDragStart}
            headline={p.headline}
            subline={p.subline}
            ctaText={p.ctaText}
            logoText={p.logoText}
            logoMode={p.logoMode}
            logoImgSrc={p.logoImgSrc}
            domainTxt={p.domainTxt}
            fontCss={p.fontCss}
            textColor={p.textColor}
            ctaColor={p.ctaColor}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Step5AdCreator({ briefing, updateBriefing, nextStep }: Props) {
  const analysis   = briefing.analysis;
  const ogImageUrl = analysis?.ogImage  || '';
  const ogLogoUrl  = analysis?.ogLogo   || analysis?.favicon || '';
  const themeColor = analysis?.themeColor || TC;
  const orgName    = analysis?.organisation || '';

  // ── Option selection (upload / später / erstellen) ──
  const initOpt = (): 'upload' | 'später' | 'erstellen' | null => {
    const svc = briefing.werbemittelService;
    if (svc === 'upload' || svc === 'später' || svc === 'erstellen') return svc;
    return null;
  };
  const [selOption, setSelOption]   = useState<'upload' | 'später' | 'erstellen' | null>(initOpt);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [dropOver,   setDropOver]   = useState(false);

  // ── Ad creator state ──
  const [activeTab,  setActiveTab]  = useState<'dooh' | 'display'>('dooh');
  const [headline,   setHeadline]   = useState(briefing.adHeadline || '');
  const [subline,    setSubline]    = useState(briefing.adSubline  || '');
  const [ctaText,    setCtaText]    = useState(briefing.adCta      || 'Jetzt informieren');
  const [urlText,    setUrlText]    = useState(briefing.url        || '');
  const [logoMode,   setLogoMode]   = useState<LogoMode>(briefing.adLogoMode === 'image' ? 'bild' : 'text');
  const [logoTxt,    setLogoTxt]    = useState(orgName);
  const [font,       setFont]       = useState<FontId>((briefing.adFont as FontId) || 'fraunces');
  const [mainColor,  setMainColor]  = useState(briefing.adBgColor    || themeColor || TC);
  const [textColor,  setTextColor]  = useState(briefing.adTextColor  || '#FFFFFF');
  const [ctaColor,   setCtaColor]   = useState(briefing.adAccentColor || TAUP);
  const [bgDataUrl,  setBgDataUrl]  = useState<string | null>(briefing.adBgImageData || null);
  const [bgQual,     setBgQual]     = useState<{cls:string;label:string}|null>(null);
  const [logoImgSrc, setLogoImgSrc] = useState<string | null>(briefing.adLogoImageData || null);
  const [focusRow,   setFocusRow]   = useState(briefing.adFocusY ?? 1);
  const [focusCol,   setFocusCol]   = useState(briefing.adFocusX ?? 1);
  const [bgStyle,    setBgStyle]    = useState<BgStyle>((briefing.adBgStyle as BgStyle) || 'overlay');
  const [animation,  setAnimation]  = useState<AnimType>((briefing.adAnimation as AnimType) || 'cta');

  // ── KI headlines ──
  const [kiSugs,   setKiSugs]   = useState<string[]>([]);
  const [kiLoading,setKiLoading]= useState(false);

  // ── Save link ──
  const [linkEmail,  setLinkEmail]  = useState(briefing.email || '');
  const [linkStatus, setLinkStatus] = useState<'idle'|'loading'|'sent'|'error'>('idle');

  // ── Submitting ──
  const [submitting, setSubmitting] = useState(false);

  // ── Per-format drag & drop positions ──
  const [positions, setPositions] = useState<AllPositions>(() => {
    const saved = briefing.adPositionsQuer;
    if (saved) {
      return {
        quer: (briefing.adPositionsQuer as unknown as FormatPositions) || deepCopy(DEF_POS.quer),
        hoch: (briefing.adPositionsHoch as unknown as FormatPositions) || deepCopy(DEF_POS.hoch),
        wide: deepCopy(DEF_POS.wide),
        med:  deepCopy(DEF_POS.med),
        tall: deepCopy(DEF_POS.tall),
      };
    }
    return deepCopy(DEF_POS);
  });

  // ── Per-format element sizes ──
  const [sizes, setSizes] = useState<AllSizes>(deepCopy(DEF_SIZES));

  // ── Selected element per format ──
  const [selected,   setSelected]   = useState<SelMap>({ quer:null, hoch:null, wide:null, med:null, tall:null });
  const [draggingEl, setDraggingEl] = useState<string | null>(null);

  // ── Drag state ref ──
  const dragRef = useRef<{
    fmtId: string; elId: string;
    startPos: ElPos; startMouse: { x: number; y: number };
    layerEl: HTMLElement;
  } | null>(null);

  // ── Layer refs ──
  const layerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  function setLayerRef(fmtId: string) {
    return (el: HTMLDivElement | null) => { layerRefs.current[fmtId] = el; };
  }

  // ── Global drag listeners ──
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const { fmtId, elId, startPos, startMouse, layerEl } = dragRef.current;
      const rect = layerEl.getBoundingClientRect();
      const dx = ((e.clientX - startMouse.x) / rect.width)  * 100;
      const dy = ((e.clientY - startMouse.y) / rect.height) * 100;
      setPositions(prev => ({
        ...prev,
        [fmtId]: {
          ...prev[fmtId],
          [elId]: {
            left: Math.max(0, Math.min(90, startPos.left + dx)),
            top:  Math.max(0, Math.min(90, startPos.top  + dy)),
          },
        },
      }));
    }
    function onUp() {
      dragRef.current = null;
      setDraggingEl(null);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, []);

  // ── Load fonts ──
  useEffect(() => {
    if (document.getElementById('vio-v9-fonts')) return;
    const link = document.createElement('link');
    link.id   = 'vio-v9-fonts';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300&family=Outfit:wght@300;400;500;600&family=Playfair+Display:wght@400;600&family=Inter:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);

  // ── Load bg image via proxy ──
  useEffect(() => {
    if (bgDataUrl || !ogImageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d'); if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      try { setBgDataUrl(c.toDataURL('image/jpeg', 0.85)); } catch { /* cross-origin */ }
    };
    img.src = `/api/proxy-image?url=${encodeURIComponent(ogImageUrl)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ogImageUrl]);

  // ── Load logo image via proxy ──
  useEffect(() => {
    if (logoImgSrc || !ogLogoUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d'); if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      try { setLogoImgSrc(c.toDataURL('image/png')); setLogoMode('bild'); } catch { /* cross-origin */ }
    };
    img.src = `/api/proxy-image?url=${encodeURIComponent(ogLogoUrl)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ogLogoUrl]);

  // ── Fetch KI headlines ──
  useEffect(() => {
    if (selOption !== 'erstellen' || kiSugs.length > 0) return;
    setKiLoading(true);
    fetch('/api/generate-headlines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organisation: orgName, beschreibung: analysis?.beschreibung, url: briefing.url }),
    })
      .then(r => r.json())
      .then(d => { if (d.headlines?.length) setKiSugs(d.headlines); })
      .catch(() => {})
      .finally(() => setKiLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selOption]);

  // ── Drag handlers ──
  const handleDragStart = useCallback((fmtId: string, elId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const layerEl = layerRefs.current[fmtId];
    if (!layerEl) return;
    const startPos = positions[fmtId]?.[elId] || { left: 5, top: 5 };
    dragRef.current = { fmtId, elId, startPos: { ...startPos }, startMouse: { x: e.clientX, y: e.clientY }, layerEl };
    setDraggingEl(elId);
  }, [positions]);

  const handleSelect = useCallback((fmtId: string, elId: string) => {
    setSelected(prev => {
      const next: SelMap = {};
      Object.keys(prev).forEach(k => { next[k] = k === fmtId ? elId : null; });
      return next;
    });
  }, []);

  const handleDeselect = useCallback((fmtId: string) => {
    setSelected(prev => ({ ...prev, [fmtId]: null }));
  }, []);

  const handleResize = useCallback((fmtId: string, elId: string, delta: number) => {
    setSizes(prev => ({
      ...prev,
      [fmtId]: { ...prev[fmtId], [elId]: Math.max(6, Math.min(80, (prev[fmtId][elId] || 12) + delta)) },
    }));
  }, []);

  // ── Bg image upload ──
  function loadBgFile(file: File) {
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setBgDataUrl(url);
        setBgQual(qualityInfo(img.naturalWidth, img.naturalHeight));
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  }

  // ── Send resume link ──
  async function handleSendLink() {
    if (!linkEmail.trim()) return;
    setLinkStatus('loading');
    try {
      await fetch('/api/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: briefing.sessionId, dealId: briefing.dealId, email: linkEmail.trim(), sendResumeEmail: true }),
      });
      setLinkStatus('sent');
    } catch { setLinkStatus('error'); }
  }

  // ── Submit (erstellen) ──
  async function handleWeiter() {
    setSubmitting(true);
    updateBriefing({
      werbemittel: 'erstellen', werbemittelErstellt: true, werbemittelService: 'erstellen',
      adHeadline: headline, adSubline: subline, adCta: ctaText,
      adBgStyle: bgStyle as 'overlay'|'pure'|'split',
      adBgColor: mainColor, adTextColor: textColor, adAccentColor: ctaColor,
      adLogoMode: logoMode === 'bild' ? 'image' : 'text',
      adFont: font, adFocusX: focusCol, adFocusY: focusRow,
      adAnimation: animation,
      adBgImageData:   bgDataUrl   || undefined,
      adLogoImageData: logoImgSrc  || undefined,
      adPositionsQuer: positions.quer as unknown as Record<string, { x: number; y: number }>,
      adPositionsHoch: positions.hoch as unknown as Record<string, { x: number; y: number }>,
    });
    try {
      await fetch('/api/generate-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: briefing.dealId, adConfig: { headline, subline, ctaText, font, mainColor, textColor, ctaColor, bgStyle, animation } }),
      });
    } catch { /* non-fatal */ }
    setSubmitting(false);
    nextStep();
  }

  function handleUploadWeiter() {
    updateBriefing({ werbemittel: 'upload', werbemittelErstellt: true, werbemittelService: 'upload', werbemittelFiles: uploadFiles.map(f => f.name) });
    nextStep();
  }

  function handleSpäterWeiter() {
    updateBriefing({ werbemittel: 'spaeter', werbemittelErstellt: false, werbemittelService: 'später' });
    nextStep();
  }

  // ── Derived ──
  const fontCss   = FONTS.find(f => f.id === font)?.css ?? FONTS[0].css;
  const focusPos  = FOCUS_POS[focusRow]?.[focusCol] ?? '50% 50%';
  const domainTxt = urlText.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Shared format props
  const fmtShared = {
    headline, subline, ctaText, logoText: logoTxt, logoMode,
    logoImgSrc, domainTxt, fontCss, textColor, ctaColor,
    mainColor, bgDataUrl, focusPos, bgStyle, animation,
    onSelect: handleSelect, onDeselect: handleDeselect,
    onResize: handleResize, onDragStart: handleDragStart,
  };

  function fmtProps(id: string) {
    return {
      ...fmtShared,
      fmtId:      id,
      positions:  positions[id] || DEF_POS[id],
      sizes:      sizes[id]     || DEF_SIZES[id],
      selected:   selected[id] ?? null,
      draggingEl: draggingEl,
      layerRef:   setLayerRef(id),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  const optionCards = [
    { id: 'upload'    as const, ico: '📤', title: 'Eigene Werbemittel hochladen', desc: 'JPEG, PNG oder MP4.' },
    { id: 'später'    as const, ico: '⏳', title: 'Später hochladen',             desc: 'Nach Buchung einreichen.' },
    { id: 'erstellen' as const, ico: '✏️', title: 'Im Browser erstellen',         desc: 'Inkl. VIO-Erstellung.', badge: '+CHF 500' },
  ];

  return (
    <div>
      {/* Step header */}
      <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(22px,3vw,28px)', fontWeight: 700, color: TAUP, marginBottom: 8 }}>Werbemittel</h2>
      <p style={{ fontSize: 14, color: MUT, marginBottom: 20 }}>Wie möchten Sie Ihre Werbemittel bereitstellen?</p>

      {/* Option cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {optionCards.map(opt => (
          <button key={opt.id} onClick={() => setSelOption(opt.id)}
            style={{ border: `2px solid ${selOption === opt.id ? TC : BDR}`, borderRadius: 12, padding: '16px 14px', background: selOption === opt.id ? '#FDF3F3' : '#fff', cursor: 'pointer', textAlign: 'left', position: 'relative', transition: 'all .15s', fontFamily: 'inherit' }}>
            {opt.badge && <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700, color: '#fff', background: TC, borderRadius: 20, padding: '2px 7px' }}>{opt.badge}</span>}
            <div style={{ fontSize: 22, marginBottom: 6 }}>{opt.ico}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TAUP, marginBottom: 4 }}>{opt.title}</div>
            <div style={{ fontSize: 12, color: MUT, lineHeight: 1.4 }}>{opt.desc}</div>
          </button>
        ))}
      </div>

      {/* ── Option A: Upload ── */}
      {selOption === 'upload' && (
        <div>
          <div onDragOver={e => { e.preventDefault(); setDropOver(true); }} onDragLeave={() => setDropOver(false)}
            onDrop={e => { e.preventDefault(); setDropOver(false); const fs = Array.from(e.dataTransfer.files).filter(f => /image\/(jpeg|png)|video\/mp4/.test(f.type)); setUploadFiles(p => [...p, ...fs]); }}
            onClick={() => document.getElementById('vio-upload-files')?.click()}
            style={{ border: `2px dashed ${dropOver ? TC : BDR}`, borderRadius: 12, padding: '36px', textAlign: 'center', background: dropOver ? '#FDF3F3' : CRM, cursor: 'pointer', marginBottom: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TAUP, marginBottom: 4 }}>Dateien hierher ziehen oder klicken</div>
            <div style={{ fontSize: 12, color: MUT }}>JPEG · PNG · MP4 · max. 50 MB</div>
            <input id="vio-upload-files" type="file" multiple accept="image/jpeg,image/png,video/mp4" style={{ display: 'none' }}
              onChange={e => setUploadFiles(p => [...p, ...Array.from(e.target.files || [])])} />
          </div>
          {uploadFiles.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', border: `1px solid ${BDR}`, borderRadius: 8, marginBottom: 6 }}>
              <span>📄</span><span style={{ flex: 1, fontSize: 13, color: TAUP }}>{f.name}</span>
              <button onClick={() => setUploadFiles(p => p.filter((_,j)=>j!==i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUT, fontSize: 18 }}>×</button>
            </div>
          ))}
          <button onClick={handleUploadWeiter} disabled={uploadFiles.length === 0}
            style={{ width: '100%', padding: 13, borderRadius: 10, background: uploadFiles.length === 0 ? BDR : TC, color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: uploadFiles.length === 0 ? 'not-allowed' : 'pointer', marginTop: 8 }}>
            Weiter mit hochgeladenen Werbemitteln →
          </button>
        </div>
      )}

      {/* ── Option B: Später ── */}
      {selOption === 'später' && (
        <div style={{ background: '#FFFBF0', border: '1px solid #F5D87A', borderRadius: 12, padding: '24px' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: TAUP, marginBottom: 8 }}>Werbemittel nach Buchung einreichen</div>
          <p style={{ fontSize: 13, color: MUT, lineHeight: 1.6, marginBottom: 20 }}>Sie erhalten nach der Buchung eine E-Mail mit allen Anforderungen. Werbemittel können bis 5 Werktage vor Kampagnenstart eingereicht werden.</p>
          <button onClick={handleSpäterWeiter} style={{ padding: '11px 24px', borderRadius: 10, background: TC, color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Weiter ohne Werbemittel →
          </button>
        </div>
      )}

      {/* ── Option C: Erstellen (V9 Ad Creator) ── */}
      {selOption === 'erstellen' && (
        <div className="ad-creator" style={{ display: 'flex', gap: 0, border: `1px solid ${BDR}`, borderRadius: 14, overflow: 'hidden', minHeight: 600 }}>

          {/* ══ SIDEBAR ══ */}
          <div className="ac-sidebar">

            {/* Auto-loaded badge */}
            {(bgDataUrl || logoImgSrc) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#F0FFF6', border: '1px solid #B8E8CC', borderRadius: 7, padding: '7px 11px', fontSize: 11, color: '#2E7D52' }}>
                <div style={{ width: 6, height: 6, background: GRN, borderRadius: '50%', flexShrink: 0 }} />
                Farben, Logo und Bild von Website geladen
              </div>
            )}

            {/* Headline */}
            <div className="ac-sec">
              <div className="ac-lbl">Headline wählen</div>
              {kiLoading && <div style={{ fontSize: 12, color: MUT, fontStyle: 'italic' }}>Generiere Vorschläge…</div>}
              {kiSugs.map((s, i) => (
                <div key={i} className={`ac-hl-opt${headline === s ? ' active' : ''}`} onClick={() => setHeadline(s)}>
                  <span className="ac-hl-txt">{s}</span>
                  <span className="ac-hl-wc">{s.trim().split(/\s+/).length} W.</span>
                  <span className="ac-hl-chk">✓</span>
                </div>
              ))}
              <input className="ac-inp" type="text" placeholder="Eigene Headline…" value={kiSugs.includes(headline) ? '' : headline}
                onChange={e => { setHeadline(e.target.value); }} />
            </div>

            {/* Subline */}
            <div className="ac-sec">
              <div className="ac-lbl">Subline <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
              <input className="ac-inp" type="text" value={subline} onChange={e => setSubline(e.target.value)} placeholder="z.B. Baden, Luzernstr. 6" />
            </div>

            {/* CTA */}
            <div className="ac-sec">
              <div className="ac-lbl">CTA-Button Text</div>
              <input className="ac-inp" type="text" value={ctaText} onChange={e => setCtaText(e.target.value)} />
            </div>

            {/* URL */}
            <div className="ac-sec">
              <div className="ac-lbl">Landingpage URL <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0, fontSize: 9 }}>(QR Code)</span></div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="ac-inp" type="text" value={urlText} onChange={e => setUrlText(e.target.value)} style={{ flex: 1 }} />
                <span className="ac-url-badge" style={{ color: urlText.trim() ? GRN : RED }}>{urlText.trim() ? 'QR ✓' : 'QR –'}</span>
              </div>
            </div>

            <div className="ac-hr" />

            {/* Logo */}
            <div className="ac-sec">
              <div className="ac-lbl">Logo</div>
              <div className="ac-toggle">
                <button className={`ac-tog${logoMode === 'text' ? ' active' : ''}`} onClick={() => setLogoMode('text')}>Text</button>
                <button className={`ac-tog${logoMode === 'bild' ? ' active' : ''}`} onClick={() => setLogoMode('bild')}>Bild</button>
              </div>
              {logoMode === 'text' && (
                <input className="ac-inp" type="text" value={logoTxt} onChange={e => setLogoTxt(e.target.value)} placeholder="z.B. Restaurant Lemon" />
              )}
              {logoMode === 'bild' && logoImgSrc && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: CRM, border: `1px solid ${BDR}`, borderRadius: 7, padding: '8px 10px' }}>
                  <img src={logoImgSrc} alt="Logo" style={{ height: 26, width: 'auto', maxWidth: 64, objectFit: 'contain', borderRadius: 3 }} />
                  <div>
                    <div style={{ fontSize: 11, color: GRN, fontWeight: 500 }}>✓ Von Website geladen</div>
                    <div style={{ fontSize: 10, color: MUT }}>{domainTxt}</div>
                  </div>
                  <label style={{ marginLeft: 'auto', fontSize: 11, color: MUT, cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>
                    ersetzen
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { if (e.target.files?.[0]) { const r = new FileReader(); r.onload = ev => { setLogoImgSrc(ev.target?.result as string); setLogoMode('bild'); }; r.readAsDataURL(e.target.files[0]); }}} />
                  </label>
                </div>
              )}
              {logoMode === 'bild' && !logoImgSrc && (
                <label className="ac-upload" style={{ cursor: 'pointer' }}>
                  <span style={{ fontSize: 14 }}>🖼️ Logo hochladen</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.[0]) { const r = new FileReader(); r.onload = ev => { setLogoImgSrc(ev.target?.result as string); }; r.readAsDataURL(e.target.files[0]); }}} />
                </label>
              )}
            </div>

            <div className="ac-hr" />

            {/* Font */}
            <div className="ac-sec">
              <div className="ac-lbl">Schriftart</div>
              <div className="ac-font-grid">
                {FONTS.map(f => (
                  <div key={f.id} className={`ac-font-btn${font === f.id ? ' active' : ''}`} onClick={() => setFont(f.id)}>
                    <span style={{ fontFamily: f.css, fontSize: 12, color: TXT }}>{f.label}</span>
                    <span style={{ fontFamily: f.css, fontSize: 10, color: MUT, fontStyle: f.italic ? 'italic' : 'normal' }}>{f.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tip */}
            <div style={{ fontSize: 10, color: MUT, background: '#F0EBE3', borderRadius: 6, padding: '7px 9px' }}>
              💡 Element anklicken → Grösse mit <b>A− A+</b> anpassen oder verschieben
            </div>

            <div className="ac-hr" />

            {/* Colors */}
            <div className="ac-sec">
              <div className="ac-lbl">Farben</div>
              <div className="ac-color-row">
                {[
                  { id: 'main', label: 'Hauptfarbe', val: mainColor, set: setMainColor, auto: true },
                  { id: 'text', label: 'Textfarbe',  val: textColor, set: setTextColor, auto: false },
                  { id: 'cta',  label: 'CTA-Farbe',  val: ctaColor,  set: setCtaColor,  auto: true },
                ].map(c => (
                  <div key={c.id} className="ac-color-col">
                    <div className="ac-cp-wrap">
                      <div className="ac-swatch" style={{ background: c.val, border: c.val === '#FFFFFF' ? `1.5px solid ${BDR}` : undefined }}>
                        {c.auto && <span className="ac-auto-tag">Auto</span>}
                      </div>
                      <input type="color" value={c.val} onChange={e => c.set(e.target.value)} title={c.label} />
                    </div>
                    <div className="ac-color-lbl">{c.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ac-hr" />

            {/* Hintergrundbild */}
            <div className="ac-sec">
              <div className="ac-lbl">Hintergrundbild</div>
              {bgDataUrl ? (
                <div className="ac-upload loaded" onClick={() => document.getElementById('vio-bg-file')?.click()}>
                  <img src={bgDataUrl} alt="" style={{ width: '100%', height: 64, objectFit: 'cover', borderRadius: 5, display: 'block' }} />
                  <div className="ac-upload-hover">↑ Bild ersetzen</div>
                </div>
              ) : (
                <div className="ac-upload" onClick={() => document.getElementById('vio-bg-file')?.click()}>
                  <span style={{ fontSize: 20 }}>🖼️</span>
                  <span style={{ fontSize: 12, color: MUT }}>Bild hochladen oder von Website</span>
                </div>
              )}
              <input type="file" id="vio-bg-file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) loadBgFile(e.target.files[0]); }} />
              {bgQual && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: bgQual.cls === 'qg' ? GRN : bgQual.cls === 'qw' ? YLW : RED }} />
                  <span style={{ fontSize: 11, color: MUT }}>{bgQual.label}</span>
                </div>
              )}
              {!bgQual && bgDataUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: GRN, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: MUT }}>Bildqualität: Top</span>
                </div>
              )}
            </div>

            {/* Bildstil */}
            <div className="ac-sec">
              <div className="ac-lbl">Bildstil</div>
              <div className="ac-toggle">
                {(['overlay','pure','split'] as BgStyle[]).map(s => (
                  <button key={s} className={`ac-tog${bgStyle === s ? ' active' : ''}`} onClick={() => setBgStyle(s)}>
                    {s === 'overlay' ? 'Overlay' : s === 'pure' ? 'Reines Bild' : 'Split'}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: MUT, background: '#F0EBE3', borderRadius: 6, padding: '6px 8px' }}>
                {BS_DESCS[bgStyle]}
              </div>
            </div>

            {/* Bildfokus */}
            <div className="ac-sec">
              <div className="ac-lbl">Bildfokus</div>
              <div className="ac-focus-wrap">
                <div className="ac-focus-bg" style={bgDataUrl ? { backgroundImage: `url('${bgDataUrl}')` } : { background: `linear-gradient(135deg,${mainColor},${TAUP})` }} />
                <div className="ac-focus-inner">
                  {[0,1,2].flatMap(r => [0,1,2].map(c => (
                    <div key={`${r}-${c}`} className={`ac-fcell${focusRow===r && focusCol===c ? ' active' : ''}`}
                      onClick={() => { setFocusRow(r); setFocusCol(c); }} />
                  )))}
                </div>
              </div>
              <div style={{ fontSize: 10, color: MUT, textAlign: 'center' }}>Klicke auf den wichtigsten Bildbereich</div>
            </div>

            <div className="ac-hr" />

            {/* Animation */}
            <div className="ac-sec">
              <div className="ac-lbl">Bewegtes Element <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0, fontSize: 9 }}>(alle Formate)</span></div>
              <div className="ac-dyn-grid">
                {ANIM_OPTIONS.map(a => (
                  <div key={a.id} className={`ac-dyn-btn${animation === a.id ? ' active' : ''}`} onClick={() => setAnimation(a.id)}>
                    <span style={{ fontSize: 14 }}>{a.ico}</span>
                    {a.label}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, background: TAUP, color: 'white', padding: '5px 8px', borderRadius: 6 }}>
                {ANIM_TIPS[animation]}
              </div>
            </div>

            <div className="ac-hr" />

            {/* Save link */}
            <div className="ac-sec">
              <div className="ac-lbl">Link zum Weiterarbeiten</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="ac-inp" type="email" value={linkEmail} onChange={e => setLinkEmail(e.target.value)} placeholder="ihre@email.ch" style={{ flex: 1 }} />
                <button className="ac-btn-s" style={{ width: 'auto', padding: '7px 12px', whiteSpace: 'nowrap' }}
                  onClick={handleSendLink} disabled={linkStatus === 'loading' || linkStatus === 'sent'}>
                  {linkStatus === 'sent' ? '✓' : linkStatus === 'loading' ? '…' : 'Senden'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4, borderTop: `1px solid ${BDR}` }}>
              <button className="ac-btn-p" onClick={handleWeiter} disabled={submitting || !headline.trim()}>
                {submitting ? 'Wird gespeichert…' : '✓ Werbemittel einreichen'}
              </button>
              <button className="ac-btn-s" onClick={handleSendLink}>
                💾 Link zum Weiterarbeiten senden
              </button>
            </div>
          </div>

          {/* ══ CANVAS ══ */}
          <div className="ac-canvas">

            {/* Tabs + hint */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div className="ac-tabs">
                <button className={`ac-tab${activeTab === 'dooh' ? ' active' : ''}`} onClick={() => setActiveTab('dooh')}>DOOH</button>
                <button className={`ac-tab${activeTab === 'display' ? ' active' : ''}`} onClick={() => setActiveTab('display')}>Display</button>
              </div>
              <div style={{ fontSize: 11, color: MUT }}>Element anklicken → verschieben oder Grösse anpassen</div>
            </div>

            {/* DOOH tab */}
            {activeTab === 'dooh' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Quer */}
                <div className="ac-pcard">
                  <div className="ac-pcard-hdr">DOOH Querformat <span className="ac-pcard-dim">1920 × 1080 px</span></div>
                  <AdFormat {...fmtProps('quer')} />
                </div>

                {/* Hoch */}
                <div className="ac-pcard">
                  <div className="ac-pcard-hdr">DOOH Hochformat <span className="ac-pcard-dim">1080 × 1920 px</span></div>
                  <div className="ac-hoch-wrap">
                    <AdFormat {...fmtProps('hoch')} />
                  </div>
                </div>
              </div>
            )}

            {/* Display tab */}
            {activeTab === 'display' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Wide 970×250 */}
                <div className="ac-pcard">
                  <div className="ac-pcard-hdr">Display Banner <span className="ac-pcard-dim">970 × 250 px</span></div>
                  <AdFormat {...fmtProps('wide')} />
                </div>

                {/* Med + Tall */}
                <div className="ac-pcard">
                  <div className="ac-pcard-hdr">Display Rectangle &amp; Skyscraper</div>
                  <div className="ac-disp-pair">
                    <div className="ac-disp-item">
                      <AdFormat {...fmtProps('med')} />
                      <div className="ac-dim-lbl">300 × 250 px</div>
                    </div>
                    <div className="ac-disp-item">
                      <AdFormat {...fmtProps('tall')} />
                      <div className="ac-dim-lbl">300 × 600 px</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No option selected */}
      {!selOption && (
        <p style={{ fontSize: 13, color: MUT, textAlign: 'center', padding: '12px 0' }}>
          Bitte wählen Sie eine Option oben aus.
        </p>
      )}
    </div>
  );
}
