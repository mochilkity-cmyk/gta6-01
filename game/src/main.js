// Palmera City — main game loop, player control, collisions, pickups,
// camera and rendering. Wires city, vehicles, traffic, police, missions,
// HUD, audio and effects together.
import { buildCity, drawCity, collideBuildings, clampToWorld, WORLD_W, WORLD_H } from './city.js';
import { makeRng } from './rng.js';
import { createInput } from './input.js';
import { createEffects, updateEffects, drawEffects, drawSkids, spawnExplosion, spawnSparks, spawnMuzzle, spawnBlood, addFloat, addShake, addSkid } from './effects.js';
import { makeCar, drawCar, updatePlayerCar } from './vehicles.js';
import { spawnTraffic, spawnParkedCars, spawnPedestrians, updateTraffic, updatePedestrians, drawPedestrian } from './traffic.js';
import { addWanted, updatePolice, bustPlayer, wastePlayer } from './police.js';
import { startMission, updateMission, nextMission, missionTarget, saveGame, loadSave, hasSave, MISSIONS } from './missions.js';
import { drawHUD, drawMenu, drawPause, drawEnd } from './hud.js';
import { initAudio, resumeAudio, playSfx, setEngine, setSiren, updateMusic, toggleMute } from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const seed = params.get('seed') || '1';
const shotMode = params.get('shot') || '';

const rng = makeRng('palmera-' + seed);
const city = buildCity(seed);
const input = createInput(canvas);
const fx = createEffects();
fx.addSkid = (x, y, angle) => addSkid(fx, x, y, angle);

const G = {
  seed, rng, city, fx,
  state: 'menu',
  time: 0,
  frozen: false,
  cam: { x: 0, y: 0 },
  cars: [],
  peds: [],
  pickups: [],
  mission: null,
  dialogue: '',
  dialogueTime: 0,
  notice: '',
  noticeTime: 0,
  endMessage: '',
  completeMessage: '',
  policeSpawnTimer: 0,
  saveExists: hasSave(),
  player: {
    x: 700, y: 1500, angle: 0, speed: 0,
    health: 100, cash: 100, score: 0, ammo: 30,
    wanted: 0, quietTime: 0, arrestTimer: 0, hurtFlash: 0,
    firedRecently: 0, missionsDone: 0, car: null, punchTimer: 0, shootTimer: 0,
  },
};

function resetWorld() {
  G.cars = [];
  G.peds = [];
  G.pickups = [];
  G.mission = null;
  G.dialogue = '';
  G.dialogueTime = 0;
  G.notice = '';
  G.noticeTime = 0;
  G.policeSpawnTimer = 0;
  G.player.x = 700;
  G.player.y = 1500;
  G.player.angle = 0;
  G.player.health = 100;
  G.player.cash = 100;
  G.player.score = 0;
  G.player.ammo = 30;
  G.player.wanted = 0;
  G.player.quietTime = 0;
  G.player.arrestTimer = 0;
  G.player.missionsDone = 0;
  G.player.car = null;
  G.player.firedRecently = 0;
  G.cars.push(...spawnTraffic(G.rng, 14));
  G.cars.push(...spawnParkedCars(G.rng, 8));
  // The cherry-red Comet GT for Mission 3, parked at Harbour East.
  const comet = makeCar(G.rng, 2970, 900, Math.PI / 2, { color: '#e63946', kind: 'sport', driver: 'parked', parked: true });
  G.cars.push(comet);
  G.peds.push(...spawnPedestrians(G.rng, 26));
  // Ammo and health pickups at fixed landmarks.
  G.pickups.push(
    { x: 700, y: 300, kind: 'ammo' },
    { x: 1900, y: 1500, kind: 'ammo' },
    { x: 1100, y: 1900, kind: 'ammo' },
    { x: 2700, y: 300, kind: 'health' },
    { x: 1500, y: 1300, kind: 'health' },
    { x: 2300, y: 1900, kind: 'health' },
  );
}

resetWorld();
if (shotMode) applyShot(G, shotMode);

