// Deterministic screenshot staging: each ?shot= mode sets up one readable
// scene from the fixed seed, freezes the simulation, and renders one frame.
// The game itself never depends on these; they only pose the camera.
import { makeCar, makePoliceCar } from './vehicles.js';
import { startMission } from './missions.js';

function placePlayerCar(G, x, y, angle, color) {
  const car = makeCar(G.rng, x, y, angle, { color: color || '#e63946', kind: 'sport', driver: 'player', isPlayer: true });
  car.speed = 260;
  G.player.car = car;
  G.player.x = x;
  G.player.y = y;
  G.player.angle = angle;
  G.cars.push(car);
  return car;
}

function addPoliceBehind(G, x, y, angle, count) {
  for (let i = 0; i < count; i++) {
    const px = x - Math.cos(angle) * (90 + i * 70) + (i % 2 === 0 ? 40 : -40);
    const py = y - Math.sin(angle) * (90 + i * 70) + (i % 2 === 0 ? 30 : -30);
    const car = makePoliceCar(G.rng, px, py, angle);
    car.speed = 240;
    G.cars.push(car);
  }
}

export function applyShot(G, mode) {
  G.frozen = true;
  G.state = 'playing';
  G.dialogue = '';
  G.dialogueTime = 0;
  if (mode === 'menu') {
    G.state = 'menu';
    return;
  }
  if (mode === 'cover') {
    // Police chase: player driving east down the Downtown avenue, three
    // wanted stars, three police cars behind, mission objective on the HUD.
    startMission(G, 1);
    G.mission.step = 1;
    G.player.wanted = 3;
    G.player.cash = 1240;
    G.player.score = 3850;
    G.player.ammo = 24;
    placePlayerCar(G, 1500, 1100, 0, '#e63946');
    addPoliceBehind(G, 1500, 1100, 0, 3);
    G.dialogue = 'Dizzy: Faster, Kai! They are right behind us — the safehouse is in Palm Heights!';
    G.dialogueTime = 99;
    return;
  }
  if (mode === 'drive') {
    // Driving through traffic on a sunny avenue.
    startMission(G, 0);
    G.mission.step = 1;
    G.player.wanted = 0;
    G.player.cash = 320;
    G.player.score = 1200;
    placePlayerCar(G, 1100, 1500, 0, '#2a9d8f');
    return;
  }
  if (mode === 'mission') {
    // On foot at the Palm Park pickup, mission marker and dialogue visible.
    startMission(G, 1);
    G.mission.step = 0;
    G.player.wanted = 1;
    G.player.cash = 480;
    G.player.score = 2100;
    G.player.ammo = 18;
    G.player.x = 1180;
    G.player.y = 1300;
    G.player.angle = Math.PI / 4;
    G.player.car = null;
    G.dialogue = 'Dizzy: Kai! Over here — by the fountain! Get me out of here, quick!';
    G.dialogueTime = 99;
    return;
  }
  // Default: free roam driving shot.
  G.player.wanted = 0;
  placePlayerCar(G, 1500, 700, 0, '#f4a261');
}
