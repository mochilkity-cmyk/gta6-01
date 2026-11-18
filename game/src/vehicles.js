// Cars: player physics, traffic driving and drawing. A car is a plain
// object: {x, y, angle, speed, color, kind, driver, ...}. Player cars use
// arcade physics; traffic cars follow the road grid (see traffic.js).
import { ROAD_X, ROAD_Y, ROAD_W, isOnRoad } from './city.js';

export const CAR_COLORS = [
  '#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#457b9d', '#9b5de5',
  '#f15bb5', '#00bbf9', '#fee440', '#adb5bd', '#6c757d', '#ff8fa3',
];

export function makeCar(rng, x, y, angle, opts) {
  const o = opts || {};
  return {
    x, y, angle: angle || 0, speed: 0,
    color: o.color || rng.pick(CAR_COLORS),
    kind: o.kind || rng.pick(['sedan', 'sedan', 'taxi', 'sport', 'truck']),
    driver: o.driver || 'traffic',
    isPolice: !!o.isPolice,
    isPlayer: !!o.isPlayer,
    parked: !!o.parked,
    health: 100,
    w: o.kind === 'truck' ? 58 : 46,
    h: o.kind === 'truck' ? 24 : 22,
    steer: 0,
    targetNode: null,
    stuck: 0,
  };
}

export function makePoliceCar(rng, x, y, angle) {
  const car = makeCar(rng, x, y, angle, { color: '#f8f9fa', kind: 'sedan', driver: 'police', isPolice: true });
  car.sirenPhase = rng.range(0, 1);
  return car;
}

// Arcade driving for the player's car. Returns true when a skid happened.
export function updatePlayerCar(car, input, dt, fx) {
  const accel = input.axisY();
  const steer = input.axisX();
  const handbrake = input.down('Space');
  const forward = accel < 0 ? 1 : -1; // W is forward
  const throttle = Math.abs(accel);
  const maxSpeed = 420;
  const maxReverse = 160;
  if (throttle > 0) {
    const target = forward > 0 ? maxSpeed : maxReverse;
    car.speed += forward * 320 * throttle * dt;
    if (car.speed > maxSpeed) car.speed = maxSpeed;
    if (car.speed < -maxReverse) car.speed = -maxReverse;
  } else {
    car.speed *= Math.pow(0.4, dt);
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  if (handbrake) car.speed *= Math.pow(0.08, dt);
  const steerAmount = steer * Math.min(1, Math.abs(car.speed) / 90) * (car.speed >= 0 ? 1 : -1);
  car.angle += steerAmount * 2.3 * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const skidding = handbrake && Math.abs(car.speed) > 120;
  if (skidding && fx) {
    const bx = car.x - Math.cos(car.angle) * 18;
    const by = car.y - Math.sin(car.angle) * 18;
    // addSkid is imported lazily through fx hook set by main.js
    if (fx.addSkid) fx.addSkid(bx, by, car.angle);
  }
  return skidding;
}

// Simple traffic-car movement along the road grid. Cars keep their lane,
// turn at intersections, and reverse direction at the map edge.
export function updateTrafficCar(car, rng, dt) {
  if (car.parked) return;
  const cruise = car.kind === 'truck' ? 95 : car.kind === 'sport' ? 165 : 125;
  car.speed += (cruise - car.speed) * Math.min(1, dt * 1.5);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // At an intersection, sometimes turn onto the crossing road.
  const onV = Math.abs(((car.x % 400) + 400) % 400 - 300) < 8 || ROAD_X.some((rx) => Math.abs(car.x - rx) < 10);
  const onH = ROAD_Y.some((ry) => Math.abs(car.y - ry) < 10);
  if (onV && onH && rng.chance(dt * 0.9)) {
    const vertical = rng.chance(0.5);
    const dir = rng.chance(0.5) ? 1 : -1;
    if (vertical) {
      car.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      car.x = nearestRoad(car.x, ROAD_X);
    } else {
      car.angle = dir > 0 ? 0 : Math.PI;
      car.y = nearestRoad(car.y, ROAD_Y);
    }
  }
  // Bounce at the world edge instead of leaving the map.
  if (car.x < 120 || car.x > 3080 || car.y < 120 || car.y > 2280) {
    car.angle += Math.PI;
    car.x = Math.max(140, Math.min(3060, car.x));
    car.y = Math.max(140, Math.min(2260, car.y));
  }
  // Keep cars on the road: gently pull back toward the nearest road centre.
  if (!isOnRoad(car.x, car.y)) {
    const nx = nearestRoad(car.x, ROAD_X);
    const ny = nearestRoad(car.y, ROAD_Y);
    const dx = Math.abs(car.x - nx) < Math.abs(car.y - ny) ? nx - car.x : 0;
    const dy = dx === 0 ? ny - car.y : 0;
    car.x += dx * dt * 0.8;
    car.y += dy * dt * 0.8;
  }
}

function nearestRoad(v, roads) {
  let best = roads[0];
  for (const r of roads) if (Math.abs(r - v) < Math.abs(best - v)) best = r;
  return best;
}

export function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(-car.w / 2 + 3, -car.h / 2 + 4, car.w, car.h);
  // Body.
  ctx.fillStyle = car.isPolice ? '#f8f9fa' : car.color;
  const r = 7;
  ctx.beginPath();
  ctx.roundRect(-car.w / 2, -car.h / 2, car.w, car.h, r);
  ctx.fill();
  if (car.isPolice) {
    ctx.fillStyle = '#212529';
    ctx.fillRect(-4, -car.h / 2, 8, car.h);
    ctx.fillStyle = '#0b5ed7';
    const blink = Math.floor(time * 6 + (car.sirenPhase || 0) * 6) % 2 === 0;
    ctx.fillStyle = blink ? '#ff2d2d' : '#2d6bff';
    ctx.beginPath();
    ctx.arc(-8, -car.h / 2 + 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = blink ? '#2d6bff' : '#ff2d2d';
    ctx.beginPath();
    ctx.arc(8, -car.h / 2 + 3, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cabin and windshield.
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  ctx.beginPath();
  ctx.roundRect(-car.w / 2 + 12, -car.h / 2 + 4, car.w - 24, car.h - 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.7)';
  ctx.fillRect(car.w / 2 - 14, -car.h / 2 + 5, 4, car.h - 10);
  // Taxi sign.
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#ffd60a';
    ctx.fillRect(-4, -car.h / 2 + 1, 8, 5);
  }
  // Headlights.
  ctx.fillStyle = '#fff3b0';
  ctx.fillRect(car.w / 2 - 2, -car.h / 2 + 2, 3, 5);
  ctx.fillRect(car.w / 2 - 2, car.h / 2 - 7, 3, 5);
  // Wheels.
  ctx.fillStyle = '#111';
  ctx.fillRect(-car.w / 2 + 6, -car.h / 2 - 3, 10, 4);
  ctx.fillRect(-car.w / 2 + 6, car.h / 2 - 1, 10, 4);
  ctx.fillRect(car.w / 2 - 16, -car.h / 2 - 3, 10, 4);
  ctx.fillRect(car.w / 2 - 16, car.h / 2 - 1, 10, 4);
  ctx.restore();
  // Wanted flash ring for the player's car.
  if (car.isPlayer) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(car.x, car.y, 34 + Math.sin(time * 4) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}
