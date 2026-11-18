// Story and missions for Palmera City. Kai Marlowe, a courier for Sunset
// Couriers, takes jobs from Mama Rosa across four missions: a delivery, a
// getaway, a harbour car job and a rescue. Each mission is a chain of steps
// with a world target, on-screen objective text and dialogue.
import { addWanted } from './police.js';
import { playSfx } from './audio.js';
import { addFloat, spawnExplosion } from './effects.js';

export const MISSIONS = [
  {
    id: 'delivery',
    title: 'Mission 1 — Sunrise Delivery',
    giver: 'Mama Rosa',
    intro: [
      'Mama Rosa: Kai, the sunrise parcels are late. Pick up the crate at the Sunset Couriers depot.',
      'Mama Rosa: Then run it down to the beach cafe before the coffee gets cold. No cops, no fuss.',
    ],
    steps: [
      { type: 'goto', text: 'Pick up the parcel at Sunset Couriers depot (Downtown)', x: 1550, y: 900, radius: 70 },
      { type: 'goto', text: 'Deliver the parcel to the Beach Cafe on Sunset Beach', x: 1750, y: 2140, radius: 70 },
    ],
    reward: 150,
  },
  {
    id: 'getaway',
    title: 'Mission 2 — The Getaway',
    giver: 'Dizzy',
    intro: [
      'Dizzy: Kai! I borrowed a little too much from the wrong card table. Cops are on me!',
      'Dizzy: Grab me at Palm Park and drive us to the safehouse in Palm Heights. Lose the heat!',
    ],
    steps: [
      { type: 'goto', text: 'Pick up Dizzy at Palm Park', x: 1300, y: 1300, radius: 70 },
      { type: 'escape', text: 'Escape to the Palm Heights safehouse — lose the police!', x: 450, y: 450, radius: 80 },
    ],
    reward: 300,
  },
  {
    id: 'harbour',
    title: 'Mission 3 — Harbour Run',
    giver: 'Mama Rosa',
    intro: [
      'Mama Rosa: A client left a cherry-red Comet GT at the harbour. It needs a new home.',
      'Mama Rosa: Bring it to the garage in Downtown. The harbour guards will not love you for it.',
    ],
    steps: [
      { type: 'steal', text: 'Steal the red Comet GT at Harbour East', x: 2970, y: 900, radius: 80 },
      { type: 'deliver', text: 'Deliver the Comet GT to the Downtown garage', x: 1900, y: 1100, radius: 80 },
    ],
    reward: 450,
  },
  {
    id: 'rescue',
    title: 'Mission 4 — The Rescue',
    giver: 'Mama Rosa',
    intro: [
      'Mama Rosa: They grabbed Dizzy at the clinic. The whole force is out tonight.',
      'Mama Rosa: Get to the clinic, grab Dizzy, and bring him to the beach. This is the big one, Kai.',
    ],
    steps: [
      { type: 'goto', text: 'Reach Dizzy at the Downtown clinic', x: 2100, y: 700, radius: 70 },
      { type: 'escape', text: 'Drive Dizzy to Sunset Beach — outrun the police!', x: 2200, y: 2140, radius: 80 },
    ],
    reward: 800,
  },
];

export function startMission(G, index) {
  const m = MISSIONS[index];
  if (!m) return;
  G.mission = {
    index,
    step: 0,
    title: m.title,
    dialogue: m.intro.slice(),
    dialogueIdx: 0,
    done: false,
    timer: 0,
  };
  G.dialogue = m.intro[0];
  G.dialogueTime = 6;
  if (index === 1 || index === 3) addWanted(G, 2, 'The police are onto you!');
  playSfx('mission');
}

export function missionTarget(G) {
  if (!G.mission) return null;
  const m = MISSIONS[G.mission.index];
  if (!m || G.mission.step >= m.steps.length) return null;
  return m.steps[G.mission.step];
}

export function missionText(G) {
  if (!G.mission) return 'Press M to start the next job for Sunset Couriers.';
  const m = MISSIONS[G.mission.index];
  if (G.mission.done) return 'Mission complete!';
  const step = m.steps[G.mission.step];
  return step ? step.text : '';
}

export function updateMission(G, dt) {
  if (!G.mission || G.mission.done) return;
  const m = MISSIONS[G.mission.index];
  const step = m.steps[G.mission.step];
  if (!step) return;
  const dx = G.player.x - step.x;
  const dy = G.player.y - step.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  G.mission.distance = Math.round(dist);
  // Escape steps need the heat gone as well as arrival.
  if (step.type === 'escape' && dist < step.radius && G.player.wanted > 0) {
    G.mission.hint = 'You made it — now lose the heat! Stay out of sight.';
    return;
  }
  if (dist < step.radius) {
    if (step.type === 'steal') {
      // The steal step completes when the player is driving any car near the spot.
      if (!G.player.car) {
        G.mission.hint = 'Get in the red Comet GT first! Press E near a car.';
        return;
      }
      if (G.player.car.color !== '#e63946' && G.player.car.color !== '#ff2d2d') {
        G.mission.hint = 'That is not the Comet GT — find the red one!';
        return;
      }
    }
    if (step.type === 'deliver' && !G.player.car) {
      G.mission.hint = 'You need the Comet GT to deliver it. Get back in the car!';
      return;
    }
    advanceMissionStep(G);
  }
}

function advanceMissionStep(G) {
  const m = MISSIONS[G.mission.index];
  G.mission.step += 1;
  G.mission.hint = '';
  playSfx('pickup');
  addFloat(G.fx, G.player.x, G.player.y - 40, 'Objective done!', '#ffd60a');
  if (G.mission.step >= m.steps.length) {
    completeMission(G);
  } else {
    G.dialogue = 'Mama Rosa: Good. Next: ' + m.steps[G.mission.step].text;
    G.dialogueTime = 5;
  }
}

export function completeMission(G) {
  const m = MISSIONS[G.mission.index];
  G.mission.done = true;
  G.player.cash += m.reward;
  G.player.score += m.reward * 10;
  G.player.missionsDone += 1;
  playSfx('cash');
  addFloat(G.fx, G.player.x, G.player.y - 50, '+$' + m.reward, '#69db7c');
  G.state = 'missionComplete';
  G.completeMessage = m.title + ' — complete! +$' + m.reward;
  G.player.wanted = Math.max(0, G.player.wanted - 1);
  saveGame(G);
}

export function nextMission(G) {
  const next = G.mission ? G.mission.index + 1 : 0;
  if (next >= MISSIONS.length) {
    G.state = 'won';
    G.endMessage = 'YOU OWN PALMERA CITY — every job done, every debt paid. Sunset Couriers runs this town now.';
    return;
  }
  G.state = 'playing';
  startMission(G, next);
}

export function saveGame(G) {
  try {
    const data = {
      cash: G.player.cash,
      score: G.player.score,
      missionsDone: G.player.missionsDone,
      missionIndex: G.mission ? G.mission.index + 1 : 0,
      health: G.player.health,
      ammo: G.player.ammo,
      x: Math.round(G.player.x),
      y: Math.round(G.player.y),
    };
    window.localStorage.setItem('palmera-city-save-v1', JSON.stringify(data));
  } catch (e) { /* storage unavailable: the game still plays */ }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem('palmera-city-save-v1');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function hasSave() {
  return loadSave() !== null;
}
