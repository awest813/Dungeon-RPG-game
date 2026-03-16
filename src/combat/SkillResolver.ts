import type { Combatant, Skill, SkillResult, StatusEffect } from "../types/GameTypes";
import { SKILLS } from "../data/skills";
import { applyStatus, hasStatusFlag } from "./StatusSystem";

/**
 * Resolve a skill use from one combatant to another (or self).
 * Returns a SkillResult describing what happened.
 */
export function resolveSkill(
  actor: Combatant,
  target: Combatant,
  skillId: string
): SkillResult {
  const skill: Skill | undefined = SKILLS[skillId];
  if (!skill) {
    return {
      actorId: actor.id,
      targetId: target.id,
      skillId,
      hpChange: 0,
      message: `${actor.name} tried to use unknown skill "${skillId}".`,
    };
  }

  let hpChange = 0;
  let statusApplied: StatusEffect | undefined;
  let message = "";

  switch (skill.type) {
    case "damage": {
      hpChange = calculateDamage(actor, target, skill);
      target.stats.hp = Math.max(0, target.stats.hp + hpChange);
      message = `${actor.name} uses ${skill.name} on ${target.name} for ${Math.abs(hpChange)} damage. (${target.stats.hp}/${target.stats.maxHp} HP)`;
      break;
    }
    case "drain": {
      hpChange = calculateDamage(actor, target, skill);
      target.stats.hp = Math.max(0, target.stats.hp + hpChange);
      const healAmount = Math.round(Math.abs(hpChange) * (skill.drainRatio ?? 0.5));
      actor.stats.hp = Math.min(actor.stats.maxHp, actor.stats.hp + healAmount);
      message = `${actor.name} uses ${skill.name} on ${target.name} for ${Math.abs(hpChange)} damage and heals for ${healAmount} HP. (${actor.stats.hp}/${actor.stats.maxHp} HP)`;
      break;
    }
    case "heal": {
      hpChange = skill.power;
      target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + hpChange);
      message = `${actor.name} heals ${target.name} for ${hpChange} HP. (${target.stats.hp}/${target.stats.maxHp} HP)`;
      break;
    }
    case "buff":
    case "debuff": {
      message = `${actor.name} uses ${skill.name}.`;
      break;
    }
  }

  // Apply status if the skill has one
  if (skill.appliesStatus) {
    const effectToApply: StatusEffect = { ...skill.appliesStatus };

    // Combo: if target is Oiled and skill applies Burn, increase burn tick damage
    if (effectToApply.id === "burn" && hasStatusFlag(target, "oiled")) {
      effectToApply.tickDamage = (effectToApply.tickDamage ?? 0) + 3;
      message += ` The oil ignites — Burn is intensified!`;
    }

    applyStatus(target, effectToApply);
    statusApplied = effectToApply;
    message += ` ${target.name} is now affected by ${effectToApply.name}.`;
  }

  return {
    actorId: actor.id,
    targetId: target.id,
    skillId,
    hpChange,
    statusApplied,
    message,
  };
}

/**
 * Calculate raw damage from attacker to defender.
 * Damage = max(1, attacker.attack + skill.power - defender.defense) × (1 - damageReduction)
 */
function calculateDamage(attacker: Combatant, defender: Combatant, skill: Skill): number {
  const raw = Math.max(1, attacker.stats.attack + skill.power - defender.stats.defense);
  const reduced = raw * (1 - defender.stats.damageReduction);
  return -Math.round(reduced); // negative = damage
}
