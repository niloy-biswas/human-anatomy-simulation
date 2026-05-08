/**
 * ═══════════════════════════════════════════════════════════════
 *  মানব শরীর - Full Body 3D Anatomy Viewer  |  body.js
 *  Uses Three.js r168 + GLTFLoader + OrbitControls
 *  Model: Z-Anatomy (CC BY-SA 4.0)
 * ═══════════════════════════════════════════════════════════════
 */

import * as THREE from 'three';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader }   from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BN_LABELS }     from './labels/index.js';
import { initSearchBar }  from './search.js';

/* ─── Anatomy Systems Config ──────────────────────────────────── */
const SYSTEMS = [
  { key: 'skeletal', labelBn: 'কঙ্কালতন্ত্র',  labelEn: 'Skeletal System',  color: '#D4C5A9', visible: true  },
  { key: 'joints',   labelBn: 'সন্ধিসমূহ',   labelEn: 'Joints',           color: '#B8C5D6', visible: false },
  { key: 'muscular', labelBn: 'পেশীতন্ত্র',   labelEn: 'Muscular System',  color: '#C0392B', visible: false },
  { key: 'fasciae',  labelBn: 'ফ্যাসিয়া',    labelEn: 'Fasciae',          color: '#E8C9A0', visible: false },
  { key: 'arterial', labelBn: 'ধমনীতন্ত্র',  labelEn: 'Arterial System',  color: '#E74C3C', visible: false },
  { key: 'venous',   labelBn: 'শিরাতন্ত্র',  labelEn: 'Venous System',    color: '#2980B9', visible: false },
  { key: 'lymphoid', labelBn: 'লসিকাতন্ত্র', labelEn: 'Lymphoid System',  color: '#8E44AD', visible: false },
  { key: 'nervous',  labelBn: 'স্নায়ুতন্ত্র', labelEn: 'Nervous System',  color: '#F1C40F', visible: false },
  { key: 'visceral', labelBn: 'অঙ্গতন্ত্র',  labelEn: 'Visceral Systems', color: '#E67E22', visible: false },
];

/**
 * Per-material-name colors matching Z-Anatomy's visual palette.
 * Materials without baseColorFactor default to white in Three.js;
 * this map overrides them with anatomically accurate colors.
 */
const Z_ANATOMY_MAT_COLORS = {
  // Bones — warm peachy-tan matching Z-anatomy palette
  'Bone':   0xC8A87C, 'Bone-1': 0xC8A87C, 'Bone-2': 0xC8A87C, 'Bone-3': 0xC8A87C,
  'Bone-4': 0xC8A87C, 'Bone-5': 0xC8A87C, 'Bone-6': 0xC8A87C,
  'Bone-7': 0xC8A87C, 'Bone-8': 0xC8A87C,
  // Cartilage — sage/olive green (not teal) matching Z-anatomy
  'Cartilage': 0x8A9E80,
  // Sutures — grey (same as baseColorFactor they already have)
  'Suture': 0xA0A0A0,
  // Connective tissue
  'Ligament': 0xC4A87A, 'Articular capsule': 0xC4A87A, 'Tendon': 0xD4B896,
  // Teeth
  'Teeth': 0xF5F0E0, 'Teeth-roots': 0xD4C4A0, 'Dentine': 0xE8DABB,
  // Muscle origin/insertion marker dots
  'Muscular origin': 0x8B2E1A,
};

/** Z-Anatomy Unity/UI meshes (*.st) */
const Z_ANATOMY_UI_ST_NAMES = new Set([
  'Colors.st', 'Cross-sections.st', 'Display.st', 'Layers.st',
  'Manipulation.st', 'Navigation.st', 'Outliner.st', 'Selection.st', 'Stored views.st',
]);

/** Atlas reference overlays (often dark planes users confuse with “nothing visible”) */
const REFERENCE_GEOM_RE = /Reference planes|Reference lines|Paramedian|Median plane|Coronal planes|Transverse planes|Sagittal planes\.g|Longitudinal planes\.g|^Movements\.|^General terms\./i;

/* Scene-level roots we never want to show */
const ROOT_HIDE_NAMES = new Set([
  'HOW TO ...',
  'Take a picture',
  'Reference lines.g',
  'Reference planes.g',
  'Movements.g',
  'General terms.g',
  'Regions of human body.g',
  'Cross Section X',
  'Cross Section Y',
  'Cross Section Z',
  'Medulla-path',
  "BezierCircle'",
  // Also hide the *.st UI roots if they appear at top-level
  ...Array.from(Z_ANATOMY_UI_ST_NAMES),
]);

/* ─── Bengali label map for well-known structures ─────────────── */

