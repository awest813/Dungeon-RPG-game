# Dungeon RPG

A browser-based, turn-based dungeon RPG built with [Babylon.js](https://www.babylonjs.com/) and TypeScript.

## 🎮 About

Heroes explore a dungeon, fighting enemy encounters in turn-based combat. The game uses a speed-based turn order, status effects, skill combos, and a party system.

## 🧭 Prerequisites

* Node 16+
* npm

## 🤖 Getting started

```sh
npm install
npm run dev       # start dev server
npm run build     # production build
npm run typecheck # TypeScript type-check
```

---

## ✅ Milestone 1 — Turn-Based Combat Foundation (Complete)

Core gameplay loop: Boot → Town → Combat → Return to Town.

| Feature | Status |
|---|---|
| Boot splash screen | ✅ |
| Town hub scene | ✅ |
| Turn-based combat (speed-based order) | ✅ |
| Skill system (damage / heal / buff / debuff) | ✅ |
| Status effects (Burn, Poison, Guard, Oiled, Weaken) | ✅ |
| Oil + Burn combo interaction | ✅ |
| Status effect display in combat UI | ✅ |
| **Skill cooldown enforcement** | ✅ |
| **Interactive target selection** | ✅ |
| Enemy AI (random skill, random target) | ✅ |
| Party: Aldric (Warrior) + Lyra (Ranger) | ✅ |
| Enemies: Goblin, Orc Brute, Skeleton Mage | ✅ |
| Skills: Slash, Guard, Fire Arrow, Oil Flask, Heal, Poison Dart | ✅ |
| Victory / Defeat end screens | ✅ |

---

## ✅ Milestone 2 — Dungeon Progression (Complete)

Multi-encounter dungeon runs with persistent hero state, XP-based leveling, gold rewards, and a town upgrade shop.

| Feature | Status |
|---|---|
| **Multi-encounter dungeons** (3 fights per run, heroes keep HP) | ✅ |
| **Experience & leveling** (XP per enemy; stat bonuses on level-up) | ✅ |
| **Gold & rewards** (enemies drop gold; tracked across the run) | ✅ |
| **Town upgrade shop** (Blacksmith / Inn / Alchemist) | ✅ |
| **Party stats display** (HP, level, XP, ATK, DEF in Town) | ✅ |
| **Encounter progress indicator** in combat UI | ✅ |
| **Persistent hero state** across encounters within a run | ✅ |
| **Status effects / cooldowns cleared between encounters** | ✅ |
| **Defeat recovery** (heroes restored to full HP on return to town) | ✅ |

### Architecture changes

- `Game.ts` owns the persistent `heroes` array and `gold`; creates a `DungeonManager` per run.
- `CombatScene` accepts an options object (`heroes`, `enemies`, `encounterNum`, callbacks) instead of hard-coded data.
- `TownScene` renders party stats and a 3-button upgrade shop.
- `CombatManager` no longer deep-copies heroes so HP/XP changes persist across encounters.
- `DungeonManager.advanceEncounter()` awards XP/gold and returns `LevelUpEvent[]`.

---

## ✅ Milestone 3 — Procedural Dungeon Generation & Expanded Content (Complete)

Procedurally generated encounters that scale with each completed run, plus two new enemies and two new skills.

| Feature | Status |
|---|---|
| **Procedural encounter generation** (tiered enemy pool, random composition) | ✅ |
| **Dungeon depth scaling** (enemy HP, ATK, DEF increase per completed run) | ✅ |
| **New enemy: Troll Brute** (high HP/ATK, uses Slam + Guard) | ✅ |
| **New enemy: Dark Archer** (high speed, uses Weaken Shot + Slash) | ✅ |
| **New skill: Slam** (heavy single-target damage, power 16) | ✅ |
| **New skill: Weaken Shot** (applies Weaken — −4 ATK / −2 DEF for 2 turns) | ✅ |
| **Unique enemy IDs** (two enemies of the same type can be targeted individually) | ✅ |
| **Dungeon depth display** in Town UI | ✅ |

### Architecture changes

- `DungeonManager` constructor now accepts a `depth: number` parameter (default 0).
- `buildProceduralEncounters(depth)` replaces the hardcoded `buildDefaultEncounters()`: enemies are drawn from three difficulty tiers and stat-scaled by depth.
- `Game.ts` tracks `dungeonDepth` (incremented on each completed run) and passes it to `DungeonManager` and `TownScene`.
- Cloned enemies receive unique sequential IDs so the player can target each one independently.

---

## ✅ Milestone 4 — New Enemies, Spells, Status Effects & Mage Class (Complete)

OSR-inspired enemy roster expansion, a full Mage hero class with spells, new status effects, and AoE / drain skill mechanics.

| Feature | Status |
|---|---|
| **8 new enemies** from OSR bestiary: Giant Rat, Zombie, Giant Spider, Harpy, Wight, Minotaur, Basilisk, Fire Drake | ✅ |
| **New status effects**: Bleed (tick damage), Stun (lose turn), Freeze (−speed), Blind (−attack), Fear (−def/−speed), Regenerate (+HP per round) | ✅ |
| **Drain skill type** — Life Drain deals damage and heals the actor for 50% of damage dealt | ✅ |
| **AoE skills** — Fire Breath & Fireball hit all enemies; correctly handled in CombatManager and UI | ✅ |
| **Stun skip-turn mechanic** — stunned heroes/enemies automatically lose their turn | ✅ |
| **Regen (negative tick)** — Regenerate heals HP each round in StatusSystem | ✅ |
| **Mage job** with 6 spells: Mana Bolt, Fireball, Ice Lance, Thunderbolt, Arcane Shield, Blinding Flash | ✅ |
| **Mira (Mage)** added as third hero — backline spellcaster | ✅ |
| **4-tier encounter system** in DungeonManager: intro / easy / mid / hard, with boss Fire Drake at depth ≥ 3 | ✅ |
| **13 new skills** added to skills registry | ✅ |

### Architecture changes

- `GameTypes.ts`: added `"drain"` to `SkillType`; added `drainRatio?: number` to `Skill`.
- `StatusSystem.ts`: 6 new status templates; `tickStatuses` now handles negative `tickDamage` as healing.
- `SkillResolver.ts`: handles `"drain"` skill type (damage + self-heal).
- `CombatManager.ts`: `executeAction` handles `all_enemies` / `all_allies` AoE; `processStunIfNeeded()` skips stunned actors; `executeEnemyTurn` calls stun check and routes AoE skills.
- `CombatScene.ts`: hero stun display + skip button; AoE skills auto-fire without target selection prompt.
- `DungeonManager.ts`: 4 enemy tiers; depth ≥ 3 unlocks boss-tier Fire Drake encounters.



```
src/
  main.ts              Entry point
  Game.ts              Engine + scene manager
  scenes/
    BaseScene.ts       Abstract base class
    BootScene.ts       Splash screen
    TownScene.ts       Hub between dungeon runs
    CombatScene.ts     Turn-based battle
  combat/
    CombatManager.ts   Turn order, action dispatch, cooldown tracking
    SkillResolver.ts   Damage / heal / status calculation
    StatusSystem.ts    Status effect application and tick
  dungeon/
---

## ✅ Milestone 5 — Item Shop, Party Inventory & Rogue Class (Complete)

A fully wired consumable item economy, enemy loot drops, and a new Rogue hero class.

| Feature | Status |
|---|---|
| **Party inventory** — `partyItems` shared across all encounters and runs | ✅ |
| **Enemy loot drops** — consumables dropped after every encounter (depth-gated) | ✅ |
| **Apothecary shop** in Town — buy all 6 consumables with gold | ✅ |
| **Inventory panel** in Town — see exactly what the party is carrying | ✅ |
| **Items usable in combat** — ⚗ Items button + full target-selection UI (pre-built M4) | ✅ |
| **New Rogue job** — high speed (SPD +4), high crit (35%), skills: Backstab / Shadow Step / Garrote / Vanish | ✅ |
| **Silvar (Rogue)** — 4th hero, fastest in the party, back-line assassin | ✅ |
| **4 new Rogue skills** — Backstab (heavy dmg+Bleed), Shadow Step (dmg+Stun), Garrote (dmg+long Bleed), Vanish (60% DR) | ✅ |
| **Dynamic hero 3D positioning** — combat scene adapts to any party size | ✅ |

### Architecture changes

- `DungeonManager.advanceEncounter()` now returns `EncounterRewards { levelUps, droppedItems }` instead of `LevelUpEvent[]`.
- `DungeonManager.generateDrops()` rolls per-encounter item drops; drop table expands with dungeon depth.
- `Game.ts`: added `private partyItems` state; `buyItem()` handler; passes `partyItems` to both `TownScene` and `CombatScene`; merges loot drops on encounter victory.
- `TownScene`: two new panels — **Inventory** (chips showing held items + quantity) and **Apothecary** (2-column buy grid for all 6 consumables). Card is now scrollable (`max-height: 92vh`).
- `CombatScene`: hero mesh start position is now calculated dynamically so a 4-hero party never overlaps enemies.

---

```
src/
  main.ts              Entry point
  Game.ts              Engine + scene manager
  scenes/
    BaseScene.ts       Abstract base class
    BootScene.ts       Splash screen
    TownScene.ts       Hub between dungeon runs
    CombatScene.ts     Turn-based battle
  combat/
    CombatManager.ts   Turn order, action dispatch, cooldown tracking
    SkillResolver.ts   Damage / heal / status calculation
    StatusSystem.ts    Status effect application and tick
  dungeon/
    DungeonManager.ts  Multi-encounter dungeon runs
  data/
    skills.ts          Skill definitions (41 skills total, incl. 4 new Rogue skills)
    jobs.ts            Job/class definitions (Warrior, Ranger, Mage, Rogue)
    heroes.ts          Starting hero party (Aldric, Lyra, Mira, Silvar)
    enemies.ts         Enemy definitions (15 enemies across 4 tiers)
    items.ts           Consumable items (6 items)
  types/
    GameTypes.ts       Core TypeScript interfaces
```

## 🦉 License

MIT

