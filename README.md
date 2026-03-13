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

## 🗺 Milestone 2 — Dungeon Progression (Planned)

The next milestone focuses on making the dungeon a multi-encounter run with persistent hero state, XP-based leveling, and basic rewards.

See [`src/dungeon/DungeonManager.ts`](src/dungeon/DungeonManager.ts) for the scaffolded implementation and detailed design notes.

### Planned features

1. **Multi-encounter dungeons** — 3 sequential fights per dungeon run; heroes keep their HP between fights.
2. **Experience & leveling** — defeating enemies awards XP; heroes level up and gain stat bonuses.
3. **Gold & rewards** — enemies drop gold; party returns to town with earned gold.
4. **Town upgrades** — spend gold on Blacksmith (attack), Alchemist (heal power), or Inn (restore HP) before the next run.
5. **Dungeon summary screen** — after clearing all encounters, show a summary (gold earned, XP gained, hero levels).

### Rough task breakdown

- [ ] Wire `DungeonManager` into `Game.ts` scene transitions
- [ ] `CombatScene` receives enemy group from `DungeonManager` instead of hard-coded `SAMPLE_ENEMIES`
- [ ] After each victory, call `dungeon.advanceEncounter(enemies)` and start next `CombatScene` (or return to town if `isComplete()`)
- [ ] Show level-up notification in `CombatScene` end screen
- [ ] `TownScene` displays party stats (HP, level, XP) and upgrade shop buttons
- [ ] Upgrade shop modifies hero stats or skill power

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