function nearestCar(maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    if (car.isPolice) continue;
    const dx = car.x - G.player.x;
    const dy = car.y - G.player.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function enterCar() {
  const car = nearestCar(78);
  if (!car) return;
  if (car.driver === 'traffic') {
    addWanted(G, 1, 'You stole a car! The police are coming.');
    playSfx('horn');
  } else {
    playSfx('enter');
  }
  car.driver = 'player';
  car.isPlayer = true;
  car.parked = false;
  G.player.car = car;
  G.player.x = car.x;
  G.player.y = car.y;
  G.player.angle = car.angle;
}

function exitCar() {
  const car = G.player.car;
  if (!car) return;
  car.driver = 'parked';
  car.parked = true;
  car.isPlayer = false;
  car.speed = 0;
  const side = G.player.angle + Math.PI / 2;
  G.player.x = car.x + Math.cos(side) * 40;
  G.player.y = car.y + Math.sin(side) * 40;
  G.player.angle = car.angle;
  G.player.car = null;
  playSfx('enter');
}

function playerShoot(aimAngle) {
  const p = G.player;
  if (p.ammo <= 0) { playSfx('click'); p.shootTimer = 0.25; return; }
  p.ammo -= 1;
  p.firedRecently = 0.6;
  p.shootTimer = 0.22;
  spawnMuzzle(fx, p.x, p.y, aimAngle);
  playSfx('shoot');
  addShake(fx, 2);
  // Hit the nearest person roughly in the line of fire.
  let best = null;
  let bestD = 360;
  for (const ped of G.peds) {
    if (ped.down > 0) continue;
    const dx = ped.x - p.x;
    const dy = ped.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > bestD) continue;
    let diff = Math.atan2(dy, dx) - aimAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < 0.22) { best = ped; bestD = d; }
  }
  if (best) {
    best.health -= 34;
    spawnBlood(fx, best.x, best.y);
    if (best.health <= 0) {
      best.down = 999;
      best.state = 'walk';
      addWanted(G, 1, 'Shots fired! The police are coming.');
      p.cash += 15;
      addFloat(fx, best.x, best.y - 20, '+$15', '#69db7c');
    }
  }
}

function playerPunch() {
  const p = G.player;
  p.punchTimer = 0.3;
  playSfx('punch');
  let best = null;
  let bestD = 48;
  for (const ped of G.peds) {
    if (ped.down > 0) continue;
    const dx = ped.x - p.x;
    const dy = ped.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestD) { bestD = d; best = ped; }
  }
  if (best) {
    best.health -= 22;
    spawnBlood(fx, best.x, best.y);
    const ka = Math.atan2(best.y - p.y, best.x - p.x);
    best.x += Math.cos(ka) * 18;
    best.y += Math.sin(ka) * 18;
    if (best.health <= 0) {
      best.down = 999;
      addWanted(G, 1, 'Assault! The police are coming.');
      p.cash += 15;
      addFloat(fx, best.x, best.y - 20, '+$15', '#69db7c');
    }
  }
}

function updatePlayer(dt) {
  const p = G.player;
  p.firedRecently = Math.max(0, p.firedRecently - dt);
  p.punchTimer = Math.max(0, p.punchTimer - dt);
  p.shootTimer = Math.max(0, p.shootTimer - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);
  if (p.car) {
    updatePlayerCar(p.car, input, dt, fx);
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    p.speed = p.car.speed;
    // Buildings stop the car.
    const body = { x: p.car.x, y: p.car.y, r: 26 };
    if (collideBuildings(city, body)) {
      p.car.x = body.x;
      p.car.y = body.y;
      if (Math.abs(p.car.speed) > 150) {
        spawnSparks(fx, p.car.x, p.car.y, 10);
        playSfx('crash');
        addShake(fx, 5);
      }
      p.car.speed *= 0.45;
    }
    clampToWorld(p.car);
    // Bump into other cars.
    for (const other of G.cars) {
      if (other === p.car || other.parked) continue;
      const dx = other.x - p.car.x;
      const dy = other.y - p.car.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 48 && d > 0.01) {
        const push = (48 - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        p.car.x -= nx * push;
        p.car.y -= ny * push;
        other.x += nx * push;
        other.y += ny * push;
        if (Math.abs(p.car.speed) > 100) {
          spawnSparks(fx, p.car.x + nx * 24, p.car.y + ny * 24, 8);
          playSfx('crash');
          addShake(fx, 4);
          p.car.speed *= 0.6;
        }
      }
    }
    // Run over pedestrians.
    for (const ped of G.peds) {
      if (ped.down > 0) continue;
      const dx = ped.x - p.car.x;
      const dy = ped.y - p.car.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 30 && Math.abs(p.car.speed) > 70) {
        ped.down = 999;
        ped.health = 0;
        spawnBlood(fx, ped.x, ped.y);
        addWanted(G, 1, 'You hit a pedestrian!');
        addShake(fx, 6);
        playSfx('crash');
      }
    }
    if (input.wasPressed('KeyE')) exitCar();
    if (input.wasPressed('KeyH')) playSfx('horn');
  } else {
    // On foot.
    const sprint = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = sprint ? 320 : 200;
    const ax = input.axisX();
    const ay = input.axisY();
    const len = Math.sqrt(ax * ax + ay * ay);
    if (len > 0) {
      p.x += (ax / len) * speed * dt;
      p.y += (ay / len) * speed * dt;
      p.angle = Math.atan2(ay, ax);
      p.speed = speed;
    } else {
      p.speed = 0;
    }
    const body = { x: p.x, y: p.y, r: 14 };
    collideBuildings(city, body);
    p.x = body.x;
    p.y = body.y;
    clampToWorld(p);
    if (input.wasPressed('KeyE')) enterCar();
    if (input.wasPressed('KeyF') && p.punchTimer <= 0) playerPunch();
    // Aim with the mouse, shoot with Space or click.
    const aimAngle = Math.atan2(input.mouse.y - (p.y - G.cam.y), input.mouse.x - (p.x - G.cam.x));
    if ((input.wasPressed('Space') || input.mouse.clicked) && p.shootTimer <= 0) playerShoot(aimAngle);
  }
  // Pickups.
  for (const pk of G.pickups) {
    const dx = pk.x - p.x;
    const dy = pk.y - p.y;
    if (Math.sqrt(dx * dx + dy * dy) < 40) {
      if (pk.kind === 'ammo') { p.ammo += 24; addFloat(fx, pk.x, pk.y - 20, '+24 AMMO', '#ffd60a'); }
      else { p.health = Math.min(100, p.health + 30); addFloat(fx, pk.x, pk.y - 20, '+30 HP', '#69db7c'); }
      playSfx('pickup');
      pk.taken = true;
    }
  }
  G.pickups = G.pickups.filter((pk) => !pk.taken);
  // Slow health regen when the heat is off.
  if (p.wanted === 0 && p.health > 0 && p.health < 100) p.health = Math.min(100, p.health + 3 * dt);
  if (p.health <= 0) wastePlayer(G, 'WASTED — Palmera City got the better of you.');
}

