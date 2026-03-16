import type { Combatant, StatusEffect } from "../types/GameTypes";

/** Predefined status effect templates. Clone before applying. */
export const STATUS_TEMPLATES: Record<string, Omit<StatusEffect, "duration"> & { defaultDuration: number }> = {
  burn: {
    id: "burn",
    name: "Burn",
    defaultDuration: 3,
    tickDamage: 4,
    flags: ["burning"],
  },
  poison: {
    id: "poison",
    name: "Poison",
    defaultDuration: 3,
    tickDamage: 3,
    flags: ["poisoned"],
  },
  bleed: {
    id: "bleed",
    name: "Bleed",
    defaultDuration: 3,
    tickDamage: 4,
    flags: ["bleeding"],
  },
  guard: {
    id: "guard",
    name: "Guard",
    defaultDuration: 1,
    statModifier: { damageReduction: 0.4 },
    flags: ["guarding"],
  },
  oiled: {
    id: "oiled",
    name: "Oiled",
    defaultDuration: 2,
    // Oiled itself does nothing — other skills check the flag for combo damage
    flags: ["oiled"],
  },
  weaken: {
    id: "weaken",
    name: "Weaken",
    defaultDuration: 2,
    statModifier: { attack: -4, defense: -2 },
    flags: ["weakened"],
  },
  stun: {
    id: "stun",
    name: "Stun",
    defaultDuration: 1,
    flags: ["stunned"],
  },
  freeze: {
    id: "freeze",
    name: "Freeze",
    defaultDuration: 2,
    statModifier: { speed: -4 },
    flags: ["frozen"],
  },
  blind: {
    id: "blind",
    name: "Blind",
    defaultDuration: 2,
    statModifier: { attack: -5 },
    flags: ["blinded"],
  },
  fear: {
    id: "fear",
    name: "Fear",
    defaultDuration: 2,
    statModifier: { defense: -3, speed: -2 },
    flags: ["feared"],
  },
  regen: {
    id: "regen",
    name: "Regenerate",
    defaultDuration: 3,
    // Negative tickDamage = healing per round
    tickDamage: -5,
    flags: ["regenerating"],
  },
};

/**
 * Apply a status effect to a combatant.
 * If the same effect is already active, refresh its duration.
 */
export function applyStatus(target: Combatant, effect: StatusEffect): void {
  const existing = target.statusEffects.find((s) => s.id === effect.id);
  if (existing) {
    // Refresh duration if new one is longer
    if (effect.duration > existing.duration) {
      existing.duration = effect.duration;
    }
    return;
  }
  target.statusEffects.push({ ...effect });

  // Apply persistent stat modifiers immediately
  if (effect.statModifier) {
    applyStatModifier(target, effect.statModifier, 1);
  }
}

/**
 * Tick all status effects on a combatant at the start/end of their turn.
 * Returns a log of messages describing what happened.
 */
export function tickStatuses(target: Combatant): string[] {
  const log: string[] = [];
  const expired: StatusEffect[] = [];

  for (const effect of target.statusEffects) {
    if (effect.tickDamage !== undefined && effect.tickDamage !== 0) {
      if (effect.tickDamage < 0) {
        // Negative tickDamage = healing (e.g. Regenerate)
        const healAmount = Math.abs(effect.tickDamage);
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + healAmount);
        log.push(`${target.name} regenerates ${healAmount} HP. (${target.stats.hp}/${target.stats.maxHp} HP)`);
      } else {
        target.stats.hp = Math.max(0, target.stats.hp - effect.tickDamage);
        log.push(`${target.name} takes ${effect.tickDamage} ${effect.name} damage. (${target.stats.hp}/${target.stats.maxHp} HP)`);
      }
    }

    effect.duration -= 1;

    if (effect.duration <= 0) {
      expired.push(effect);
    }
  }

  // Remove expired effects and undo their stat modifiers
  for (const effect of expired) {
    removeStatus(target, effect.id);
    log.push(`${target.name}'s ${effect.name} wore off.`);
  }

  return log;
}

/**
 * Remove a status effect by id and undo any stat modifiers it applied.
 */
export function removeStatus(target: Combatant, statusId: string): void {
  const index = target.statusEffects.findIndex((s) => s.id === statusId);
  if (index === -1) return;

  const [effect] = target.statusEffects.splice(index, 1);

  if (effect.statModifier) {
    applyStatModifier(target, effect.statModifier, -1);
  }
}

/**
 * Check if a combatant has a specific status flag active.
 * Useful for combo checks (e.g. isOiled, isBurning).
 */
export function hasStatusFlag(target: Combatant, flag: string): boolean {
  return target.statusEffects.some((s) => s.flags?.includes(flag));
}

/** Internal helper: scale a stat modifier by direction (+1 to apply, -1 to remove) */
function applyStatModifier(target: Combatant, modifier: Partial<typeof target.stats>, direction: 1 | -1): void {
  for (const key of Object.keys(modifier) as Array<keyof typeof modifier>) {
    const value = modifier[key];
    if (value !== undefined) {
      (target.stats[key] as number) += (value as number) * direction;
    }
  }
}
