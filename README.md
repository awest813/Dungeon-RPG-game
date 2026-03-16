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

## 🏗 Architecture

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
    DungeonManager.ts  Multi-encounter dungeon runs (Milestone 2 scaffold)
  data/
    skills.ts          Skill definitions
    jobs.ts            Job/class definitions
    heroes.ts          Starting hero party
    enemies.ts         Enemy definitions
  types/
    GameTypes.ts       Core TypeScript interfaces
```

## 🦉 License

MIT

