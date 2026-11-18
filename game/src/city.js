// Palmera City layout: street grid, blocks, buildings, parks, beach and
// harbour. All placement comes from the seeded RNG, so the city is identical
// for a given seed. Also owns building collision and road queries.
import { makeRng } from './rng.js';

export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_W = 140;

// Vertical and horizontal road centre lines.
export const ROAD_X = [300, 700, 1100, 1500, 1900, 2300, 2700];
export const ROAD_Y = [300, 700, 1100, 1500, 1900];

const BUILDING_COLORS = [
  '#f2a65a', '#e07856', '#5fb8a6', '#f4d58d', '#8ecae6', '#e07a9b',
  '#9db98a', '#c9a7eb', '#f6bd60', '#7fb069', '#ef8354', '#a3c4bc',
];
const ROOF_COLORS = ['#7a4a2b', '#4a5d7e', '#5d4037', '#37474f', '#6d4c41'];

export function buildCity(seedText) {
  const rng = makeRng('city-' + seedText);
  const buildings = [];
  const trees = [];
  const parks = [];
  const zones = [];
  // Named districts, shown on the minimap and in mission text.
  zones.push({ name: 'Old Pier', x: 0, y: 2050, w: 900, h: 350 });
  zones.push({ name: 'Harbour East', x: 2750, y: 0, w: 450, h: 2400 });
  zones.push({ name: 'Downtown', x: 1000, y: 500, w: 1100, h: 1100 });
  zones.push({ name: 'Palm Heights', x: 0, y: 0, w: 900, h: 900 });
  zones.push({ name: 'Sunset Beach', x: 900, y: 2050, w: 2300, h: 350 });

  // The central block is a park, not buildings.
  const parkBlock = { x: 1170, y: 1170, w: 260, h: 260 };
  parks.push(parkBlock);
  // A second small park uptown.
  parks.push({ x: 770, y: 370, w: 260, h: 260 });

  for (let bx = 0; bx < ROAD_X.length - 1; bx++) {
    for (let by = 0; by < ROAD_Y.length - 1; by++) {
      const x0 = ROAD_X[bx] + ROAD_W / 2 + 24;
      const x1 = ROAD_X[bx + 1] - ROAD_W / 2 - 24;
      const y0 = ROAD_Y[by] + ROAD_W / 2 + 24;
      const y1 = ROAD_Y[by + 1] - ROAD_W / 2 - 24;
      const bw = x1 - x0;
      const bh = y1 - y0;
      if (bw < 120 || bh < 120) continue;
      // Skip blocks that overlap a park.
      let overlapsPark = false;
      for (const p of parks) {
        if (x0 < p.x + p.w && x1 > p.x && y0 < p.y + p.h && y1 > p.y) overlapsPark = true;
      }
      if (overlapsPark) continue;
      // Beach strip: no buildings south of y 2050.
      if (y0 > 2000) continue;
      const count = rng.int(1, 3);
      for (let i = 0; i < count; i++) {
        const w = rng.range(90, Math.min(200, bw));
        const h = rng.range(80, Math.min(170, bh));
        const x = rng.range(x0, x1 - w);
        const y = rng.range(y0, y1 - h);
        const b = {
          x, y, w, h,
          color: rng.pick(BUILDING_COLORS),
          roof: rng.pick(ROOF_COLORS),
          tall: rng.chance(0.3),
          label: rng.pick(['', '', '', 'HOTEL', 'CAFE', 'SHOP', 'GARAGE', 'BANK', 'CLINIC', 'PIZZA', 'TACOS', 'CINEMA']),
        };
        let clash = false;
        for (const o of buildings) {
          if (b.x < o.x + o.w + 14 && b.x + b.w + 14 > o.x && b.y < o.y + o.h + 14 && b.y + b.h + 14 > o.y) clash = true;
        }
        if (!clash) buildings.push(b);
      }
      // Palm trees along the block edges.
      const treeCount = rng.int(2, 5);
      for (let i = 0; i < treeCount; i++) {
        trees.push({ x: rng.range(x0, x1), y: rng.range(y0, y1), r: rng.range(9, 14) });
      }
    }
  }
  // Beach palms.
  for (let i = 0; i < 26; i++) {
    trees.push({ x: rng.range(60, 3140), y: rng.range(2080, 2260), r: rng.range(10, 15) });
  }
  // Harbour docks and crates.
  const docks = [];
  for (let i = 0; i < 4; i++) {
    docks.push({ x: 2900, y: 260 + i * 420, w: 180, h: 90 });
  }
  return { buildings, trees, parks, zones, docks };
}

export function isOnRoad(x, y) {
  for (const rx of ROAD_X) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of ROAD_Y) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}

export function nearestRoadX(x) {
  let best = ROAD_X[0];
  for (const rx of ROAD_X) if (Math.abs(rx - x) < Math.abs(best - x)) best = rx;
  return best;
}

export function nearestRoadY(y) {
  let best = ROAD_Y[0];
  for (const ry of ROAD_Y) if (Math.abs(ry - y) < Math.abs(best - y)) best = ry;
  return best;
}

