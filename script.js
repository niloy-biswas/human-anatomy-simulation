/**
 * ═══════════════════════════════════════════════════════════════
 *  মানব হৃদপিণ্ড — Interactive 3D Anatomy  |  script.js
 * ═══════════════════════════════════════════════════════════════
 *
 *  HOW TO ADJUST HOTSPOT POSITIONS:
 *  ─────────────────────────────────────────────────────────────
 *  Each annotation has a `position` string with 3 values: "X Y Z"
 *
 *    X = horizontal offset from center
 *        negative = left  |  positive = right
 *
 *    Y = vertical offset from center
 *        negative = down  |  positive = up
 *
 *    Z = depth offset from center
 *        negative = back  |  positive = front
 *
 *  All values are in meters (the model's local coordinate space).
 *  For a ~25 cm tall heart model, values range roughly ±0.15 m.
 *
 *  The `normal` string controls occlusion — the hotspot hides
 *  when the surface it's attached to rotates away from the camera.
 *  Common normals:
 *    "0 1 0"  = top surface
 *    "0 0 1"  = front surface
 *    "1 0 0"  = right side
 *    "-1 0 0" = left side
 *
 *  FINDING CORRECT COORDINATES:
 *  1. Load the page in browser
 *  2. Open DevTools → Console
 *  3. Run: document.getElementById('heartViewer').getBoundingBoxCenter()
 *     or check the console output logged on model load
 *  4. Rotate the model to the desired angle, use modelViewer.getCameraOrbit()
 *     to understand the current view
 *  5. Adjust x/y/z until each dot sits on the correct anatomy
 *
 *  `side: 'left'` flips the pill to appear on the left of the dot
 *  (useful for hotspots on the right side of the screen)
 * ═══════════════════════════════════════════════════════════════
 */

/* ─── Annotation Data ─────────────────────────────────────────
 *
 *  Edit ONLY this array to change labels, positions, or sides.
 *  Each object:
 *    id       – unique slug (used as CSS class and HTML attribute)
 *    label    – Bangla text displayed in the pill
 *    position – "X Y Z" in model-space meters  ← ADJUST THESE
 *    normal   – "NX NY NZ" surface normal for occlusion
 *    side     – 'right' (default) or 'left' (pill appears left of dot)
 * ─────────────────────────────────────────────────────────────
 */
/*
 *  COORDINATE SYSTEM NOTE:
 *  ─────────────────────────────────────────────────────────────
 *  Sketchfab's annotation API returns positions in Z-up FBX space:
 *    Sketchfab (x, y, z)  where Z = up, Y = depth
 *
 *  model-viewer expects GLTF Y-up space:
 *    model-viewer (x, y, z)  where Y = up, Z = front
 *
 *  Conversion applied to all positions below:
 *    mv_x =  sk_x
 *    mv_y =  sk_z   ← Sketchfab Z becomes model-viewer Y (up axis)
 *    mv_z = -sk_y   ← Sketchfab Y becomes model-viewer -Z
 * ─────────────────────────────────────────────────────────────
 */
