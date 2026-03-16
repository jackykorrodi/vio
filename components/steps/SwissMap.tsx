'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { resolveToKanton } from '@/lib/regions';

// Swiss official BFS canton numbers → display names
const CANTON_ID_TO_NAME: Record<number, string> = {
  1: 'Zürich', 2: 'Bern', 3: 'Luzern', 4: 'Uri', 5: 'Schwyz',
  6: 'Obwalden', 7: 'Nidwalden', 8: 'Glarus', 9: 'Zug', 10: 'Freiburg',
  11: 'Solothurn', 12: 'Basel-Stadt', 13: 'Basel-Landschaft', 14: 'Schaffhausen',
  15: 'Appenzell A.Rh.', 16: 'Appenzell I.Rh.', 17: 'St. Gallen', 18: 'Graubünden',
  19: 'Aargau', 20: 'Thurgau', 21: 'Tessin', 22: 'Waadt', 23: 'Wallis',
  24: 'Neuenburg', 25: 'Genf', 26: 'Jura',
};

interface Props {
  /** Region names to highlight — for politik campaigns. Pass [] for B2C/B2B (highlights all). */
  highlightRegions: string[];
  campaignType: 'b2c' | 'b2b' | 'politik';
  reachFraction: number;
  width?: number;
  height?: number;
}

export default function SwissMap({
  highlightRegions,
  campaignType,
  reachFraction,
  width = 560,
  height = 340,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Stores the unioned screen bounds of all highlighted regions for stick figure scattering
  const figBoundsRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  // Highlight all cantons when not politik, or when Gesamte Schweiz is selected, or no regions selected
  const highlightAll =
    campaignType !== 'politik' ||
    highlightRegions.length === 0 ||
    highlightRegions.includes('Gesamte Schweiz');

  // Resolve all selected region names → distinct canton names for map highlighting
  const cantonsToHighlight = Array.from(new Set(
    highlightRegions.flatMap(name => {
      const kanton = resolveToKanton(name);
      return kanton ? [kanton] : [];
    })
  ));

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

      // Find all highlighted canton features (for zoom + bounds)
      const highlightedFeatures = !highlightAll
        ? (cantonFeatures as d3.ExtendedFeatureCollection).features.filter(
            (f) => cantonsToHighlight.includes(CANTON_ID_TO_NAME[(f as d3.ExtendedFeature).id as number])
          )
        : [];

      const PAD = 30;
      let projection: d3.GeoProjection;
      if (highlightedFeatures.length > 0) {
        // Zoom to the union of all highlighted cantons
        const featureCollection = { type: 'FeatureCollection' as const, features: highlightedFeatures };
        projection = d3.geoMercator().fitExtent(
          [[PAD, PAD], [width - PAD, height - PAD]],
          featureCollection as d3.ExtendedFeatureCollection
        );
      } else {
        projection = d3.geoMercator().fitSize([width, height], cantonFeatures);
      }
      const pathGen = d3.geoPath().projection(projection);

      // Union bounding boxes of all highlighted features for stick figure scattering
      if (highlightedFeatures.length > 0) {
        let bounds: { x0: number; y0: number; x1: number; y1: number } | null = null;
        for (const f of highlightedFeatures) {
          const [[bx0, by0], [bx1, by1]] = pathGen.bounds(f as d3.ExtendedFeature);
          bounds = bounds
            ? { x0: Math.min(bounds.x0, bx0), y0: Math.min(bounds.y0, by0), x1: Math.max(bounds.x1, bx1), y1: Math.max(bounds.y1, by1) }
            : { x0: bx0, y0: by0, x1: bx1, y1: by1 };
        }
        figBoundsRef.current = bounds;
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
          const name = CANTON_ID_TO_NAME[(f as d3.ExtendedFeature).id as number];
          if (highlightAll || cantonsToHighlight.includes(name)) return '#EDE8DF';
          return '#EDE8E0';
        })
        .attr('stroke', (f) => {
          const name = CANTON_ID_TO_NAME[(f as d3.ExtendedFeature).id as number];
          if (highlightAll || cantonsToHighlight.includes(name)) return '#C1666B';
          return '#fff';
        })
        .attr('stroke-width', (f) => {
          const name = CANTON_ID_TO_NAME[(f as d3.ExtendedFeature).id as number];
          if (highlightAll || cantonsToHighlight.includes(name)) return 2;
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
  }, [JSON.stringify(highlightRegions), campaignType, width, height]);

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
