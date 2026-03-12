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

// ── Constants ──────────────────────────────────────────────────────────────────
const FONT_SIMILAR: Record<string, string[]> = {
  'Inter': ['DM Sans', 'Plus Jakarta Sans'],
  'Roboto': ['Inter', 'Lato'],
  'Open Sans': ['Lato', 'Source Sans 3'],
  'Lato': ['Open Sans', 'Nunito'],
  'Montserrat': ['Raleway', 'DM Sans'],
  'Poppins': ['Nunito', 'DM Sans'],
  'Raleway': ['Montserrat', 'Josefin Sans'],
  'Nunito': ['Poppins', 'Quicksand'],
  'Playfair Display': ['Lora', 'DM Serif Display'],
  'Merriweather': ['Lora', 'Playfair Display'],
  'Lora': ['Merriweather', 'Playfair Display'],
  'DM Sans': ['Inter', 'Outfit'],
  'Outfit': ['DM Sans', 'Nunito'],
  'Plus Jakarta Sans': ['Inter', 'DM Sans'],
  'Fraunces': ['Playfair Display', 'Lora'],
  'Oswald': ['Barlow Condensed', 'Bebas Neue'],
  'default': ['Outfit', 'Inter'],
};
const SERIF_FONTS = new Set(['Playfair Display','Lora','Merriweather','DM Serif Display','Fraunces','Libre Baskerville','Cormorant Garamond']);

// Focus grid: 3×3 position values (matches HTML FP array)
const FP = [
  ['0% 0%',  '50% 0%',  '100% 0%'],
  ['0% 50%', '50% 50%', '100% 50%'],
  ['0% 100%','50% 100%','100% 100%'],
];

const ANIM_TIPS: Record<string, string> = {
  cta:  '✓ CTA pulsiert sanft',
  qr:   '✓ QR blendet ein/aus',
  hl:   '✓ Headline gleitet ein',
  none: '⏸ Statisch',
};

// ── Types ──────────────────────────────────────────────────────────────────────
type ElPos = { top: number; left: number };
type AllPositions = Record<string, Record<string, ElPos>>;
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

// Default positions (matching HTML initial positions)
const DEF_POS: AllPositions = {
  quer:  { logo:{top:6,left:4},  hl:{top:26,left:4},  sub:{top:66,left:4},  cta:{top:82,left:4},  domain:{top:87,left:74}, qr:{top:78,left:89} },
  hoch:  { logo:{top:5,left:7},  hl:{top:32,left:7},  sub:{top:60,left:7},  cta:{top:79,left:7},  domain:{top:89,left:7},  qr:{top:83,left:72} },
  wide:  { logo:{top:38,left:3}, hl:{top:30,left:18}, sub:{top:64,left:18}, cta:{top:38,left:78}, domain:{top:82,left:18}, qr:{top:5,left:85}  },
  med:   { logo:{top:7,left:7},  hl:{top:30,left:7},  sub:{top:62,left:7},  cta:{top:82,left:7},  domain:{top:92,left:7},  qr:{top:75,left:72} },
  tall:  { logo:{top:5,left:7},  hl:{top:25,left:7},  sub:{top:56,left:7},  cta:{top:80,left:7},  domain:{top:92,left:7},  qr:{top:75,left:72} },
};

const DEF_SIZE: AllSizes = {
  quer:  { logo:15, hl:52, sub:20, cta:17, domain:12, qr:68 },
  hoch:  { logo:11, hl:24, sub:10, cta:10, domain:8,  qr:40 },
  wide:  { logo:13, hl:26, sub:13, cta:15, domain:11, qr:36 },
  med:   { logo:10, hl:22, sub:11, cta:11, domain:9,  qr:32 },
  tall:  { logo:11, hl:30, sub:13, cta:12, domain:9,  qr:36 },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function proxyUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

function extractDomain(url: string): string {
  try { return new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace('www.', ''); }
  catch { return url; }
}

function hexRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 193;
  const g = parseInt(h.slice(2, 4), 16) || 102;
  const b = parseInt(h.slice(4, 6), 16) || 107;
  return `rgba(${r},${g},${b},${a})`;
}

function fontStack(name: string): string {
  return `'${name}',${SERIF_FONTS.has(name) ? 'serif' : 'sans-serif'}`;
}

function checkImgUrl(url: string): Promise<boolean> {
  return new Promise(resolve => {
    if (!url) { resolve(false); return; }
    const img = new Image();
    img.onload  = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    setTimeout(() => resolve(false), 4000);
  });
}