/* ─── DOM Elements ────────────────────────────────────────────── */
const canvas       = document.getElementById('bvCanvas');
const loadingEl    = document.getElementById('bvLoading');
const progressBar  = document.getElementById('bvProgressBar');
const progressText = document.getElementById('bvProgressText');
const hintEl       = document.getElementById('bvHint');
const tooltipEl    = document.getElementById('bvTooltip');
const hudEl        = document.getElementById('bvHud');
const systemList   = document.getElementById('systemList');
const btnShowAll   = document.getElementById('btnShowAll');
const btnHideAll   = document.getElementById('btnHideAll');
const detailPanel  = document.getElementById('detailPanel');
const detailBackdrop = document.getElementById('detailBackdrop');
const detailClose  = document.getElementById('detailClose');
const detailTitleBn  = document.getElementById('detailTitleBn');
const detailTitleEn  = document.getElementById('detailTitleEn');
const detailTextBn   = document.getElementById('detailTextBn');
const detailTextEn   = document.getElementById('detailTextEn');
const detailBadge    = document.getElementById('detailSystemBadge');
const mobileSysBtn   = document.getElementById('bvMobileSysBtn');
const sidebar        = document.getElementById('bvSidebar');
const btnAutoRotate  = document.getElementById('btnAutoRotate');
const btnResetCam    = document.getElementById('btnResetCam');
const btnPanUp       = document.getElementById('btnPanUp');
const btnPanDown     = document.getElementById('btnPanDown');
const btnPanLeft     = document.getElementById('btnPanLeft');
const btnPanRight    = document.getElementById('btnPanRight');

/* ─── Three.js Scene Setup ────────────────────────────────────── */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight);
renderer.shadowMap.enabled = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1a);

const camera = new THREE.PerspectiveCamera(
  45,
  canvas.parentElement.clientWidth / canvas.parentElement.clientHeight,
  0.01, 100
);
camera.position.set(0, 1.6, 3.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance   = 0.3;
controls.maxDistance   = 12;
controls.target.set(0, 1.0, 0);
controls.update();

/* Lights — low ambient to preserve shadow depth, strong directional for shape */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const dirLight1 = new THREE.DirectionalLight(0xfff5e0, 2.2); // warm key light
dirLight1.position.set(2, 4, 3);
scene.add(dirLight1);

const dirLight2 = new THREE.DirectionalLight(0xc8d8ff, 0.8); // cool fill from left
dirLight2.position.set(-3, 2, -2);
scene.add(dirLight2);

const hemiLight = new THREE.HemisphereLight(0x8899bb, 0x443322, 0.6); // sky/ground gradient
scene.add(hemiLight);

/* ─── State ───────────────────────────────────────────────────── */
const systemNodes  = {};   // key → THREE.Object3D
let   anatomyRoot  = null; // glTF root — raycasting uses this so parent visibility works
let   hoveredMesh  = null;
let   selectedMesh = null;
const raycaster    = new THREE.Raycaster();
raycaster.params.Mesh.threshold = 0;
const pointer      = new THREE.Vector2();
let   modelLoaded  = false;
let   autoRotating = false;
const defaultCamPos    = new THREE.Vector3();
const defaultCamTarget = new THREE.Vector3();

/* ─── Highlight Colors ────────────────────────────────────────── */
// Color-swap approach: change material.color directly (emissive fails on bright white bones).
const HOVER_COLOR    = new THREE.Color(0x6EE7B7); // mint green — visible on any base color
const SELECTED_COLOR = new THREE.Color(0x1CAB55); // brand green — clearly selected

/* ─── Per-system anatomy mesh registry ───────────────────────── */
// Built at load time. toggleSystem sets visible directly on these meshes
// rather than relying on Three.js parent-visibility propagation.
const systemMeshes = {};   // key → THREE.Mesh[]

/* ─── GLTF Loader ─────────────────────────────────────────────── */
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

/* Try Draco-compressed first, fall back to original */
const MODEL_URL_DRACO = './assets/z-anatomy-draco.glb';
const MODEL_URL_RAW   = './assets/z-anatomy.glb';

function loadModel(url) {
  loader.load(
    url,
    onModelLoaded,
    (xhr) => {
      if (xhr.lengthComputable) {
        const pct = Math.round((xhr.loaded / xhr.total) * 100);
        progressBar.style.width  = pct + '%';
        progressText.textContent = pct + '%';
      }
    },
    (err) => {
      if (url === MODEL_URL_DRACO) {
        console.warn('[body] Draco version not ready, loading original…');
        loadModel(MODEL_URL_RAW);
      } else {
        console.error('[body] Failed to load model:', err);
        showLoadError();
      }
    }
  );
}

loadModel(MODEL_URL_DRACO);

/**
 * Raycast the loaded model. Using intersectObject(root, true) respects
 * ancestor Object3D.visible; intersectObjects(flatMeshList) does not.
 */
function pickAnatomyHits() {
  if (!anatomyRoot) return [];
  return raycaster
    .intersectObject(anatomyRoot, true)
    .filter((h) => h.object.isMesh && !isDecorationMesh(h.object) && isWorldVisible(h.object));
}

/** Strip Z-Anatomy atlas UI (explicit names only — never blanket `*.st`). */
function hideZAnatomyUiChrome(object3d) {
  object3d.traverse((obj) => {
    const n = (obj.name || '').trim();
    if (n.startsWith('HOW TO')) obj.visible = false;
    if (Z_ANATOMY_UI_ST_NAMES.has(n)) obj.visible = false;
    /* Blender/Unity sometimes drops the dot: "Navigationst" */
    if (/^navigation/i.test(n)) obj.visible = false;
  });
}

/** Z-Anatomy text annotation material name pattern — matches "Text", "Text-2", "Text 2", etc.
 *  These nodes are ALSO the visibility containers for anatomy children, so we must NOT hide them
 *  (visible=false would hide all anatomy children too). Instead we make them transparent. */
const Z_ANATOMY_TEXT_MAT_RE = /^text/i;

function isDecorationMesh(mesh) {
  const n = (mesh.name || '').trim();
  if (/^navigation/i.test(n)) return true;
  if (Z_ANATOMY_UI_ST_NAMES.has(n)) return true;
  if (REFERENCE_GEOM_RE.test(n)) return true;
  return false;
}

/**
 * Z-Anatomy’s Unity PBR (specular / clearcoat / emissive tricks) often renders solid black in browsers.
 * Use MeshLambert + strong ambient — always shows silhouette; preserves diffuse maps if present.
 */
function replaceMaterialsWithLambert(root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;

    if (isDecorationMesh(obj)) {
      obj.visible = false;
      return;
    }

    const oldList = Array.isArray(obj.material) ? obj.material : [obj.material];

    // Text annotation nodes are both the text-label geometry AND the visibility container
    // for anatomy children. Making them visible=false would hide all children too.
    // Instead make them fully transparent so text disappears but children still render.
    const isTextMat  = oldList.some(m => m && Z_ANATOMY_TEXT_MAT_RE.test(m.name));
    const isGroupNode = /\.g$/i.test(obj.name || ''); // Z-Anatomy category group nodes — no material in GLB → default nameless material
    if (isTextMat || isGroupNode) {
      obj.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      obj.raycast = () => {};
      obj.userData.isTextLabel = true;
      return;
    }

    const geom = obj.geometry;
    if (geom?.isBufferGeometry && geom.attributes.position && !geom.attributes.normal) {
      geom.computeVertexNormals();
    }

    const newList = oldList.map((m) => {
      if (!m) return m;
      const hasMap = !!m.map;
      return new THREE.MeshLambertMaterial({
        name: m.name,
        map: m.map,
        vertexColors: false,
        color: hasMap ? new THREE.Color(1, 1, 1) : (m.color?.clone() ?? new THREE.Color(0xdccab8)),
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1,
        emissive: new THREE.Color(0x000000),
      });
    });
    obj.material = Array.isArray(obj.material) ? newList : newList[0];
  });
}

