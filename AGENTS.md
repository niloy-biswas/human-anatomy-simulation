# AGENTS.md — Human Heart Simulation (Cursor Agent Context)

This file is for future agents to quickly understand the repo context, what’s already built, what assets exist, and what is currently broken.

## Repo goal

- **Short-term**: Host an educational 3D anatomy experience (Bangla + English UI) on Vercel.
- **Pages**:
  - `index.html`: **heart-only** viewer using `<model-viewer>`.
  - `body.html`: **full-body** Z‑Anatomy viewer using **Three.js** with system toggles + click-to-inspect.

## How to run

Run from the repo root (not `file://`):

```bash
cd /Users/niloybiswas/Desktop/CodeRepository/human-heart-simulation
npx --yes serve .
```

Open:

- `http://localhost:3000/` (heart)
- `http://localhost:3000/body.html` (full body)

## Assets

Folder: `assets/`

- `heart.glb` (~16 MB): heart model used by `index.html`.
- `z-anatomy.glb` (~155 MB): raw Blender export (kept locally; **ignored by git**).
- `z-anatomy-draco.glb` (~23 MB): Draco-compressed version used by `body.html`.
  - SHA256 (local): `297558e0e0393c4f775cdec5c4b339504aa970591d5cfac98f9961daddd62352`

`.gitignore` currently ignores `assets/z-anatomy.glb`.

## Z-Anatomy GLB structure (verified from JSON chunk)

- **Root scene nodes** include:
  - `Skeletal system.g`, `Joints.g`, `Muscular system.g`, `Fasciae.g`,
    `Arterial system.g`, `Venous system.g`, `Lymphoid organs.g`,
    `Nervous system & Sense organs.g`, `Visceral systems.g`
  - plus atlas/UI roots: `HOW TO ...`, `Reference planes.g`, etc.
- Counts (from `assets/z-anatomy.glb`):
  - **meshes**: 3390
  - **nodes**: 7179
  - **materials**: 171
- Material extensions present:
  - `KHR_materials_specular`, `KHR_materials_ior`, `KHR_materials_clearcoat`, `KHR_materials_anisotropy`

This structure should allow toggling by root system groups.

## What was implemented

### Full-body viewer

Files:

- `body.html`: layout (sidebar toggles, canvas, tooltip, detail panel) + Three.js importmap.
- `body.js`: Three.js viewer:
  - `GLTFLoader` + `DRACOLoader`
  - `OrbitControls`
  - A system toggle list (`SYSTEMS`) based on root node names above
  - Raycasting hover tooltip + click detail panel
  - Filters to hide atlas clutter (reference planes/lines, “HOW TO…”, navigation text)
  - Material replacement: forces `MeshLambertMaterial` for reliability (attempt to avoid “black PBR”)
  - A **debug HUD** in the canvas (`#bvHud`) showing:
    - canvas size
    - visible mesh count
    - renderer draw calls/triangles

### Styling & hosting

- `style.css`: added body-viewer styles (`.bv-*`) and HUD styles.
- `vercel.json`: adds caching headers for `.glb` and CORP header.
- `index.html`: added a link button to `body.html`.
- `README.md`: includes run instructions + asset notes.

## Current status — WORKING ✓

Full-body viewer renders correctly. System toggles work. Skeleton, muscles, organs all show/hide per checkbox.

## What was solved (key findings)

### Root cause: Three.js sanitizes GLTF node names
Three.js GLTFLoader’s `createUniqueName` runs `PropertyBinding.sanitizeNodeName` which converts
spaces→underscores and strips non-word characters including dots. So GLTF node `”Skeletal system.g”`
becomes a different string in the Three.js Object3D `.name`. All string-based matching silently failed.

**Fix:** Use **positional indexing** into `root.children` instead of name matching:
```js
const SYSTEM_CHILD_INDICES = { skeletal:2, joints:3, muscular:4, fasciae:5, arterial:6, venous:7, lymphoid:8, nervous:9, visceral:10 };
```
These positions are verified from the GLB JSON chunk (GLTF scene.nodes array order, which Three.js preserves).

### Z-Anatomy GLB node structure
Every group node (`.g` suffix) is **both** a Three.js Object3D AND has a mesh child with material `”Text”` or `”Text-2”`. These text meshes are 3D annotation labels (one per group, showing the group name). They must be made **transparent** (not `visible=false`) because they are also the visibility containers for anatomy children.

In `replaceMaterialsWithLambert`: text material meshes → `MeshBasicMaterial({ transparent:true, opacity:0, depthWrite:false })` and `obj.raycast = () => {}`.

### System mesh registry
`systemMeshes` (key → `THREE.Mesh[]`) is built at load time by walking each anatomy mesh’s parent chain to find the system root. `toggleSystem` sets `m.visible` directly on these meshes — no parent-propagation dependency.

### Material replacement
Z-Anatomy exports PBR materials with `KHR_materials_ior`, `KHR_materials_specular`, etc. These render black in WebGL. All anatomy meshes get replaced with `MeshLambertMaterial` (color `0xdccab8`, `DoubleSide`, ambient-lit). Text annotation meshes get transparent `MeshBasicMaterial` instead.

## Known remaining items

- Text annotation labels (`”VISCERAL SYSTEMS”` etc.) may still show faintly — need to verify transparent fix works fully
- No click-to-inspect (raycasting) tested yet since toggle fix
- Console debug logs still present in `body.js` — remove before production

## Licensing reminder

Z‑Anatomy models are **CC BY‑SA 4.0** (keep attribution visible in the product).