function loadGoogleFont(name: string): void {
  if (typeof document === 'undefined') return;
  const id = 'gf-' + name.replace(/\s/g, '-');
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id; link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@300;400;600;700&display=swap`;
  document.head.appendChild(link);
}

function checkBgQuality(url: string): Promise<{ level: 'good'|'warn'|'bad'; w: number; h: number }> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w >= 1920 && h >= 1080) resolve({ level: 'good', w, h });
      else if (w >= 1200) resolve({ level: 'warn', w, h });
      else resolve({ level: 'bad', w, h });
    };
    img.onerror = () => resolve({ level: 'bad', w: 0, h: 0 });
    img.src = url;
    setTimeout(() => resolve({ level: 'warn', w: 0, h: 0 }), 4000);
  });
}

// ── AdPreview ──────────────────────────────────────────────────────────────────
interface AdPreviewProps {
  fmtId: string;
  width: number;
  height: number;
  bgImage: string;
  bgStyle: 'overlay'|'pure'|'split';
  bgBrightness: number;
  bgPos: string;
  colors: Colors;
  headline: string;
  subline: string;
  cta: string;
  lpUrl: string;
  logoMode: 'text'|'image';
  logoUrl: string;
  logoText: string;
  adFont: string;
  adBold: boolean;
  animation: string;
  positions: Record<string, ElPos>;
  sizes: Record<string, number>;
  onDragStart: (fmtId: string, elId: string, e: React.MouseEvent, layerEl: HTMLElement) => void;
  onSelect: (fmtId: string, elId: string) => void;
  selectedEl: string | null;
  onSizeChange: (fmtId: string, elId: string, delta: number) => void;
}

function AdPreview({
  fmtId, width, height, bgImage, bgStyle, bgBrightness, bgPos,
  colors, headline, subline, cta, lpUrl, logoMode, logoUrl, logoText,
  adFont, adBold, animation, positions, sizes,
  onDragStart, onSelect, selectedEl, onSizeChange,
}: AdPreviewProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const stack    = adFont ? fontStack(adFont) : "'Fraunces',serif";
  const domain   = extractDomain(lpUrl);
  const fw       = adBold ? '700' : '300';
  const subFw    = adBold ? '600' : '300';

  const animClass   = animation === 'cta' ? 'anim-cta' : animation === 'hl' ? 'anim-hl' : animation === 'qr' ? 'anim-qr' : '';
  const bgModeClass = bgStyle === 'pure' ? 'pure-mode' : bgStyle === 'split' ? 'split-mode' : '';
  const isWide      = fmtId === 'wide';

  const pos = positions;
  const sz  = sizes;

  function isSel(id: string) { return selectedEl === `${fmtId}-${id}`; }
  function elCls(id: string) { return `v15-draggable${isSel(id) ? ' sel' : ''}`; }

  function elStyle(id: string, extra?: React.CSSProperties): React.CSSProperties {
    return {
      position: 'absolute',
      top: `${pos[id]?.top ?? 10}%`,
      left: `${pos[id]?.left ?? 5}%`,
      ...extra,
    };
  }

  function handleDown(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    onSelect(fmtId, id);
    if (layerRef.current) onDragStart(fmtId, id, e, layerRef.current);
  }

  function Toolbar({ id, delta = 1 }: { id: string; delta?: number }) {
    return (
      <div className="v15-el-tb" style={{ display: isSel(id) ? 'flex' : 'none' }}>
        <button className="v15-tb-b" onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onSizeChange(fmtId, id, -delta); }}>
          {delta > 1 ? '−' : 'A−'}
        </button>
        <div className="v15-tb-sep" />
        <button className="v15-tb-b" onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onSizeChange(fmtId, id, delta); }}>
          {delta > 1 ? '+' : 'A+'}
        </button>
      </div>
    );
  }

  const ctaPad = fmtId==='quer' ? '10px 26px' : fmtId==='hoch' ? '5px 12px' : fmtId==='wide' ? '10px 22px' : fmtId==='med' ? '6px 14px' : '8px 20px';

  return (
    // Outer has no overflow:hidden so toolbars at top:-26px aren't clipped
    <div style={{ width, height, position: 'relative', borderRadius: isWide ? 0 : 6, flexShrink: 0 }}
         className={animClass}>

      {/* BG clip layer: overflow:hidden only here */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: isWide ? 0 : 6 }}
           className={`v15-ad-wrap ${bgModeClass}`}>

        {/* BG layer */}
        <div className="v15-ad-bg" style={{
          position: 'absolute', inset: 0,
          backgroundColor: colors.bg,
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: bgPos,
          filter: `brightness(${bgBrightness / 100})`,
          transition: 'filter .2s',
        }} />

        {/* Overlay */}
        <div className="v15-ad-ov" style={{
          position: 'absolute', inset: 0,
          background: hexRgba(colors.bg, 0.82),
          transition: 'opacity .25s',
        }} />

        {/* Split color block */}
        <div className="v15-ad-sc" style={{
          position: 'absolute', top: 0, left: 0, height: '100%', width: '50%',
          background: colors.bg, display: 'none',
        }} />
      </div>

      {/* Drag layer: sibling of BG clip, no overflow restriction */}
      <div ref={layerRef} style={{ position: 'absolute', inset: 0, zIndex: 3 }}
           onClick={() => onSelect(fmtId, '')}>

        {/* Logo */}
        <div className={elCls('logo')}
             style={elStyle('logo', isWide ? { transform: 'translateY(-50%)' } : undefined)}
             onMouseDown={e => handleDown('logo', e)}>
          <Toolbar id="logo" />
          {logoMode === 'image' && logoUrl
            ? <img src={proxyUrl(logoUrl)} alt="logo"
                   style={{ height: sz.logo * 2, width: 'auto', maxWidth: 130, display: 'block', objectFit: 'contain' }}
                   onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            : <div className="v15-ad-logo-txt"
                   style={{ fontSize: sz.logo, fontFamily: stack, fontWeight: 500, letterSpacing: '0.5px', opacity: 0.9, color: colors.logo, whiteSpace: 'nowrap' }}>
                {logoText || 'Logo'}
              </div>
          }
        </div>

        {/* Headline */}
        <div className={elCls('hl')}
             style={elStyle('hl', { maxWidth: fmtId==='quer' ? '60%' : fmtId==='hoch' ? '82%' : fmtId==='wide' ? '52%' : '86%' })}
             onMouseDown={e => handleDown('hl', e)}>
          <Toolbar id="hl" delta={2} />
          <div className="v15-ad-hl"
               style={{ fontSize: sz.hl, fontFamily: stack, fontWeight: fw, lineHeight: 1.1, color: colors.hl }}>
            {headline || 'Ihre Werbebotschaft'}
          </div>
        </div>

        {/* Subline */}
        {subline && (
          <div className={elCls('sub')} style={elStyle('sub')} onMouseDown={e => handleDown('sub', e)}>
            <Toolbar id="sub" />
            <div className="v15-ad-sub"
                 style={{ fontSize: sz.sub, fontFamily: stack, fontWeight: subFw, color: colors.sub, opacity: 0.85, whiteSpace: 'nowrap' }}>
              {subline}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className={elCls('cta')}
             style={elStyle('cta', isWide ? { transform: 'translateY(-50%)' } : undefined)}
             onMouseDown={e => handleDown('cta', e)}>
          <Toolbar id="cta" />
          <div className="v15-ad-cta"
               style={{ fontSize: sz.cta, color: colors.ctaTxt, background: colors.ctaBg, padding: ctaPad, borderRadius: 100, fontFamily: "'Outfit',sans-serif", fontWeight: 600, display: 'inline-block', whiteSpace: 'nowrap' }}>
            {cta || 'Mehr erfahren'}
          </div>
        </div>

        {/* Domain – DOOH only, not wide */}
        {domain && !isWide && (
          <div className={elCls('domain')} style={elStyle('domain')} onMouseDown={e => handleDown('domain', e)}>
            <Toolbar id="domain" />
            <div style={{ fontSize: sz.domain, fontFamily: "'Outfit',sans-serif", color: colors.domain, opacity: fmtId==='quer' ? 0.55 : 0.5, whiteSpace: 'nowrap' }}>
              {domain}
            </div>
          </div>
        )}

        {/* QR – DOOH only */}
        {lpUrl && (fmtId === 'quer' || fmtId === 'hoch') && (
          <div className={elCls('qr')} style={elStyle('qr')} onMouseDown={e => handleDown('qr', e)}>
            <Toolbar id="qr" delta={4} />
            <div className="v15-ad-qr"
                 style={{ width: sz.qr, height: sz.qr, background: 'white', borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QRCodeSVG value={lpUrl.startsWith('http') ? lpUrl : 'https://' + lpUrl} size={sz.qr - 6} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Step5AdCreator({ briefing, updateBriefing, nextStep }: Props) {
  const ana        = briefing.analysis;
  const domain     = extractDomain(briefing.url);
  const themeColor = ana?.themeColor || '#C1666B';

  const hlSugs  = ana?.headlines ?? [];
  const subSugs = ana?.sublines  ?? [];
  const ctaSugs = ana?.ctaText ? [ana.ctaText] : [];

  // ── State ──────────────────────────────────────────────────────────────────
  const [tab,       setTab]      = useState<'dooh'|'display'>('dooh');
  const [headline,  setHeadline] = useState(briefing.adHeadline  || hlSugs[0]  || '');
  const [subline,   setSubline]  = useState(briefing.adSubline   || subSugs[0] || '');
  const [cta,       setCta]      = useState(briefing.adCta       || ana?.ctaText || 'Mehr erfahren');
  const [lpUrl,     setLpUrl]    = useState(briefing.url || '');
  const [org,       setOrg]      = useState(briefing.adLogoText  || ana?.organisation || '');
  const [logoMode,  setLogoMode] = useState<'text'|'image'>(briefing.adLogoMode || 'image');
  const [logoUrl,   setLogoUrl]  = useState(briefing.adLogoImageData || '');
  const [logoThumb, setLogoThumb] = useState('');
  const [bgImage,   setBgImage]  = useState(briefing.adBgImageData || '');
  const [bgUrlInput,setBgUrlInput] = useState(ana?.ogImage || '');
  const [bgStyle,   setBgStyle]  = useState<'overlay'|'pure'|'split'>(briefing.adBgStyle || 'overlay');
  const [bgBright,  setBgBright] = useState(100);
  const [bgQual,    setBgQual]   = useState<{ level:'good'|'warn'|'bad'; w:number; h:number }|null>(null);
  const [bgPosByFmt, setBgPosByFmt] = useState<Record<string, string>>(
    Object.fromEntries(['quer','hoch','wide','med','tall'].map(f => [f, '50% 50%']))
  );
  const [focusFmt, setFocusFmt] = useState('quer');
  const [adFont,   setAdFont]   = useState(briefing.adFont || 'Outfit');
  const [adBold,   setAdBold]   = useState(false);
  const [animation, setAnimation] = useState(briefing.adAnimation || 'cta');
  const [fontOptions, setFontOptions] = useState<Array<{ name: string; label?: string; sub: string }>>([
    { name: 'Outfit', sub: 'Standard' },
    { name: 'Inter',  sub: 'Alternativ' },
    { name: 'DM Sans',sub: 'Alternativ' },
  ]);
  const [fontSubtitle, setFontSubtitle] = useState('');
  const [colors, setColors] = useState<Colors>({
    bg:     briefing.adBgColor     || themeColor,
    hl:     briefing.adTextColor   || '#FFFFFF',
    sub:    '#FFFFFF',
    logo:   '#FFFFFF',
    ctaTxt: '#5C4F3D',
    ctaBg:  briefing.adAccentColor || '#FFFFFF',
    domain: '#FFFFFF',
  });
  const [positions, setPositions] = useState<AllPositions>(structuredClone(DEF_POS));
  const [sizes,     setSizes]     = useState<AllSizes>(structuredClone(DEF_SIZE));
  const [selectedEl, setSelectedEl] = useState<string|null>(null);
  const [resumeEmail, setResumeEmail] = useState(briefing.email || '');
  const [resumeSent, setResumeSent] = useState(false);
  const [showResumeInput, setShowResumeInput] = useState(false);

  const dragRef     = useRef<DragState|null>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef   = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  // ── Debug: log analysis data on mount ──────────────────────────────────────
  useEffect(() => {
    console.log('ANALYSIS DATA:', JSON.stringify(briefing.analysis, null, 2));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init from analysis on mount ────────────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Populate text fields from analysis if not already saved
    if (!briefing.adHeadline && ana?.headlines?.[0]) setHeadline(ana.headlines[0]);
    if (!briefing.adSubline  && ana?.sublines?.[0])  setSubline(ana.sublines[0]);
    if (!briefing.adCta      && ana?.ctaText)         setCta(ana.ctaText);

    // Font section
    const detected = ana?.fontFamily || null;
    const primaryFont = detected || 'Outfit';
    // Pick contrasting alternates: if primary is serif → use sans; if sans → use serif+display
    const isSerif = SERIF_FONTS.has(primaryFont);
    const contrastFonts: [string, string] = isSerif
      ? ['Outfit', 'Inter']
      : ['Playfair Display', 'Fraunces'];
    const opts = [
      { name: primaryFont, label: detected ? 'Originalschrift' : 'Outfit', sub: detected || 'Standard' },
      { name: contrastFonts[0], sub: isSerif ? 'Sans-Serif' : 'Serif' },
      { name: contrastFonts[1], sub: isSerif ? 'Modern' : 'Display' },
    ];
    setFontOptions(opts);
    opts.forEach(f => loadGoogleFont(f.name));
    if (detected) {
      setFontSubtitle('von der Website');
      setAdFont(detected);
    }

    // Theme color
    if (!briefing.adBgColor) {
      setColors(c => ({ ...c, bg: themeColor }));
    }

    // Logo probe
    if (briefing.adLogoImageData) {
      setLogoThumb(briefing.adLogoImageData);
      return;
    }
    const baseUrl = (() => {
      try { const u = new URL(briefing.url.startsWith('http') ? briefing.url : 'https://' + briefing.url); return u.origin; }
      catch { return ''; }
    })();
    (async () => {
      const candidates = [
        baseUrl ? `${baseUrl}/apple-touch-icon.png` : '',
        ana?.favicon  || '',
      ].filter(Boolean);
      for (const url of candidates) {
        const ok = await checkImgUrl(proxyUrl(url));
        if (ok) {
          setLogoUrl(url);
          setLogoThumb(proxyUrl(url));
          setLogoMode('image');
          return;
        }
      }
      setLogoMode('text');
    })();

    // BG image – set directly from ogImage (matching HTML applyBgImage logic)
    if (!briefing.adBgImageData) {
      const ogImg = ana?.ogImage || '';
      if (ogImg) {
        setBgImage(ogImg);
        setBgUrlInput(ogImg);
        checkBgQuality(proxyUrl(ogImg)).then(setBgQual);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Inject Google Font whenever adFont changes
  useEffect(() => { if (adFont) loadGoogleFont(adFont); }, [adFont]);

  // ── Drag ──────────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((fmtId: string, elId: string, e: React.MouseEvent, layerEl: HTMLElement) => {
    e.preventDefault();
    dragRef.current = {
      fmtId, elId,
      startPos:   { ...((positions[fmtId] ?? DEF_POS[fmtId])[elId] ?? { top: 10, left: 5 }) },
      startMouse: { x: e.clientX, y: e.clientY },
      layerEl,
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const { fmtId: f, elId: el, startPos, startMouse, layerEl: layer } = dragRef.current;
      const r  = layer.getBoundingClientRect();
      const dx = ((ev.clientX - startMouse.x) / r.width)  * 100;
      const dy = ((ev.clientY - startMouse.y) / r.height) * 100;
      setPositions(p => ({
        ...p,
        [f]: { ...p[f], [el]: { top: Math.max(0, Math.min(95, startPos.top + dy)), left: Math.max(0, Math.min(95, startPos.left + dx)) } },
      }));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [positions]);

  const handleSizeChange = useCallback((fmtId: string, elId: string, delta: number) => {
    setSizes(s => ({
      ...s,
      [fmtId]: { ...s[fmtId], [elId]: Math.max(6, (s[fmtId][elId] ?? 12) + delta) },
    }));
  }, []);

  const handleSelect = useCallback((fmtId: string, elId: string) => {
    setSelectedEl(elId ? `${fmtId}-${elId}` : null);
  }, []);

  // ── BG ─────────────────────────────────────────────────────────────────────
  function handleBgFile(file: File) {
    const reader = new FileReader();
    reader.onload = ev => {
      const data = ev.target?.result as string;
      const img  = new Image();
      img.onload = () => checkBgQuality(data).then(setBgQual);
      img.src    = data;
      setBgImage(data);
      setBgUrlInput('');
    };
    reader.readAsDataURL(file);
  }

  function handleBgUrl(url: string) {
    setBgUrlInput(url);
    if (!url) { setBgImage(''); setBgQual(null); return; }
    setBgImage(url);
    checkBgQuality(proxyUrl(url)).then(setBgQual);
  }

  // ── Logo ───────────────────────────────────────────────────────────────────
  function handleLogoFile(file: File) {
    const reader = new FileReader();
    reader.onload = ev => {
      const data = ev.target?.result as string;
      setLogoUrl(data);
      setLogoThumb(data);
      setLogoMode('image');
    };
    reader.readAsDataURL(file);
  }

  function handleLogoUrl(url: string) {
    if (!url) return;
    checkImgUrl(proxyUrl(url)).then(ok => {
      if (ok) { setLogoUrl(url); setLogoThumb(proxyUrl(url)); setLogoMode('image'); }
    });
  }

  // ── Focus ──────────────────────────────────────────────────────────────────
  function handleFocusCell(pos: string) {
    setBgPosByFmt(p => ({ ...p, [focusFmt]: pos }));
  }

  // ── Resume link ─────────────────────────────────────────────────────────────
  async function handleSendResume() {
    if (!resumeEmail || !resumeEmail.includes('@')) return;
    try {
      await fetch('/api/send-resume-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resumeEmail, sessionId: briefing.sessionId || '' }),
      });
      setResumeSent(true);
      setShowResumeInput(false);
    } catch { /* silent */ }
  }

  // ── mkProps ────────────────────────────────────────────────────────────────
  function mkProps(fmtId: string) {
    return {
      fmtId,
      bgImage:      bgImage ? proxyUrl(bgImage) : '',
      bgStyle,
      bgBrightness: bgBright,
      bgPos:        bgPosByFmt[fmtId] || '50% 50%',
      colors,
      headline,
      subline,
      cta,
      lpUrl,
      logoMode,
      logoUrl,
      logoText: org,
      adFont,
      adBold,
      animation,
      positions:    positions[fmtId] ?? DEF_POS[fmtId],
      sizes:        sizes[fmtId]     ?? DEF_SIZE[fmtId],
      onDragStart:  handleDragStart,
      onSelect:     handleSelect,
      selectedEl,
      onSizeChange: handleSizeChange,
    };
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  function handleNext() {
    updateBriefing({
      adHeadline:      headline,
      adSubline:       subline,
      adCta:           cta,
      adBgStyle:       bgStyle,
      adBgColor:       colors.bg,
      adTextColor:     colors.hl,
      adAccentColor:   colors.ctaBg,
      adLogoMode:      logoMode,
      adLogoText:      org,
      adLogoImageData: logoMode === 'image' ? logoUrl : undefined,
      adBgImageData:   bgImage || undefined,
      adFont:          adFont  || undefined,
      adAnimation:     animation,
      adPositionsQuer: positions.quer as unknown as Record<string, { x: number; y: number }>,
      adPositionsHoch: positions.hoch as unknown as Record<string, { x: number; y: number }>,
      werbemittel:         'erstellen',
      werbemittelErstellt: true,
    });
    nextStep();
  }

  // ── Quality text ───────────────────────────────────────────────────────────
  const qualText = bgQual
    ? bgQual.level === 'good' ? `Top (${bgQual.w}×${bgQual.h})`
    : bgQual.level === 'warn' ? `Evtl. unscharf (${bgQual.w}×${bgQual.h})`
    : `Zu klein – min. 1200px empfohlen (${bgQual.w}×${bgQual.h})`
    : '';

  const qualColor = bgQual ? (bgQual.level === 'good' ? '#4CAF7D' : bgQual.level === 'warn' ? '#E8A838' : '#E05252') : '';

  // ── Shared sidebar styles ──────────────────────────────────────────────────
  const sTitle: React.CSSProperties = { fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#8a7a67', marginBottom: 9, marginTop: 15 };
  const sFg:    React.CSSProperties = { marginBottom: 9 };
  const sLbl:   React.CSSProperties = { fontSize: 11, fontWeight: 500, color: '#8a7a67', display: 'block', marginBottom: 3 };
  const sInp:   React.CSSProperties = { fontFamily: "'Outfit',sans-serif", fontSize: 12, color: '#5C4F3D', background: '#FAF7F2', border: '1px solid #ede8e1', borderRadius: 7, padding: '7px 9px', width: '100%', outline: 'none' };
  const sDivider: React.CSSProperties = { height: 1, background: '#ede8e1', margin: '13px 0' };

  function styleBtn(active: boolean): React.CSSProperties {
    return { flex: 1, fontSize: 11, fontWeight: 500, padding: '6px 3px', borderRadius: 6, border: `1.5px solid ${active ? '#C1666B' : '#ede8e1'}`, background: active ? '#f9eeef' : 'white', color: active ? '#C1666B' : '#8a7a67', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all .15s', textAlign: 'center' };
  }

  function isCardActive(fmtId: string): boolean {
    if (fmtId === 'med') return focusFmt === 'med' || focusFmt === 'tall';
    return focusFmt === fmtId;
  }

  function cardStyle(fmtId: string): React.CSSProperties {
    return isCardActive(fmtId)
      ? { boxShadow: '0 0 0 2.5px #C1666B', borderColor: '#C1666B' }
      : {};
  }

  // ── Guard: wait for analysis ─────────────────────────────────────────────────
  if (!ana) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, fontFamily: "'Outfit',sans-serif", color: '#8a7a67', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 18 }}>⏳</div>
        <div style={{ fontSize: 13 }}>Analysedaten werden geladen…</div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '310px 1fr', minHeight: 'calc(100vh - 52px)', fontFamily: "'Outfit',sans-serif" }}>

      {/* ═══════════════════════ SIDEBAR ═══════════════════════ */}
      <div style={{ background: 'white', borderRight: '1px solid #ede8e1', padding: 14, overflowY: 'auto', position: 'sticky', top: 52, height: 'calc(100vh - 52px)' }}
           className="v15-sidebar">

        {/* CRAWL CARD */}
        <div style={{ background: 'linear-gradient(135deg,#f9eeef,#faf7f2)', border: '1.5px solid #C1666B', borderRadius: 9, padding: '11px 13px', marginBottom: 13 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#C1666B', marginBottom: 7 }}>
            🔗 Von Website geladen
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#5C4F3D', fontWeight: 600 }}>{domain}</span>
            <span style={{ fontSize: 10, color: '#3A9E7A', fontWeight: 600, background: '#F0FFF6', border: '1px solid #B8E8CC', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>
              Analyse abgeschlossen ✓
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7, background: 'rgba(255,255,255,.6)', borderRadius: 6, padding: '6px 8px', flexWrap: 'wrap' }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, border: '1px solid rgba(0,0,0,.1)', background: colors.bg, flexShrink: 0 }} />
            {logoThumb && (
              <img src={logoThumb} alt="" style={{ height: 20, width: 'auto', maxWidth: 56, objectFit: 'contain', borderRadius: 3 }}
                   onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <span style={{ fontSize: 10, color: '#8a7a67' }}>
              {domain}{ana?.fontFamily ? ` · ${ana.fontFamily}` : ''}
            </span>
          </div>
        </div>

        {/* KAMPAGNE */}
        <div style={sTitle}>Kampagne</div>

        <div style={sFg}>
          <label style={sLbl}>Organisation / Marke</label>
          <input style={sInp} value={org} onChange={e => setOrg(e.target.value)} placeholder="Ihr Unternehmen" />
        </div>

        <div style={sFg}>
          <label style={sLbl}>Headline</label>
          {hlSugs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
              {hlSugs.map(h => (
                <div key={h}
                     style={{ background: headline === h ? '#f9eeef' : '#FAF7F2', border: `1.5px solid ${headline === h ? '#C1666B' : '#ede8e1'}`, borderRadius: 6, padding: '6px 9px', cursor: 'pointer', fontSize: 12, color: headline === h ? '#C1666B' : '#5C4F3D', transition: 'all .15s', lineHeight: 1.4 }}
                     onClick={() => setHeadline(h)}>
                  {h}
                </div>
              ))}
            </div>
          )}
          <input style={sInp} value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Eigene Headline…" />
        </div>

        <div style={sFg}>
          <label style={sLbl}>Subline <span style={{ fontWeight: 300, fontSize: 10 }}>(optional)</span></label>
          {subSugs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
              {subSugs.map(s => (
                <div key={s}
                     style={{ background: subline === s ? '#f9eeef' : '#FAF7F2', border: `1.5px solid ${subline === s ? '#C1666B' : '#ede8e1'}`, borderRadius: 6, padding: '6px 9px', cursor: 'pointer', fontSize: 12, color: subline === s ? '#C1666B' : '#5C4F3D', transition: 'all .15s', lineHeight: 1.4 }}
                     onClick={() => setSubline(s)}>
                  {s}
                </div>
              ))}
            </div>
          )}
          <input style={sInp} value={subline} onChange={e => setSubline(e.target.value)} placeholder="Eigene Subline…" />
        </div>

        <div style={sFg}>
          <label style={sLbl}>CTA-Button</label>
          {ctaSugs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
              {ctaSugs.map(s => (
                <div key={s}
                     style={{ background: cta === s ? '#f9eeef' : '#FAF7F2', border: `1.5px solid ${cta === s ? '#C1666B' : '#ede8e1'}`, borderRadius: 6, padding: '6px 9px', cursor: 'pointer', fontSize: 12, color: cta === s ? '#C1666B' : '#5C4F3D', transition: 'all .15s', lineHeight: 1.4 }}
                     onClick={() => setCta(s)}>
                  {s}
                </div>
              ))}
            </div>
          )}
          <input style={sInp} value={cta} onChange={e => setCta(e.target.value)} placeholder="Mehr erfahren" />
        </div>

        <div style={sFg}>
          <label style={sLbl}>Landingpage URL (QR Code)</label>
          <input style={sInp} value={lpUrl} onChange={e => setLpUrl(e.target.value)} placeholder="https://…" />
        </div>

        <div style={sDivider} />

        {/* LOGO */}
        <div style={{ ...sTitle, marginTop: 0 }}>Logo</div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
          <button style={styleBtn(logoMode === 'text')}  onClick={() => setLogoMode('text')}>Text</button>
          <button style={styleBtn(logoMode === 'image')} onClick={() => setLogoMode('image')}>Bild-Logo</button>
        </div>

        {/* Hidden file input – always in DOM so logoFileRef is always valid */}
        <input ref={logoFileRef} type="file" accept="image/*" style={{ display: 'none' }}
               onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }} />

        {logoMode === 'text' ? (
          <div style={sFg}>
            <input style={sInp} value={org} onChange={e => setOrg(e.target.value)} placeholder="Restaurant Lemon" />
          </div>
        ) : (
          <div style={sFg}>
            {logoThumb ? (
              <img src={logoThumb} alt="logo"
                   style={{ width: '100%', height: 60, objectFit: 'contain', borderRadius: 7, border: '1px solid #ede8e1', marginBottom: 5, background: 'white', display: 'block' }}
                   onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div onClick={() => logoFileRef.current?.click()}
                   style={{ width: '100%', height: 60, borderRadius: 7, border: '2px dashed #ede8e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 5, background: '#FAF7F2', color: '#8a7a67', fontSize: 11, cursor: 'pointer' }}>
                <span>🏢</span><span>Kein Logo – klicken zum Hochladen</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 5, alignItems: 'stretch' }}>
              <input style={{ ...sInp, flex: 1 }}
                     value={logoUrl.startsWith('data:') ? '' : logoUrl}
                     onChange={e => handleLogoUrl(e.target.value)}
                     placeholder="https://… (auto befüllt)" />
              <button style={{ background: '#ede8e1', border: '1px solid #ede8e1', borderRadius: 7, padding: '0 9px', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      onClick={() => logoFileRef.current?.click()}>
                📁
              </button>
            </div>
          </div>
        )}

        <div style={sDivider} />

        {/* HINTERGRUNDBILD */}
        <div style={{ ...sTitle, marginTop: 0 }}>Hintergrundbild</div>
        <div style={sFg}>
          {bgImage && (
            <img src={proxyUrl(bgImage)} alt=""
                 style={{ width: '100%', height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid #ede8e1', marginBottom: 5, display: 'block' }} />
          )}
          <div style={{ display: 'flex', gap: 5, alignItems: 'stretch' }}>
            <input style={{ ...sInp, flex: 1 }} value={bgUrlInput} onChange={e => handleBgUrl(e.target.value)} placeholder="https://… (auto befüllt)" />
            <label style={{ background: '#ede8e1', border: '1px solid #ede8e1', borderRadius: 7, padding: '0 9px', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              📁
              <input ref={bgFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                     onChange={e => { const f = e.target.files?.[0]; if (f) handleBgFile(f); }} />
            </label>
          </div>
          {bgQual && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: qualColor, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#8a7a67' }}>{qualText}</span>
            </div>
          )}
        </div>

        {/* BILDSTIL */}
        <div style={sFg}>
          <label style={sLbl}>Bildstil</label>
          <div style={{ display: 'flex', gap: 5 }}>
            {(['overlay','pure','split'] as const).map(s => (
              <button key={s} style={styleBtn(bgStyle === s)} onClick={() => setBgStyle(s)}>
                {s === 'overlay' ? 'Overlay' : s === 'pure' ? 'Bild pur' : 'Split'}
              </button>
            ))}
          </div>
        </div>

        {/* BILDFOKUS */}
        <div style={sFg}>
          <label style={sLbl}>Bildfokus <span style={{ fontWeight: 300, fontSize: 9 }}>(pro Format)</span></label>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 5 }}>
            {(['quer','hoch','wide','med','tall'] as const).map(fmt => {
              const active = focusFmt === fmt;
              return (
                <button key={fmt}
                        style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: `1.5px solid ${active ? '#C1666B' : '#ede8e1'}`, background: active ? '#C1666B' : 'white', color: active ? 'white' : '#8a7a67', fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all .15s' }}
                        onClick={() => setFocusFmt(fmt)}>
                  {fmt === 'wide' ? 'Billboard' : fmt === 'med' ? '300×250' : fmt === 'tall' ? '300×600' : fmt === 'quer' ? 'Quer' : 'Hoch'}
                </button>
              );
            })}
          </div>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 7, overflow: 'hidden', border: '1.5px solid #ede8e1' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: bgImage ? `url(${proxyUrl(bgImage)})` : undefined, backgroundSize: 'cover', backgroundPosition: bgPosByFmt[focusFmt] || '50% 50%', backgroundColor: '#ede8e1' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,1fr)' }}>
              {FP.flatMap((row, r) => row.map((cellPos, c) => {
                const isActive = (bgPosByFmt[focusFmt] || '50% 50%') === cellPos;
                return (
                  <div key={`${r}-${c}`}
                       style={{ cursor: 'pointer', background: isActive ? 'rgba(193,102,107,.55)' : 'transparent', transition: 'background .1s' }}
                       onClick={() => handleFocusCell(cellPos)}
                       onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.2)'; }}
                       onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }} />
                );
              }))}
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#8a7a67', textAlign: 'center', marginTop: 3 }}>
            Klicke auf den wichtigsten Bereich für dieses Format
          </div>
        </div>

        <div style={sDivider} />

        {/* BILDHELLIGKEIT */}
        <div style={{ ...sTitle, marginTop: 0 }}>Bildhelligkeit</div>
        <div style={sFg}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 11 }}>🌑</span>
            <input type="range" min={20} max={160} value={bgBright}
                   onChange={e => setBgBright(+e.target.value)}
                   style={{ flex: 1, accentColor: '#C1666B' }} />
            <span style={{ fontSize: 11 }}>☀️</span>
            <span style={{ fontSize: 10, color: '#8a7a67', minWidth: 32, textAlign: 'right' }}>{bgBright}%</span>
          </div>
        </div>

        <div style={sDivider} />

        {/* SCHRIFT */}
        <div style={{ ...sTitle, marginTop: 0 }}>
          Schrift{fontSubtitle && <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0, fontSize: 9, marginLeft: 4 }}>{fontSubtitle}</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6 }}>
          {fontOptions.map(f => (
            <button key={f.name}
                    style={{ padding: '6px 4px', border: `1.5px solid ${adFont === f.name ? '#C1666B' : '#ede8e1'}`, borderRadius: 6, background: adFont === f.name ? '#f9eeef' : 'white', cursor: 'pointer', textAlign: 'center', lineHeight: 1.2, transition: 'all .15s', fontFamily: fontStack(f.name), fontSize: 12, color: adFont === f.name ? '#C1666B' : '#5C4F3D' }}
                    onClick={() => setAdFont(f.name)}>
              {f.label || f.name}
              <br />
              <small style={{ fontSize: 9, fontWeight: 300, opacity: 0.7, fontFamily: "'Outfit',sans-serif" }}>{f.sub}</small>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <button style={{ padding: '4px 12px', border: `1.5px solid ${adBold ? '#C1666B' : '#ede8e1'}`, borderRadius: 6, background: adBold ? '#f9eeef' : 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: adBold ? '#C1666B' : '#8a7a67', transition: 'all .15s', fontFamily: 'inherit' }}
                  onClick={() => setAdBold(b => !b)}>
            <b>B</b>
          </button>
          <span style={{ fontSize: 11, color: '#8a7a67' }}>Fett für Headline &amp; Subline</span>
        </div>

        <div style={sDivider} />

        {/* FARBEN */}
        <div style={{ ...sTitle, marginTop: 0 }}>Farben</div>
        <div style={{ fontSize: 10, color: '#8a7a67', marginBottom: 8 }}>Jedes Element hat eine eigene Farbe</div>

        {/* BG color – full width */}
        <div style={sFg}>
          <label style={sLbl}>Hintergrundfarbe / Overlay</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="color" value={colors.bg}
                   onChange={e => setColors(c => ({ ...c, bg: e.target.value }))}
                   style={{ width: 28, height: 28, border: '1px solid #ede8e1', borderRadius: 5, padding: 2, cursor: 'pointer', background: 'none' }} />
            <span style={{ fontSize: 9, color: '#8a7a67' }}>{colors.bg}</span>
          </div>
        </div>

        {/* Per-element colors – 3-col grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 0 }}>
          {([
            ['hl',     'Headline'],
            ['sub',    'Subline'],
            ['logo',   'Logo-Text'],
            ['ctaTxt', 'CTA Text'],
            ['ctaBg',  'CTA Bubble'],
            ['domain', 'Domain'],
          ] as [keyof Colors, string][]).map(([k, lbl]) => (
            <div key={k}>
              <label style={{ fontSize: 10, fontWeight: 500, color: '#8a7a67', display: 'block', marginBottom: 3 }}>{lbl}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="color" value={colors[k]}
                       onChange={e => setColors(c => ({ ...c, [k]: e.target.value }))}
                       style={{ width: 28, height: 28, border: '1px solid #ede8e1', borderRadius: 5, padding: 2, cursor: 'pointer', background: 'none' }} />
                <span style={{ fontSize: 9, color: '#8a7a67' }}>{colors[k]}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={sDivider} />

        {/* BEWEGUNG */}
        <div style={{ ...sTitle, marginTop: 0 }}>
          Bewegung <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0, fontSize: 9 }}>(alle Formate)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {([
            ['cta',  '👆', 'CTA-Button'],
            ['qr',   '📱', 'QR-Code'],
            ['hl',   '✏️', 'Headline'],
            ['none', '⏸',  'Statisch'],
          ] as const).map(([v, icon, lbl]) => (
            <button key={v}
                    style={{ padding: '7px 5px', border: `1.5px solid ${animation === v ? '#C1666B' : '#ede8e1'}`, borderRadius: 6, background: animation === v ? '#f9eeef' : 'white', cursor: 'pointer', textAlign: 'center', fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, color: animation === v ? '#C1666B' : '#8a7a67', transition: 'all .15s', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}
                    onClick={() => setAnimation(v)}>
              <span>{icon}</span>
              <span>{lbl}</span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, background: '#5C4F3D', color: 'white', padding: '4px 8px', borderRadius: 5, marginTop: 4 }}>
          {ANIM_TIPS[animation] || '⏸ Statisch'}
        </div>

        <div style={sDivider} />

        {/* SUBMIT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={handleNext}
                  style={{ width: '100%', background: '#C1666B', color: 'white', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, padding: 11, borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all .15s' }}>
            ✓ Werbemittel einreichen
          </button>
          {resumeSent ? (
            <div style={{ fontSize: 11, color: '#3A9E7A', textAlign: 'center', padding: '6px 0' }}>
              ✓ Link gesendet an {resumeEmail}
            </div>
          ) : showResumeInput ? (
            <div style={{ display: 'flex', gap: 5 }}>
              <input style={{ ...sInp, flex: 1, padding: '7px 9px' }}
                     type="email" value={resumeEmail} onChange={e => setResumeEmail(e.target.value)}
                     placeholder="Ihre E-Mail"
                     onKeyDown={e => { if (e.key === 'Enter') handleSendResume(); }} />
              <button onClick={handleSendResume}
                      style={{ background: '#5C4F3D', color: 'white', border: 'none', borderRadius: 7, padding: '0 10px', cursor: 'pointer', fontSize: 11, fontFamily: "'Outfit',sans-serif", flexShrink: 0 }}>
                Senden
              </button>
            </div>
          ) : (
            <button onClick={() => setShowResumeInput(true)}
                    style={{ width: '100%', background: 'transparent', color: '#5C4F3D', border: '1.5px solid #ede8e1', borderRadius: 8, padding: 8, fontFamily: "'Outfit',sans-serif", fontSize: 12, cursor: 'pointer' }}>
              📎 Link zum Weiterarbeiten senden
            </button>
          )}
          <button onClick={() => { updateBriefing({ werbemittel: 'spaeter' }); nextStep(); }}
                  style={{ width: '100%', background: 'transparent', color: '#5C4F3D', border: '1.5px solid #ede8e1', borderRadius: 8, padding: 8, fontFamily: "'Outfit',sans-serif", fontSize: 12, cursor: 'pointer' }}>
            Später einschicken
          </button>
        </div>
      </div>

      {/* ═══════════════════════ CANVAS ═══════════════════════ */}
      <div style={{ background: '#FAF7F2', padding: '22px 26px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 20, background: 'white', borderRadius: 9, padding: 3, border: '1px solid #ede8e1', width: 'fit-content' }}>
          {(['dooh','display'] as const).map(t => (
            <button key={t}
                    style={{ fontSize: 12, fontWeight: 500, padding: '6px 15px', borderRadius: 7, border: 'none', cursor: 'pointer', background: tab === t ? '#C1666B' : 'transparent', color: tab === t ? 'white' : '#8a7a67', fontFamily: "'Outfit',sans-serif", transition: 'all .15s' }}
                    onClick={() => setTab(t)}>
              {t === 'dooh' ? 'DOOH' : 'Display'}
            </button>
          ))}
        </div>

        {/* ── DOOH ── */}
        {tab === 'dooh' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#8a7a67', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              DOOH Formate <span style={{ flex: 1, height: 1, background: '#ede8e1', display: 'block' }} />
            </div>

            {/* Querformat */}
            <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: `1px solid #ede8e1`, ...cardStyle('quer') }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#5C4F3D' }}>Querformat</div>
                  <div style={{ fontSize: 11, color: '#8a7a67' }}>1920 × 1080 px</div>
                </div>
              </div>
              <div style={{ width: '100%', maxWidth: 845, overflow: 'hidden' }}>
                <AdPreview {...mkProps('quer')} width={845} height={475} />
              </div>
            </div>

            {/* Hochformat */}
            <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: `1px solid #ede8e1`, ...cardStyle('hoch') }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#5C4F3D' }}>Hochformat</div>
                  <div style={{ fontSize: 11, color: '#8a7a67' }}>1080 × 1920 px</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                <AdPreview {...mkProps('hoch')} width={259} height={461} />
              </div>
            </div>
          </div>
        )}

        {/* ── Display ── */}
        {tab === 'display' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#8a7a67', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              Display Formate <span style={{ flex: 1, height: 1, background: '#ede8e1', display: 'block' }} />
            </div>

            {/* Billboard 970×250 */}
            <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: `1px solid #ede8e1`, ...cardStyle('wide') }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#5C4F3D' }}>Billboard</div>
                  <div style={{ fontSize: 11, color: '#8a7a67' }}>970 × 250 px</div>
                </div>
              </div>
              {/* Scale 970×250 → ~820×211 */}
              <div style={{ overflow: 'hidden', borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,.12)' }}>
                <div style={{ transformOrigin: 'top left', transform: 'scale(0.845)', width: 970, height: 250, position: 'relative' }}>
                  <AdPreview {...mkProps('wide')} width={970} height={250} />
                </div>
              </div>
              {/* Height placeholder trick */}
              <div style={{ height: 211, marginTop: -211, pointerEvents: 'none' }} />
            </div>

            {/* Rectangle + Half Page */}
            <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: `1px solid #ede8e1`, ...cardStyle('med') }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#5C4F3D' }}>Rectangle &amp; Half Page</div>
                  <div style={{ fontSize: 11, color: '#8a7a67' }}>300 × 250 / 300 × 600 px</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <AdPreview {...mkProps('med')} width={300} height={250} />
                  <div style={{ fontSize: 10, color: '#8a7a67' }}>300 × 250 px</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <AdPreview {...mkProps('tall')} width={300} height={600} />
                  <div style={{ fontSize: 10, color: '#8a7a67' }}>300 × 600 px</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
