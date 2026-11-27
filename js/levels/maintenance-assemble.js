/**
 * Seeded assembly of Service Wing modules into one straight, reversible rail.
 * Guarantees: entry → … → workshop (crowbar) → … → exit.
 */

import {
  MODULE_TEMPLATES,
  MODULE_CORRIDOR,
  MODULE_STORAGE,
  MODULE_ELECTRICAL,
  MODULE_WORKSHOP,
} from './maintenance-modules.js';
import { MAINTENANCE_START_Z } from './maintenance-story.js';

export const ROOM_IDS = Object.freeze({
  entry: 'room:entry',
  exit: 'room:exit',
  workshop: 'room:workshop',
});

export const EVENT_IDS = Object.freeze({
  cart: 'event:tool-cart',
  crowbar: 'event:crowbar',
});

const FILL_POOL = Object.freeze([
  MODULE_CORRIDOR,
  MODULE_STORAGE,
  MODULE_ELECTRICAL,
  MODULE_CORRIDOR,
  MODULE_STORAGE,
]);

function progressAt(worldZ, startZ, meters) {
  if (!(meters > 0)) return 0;
  return Math.max(0, Math.min(1, (startZ - worldZ) / meters));
}

/**
 * @param {ReturnType<import('../procgen/rng.js').createSeededRng>} rng
 * @returns {object} assembly plan
 */
export function assembleMaintenancePlan(rng) {
  if (!rng) throw new Error('assembleMaintenancePlan requires a seeded rng');

  // 2–3 fillers keeps the wing near authored length while still varying.
  const fillCount = 2 + rng.nextInt(0, 2);
  const fillers = rng.shuffle(FILL_POOL).slice(0, fillCount);

  // Keep entry + exit bookends; place workshop somewhere between fillers.
  const sequence = [
    { template: MODULE_CORRIDOR, role: 'entry', roomId: ROOM_IDS.entry },
    ...fillers.map((template, i) => ({
      template,
      role: 'fill',
      roomId: `room:fill-${template.type}-${i}`,
    })),
    { template: MODULE_CORRIDOR, role: 'exit', roomId: ROOM_IDS.exit },
  ];
  // Insert after entry (index ≥ 1) and before exit (index ≤ fillers.length + 1).
  const workshopAt = 1 + rng.nextInt(0, fillers.length + 1);
  sequence.splice(workshopAt, 0, {
    template: MODULE_WORKSHOP,
    role: 'workshop',
    roomId: ROOM_IDS.workshop,
  });

  const startZ = MAINTENANCE_START_Z;
  let cursor = startZ;
  const modules = [];
  const rooms = {};

  for (let i = 0; i < sequence.length; i++) {
    const step = sequence[i];
    const length = step.template.length;
    const instanceId = `${step.roomId}#${i}`;
    const zOrigin = cursor; // entrance connector at this world Z
    modules.push({
      instanceId,
      roomId: step.roomId,
      role: step.role,
      type: step.template.type,
      templateId: step.template.id,
      zOrigin,
      length,
      tags: [...step.template.tags, step.role],
    });
    rooms[step.roomId] = {
      instanceId,
      type: step.template.type,
      zOrigin,
      length,
      entranceZ: zOrigin,
      exitZ: zOrigin - length,
    };
    cursor -= length;
  }

  const totalLength = startZ - cursor;
  if (!(totalLength >= 32 && totalLength <= 64)) {
    throw new Error(`Service Wing assembly length out of range: ${totalLength}`);
  }

  const workshop = modules.find((m) => m.role === 'workshop');
  if (!workshop) throw new Error('Service Wing assembly missing workshop');

  // Cart lives in the first cart-capable module before the workshop.
  const cartHost = modules.find((m) =>
    m.tags.includes('cart-capable') && m.zOrigin > workshop.zOrigin);
  const cartModule = cartHost || modules.find((m) => m.role === 'fill') || modules[1];
  const cartLocalZ = -cartModule.length * 0.55;
  const cartWorldZ = cartModule.zOrigin + cartLocalZ;

  const crowbarLocal = { x: 2.15, y: 0.42, z: -4.25 };
  const crowbarWorld = {
    x: crowbarLocal.x,
    y: crowbarLocal.y,
    z: workshop.zOrigin + crowbarLocal.z,
  };

  const markers = {
    cartPass: progressAt(cartWorldZ + 1.2, startZ, totalLength),
    workshopEnter: progressAt(workshop.zOrigin - 0.5, startZ, totalLength),
    crowbarNear: progressAt(crowbarWorld.z + 1.0, startZ, totalLength),
    end: 0.96,
  };

  // Sanity: ordered along the rail.
  if (!(markers.cartPass < markers.workshopEnter
      && markers.workshopEnter < markers.crowbarNear
      && markers.crowbarNear < markers.end)) {
    // Soft-fix ordering if cart is after workshop (no storage before it).
    markers.cartPass = Math.min(markers.workshopEnter - 0.08, 0.35);
  }

  return {
    version: 1,
    startZ,
    meters: totalLength,
    modules,
    rooms,
    events: {
      [EVENT_IDS.cart]: {
        id: EVENT_IDS.cart,
        roomId: cartModule.roomId,
        instanceId: cartModule.instanceId,
        local: { x: -2.15, y: 0, z: cartLocalZ },
        world: { x: -2.15, y: 0, z: cartWorldZ },
        movedLocal: { x: -1.35, y: 0, z: cartLocalZ - 0.35 },
      },
      [EVENT_IDS.crowbar]: {
        id: EVENT_IDS.crowbar,
        roomId: ROOM_IDS.workshop,
        instanceId: workshop.instanceId,
        local: crowbarLocal,
        world: crowbarWorld,
      },
    },
    markers,
    path: {
      kind: 'straight',
      reversible: true,
      startZ,
      meters: totalLength,
      // Connector chain for debugging / future branches.
      connectors: modules.map((m) => ({
        roomId: m.roomId,
        entranceZ: m.zOrigin,
        exitZ: m.zOrigin - m.length,
      })),
    },
  };
}

/** Validate guarantees used by runtime + tests. */
export function validateMaintenancePlan(plan) {
  if (!plan?.modules?.length) return { ok: false, reason: 'empty' };
  if (plan.path?.kind !== 'straight') return { ok: false, reason: 'path' };
  if (!(plan.meters > 0)) return { ok: false, reason: 'meters' };
  const roles = plan.modules.map((m) => m.role);
  if (roles[0] !== 'entry') return { ok: false, reason: 'entry' };
  if (roles[roles.length - 1] !== 'exit') return { ok: false, reason: 'exit' };
  if (!roles.includes('workshop')) return { ok: false, reason: 'workshop' };
  if (!plan.events?.[EVENT_IDS.crowbar]) return { ok: false, reason: 'crowbar' };
  if (!plan.rooms?.[ROOM_IDS.workshop]) return { ok: false, reason: 'workshop-room' };
  return { ok: true };
}

export { MODULE_TEMPLATES };
