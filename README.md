# Human heart & body 3D anatomy

Static site with an interactive heart viewer (`model-viewer`) and a full-body viewer (Three.js + Z-Anatomy GLB).

## Run locally

Do not open HTML files with `file://`. Browsers block loading GLBs and ES modules that way.

### Option A — Serve (recommended)

Requires [Node.js](https://nodejs.org/) (for `npx`).

```bash
cd human-heart-simulation
npx --yes serve .
```

Then open:

- **Heart:** [http://localhost:3000](http://localhost:3000) (or the URL `serve` prints)
- **Full body:** [http://localhost:3000/body.html](http://localhost:3000/body.html)

### Option B — Python

```bash
cd human-heart-simulation
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) and [http://localhost:8080/body.html](http://localhost:8080/body.html).

## Deploy (Vercel)

Connect the repo in the Vercel dashboard, import as a static project (no build step). The site root is this folder; `vercel.json` sets long cache headers for GLB assets.

## Assets

| File | Purpose |
| --- | --- |
| `assets/heart.glb` | Heart model for `index.html` |
| `assets/z-anatomy-draco.glb` | Compressed full-body model for `body.html` (Draco) |

The uncompressed `assets/z-anatomy.glb` is ignored by Git (large file). If you only have the full-size export locally, place it at `assets/z-anatomy.glb`; `body.js` falls back to it when the Draco file is missing.

## 3D model credit

Full-body data is from the [Z-Anatomy](https://github.com/LluisV/Z-Anatomy) project (CC BY-SA 4.0). Keep attribution visible in your product where you use the model.