function update(dt) {
  G.time += dt;
  G.noticeTime = Math.max(0, G.noticeTime - dt);
  G.dialogueTime = Math.max(0, G.dialogueTime - dt);
  updatePlayer(dt);
  if (G.state !== 'playing') return;
  updateTraffic(G, dt);
  updatePedestrians(G, dt);
  updatePolice(G, dt);
  updateMission(G, dt);
  updateEffects(fx, dt);
  setEngine(G.player.car ? G.player.car.speed : 0, !!G.player.car);
  setSiren(G.player.wanted > 0);
  updateMusic(dt, true);
}

function drawPlayer(ctx) {
  const p = G.player;
  if (p.car) return; // The car is drawn with the other cars.
  ctx.save();
  ctx.translate(p.x, p.y);
  const bob = p.speed > 0 ? Math.sin(G.time * 12) * 2 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-4, 9 + bob);
  ctx.moveTo(0, 0); ctx.lineTo(4, 9 - bob);
  ctx.stroke();
  // Kai's teal jacket and cap.
  ctx.fillStyle = '#0b7285';
  ctx.beginPath();
  ctx.arc(0, -2, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f1c27d';
  ctx.beginPath();
  ctx.arc(0, -12, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.arc(0, -13, 6, Math.PI, 0);
  ctx.fill();
  // Punch / gun arm.
  if (p.punchTimer > 0 || p.shootTimer > 0) {
    ctx.strokeStyle = '#0b7285';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(Math.cos(p.angle) * 16, -4 + Math.sin(p.angle) * 16);
    ctx.stroke();
  }
  ctx.restore();
  // Player ring so the eye finds Kai instantly.
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 20 + Math.sin(G.time * 4) * 2, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPickups(ctx) {
  for (const pk of G.pickups) {
    const pulse = 1 + Math.sin(G.time * 5 + pk.x) * 0.12;
    ctx.save();
    ctx.translate(pk.x, pk.y);
    ctx.scale(pulse, pulse);
    if (pk.kind === 'ammo') {
      ctx.fillStyle = '#ffd60a';
      ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = '#222';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AMMO', 0, 4);
    } else {
      ctx.fillStyle = '#69db7c';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-2, -7, 4, 14);
      ctx.fillRect(-7, -2, 14, 4);
    }
    ctx.restore();
  }
  ctx.textAlign = 'left';
}

function drawMissionBeacon(ctx) {
  const target = missionTarget(G);
  if (!target || G.state !== 'playing') return;
  const pulse = 26 + Math.sin(G.time * 5) * 6;
  ctx.save();
  ctx.strokeStyle = '#ffd60a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,214,10,0.18)';
  ctx.beginPath();
  ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
  ctx.fill();
  // Beam of light.
  ctx.fillStyle = 'rgba(255,214,10,0.25)';
  ctx.fillRect(target.x - 4, target.y - 320, 8, 320);
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▼', target.x, target.y - 34);
  ctx.restore();
  ctx.textAlign = 'left';
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1b2a3a';
  ctx.fillRect(0, 0, 1280, 720);
  if (G.state === 'menu') { drawMenu(ctx, G); return; }
  // Camera follows the player with a shake offset.
  const shakeX = fx.shake > 0 ? Math.sin(G.time * 61) * fx.shake * 0.5 : 0;
  const shakeY = fx.shake > 0 ? Math.cos(G.time * 57) * fx.shake * 0.5 : 0;
  G.cam.x = Math.max(0, Math.min(WORLD_W - 1280, G.player.x - 640 + shakeX));
  G.cam.y = Math.max(0, Math.min(WORLD_H - 720, G.player.y - 360 + shakeY));
  ctx.save();
  ctx.translate(-G.cam.x, -G.cam.y);
  drawCity(ctx, city, G.cam, 1280, 720);
  drawSkids(ctx, fx);
  drawMissionBeacon(ctx);
  drawPickups(ctx);
  for (const ped of G.peds) drawPedestrian(ctx, ped, G.time);
  for (const car of G.cars) drawCar(ctx, car, G.time);
  drawPlayer(ctx);
  drawEffects(ctx, fx);
  ctx.restore();
  if (G.state === 'playing' || G.state === 'paused') drawHUD(ctx, G);
  if (G.state === 'paused') drawPause(ctx);
  if (G.state === 'busted' || G.state === 'wasted' || G.state === 'missionComplete' || G.state === 'won') drawEnd(ctx, G);
}

function advanceDialogue() {
  if (!G.mission) return;
  const m = MISSIONS[G.mission.index];
  G.mission.dialogueIdx += 1;
  if (G.mission.dialogueIdx < m.intro.length) {
    G.dialogue = m.intro[G.mission.dialogueIdx];
    G.dialogueTime = 6;
  } else {
    G.dialogue = '';
    G.dialogueTime = 0;
  }
}

function startFresh() {
  resetWorld();
  G.state = 'playing';
  startMission(G, 0);
}

function loadAndStart() {
  const save = loadSave();
  resetWorld();
  if (save) {
    G.player.cash = save.cash;
    G.player.score = save.score;
    G.player.missionsDone = save.missionsDone;
    G.player.health = save.health;
    G.player.ammo = save.ammo;
    G.player.x = save.x;
    G.player.y = save.y;
    G.state = 'playing';
    const idx = Math.min(save.missionIndex || 0, MISSIONS.length - 1);
    startMission(G, idx);
  } else {
    startFresh();
  }
}

function handleGlobalKeys() {
  if (input.wasPressed('KeyN')) { toggleMute(); }
  if (G.state === 'menu') {
    if (input.wasPressed('Enter') || input.wasPressed('Space') || input.mouse.clicked) {
      resumeAudio();
      initAudio();
      playSfx('click');
      startFresh();
    } else if (input.wasPressed('KeyL')) {
      resumeAudio();
      loadAndStart();
    }
    return;
  }
  if (G.state === 'playing') {
    resumeAudio();
    if (input.wasPressed('KeyP')) { G.state = 'paused'; playSfx('click'); return; }
    if (input.wasPressed('KeyS')) { saveGame(G); G.notice = 'Game saved.'; G.noticeTime = 2; playSfx('pickup'); }
    if (input.wasPressed('KeyM')) {
      if (!G.mission || G.mission.done) nextMission(G);
      else { G.notice = 'Finish the current job first!'; G.noticeTime = 2; }
    }
    if (G.dialogue && G.dialogueTime > 0 && (input.wasPressed('Enter') || input.mouse.clicked)) advanceDialogue();
    return;
  }
  if (G.state === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) { G.state = 'playing'; }
    return;
  }
  if (G.state === 'missionComplete') {
    if (input.wasPressed('Enter') || input.mouse.clicked) nextMission(G);
    return;
  }
  if (G.state === 'busted' || G.state === 'wasted') {
    if (input.wasPressed('Enter')) { startFresh(); }
    else if (input.wasPressed('KeyR')) { resetWorld(); G.state = 'menu'; }
    return;
  }
  if (G.state === 'won') {
    if (input.wasPressed('Enter') || input.mouse.clicked) { resetWorld(); G.state = 'menu'; }
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  handleGlobalKeys();
  if (!G.frozen && (G.state === 'playing')) update(dt);
  else if (!G.frozen) updateEffects(fx, dt);
  render();
  if (G.state === 'playing' || G.state === 'menu') {
    statusEl.textContent = 'Palmera City — cash $' + G.player.cash + ', wanted ' + G.player.wanted + ' stars, ' + (G.mission ? MISSIONS[G.mission.index].title : 'free roam');
  }
  input.endFrame();
  requestAnimationFrame(frame);
}

// First paint immediately so a screenshot catches the staged scene even
// before the first animation frame settles.
render();
requestAnimationFrame(frame);
