'use client';

import { useState, useEffect, useRef } from 'react';
import { BriefingData } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  primary: '#C1666B', pl: '#F9ECEC', pd: '#A84E53',
  taupe: '#5C4F3D', muted: '#8A8490', border: '#EDE8E0',
  bg: '#FAF7F2', white: '#FFFFFF', teal: '#2A7F7F',
} as const;

const FONTS = [
  { id: 'fraunces', label: 'Fraunces', css: "'Fraunces', serif" },
  { id: 'outfit',   label: 'Outfit',   css: "'Outfit', sans-serif" },
  { id: 'georgia',  label: 'Georgia',  css: 'Georgia, serif' },
  { id: 'helvetica',label: 'Helvetica',css: 'Helvetica, Arial, sans-serif' },
] as const;
type FontId = (typeof FONTS)[number]['id'];

const ANIMS = [
  { id: 'none',  label: 'Keine'      },
  { id: 'fade',  label: 'Einblenden' },
  { id: 'slide', label: 'Eingleiten' },
  { id: 'pulse', label: 'Pulsieren'  },
] as const;
type AnimId = (typeof ANIMS)[number]['id'];

// ─── Drag & Drop Types ────────────────────────────────────────────────────────

type ElId = 'logo' | 'headline' | 'subline' | 'cta';
type Pos  = { x: number; y: number };
type Positions = Record<ElId, Pos>;

const DEF_QUER: Positions = {
  logo:     { x: 4, y: 5  },
  headline: { x: 4, y: 30 },
  subline:  { x: 4, y: 50 },
  cta:      { x: 4, y: 68 },
};
const DEF_HOCH: Positions = {
  logo:     { x: 5, y: 4  },
  headline: { x: 5, y: 38 },
  subline:  { x: 5, y: 52 },
  cta:      { x: 5, y: 66 },
};

// ─── Component Props ──────────────────────────────────────────────────────────

interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  isActive: boolean;
}

interface AdConfig {
  headline:   string;
  subline:    string;
  cta:        string;
  logoText:   string;
  logoImage:  string | null;
  showLogo:   boolean;
  bgColor:    string;
  textColor:  string;
  accentColor: string;
  fontCss:    string;
  fontScale:  number;
  bgImage:    string | null;
  focusX:     number;
  focusY:     number;
}

// ─── Draggable element ────────────────────────────────────────────────────────

function DragEl({
  id, pos, onMove, sw, sh, children,
}: {
  id: ElId; pos: Pos;
  onMove: (id: ElId, p: Pos) => void;
  sw: number; sh: number;
  children: React.ReactNode;
}) {
  const drag = useRef<{ sp: Pos; sm: { x: number; y: number } } | null>(null);

  return (
    <div
      style={{
        position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
        cursor: 'grab', zIndex: 10, userSelect: 'none',
        outline: '1.5px dashed rgba(255,255,255,0.35)',
        outlineOffset: 3, borderRadius: 2,
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { sp: { ...pos }, sm: { x: e.clientX, y: e.clientY } };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.sm.x;
        const dy = e.clientY - drag.current.sm.y;
        onMove(id, {
          x: Math.max(0, Math.min(88, drag.current.sp.x + (dx / sw) * 100)),
          y: Math.max(0, Math.min(90, drag.current.sp.y + (dy / sh) * 100)),
        });
      }}
      onPointerUp={() => { drag.current = null; }}
    >
      {children}
    </div>
  );
}

// ─── DOOH Preview (with drag & drop) ─────────────────────────────────────────

