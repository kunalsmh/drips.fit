<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { hexbin as d3Hexbin, type HexbinBin } from 'd3-hexbin';
  import { feature } from 'topojson-client';
  import type { FeatureCollection, Geometry } from 'geojson';
  import { goto } from '$app/navigation';

  let svg: SVGSVGElement;

  const width = 800;
  const height = 600;
  const hexRadius = 12;

  const regions = {
    asia:         { regionName: 'ASIA', name: 'Asia', lat: 35.0, lon: 100.0, count: 1 },
    europe:       { regionName: 'EUROPE', name: 'Europe', lat: 54.0, lon: 15.0, count: 0 },
    northAmerica: { regionName: 'NORTH AMERICA', name: 'North America', lat: 45.0, lon: -100.0, count: 1 },
    southAmerica: { regionName: 'SOUTH AMERICA', name: 'South America', lat: -15.0, lon: -60.0, count: 0 },
    middleEast:   { regionName: 'MIDDLE EAST', name: 'Middle East', lat: 25.0, lon: 45.0, count: 0 },
  };

  interface RegionHexbinBin extends HexbinBin<[number, number]> {
    charsCount: number;
    q: number;
    r: number;
    regionName: string;
    slug: string;
  }

  const directions = [
    [1, 0], [1, -1], [0, -1],
    [-1, 0], [-1, 1], [0, 1],
  ];

  function pixelToHex(x: number, y: number): [number, number] {
    const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / hexRadius;
    const r = (2 / 3) * y / hexRadius;
    return [Math.round(q), Math.round(r)];
  }

  function getHexNeighbors(hex: RegionHexbinBin, hexMap: Map<string, RegionHexbinBin>): RegionHexbinBin[] {
    return directions
      .map(([dq, dr]) => hexMap.get(`${hex.q + dq},${hex.r + dr}`))
      .filter((h): h is RegionHexbinBin => h !== undefined);
  }

  onMount(async () => {
    const svgEl = d3.select(svg);
    svgEl.selectAll('*').remove();

    const worldData: any = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    const land = feature(worldData, worldData.objects.land) as unknown as FeatureCollection<Geometry>;

    const projection = d3.geoNaturalEarth1()
      .scale(160)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath(projection);

    svgEl.append('path')
      .datum(land)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', 'none');

    const hexbin = d3Hexbin<[number, number]>()
      .radius(hexRadius)
      .extent([[0, 0], [width, height]]);

    const gridPoints = hexbin.centers();

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const path2d = new Path2D(path(land)!);
    const landPoints = gridPoints.filter(([x, y]) => ctx.isPointInPath(path2d, x, y));

    const hexes: RegionHexbinBin[] = landPoints.map(([x, y]) => {
      const [q, r] = pixelToHex(x, y);
      return { x, y, length: 0, charsCount: 0, q, r, regionName: '', slug: '' } as unknown as RegionHexbinBin;
    });

    const hexMap = new Map<string, RegionHexbinBin>();
    hexes.forEach(hex => hexMap.set(`${hex.q},${hex.r}`, hex));

    // Group regions by shared regionName
    const regionGroups: Record<string, {
      name: string, slug: string, totalCount: number, centers: { lat: number, lon: number }[]
    }> = {};

    for (const reg of Object.values(regions)) {
      const key = reg.regionName;
      const slug = key.toLowerCase().replace(/\s+/g, '-');
      if (!regionGroups[key]) {
        regionGroups[key] = { name: key, slug, totalCount: 0, centers: [] };
      }
      regionGroups[key].totalCount += reg.count;
      regionGroups[key].centers.push({ lat: reg.lat, lon: reg.lon });
    }

  // (regionHexes is now defined later, after region assignment)

    for (const group of Object.values(regionGroups)) {
      const counts = group.centers.map(() => 0);
      for (let i = 0; i < group.totalCount; i++) {
        counts[i % counts.length]++;
      }

      group.centers.forEach(({ lat, lon }, i) => {
        const [x, y] = projection([lon, lat])!;
        let nearestHex: RegionHexbinBin | null = null;
        let minDist = Infinity;
        hexes.forEach(hex => {
          const dist = Math.hypot(hex.x - x, hex.y - y);
          if (dist < minDist) {
            minDist = dist;
            nearestHex = hex;
          }
        });

        if (nearestHex !== null) {
          (nearestHex as RegionHexbinBin).charsCount = counts[i];
          (nearestHex as RegionHexbinBin).regionName = group.name;
          (nearestHex as RegionHexbinBin).slug = group.slug;
        }
      });
    }

    // --- Breadth-first expansion for region hexes ---
    const extendedHexMap = new Map(hexMap);
    const additionalHexes: RegionHexbinBin[] = [];
    const regionHexes = hexes.filter(h => h.charsCount > 3);
    regionHexes.forEach(mainHex => {
      let remaining = mainHex.charsCount;
      if (remaining <= 3) return;
      mainHex.charsCount = 3;
      remaining -= 3;
      const visited = new Set([`${mainHex.q},${mainHex.r}`]);
      let queue = getHexNeighbors(mainHex, hexMap)
        .filter(n => n.charsCount === 0)
        .map(n => ({ hex: n }));
      let idx = 0;
      while (remaining > 0 && idx < queue.length) {
        const { hex } = queue[idx++];
        const key = `${hex.q},${hex.r}`;
        if (visited.has(key)) continue;
        visited.add(key);
        const val = Math.min(3, remaining);
        const newHex = {
          ...hex,
          charsCount: val,
          regionName: mainHex.regionName,
          slug: mainHex.slug
        };
        additionalHexes.push(newHex);
        extendedHexMap.set(key, newHex);
        remaining -= val;
        if (remaining > 0) {
          getHexNeighbors(hex, hexMap)
            .filter(n => n.charsCount === 0 && !visited.has(`${n.q},${n.r}`))
            .forEach(n => queue.push({ hex: n }));
        }
      }
    });
    const combinedHexes = hexes.map(h => {
      if (additionalHexes.find(a => a.q === h.q && a.r === h.r)) return null;
      return h;
    }).filter(Boolean) as RegionHexbinBin[];

    combinedHexes.push(...additionalHexes);

    // Black to gray color scale
    const colorScale = d3.scaleLinear<string>()
      .domain([0, 1, 3, 6])
      .range(['#e0e0e0', '#888', '#222', '#000'])
      .clamp(true);

    svgEl.append('g')
      .attr('class', 'hexes')
      .selectAll('path')
      .data(combinedHexes)
      .enter()
      .append('path')
      .attr('d', hexbin.hexagon())
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('fill', d => colorScale(d.charsCount))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .style('opacity', 0.9)
      .style('cursor', d => d.regionName ? 'pointer' : 'default')
      .on('click', (event, d: RegionHexbinBin) => {
        if (d.regionName) {
          goto(`/canvas`);
        }
      })
      .on('mouseenter', function(event, d: RegionHexbinBin) {
        if (!d.regionName) return;
        // Draw a background rect for the tooltip
        const tooltipGroup = svgEl.append('g').attr('class', 'tooltip-group');
        const tooltipText = tooltipGroup.append('text')
          .attr('x', d.x)
          .attr('y', d.y - hexRadius - 10)
          .attr('text-anchor', 'middle')
          .attr('font-size', '18px')
          .attr('font-weight', 'bold')
          .attr('fill', '#fff')
          .text(`${d.regionName}`);
        const bbox = tooltipText.node().getBBox();
        tooltipGroup.insert('rect', 'text')
          .attr('x', bbox.x - 8)
          .attr('y', bbox.y - 4)
          .attr('width', bbox.width + 16)
          .attr('height', bbox.height + 8)
          .attr('rx', 6)
          .attr('fill', '#222')
          .attr('opacity', 0.92)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5);

        d3.select(event.currentTarget as Element)
          .on('mouseleave.tooltip', function() {
            tooltipGroup.remove();
          }, { once: true });
      });
  });
</script>

<div class="flex items-center justify-center min-h-[80vh] w-screen">
  <svg bind:this={svg} width={width} height={height} />
</div>
