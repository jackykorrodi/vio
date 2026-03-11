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

// ── Font constants ─────────────────────────────────────────────────────────────
const FONT_SIMILAR: Record<string, string[]> = {
  'Inter':            ['DM Sans', 'Plus Jakarta Sans'],
  'Roboto':           ['Inter', 'Lato'],
  'Poppins':          ['Nunito', 'DM Sans'],
  'Montserrat':       ['Raleway', 'DM Sans'],
  'Lato':             ['Open Sans', 'Nunito'],
  'Outfit':           ['DM Sans', 'Nunito'],
  'Playfair Display': ['Lora', 'DM Serif Display'],
  'default':          ['Outfit', 'Inter'],
};
const SERIF_FONTS = ['Playfair Display','Lora','Merriweather','DM Serif Display','Fraunces'];

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

// ── Default positions ──────────────────────────────────────────────────────────
const DEF_POS: AllPositions = {
  quer:  { logo:{top:6,left:4},  hl:{top:26,left:4},  sub:{top:66,left:4},  cta:{top:82,left:4},  domain:{top:90,left:72}, qr:{top:78,left:88} },
  hoch:  { logo:{top:5,left:7},  hl:{top:32,left:7},  sub:{top:60,left:7},  cta:{top:80,left:7},  domain:{top:90,left:7},  qr:{top:81,left:72} },
  wide:  { logo:{top:30,left:3}, hl:{top:30,left:18}, sub:{top:64,left:18}, cta:{top:30,left:78}, domain:{top:82,left:18}, qr:{top:20,left:90} },
  med:   { logo:{top:7,left:7},  hl:{top:30,left:7},  sub:{top:62,left:7},  cta:{top:82,left:7},  domain:{top:90,left:7},  qr:{top:75,left:72} },
  tall:  { logo:{top:5,left:7},  hl:{top:25,left:7},  sub:{top:56,left:7},  cta:{top:82,left:7},  domain:{top:90,left:7},  qr:{top:75,left:72} },
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

function checkImgQuality(url: string): Promise<'good'|'warn'|'bad'> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => {
      if (img.naturalWidth >= 600 || img.naturalHeight >= 400) resolve('good');
      else if (img.naturalWidth >= 200) resolve('warn');
      else resolve('bad');
    };
    img.onerror = () => resolve('bad');
    img.src = url;
    setTimeout(() => resolve('warn'), 4000);
  });
}

