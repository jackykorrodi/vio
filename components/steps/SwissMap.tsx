'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';

// Swiss official BFS canton numbers → display names
const CANTON_ID_TO_NAME: Record<number, string> = {
  1: 'Zürich', 2: 'Bern', 3: 'Luzern', 4: 'Uri', 5: 'Schwyz',
  6: 'Obwalden', 7: 'Nidwalden', 8: 'Glarus', 9: 'Zug', 10: 'Freiburg',
  11: 'Solothurn', 12: 'Basel-Stadt', 13: 'Basel-Landschaft', 14: 'Schaffhausen',
  15: 'Appenzell A.Rh.', 16: 'Appenzell I.Rh.', 17: 'St. Gallen', 18: 'Graubünden',
  19: 'Aargau', 20: 'Thurgau', 21: 'Tessin', 22: 'Waadt', 23: 'Wallis',
  24: 'Neuenburg', 25: 'Genf', 26: 'Jura',
};

// Stadt → parent canton (for map zoom)
const STADT_TO_KANTON: Record<string, string> = {
  'Zürich (Stadt)': 'Zürich',
  'Bern (Stadt)': 'Bern',
  'Basel (Stadt)': 'Basel-Stadt',
  'Lausanne': 'Waadt',
  'Genf (Stadt)': 'Genf',
  'Winterthur': 'Zürich',
  'Luzern (Stadt)': 'Luzern',
  'St. Gallen (Stadt)': 'St. Gallen',
  'Lugano': 'Tessin',
  'Biel/Bienne': 'Bern',
  'Thun': 'Bern',
  'Köniz': 'Bern',
  'La Chaux-de-Fonds': 'Neuenburg',
  'Schaffhausen (Stadt)': 'Schaffhausen',
  'Freiburg (Stadt)': 'Freiburg',
  'Chur': 'Graubünden',
  'Uster': 'Zürich',
  'Vernier': 'Genf',
  'Sion': 'Wallis',
  'Emmen': 'Luzern',
};

interface Props {
  highlightRegion: string | null;
  campaignType: 'b2c' | 'b2b' | 'politik';
  reachFraction: number;
  width?: number;
  height?: number;
}