/* ─── On Model Loaded ─────────────────────────────────────────── */
function onModelLoaded(gltf) {
  const root = gltf.scene;
  anatomyRoot = root;

  // GLB-verified root child positions (z-anatomy-draco.glb).
  // Three.js may sanitize or suffix node names, making string matching unreliable.
  // Using positional indices from confirmed GLB JSON inspection instead.
  const SYSTEM_CHILD_INDICES = { skeletal:2, joints:3, muscular:4, fasciae:5, arterial:6, venous:7, lymphoid:8, nervous:9, visceral:10 };

  root.children.forEach((child, idx) => {
    const key = Object.keys(SYSTEM_CHILD_INDICES).find(k => SYSTEM_CHILD_INDICES[k] === idx);
    if (key) {
      systemNodes[key] = child;
      child.visible = SYSTEMS.find(s => s.key === key)?.visible ?? true;
    } else {
      child.visible = false; // positions 0,1 and 11+ are UI/reference — always hidden
    }
  });


  hideZAnatomyUiChrome(root);
  replaceMaterialsWithLambert(root);
  root.traverse((o) => { o.frustumCulled = false; });

  // Force matrix update before bounds — matrixWorld is stale until scene.add or explicit update.
  root.updateMatrixWorld(false, true);

  // Use ALL anatomy meshes (not just visible) for scale/position so it never fails
  // when the only initially-visible system has geometry issues.
  const anatomyBounds = new THREE.Box3();
  let anatomyMeshCount = 0;
  root.traverse((o) => {
    if (!o.isMesh || isDecorationMesh(o) || o.userData.isTextLabel) return;
    anatomyMeshCount++;
    anatomyBounds.expandByObject(o);
  });

  if (anatomyMeshCount > 0 && !anatomyBounds.isEmpty() && isFinite(anatomyBounds.min.x)) {
    const size0   = anatomyBounds.getSize(new THREE.Vector3());
    const center0 = anatomyBounds.getCenter(new THREE.Vector3());
    const maxDim0 = Math.max(size0.x, size0.y, size0.z) || 1;
    const scale   = 3.0 / maxDim0;
    root.scale.setScalar(scale);
    root.position.copy(center0.clone().multiplyScalar(-scale));
  }

  // Refresh matrices after repositioning.
  root.updateMatrixWorld(false, true);

  // Ensure at least one anatomy system is visible.
  const visibleMeshCount = (() => {
    let n = 0;
    root.traverse((o) => { if (o.isMesh && isWorldVisible(o) && !isDecorationMesh(o)) n++; });
    return n;
  })();
  if (visibleMeshCount === 0) {
    const fallback = SYSTEMS.find((s) => s.key === 'skeletal') ?? SYSTEMS[0];
    if (fallback && systemNodes[fallback.key]) {
      SYSTEMS.forEach((s) => { s.visible = false; if (systemNodes[s.key]) systemNodes[s.key].visible = false; });
      fallback.visible = true;
      systemNodes[fallback.key].visible = true;
    } else {
      root.children.forEach((c) => { c.visible = !ROOT_HIDE_NAMES.has((c.name || '').trim()); });
    }
  }

  // Build per-system anatomy mesh registry.
  // Walk each system node's subtree, collecting non-text anatomy meshes.
  // toggleSystem uses this list to set visible directly — bypasses parent-propagation issues.
  SYSTEMS.forEach(s => { systemMeshes[s.key] = []; });
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const isText = mats.some(m => m && (m.transparent === true && m.opacity === 0));
    if (isText) return; // skip transparent text annotation meshes

    // Walk up to find which system group owns this mesh.
    let cur = obj.parent;
    while (cur && cur !== root) {
      const key = Object.keys(systemNodes).find(k => systemNodes[k] === cur);
      if (key) { systemMeshes[key].push(obj); break; }
      cur = cur.parent;
    }
  });

  // Apply colors to anatomy meshes whose material has no baseColorFactor (pure white default).
  // Priority: per-material-name map → system color. Meshes with real colors keep theirs.
  SYSTEMS.forEach(s => {
    const sysHex = parseInt(s.color.slice(1), 16);
    (systemMeshes[s.key] ?? []).forEach(mesh => {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(m => {
        if (!m?.color) return;
        // Keep materials with a meaningful hue (organs: brain, lungs, fascia, etc.).
        // Override neutral/achromatic materials (white, near-white, grey) — these are bones,
        // muscles, nerves etc. that store colour via KHR extensions, not baseColorFactor.
        const r = m.color.r, g = m.color.g, b = m.color.b;
        const maxC = Math.max(r, g, b);
        const sat  = maxC > 0 ? (maxC - Math.min(r, g, b)) / maxC : 0;
        if (sat > 0.15 || maxC < 0.45) return; // skip vivid or very dark colours
        const mapped = Z_ANATOMY_MAT_COLORS[m.name];
        m.color.setHex(mapped !== undefined ? mapped : sysHex);
      });
    });
  });

  // Apply initial visibility per sys.visible — must run after systemMeshes is built
  // because toggleSystem sets mesh.visible directly.
  SYSTEMS.forEach(s => { if (!s.visible) toggleSystem(s.key, false); });

  root.traverse((obj) => {
    if (obj.isMesh) obj.userData.origColor = obj.material?.color?.clone() ?? null;
  });

  scene.add(root);
  modelLoaded = true;

  // Matrices must be refreshed after scene.add so expandByObject gives world coords.
  root.updateMatrixWorld(false, true);

  // Auto-frame on visible anatomy meshes.
  const box1 = new THREE.Box3();
  let frameCount = 0;
  root.traverse((o) => {
    if (!o.isMesh || !isWorldVisible(o) || isDecorationMesh(o)) return;
    if (o.userData.isTextLabel) return;
    frameCount++;
    box1.expandByObject(o);
  });
  if (frameCount === 0 || box1.isEmpty()) box1.setFromObject(root);

  const size1   = box1.getSize(new THREE.Vector3());
  const center1 = box1.getCenter(new THREE.Vector3());
  const maxDim1 = Math.max(size1.x, size1.y, size1.z) || 1;

  // Use 58% up from box bottom as orbit target — avoids arm-span bias on geometric center
  const orbitY = box1.min.y + size1.y * 0.58;
  controls.target.set(center1.x, orbitY, center1.z);
  const dist = maxDim1 * 1.6;
  camera.near = Math.max(0.001, dist / 200);
  camera.far  = Math.max(50, dist * 200);
  camera.updateProjectionMatrix();
  camera.position.set(center1.x, orbitY, center1.z + dist);
  controls.update();

  // Save default view for reset button
  defaultCamTarget.copy(controls.target);
  defaultCamPos.copy(camera.position);

  // URL-based system selection: /skeletal, /muscular, /visceral, etc.
  const urlKey = window.location.pathname.replace(/^\//, '').toLowerCase();
  if (SYSTEMS.some(s => s.key === urlKey)) {
    SYSTEMS.forEach(s => { s.visible = (s.key === urlKey); });
    SYSTEMS.forEach(s => toggleSystem(s.key, s.visible));
  }

  buildSidebar();

  // Init anatomy search after systemMeshes + sidebar are ready
  const _searchIdx = buildSearchIndex();
  initSearchBar({
    inputEl:    document.getElementById('searchInput'),
    dropdownEl: document.getElementById('searchDropdown'),
    onSelect:   handleSearchSelect,
  }).setIndex(_searchIdx);
  const _mobileInput = document.getElementById('searchInputMobile');
  if (_mobileInput) {
    initSearchBar({
      inputEl:    _mobileInput,
      dropdownEl: document.getElementById('searchDropdownMobile'),
      onSelect:   handleSearchSelect,
    }).setIndex(_searchIdx);
  }

  loadingEl.style.opacity = '0';
  setTimeout(() => { loadingEl.style.display = 'none'; }, 500);
  setTimeout(() => hintEl?.classList.add('fade-out'), 5000);

  requestAnimationFrame(() => {
    ensureCanvasSize();
    controls.update();
  });
}