function DoohPreview({
  w, h, screenW, positions, onMove, cfg,
}: {
  w: number; h: number; screenW: number;
  positions: Positions;
  onMove: (id: ElId, p: Pos) => void;
  cfg: AdConfig;
}) {
  const scale   = screenW / w;
  const screenH = Math.round(h * scale);
  const {
    headline, subline, cta, logoText, logoImage, showLogo,
    bgColor, textColor, accentColor, fontCss, fontScale,
    bgImage, focusX, focusY,
  } = cfg;
  const hB  = Math.round(w * 0.042 * fontScale);
  const bpx = (['left', 'center', 'right'] as const)[focusX] ?? 'center';
  const bpy = (['top',  'center', 'bottom'] as const)[focusY] ?? 'center';
  const elP = { onMove, sw: screenW, sh: screenH };

  return (
    <div style={{ width: screenW, height: screenH, position: 'relative', overflow: 'hidden', borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.18)', flexShrink: 0 }}>
      <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'relative', backgroundColor: bgColor, overflow: 'hidden' }}>

        {bgImage && (
          <img src={bgImage} alt="" draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${bpx} ${bpy}`, pointerEvents: 'none' }} />
        )}
        {bgImage && (
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${bgColor}E0 0%, ${bgColor}70 50%, transparent 100%)`, pointerEvents: 'none' }} />
        )}

        {showLogo && (
          <DragEl id="logo" pos={positions.logo} {...elP}>
            {logoImage
              ? <img src={logoImage} alt="Logo" draggable={false}
                  style={{ maxHeight: h * 0.09, maxWidth: w * 0.22, objectFit: 'contain', display: 'block' }} />
              : <span style={{ fontFamily: fontCss, fontSize: hB * 0.48, fontWeight: 800, color: textColor, backgroundColor: accentColor + '30', border: `${Math.max(2, Math.round(h * 0.003))}px solid ${accentColor}`, borderRadius: Math.round(h * 0.012), padding: `${Math.round(h * 0.01)}px ${Math.round(w * 0.014)}px`, display: 'inline-block' }}>
                  {logoText || 'LOGO'}
                </span>
            }
          </DragEl>
        )}

        <DragEl id="headline" pos={positions.headline} {...elP}>
          <div style={{ fontFamily: fontCss, fontSize: hB, fontWeight: 800, color: textColor, lineHeight: 1.15, maxWidth: w * 0.72, textShadow: bgImage ? '0 2px 10px rgba(0,0,0,0.3)' : undefined }}>
            {headline || 'Ihre Schlagzeile hier'}
          </div>
        </DragEl>

        <DragEl id="subline" pos={positions.subline} {...elP}>
          <div style={{ fontFamily: fontCss, fontSize: Math.round(hB * 0.52), color: textColor, opacity: 0.88, lineHeight: 1.45, maxWidth: w * 0.65, textShadow: bgImage ? '0 1px 5px rgba(0,0,0,0.2)' : undefined }}>
            {subline || 'Ihr Untertitel hier'}
          </div>
        </DragEl>

        <DragEl id="cta" pos={positions.cta} {...elP}>
          <div style={{ fontFamily: fontCss, fontSize: Math.round(hB * 0.48), fontWeight: 700, color: '#fff', backgroundColor: accentColor, padding: `${Math.round(h * 0.018)}px ${Math.round(w * 0.027)}px`, borderRadius: Math.round(h * 0.018), display: 'inline-block', boxShadow: '0 3px 12px rgba(0,0,0,0.2)' }}>
            {cta || 'Jetzt entdecken'}
          </div>
        </DragEl>
      </div>
    </div>
  );
}

// ─── Display Preview (static auto-layout) ────────────────────────────────────