export default function SwissMap({
  highlightRegion,
  campaignType,
  reachFraction,
  width = 560,
  height = 340,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Stores the screen bounds of the highlighted region for stick figure scattering
  const figBoundsRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  // Highlight all cantons when not politik, or when region is "Gesamte Schweiz"
  const highlightAll =
    campaignType !== 'politik' || highlightRegion === 'Gesamte Schweiz';

  // Resolve Stadt → Kanton for map zoom
  const cantonToHighlight = highlightRegion
    ? (STADT_TO_KANTON[highlightRegion] ?? (
        Object.values(CANTON_ID_TO_NAME).includes(highlightRegion) ? highlightRegion : null
      ))
    : null;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    figBoundsRef.current = null;

    // Dynamic import of TopoJSON data
    import('swiss-maps/2020/ch-combined.json').then((mod) => {
      const chData = mod.default as unknown as Topology<{
        cantons: GeometryCollection;
        country: GeometryCollection;
        lakes: GeometryCollection;
      }>;

      const cantonFeatures = topojson.feature(chData, chData.objects.cantons);
      const countryFeature = topojson.feature(chData, chData.objects.country);
      const lakeFeature = topojson.feature(chData, chData.objects.lakes);

      // Find the selected canton feature (for zoom)
      const selectedFeature = !highlightAll && cantonToHighlight
        ? (cantonFeatures as d3.ExtendedFeatureCollection).features.find(
            (f) => CANTON_ID_TO_NAME[(f as d3.ExtendedFeature).id as number] === cantonToHighlight
          )
        : null;

      const PAD = 30;
      const projection = selectedFeature
        ? d3.geoMercator().fitExtent([[PAD, PAD], [width - PAD, height - PAD]], selectedFeature as d3.ExtendedFeature)
        : d3.geoMercator().fitSize([width, height], cantonFeatures);
      const pathGen = d3.geoPath().projection(projection);

      // Store screen bounds of selected feature for stick figure scattering
      if (selectedFeature) {
        const [[bx0, by0], [bx1, by1]] = pathGen.bounds(selectedFeature as d3.ExtendedFeature);
        figBoundsRef.current = { x0: bx0, y0: by0, x1: bx1, y1: by1 };
      } else {
        figBoundsRef.current = null;
      }

      // Draw country background (subtle shadow fill)
      svg
        .append('g')
        .selectAll('path')
        .data((countryFeature as d3.ExtendedFeatureCollection).features)
        .enter()
        .append('path')
        .attr('d', pathGen)
        .attr('fill', '#EDE8E0')
        .attr('stroke', 'none');

      // Draw canton paths
      svg
        .append('g')
        .selectAll('path')
        .data((cantonFeatures as d3.ExtendedFeatureCollection).features)
        .enter()
        .append('path')
        .attr('d', pathGen)
        .attr('fill', (f) => {
          const id = (f as d3.ExtendedFeature).id as number;
          const name = CANTON_ID_TO_NAME[id];
          if (highlightAll) return '#EDE8DF';
          if (name === cantonToHighlight) return '#EDE8DF';
          return '#EDE8E0';
        })
        .attr('stroke', (f) => {
          const id = (f as d3.ExtendedFeature).id as number;
          const name = CANTON_ID_TO_NAME[id];
          if (highlightAll) return '#C1666B';
          if (name === cantonToHighlight) return '#C1666B';
          return '#fff';
        })
        .attr('stroke-width', (f) => {
          const id = (f as d3.ExtendedFeature).id as number;
          const name = CANTON_ID_TO_NAME[id];
          if (highlightAll) return 2;
          if (name === cantonToHighlight) return 2;
          return 1;
        });

      // Draw lakes
      svg
        .append('g')
        .selectAll('path')
        .data((lakeFeature as d3.ExtendedFeatureCollection).features)
        .enter()
        .append('path')
        .attr('d', pathGen)
        .attr('fill', '#A8C8E0')
        .attr('stroke', 'none')
        .attr('opacity', 0.5);

      // Now draw stick figures on canvas
      drawStickFigures();
    }).catch((err) => {
      console.error('SwissMap: failed to load TopoJSON', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightRegion, campaignType, width, height]);

  // Redraw canvas when reachFraction changes (or deps above)
  useEffect(() => {
    drawStickFigures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reachFraction, width, height]);

  function drawStickFigures() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const TOTAL = 200;
    const litCount = Math.round(TOTAL * Math.min(1, Math.max(0, reachFraction)));

    // Use a seeded-ish layout: scatter deterministically so figures don't jump on re-render
    function lcg(seed: number) {
      let s = seed;
      return () => {
        s = (1664525 * s + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
      };
    }
    const rand = lcg(42);

    // Scatter within highlighted region bounds, or full map if no specific region
    const bounds = figBoundsRef.current;
    const FIG_H = 10;
    const MARGIN = 10;

    const scatterX0 = bounds ? bounds.x0 + MARGIN : MARGIN;
    const scatterY0 = bounds ? bounds.y0 + MARGIN : MARGIN;
    const scatterW  = bounds ? Math.max(1, bounds.x1 - bounds.x0 - MARGIN * 2) : width - MARGIN * 2;
    const scatterH  = bounds ? Math.max(1, bounds.y1 - bounds.y0 - MARGIN * 2) : height - MARGIN * 2;

    for (let i = 0; i < TOTAL; i++) {
      const x = scatterX0 + rand() * scatterW;
      const y = scatterY0 + rand() * scatterH;
      const lit = i < litCount;
      drawFigure(ctx, x, y, FIG_H, lit);
    }
  }

  function drawFigure(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    h: number,
    lit: boolean,
  ) {
    const color = lit ? '#C1666B' : '#D4CEC4';
    const headR = h * 0.2;
    const torsoLen = h * 0.3;
    const legLen = h * 0.3;
    const armLen = h * 0.22;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;

    // Head
    ctx.beginPath();
    ctx.arc(cx, cy, headR, 0, Math.PI * 2);
    ctx.fill();

    const torsoTop = cy + headR;
    const torsoBot = torsoTop + torsoLen;

    // Torso
    ctx.beginPath();
    ctx.moveTo(cx, torsoTop);
    ctx.lineTo(cx, torsoBot);
    ctx.stroke();

    // Arms
    const armY = torsoTop + torsoLen * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx - armLen, armY + armLen * 0.35);
    ctx.lineTo(cx, armY);
    ctx.lineTo(cx + armLen, armY + armLen * 0.35);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(cx, torsoBot);
    ctx.lineTo(cx - armLen * 0.8, torsoBot + legLen);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, torsoBot);
    ctx.lineTo(cx + armLen * 0.8, torsoBot + legLen);
    ctx.stroke();
  }

  return (
    <div style={{ position: 'relative', width, height, display: 'inline-block' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: 'block' }}
      />
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