function showLoadError() {
  loadingEl.innerHTML = `
    <div class="bv-loading-card">
      <p style="color:#E74C3C;font-family:'Inter',sans-serif;font-size:14px;margin:0 0 8px">মডেল লোড ব্যর্থ হয়েছে</p>
      <p style="color:#7a8099;font-family:'Inter',sans-serif;font-size:12px;margin:0">
        <code>assets/z-anatomy.glb</code> পাওয়া যাচ্ছে না।<br/>
        Local server দিয়ে চালু করুন: <code>npx serve .</code>
      </p>
    </div>`;
}

/* ─── Build Sidebar System Toggles ───────────────────────────── */
function buildSidebar() {
  systemList.innerHTML = '';
  SYSTEMS.forEach(sys => {
    const item = document.createElement('label');
    item.className = 'bv-system-item';
    item.dataset.key = sys.key;

    const checkbox = document.createElement('input');
    checkbox.type    = 'checkbox';
    checkbox.checked = sys.visible;
    checkbox.addEventListener('change', () => toggleSystem(sys.key, checkbox.checked));

    const dot = document.createElement('span');
    dot.className = 'bv-system-dot';
    dot.style.background = sys.color;

    const labels = document.createElement('span');
    labels.className = 'bv-system-labels';
    labels.innerHTML = `<span class="bv-sys-bn">${sys.labelBn}</span><span class="bv-sys-en">${sys.labelEn}</span>`;

    item.appendChild(checkbox);
    item.appendChild(dot);
    item.appendChild(labels);
    systemList.appendChild(item);
  });
}