function DisplayPreview({
  w, h, screenW, cfg,
}: {
  w: number; h: number; screenW: number; cfg: AdConfig;
}) {
  const scale   = screenW / w;
  const screenH = Math.round(h * scale);
  const {
    headline, subline, cta, logoText, logoImage, showLogo,
    bgColor, textColor, accentColor, fontCss, fontScale,
    bgImage, focusX, focusY,
  } = cfg;
  const hB        = Math.round(w * 0.07 * fontScale);
  const bpx       = (['left', 'center', 'right'] as const)[focusX] ?? 'center';
  const bpy       = (['top',  'center', 'bottom'] as const)[focusY] ?? 'center';
  const isWide    = w > h;
  const pH        = Math.round(h * (isWide ? 0.14 : 0.08));
  const pW        = Math.round(w * 0.06);

  return (
    <div style={{ width: screenW, height: screenH, position: 'relative', overflow: 'hidden', borderRadius: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.12)', flexShrink: 0 }}>
      <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'relative', backgroundColor: bgColor, display: 'flex', flexDirection: isWide ? 'row' : 'column', alignItems: isWide ? 'center' : 'flex-start', gap: Math.round(w * 0.03), padding: `${pH}px ${pW}px`, overflow: 'hidden' }}>

        {bgImage && (
          <img src={bgImage} alt="" draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${bpx} ${bpy}`, pointerEvents: 'none' }} />
        )}
        {bgImage && (
          <div style={{ position: 'absolute', inset: 0, background: isWide ? `linear-gradient(90deg, ${bgColor}EE 0%, ${bgColor}99 55%, transparent 100%)` : `linear-gradient(180deg, ${bgColor}DD 0%, ${bgColor}66 80%, transparent 100%)`, pointerEvents: 'none' }} />
        )}

        <div style={{ position: 'relative', flex: isWide ? 1 : undefined, zIndex: 1 }}>
          {showLogo && (
            logoImage
              ? <img src={logoImage} alt="Logo" style={{ maxHeight: h * 0.22, maxWidth: w * 0.18, objectFit: 'contain', display: 'block', marginBottom: Math.round(h * 0.05) }} />
              : <div style={{ fontFamily: fontCss, fontSize: hB * 0.42, fontWeight: 800, color: textColor, display: 'inline-block', backgroundColor: accentColor + '30', border: `2px solid ${accentColor}`, borderRadius: Math.round(h * 0.06), padding: `${Math.round(h * 0.04)}px ${Math.round(w * 0.025)}px`, marginBottom: Math.round(h * 0.05) }}>
                  {logoText || 'LOGO'}
                </div>
          )}
          <div style={{ fontFamily: fontCss, fontSize: hB, fontWeight: 800, color: textColor, lineHeight: 1.15, marginBottom: Math.round(h * 0.04) }}>
            {headline || 'Ihre Schlagzeile'}
          </div>
          <div style={{ fontFamily: fontCss, fontSize: Math.round(hB * 0.5), color: textColor, opacity: 0.85, lineHeight: 1.4 }}>
            {subline || 'Unterzeile'}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, alignSelf: isWide ? 'center' : 'flex-start', marginTop: isWide ? 0 : Math.round(h * 0.06) }}>
          <div style={{ fontFamily: fontCss, fontSize: Math.round(hB * 0.44), fontWeight: 700, color: '#fff', backgroundColor: accentColor, padding: `${Math.round(h * 0.09)}px ${Math.round(w * 0.04)}px`, borderRadius: Math.round(h * 0.07), whiteSpace: 'nowrap', display: 'inline-block' }}>
            {cta || 'Jetzt entdecken'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Step5AdCreator({ briefing, updateBriefing, nextStep }: Props) {
  const analysis   = briefing.analysis;
  const ogImageUrl = analysis?.ogImage || '';
  const ogLogoUrl  = analysis?.ogLogo || analysis?.favicon || '';
  const themeColor = analysis?.themeColor || '';

  // ── Option selection ──
  const initOption = (): 'upload' | 'später' | 'erstellen' | null => {
    const svc = briefing.werbemittelService;
    if (svc === 'upload' || svc === 'später' || svc === 'erstellen') return svc;
    if (briefing.adHeadline) return 'erstellen';
    return null;
  };
  const [selectedOption, setSelectedOption] = useState<'upload' | 'später' | 'erstellen' | null>(initOption);
  const [uploadedAdFiles, setUploadedAdFiles] = useState<File[]>([]);
  const [isDraggingOver,  setIsDraggingOver]  = useState(false);

  // ── Ad state ──
  const [headline,    setHeadline]    = useState(briefing.adHeadline   || '');
  const [subline,     setSubline]     = useState(briefing.adSubline    || '');
  const [cta,         setCta]         = useState(briefing.adCta        || 'Jetzt informieren');
  const [bgColor,     setBgColor]     = useState(briefing.adBgColor    || themeColor || '#C1666B');
  const [textColor,   setTextColor]   = useState(briefing.adTextColor  || '#FFFFFF');
  const [accentColor, setAccentColor] = useState(briefing.adAccentColor || themeColor || '#C1666B');
  const [font,        setFont]        = useState<FontId>((briefing.adFont as FontId) || 'fraunces');
  const [fontScale,   setFontScale]   = useState(briefing.adFontScale ?? 1.0);
  const [showLogo,    setShowLogo]    = useState(true);
  const [logoMode,    setLogoMode]    = useState<'text' | 'image'>(briefing.adLogoMode || 'text');
  const [focusX,      setFocusX]      = useState(briefing.adFocusX ?? 1);
  const [focusY,      setFocusY]      = useState(briefing.adFocusY ?? 1);
  const [animation,   setAnimation]   = useState<AnimId>((briefing.adAnimation as AnimId) || 'none');
  const [activeTab,   setActiveTab]   = useState<'dooh' | 'display'>('dooh');

  // ── Positions ──
  const [posQuer, setPosQuer] = useState<Positions>(() =>
    briefing.adPositionsQuer ? (briefing.adPositionsQuer as Positions) : { ...DEF_QUER }
  );
  const [posHoch, setPosHoch] = useState<Positions>(() =>
    briefing.adPositionsHoch ? (briefing.adPositionsHoch as Positions) : { ...DEF_HOCH }
  );

  // ── Images ──
  const [bgImage,   setBgImage]   = useState<string | null>(briefing.adBgImageData   || null);
  const [logoImage, setLogoImage] = useState<string | null>(briefing.adLogoImageData || null);
  const logoText = analysis?.organisation || briefing.adLogoText || '';

  // ── KI headlines ──
  const [kiLoading,    setKiLoading]    = useState(false);
  const [headlineSugs, setHeadlineSugs] = useState<string[]>([]);

  // ── Save link ──
  const [saveLinkStatus, setSaveLinkStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [saveLinkEmail,  setSaveLinkEmail]  = useState(briefing.email || '');

  // ── Submit ──
  const [submitting, setSubmitting] = useState(false);

  // Load Google Fonts
  useEffect(() => {
    if (document.getElementById('vio-adcreator-fonts')) return;
    const link = document.createElement('link');
    link.id  = 'vio-adcreator-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;0,9..144,800&family=Outfit:wght@400;600;700&display=swap';
    document.head.appendChild(link);
  }, []);

  // Load bg image from ogImage via proxy (only if nothing cached)
  useEffect(() => {
    if (bgImage || !ogImageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      try { setBgImage(canvas.toDataURL('image/jpeg', 0.85)); } catch { /* cross-origin */ }
    };
    img.src = `/api/proxy-image?url=${encodeURIComponent(ogImageUrl)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ogImageUrl]);

  // Load logo from ogLogo via proxy (only if nothing cached)
  useEffect(() => {
    if (logoImage || !ogLogoUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      try { setLogoImage(canvas.toDataURL('image/png')); setLogoMode('image'); } catch { /* cross-origin */ }
    };
    img.src = `/api/proxy-image?url=${encodeURIComponent(ogLogoUrl)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ogLogoUrl]);

  // Fetch KI headlines when option C first selected
  useEffect(() => {
    if (selectedOption !== 'erstellen' || headlineSugs.length > 0) return;
    setKiLoading(true);
    fetch('/api/generate-headlines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organisation: analysis?.organisation, beschreibung: analysis?.beschreibung, url: briefing.url }),
    })
      .then(r => r.json())
      .then(d => setHeadlineSugs(d.headlines || []))
      .catch(() => {})
      .finally(() => setKiLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption]);

  // ── Handlers ──
  const handleBgUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => setBgImage(e.target?.result as string ?? null);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => { setLogoImage(e.target?.result as string ?? null); setLogoMode('image'); };
    reader.readAsDataURL(file);
  };

  const handleSendLink = async () => {
    if (!saveLinkEmail.trim()) return;
    setSaveLinkStatus('loading');
    try {
      await fetch('/api/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: briefing.sessionId, dealId: briefing.dealId, email: saveLinkEmail.trim(), sendResumeEmail: true }),
      });
      setSaveLinkStatus('sent');
    } catch { setSaveLinkStatus('error'); }
  };

  const handleUploadWeiter = () => {
    updateBriefing({ werbemittel: 'upload', werbemittelErstellt: true, werbemittelService: 'upload', werbemittelFiles: uploadedAdFiles.map(f => f.name) });
    nextStep();
  };

  const handleSpäterWeiter = () => {
    updateBriefing({ werbemittel: 'spaeter', werbemittelErstellt: false, werbemittelService: 'später' });
    nextStep();
  };

  const handleWeiter = async () => {
    setSubmitting(true);
    const adState: Partial<BriefingData> = {
      werbemittel: 'erstellen', werbemittelErstellt: true, werbemittelService: 'erstellen',
      adHeadline: headline, adSubline: subline, adCta: cta,
      adBgColor: bgColor, adTextColor: textColor, adAccentColor: accentColor,
      adLogoMode: logoMode, adFont: font, adFontScale: fontScale,
      adFocusX: focusX, adFocusY: focusY, adAnimation: animation,
      adBgImageData:   bgImage    || undefined,
      adLogoImageData: logoImage  || undefined,
      adPositionsQuer: posQuer,
      adPositionsHoch: posHoch,
    };
    updateBriefing(adState);
    try {
      await fetch('/api/generate-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: briefing.dealId, adConfig: { headline, subline, cta, font, bgColor, textColor, accentColor, animation } }),
      });
    } catch { /* non-fatal */ }
    setSubmitting(false);
    nextStep();
  };

  // Derived
  const fontCss = FONTS.find(f => f.id === font)?.css ?? FONTS[0].css;
  const adCfg: AdConfig = {
    headline, subline, cta, logoText,
    logoImage: logoMode === 'image' ? logoImage : null,
    showLogo, bgColor, textColor, accentColor, fontCss, fontScale,
    bgImage, focusX, focusY,
  };

  // ── Sidebar input style ──
  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px',
    borderRadius: 8, border: `1px solid ${C.border}`, background: C.white,
    fontSize: 13, color: C.taupe, fontFamily: 'inherit', outline: 'none',
  };

  // ── Color picker rows ──
  const colorRows = [
    { label: 'Hintergrund', val: bgColor,     set: setBgColor     },
    { label: 'Text',        val: textColor,   set: setTextColor   },
    { label: 'Akzent',      val: accentColor, set: setAccentColor },
  ];

  // ─── Focus grid cells ──────────────────────────────────────────────────────
  const focusGrid: Array<{ fx: number; fy: number }> = [];
  for (let fy = 0; fy < 3; fy++) for (let fx = 0; fx < 3; fx++) focusGrid.push({ fx, fy });

  // ─── Option cards ──────────────────────────────────────────────────────────
  const optionCards = [
    { id: 'upload'   as const, ico: '📤', title: 'Eigene Werbemittel hochladen', desc: 'JPEG, PNG oder MP4 – Ihre fertigen Dateien.' },
    { id: 'später'   as const, ico: '⏳', title: 'Später hochladen',             desc: 'Werbemittel nach der Buchung einreichen.' },
    { id: 'erstellen'as const, ico: '✏️', title: 'Im Browser erstellen',         desc: 'Sujet direkt gestalten. Inkl. VIO-Erstellung.', badge: '+CHF 500' },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px,3vw,28px)', fontWeight: 700, color: C.taupe, marginBottom: 8 }}>
        Werbemittel
      </h2>
      <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
        Wie möchten Sie Ihre Werbemittel bereitstellen?
      </p>

      {/* ── Option cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {optionCards.map(opt => (
          <button
            key={opt.id}
            onClick={() => setSelectedOption(opt.id)}
            style={{
              border: `2px solid ${selectedOption === opt.id ? C.primary : C.border}`,
              borderRadius: 12, padding: '16px 14px',
              background: selectedOption === opt.id ? C.pl : C.white,
              cursor: 'pointer', textAlign: 'left', position: 'relative', transition: 'all .15s',
            }}
          >
            {opt.badge && (
              <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700, color: C.white, backgroundColor: C.primary, borderRadius: 20, padding: '2px 7px' }}>
                {opt.badge}
              </span>
            )}
            <div style={{ fontSize: 22, marginBottom: 6 }}>{opt.ico}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.taupe, marginBottom: 4 }}>{opt.title}</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{opt.desc}</div>
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────── Option A: Upload ──────────────────── */}
      {selectedOption === 'upload' && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setIsDraggingOver(true); }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={e => {
              e.preventDefault(); setIsDraggingOver(false);
              const files = Array.from(e.dataTransfer.files).filter(f => /image\/(jpeg|png)|video\/mp4/.test(f.type));
              setUploadedAdFiles(prev => [...prev, ...files]);
            }}
            onClick={() => document.getElementById('vio-ad-upload-inp')?.click()}
            style={{ border: `2px dashed ${isDraggingOver ? C.primary : C.border}`, borderRadius: 12, padding: '36px 24px', textAlign: 'center', background: isDraggingOver ? C.pl : C.bg, cursor: 'pointer', marginBottom: 12, transition: 'all .15s' }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.taupe, marginBottom: 4 }}>Dateien hierher ziehen oder klicken</div>
            <div style={{ fontSize: 12, color: C.muted }}>JPEG · PNG · MP4 · max. 50 MB pro Datei</div>
            <input id="vio-ad-upload-inp" type="file" multiple accept="image/jpeg,image/png,video/mp4" style={{ display: 'none' }}
              onChange={e => { const fs = Array.from(e.target.files || []); setUploadedAdFiles(prev => [...prev, ...fs]); }} />
          </div>

          {uploadedAdFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {uploadedAdFiles.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <span style={{ fontSize: 16 }}>📄</span>
                  <span style={{ fontSize: 13, color: C.taupe, flex: 1 }}>{f.name}</span>
                  <button onClick={() => setUploadedAdFiles(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18, padding: 0, lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleUploadWeiter} disabled={uploadedAdFiles.length === 0}
            style={{ width: '100%', padding: 13, borderRadius: 10, background: uploadedAdFiles.length === 0 ? C.border : C.primary, color: C.white, border: 'none', fontWeight: 700, fontSize: 14, cursor: uploadedAdFiles.length === 0 ? 'not-allowed' : 'pointer' }}>
            Weiter mit hochgeladenen Werbemitteln →
          </button>
        </div>
      )}

      {/* ─────────────────────────────────── Option B: Später ──────────────────── */}
      {selectedOption === 'später' && (
        <div style={{ background: '#FFFBF0', border: '1px solid #F5D87A', borderRadius: 12, padding: '24px', marginBottom: 16 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.taupe, marginBottom: 8 }}>Werbemittel nach Buchung einreichen</div>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>
            Sie erhalten nach der Buchung eine E-Mail mit allen Anforderungen (Format, Auflösung, Dateityp).
            Werbemittel können bis 5 Werktage vor Kampagnenstart eingereicht werden.
          </p>
          <button onClick={handleSpäterWeiter}
            style={{ padding: '11px 24px', borderRadius: 10, background: C.primary, color: C.white, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Weiter ohne Werbemittel →
          </button>
        </div>
      )}

      {/* ─────────────────────────────────── Option C: Erstellen ──────────────── */}
      {selectedOption === 'erstellen' && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

          {/* ══ Sidebar ══ */}
          <div style={{ width: 320, flexShrink: 0, position: 'sticky', top: 20, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* KI Headlines */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>
                KI-Vorschläge
              </div>
              {kiLoading ? (
                <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>Generiere Vorschläge…</div>
              ) : headlineSugs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {headlineSugs.map((s, i) => (
                    <button key={i} onClick={() => setHeadline(s)}
                      style={{ textAlign: 'left', background: headline === s ? C.pl : C.bg, border: `1px solid ${headline === s ? C.primary : C.border}`, borderRadius: 8, padding: '7px 10px', fontSize: 12, color: C.taupe, cursor: 'pointer', lineHeight: 1.35 }}>
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <button onClick={() => {
                  setKiLoading(true);
                  fetch('/api/generate-headlines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organisation: analysis?.organisation, beschreibung: analysis?.beschreibung, url: briefing.url }) })
                    .then(r => r.json()).then(d => setHeadlineSugs(d.headlines || [])).catch(() => {}).finally(() => setKiLoading(false));
                }} style={{ fontSize: 12, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                  Vorschläge generieren ↺
                </button>
              )}
            </div>

            {/* Headline */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted, display: 'block', marginBottom: 5 }}>Headline</label>
              <textarea value={headline} onChange={e => setHeadline(e.target.value)} rows={2}
                style={{ ...inp, resize: 'vertical', lineHeight: 1.4 }}
                placeholder="Ihre Schlagzeile (max. 8 Wörter)" />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                {headline.trim() ? headline.trim().split(/\s+/).length : 0} / 8 Wörter
              </div>
            </div>

            {/* Subline */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted, display: 'block', marginBottom: 5 }}>Unterzeile</label>
              <textarea value={subline} onChange={e => setSubline(e.target.value)} rows={2}
                style={{ ...inp, resize: 'vertical', lineHeight: 1.4 }}
                placeholder="Kurze Ergänzung (optional)" />
            </div>

            {/* CTA */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted, display: 'block', marginBottom: 5 }}>Call-to-Action</label>
              <input value={cta} onChange={e => setCta(e.target.value)} style={inp} placeholder="z.B. Jetzt informieren" />
            </div>

            <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: 0 }} />

            {/* Font picker */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted, display: 'block', marginBottom: 8 }}>Schriftart</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {FONTS.map(f => (
                  <button key={f.id} onClick={() => setFont(f.id as FontId)}
                    style={{ padding: '8px', borderRadius: 8, border: `1.5px solid ${font === f.id ? C.primary : C.border}`, background: font === f.id ? C.pl : C.white, cursor: 'pointer', fontFamily: f.css, fontSize: 13, color: C.taupe }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font scale */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted, display: 'block', marginBottom: 6 }}>
                Schriftgrösse{' '}
                <span style={{ textTransform: 'none', fontWeight: 400 }}>{Math.round(fontScale * 100)} %</span>
              </label>
              <input type="range" min={0.7} max={1.5} step={0.05} value={fontScale}
                onChange={e => setFontScale(Number(e.target.value))}
                style={{ width: '100%', accentColor: C.primary }} />
            </div>

            <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: 0 }} />

            {/* Logo */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted }}>Logo</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: C.taupe }}>
                  <input type="checkbox" checked={showLogo} onChange={e => setShowLogo(e.target.checked)} style={{ accentColor: C.primary }} />
                  Anzeigen
                </label>
              </div>
              {showLogo && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setLogoMode('text')}
                    style={{ flex: 1, padding: '7px', borderRadius: 8, border: `1.5px solid ${logoMode === 'text' ? C.primary : C.border}`, background: logoMode === 'text' ? C.pl : C.white, cursor: 'pointer', fontSize: 12, color: C.taupe }}>
                    Text
                  </button>
                  <label style={{ flex: 1, padding: '7px', borderRadius: 8, border: `1.5px solid ${logoMode === 'image' ? C.primary : C.border}`, background: logoMode === 'image' ? C.pl : C.white, cursor: 'pointer', fontSize: 12, color: C.taupe, textAlign: 'center', display: 'block' }}>
                    {logoImage ? '✓ Bild' : 'Bild laden'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]); }} />
                  </label>
                </div>
              )}
            </div>

            {/* Colors */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted, display: 'block', marginBottom: 10 }}>Farben</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {colorRows.map(({ label, val, set }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="color" value={val} onChange={e => set(e.target.value)}
                      style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${C.border}`, cursor: 'pointer', padding: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: C.taupe }}>{label}</span>
                    <span style={{ fontSize: 11, color: C.muted, marginLeft: 'auto', fontFamily: 'monospace' }}>{val.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: 0 }} />

            {/* BG image */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted, display: 'block', marginBottom: 8 }}>Hintergrundbild</label>
              {bgImage ? (
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <img src={bgImage} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}`, display: 'block' }} />
                  <button onClick={() => setBgImage(null)}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', fontSize: 13, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              ) : (
                <label style={{ display: 'block', border: `1.5px dashed ${C.border}`, borderRadius: 8, padding: '16px', textAlign: 'center', cursor: 'pointer', marginBottom: 10 }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>🖼️</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Bild hochladen</div>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleBgUpload(e.target.files[0]); }} />
                </label>
              )}

              {/* Focus grid */}
              {bgImage && (
                <div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Bildausschnitt</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                    {focusGrid.map(({ fx, fy }) => (
                      <button key={`${fx}-${fy}`} onClick={() => { setFocusX(fx); setFocusY(fy); }}
                        style={{ aspectRatio: '1', borderRadius: 4, border: `1.5px solid ${focusX === fx && focusY === fy ? C.primary : C.border}`, background: focusX === fx && focusY === fy ? C.primary : C.white, cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Animation */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted, display: 'block', marginBottom: 8 }}>Animation</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {ANIMS.map(a => (
                  <button key={a.id} onClick={() => setAnimation(a.id as AnimId)}
                    style={{ padding: '8px', borderRadius: 8, border: `1.5px solid ${animation === a.id ? C.primary : C.border}`, background: animation === a.id ? C.pl : C.white, cursor: 'pointer', fontSize: 12, color: C.taupe }}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: 0 }} />

            {/* Send resume link */}
            <div style={{ background: C.bg, borderRadius: 10, padding: '12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.taupe, marginBottom: 8 }}>Später weiterarbeiten</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={saveLinkEmail} onChange={e => setSaveLinkEmail(e.target.value)}
                  placeholder="ihre@email.ch" style={{ ...inp, flex: 1, fontSize: 12, padding: '7px 9px' }} />
                <button onClick={handleSendLink} disabled={saveLinkStatus === 'loading' || saveLinkStatus === 'sent'}
                  style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: C.primary, color: C.white, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {saveLinkStatus === 'sent' ? '✓ Gesendet' : saveLinkStatus === 'loading' ? '…' : 'Link senden'}
                </button>
              </div>
              {saveLinkStatus === 'error' && <div style={{ fontSize: 11, color: C.pd, marginTop: 5 }}>Fehler – bitte erneut versuchen.</div>}
            </div>

            {/* Submit */}
            <button onClick={handleWeiter} disabled={submitting || !headline.trim()}
              style={{ width: '100%', padding: 13, borderRadius: 10, background: !headline.trim() || submitting ? C.border : C.primary, color: C.white, border: 'none', fontWeight: 700, fontSize: 14, cursor: !headline.trim() || submitting ? 'not-allowed' : 'pointer', transition: 'background .15s' }}>
              {submitting ? 'Wird gespeichert…' : 'Werbemittel speichern & weiter →'}
            </button>
          </div>

          {/* ══ Preview area ══ */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['dooh', 'display'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{ padding: '8px 18px', borderRadius: 20, border: `1.5px solid ${activeTab === tab ? C.primary : C.border}`, background: activeTab === tab ? C.pl : C.white, color: activeTab === tab ? C.primary : C.muted, fontWeight: activeTab === tab ? 700 : 400, fontSize: 13, cursor: 'pointer', transition: 'all .15s' }}>
                  {tab === 'dooh' ? 'DOOH Plakatwand' : 'Display Anzeigen'}
                </button>
              ))}
            </div>

            {/* DOOH tab */}
            {activeTab === 'dooh' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

                {/* Quer */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Querformat · 1920 × 1080 px
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
                    Elemente per Drag &amp; Drop verschieben
                  </div>
                  <DoohPreview w={1920} h={1080} screenW={600}
                    positions={posQuer} onMove={(id, p) => setPosQuer(prev => ({ ...prev, [id]: p }))}
                    cfg={adCfg} />
                  <button onClick={() => setPosQuer({ ...DEF_QUER })}
                    style={{ marginTop: 8, fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Layout zurücksetzen
                  </button>
                </div>

                {/* Hoch */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Hochformat · 1080 × 1920 px
                  </div>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    <DoohPreview w={1080} h={1920} screenW={270}
                      positions={posHoch} onMove={(id, p) => setPosHoch(prev => ({ ...prev, [id]: p }))}
                      cfg={adCfg} />
                    <button onClick={() => setPosHoch({ ...DEF_HOCH })}
                      style={{ fontSize: 11, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginTop: 4 }}>
                      Zurücksetzen
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Display tab */}
            {activeTab === 'display' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Billboard · 970 × 250 px
                  </div>
                  <DisplayPreview w={970} h={250} screenW={600} cfg={adCfg} />
                </div>
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Medium Rectangle · 300 × 250 px
                    </div>
                    <DisplayPreview w={300} h={250} screenW={280} cfg={adCfg} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Half Page · 300 × 600 px
                    </div>
                    <DisplayPreview w={300} h={600} screenW={220} cfg={adCfg} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No option selected */}
      {!selectedOption && (
        <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '12px 0' }}>
          Bitte wählen Sie eine Option oben aus.
        </p>
      )}
    </div>
  );
}
