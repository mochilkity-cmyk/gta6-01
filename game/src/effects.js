// Particles, skid marks, explosions, muzzle flashes, floating score text
// and screen shake. Pure visual juice: nothing here changes game logic.
export function createEffects() {
  return {
    particles: [],
    skids: [],
    floats: [],
    shake: 0,
    flash: 0,
  };
}

export function addShake(fx, amount) {
  fx.shake = Math.min(22, fx.shake + amount);
}

export function spawnExplosion(fx, x, y) {
  fx.flash = 0.25;
  addShake(fx, 14);
  for (let i = 0; i < 42; i++) {
    const a = (i / 42) * Math.PI * 2 + 0.13 * i;
    const sp = 60 + (i % 7) * 34;
    fx.particles.push({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.5 + (i % 5) * 0.12, maxLife: 0.9,
      size: 4 + (i % 4) * 2,
      color: ['#ff9f1c', '#ff5714', '#ffd60a', '#6c757d'][i % 4],
    });
  }
}

export function spawnSparks(fx, x, y, n) {
  for (let i = 0; i < (n || 10); i++) {
    const a = (i / (n || 10)) * Math.PI * 2;
    fx.particles.push({
      x, y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140,
      life: 0.3, maxLife: 0.3, size: 3, color: '#ffd60a',
    });
  }
}

export function spawnMuzzle(fx, x, y, angle) {
  fx.particles.push({
    x: x + Math.cos(angle) * 22, y: y + Math.sin(angle) * 22,
    vx: Math.cos(angle) * 60, vy: Math.sin(angle) * 60,
    life: 0.08, maxLife: 0.08, size: 9, color: '#fff3b0',
  });
}

export function spawnBlood(fx, x, y) {
  for (let i = 0; i < 8; i++) {
    const a = i * 0.8;
    fx.particles.push({
      x, y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70,
      life: 0.4, maxLife: 0.4, size: 3, color: '#c1121f',
    });
  }
}

export function addFloat(fx, x, y, text, color) {
  fx.floats.push({ x, y, text, color: color || '#fff', life: 1.2 });
}

export function addSkid(fx, x, y, angle) {
  fx.skids.push({ x, y, angle, life: 6 });
  if (fx.skids.length > 400) fx.skids.splice(0, fx.skids.length - 400);
}

export function updateEffects(fx, dt) {
  fx.shake = Math.max(0, fx.shake - dt * 30);
  fx.flash = Math.max(0, fx.flash - dt);
  for (const p of fx.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.life -= dt;
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);
  for (const s of fx.skids) s.life -= dt;
  fx.skids = fx.skids.filter((s) => s.life > 0);
  for (const f of fx.floats) { f.y -= 30 * dt; f.life -= dt; }
  fx.floats = fx.floats.filter((f) => f.life > 0);
}

export function drawSkids(ctx, fx) {
  ctx.fillStyle = 'rgba(20,20,20,0.5)';
  for (const s of fx.skids) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.fillRect(-7, -3, 14, 3);
    ctx.fillRect(-7, 4, 14, 3);
    ctx.restore();
  }
}

export function drawEffects(ctx, fx) {
  for (const p of fx.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.5 + p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px sans-serif';
  for (const f of fx.floats) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(255,200,80,${fx.flash * 0.8})`;
    ctx.fillRect(0, 0, 4000, 3000);
  }
}