function toggleSystem(key, visible) {
  // Direct mesh visibility — no dependency on Three.js parent propagation.
  const meshes = systemMeshes[key] ?? [];
  meshes.forEach(m => { m.visible = visible; });
  // Also set the group node so HUD / isWorldVisible checks stay consistent.
  const node = systemNodes[key];
  if (node) node.visible = visible;
  const sys = SYSTEMS.find(s => s.key === key);
  if (sys) sys.visible = visible;
}

function isWorldVisible(obj) {
  let cur = obj;
  while (cur) {
    if (cur.visible === false) return false;
    cur = cur.parent;
  }
  return true;
}

btnShowAll.addEventListener('click', () => {
  SYSTEMS.forEach(sys => toggleSystem(sys.key, true));
  systemList.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = true);
});

btnHideAll.addEventListener('click', () => {
  SYSTEMS.forEach(sys => toggleSystem(sys.key, false));
  systemList.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
});

/* ─── Camera Control Buttons ──────────────────────────────────── */
btnResetCam.addEventListener('click', () => {
  if (!modelLoaded) return;
  animateCameraTo(defaultCamTarget.clone(), defaultCamPos.clone(), 500);
});

btnAutoRotate.addEventListener('click', () => {
  autoRotating = !autoRotating;
  controls.autoRotate      = autoRotating;
  controls.autoRotateSpeed = 1.2;
  btnAutoRotate.classList.toggle('active', autoRotating);
});

const PAN_STEP = 0.08;
function pan(dx, dy) {
  // Pan in camera-local space
  const right = new THREE.Vector3();
  const up    = new THREE.Vector3();
  camera.getWorldDirection(up); // temp
  right.crossVectors(camera.getWorldDirection(new THREE.Vector3()), camera.up).normalize();
  up.set(0, 1, 0);
  const delta = right.multiplyScalar(dx).add(up.multiplyScalar(dy));
  controls.target.add(delta);
  camera.position.add(delta);
  controls.update();
}

