// HUD, minimap and menus: everything drawn on top of the world — cash and
// health, wanted stars, the mission banner, the minimap, dialogue, and the
// start / pause / game-over screens.
import { ROAD_X, ROAD_Y, WORLD_W, WORLD_H } from './city.js';
import { missionText, missionTarget, MISSIONS } from './missions.js';

export function drawStars(ctx, x, y, wanted) {
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < wanted ? '#ffd60a' : 'rgba(255,255,255,0.35)';
    ctx.fillText('★', x + i * 28, y);
  }
}

export function drawMinimap(ctx, G) {
  const mw = 230;
  const mh = 172;
  const mx = 1280 - mw - 14;
  const my = 14;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;
  ctx.save();
  ctx.fillStyle = 'rgba(10,20,30,0.82)';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.strokeStyle = '#ffd60a';
  ctx.lineWidth = 2;
  ctx.strokeRect(mx - 4, my - 4, mw + 8, mh + 8);
  // Water and beach.
  ctx.fillStyle = '#2fa8c9';
  ctx.fillRect(mx + 2900 * sx, my, (WORLD_W - 2900) * sx, mh);
  ctx.fillRect(mx, my + 2320 * sy, mw, (WORLD_H - 2320) * sy);
  ctx.fillStyle = '#e8c97a';
  ctx.fillRect(mx, my + 2080 * sy, mw, 240 * sy);
  // Parks.
  ctx.fillStyle = '#5da85a';
  for (const p of G.city.parks) ctx.fillRect(mx + p.x * sx, my + p.y * sy, p.w * sx, p.h * sy);
  // Roads.
  ctx.strokeStyle = '#8a8f9a';
  ctx.lineWidth = 3;
  for (const rx of ROAD_X) {
    ctx.beginPath(); ctx.moveTo(mx + rx * sx, my); ctx.lineTo(mx + rx * sx, my + mh); ctx.stroke();
  }
  for (const ry of ROAD_Y) {
    ctx.beginPath(); ctx.moveTo(mx, my + ry * sy); ctx.lineTo(mx + mw, my + ry * sy); ctx.stroke();
  }
  // Traffic dots.
  ctx.fillStyle = '#adb5bd';
  for (const car of G.cars) {
    if (car.isPolice) continue;
    ctx.fillRect(mx + car.x * sx - 1, my + car.y * sy - 1, 2, 2);
  }
  // Police dots.
  ctx.fillStyle = '#ff2d2d';
  for (const car of G.cars) {
    if (!car.isPolice) continue;
    ctx.beginPath(); ctx.arc(mx + car.x * sx, my + car.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Mission marker.
  const target = missionTarget(G);
  if (target && G.state === 'playing') {
    const pulse = 5 + Math.sin(G.time * 5) * 2;
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath(); ctx.arc(mx + target.x * sx, my + target.y * sy, pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', mx + target.x * sx, my + target.y * sy + 3);
  }
  // Player arrow.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(mx + G.player.x * sx, my + G.player.y * sy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(mx + G.player.x * sx, my + G.player.y * sy, 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PALMERA CITY', mx, my + mh + 18);
  ctx.restore();
}

export function drawHUD(ctx, G) {
  const p = G.player;
  // Top-left status panel.
  ctx.fillStyle = 'rgba(10,20,30,0.72)';
  ctx.fillRect(12, 12, 300, 96);
  ctx.fillStyle = '#69db7c';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('$' + p.cash, 24, 42);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText('SCORE ' + p.score, 24, 66);
  // Health bar.
  ctx.fillStyle = '#343a40';
  ctx.fillRect(24, 76, 180, 12);
  ctx.fillStyle = p.health > 40 ? '#69db7c' : '#ff6b6b';
  ctx.fillRect(24, 76, Math.max(0, 180 * p.health / 100), 12);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('HP ' + Math.ceil(p.health), 210, 86);
  // Wanted stars, top centre-right.
  ctx.fillStyle = 'rgba(10,20,30,0.72)';
  ctx.fillRect(330, 12, 190, 56);
  if (p.wanted > 0) {
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('WANTED', 344, 30);
  }
  drawStars(ctx, 344, 52, p.wanted);
  // Ammo and vehicle state.
  ctx.fillStyle = 'rgba(10,20,30,0.72)';
  ctx.fillRect(12, 116, 300, 56);
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(p.car ? 'DRIVING  •  ' + p.car.kind.toUpperCase() : 'ON FOOT', 24, 138);
  ctx.fillStyle = '#fff';
  ctx.fillText('AMMO ' + p.ammo + '   •   ' + (p.car ? Math.round(Math.abs(p.car.speed) * 0.9) + ' km/h' : 'SHIFT sprint'), 24, 160);
  drawMinimap(ctx, G);
  // Mission banner.
  ctx.fillStyle = 'rgba(10,20,30,0.72)';
  ctx.fillRect(330, 76, 620, 52);
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 16px sans-serif';
  const mission = G.mission ? MISSIONS[G.mission.index].title : 'FREE ROAM — press M for the next job';
  ctx.fillText(mission, 344, 98);
  ctx.fillStyle = '#fff';
  ctx.font = '15px sans-serif';
  ctx.fillText(missionText(G), 344, 118);
  if (G.mission && G.mission.distance !== undefined) {
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(G.mission.distance + 'm', 936, 118);
    ctx.textAlign = 'left';
  }
  if (G.mission && G.mission.hint) {
    ctx.fillStyle = '#ff9f1c';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(G.mission.hint, 344, 140);
  }
  // Notice line.
  if (G.noticeTime > 0 && G.notice) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(G.notice, 640, 150);
    ctx.textAlign = 'left';
  }
  // Arrest warning.
  if (p.arrestTimer > 0.2) {
    ctx.fillStyle = '#ff2d2d';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE POLICE ARE GRABBING YOU — RUN! (arrest in ' + Math.max(0, (1.6 - p.arrestTimer)).toFixed(1) + 's)', 640, 180);
    ctx.textAlign = 'left';
  }
  // Dialogue box.
  if (G.dialogue && G.dialogueTime > 0) {
    ctx.fillStyle = 'rgba(10,20,30,0.85)';
    ctx.fillRect(180, 560, 920, 84);
    ctx.strokeStyle = '#ffd60a';
    ctx.lineWidth = 2;
    ctx.strokeRect(180, 560, 920, 84);
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('DIALOGUE — press ENTER to continue', 200, 584);
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    wrapText(ctx, G.dialogue, 200, 606, 880, 20);
  }
  // Controls reminder.
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '13px sans-serif';
  ctx.fillText('WASD move/drive • E enter/exit car • F punch • SPACE shoot / handbrake • M mission • S save • P pause • L load', 14, 700);
  // Hurt vignette.
  if (p.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255,0,0,${p.hurtFlash * 0.5})`;
    ctx.fillRect(0, 0, 1280, 720);
  }
  // Low health warning.
  if (p.health > 0 && p.health <= 25 && G.state === 'playing') {
    ctx.fillStyle = '#ff2d2d';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOW HEALTH — find a car and get out of there!', 640, 210);
    ctx.textAlign = 'left';
  }
}

export function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

export function drawMenu(ctx, G) {
  // Sunset gradient sky over a drawn city strip.
  const grad = ctx.createLinearGradient(0, 0, 0, 720);
  grad.addColorStop(0, '#ff9e57');
  grad.addColorStop(0.5, '#ff6b9d');
  grad.addColorStop(1, '#5b2a86');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = '#ffd60a';
  ctx.beginPath();
  ctx.arc(1160, 105, 55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(1160, 105, 72, 0, Math.PI * 2);
  ctx.fill();
  // City silhouette.
  ctx.fillStyle = '#2b2d42';
  const skyline = [120, 200, 150, 240, 180, 260, 140, 220, 170, 250, 130, 210];
  let sx = 0;
  for (const h of skyline) {
    ctx.fillRect(sx, 560 - h, 100, h + 160);
    sx += 108;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('PALMERA CITY', 640, 170);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('A SUNSET HEIST STORY', 640, 215);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#ffe8a3';
  ctx.fillText('An open-world crime game: steal cars, outrun the police, run jobs for Sunset Couriers.', 640, 260);
  ctx.fillText('Four story missions. One city that never sleeps. No mercy after dark.', 640, 286);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PRESS ENTER OR CLICK TO START', 640, 350);
  if (G.saveExists) {
    ctx.fillStyle = '#69db7c';
    ctx.fillText('PRESS L TO CONTINUE YOUR SAVED GAME', 640, 382);
  }
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#e9ecef';
  const lines = [
    'MOVE / DRIVE  —  W A S D or Arrow keys',
    'ENTER / EXIT CAR  —  E (walk up to any car and steal it)',
    'PUNCH  —  F      SHOOT  —  SPACE or mouse click (on foot)',
    'HANDBRAKE  —  SPACE while driving      HORN  —  H',
    'NEXT MISSION  —  M      SAVE  —  S      PAUSE  —  P      MUTE  —  N',
    'Steal cars, dodge traffic, watch the wanted stars — five stars means the whole city is after you.',
  ];
  let ly = 430;
  for (const line of lines) { ctx.fillText(line, 640, ly); ly += 28; }
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('An original game: Palmera City, Kai Marlowe, Mama Rosa and Dizzy are invented for this game. No real city, no borrowed names.', 640, 660);
  ctx.textAlign = 'left';
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('PAUSED', 640, 320);
  ctx.font = '20px sans-serif';
  ctx.fillText('Press P to keep playing — S to save — M for the next mission', 640, 370);
  ctx.textAlign = 'left';
}

export function drawEnd(ctx, G) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  const title = G.state === 'busted' ? 'BUSTED!' : G.state === 'wasted' ? 'WASTED!' : G.state === 'won' ? 'YOU OWN PALMERA CITY!' : 'MISSION COMPLETE!';
  ctx.fillStyle = G.state === 'won' ? '#69db7c' : G.state === 'missionComplete' ? '#ffd60a' : '#ff6b6b';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(title, 640, 300);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText(G.endMessage || G.completeMessage || '', 640, 350);
  ctx.font = '18px sans-serif';
  ctx.fillText('Cash $' + G.player.cash + '   •   Score ' + G.player.score + '   •   Missions done ' + G.player.missionsDone + ' / ' + MISSIONS.length, 640, 390);
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(G.state === 'missionComplete' ? 'Press ENTER for the next mission' : 'Press ENTER to play again  •  R to restart from the beginning', 640, 440);
  ctx.textAlign = 'left';
}
