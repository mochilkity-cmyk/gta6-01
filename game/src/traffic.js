// Traffic and pedestrians: spawning, wandering, fleeing, and the simple
// car-following that keeps traffic from piling up.
import { ROAD_X, ROAD_Y, ROAD_W, WORLD_W, WORLD_H, isOnRoad } from './city.js';
import { makeCar, updateTrafficCar } from './vehicles.js';

const PED_COLORS = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#da77f2', '#ffa94d', '#63e6be', '#f783ac'];
const PED_SHIRTS = ['#e03131', '#1971c2', '#f08c00', '#2b8a3e', '#862e9c', '#e8590c', '#0c8599', '#a61e4d'];

export function spawnTraffic(rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = rng.chance(0.5);
    let x, y, angle;
    if (vertical) {
      x = rng.pick(ROAD_X) + (rng.chance(0.5) ? 22 : -22);
      y = rng.range(200, 2200);
      angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
    } else {
      x = rng.range(200, 3000);
      y = rng.pick(ROAD_Y) + (rng.chance(0.5) ? 22 : -22);
      angle = rng.chance(0.5) ? 0 : Math.PI;
    }
    const car = makeCar(rng, x, y, angle, { driver: 'traffic' });
    car.speed = rng.range(60, 140);
    cars.push(car);
  }
  return cars;
}

export function spawnParkedCars(rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = rng.chance(0.5);
    let x, y, angle;
    if (vertical) {
      x = rng.pick(ROAD_X) + (rng.chance(0.5) ? 52 : -52);
      y = rng.range(220, 2180);
      angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
    } else {
      x = rng.range(220, 2980);
      y = rng.pick(ROAD_Y) + (rng.chance(0.5) ? 52 : -52);
      angle = rng.chance(0.5) ? 0 : Math.PI;
    }
    cars.push(makeCar(rng, x, y, angle, { driver: 'parked', parked: true }));
  }
  return cars;
}

export function spawnPedestrians(rng, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const x = rng.range(150, WORLD_W - 150);
    const y = rng.range(150, WORLD_H - 150);
    peds.push({
      x, y, angle: rng.range(0, Math.PI * 2), speed: rng.range(28, 55),
      color: rng.pick(PED_COLORS), shirt: rng.pick(PED_SHIRTS),
      state: 'walk', tx: x, ty: y, wait: rng.range(0, 3),
      hostile: false, health: 30, down: 0, panic: 0,
    });
  }
  // A few rival thugs hang around Downtown and the harbour.
  for (let i = 0; i < 4; i++) {
    const spot = [{ x: 2300, y: 1100 }, { x: 2900, y: 1200 }, { x: 1100, y: 1500 }, { x: 2300, y: 700 }][i];
    peds.push({
      x: spot.x + i * 30, y: spot.y, angle: 0, speed: 70,
      color: '#343a40', shirt: '#c2255c', state: 'walk',
      tx: spot.x, ty: spot.y, wait: 0,
      hostile: true, health: 60, down: 0, panic: 0,
    });
  }
  return peds;
}

export function updateTraffic(G, dt) {
  const rng = G.rng;
  for (const car of G.cars) {
    if (car.driver !== 'traffic') continue;
    // Slow down when a car is directly ahead.
    let ahead = null;
    for (const other of G.cars) {
      if (other === car || other.parked) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const facing = Math.cos(car.angle) * dx + Math.sin(car.angle) * dy;
      if (dist < 70 && facing > 0) ahead = other;
    }
    const savedSpeed = car.speed;
    if (ahead) car.speed = Math.min(car.speed, 40);
    updateTrafficCar(car, rng, dt);
    if (ahead) car.speed = Math.min(savedSpeed, car.speed);
  }
  // Keep the streets busy: replace cars that despawned far away.
  if (G.cars.filter((c) => c.driver === 'traffic').length < 10) {
    const fresh = spawnTraffic(rng, 1);
    G.cars.push(fresh[0]);
  }
}

export function updatePedestrians(G, dt) {
  const px = G.player.x;
  const py = G.player.y;
  const playerSpeed = G.player.car ? Math.abs(G.player.car.speed) : 0;
  for (const p of G.peds) {
    if (p.down > 0) { p.down -= dt; continue; }
    const dx = p.x - px;
    const dy = p.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Flee from a speeding car or a gunshot nearby.
    if (dist < 130 && (playerSpeed > 120 || G.player.firedRecently > 0)) {
      p.state = 'flee';
      p.panic = 2;
    }
    if (p.hostile && dist < 260 && G.state === 'playing') {
      p.state = 'chase';
    } else if (p.state === 'chase' && dist > 420) {
      p.state = 'walk';
    }
    if (p.panic > 0) p.panic -= dt;
    if (p.state === 'flee' || p.panic > 0) {
      p.angle = Math.atan2(dy, dx);
      p.x += Math.cos(p.angle) * 150 * dt;
      p.y += Math.sin(p.angle) * 150 * dt;
      if (p.panic <= 0) p.state = 'walk';
    } else if (p.state === 'chase') {
      p.angle = Math.atan2(py - p.y, px - p.x);
      p.x += Math.cos(p.angle) * p.speed * 1.8 * dt;
      p.y += Math.sin(p.angle) * p.speed * 1.8 * dt;
      // A thug in reach punches the player.
      if (dist < 26 && G.player.health > 0) {
        G.player.health -= 14 * dt;
        G.player.hurtFlash = 0.3;
        if (G.player.health <= 0) G.player.health = 0;
      }
    } else {
      if (p.wait > 0) { p.wait -= dt; continue; }
      const tdx = p.tx - p.x;
      const tdy = p.ty - p.y;
      const td = Math.sqrt(tdx * tdx + tdy * tdy);
      if (td < 12) {
        p.tx = Math.max(120, Math.min(WORLD_W - 120, p.x + G.rng.range(-320, 320)));
        p.ty = Math.max(120, Math.min(WORLD_H - 120, p.y + G.rng.range(-320, 320)));
        p.wait = G.rng.range(0, 2.5);
      } else {
        p.angle = Math.atan2(tdy, tdx);
        p.x += Math.cos(p.angle) * p.speed * dt;
        p.y += Math.sin(p.angle) * p.speed * dt;
      }
    }
    p.x = Math.max(40, Math.min(WORLD_W - 40, p.x));
    p.y = Math.max(40, Math.min(WORLD_H - 40, p.y));
  }
}

export function drawPedestrian(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.down > 0) {
    // Lying down.
    ctx.rotate(p.angle + Math.PI / 2);
    ctx.fillStyle = p.shirt;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(15, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const bob = Math.sin(time * 8 + p.x) * 1.5;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Legs.
  ctx.strokeStyle = '#343a40';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-3, 8 + bob);
  ctx.moveTo(0, 0); ctx.lineTo(3, 8 - bob);
  ctx.stroke();
  // Body.
  ctx.fillStyle = p.hostile ? '#862e9c' : p.shirt;
  ctx.beginPath();
  ctx.arc(0, -2, 7, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(0, -11, 5.5, 0, Math.PI * 2);
  ctx.fill();
  if (p.hostile) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, -18);
  }
  ctx.restore();
}