btnPanUp.addEventListener('click',    () => pan(0,  PAN_STEP));
btnPanDown.addEventListener('click',  () => pan(0, -PAN_STEP));
btnPanLeft.addEventListener('click',  () => pan(-PAN_STEP, 0));
btnPanRight.addEventListener('click', () => pan( PAN_STEP, 0));

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowUp')    { e.preventDefault(); pan(0,  PAN_STEP); }
  if (e.key === 'ArrowDown')  { e.preventDefault(); pan(0, -PAN_STEP); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); pan(-PAN_STEP, 0); }
  if (e.key === 'ArrowRight') { e.preventDefault(); pan( PAN_STEP, 0); }
});

/* ─── Mobile Sidebar Toggle ───────────────────────────────────── */
function closeMobileSidebar() {
  sidebar.classList.remove('bv-sidebar--open');
  mobileSysBtn.setAttribute('aria-expanded', 'false');
}

mobileSysBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = sidebar.classList.toggle('bv-sidebar--open');
  mobileSysBtn.setAttribute('aria-expanded', String(open));
});

// Tap outside sidebar → close it.
document.addEventListener('click', (e) => {
  if (!sidebar.classList.contains('bv-sidebar--open')) return;
  if (sidebar.contains(e.target) || mobileSysBtn.contains(e.target)) return;
  closeMobileSidebar();
});

/* ─── Mobile Search Overlay ───────────────────────────────────── */
const mobileSearchOverlay = document.getElementById('mobileSearchOverlay');
document.getElementById('mobileSearchBtn')?.addEventListener('click', () => {
  if (!mobileSearchOverlay) return;
  mobileSearchOverlay.hidden = !mobileSearchOverlay.hidden;
  if (!mobileSearchOverlay.hidden) document.getElementById('searchInputMobile')?.focus();
});
document.getElementById('mobileSearchClose')?.addEventListener('click', () => {
  if (mobileSearchOverlay) mobileSearchOverlay.hidden = true;
});
document.addEventListener('touchstart', (e) => {
  if (!sidebar.classList.contains('bv-sidebar--open')) return;
  if (sidebar.contains(e.target) || mobileSysBtn.contains(e.target)) return;
  closeMobileSidebar();
}, { passive: true });

/* ─── Raycasting — Hover ──────────────────────────────────────── */
function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  pointer.x =  ((clientX - rect.left) / rect.width)  * 2 - 1;
  pointer.y = -((clientY - rect.top)  / rect.height) * 2 + 1;
}

canvas.addEventListener('pointermove', (e) => {
  if (!modelLoaded) return;
  getCanvasPos(e);
  raycaster.setFromCamera(pointer, camera);
  const hits = pickAnatomyHits();

  if (hoveredMesh && hoveredMesh !== selectedMesh) {
    restoreHighlight(hoveredMesh);
    hoveredMesh = null;
  }

  if (hits.length > 0) {
    const mesh = hits[0].object;
    if (mesh !== selectedMesh) {
      setHighlight(mesh, HOVER_COLOR);
      hoveredMesh = mesh;
    }
    showTooltip(mesh, e.clientX, e.clientY);
    canvas.style.cursor = 'pointer';
  } else {
    hideTooltip();
    canvas.style.cursor = '';
  }
});

canvas.addEventListener('pointerleave', () => {
  if (hoveredMesh && hoveredMesh !== selectedMesh) {
    restoreHighlight(hoveredMesh);
    hoveredMesh = null;
  }
  hideTooltip();
});

/* ─── Raycasting — Click ──────────────────────────────────────── */
canvas.addEventListener('click', (e) => {
  if (!modelLoaded) return;
  getCanvasPos(e);
  raycaster.setFromCamera(pointer, camera);
  const hits = pickAnatomyHits();

  if (hits.length > 0) {
    const mesh = hits[0].object;
    if (selectedMesh && selectedMesh !== mesh) {
      restoreHighlight(selectedMesh);
    }
    selectedMesh = mesh;
    setHighlight(mesh, SELECTED_COLOR);
    focusMesh(mesh);
    openDetailPanel(mesh);
  } else {
    if (selectedMesh) {
      restoreHighlight(selectedMesh);
      selectedMesh = null;
    }
    closeDetailPanel();
  }
});

/* ─── Highlight Helper ────────────────────────────────────────── */
// A single bone is often multiple GLTF primitives → multiple sibling Mesh objects.
// Clicking one leaves the rest unhighlighted → "fracture" look.
// Collect the clicked mesh + all non-text sibling meshes sharing the same parent.
function getMeshGroup(mesh) {
  const group = [mesh];
  if (!mesh.parent) return group;
  for (const sib of mesh.parent.children) {
    if (sib === mesh || !sib.isMesh) continue;
    const mats = Array.isArray(sib.material) ? sib.material : [sib.material];
    if (mats.some(m => m?.transparent && m?.opacity === 0)) continue; // skip text
    group.push(sib);
  }
  return group;
}

