## 2024-03-21 - Replace JSON.parse(JSON.stringify) with manual clone
**Learning:** The codebase heavily relied on `JSON.parse(JSON.stringify(...))` for deep copying `Hero` and `Enemy` objects in multiple places (`Game.ts`, `CombatManager.ts`, `DungeonManager.ts`). This is a known performance anti-pattern. Benchmarks showed that a manual deep copy function is ~25x faster (10ms vs 250ms for 100k iterations). `structuredClone` was also tested but proved to be slower than `JSON` in this specific node environment (415ms).
**Action:** When deep copying complex domain objects with known shapes (like `Hero` or `Enemy`), prefer manual spread-based cloning functions over `JSON.parse(JSON.stringify)`. `structuredClone` should also be benchmarked before blindly adopting it, as its performance can vary depending on the environment and object structure.

## 2024-05-18 - Optimize Babylon.js material instantiation
**Learning:** In Babylon.js, creating new `StandardMaterial` instances inside loops for multiple visually identical entities (e.g. heroes and enemies in a combat scene) increases memory overhead and WebGL draw calls.
**Action:** When creating Babylon.js meshes for multiple similar entities, instantiate and share reusable `StandardMaterial` singletons outside of the creation loops to optimize WebGL performance.