// Push a circle (x, y, radius) out of every building it overlaps.
// Returns true when a collision happened.
export function collideBuildings(city, body) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < body.r * body.r) {
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        body.x = cx + (dx / d) * body.r;
        body.y = cy + (dy / d) * body.r;
      } else {
        body.x += body.r;
      }
    }
  }
  // Harbour docks are solid too.
  for (const d of city.docks) {
    const cx = Math.max(d.x, Math.min(body.x, d.x + d.w));
    const cy = Math.max(d.y, Math.min(body.y, d.y + d.h));
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < body.r * body.r && d2 > 0.01) {
      const d = Math.sqrt(d2);
      body.x = cx + (dx / d) * body.r;
      body.y = cy + (dy / d) * body.r;
      hit = true;
    }
  }
  return hit;
}

export function clampToWorld(body) {
  body.x = Math.max(30, Math.min(WORLD_W - 30, body.x));
  body.y = Math.max(30, Math.min(WORLD_H - 30, body.y));
}

function drawPalm(ctx, x, y, r) {
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(x - 2, y - 2, 4, 6);
  ctx.fillStyle = '#2f9e44';
  ctx.beginPath();
  ctx.arc(x, y - 4, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#40c057';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.4, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCity(ctx, city, cam, viewW, viewH) {
  const x0 = Math.max(0, cam.x - 40);
  const y0 = Math.max(0, cam.y - 40);
  const x1 = Math.min(WORLD_W, cam.x + viewW + 40);
  const y1 = Math.min(WORLD_H, cam.y + viewH + 40);
  // Ground: warm grass base.
  ctx.fillStyle = '#8fbf6f';
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // Harbour water (east edge) and sea (south edge).
  ctx.fillStyle = '#2fa8c9';
  ctx.fillRect(2900, y0, WORLD_W - 2900, y1 - y0);
  ctx.fillRect(x0, 2320, x1 - x0, WORLD_H - 2320);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let wy = 2340; wy < WORLD_H; wy += 36) {
    ctx.fillRect(x0 + ((wy * 7) % 120), wy, 60, 3);
  }
  // Beach sand.
  ctx.fillStyle = '#e8c97a';
  ctx.fillRect(x0, 2080, x1 - x0, 240);
  ctx.fillStyle = '#d9b96a';
  for (let sx = 60; sx < WORLD_W; sx += 90) {
    if (sx > x0 && sx < x1) { ctx.beginPath(); ctx.arc(sx, 2160 + ((sx * 13) % 80), 5, 0, Math.PI * 2); ctx.fill(); }
  }
  // Roads.
  ctx.fillStyle = '#3a3f4a';
  for (const rx of ROAD_X) ctx.fillRect(rx - ROAD_W / 2, y0, ROAD_W, y1 - y0);
  for (const ry of ROAD_Y) ctx.fillRect(x0, ry - ROAD_W / 2, x1 - x0, ROAD_W);
  // Sidewalks (pale border along roads).
  ctx.fillStyle = '#cbb89a';
  for (const rx of ROAD_X) {
    ctx.fillRect(rx - ROAD_W / 2 - 10, y0, 10, y1 - y0);
    ctx.fillRect(rx + ROAD_W / 2, y0, 10, y1 - y0);
  }
  for (const ry of ROAD_Y) {
    ctx.fillRect(x0, ry - ROAD_W / 2 - 10, x1 - x0, 10);
    ctx.fillRect(x0, ry + ROAD_W / 2, x1 - x0, 10);
  }
  // Lane dashes.
  ctx.fillStyle = '#f7d154';
  for (const rx of ROAD_X) {
    for (let y = Math.floor(y0 / 46) * 46; y < y1; y += 46) ctx.fillRect(rx - 2, y, 4, 24);
  }
  for (const ry of ROAD_Y) {
    for (let x = Math.floor(x0 / 46) * 46; x < x1; x += 46) ctx.fillRect(x, ry - 2, 24, 4);
  }
  // Crosswalks at intersections.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const rx of ROAD_X) {
    for (const ry of ROAD_Y) {
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(rx + i * 16 - 5, ry - ROAD_W / 2 + 6, 10, 18);
        ctx.fillRect(rx + i * 16 - 5, ry + ROAD_W / 2 - 24, 10, 18);
      }
    }
  }
  // Parks.
  for (const p of city.parks) {
    ctx.fillStyle = '#5da85a';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#7cc47a';
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a90d9';
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PALM PARK', p.x + p.w / 2, p.y + 24);
  }
  // Harbour docks.
  ctx.fillStyle = '#8a6d4b';
  for (const d of city.docks) ctx.fillRect(d.x, d.y, d.w, d.h);
  ctx.fillStyle = '#5b4632';
  for (const d of city.docks) {
    ctx.fillRect(d.x, d.y, 10, d.h);
    ctx.fillRect(d.x + d.w - 10, d.y, 10, d.h);
  }
  // Buildings with shadows, roofs and windows.
  for (const b of city.buildings) {
    if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const cols = Math.max(2, Math.floor(b.w / 30));
    const rows = Math.max(2, Math.floor(b.h / 28));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        ctx.fillRect(b.x + 12 + c * ((b.w - 24) / cols), b.y + 12 + r * ((b.h - 24) / rows), 10, 12);
      }
    }
    if (b.label) {
      ctx.fillStyle = '#222';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 5);
    }
  }
  // Trees.
  for (const t of city.trees) {
    if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
    drawPalm(ctx, t.x, t.y, t.r);
  }
  // District names on the ground.
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DOWNTOWN', 1550, 560);
  ctx.fillText('PALM HEIGHTS', 450, 120);
  ctx.fillText('SUNSET BEACH', 1800, 2060);
  ctx.fillText('HARBOUR EAST', 3050, 120);
}