function setHighlight(mesh, color) {
  getMeshGroup(mesh).forEach(m => {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach(mat => { if (mat?.color) mat.color.copy(color); });
  });
}

function restoreHighlight(mesh) {
  getMeshGroup(mesh).forEach(m => {
    if (!m.userData.origColor) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach(mat => { if (mat?.color) mat.color.copy(m.userData.origColor); });
  });
}

/* ─── Tooltip ─────────────────────────────────────────────────── */
function showTooltip(mesh, x, y) {
  const name = cleanName(mesh.name || mesh.parent?.name || '');
  if (!name) return;
  const bn = lookupLabel(name);
  tooltipEl.textContent = bn ? `${bn.bn} · ${name}` : name;
  tooltipEl.style.left   = (x + 14) + 'px';
  tooltipEl.style.top    = (y - 10) + 'px';
  tooltipEl.hidden = false;
}

function hideTooltip() {
  tooltipEl.hidden = true;
}

/* ─── Detail Panel ────────────────────────────────────────────── */
function openDetailPanel(mesh) {
  let name = cleanName(mesh.name || '');
  if (!name && mesh.parent) name = cleanName(mesh.parent.name || '');

  const data  = lookupLabel(name);
  const sys   = findSystemForMesh(mesh);

  detailTitleBn.textContent = data ? data.bn : name;
  detailTitleEn.textContent = name || '—';
  detailTextBn.textContent  = data?.desc || 'এই অঙ্গ সম্পর্কে আরো বিস্তারিত তথ্য শীঘ্রই যুক্ত হবে।';
  detailTextEn.textContent  = sys
    ? `Part of the ${sys.labelEn}.`
    : 'Part of human anatomy (Z-Anatomy · CC BY-SA 4.0).';

  if (sys) {
    detailBadge.textContent   = sys.labelBn;
    detailBadge.style.background = sys.color + '22';
    detailBadge.style.color      = sys.color;
    detailBadge.style.borderColor = sys.color + '55';
    detailBadge.hidden = false;
  } else {
    detailBadge.hidden = true;
  }

  detailPanel.hidden    = false;
  detailBackdrop.hidden = false;
  requestAnimationFrame(() => {
    detailPanel.classList.add('is-open');
    detailBackdrop.classList.add('is-visible');
  });
  detailPanel.setAttribute('aria-hidden', 'false');
}

function closeDetailPanel() {
  detailPanel.classList.remove('is-open');
  detailBackdrop.classList.remove('is-visible');
  detailPanel.setAttribute('aria-hidden', 'true');
  if (selectedMesh) {
    restoreHighlight(selectedMesh);
    selectedMesh = null;
  }
  detailPanel.addEventListener('transitionend', () => {
    if (!detailPanel.classList.contains('is-open')) {
      detailPanel.hidden    = true;
      detailBackdrop.hidden = true;
    }
  }, { once: true });
}

detailClose.addEventListener('click', closeDetailPanel);
detailBackdrop.addEventListener('click', closeDetailPanel);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !detailPanel.hidden) closeDetailPanel();
});

/* ─── Helpers ─────────────────────────────────────────────────── */
function cleanName(name) {
  return name
    .replace(/\.(t|s|i|e\d*|g|o\d*|r|l|st|j)[lr]?$/, '')  // Z-Anatomy suffixes
    .replace(/_\d+$/, '')                            // Three.js dedup suffix (_1, _2 …)
    .replace(/_/g, ' ')                              // reverse Three.js space→underscore sanitization
    .trim();
}

// Three.js removes dots before suffixes (joint.l → jointl).
// Fallback: if no exact match, strip trailing l/r and retry.
function lookupLabel(name) {
  return BN_LABELS[name] ?? BN_LABELS[name.replace(/[lr]$/, '').trimEnd()] ?? null;
}

function findSystemForMesh(mesh) {
  let obj = mesh;
  while (obj) {
    const sys = SYSTEMS.find(s => systemNodes[s.key] === obj);
    if (sys) return sys;
    obj = obj.parent;
  }
  return null;
}

/* ─── Focus Camera on Mesh ────────────────────────────────────── */
function focusMesh(mesh) {
  // Build world bounding box from the full mesh group (multi-primitive bones).
  const box = new THREE.Box3();
  getMeshGroup(mesh).forEach(m => box.expandByObject(m));
  if (box.isEmpty()) return;

  const center = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.05);

  // Distance needed to fit the object in the vertical FOV with padding.
  const fovRad   = camera.fov * (Math.PI / 180);
  const fitDist  = (maxDim / 2) / Math.tan(fovRad / 2) * 2.2;
  const distance = Math.max(fitDist, controls.minDistance * 1.5);

  // Keep current viewing direction, move camera along it to the fitted distance.
  const dir     = camera.position.clone().sub(controls.target).normalize();
  const targetCamPos = center.clone().add(dir.multiplyScalar(distance));

  animateCameraTo(center, targetCamPos, 500);
}