const annotations = [
  {
    id: "pulmonary-vein-1",
    label: "ফুসফুসীয় শিরা",
    labelEn: "Pulmonary Vein",
    position: "0.04559 0.10461 -0.00357",
    normal: "0 1 0",
    side: "right",
    detailsBn:
      "ফুসফুসীয় শিরা ফুসফুস থেকে অক্সিজেনযুক্ত রক্ত বাম অলিন্দে নিয়ে আসে। সাধারণত শিরা দেহের বিভিন্ন অংশ থেকে অক্সিজেনবিহীন রক্ত বহন করে, কিন্তু ফুসফুসীয় শিরা এর ব্যতিক্রম; এটি অক্সিজেনযুক্ত রক্ত বহন করে।",
    detailsEn:
      "The pulmonary vein carries oxygenated blood from the lungs to the left atrium. It is an exception among veins because it carries oxygen-rich blood instead of deoxygenated blood.",
  },
  {
    id: "pulmonary-vein-2",
    label: "ফুসফুসীয় শিরা",
    labelEn: "Pulmonary Vein",
    position: "0.04120 0.11695 -0.00620",
    normal: "0 1 0",
    side: "right",
    detailsBn:
      "ফুসফুসীয় শিরার মাধ্যমে ফুসফুসে পরিশোধিত রক্ত হৃদপিণ্ডে ফিরে আসে। এই রক্ত পরে বাম নিলয়ে যায় এবং সেখান থেকে মহাধমনীর মাধ্যমে সারা দেহে প্রবাহিত হয়।",
    detailsEn:
      "Through the pulmonary vein, purified blood from the lungs returns to the heart. This blood then passes to the left ventricle and is pumped to the body through the aorta.",
  },
  {
    id: "pulmonary-artery",
    label: "ফুসফুসীয় ধমনী",
    labelEn: "Pulmonary Artery",
    position: "0.03050 0.13749 0.00923",
    normal: "0 1 0",
    side: "right",
    detailsBn:
      "ফুসফুসীয় ধমনী ডান নিলয় থেকে অক্সিজেনবিহীন রক্ত ফুসফুসে নিয়ে যায়। সাধারণত ধমনী অক্সিজেনযুক্ত রক্ত বহন করে, কিন্তু ফুসফুসীয় ধমনী এর ব্যতিক্রম; এটি অক্সিজেনবিহীন রক্ত বহন করে।",
    detailsEn:
      "The pulmonary artery carries deoxygenated blood from the right ventricle to the lungs. It is an exception among arteries because it carries oxygen-poor blood.",
  },
  {
    id: "aorta",
    label: "মহাধমনী",
    labelEn: "Aorta",
    position: "-0.00746 0.14977 0.01368",
    normal: "0 1 0",
    side: "left",
    detailsBn:
      "মহাধমনী মানবদেহের প্রধান ও বৃহত্তম ধমনী। এটি বাম নিলয় থেকে অক্সিজেনযুক্ত রক্ত গ্রহণ করে এবং শাখা-প্রশাখার মাধ্যমে সারা দেহে রক্ত সরবরাহ করে।",
    detailsEn:
      "The aorta is the main and largest artery of the human body. It receives oxygenated blood from the left ventricle and distributes it throughout the body through its branches.",
  },
  {
    id: "superior-vena-cava",
    label: "ঊর্ধ্ব মহাশিরা",
    labelEn: "Superior Vena Cava",
    position: "-0.03815 0.13605 0.00613",
    normal: "0 1 0",
    side: "left",
    detailsBn:
      "ঊর্ধ্ব মহাশিরা দেহের ওপরের অংশ—যেমন মাথা, ঘাড় ও বাহু—থেকে অক্সিজেনবিহীন রক্ত ডান অলিন্দে নিয়ে আসে। এটি হৃদপিণ্ডে শিরার মাধ্যমে রক্ত প্রত্যাবর্তনের একটি প্রধান পথ।",
    detailsEn:
      "The superior vena cava brings deoxygenated blood from the upper parts of the body, such as the head, neck, and arms, into the right atrium.",
  },
  {
    id: "atrium",
    label: "অলিন্দ",
    labelEn: "Atrium",
    position: "-0.01959 0.09753 -0.04410",
    normal: "0 1 0",
    side: "left",
    detailsBn:
      "অলিন্দ হলো হৃদপিণ্ডের উপরের প্রকোষ্ঠ। মানব হৃদপিণ্ডে দুটি অলিন্দ থাকে—ডান অলিন্দ ও বাম অলিন্দ। ডান অলিন্দ দেহ থেকে অক্সিজেনবিহীন রক্ত গ্রহণ করে, আর বাম অলিন্দ ফুসফুস থেকে অক্সিজেনযুক্ত রক্ত গ্রহণ করে।",
    detailsEn:
      "The atria are the upper chambers of the heart. The right atrium receives deoxygenated blood from the body, while the left atrium receives oxygenated blood from the lungs.",
  },
  {
    id: "inferior-vena-cava",
    label: "নিম্ন মহাশিরা",
    labelEn: "Inferior Vena Cava",
    position: "-0.03899 0.03530 -0.00963",
    normal: "0 1 0",
    side: "left",
    detailsBn:
      "নিম্ন মহাশিরা দেহের নিচের অংশ থেকে অক্সিজেনবিহীন রক্ত ডান অলিন্দে নিয়ে আসে। পা, উদর ও নিম্ন দেহাংশ থেকে রক্ত হৃদপিণ্ডে ফেরার প্রধান শিরা এটি।",
    detailsEn:
      "The inferior vena cava carries deoxygenated blood from the lower parts of the body to the right atrium. It is the main vein returning blood from the legs, abdomen, and lower body.",
  },
  {
    id: "ventricle",
    label: "নিলয়",
    labelEn: "Ventricle",
    position: "-0.00078 0.04031 -0.00705",
    normal: "0 1 0",
    side: "right",
    detailsBn:
      "নিলয় হলো হৃদপিণ্ডের নিচের প্রকোষ্ঠ। মানব হৃদপিণ্ডে দুটি নিলয় থাকে—ডান নিলয় ও বাম নিলয়। ডান নিলয় রক্ত ফুসফুসে পাঠায়, আর বাম নিলয় অক্সিজেনযুক্ত রক্ত সারা দেহে পাঠায়।",
    detailsEn:
      "The ventricles are the lower chambers of the heart. The right ventricle pumps blood to the lungs, while the left ventricle pumps oxygenated blood to the whole body.",
  },
  {
    id: "septum",
    label: "হৃদপর্দা / সেপ্টাম",
    labelEn: "Septum",
    position: "0.01634 0.04502 0.02114",
    normal: "0 1 0",
    side: "right",
    detailsBn:
      "সেপ্টাম বা হৃদপর্দা হৃদপিণ্ডের ডান ও বাম অংশকে পৃথক করে। এর ফলে অক্সিজেনযুক্ত ও অক্সিজেনবিহীন রক্ত সরাসরি মিশে যায় না। তাই রক্ত সঞ্চালন কার্যকরভাবে সম্পন্ন হয়।",
    detailsEn:
      "The septum separates the right and left sides of the heart. It prevents oxygenated and deoxygenated blood from mixing directly and helps maintain efficient circulation.",
  },
];

