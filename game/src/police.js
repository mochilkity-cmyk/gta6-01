// Wanted level and the Palmera City police: spawning, chasing, ramming
// and arresting. Stars rise with crime and fade when the player lies low.
import { makePoliceCar } from './vehicles.js';
import { WORLD_W, WORLD_H } from './city.js';
import { spawnExplosion, spawnSparks, addShake } from './effects.js';
import { playSfx } from './audio.js';

export function addWanted(G, amount, reason) {
  const before = G.player.wanted;
  G.player.wanted = Math.max(0, Math.min(5, G.player.wanted + amount));
  G.player.quietTime = 0;
  if (G.player.wanted > before && reason) {
    G.notice = reason;
    G.noticeTime = 2.5;
  }
}

export function updatePolice(G, dt) {
  const p = G.player;
  // Wanted decays after 18 quiet seconds.
  if (p.wanted > 0) {
    p.quietTime += dt;
    if (p.quietTime > 18) {
      p.wanted -= 1;
      p.quietTime = 0;
      G.notice = 'Heat cooling off… wanted level down.';
      G.noticeTime = 2;
    }
  }
  const wantCount = Math.min(p.wanted, 5);
  const police = G.cars.filter((c) => c.isPolice);
  // Spawn police near the player until the count matches the wanted level.
  if (police.length < wantCount && G.state === 'playing') {
    G.policeSpawnTimer -= dt;
    if (G.policeSpawnTimer <= 0) {
      G.policeSpawnTimer = 2.5;
      const angle = G.rng.range(0, Math.PI * 2);
      const dist = 700;
      const x = Math.max(140, Math.min(WORLD_W - 140, p.x + Math.cos(angle) * dist));
      const y = Math.max(140, Math.min(WORLD_H - 140, p.y + Math.sin(angle) * dist));
      const car = makePoliceCar(G.rng, x, y, Math.atan2(p.y - y, p.x - x));
      car.speed = 200;
      G.cars.push(car);
    }
  }
  // Despawn police when the heat is gone.
  if (p.wanted === 0) {
    for (const car of police) {
      const dx = car.x - p.x;
      const dy = car.y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) > 900) {
        G.cars.splice(G.cars.indexOf(car), 1);
      }
    }
  }
  // Chase: steer toward the player, ram when close.
  for (const car of G.cars.filter((c) => c.isPolice)) {
    const dx = p.x - car.x;
    const dy = p.y - car.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
    const cruise = 300 + p.wanted * 22;
    car.speed += (cruise - car.speed) * Math.min(1, dt * 1.2);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Ram the player's car.
    if (p.car && dist < 52) {
      p.health -= 9 * dt;
      addShake(G.fx, 6);
      spawnSparks(G.fx, car.x, car.y, 6);
      if (G.rng.chance(dt * 2)) playSfx('crash');
      // Shove the player's car sideways.
      p.car.x += Math.cos(car.angle) * 30 * dt;
      p.car.y += Math.sin(car.angle) * 30 * dt;
    }
    // Arrest: player on foot, slow, police right on top of them.
    if (!p.car && dist < 42) {
      p.arrestTimer += dt;
      if (p.arrestTimer > 1.6) {
        bustPlayer(G, 'BUSTED — the Palmera City police caught you.');
      }
    } else {
      p.arrestTimer = Math.max(0, p.arrestTimer - dt * 2);
    }
    // Police cars that get too far behind respawn closer.
    if (dist > 1400 && p.wanted > 0) {
      const a = G.rng.range(0, Math.PI * 2);
      car.x = Math.max(140, Math.min(WORLD_W - 140, p.x + Math.cos(a) * 650));
      car.y = Math.max(140, Math.min(WORLD_H - 140, p.y + Math.sin(a) * 650));
    }
  }
}

export function bustPlayer(G, message) {
  if (G.state !== 'playing') return;
  G.state = 'busted';
  G.endMessage = message;
  const fine = Math.min(200, Math.floor(G.player.cash * 0.25));
  G.player.cash -= fine;
  G.player.wanted = 0;
  G.player.arrestTimer = 0;
  playSfx('busted');
  // Clear the police after the bust.
  G.cars = G.cars.filter((c) => !c.isPolice);
}

export function wastePlayer(G, message) {
  if (G.state !== 'playing') return;
  G.state = 'wasted';
  G.endMessage = message || 'WASTED — Palmera City got the better of you.';
  spawnExplosion(G.fx, G.player.x, G.player.y);
  playSfx('explosion');
  G.cars = G.cars.filter((c) => !c.isPolice);
}