function checkLogoQuality(url: string): Promise<'good'|'warn'|'bad'> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => {
      if (img.naturalWidth >= 128 && img.naturalHeight >= 64) resolve('good');
      else if (img.naturalWidth >= 48) resolve('warn');
      else resolve('bad');
    };
    img.onerror = () => resolve('bad');
    img.src = url;
    setTimeout(() => resolve('warn'), 4000);
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
  const isSerifFont = SERIF_FONTS.includes(adFont);
  const hlFamily = isSerifFont ? adFont : 'Fraunces';
  const bodyFamily = adFont || 'Outfit';
  const domain = extractDomain(lpUrl);

  const animClass = animation === 'cta' ? 'anim-cta' : animation === 'hl' ? 'anim-hl' : animation === 'qr' ? 'anim-qr' : '';
  const bgStyleMode = bgStyle === 'pure' ? 'pure-mode' : bgStyle === 'split' ? 'split-mode' : '';

  const pos = positions;
  const sz  = sizes;

  function isSel(id: string) { return selectedEl === `${fmtId}-${id}`; }
  function elCls(id: string) { return `ac-el${isSel(id) ? ' sel' : ''}`; }

  function elStyle(id: string, extra?: React.CSSProperties): React.CSSProperties {
    return { position: 'absolute', top: `${pos[id]?.top ?? 10}%`, left: `${pos[id]?.left ?? 5}%`, cursor: 'grab', userSelect: 'none', borderRadius: 3, padding: '2px 3px', ...extra };
  }

  function handleDown(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    onSelect(fmtId, id);
    if (layerRef.current) onDragStart(fmtId, id, e, layerRef.current);
  }

  function Toolbar({ id }: { id: string }) {
    if (!isSel(id)) return null;
    return (
      <div className="ac-tb">
        <button className="ac-tb-btn" onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onSizeChange(fmtId, id, -1); }}>A−</button>
        <div className="ac-tb-sep" />
        <button className="ac-tb-btn" onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onSizeChange(fmtId, id, 1); }}>A+</button>
      </div>
    );
  }

  const ctaPad = fmtId==='quer'?'10px 26px':fmtId==='hoch'?'5px 12px':fmtId==='wide'?'10px 22px':fmtId==='med'?'6px 14px':'8px 20px';

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', flexShrink: 0 }}
         className={`ac-ad ${bgStyleMode} ${animClass}`}>
      {/* Background */}
      {bgImage
        ? <div className="ac-bg" style={{ backgroundImage: `url(${bgImage})`, backgroundPosition: bgPos, filter: `brightness(${bgBrightness/100})` }} />
        : <div className="ac-bg" style={{ background: colors.bg }} />
      }
      {/* Overlay */}
      {bgStyle === 'overlay' && bgImage && (
        <div className="ac-ov" style={{ background: `linear-gradient(135deg, ${colors.bg}ee 0%, ${colors.bg}99 60%, ${colors.bg}55 100%)` }} />
      )}
      {/* Pure */}
      {bgStyle === 'pure' && (
        <div style={{ position: 'absolute', inset: 0, background: colors.bg }} />
      )}
      {/* Split color block */}
      {bgStyle === 'split' && (
        <div className="ac-sc" style={{ background: colors.bg }} />
      )}

      {/* Drag layer */}
      <div ref={layerRef} className="ac-dl" onClick={() => onSelect(fmtId, '')}>

        {/* Logo */}
        <div className={elCls('logo')} style={elStyle('logo')} onMouseDown={e => handleDown('logo', e)}>
          <Toolbar id="logo" />
          {logoMode === 'image' && logoUrl
            ? <img src={proxyUrl(logoUrl)} alt="logo"
                   style={{ height: sz.logo * 2, width: 'auto', maxWidth: 130, objectFit: 'contain', background: 'rgba(255,255,255,0.85)', borderRadius: 3, display: 'block' }}
                   onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            : <span className="ac-logo-txt" style={{ fontSize: sz.logo, fontFamily: hlFamily, fontWeight: adBold ? 700 : 600, color: colors.logo }}>{logoText || 'Logo'}</span>
          }
        </div>

        {/* Headline */}
        <div className={elCls('hl')} style={elStyle('hl', { maxWidth: fmtId==='quer'?'60%':fmtId==='hoch'?'82%':fmtId==='wide'?'52%':'86%' })} onMouseDown={e => handleDown('hl', e)}>
          <Toolbar id="hl" />
          <div className="ac-hl" style={{ fontSize: sz.hl, fontFamily: hlFamily, fontWeight: adBold ? 700 : 300, color: colors.hl, lineHeight: 1.15 }}>
            {headline || 'Ihre Werbebotschaft'}
          </div>
        </div>

        {/* Subline */}
        {subline && (
          <div className={elCls('sub')} style={elStyle('sub')} onMouseDown={e => handleDown('sub', e)}>
            <Toolbar id="sub" />
            <div className="ac-sub" style={{ fontSize: sz.sub, fontFamily: bodyFamily, color: colors.sub }}>{subline}</div>
          </div>
        )}

        {/* CTA */}
        <div className={elCls('cta')} style={elStyle('cta')} onMouseDown={e => handleDown('cta', e)}>
          <Toolbar id="cta" />
          <span className="ac-cta" style={{ fontSize: sz.cta, color: colors.ctaTxt, background: colors.ctaBg, padding: ctaPad, fontFamily: bodyFamily }}>
            {cta || 'Mehr erfahren'}
          </span>
        </div>

        {/* Domain */}
        {domain && (
          <div className={elCls('domain')} style={elStyle('domain')} onMouseDown={e => handleDown('domain', e)}>
            <Toolbar id="domain" />
            <span className="ac-domain" style={{ fontSize: sz.domain, fontFamily: bodyFamily, opacity: fmtId==='quer'?0.55:0.5 }}>{domain}</span>
          </div>
        )}

        {/* QR */}
        {lpUrl && (
          <div className={elCls('qr')} style={elStyle('qr')} onMouseDown={e => handleDown('qr', e)}>
            <Toolbar id="qr" />
            <div className="ac-qr" style={{ width: sz.qr, height: sz.qr, padding: 3 }}>
              <QRCodeSVG value={lpUrl.startsWith('http') ? lpUrl : 'https://' + lpUrl} size={sz.qr - 6} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quality dot ────────────────────────────────────────────────────────────────
function QualDot({ q }: { q: 'good'|'warn'|'bad'|null }) {
  if (!q) return null;
  const cls   = q === 'good' ? 'ac-qdot-g' : q === 'warn' ? 'ac-qdot-w' : 'ac-qdot-b';
  const label = q === 'good' ? 'Gute Qualität' : q === 'warn' ? 'Mittlere Qualität' : 'Schlechte Qualität';
  return <div className="ac-qual-row"><div className={`ac-qdot ${cls}`} /><span className="ac-qual-txt">{label}</span></div>;
}

// ── Focus grid ─────────────────────────────────────────────────────────────────
function FocusGrid({ fmtId, bgImage, pos, onFocus }: {
  fmtId: string;
  bgImage: string;
  pos: string;
  onFocus: (fmtId: string, col: number, row: number) => void;
}) {
  const [px, py] = pos.split(' ');
  const xs = ['25%','50%','75%'];
  const ys = ['25%','50%','75%'];
  const activeCol = xs.indexOf(px);
  const activeRow = ys.indexOf(py);
  return (
    <div className="ac-focus-wrap">
      {bgImage && <div className="ac-focus-bg" style={{ backgroundImage: `url(${proxyUrl(bgImage)})` }} />}
      <div className="ac-focus-inner">
        {[0,1,2].flatMap(r => [0,1,2].map(c => (
          <div key={`${r}-${c}`}
               className={`ac-fcell${r===activeRow && c===activeCol ? ' active' : ''}`}
               onClick={() => onFocus(fmtId, c, r)} />
        )))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Step5AdCreator({ briefing, updateBriefing, nextStep }: Props) {
  const ana    = briefing.analysis;
  const domain = extractDomain(briefing.url);

  // Suggestion arrays from Gemini analysis
  const suggestedHeadlines: Array<{ text: string; tag: string }> =
    (ana?.headlines ?? []).map((h, i) => ({ text: h, tag: String(i + 1) }));
  const suggestedSublines: Array<{ text: string; tag: string }> =
    (ana?.sublines ?? []).map((s, i) => ({ text: s, tag: String(i + 1) }));

  // Extract initial theme color before useState (used as default for colors.bg)
  const themeColor = ana?.themeColor || '#C1666B';

  // ── State ────────────────────────────────────────────────────────────────
  const [tab,        setTab]        = useState<'dooh'|'display'>('dooh');
  const [headline,   setHeadline]   = useState(briefing.adHeadline   || ana?.headlines?.[0] || '');
  const [subline,    setSubline]    = useState(briefing.adSubline     || ana?.sublines?.[0]  || '');
  const [cta,        setCta]        = useState(briefing.adCta         || ana?.ctaText        || 'Mehr erfahren');
  const [lpUrl,      setLpUrl]      = useState(briefing.url           || '');
  const [logoMode,   setLogoMode]   = useState<'text'|'image'>(briefing.adLogoMode  || 'image');
  const [logoUrl,    setLogoUrl]    = useState(briefing.adLogoImageData || '');
  const [logoText,   setLogoText]   = useState(briefing.adLogoText    || ana?.organisation  || '');
  const [logoQual,   setLogoQual]   = useState<'good'|'warn'|'bad'|null>(null);
  const [bgImage,    setBgImage]    = useState(briefing.adBgImageData || '');
  const [bgUrlInput, setBgUrlInput] = useState(ana?.ogImage || '');
  const [bgStyle,    setBgStyle]    = useState<'overlay'|'pure'|'split'>(briefing.adBgStyle || 'overlay');
  const [bgBright,   setBgBright]   = useState(100);
  const [bgQual,     setBgQual]     = useState<'good'|'warn'|'bad'|null>(null);
  const [bgPosByFmt, setBgPosByFmt] = useState<Record<string, string>>(
    Object.fromEntries(['quer','hoch','wide','med','tall'].map(f => [f, '50% 50%']))
  );
  const [adFont,  setAdFont]  = useState(briefing.adFont || '');
  const [adBold,  setAdBold]  = useState(false);
  const [animation, setAnimation] = useState(briefing.adAnimation || 'none');
  const [colors,  setColors]  = useState<Colors>({
    bg:     briefing.adBgColor     || themeColor,
    hl:     briefing.adTextColor   || '#FFFFFF',
    sub:    '#FFFFFF',
    logo:   '#FFFFFF',
    ctaTxt: '#000000',
    ctaBg:  briefing.adAccentColor || '#FFFFFF',
    domain: '#FFFFFF',
  });
  const [positions, setPositions] = useState<AllPositions>(structuredClone(DEF_POS));
  const [sizes,     setSizes]     = useState<AllSizes>(structuredClone(DEF_SIZE));
  const [selectedEl, setSelectedEl] = useState<string|null>(null);

  const dragRef    = useRef<DragState|null>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef   = useRef<HTMLInputElement>(null);
  const logoProbed  = useRef(false);
  const bgProbed    = useRef(false);
  const colorApplied = useRef(false);

  // ── Font options (detect from analysis) ──────────────────────────────────
  const detectedFont = ana?.fontFamily || null;
  const fontOptions: string[] = [];
  if (detectedFont) {
    fontOptions.push(detectedFont);
    const similars = FONT_SIMILAR[detectedFont] ?? FONT_SIMILAR['default'];
    fontOptions.push(...similars.slice(0, 2));
  }

  // ── Logo probe on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (logoProbed.current) return;
    logoProbed.current = true;
    if (briefing.adLogoImageData) {
      setLogoMode('image');
      checkLogoQuality(briefing.adLogoImageData).then(setLogoQual);
      return;
    }
    const baseUrl = (() => {
      try { const u = new URL(briefing.url.startsWith('http') ? briefing.url : 'https://' + briefing.url); return u.origin; }
      catch { return ''; }
    })();
    const candidates = [
      baseUrl ? `${baseUrl}/apple-touch-icon.png` : '',
      baseUrl ? `${baseUrl}/apple-touch-icon-precomposed.png` : '',
      ana?.ogLogo || '',
      ana?.favicon || '',
    ].filter(Boolean);
    (async () => {
      for (const url of candidates) {
        const ok = await checkImgUrl(proxyUrl(url));
        if (ok) {
          setLogoUrl(url);
          setLogoMode('image');
          const q = await checkLogoQuality(proxyUrl(url));
          setLogoQual(q);
          return;
        }
      }
      setLogoMode('text');
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── BG image on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    if (bgProbed.current || briefing.adBgImageData) return;
    bgProbed.current = true;
    const ogImg = ana?.ogImage || '';
    if (!ogImg) return;
    checkImgUrl(proxyUrl(ogImg)).then(ok => {
      if (ok) {
        setBgImage(ogImg);
        setBgUrlInput(ogImg);
        checkImgQuality(proxyUrl(ogImg)).then(setBgQual);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Theme color on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (colorApplied.current) return;
    colorApplied.current = true;
    if (briefing.adBgColor) return;
    setColors(c => ({ ...c, bg: themeColor }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag logic ───────────────────────────────────────────────────────────
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

  // ── BG image handlers ─────────────────────────────────────────────────────
  function handleBgFile(file: File) {
    const reader = new FileReader();
    reader.onload = ev => {
      const data = ev.target?.result as string;
      setBgImage(data);
      setBgUrlInput('');
      checkImgQuality(data).then(setBgQual);
    };
    reader.readAsDataURL(file);
  }

  function handleBgUrl(url: string) {
    setBgUrlInput(url);
    if (!url) { setBgImage(''); setBgQual(null); return; }
    checkImgUrl(proxyUrl(url)).then(ok => {
      if (ok) { setBgImage(url); checkImgQuality(proxyUrl(url)).then(setBgQual); }
      else setBgQual('bad');
    });
  }

  // ── Logo file handler ─────────────────────────────────────────────────────
  function handleLogoFile(file: File) {
    const reader = new FileReader();
    reader.onload = ev => {
      const data = ev.target?.result as string;
      setLogoUrl(data);
      setLogoMode('image');
      checkLogoQuality(data).then(setLogoQual);
    };
    reader.readAsDataURL(file);
  }

  // ── Focus grid handler ────────────────────────────────────────────────────
  function handleFocus(fmtId: string, col: number, row: number) {
    const x = ['25%','50%','75%'][col];
    const y = ['25%','25%','75%'][row] || '50%';
    const positions3 = { 0: '25%', 1: '50%', 2: '75%' } as Record<number, string>;
    setBgPosByFmt(p => ({ ...p, [fmtId]: `${positions3[col]} ${positions3[row]}` }));
  }

  // ── Shared AdPreview props ────────────────────────────────────────────────
  function mkProps(fmtId: string) {
    return {
      fmtId,
      bgImage: bgImage ? proxyUrl(bgImage) : '',
      bgStyle,
      bgBrightness: bgBright,
      bgPos: bgPosByFmt[fmtId] || '50% 50%',
      colors,
      headline,
      subline,
      cta,
      lpUrl,
      logoMode,
      logoUrl,
      logoText,
      adFont,
      adBold,
      animation,
      positions: positions[fmtId] ?? DEF_POS[fmtId],
      sizes:     sizes[fmtId]     ?? DEF_SIZE[fmtId],
      onDragStart: handleDragStart,
      onSelect: handleSelect,
      selectedEl,
      onSizeChange: handleSizeChange,
    };
  }

  // ── Save & proceed ────────────────────────────────────────────────────────
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
      adLogoText:      logoText,
      adLogoImageData: logoMode === 'image' ? logoUrl : undefined,
      adBgImageData:   bgImage || undefined,
      adFont:          adFont  || undefined,
      adAnimation:     animation,
      adPositionsQuer: positions.quer as unknown as Record<string, { x: number; y: number }>,
      adPositionsHoch: positions.hoch as unknown as Record<string, { x: number; y: number }>,
      werbemittel:          'erstellen',
      werbemittelErstellt:  true,
    });
    nextStep();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="ad-creator">

      {/* ═══════════ SIDEBAR ═══════════ */}
      <div className="ac-sidebar">

        {/* 1. Crawl-card – read only */}
        <div className="ac-crawl-card" style={{ marginBottom: 14 }}>
          <div className="ac-crawl-label">Website-Analyse</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#5C4F3D', fontWeight: 600 }}>{domain}</span>
            <span style={{ fontSize: 10, color: '#3A9E7A', fontWeight: 600, background: '#F0FFF6', border: '1px solid #B8E8CC', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' }}>
              Analyse abgeschlossen ✓
            </span>
          </div>
          {ana?.organisation && (
            <div style={{ fontSize: 11, color: '#8a7a67', marginTop: 4 }}>{ana.organisation}</div>
          )}
        </div>

        {/* 2. Kampagne */}
        <div className="ac-stitle">Kampagne</div>

        <div className="ac-fg">
          <label>Organisation</label>
          <input className="ac-inp" value={logoText} onChange={e => setLogoText(e.target.value)} placeholder="Ihr Unternehmen" />
        </div>

        <div className="ac-fg">
          <label>Headline</label>
          {suggestedHeadlines.length > 0 && (
            <div className="ac-sug-wrap" style={{ marginBottom: 5 }}>
              {suggestedHeadlines.map(s => (
                <div key={s.text}
                     className={`ac-sug-chip${headline === s.text ? ' active' : ''}`}
                     onClick={() => setHeadline(s.text)}>
                  <span className="ac-hl-txt">{s.text}</span>
                  <span className="ac-sug-tag">#{s.tag}</span>
                </div>
              ))}
            </div>
          )}
          <input className="ac-inp" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Ihre Werbebotschaft" />
        </div>

        <div className="ac-fg">
          <label>Subline</label>
          {suggestedSublines.length > 0 && (
            <div className="ac-sug-wrap" style={{ marginBottom: 5 }}>
              {suggestedSublines.map(s => (
                <div key={s.text}
                     className={`ac-sug-chip${subline === s.text ? ' active' : ''}`}
                     onClick={() => setSubline(s.text)}>
                  <span style={{ flex: 1, fontSize: 12 }}>{s.text}</span>
                  <span className="ac-sug-tag">#{s.tag}</span>
                </div>
              ))}
            </div>
          )}
          <input className="ac-inp" value={subline} onChange={e => setSubline(e.target.value)} placeholder="Kurze Ergänzung (optional)" />
        </div>

        <div className="ac-fg">
          <label>CTA-Button</label>
          <input className="ac-inp" value={cta} onChange={e => setCta(e.target.value)} placeholder="Mehr erfahren" />
        </div>

        <div className="ac-fg" style={{ marginBottom: 14 }}>
          <label>Ziel-URL</label>
          <input className="ac-inp" value={lpUrl} onChange={e => setLpUrl(e.target.value)} placeholder="https://…" />
        </div>

        {/* 3. Logo */}
        <div className="ac-stitle">Logo</div>
        <div className="ac-logo-mode" style={{ marginBottom: 8 }}>
          <button className={`ac-logo-mode-btn${logoMode === 'image' ? ' active' : ''}`} onClick={() => setLogoMode('image')}>Bild-Logo</button>
          <button className={`ac-logo-mode-btn${logoMode === 'text'  ? ' active' : ''}`} onClick={() => setLogoMode('text')}>Text-Logo</button>
        </div>

        {logoMode === 'image' ? (
          <div style={{ marginBottom: 14 }}>
            {logoUrl ? (
              <div className="ac-upload loaded" style={{ marginBottom: 6 }} onClick={() => logoFileRef.current?.click()}>
                <img src={proxyUrl(logoUrl)} alt="logo" style={{ height: 52, width: '100%', objectFit: 'contain', padding: 6 }} />
                <div className="ac-upload-hover">Ändern</div>
              </div>
            ) : (
              <div className="ac-upload" style={{ marginBottom: 6 }} onClick={() => logoFileRef.current?.click()}>
                <span style={{ fontSize: 20 }}>🖼️</span>
                <span style={{ fontSize: 11, color: '#8a7a67' }}>Logo hochladen</span>
                <span style={{ fontSize: 10, color: '#a8a096' }}>PNG oder SVG empfohlen</span>
              </div>
            )}
            <QualDot q={logoQual} />
            <input ref={logoFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                   onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }} />
          </div>
        ) : (
          <div className="ac-fg" style={{ marginBottom: 14 }}>
            <input className="ac-inp" value={logoText} onChange={e => setLogoText(e.target.value)} placeholder="Firmenname" />
          </div>
        )}

        {/* 4. Hintergrundbild */}
        <div className="ac-stitle">Hintergrundbild</div>
        {bgImage && (
          <img src={proxyUrl(bgImage)} alt="Hintergrund" className="ac-img-thumb" />
        )}
        <div className="ac-img-row" style={{ marginBottom: 5 }}>
          <input className="ac-img-inp" value={bgUrlInput} onChange={e => handleBgUrl(e.target.value)} placeholder="Bild-URL einfügen…" />
          <button className="ac-img-upload" onClick={() => bgFileRef.current?.click()} title="Datei hochladen">📷</button>
        </div>
        <QualDot q={bgQual} />
        <input ref={bgFileRef} type="file" accept="image/*" style={{ display: 'none' }}
               onChange={e => { const f = e.target.files?.[0]; if (f) handleBgFile(f); }} />

        <div className="ac-fg" style={{ marginTop: 8 }}>
          <label>Helligkeit {bgBright}%</label>
          <input type="range" min={20} max={160} value={bgBright} onChange={e => setBgBright(+e.target.value)} />
        </div>

        <div className="ac-fg" style={{ marginBottom: 14 }}>
          <label>Stil</label>
          <div className="ac-style-row">
            {(['overlay','pure','split'] as const).map(s => (
              <button key={s} className={`ac-style-btn${bgStyle === s ? ' active' : ''}`} onClick={() => setBgStyle(s)}>
                {s === 'overlay' ? 'Overlay' : s === 'pure' ? 'Vollton' : 'Split'}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Schrift – hidden if no font detected */}
        {fontOptions.length > 0 && (
          <>
            <div className="ac-stitle">Schrift</div>
            <div className="ac-font-grid" style={{ marginBottom: 6 }}>
              {fontOptions.map(f => (
                <button key={f} className={`ac-font-btn${adFont === f ? ' active' : ''}`} onClick={() => setAdFont(f)}>
                  <span style={{ fontFamily: f, fontSize: 16, fontWeight: SERIF_FONTS.includes(f) ? 300 : 500 }}>Aa</span>
                  <span style={{ fontSize: 9, color: '#8a7a67', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{f}</span>
                </button>
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5C4F3D', cursor: 'pointer', marginBottom: 14 }}>
              <input type="checkbox" checked={adBold} onChange={e => setAdBold(e.target.checked)} />
              Fett
            </label>
          </>
        )}

        {/* 6. Farben */}
        <div className="ac-stitle">Farben</div>
        {ana?.themeColor && (
          <div style={{ fontSize: 10, color: '#3A9E7A', background: '#F0FFF6', border: '1px solid #B8E8CC', borderRadius: 5, padding: '4px 8px', marginBottom: 8 }}>
            ✓ Markenfarbe aus Website erkannt
          </div>
        )}
        <div className="ac-color-grid" style={{ marginBottom: 14 }}>
          {([
            ['bg',     'Hintergrund'],
            ['hl',     'Headline'],
            ['sub',    'Subline'],
            ['logo',   'Logo-Text'],
            ['ctaBg',  'CTA Bg'],
            ['ctaTxt', 'CTA Text'],
            ['domain', 'Domain'],
          ] as [keyof Colors, string][]).map(([k, lbl]) => (
            <div key={k} className="ac-ci">
              <label>{lbl}</label>
              <div className="ac-ci-row">
                <div className="ac-swatch" style={{ background: colors[k] }}>
                  <input type="color" value={colors[k]} onChange={e => setColors(c => ({ ...c, [k]: e.target.value }))} />
                </div>
              </div>
              <span className="ac-hex-lbl">{colors[k]}</span>
            </div>
          ))}
        </div>

        {/* 7. Bewegung */}
        <div className="ac-stitle">Bewegung</div>
        <div className="ac-anim-grid" style={{ marginBottom: 20 }}>
          {([
            ['none', 'Statisch', '—'],
            ['cta',  'CTA',      '💥'],
            ['hl',   'Headline', '✨'],
            ['qr',   'QR-Code',  '📱'],
          ] as const).map(([v, lbl, icon]) => (
            <button key={v} className={`ac-anim-btn${animation === v ? ' active' : ''}`} onClick={() => setAnimation(v)}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span>{lbl}</span>
            </button>
          ))}
        </div>

        {/* Submit */}
        <div className="ac-submit-sec">
          <button className="ac-btn-p" onClick={handleNext}>Weiter →</button>
          <button className="ac-btn-s" onClick={() => { updateBriefing({ werbemittel: 'spaeter' }); nextStep(); }}>
            Später einschicken
          </button>
        </div>
      </div>

      {/* ═══════════ CANVAS ═══════════ */}
      <div className="ac-canvas">
        {/* Tab bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="ac-tabs">
            <button className={`ac-tab${tab === 'dooh'    ? ' active' : ''}`} onClick={() => setTab('dooh')}>DOOH</button>
            <button className={`ac-tab${tab === 'display' ? ' active' : ''}`} onClick={() => setTab('display')}>Display</button>
          </div>
          <span style={{ fontSize: 11, color: '#8a7a67' }}>
            {tab === 'dooh' ? 'Digitale Plakatwände' : 'Online-Banner'}
          </span>
        </div>

        {/* ── DOOH tab ── */}
        {tab === 'dooh' && (
          <>
            {/* Querformat 1920×1080 @ 845×475 */}
            <div className="ac-format-card">
              <div className="ac-format-header">
                <span className="ac-format-name">Querformat</span>
                <span className="ac-format-spec ac-pcard-dim">1920 × 1080 px</span>
              </div>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: 6 }}>
                <AdPreview {...mkProps('quer')} width={845} height={475} />
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: '#8a7a67', marginBottom: 4, fontWeight: 600 }}>Bildfokus</div>
                <FocusGrid fmtId="quer" bgImage={bgImage} pos={bgPosByFmt['quer']} onFocus={handleFocus} />
              </div>
            </div>

            {/* Hochformat 1080×1920 @ 259×461 */}
            <div className="ac-format-card">
              <div className="ac-format-header">
                <span className="ac-format-name">Hochformat</span>
                <span className="ac-format-spec ac-pcard-dim">1080 × 1920 px</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
                <div style={{ position: 'relative', width: 259, height: 461, overflow: 'hidden', borderRadius: 6, flexShrink: 0 }}>
                  <AdPreview {...mkProps('hoch')} width={259} height={461} />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: '#8a7a67', marginBottom: 4, fontWeight: 600 }}>Bildfokus</div>
                <FocusGrid fmtId="hoch" bgImage={bgImage} pos={bgPosByFmt['hoch']} onFocus={handleFocus} />
              </div>
            </div>
          </>
        )}

        {/* ── Display tab ── */}
        {tab === 'display' && (
          <>
            {/* Billboard 970×250 scaled to 820×212 */}
            <div className="ac-format-card">
              <div className="ac-format-header">
                <span className="ac-format-name">Billboard</span>
                <span className="ac-format-spec ac-pcard-dim">970 × 250 px</span>
              </div>
              <div style={{ width: '100%', height: 211, overflow: 'hidden', borderRadius: 6, position: 'relative' }}>
                <div style={{ transform: 'scale(0.845)', transformOrigin: 'top left', width: 970, height: 250, position: 'absolute' }}>
                  <AdPreview {...mkProps('wide')} width={970} height={250} />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: '#8a7a67', marginBottom: 4, fontWeight: 600 }}>Bildfokus</div>
                <FocusGrid fmtId="wide" bgImage={bgImage} pos={bgPosByFmt['wide']} onFocus={handleFocus} />
              </div>
            </div>

            {/* Med 300×250 + Tall 300×600 */}
            <div className="ac-format-card">
              <div className="ac-format-header">
                <span className="ac-format-name">Display-Formate</span>
                <span className="ac-format-spec ac-pcard-dim">300 × 250 · 300 × 600</span>
              </div>
              <div style={{ display: 'flex', gap: 20, justifyContent: 'center', padding: '14px 0', alignItems: 'flex-start' }}>
                {/* Med */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ position: 'relative', width: 180, height: 150, overflow: 'hidden', borderRadius: 6 }}>
                    <div style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: 300, height: 250, position: 'absolute' }}>
                      <AdPreview {...mkProps('med')} width={300} height={250} />
                    </div>
                  </div>
                  <span className="ac-dim-lbl">300 × 250</span>
                </div>
                {/* Tall */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ position: 'relative', width: 90, height: 180, overflow: 'hidden', borderRadius: 6 }}>
                    <div style={{ transform: 'scale(0.3)', transformOrigin: 'top left', width: 300, height: 600, position: 'absolute' }}>
                      <AdPreview {...mkProps('tall')} width={300} height={600} />
                    </div>
                  </div>
                  <span className="ac-dim-lbl">300 × 600</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#8a7a67', marginBottom: 4, fontWeight: 600 }}>Fokus 300×250</div>
                  <FocusGrid fmtId="med" bgImage={bgImage} pos={bgPosByFmt['med']} onFocus={handleFocus} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#8a7a67', marginBottom: 4, fontWeight: 600 }}>Fokus 300×600</div>
                  <FocusGrid fmtId="tall" bgImage={bgImage} pos={bgPosByFmt['tall']} onFocus={handleFocus} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