function animateCameraTo(newTarget, newCamPos, durationMs) {
  const startTarget = controls.target.clone();
  const startCamPos = camera.position.clone();
  const startTime   = performance.now();

  function step() {
    const t    = Math.min((performance.now() - startTime) / durationMs, 1);
    const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out

    controls.target.lerpVectors(startTarget, newTarget, ease);
    camera.position.lerpVectors(startCamPos, newCamPos, ease);
    controls.update();

    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/* ─── Search ──────────────────────────────────────────────────── */
function buildSearchIndex() {
  const idx = [];
  for (const sys of SYSTEMS) {
    const seen = new Map();
    for (const m of (systemMeshes[sys.key] ?? [])) {
      if (m.userData.isTextLabel) continue;
      const name = cleanName(m.name);
      if (!name) continue;
      const k = name.toLowerCase();
      if (!seen.has(k)) {
        const label = lookupLabel(name);
        seen.set(k, {
          name, bn: label?.bn ?? null,
          sysKey: sys.key, sysLabelBn: sys.labelBn, sysColor: sys.color,
          meshes: [],
        });
      }
      seen.get(k).meshes.push(m);
    }
    idx.push(...seen.values());
  }
  return idx;
}

function handleSearchSelect(result) {
  // Close mobile search overlay and clear input
  if (mobileSearchOverlay && !mobileSearchOverlay.hidden) {
    mobileSearchOverlay.hidden = true;
    const mobileInput = document.getElementById('searchInputMobile');
    if (mobileInput) mobileInput.value = '';
  }

  // Reset any existing selection
  if (selectedMesh) { restoreHighlight(selectedMesh); selectedMesh = null; }
  detailPanel.classList.remove('is-open');
  detailBackdrop.classList.remove('is-visible');
  detailPanel.setAttribute('aria-hidden', 'true');
  detailPanel.hidden = true;
  detailBackdrop.hidden = true;

  // Show only the target system, hide all others
  SYSTEMS.forEach(s => toggleSystem(s.key, s.key === result.sysKey));
  const checkboxes = [...systemList.querySelectorAll('input[type=checkbox]')];
  SYSTEMS.forEach((s, i) => { if (checkboxes[i]) checkboxes[i].checked = s.key === result.sysKey; });

  if (!result.meshes.length) return;
  const first = result.meshes[0];

  result.meshes.forEach(m => setHighlight(m, SELECTED_COLOR));
  selectedMesh = first;

  // Focus camera on bounding box of all result meshes
  const box = new THREE.Box3();
  result.meshes.forEach(m => box.expandByObject(m));
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.05);
    const fovRad = camera.fov * (Math.PI / 180);
    const dist   = Math.max((maxDim / 2) / Math.tan(fovRad / 2) * 2.2, controls.minDistance * 1.5);
    const dir    = camera.position.clone().sub(controls.target).normalize();
    animateCameraTo(center, center.clone().add(dir.multiplyScalar(dist)), 500);
  }

  openDetailPanel(first);
}

/* ─── Resize Handler ──────────────────────────────────────────── */
function onResize() {
  const w = canvas.parentElement.clientWidth;
  const h = canvas.parentElement.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);

function ensureCanvasSize(framesLeft = 12) {
  onResize();
  const size = renderer.getSize(new THREE.Vector2());
  if ((size.x > 2 && size.y > 2) || framesLeft <= 0) return;
  requestAnimationFrame(() => ensureCanvasSize(framesLeft - 1));
}

/* ─── Render Loop ─────────────────────────────────────────────── */
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);

  if (hudEl && modelLoaded) {
    const size = renderer.getSize(new THREE.Vector2());
    const info = renderer.info;
    const visibleMeshes = (() => {
      let c = 0;
      if (!anatomyRoot) return c;
      anatomyRoot.traverse((o) => {
        if (o.isMesh && isWorldVisible(o) && !isDecorationMesh(o)) c++;
      });
      return c;
    })();

    const text =
      `canvas: ${Math.round(size.x)}×${Math.round(size.y)}\n` +
      `visibleMeshes: ${visibleMeshes}\n` +
      `calls: ${info.render.calls}  tris: ${info.render.triangles}\n` +
      `points: ${info.render.points}  lines: ${info.render.lines}`;

    hudEl.textContent = text;
    // Auto-hide HUD when rendering looks healthy.
    const healthy = size.x > 50 && size.y > 50 && info.render.calls > 0 && visibleMeshes > 0;
    hudEl.hidden = healthy;
  }
}
animate();