/* ─── DOM References ─────────────────────────────────────────── */
const modelViewer     = document.getElementById("heartViewer");
const loadingOverlay  = document.getElementById("loadingOverlay");
const interactionHint = document.getElementById("interactionHint");
const btnPlayPause    = document.getElementById("btnPlayPause");
const detailPanel     = document.getElementById("detailPanel");
const detailBackdrop  = document.getElementById("detailBackdrop");
const detailClose     = document.getElementById("detailClose");
const detailTitleBn   = document.getElementById("detailTitleBn");
const detailTitleEn   = document.getElementById("detailTitleEn");
const detailTextBn    = document.getElementById("detailTextBn");
const detailTextEn    = document.getElementById("detailTextEn");

/* ─── Detail Panel ───────────────────────────────────────────── */
let activeHotspotBtn = null;

function openDetailPanel(ann, triggerBtn) {
  detailTitleBn.textContent = ann.label;
  detailTitleEn.textContent = ann.labelEn || "";
  detailTextBn.textContent  = ann.detailsBn || "";
  detailTextEn.textContent  = ann.detailsEn || "";

  detailPanel.hidden    = false;
  detailBackdrop.hidden = false;

  requestAnimationFrame(() => {
    detailPanel.classList.add("is-open");
    detailBackdrop.classList.add("is-visible");
  });
  detailPanel.setAttribute("aria-hidden", "false");

  // Activate selected hotspot style
  if (activeHotspotBtn) activeHotspotBtn.classList.remove("hotspot--active");
  triggerBtn.classList.add("hotspot--active");
  activeHotspotBtn = triggerBtn;
}

