# Dungeon RPG

A browser-based, turn-based dungeon RPG built with [Babylon.js](https://www.babylonjs.com/) and TypeScript, styled with a dark Elder Scrolls–inspired aesthetic (Cinzel fonts, amber torchlight, iron-grey panels).

## 🎮 About

Lead a party of four heroes — Warrior, Ranger, Mage, and Rogue — through procedurally generated dungeon encounters. Combat is turn-based with speed-based initiative, skill cooldowns, status effects, AoE spells, consumable items, and persistent XP/gold across runs.

## 🧭 Prerequisites

* Node 18+
* npm

## 🚀 Getting Started

```sh
npm install
npm run dev       # start Vite dev server (http://localhost:5173)
npm run build     # production build → dist/
npm run typecheck # TypeScript type-check (no emit)
```

---

## 🗺️ Project Roadmap

### ✅ Milestone 1 — Turn-Based Combat Foundation

Core gameplay loop: Boot → Town → Combat → Return to Town.

| Feature | Status |
|---|---|
| Boot splash screen | ✅ |
| Town hub scene | ✅ |
| Turn-based combat (speed-based initiative order) | ✅ |
| Skill system (damage / heal / buff / debuff) | ✅ |
| Status effects (Burn, Poison, Guard, Oiled, Weaken) | ✅ |
| Oil + Burn combo interaction | ✅ |
| Status effect display in combat UI | ✅ |
| Skill cooldown enforcement | ✅ |
| Interactive target selection | ✅ |
| Enemy AI (random skill, random target) | ✅ |
| Party: Aldric (Warrior) + Lyra (Ranger) | ✅ |
| Enemies: Goblin, Orc Brute, Skeleton Mage | ✅ |
| Skills: Slash, Guard, Fire Arrow, Oil Flask, Heal, Poison Dart | ✅ |
| Victory / Defeat end screens | ✅ |

---

### ✅ Milestone 2 — Dungeon Progression

Multi-encounter dungeon runs with persistent hero state, XP leveling, gold rewards, and a town upgrade shop.

| Feature | Status |
|---|---|
| Multi-encounter dungeons (3 fights per run, heroes keep HP) | ✅ |
| Experience & leveling (XP per enemy; stat bonuses on level-up) | ✅ |
| Gold rewards (enemies drop gold; tracked across the run) | ✅ |
| Town upgrade shop (Blacksmith / Inn / Alchemist) | ✅ |
| Party stats display (HP, level, XP, ATK, DEF in Town) | ✅ |
| Encounter progress indicator in combat UI | ✅ |
| Persistent hero state across encounters within a run | ✅ |
| Status effects / cooldowns cleared between encounters | ✅ |
| Defeat recovery (heroes restored to full HP on return to town) | ✅ |

**Key changes:** `Game.ts` owns `heroes[]` and `gold`; `DungeonManager` created per run; `CombatManager` no longer deep-copies heroes so HP/XP persist; `DungeonManager.advanceEncounter()` returns `LevelUpEvent[]`.

---

### ✅ Milestone 3 — Procedural Generation & Content Expansion

Procedurally generated encounters that scale with each completed run, plus two new enemies and skills.

| Feature | Status |
|---|---|
| Procedural encounter generation (tiered enemy pool, random composition) | ✅ |
| Dungeon depth scaling (enemy HP / ATK / DEF increase per run) | ✅ |
| New enemy: Troll Brute (high HP/ATK, Slam + Guard) | ✅ |
| New enemy: Dark Archer (high SPD, Weaken Shot + Slash) | ✅ |
| New skill: Slam (heavy single-target, power 16) | ✅ |
| New skill: Weaken Shot (applies Weaken — −4 ATK / −2 DEF for 2 turns) | ✅ |
| Unique enemy IDs so two enemies of the same type can be targeted individually | ✅ |
| Dungeon depth display in Town UI | ✅ |

**Key changes:** `DungeonManager` accepts `depth` param; `buildProceduralEncounters(depth)` replaces hardcoded encounters; `Game.ts` tracks and passes `dungeonDepth`.

---

### ✅ Milestone 4 — Enemies, Spells, Status Effects & Mage Class

OSR-inspired enemy roster expansion, Mage hero class, new status effects, and AoE / drain mechanics.

| Feature | Status |
|---|---|
| 8 new enemies: Giant Rat, Zombie, Giant Spider, Harpy, Wight, Minotaur, Basilisk, Fire Drake | ✅ |
| 6 new status effects: Bleed (tick dmg), Stun (skip turn), Freeze (−SPD), Blind (−ATK), Fear (−DEF/−SPD), Regen (+HP/round) | ✅ |
| Drain skill type — Life Drain deals damage and heals actor for 50% | ✅ |
| AoE skills — Fire Breath & Fireball hit all enemies; UI auto-fires without target prompt | ✅ |
| Stun skip-turn mechanic — stunned actors automatically lose their turn | ✅ |
| Mage job with 6 spells: Mana Bolt, Fireball, Ice Lance, Thunderbolt, Arcane Shield, Blinding Flash | ✅ |
| Mira (Mage) — third hero, backline spellcaster | ✅ |
| 4-tier encounter system: intro / easy / mid / hard; boss Fire Drake at depth ≥ 3 | ✅ |

**Key changes:** `GameTypes.ts` gains `"drain"` skill type; `StatusSystem.ts` handles negative tick (healing); `CombatManager.ts` routes AoE + stun logic; `CombatScene.ts` adds stun skip button.

---

### ✅ Milestone 5 — Item Economy, Inventory & Rogue Class

Consumable item shop, enemy loot drops, in-combat item use, and the Rogue hero class.

| Feature | Status |
|---|---|
| Party inventory — `partyItems` shared across all encounters and runs | ✅ |
| Enemy loot drops — consumables dropped after every encounter (depth-gated) | ✅ |
| Apothecary shop in Town — buy all 6 consumables with gold | ✅ |
| Inventory panel in Town — shows each held item with quantity | ✅ |
| Items usable in combat — ⚗ Items button + full target-selection UI | ✅ |
| Rogue job — high SPD (+4 base), 35% crit chance | ✅ |
| Silvar (Rogue) — 4th hero, fastest in party, back-line assassin | ✅ |
| 4 new Rogue skills: Backstab (heavy dmg + Bleed), Shadow Step (dmg + Stun), Garrote (dmg + long Bleed), Vanish (60% DR) | ✅ |
| Dynamic hero 3D positioning — combat scene adapts to any party size | ✅ |

**Key changes:** `DungeonManager.advanceEncounter()` returns `EncounterRewards { levelUps, droppedItems }`; `Game.ts` gains `partyItems` + `buyItem()` handler; `TownScene` adds scrollable Inventory + Apothecary panels; `CombatScene` calculates hero mesh positions dynamically.

---

### 🔜 Milestone 6 — Equipment & Gear System *(planned)*

Give heroes permanent stat bonuses through equippable weapons and armour found or bought during runs.

| Feature | Status |
|---|---|
| Equipment slot system (weapon, armour, accessory per hero) | 🔲 |
| Weapon definitions with ATK bonuses and special effects | 🔲 |
| Armour definitions with DEF bonuses | 🔲 |
| Equipment drops from bosses and mid-tier enemies | 🔲 |
| Blacksmith shop upgrade — sell / buy / compare gear | 🔲 |
| Equipment display in Town party stats panel | 🔲 |
| Equipment persists across dungeon runs | 🔲 |

---

### 🔜 Milestone 7 — Dungeon Map & Room Variety *(planned)*

Replace the linear 3-encounter structure with a branching dungeon map containing different room types.

| Feature | Status |
|---|---|
| Branching room layout (2–3 paths per floor) | 🔲 |
| Room types: combat, treasure, trap, rest, boss | 🔲 |
| Minimap display in combat / dungeon UI | 🔲 |
| Trap rooms deal party damage; rest rooms restore partial HP | 🔲 |
| Treasure rooms grant gold + random item without combat | 🔲 |
| Boss room guaranteed on final floor | 🔲 |
| Floor completion unlocks new depth tier in subsequent runs | 🔲 |

---

### 🔜 Milestone 8 — Hero Progression & Skill Trees *(planned)*

Replace flat leveling bonuses with a meaningful per-hero progression system.

| Feature | Status |
|---|---|
| Skill trees per job (3 branches, ~5 nodes each) | 🔲 |
| Skill points awarded on level-up | 🔲 |
| Unlockable active skills (Warrior: Whirlwind / Shield Bash / Rallying Cry) | 🔲 |
| Unlockable active skills (Ranger: Twin Shot / Smoke Screen / Eagle Eye) | 🔲 |
| Unlockable active skills (Mage: Chain Lightning / Frost Nova / Time Warp) | 🔲 |
| Unlockable active skills (Rogue: Shadowmeld / Throat Cut / Marked for Death) | 🔲 |
| Passive node bonuses (crit %, max HP, cooldown reduction) | 🔲 |
| Skill tree UI panel accessible from Town | 🔲 |

---

### 🔜 Milestone 9 — Save / Load & Meta Progression *(planned)*

Persist runs to localStorage and add cross-run unlocks to reward repeated play.

| Feature | Status |
|---|---|
| Auto-save after every encounter and on return to town | 🔲 |
| Load game from main menu | 🔲 |
| New Game + option after completing depth ≥ 5 | 🔲 |
| Meta currency (Soul Shards) earned by defeating bosses | 🔲 |
| Persistent upgrades purchasable with Soul Shards between runs | 🔲 |
| Bestiary — unlocks enemy lore entries as new enemy types are defeated | 🔲 |
| Achievements system (first boss kill, max depth, full party wipe, etc.) | 🔲 |

---

## 🏗️ Architecture

```
src/
  main.ts                 Entry point — mounts Babylon engine
  Game.ts                 App root: scene manager, hero/gold/item state
  scenes/
    BaseScene.ts          Abstract base scene
    BootScene.ts          Splash / loading screen
    TownScene.ts          Town hub (shop, inventory, party stats)
    CombatScene.ts        Turn-based battle scene
  combat/
    CombatManager.ts      Turn order, action dispatch, AoE, stun logic
    SkillResolver.ts      Damage / heal / drain / status calculations
    StatusSystem.ts       Status effect application and per-round ticks
  dungeon/
    DungeonManager.ts     Multi-encounter runs, procedural generation, loot drops
  data/
    skills.ts             Skill registry (30 skills across all jobs)
    jobs.ts               Job definitions: Warrior, Ranger, Mage, Rogue
    heroes.ts             Starting heroes: Aldric, Lyra, Mira, Silvar
    enemies.ts            15 enemies across 4 difficulty tiers
    items.ts              6 consumable items
  types/
    GameTypes.ts          Core TypeScript interfaces and enums
```

## 📜 License

MIT