function closeDetailPanel() {
  detailPanel.classList.remove("is-open");
  detailBackdrop.classList.remove("is-visible");
  detailPanel.setAttribute("aria-hidden", "true");

  if (activeHotspotBtn) {
    activeHotspotBtn.classList.remove("hotspot--active");
    activeHotspotBtn = null;
  }

  detailPanel.addEventListener("transitionend", () => {
    if (!detailPanel.classList.contains("is-open")) {
      detailPanel.hidden    = true;
      detailBackdrop.hidden = true;
    }
  }, { once: true });
}

detailClose.addEventListener("click", closeDetailPanel);
detailBackdrop.addEventListener("click", closeDetailPanel);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !detailPanel.hidden) closeDetailPanel();
});

/* ─── Inject Hotspot Elements ────────────────────────────────── */
function buildHotspots() {
  annotations.forEach((ann) => {
    const btn = document.createElement("button");
    btn.setAttribute("slot",          `hotspot-${ann.id}`);
    btn.setAttribute("data-position", ann.position);
    btn.setAttribute("data-normal",   ann.normal);
    btn.setAttribute("aria-label",    ann.label);
    btn.className = `hotspot${ann.side === "left" ? " left" : ""}`;

    const connector = document.createElement("div");
    connector.className = "pill-connector";

    const pill = document.createElement("div");
    pill.className = "annotation-pill";

    const pillLabels = document.createElement("div");
    pillLabels.className = "pill-labels";

    const pillBn = document.createElement("span");
    pillBn.className = "pill-label-bn";
    pillBn.textContent = ann.label;
    pillLabels.appendChild(pillBn);

    if (ann.labelEn) {
      const pillEn = document.createElement("span");
      pillEn.className = "pill-label-en";
      pillEn.textContent = ann.labelEn;
      pillLabels.appendChild(pillEn);
    }

    pill.appendChild(pillLabels);
    btn.appendChild(connector);
    btn.appendChild(pill);

    // Click: open panel (click same hotspot again to close)
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (activeHotspotBtn === btn && detailPanel.classList.contains("is-open")) {
        closeDetailPanel();
      } else {
        openDetailPanel(ann, btn);
      }
    });

    modelViewer.appendChild(btn);
  });

}

/* ─── Model Load Handler ─────────────────────────────────────── */
modelViewer.addEventListener("load", () => {
  // ① Hide loading overlay
  loadingOverlay.classList.add("hidden");

  // ② Autoplay first animation
  const animations = modelViewer.availableAnimations ?? [];
  if (animations.length > 0) {
    if (!modelViewer.animationName) modelViewer.animationName = animations[0];
    modelViewer.play({ repetitions: Infinity });
  }

  // ⑤ Fade interaction hint after a delay
  setTimeout(() => {
    interactionHint?.classList.add("fade-out");
  }, 5000);
});

/* ─── Model Error Handler ────────────────────────────────────── */
modelViewer.addEventListener("error", (event) => {
  console.error("[হৃদপিণ্ড] Failed to load model:", event);

  loadingOverlay.innerHTML = `
    <div class="loading-card">
      <p class="loading-text" style="color:#e63030">মডেল লোড ব্যর্থ হয়েছে</p>
      <p class="loading-sub">
        assets/heart.glb পাওয়া যাচ্ছে না।<br/>
        নিচের নির্দেশনা অনুসরণ করুন।
      </p>
      <ul style="text-align:left;margin-top:8px;color:#7a8099;font-size:12px;line-height:2">
        <li>heart.glb ফাইলটি <strong>assets/</strong> ফোল্ডারে রাখুন</li>
        <li>Local server দিয়ে চালু করুন (<code>npx serve .</code>)</li>
        <li>ফাইলটি সরাসরি browser-এ খুলবেন না</li>
      </ul>
    </div>`;
});

/* ─── Play / Pause Toggle (in cam controls) ─────────────────── */
let heartPlaying = true;
btnPlayPause?.addEventListener("click", () => {
  heartPlaying = !heartPlaying;
  if (heartPlaying) modelViewer.play({ repetitions: Infinity });
  else modelViewer.pause();
  btnPlayPause.querySelector('.icon-pause').style.display = heartPlaying ? '' : 'none';
  btnPlayPause.querySelector('.icon-play').style.display  = heartPlaying ? 'none' : '';
  btnPlayPause.classList.toggle('active', !heartPlaying);
});

/* ─── Camera Controls ────────────────────────────────────────── */
let heartAutoRotating = false;
const ORBIT_STEP = 0.18;

function orbitPan(dTheta, dPhi) {
  const orbit = modelViewer.getCameraOrbit();
  const phi   = Math.max(0.1, Math.min(Math.PI - 0.1, orbit.phi + dPhi));
  modelViewer.cameraOrbit = `${orbit.theta + dTheta}rad ${phi}rad ${orbit.radius}m`;
}

document.getElementById('btnAutoRotate')?.addEventListener('click', function () {
  heartAutoRotating = !heartAutoRotating;
  if (heartAutoRotating) modelViewer.setAttribute('auto-rotate', '');
  else modelViewer.removeAttribute('auto-rotate');
  this.classList.toggle('active', heartAutoRotating);
});

document.getElementById('btnResetCam')?.addEventListener('click', () => {
  modelViewer.cameraOrbit  = '0deg 80deg auto';
  modelViewer.fieldOfView  = 'auto';
});

document.getElementById('btnPanUp')?.addEventListener('click',    () => orbitPan(0, -ORBIT_STEP));
document.getElementById('btnPanDown')?.addEventListener('click',  () => orbitPan(0,  ORBIT_STEP));
document.getElementById('btnPanLeft')?.addEventListener('click',  () => orbitPan(-ORBIT_STEP, 0));
document.getElementById('btnPanRight')?.addEventListener('click', () => orbitPan( ORBIT_STEP, 0));

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowUp')    { e.preventDefault(); orbitPan(0, -ORBIT_STEP); }
  if (e.key === 'ArrowDown')  { e.preventDefault(); orbitPan(0,  ORBIT_STEP); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); orbitPan(-ORBIT_STEP, 0); }
  if (e.key === 'ArrowRight') { e.preventDefault(); orbitPan( ORBIT_STEP, 0); }
});

/* ─── Initialise ─────────────────────────────────────────────── */
buildHotspots();

/* ─── Search Bar ─────────────────────────────────────────────── */
import('./search.js').then(({ initSearchBar }) => {
  const inputEl    = document.getElementById('searchInput');
  const dropdownEl = document.getElementById('searchDropdown');
  if (!inputEl || !dropdownEl) return;

  const idx = annotations.map(ann => ({
    name:       ann.labelEn,
    bn:         ann.label,
    sysKey:     'heart',
    sysLabelBn: 'হৃদপিণ্ড',
    sysColor:   '#E74C3C',
    ann,
  }));

  initSearchBar({
    inputEl,
    dropdownEl,
    onSelect: result => {
      const btn = modelViewer.querySelector(`[slot="hotspot-${result.ann.id}"]`);
      if (btn) openDetailPanel(result.ann, btn);
    },
  }).setIndex(idx);
});

/*
 *  QUICK REFERENCE — useful model-viewer console commands:
 *  ─────────────────────────────────────────────────────────────
 *  const mv = document.getElementById('heartViewer');
 *
 *  mv.availableAnimations        → string[] of animation names
 *  mv.animationName              → currently playing animation
 *  mv.play({ repetitions: 0 })  → play indefinitely
 *  mv.pause()                    → pause animation
 *  mv.getCameraOrbit()           → {theta, phi, radius} — current camera
 *  mv.getCameraTarget()          → {x, y, z} — point the camera looks at
 *  mv.getBoundingBoxCenter()     → {x, y, z} — model center in world space
 *
 *  To find good hotspot positions:
 *    1. Rotate to the desired angle
 *    2. Run mv.getCameraOrbit() to note angles
 *    3. Click a spot on the model → check network or use hit-test API
 *    4. Update `position` in the annotations array above
 * ─────────────────────────────────────────────────────────────
 */
