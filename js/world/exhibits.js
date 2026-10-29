// Exhibition architecture. Every project gets a pavilion in its own AI language, all sharing one
// layout so the camera and the images work the same way at each stop. 06–09 share one stop
// (Projects) and 10–11 another (Competitions), smaller, on both sides of the road:
//   01 City Montessori School  CMS Mahanagar: white neoclassical block, columned portico, pediment with oculus
//   02 IIT Kharagpur           Main Building: finned modernist block, salmon porte-cochère, white tower
//   03 Zepto                   purple dark store: roof logo, scooters, falling-bid bars, data pipeline, CFO dashboard
//   04 ixana.ai                black glass tower: logo, X figure, ring gauges, live automation graph
//   05 360 Realtors            magenta towers on a podium: logo, 360° ring, giant key, village map with pins
//   06 Fraud detection         steel vault: turning vault door, a roof of transactions with one red fraud
//   07 SMS spam                sorting office: envelopes on a conveyor, spam and ham bins, giant envelope
//   08 Generative augmentation GAN studio: generator and discriminator towers, image tiles drifting between
//   09 Forecasting             weather station: anemometer mast, thermometer, a temperature ribbon + forecast
//   10 SAKHI                   neighbourhood bank: credit-score dial, UPI phone, chatbot bubbles
//   11 ISRO solar flares       observatory: dome and telescope, a flaring sun, Aditya-L1 orbiting, warning beacon
// The images are shown in true colour. Pavilions drop onto the sand as the buggy approaches,
// scrubbed by the scroll position.
import * as THREE from 'three';
import { heightAt, shoreZ } from './terrain.js';
import { STOP_X } from './path.js';
import { pbr, metricBox } from './kit.js';
import { TRUE_COLOR_GLSL } from './grade.js';
import { instancesFromModel } from './models.js';
import { glowTexture, labelTexture, rectGlowTexture, rng, nameTexture, windowGridTexture, linkBoardTexture } from './textures.js';
import { person } from '../data.js';

const FLOOR = 0.6;
const PAVILION_SCALE = 1.28;

// ---------- Group stops (projects, competitions): one stop, smaller buildings on both sides of the
// road, each turned from facing the road towards the buggy coming up behind. A slot is
// [metres ahead of the stop, side]: side -1 is the sea (the driver's left), +1 the hill (right).
const GROUP_SCALE = 0.85;
const GROUP_TURN = 0.85;
const GROUP_SLOTS = {
  projects: [[12, -1], [12, 1]],
  'projects-2': [[12, -1], [12, 1]],
  competitions: [[12, -1], [12, 1]],
};
export const GROUP_PAD = 13;   // half-size of the level site cut for a hill-side building

export function groupSpot(path, projects, p) {
  const members = projects.filter((q) => q.group === p.group);
  const [a, side] = GROUP_SLOTS[p.group][members.indexOf(p)];
  const s = path.sAtX(STOP_X[p.group]);
  const P = path.pointAt(s), T = path.tangentAt(s), N = path.inwardAt(s);
  const c = P.clone().addScaledVector(T, a).addScaledVector(N, side > 0 ? 18 : -16);
  const f = N.clone().multiplyScalar(-side * Math.cos(GROUP_TURN)).addScaledVector(T, -Math.sin(GROUP_TURN));
  return { s, P, N, x: c.x, z: c.z, side, rotY: Math.atan2(f.x, f.z) };
}
const HERO = { w: 10.4, h: 6.7 };
const SIDE = { w: 5.6, h: 3.8 };

function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent?.add(m);
  return m;
}

// Fit an image into a panel by cropping its centre (like object-fit: cover).
function coverTexture(tex, w, h) {
  const ia = tex.image.width / tex.image.height;
  const fa = w / h;
  tex.repeat.set(1, 1);
  tex.offset.set(0, 0);
  if (ia > fa) { tex.repeat.x = fa / ia; tex.offset.x = (1 - tex.repeat.x) / 2; }
  else { tex.repeat.y = ia / fa; tex.offset.y = (1 - tex.repeat.y) / 2; }
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
}

// One of her images: shown in true colour (pre-corrected for tone mapping and the grade), in a thin
// glowing frame with a soft halo on the wall; a band of light can sweep across it.
let haloTex = null;
function imagePanel(tex, w, h, ctx) {
  const g = new THREE.Group();
  const glow = ctx.glow ?? 1;
  const uniforms = { uSheen: { value: -1 }, uBright: { value: Math.pow(ctx.bright ?? 1, 2.2) }, ...ctx.display };
  const mat = new THREE.MeshBasicMaterial({ color: '#d8cbb8', toneMapped: false, fog: false });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec2 vPanelUv;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vPanelUv = uv;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vPanelUv;
        uniform float uSheen;
        uniform float uBright;
        ${TRUE_COLOR_GLSL}`)
      .replace('#include <opaque_fragment>', `
        float diag = vPanelUv.x * 0.8 + vPanelUv.y * 0.45;
        float band = exp(-pow((diag - uSheen) * 9.0, 2.0));
        outgoingLight = gTrueColor(outgoingLight * uBright, vec3(1.0, 0.93, 0.82) * band * 0.45);
        #include <opaque_fragment>`);
  };
  const img = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  img.position.z = 0.06;
  g.add(img);
  haloTex ??= rectGlowTexture();
  const haloMat = new THREE.MeshBasicMaterial({ map: haloTex, color: ctx.accent ?? '#ffb877', transparent: true, opacity: 0.2 * glow, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, h * 1.5), haloMat);
  halo.position.z = 0.02;
  g.add(halo);
  const frameMat = new THREE.MeshStandardMaterial({ color: '#f6eadb', emissive: ctx.accent ?? '#ffb36b', emissiveIntensity: 1 });
  const t = 0.08;
  for (const [fw, fh, x, y] of [[w + t * 2, t, 0, h / 2 + t / 2], [w + t * 2, t, 0, -h / 2 - t / 2], [t, h, -w / 2 - t / 2, 0], [t, h, w / 2 + t / 2, 0]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.08), frameMat);
    f.position.set(x, y, 0.07);
    g.add(f);
  }
  if (tex) {
    const c = tex.clone();
    coverTexture(c, w, h);
    mat.map = c;
    mat.color.set('#ffffff');
  }
  ctx.panels.push({ uniforms, haloMat, frameMat, glow });
  ctx.picks.push(img);
  return g;
}

function lectern(M, tex, x, z, parent) {
  const g = new THREE.Group();
  mesh(new THREE.BoxGeometry(0.16, 1.4, 0.16), M.gunmetal, 0, 0.7, 0, g);
  const plate = new THREE.Group();
  plate.position.set(0, 1.5, 0);
  plate.rotation.x = -0.35;
  mesh(new THREE.BoxGeometry(3.3, 1.7, 0.08), M.gunmetal, 0, 0, 0, plate);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(3.16, 1.58), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  face.position.z = 0.05;
  plate.add(face);
  g.add(plate);
  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

// A warm uplight strip at the foot of a wall; returns its material so the stop can brighten it.
function strip(width, x, y, z, parent, rotY = 0) {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffe6c4', emissive: '#ffb064', emissiveIntensity: 1 });
  const m = mesh(new THREE.BoxGeometry(width, 0.05, 0.1), mat, x, y, z, parent);
  m.rotation.y = rotY;
  m.castShadow = false;
  return mat;
}

// ---------- Shared layout: hero image(s) on the back wall, one image on each splayed side wall.
// With `card` (the campus buildings): the one hero shown whole at its own proportions, and no side
// walls (sideWall null). With `fit` ({ hero: [w, h], side: [w, h] }): each image as large as fits in
// that box at its own proportions, standing on the floor of its wall.
const contain = (tex, [w, h]) => {
  const a = tex?.image ? tex.image.width / tex.image.height : w / h;
  return a > w / h ? [w, w / a] : [h * a, h];
};
function layout(ctx, { backWall, sideWall, heroes, sides, card, fit }) {
  const { g } = ctx;
  backWall?.(g);
  if (card) {
    const im = heroes[0]?.image;
    const h = HERO.w * (im ? im.height / im.width : 9 / 16);
    const cp = imagePanel(heroes[0], HERO.w, h, ctx);
    cp.position.set(0, FLOOR + 0.8 + HERO.h - h / 2, -5.28);
    g.add(cp);
  } else if (fit) {
    const [w, h] = contain(heroes[0], fit.hero);
    const hp = imagePanel(heroes[0], w, h, ctx);
    hp.position.set(0, FLOOR + 0.8 + h / 2, -5.28);
    g.add(hp);
  } else if (heroes.length === 1) {
    const hp = imagePanel(heroes[0], HERO.w, HERO.h, ctx);
    hp.position.set(0, FLOOR + 0.8 + HERO.h / 2, -5.28);
    g.add(hp);
  } else {
    heroes.forEach((t, i) => {
      const hp = imagePanel(t, 6.1, 4.6, ctx);
      hp.position.set(i ? 3.25 : -3.25, FLOOR + 1.5 + 2.3, -5.28);
      g.add(hp);
    });
  }
  ctx.lights.push(strip(12.6, 0, FLOOR + 0.06, -5.2, g));
  if (!sideWall) return;
  [-1, 1].forEach((side, i) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 6.5, 0, -5.6);
    pivot.rotation.y = side * 0.38;
    sideWall(pivot, side);
    if (sides[i]) {
      const [w, h] = fit ? contain(sides[i], fit.side) : [SIDE.w, SIDE.h];
      const sp = imagePanel(sides[i], w, h, ctx);
      sp.position.set(-side * 0.27, FLOOR + (fit ? 0.5 : 1.1) + h / 2, 3.9);
      sp.rotation.y = -side * Math.PI / 2;
      pivot.add(sp);
    }
    ctx.lights.push(strip(7.2, -side * 0.32, FLOOR + 0.06, 3.8, pivot, Math.PI / 2));
    g.add(pivot);
  });
}

function deck(g, base, top, w = 16.4, d = 12.2) {
  mesh(metricBox(w + 0.6, FLOOR - 0.06, d + 0.6), base, 0, (FLOOR - 0.06) / 2, -1, g);
  mesh(metricBox(w, 0.06, d), top, 0, FLOOR - 0.03, -1, g);
  for (let i = 0; i < 2; i++) mesh(metricBox(7 - i * 0.6, FLOOR / 3, 0.45), base, 0, FLOOR / 6 + (FLOOR / 3) * i, 5.8 - i * 0.45, g);
}

// ---------- AI pavilion parts
// An LED strip or edge: its glow follows the stop (brightens on arrival) like the uplights.
function led(ctx, color) {
  const m = new THREE.MeshStandardMaterial({ color: '#0b0d10', emissive: color, emissiveIntensity: 1 });
  ctx.lights.push(m);
  return m;
}

function glowBox(w, h, d, mat, x, y, z, parent) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  m.castShadow = false;
  return m;
}


// Unlit, additive "hologram" material; its brightness is driven by the stop's animation.
function holo(color, opacity = 0.7) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
}



// ---------- Campus buildings (stops 01 and 02). The building's front face is the back wall the hero
// image hangs on (z = -5.3); it reaches up and out to the sides behind the deck, on a stone plinth
// that carries it over the wet sand. The side walls become freestanding notice boards.

// Instanced dark glass windows with light sills, at [x, y] centres on a facade at depth z.
function windows(M, spots, w, h, z, parent) {
  const glass = new THREE.InstancedMesh(new THREE.BoxGeometry(w, h, 0.12), M.windowGlass, spots.length);
  const sill = new THREE.InstancedMesh(metricBox(w + 0.25, 0.12, 0.3), M.stucco, spots.length);
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), m = new THREE.Matrix4();
  spots.forEach(([x, y], i) => {
    glass.setMatrixAt(i, m.compose(v.set(x, y, z + 0.03), q, s));
    sill.setMatrixAt(i, m.compose(v.set(x, y - h / 2 - 0.06, z + 0.12), q, s));
  });
  glass.receiveShadow = sill.castShadow = true;
  parent.add(glass, sill);
}

// A flat wall with a row of round-headed arches cut through it, per floor (an arcade).
function arcade(mat, len, floorH, floors, span, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-len / 2, 0);
  shape.lineTo(len / 2, 0);
  shape.lineTo(len / 2, floorH * floors);
  shape.lineTo(-len / 2, floorH * floors);
  shape.closePath();
  const n = Math.floor(len / span);
  const pad = (len - n * span) / 2;
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < n; i++) {
      const cx = -len / 2 + pad + span * (i + 0.5);
      const w = span * 0.6;
      const y0 = f * floorH + (f ? 1.0 : 0.02);   // upper floors: a solid balustrade below
      const yt = f * floorH + floorH * 0.66;
      const hole = new THREE.Path();
      hole.moveTo(cx - w / 2, y0);
      hole.lineTo(cx + w / 2, y0);
      hole.lineTo(cx + w / 2, yt);
      hole.absarc(cx, yt, w / 2, 0, Math.PI, false);
      hole.lineTo(cx - w / 2, y0);
      shape.holes.push(hole);
    }
  }
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 }), mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}


// ---------- 01 City Montessori School, Mahanagar campus, Lucknow (from photos): an all-white
// neoclassical block of four storeys over a tall columned portico, heavy dentilled cornices at every
// floor, dark grid-pane windows between pilasters and a great pediment with a round oculus; a lower
// balconied wing to either side with its own small pediment; green turf, rows of red flower pots, a
// clipped round tree, the blue campus sign over the entrance and fairy lights strung down the front.

// A cornice: a projecting slab with a row of dentils under its front edge.
function cornice(M, w, x, y, z, parent, d = 0.7) {
  mesh(metricBox(w, 0.38, d), M.whiteStucco, x, y, z + d / 2 - 0.15, parent);
  const n = Math.floor(w / 0.42);
  const den = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.2, 0.22), M.whiteStucco, n);
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) den.setMatrixAt(i, m.compose(v.set(x - w / 2 + 0.21 + i * 0.42, y - 0.29, z + d - 0.32), q, s));
  den.castShadow = true;
  parent.add(den);
}

// Dark grid-pane windows (steel frames), as flat panels set just proud of the wall.
function gridWindows(M, spots, w, h, z, parent, frame = M.whiteStucco) {
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(w, h), M.gridWindow, spots.length);
  const surround = new THREE.InstancedMesh(metricBox(w + 0.3, h + 0.3, 0.08), frame, spots.length);
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), m = new THREE.Matrix4();
  spots.forEach(([x, y], i) => {
    im.setMatrixAt(i, m.compose(v.set(x, y, z + 0.07), q, s));
    surround.setMatrixAt(i, m.compose(v.set(x, y, z + 0.02), q, s));
  });
  surround.castShadow = true;
  parent.add(surround, im);
}

function pediment(M, w, h, x, y, z, parent) {
  const tri = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.8, bevelEnabled: false }), M.whiteStucco);
  m.position.set(x, y, z - 0.8);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  // raking cornices along both slopes
  const slope = Math.hypot(w / 2, h);
  for (const sx of [-1, 1]) {
    const r = mesh(metricBox(slope + 0.5, 0.35, 1.1), M.whiteStucco, x + sx * w / 4, y + h / 2 + 0.12, z - 0.3, parent);
    r.rotation.z = -sx * Math.atan2(h, w / 2);
  }
  return m;
}

function column(M, x, z, h, parent) {
  mesh(metricBox(1.15, 0.5, 1.15), M.whiteStucco, x, FLOOR + 0.25, z, parent);
  mesh(new THREE.CylinderGeometry(0.4, 0.46, h - 1.0, 24), M.whiteStucco, x, FLOOR + 0.5 + (h - 1.0) / 2, z, parent);
  mesh(new THREE.CylinderGeometry(0.58, 0.42, 0.28, 24), M.whiteStucco, x, FLOOR + h - 0.36, z, parent);
  mesh(metricBox(1.2, 0.22, 1.2), M.whiteStucco, x, FLOOR + h - 0.11, z, parent);
}

function schoolCampus(M, ctx, { heroes, sides }) {
  const { g } = ctx;
  ctx.footprint = 30;
  deck(g, M.whiteStucco, M.turf);
  layout(ctx, {
    heroes, sides, card: true,
    backWall: () => {},
    sideWall: null,
  });
  const b = new THREE.Group();
  g.add(b);
  const Z = -5.3;                  // front face of the main block (the hero hangs on it)
  const W = 17, D = 8;             // main block
  const G = 9, FH = 3.7;           // tall ground floor (portico), then three storeys
  const top = FLOOR + G + 3 * FH;  // 20.7 above the deck

  mesh(metricBox(46, 2.6, D + 3), M.paving, 0, FLOOR - 1.3, Z - D / 2, b);
  // ---- main block
  mesh(metricBox(W, top - FLOOR, D), M.whiteStucco, 0, (FLOOR + top) / 2, Z - D / 2, b);
  // pilasters framing three window bays on the upper floors
  for (const x of [-7.9, -2.75, 2.75, 7.9]) mesh(metricBox(0.75, 3 * FH, 0.35), M.whiteStucco, x, FLOOR + G + 1.5 * FH, Z + 0.15, b);
  for (let f = 0; f < 3; f++) cornice(M, W + 0.6, 0, FLOOR + G + f * FH, Z, b);
  cornice(M, W + 1, 0, top, Z, b, 0.95);
  const win = [];
  for (let f = 0; f < 3; f++) for (const x of [-5.3, 0, 5.3]) win.push([x, FLOOR + G + f * FH + 1.95]);
  gridWindows(M, win, 2.7, 2.2, Z + 0.1, b);
  // AC units beside some windows (as on the real building)
  for (const [x, y] of [[-6.9, 1], [6.9, 0], [-6.9, 2], [1.9, 1]]) mesh(metricBox(0.9, 0.55, 0.35), M.whiteStucco, x, FLOOR + G + y * FH + 0.9, Z + 0.25, b);
  // the great pediment with its round oculus
  pediment(M, W + 0.4, 4.2, 0, top + 0.2, Z + 0.05, b);
  const ring = mesh(new THREE.TorusGeometry(0.75, 0.13, 10, 36), M.whiteStucco, 0, top + 1.75, Z + 0.15, b);
  ring.castShadow = false;
  mesh(new THREE.CircleGeometry(0.62, 32), M.shadowStucco, 0, top + 1.75, Z + 0.08, b);

  // ---- ground-floor portico: paired round columns either side of the hero, entablature, sign
  const PZ = Z + 1.5;
  // inner pair just clear of the hero frame, outer pair beyond the notice boards' path
  for (const x of [-8.3, -5.95, 5.95, 8.3]) column(M, x, PZ, G - 0.9, b);
  mesh(metricBox(W + 0.4, 0.9, 2.3), M.whiteStucco, 0, FLOOR + G - 0.45, Z + 0.95, b);
  cornice(M, W + 0.8, 0, FLOOR + G + 0.05, Z + 1.4, b, 0.7);
  const sign = mesh(new THREE.PlaneGeometry(10.4, 0.72), new THREE.MeshStandardMaterial({
    map: nameTexture('CITY MONTESSORI SCHOOL · MAHANAGAR CAMPUS', '#1f3f9f', '#ffffff'),
    emissive: '#ffffff', emissiveIntensity: 0.12, roughness: 0.5,
  }), 0, FLOOR + G - 0.45, Z + 2.11, b);
  sign.castShadow = false;
  const logo = mesh(new THREE.PlaneGeometry(0.72, 0.6), new THREE.MeshStandardMaterial({ map: nameTexture('CMS', '#ffffff', '#1f3f9f'), roughness: 0.5 }), 5.75, FLOOR + G - 0.45, Z + 2.12, b);
  logo.castShadow = false;

  // ---- wings: lower, set back, a balcony band at every floor, a small pediment at the far end
  const WG = 4.2, WF = 3.4, wTop = FLOOR + WG + 3 * WF;
  for (const sx of [-1, 1]) {
    const x0 = sx * (W / 2), len = 13, cx = x0 + sx * len / 2, wz = Z - 1.6;
    mesh(metricBox(len, wTop - FLOOR, D - 1.6), M.whiteStucco, cx, (FLOOR + wTop) / 2, wz - (D - 1.6) / 2, b);
    const spots = [];
    for (let f = 0; f < 4; f++) {
      const y = FLOOR + (f ? WG + (f - 1) * WF : 0);
      for (let i = 0; i < 5; i++) spots.push([x0 + sx * (1.5 + i * 2.5), y + (f ? 1.75 : 2.2)]);
      if (f) {
        // balcony slab with a solid white parapet
        mesh(metricBox(len, 0.25, 1.3), M.whiteStucco, cx, y, wz + 0.6, b);
        mesh(metricBox(len, 0.95, 0.15), M.whiteStucco, cx, y + 0.6, wz + 1.2, b);
      }
    }
    gridWindows(M, spots, 1.5, 1.8, wz, b);
    cornice(M, len + 0.4, cx, wTop, wz, b);
    pediment(M, 5.6, 1.9, x0 + sx * (len - 3.4), wTop + 0.2, wz + 0.05, b);
  }

  // ---- grounds: rows of red flower pots on the turf, and a clipped round tree
  const pots = [];
  for (let x = -7.6; x <= 7.6; x += 0.95) if (Math.abs(x) > 3.9) pots.push([x, 4.6]);
  for (let z = 2; z <= 3.8; z += 0.9) pots.push([-7.7, z], [7.7, z]);
  const potGeo = new THREE.CylinderGeometry(0.28, 0.2, 0.45, 14);
  const plantGeo = new THREE.SphereGeometry(0.34, 10, 8);
  const potMesh = new THREE.InstancedMesh(potGeo, M.redPot, pots.length);
  const plantMesh = new THREE.InstancedMesh(plantGeo, M.potPlant, pots.length);
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), m = new THREE.Matrix4();
  const r = rng(5);
  pots.forEach(([x, z], i) => {
    potMesh.setMatrixAt(i, m.compose(v.set(x, FLOOR + 0.22, z), q, s.set(1, 1, 1)));
    const k = 0.8 + r() * 0.6;
    plantMesh.setMatrixAt(i, m.compose(v.set(x, FLOOR + 0.62 + k * 0.15, z), q, s.set(k, k * (1 + r() * 0.6), k)));
  });
  potMesh.castShadow = plantMesh.castShadow = true;
  g.add(potMesh, plantMesh);
  mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.2, 8), M.darkTimber, -11.5, 1.1, 1.5, g);
  mesh(new THREE.SphereGeometry(2.1, 20, 14), M.potPlant, -11.5, 3.6, 1.5, g).scale.set(1, 0.85, 1);

  // ---- fairy lights hanging in strands from the first-floor cornice, clear of the hero image
  const lights = [];
  for (let x = -W / 2 - 12; x <= W / 2 + 12; x += 1.15) {
    const inMain = Math.abs(x) < W / 2;
    const yTop = inMain ? FLOOR + G + FH - 0.3 : FLOOR + WG + WF - 0.3;
    const yBot = Math.abs(x) < 8.6 ? FLOOR + G + 0.3 : FLOOR + 1.2;
    const z = inMain ? Z + 0.55 : Z - 1.6 + 1.4;
    for (let y = yTop; y > yBot; y -= 0.55) lights.push(new THREE.Vector3(x + Math.sin(y * 3 + x) * 0.05, y, z));
  }
  fairyTex ??= glowTexture();
  const fairy = halos(lights, fairyTex, 0.55, '#fff0c8');
  g.add(fairy);
  ctx.anim.push((t, active) => { fairy.material.opacity = (0.55 + active * 0.4) * (0.85 + 0.15 * Math.sin(t * 5.3)); });

  ctx.lights.push(strip(40, 0, FLOOR + 0.06, Z + 0.1, b));
}
let fairyTex = null;


// ---------- 02 IIT Kharagpur Main Building (from photo): a white modernist block whose recessed centre
// bay is ribbed with tall square fins over brown spandrels, framed by two piers each carrying a brown
// strip of stacked windows; the institute's name in bronze letters along the top band; a salmon
// porte-cochère on square columns ("Dedicated to the service of the Nation") with planters on its roof;
// behind, a stepped block and a plain white tower under an overhanging cap; long lower white wings with
// brown-framed windows and sunshades; box hedges and a lamp post out front.
function iitMainBuilding(M, ctx, { heroes, sides }) {
  const { g } = ctx;
  ctx.footprint = 30;
  deck(g, M.whiteStucco, M.paving);
  layout(ctx, {
    heroes, sides, card: true,
    backWall: () => {},
    sideWall: null,
  });
  const b = new THREE.Group();
  g.add(b);
  const Z = -5.3;                    // front face of the piers (the hero hangs just in front)
  const W = 17, D = 10, BZ = Z - 1.2; // block width and depth; the centre bay is recessed
  const C = FLOOR + 9, FH = 3.6;     // porte-cochère roof, then three storeys of fins
  const fas = C + 3 * FH, top = fas + 2.3;

  mesh(metricBox(48, 2.6, D + 3), M.paving, 0, FLOOR - 1.3, Z - D / 2, b);
  // ---- main block, its recessed bay and the two framing piers
  mesh(metricBox(W, top - FLOOR, D), M.whiteStucco, 0, (FLOOR + top) / 2, BZ - D / 2, b);
  for (const sx of [-1, 1]) {
    const px = sx * 7;
    mesh(metricBox(3, top - FLOOR, 1.2), M.whiteStucco, px, (FLOOR + top) / 2, Z - 0.6, b);
    // brown frame strip with four windows stacked between white panels
    mesh(metricBox(1.5, fas - C + 0.4, 0.12), M.teak, px, (C + fas) / 2, Z + 0.06, b);
    const spots = [];
    for (let f = 0; f < 4; f++) spots.push([px, C + 0.25 + f * (3 * FH / 4) + 1.15]);
    gridWindows(M, spots, 1.1, 1.5, Z + 0.06, b, M.teak);
    for (let f = 0; f < 4; f++) mesh(metricBox(1.2, 0.75, 0.1), M.whiteStucco, px, C + 0.25 + f * (3 * FH / 4) + 0.2, Z + 0.15, b);
  }
  // in the bay: a brown spandrel and a row of windows per storey, then six full-height fins
  const bay = [];
  for (let f = 0; f < 3; f++) {
    const y = C + f * FH;
    mesh(metricBox(10.8, 1.0, 0.1), M.teak, 0, y + 0.5, BZ + 0.05, b);
    for (let i = 0; i < 5; i++) bay.push([-4.4 + i * 2.2, y + 2.25]);
  }
  gridWindows(M, bay, 1.3, 2.2, BZ, b, M.teak);
  for (let i = 0; i < 6; i++) mesh(metricBox(0.7, fas - C, 1.0), M.whiteStucco, -5.5 + i * 2.2, (C + fas) / 2, BZ + 0.5, b);
  // the top band with the institute's name
  mesh(metricBox(W + 0.4, top - fas, 1.6), M.whiteStucco, 0, (fas + top) / 2, Z - 0.5, b);
  mesh(metricBox(W + 0.6, 0.3, D + 0.6), M.whiteStucco, 0, top + 0.15, BZ - D / 2 + 0.3, b);
  const name = mesh(new THREE.PlaneGeometry(13.6, 1.25), new THREE.MeshStandardMaterial({
    map: nameTexture('INDIAN INSTITUTE OF TECHNOLOGY', '#f6f3ee', '#4a3a2c'), roughness: 0.6,
  }), 0, (fas + top) / 2, Z + 0.31, b);
  name.castShadow = false;

  // ---- porte-cochère: salmon canopy on square columns, inscription, planters on the roof
  const PZ = Z + 1.6;
  for (const x of [-8.3, -5.95, 5.95, 8.3]) {
    mesh(metricBox(0.85, C - FLOOR - 1.1, 0.85), M.salmon, x, FLOOR + (C - FLOOR - 1.1) / 2, PZ, b);
  }
  mesh(metricBox(W + 1, 1.1, 3.4), M.salmon, 0, C - 0.55, Z + 0.4, b);
  mesh(metricBox(W + 1.2, 0.2, 3.6), M.whiteStucco, 0, C + 0.1, Z + 0.4, b);
  const motto = mesh(new THREE.PlaneGeometry(8.4, 0.7), new THREE.MeshStandardMaterial({
    map: nameTexture('DEDICATED TO THE SERVICE OF THE NATION', '#f2ebe0', '#5a2c1c'), roughness: 0.6,
  }), 0, C - 0.55, Z + 2.11, b);
  motto.castShadow = false;
  const plants = [];
  for (let x = -8.6; x <= 8.6; x += 0.7) plants.push([x, C + 0.45, Z + 1.8]);
  const shrubs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 10, 8), M.potPlant, plants.length);
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), m = new THREE.Matrix4();
  const r = rng(11);
  plants.forEach(([x, y, z], i) => { const k = 0.8 + r() * 0.5; shrubs.setMatrixAt(i, m.compose(v.set(x, y, z), q, s.set(k, k * 1.2, k))); });
  b.add(shrubs);

  // ---- the stepped block and the tower, set a little left of centre as on the real building
  const tx = -2.4, by = top + 0.3;
  mesh(metricBox(6.4, 4.6, 5), M.whiteStucco, tx, by + 2.3, BZ - 4, b);
  mesh(metricBox(7, 0.3, 5.6), M.whiteStucco, tx, by + 4.75, BZ - 4, b);
  gridWindows(M, [[tx - 1.6, by + 1.3], [tx - 1.6, by + 3.4]], 1.2, 1.0, BZ - 1.5, b, M.teak);
  const tH = 13, tz = BZ - 5;
  mesh(metricBox(3.8, tH, 3.8), M.whiteStucco, tx + 0.6, by + tH / 2, tz, b);
  mesh(metricBox(4.8, 0.45, 4.8), M.whiteStucco, tx + 0.6, by + tH + 0.22, tz, b);
  mesh(metricBox(3.2, 1.3, 3.2), M.whiteStucco, tx + 0.6, by + tH + 1.1, tz, b);
  mesh(metricBox(4.0, 0.3, 4.0), M.whiteStucco, tx + 0.6, by + tH + 1.9, tz, b);
  // railing posts around the cap's ledge
  for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) {
    const a = -2.2 + k * 0.88, [px, pz] = [[a, 2.25], [a, -2.25], [2.25, a], [-2.25, a]][i];
    mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), M.brushed, tx + 0.6 + px, by + tH + 0.75, tz + pz, b);
  }
  // two thin antenna masts on the roof
  mesh(new THREE.CylinderGeometry(0.05, 0.07, 6, 6), M.brushed, -7, top + 3.2, BZ - 3, b);
  mesh(new THREE.CylinderGeometry(0.05, 0.07, 7, 6), M.brushed, 6.6, top + 3.7, BZ - 2, b);
  // a warm lamp in the tower cap, lit at dusk
  const lamp = mesh(new THREE.SphereGeometry(0.3, 12, 10), M.lamp, tx + 0.6, by + tH + 1.1, tz + 1.65, b);
  lamp.castShadow = false;

  // ---- wings: three storeys, brown-framed windows under thin sunshade slabs
  const WF = 3.4, wTop = FLOOR + 3 * WF;
  for (const sx of [-1, 1]) {
    const x0 = sx * (W / 2), len = 14, cx = x0 + sx * len / 2, wz = Z - 2.4;
    mesh(metricBox(len, wTop - FLOOR, D - 2), M.whiteStucco, cx, (FLOOR + wTop) / 2, wz - (D - 2) / 2, b);
    const spots = [];
    for (let f = 0; f < 3; f++) {
      const y = FLOOR + f * WF;
      for (let i = 0; i < 5; i++) spots.push([x0 + sx * (1.6 + i * 2.6), y + 1.7]);
      mesh(metricBox(len, 0.15, 0.8), M.whiteStucco, cx, y + 2.95, wz + 0.4, b);
    }
    gridWindows(M, spots, 1.7, 1.8, wz, b, M.teak);
    mesh(metricBox(len + 0.3, 0.6, D - 1.6), M.whiteStucco, cx, wTop + 0.3, wz - (D - 2) / 2, b);
    // a clipped hedge along the wing front
    mesh(metricBox(len - 1, 1.0, 1.1), M.potPlant, cx + sx * 0.5, FLOOR + 0.5, wz + 2.2, b);
  }
  // box hedges in front of the porte-cochère and a lamp post
  for (const sx of [-1, 1]) mesh(metricBox(2.4, 0.8, 1.0), M.potPlant, sx * 7.15, FLOOR + 0.4, 3.6, g);
  mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.5, 8), M.brushed, 10.8, FLOOR + 2.75, 2.5, g);
  const globe = mesh(new THREE.SphereGeometry(0.35, 14, 10), M.lamp, 10.8, FLOOR + 5.7, 2.5, g);
  globe.castShadow = false;

  ctx.lights.push(strip(40, 0, FLOOR + 0.06, Z + 0.1, b));
}

// ---------- Internships (stops 03-05). Each company gets a building in its own colours, its logo as
// the sign, and the CV's pointers turned into objects around it.

// A company logo (a square card from assets/img/logo-*.jpg) as a lit sign.
function logoSign(tex, size, x, y, z, parent, frameMat) {
  const t = tex.clone();
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  const face = mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: '#e6e6e6' }), x, y, z + 0.08, parent);
  face.castShadow = false;
  if (frameMat) mesh(metricBox(size + 0.4, size + 0.4, 0.14), frameMat, x, y, z, parent);
  return face;
}

// A delivery scooter with an insulated box on the back.
function scooter(M, boxMat, x, z, rot, parent) {
  const s = new THREE.Group();
  for (const dx of [-0.6, 0.6]) {
    const w = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 18), M.dark, dx, 0.3, 0, s);
    w.rotation.x = Math.PI / 2;
  }
  mesh(metricBox(1.1, 0.28, 0.42), M.steel, 0, 0.55, 0, s);
  mesh(metricBox(0.5, 0.16, 0.36), M.dark, -0.15, 0.82, 0, s);
  mesh(metricBox(0.12, 0.9, 0.12), M.steel, 0.55, 0.85, 0, s).rotation.z = -0.25;
  mesh(metricBox(0.08, 0.08, 0.7), M.dark, 0.66, 1.3, 0, s);
  mesh(metricBox(0.62, 0.6, 0.6), boxMat, -0.5, 1.2, 0, s);
  s.position.set(x, FLOOR, z);
  s.rotation.y = rot;
  parent.add(s);
  return s;
}

// ---------- 03 Zepto: a purple quick-commerce dark store with the logo lit on its roof, loading
// shutters under a pink awning, delivery scooters and crates of groceries out front; a staircase of
// falling bids (the reverse auctions behind the INR 6 Cr+ saving), data packets running along a
// pipeline across the facade (Databricks to Superset), and a CFO dashboard whose bars rise weekly.
function zeptoStore(M, ctx, { heroes, sides, logo }) {
  const { g } = ctx;
  const PINK = '#ff3f7a', ORANGE = '#ff8a4c';
  const purple = new THREE.MeshStandardMaterial({ color: '#4a0f7a', roughness: 0.55, metalness: 0.15 });
  const deepPurple = new THREE.MeshStandardMaterial({ color: '#2c0650', roughness: 0.6 });
  const pinkBox = new THREE.MeshStandardMaterial({ color: '#f2457a', roughness: 0.45, emissive: PINK, emissiveIntensity: 0.15 });
  ctx.footprint = 24;
  deck(g, deepPurple, M.slab);
  // his Zepto board: the centre banner on the facade, its two side panels on taller side walls
  layout(ctx, {
    heroes, sides,
    fit: { hero: [10.4, 7.4], side: [5.6, 7.0] },
    backWall: () => {},
    sideWall: (pivot) => {
      mesh(metricBox(0.4, 7.8, 7.6), purple, 0, FLOOR + 3.9, 3.8, pivot);
      glowBox(0.46, 0.1, 7.7, led(ctx, PINK), 0, FLOOR + 7.85, 3.8, pivot);
    },
  });
  const b = new THREE.Group();
  g.add(b);
  const Z = -5.3, W = 24, H = 10.5, D = 9, top = FLOOR + H;
  mesh(metricBox(36, 2.6, D + 3), M.paving, 0, FLOOR - 1.3, Z - D / 2, b);
  mesh(metricBox(W, H, D), purple, 0, FLOOR + H / 2, Z - D / 2, b);
  mesh(metricBox(W + 0.4, 0.5, D + 0.4), deepPurple, 0, top + 0.25, Z - D / 2, b);
  // loading bays either side of the hero, under a lit pink awning
  for (const sx of [-1, 1]) {
    for (const x of [8.2, 10.7]) {
      const sh = mesh(metricBox(2.1, 3.6, 0.12), M.brushed, sx * x, FLOOR + 1.8, Z + 0.06, b);
      sh.castShadow = false;
      for (let y = 0.3; y < 3.6; y += 0.3) mesh(metricBox(2.1, 0.03, 0.04), M.dark, sx * x, FLOOR + y, Z + 0.13, b);
    }
    mesh(metricBox(5.6, 0.18, 1.6), deepPurple, sx * 9.45, FLOOR + 4.1, Z + 0.8, b);
    glowBox(5.6, 0.08, 0.08, led(ctx, PINK), sx * 9.45, FLOOR + 4.0, Z + 1.6, b);
  }
  // the pipeline: a lit tube across the upper facade, data packets streaming along it
  const pipeMat = led(ctx, '#8a4dff');
  const pipe = mesh(new THREE.CylinderGeometry(0.16, 0.16, W - 1, 12), pipeMat, 0, FLOOR + 8.6, Z + 0.35, b);
  pipe.rotation.z = Math.PI / 2;
  pipe.castShadow = false;
  for (const [x, label] of [[-8.5, 'DATABRICKS'], [8.5, 'SUPERSET']]) {
    const node = mesh(metricBox(3.2, 0.9, 0.5), deepPurple, x, FLOOR + 8.6, Z + 0.4, b);
    node.castShadow = false;
    mesh(new THREE.PlaneGeometry(2.9, 0.42), new THREE.MeshBasicMaterial({ map: nameTexture(label, '#2c0650', '#ffd1e0'), toneMapped: false }), x, FLOOR + 8.6, Z + 0.66, b);
  }
  const packetMat = holo(ORANGE, 0.95);
  const packets = [];
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), packetMat);
    b.add(p);
    packets.push(p);
  }
  // logo sign on the roof, on two posts
  for (const x of [-2.6, 2.6]) mesh(metricBox(0.25, 2.2, 0.25), M.dark, x, top + 1.6, Z - 1.2, b);
  if (logo) logoSign(logo, 6.4, 0, top + 4.6, Z - 1.1, b, deepPurple);
  // reverse auction: bids stepping down, each a lit bar from pink to orange
  const bars = [];
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Color(PINK).lerp(new THREE.Color(ORANGE), i / 7);
    const m = led(ctx, '#' + c.getHexString());
    const h = 4.2 - i * 0.42;
    bars.push(glowBox(0.75, h, 0.75, m, 4.8 + i * 0.95, top + 0.5 + h / 2, Z - 2.4, b));
  }
  mesh(new THREE.PlaneGeometry(5.2, 0.62), new THREE.MeshBasicMaterial({ map: nameTexture('INR 6 CR+ SAVED', '#2c0650', '#ffd1e0'), toneMapped: false }), 8.1, top + 5.4, Z - 2.4, b);
  // CFO dashboard on the roof: weekly hard + soft savings, rising as the stop lights up
  mesh(metricBox(6.2, 4, 0.3), M.gunmetal, -8, top + 2.6, Z - 2.4, b);
  for (const x of [-10.4, -5.6]) mesh(metricBox(0.2, 0.8, 0.2), M.dark, x, top + 0.6, Z - 2.4, b);
  const weekly = [];
  for (let i = 0; i < 6; i++) {
    const m = led(ctx, i % 2 ? ORANGE : PINK);
    const bar = glowBox(0.55, 1, 0.1, m, -10.3 + i * 0.92, top + 1.0, Z - 2.2, b);
    bar.userData.h = 0.8 + i * 0.45;
    weekly.push(bar);
  }
  // scooters waiting to go out, and crates of groceries on pallets
  scooter(M, pinkBox, -12.5, 0.6, 0.5, g);
  scooter(M, pinkBox, -12.2, 2.4, 0.35, g);
  scooter(M, pinkBox, -10.4, -1.5, 0.8, g);
  const crateCols = ['#f2c14e', '#7bc950', '#ff8a4c', '#e84a5f', '#5bc0eb'];
  const r = rng(21);
  for (const [cx, cz] of [[11.2, 0.4], [12.6, 2.4]]) {
    mesh(metricBox(1.8, 0.18, 1.4), M.timber, cx, FLOOR + 0.09, cz, g);
    for (let k = 0; k < 6; k++) {
      const mat = new THREE.MeshStandardMaterial({ color: crateCols[Math.floor(r() * crateCols.length)], roughness: 0.6 });
      mesh(metricBox(0.8, 0.5, 0.6), mat, cx - 0.42 + (k % 2) * 0.84, FLOOR + 0.43 + Math.floor(k / 2) * 0.52, cz, g);
    }
  }
  ctx.anim.push((t, active) => {
    packets.forEach((p, i) => {
      const u = ((t * 0.18 + i / packets.length) % 1);
      p.position.set(-W / 2 + 0.5 + u * (W - 1), FLOOR + 8.6, Z + 0.35);
      p.scale.setScalar(0.6 + active * 0.6);
    });
    packetMat.opacity = 0.4 + active * 0.55;
    weekly.forEach((bar) => {
      const h = 0.15 + bar.userData.h * (0.25 + 0.75 * active) * (1 + 0.05 * Math.sin(t * 2 + bar.position.x));
      bar.scale.y = h;
      bar.position.y = top + 1.0 + h / 2;
    });
    bars.forEach((bar, i) => { bar.scale.x = bar.scale.z = 1 + 0.08 * Math.sin(t * 3 - i * 0.6) * active; });
  });
  ctx.lights.push(strip(30, 0, FLOOR + 0.06, Z + 0.1, b));
}

// ---------- 04 ixana.ai: a black glass tower ribbed with white mullions, the logo near the top and the
// figure from the logo's X standing on the roof; two ring gauges on the facade (90% less RCA time,
// 50% faster procurement); and above it a live automation graph: six workflow nodes around an n8n
// core, wired to seven API satellites.
function ixanaTower(M, ctx, { heroes, sides, logo }) {
  const { g } = ctx;
  const ICE = '#9fdcff', WHITE = '#f4f7fb';
  const black = new THREE.MeshStandardMaterial({ color: '#111317', roughness: 0.18, metalness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: '#f1f3f6', roughness: 0.35, metalness: 0.2 });
  ctx.footprint = 24;
  deck(g, M.gunmetal, M.slab);
  // his ixana board: the centre banner under the mullions, its two side panels on taller side walls
  layout(ctx, {
    heroes, sides,
    fit: { hero: [10.4, 7.0], side: [5.6, 7.0] },
    backWall: () => {},
    sideWall: (pivot) => {
      mesh(metricBox(0.4, 7.8, 7.6), black, 0, FLOOR + 3.9, 3.8, pivot);
      glowBox(0.46, 7.8, 0.08, led(ctx, ICE), 0, FLOOR + 3.9, 7.62, pivot);
    },
  });
  const b = new THREE.Group();
  g.add(b);
  const Z = -5.3, W = 20, H = 17, D = 10, top = FLOOR + H;
  mesh(metricBox(34, 2.6, D + 3), M.slab, 0, FLOOR - 1.3, Z - D / 2, b);
  mesh(metricBox(W, H, D), black, 0, FLOOR + H / 2, Z - D / 2, b);
  // white mullions above the hero, white floor bands, a lit crown
  for (let x = -W / 2 + 0.6; x <= W / 2 - 0.5; x += 1.6) {
    const low = Math.abs(x) < 6.2 ? FLOOR + 8 : FLOOR;
    mesh(metricBox(0.14, top - low, 0.25), white, x, (top + low) / 2, Z + 0.1, b);
  }
  for (let y = FLOOR + 8.4; y < top; y += 2.9) mesh(metricBox(W + 0.2, 0.18, 0.4), white, 0, y, Z + 0.15, b);
  glowBox(W + 0.3, 0.14, D + 0.3, led(ctx, ICE), 0, top + 0.07, Z - D / 2, b);
  if (logo) logoSign(logo, 4.6, 0, top - 2.9, Z + 0.3, b, white);
  // the figure in the logo's X: two crossed white strokes and a head
  const fig = new THREE.Group();
  for (const s of [-1, 1]) {
    const stroke = mesh(metricBox(0.55, 6.2, 0.55), white, 0, 3.1, 0, fig);
    stroke.rotation.z = s * 0.52;
  }
  mesh(new THREE.SphereGeometry(0.62, 20, 16), white, 0, 7.2, 0, fig);
  fig.position.set(-6.5, top, Z - 3);
  b.add(fig);
  // ring gauges flanking the upper facade
  const gauges = [];
  for (const [x, frac, label] of [[-6.6, 0.9, '90% LESS RCA TIME'], [6.6, 0.5, '50% FASTER PROCUREMENT']]) {
    mesh(new THREE.TorusGeometry(1.6, 0.16, 10, 64), M.gunmetal, x, FLOOR + 11.6, Z + 0.45, b);
    const arcMat = led(ctx, ICE);
    const arc = mesh(new THREE.TorusGeometry(1.6, 0.2, 10, 64, Math.PI * 2 * frac), arcMat, x, FLOOR + 11.6, Z + 0.55, b);
    arc.rotation.z = Math.PI / 2;
    arc.castShadow = false;
    gauges.push(arc);
    mesh(new THREE.PlaneGeometry(4.6, 0.42), new THREE.MeshBasicMaterial({ map: nameTexture(label, '#111317', '#dff3ff'), toneMapped: false }), x, FLOOR + 9.4, Z + 0.4, b);
  }
  // the automation graph: n8n core, six workflow nodes, seven API satellites
  const graph = new THREE.Group();
  graph.position.set(3, top + 6.5, Z - 3);
  b.add(graph);
  const coreMat = holo(ICE, 0.6);
  graph.add(new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), coreMat));
  const nodeMat = holo(WHITE, 0.9);
  const apiMat = holo('#b48cff', 0.9);
  const lineMat = new THREE.LineBasicMaterial({ color: ICE, transparent: true, opacity: 0.5, toneMapped: false, blending: THREE.AdditiveBlending });
  const nodes = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Vector3(Math.cos(a) * 3.4, Math.sin(a) * 1.2, Math.sin(a) * 3.4);
    const n = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.55), nodeMat);
    n.position.copy(p);
    graph.add(n, new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), p]), lineMat));
    nodes.push(p);
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    const q = new THREE.Vector3(Math.cos(a) * 5.6, 1.6 * Math.sin(a * 2), Math.sin(a) * 5.6);
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), apiMat);
    s.position.copy(q);
    const near = nodes.reduce((best, p) => (p.distanceTo(q) < best.distanceTo(q) ? p : best));
    graph.add(s, new THREE.Line(new THREE.BufferGeometry().setFromPoints([near, q]), lineMat));
  }
  ctx.anim.push((t, active) => {
    graph.rotation.y = t * 0.25;
    const k = 0.45 + active * 0.55;
    coreMat.opacity = 0.6 * k;
    nodeMat.opacity = 0.9 * k;
    apiMat.opacity = 0.9 * k;
    lineMat.opacity = 0.5 * k;
    gauges.forEach((arc, i) => { arc.scale.setScalar(1 + 0.03 * Math.sin(t * 2.2 + i)); });
    fig.rotation.y = Math.sin(t * 0.4) * 0.3;
  });
  ctx.lights.push(strip(30, 0, FLOOR + 0.06, Z + 0.1, b));
}

// ---------- 05 360 Realtors: two magenta-glass residential towers over a white podium carrying the
// logo; a 360° ring circling the tall tower; the key from the logo, giant, on a plinth; and a village
// map table of plots with map pins dropping onto their centroids (the Google Maps plotting platform).
function realtorsTowers(M, ctx, { heroes, sides, logo }) {
  const { g } = ctx;
  const MAG = '#e0288f';
  const glassMat = new THREE.MeshStandardMaterial({ color: '#6a2a6e', roughness: 0.12, metalness: 0.75, emissive: '#3a0c3c', emissiveIntensity: 0.35 });
  const keyMat = new THREE.MeshStandardMaterial({ color: '#c41f82', roughness: 0.3, metalness: 0.7 });
  ctx.footprint = 26;
  deck(g, M.whiteStucco, M.paving);
  // his 360 Realtors board: the centre banner on the podium, its two side panels on taller side walls
  layout(ctx, {
    heroes, sides,
    fit: { hero: [10.4, 7.8], side: [5.6, 7.0] },
    backWall: () => {},
    sideWall: (pivot) => {
      mesh(metricBox(0.4, 7.8, 7.6), M.whiteStucco, 0, FLOOR + 3.9, 3.8, pivot);
      glowBox(0.46, 0.1, 7.7, led(ctx, MAG), 0, FLOOR + 7.85, 3.8, pivot);
    },
  });
  const b = new THREE.Group();
  g.add(b);
  const Z = -5.3, PH = 9;
  mesh(metricBox(36, 2.6, 13), M.paving, 0, FLOOR - 1.3, Z - 5.5, b);
  // podium
  mesh(metricBox(22, PH, 8), M.whiteStucco, 0, FLOOR + PH / 2, Z - 4, b);
  mesh(metricBox(22.4, 0.4, 8.4), M.whiteStucco, 0, FLOOR + PH + 0.2, Z - 4, b);
  glowBox(22.4, 0.1, 0.1, led(ctx, MAG), 0, FLOOR + PH, Z + 0.22, b);
  if (logo) logoSign(logo, 5.2, 0, FLOOR + PH + 3.2, Z - 1, b, M.whiteStucco);
  for (const x of [-1.8, 1.8]) mesh(metricBox(0.22, 1.2, 0.22), M.dark, x, FLOOR + PH + 0.6, Z - 1.1, b);
  // two towers: glass shafts with white slab edges at every floor
  const towers = [[-7, 24, 6], [7.5, 18, 5.4]];
  for (const [x, h, w] of towers) {
    const y0 = FLOOR + PH + 0.4;
    mesh(metricBox(w, h, w), glassMat, x, y0 + h / 2, Z - 5, b);
    for (let y = y0 + 3; y < y0 + h; y += 3) mesh(metricBox(w + 0.5, 0.25, w + 0.5), M.whiteStucco, x, y, Z - 5, b);
    mesh(metricBox(w + 0.6, 0.5, w + 0.6), M.whiteStucco, x, y0 + h + 0.25, Z - 5, b);
  }
  // the 360° ring round the tall tower, with lights running round it
  const halo = new THREE.Group();
  halo.position.set(-7, FLOOR + PH + 15, Z - 5);
  b.add(halo);
  const ringMat = led(ctx, MAG);
  const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.16, 10, 96), ringMat);
  ringMesh.rotation.x = Math.PI / 2;
  halo.add(ringMesh);
  const dotMat = holo('#ffd1ec', 0.95);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), dotMat);
    d.position.set(Math.cos(a) * 5.6, 0, Math.sin(a) * 5.6);
    halo.add(d);
  }
  // the key from the logo: bow, shaft and teeth, on a plinth beside the deck
  const key = new THREE.Group();
  const bow = mesh(new THREE.TorusGeometry(1.1, 0.32, 14, 40), keyMat, 0, 0, 0, key);
  bow.castShadow = true;
  mesh(metricBox(4.2, 0.42, 0.42), keyMat, 3.2, 0, 0, key);
  for (const [x, h] of [[4.6, 0.9], [3.9, 0.6]]) mesh(metricBox(0.36, h, 0.42), keyMat, x, -h / 2 - 0.1, 0, key);
  key.position.set(10.6, FLOOR + 3.4, 0.6);
  key.rotation.set(0, -0.6, 0.55);
  g.add(key);
  mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.3, 20), M.whiteStucco, 10.6, FLOOR + 1.15, 0.6, g);
  mesh(metricBox(2, 0.3, 2), M.whiteStucco, 10.6, FLOOR + 0.15, 0.6, g);
  // village map table: plots with pins on their centroids
  const table = new THREE.Group();
  table.position.set(-11.6, FLOOR, 1.2);
  table.rotation.y = 0.35;
  g.add(table);
  mesh(metricBox(4.6, 0.9, 3.4), M.whiteStucco, 0, 0.45, 0, table);
  const r = rng(9);
  const pins = [];
  const pinMat = new THREE.MeshStandardMaterial({ color: MAG, emissive: MAG, emissiveIntensity: 0.6, roughness: 0.4 });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    const w = 0.62 + r() * 0.1, d = 0.66 + r() * 0.1;
    const hot = r() < 0.3;
    const plot = new THREE.MeshStandardMaterial({ color: hot ? '#d94a9e' : ['#c9d8b6', '#b9cba2', '#d8d1b2'][Math.floor(r() * 3)], roughness: 0.9 });
    const px = -1.9 + i * 0.76, pz = -1.25 + j * 0.83;
    mesh(metricBox(w, 0.05, d), plot, px, 0.93, pz, table);
    if (hot) {
      const pin = new THREE.Group();
      mesh(new THREE.ConeGeometry(0.1, 0.32, 10).rotateX(Math.PI), pinMat, 0, 0.16, 0, pin);
      mesh(new THREE.SphereGeometry(0.13, 12, 10), pinMat, 0, 0.36, 0, pin);
      pin.position.set(px, 0.96, pz);
      table.add(pin);
      pins.push(pin);
    }
  }
  ctx.anim.push((t, active) => {
    halo.rotation.y = t * 0.35;
    halo.position.y = FLOOR + PH + 15 + Math.sin(t * 0.8) * 0.4;
    dotMat.opacity = 0.5 + active * 0.45;
    pins.forEach((p, i) => { p.position.y = 0.96 + Math.abs(Math.sin(t * 2 + i)) * 0.25 * (0.4 + active); });
    key.rotation.y = -0.6 + Math.sin(t * 0.5) * 0.15;
  });
  ctx.lights.push(strip(30, 0, FLOOR + 0.06, Z + 0.1, b));
}

// ---------- Projects and competitions (stops 06-11). Each is a building behind the hero image with
// the project's idea built around it; the side walls are free-standing boards in its colours.

// Side wall: a slim board in the building's material with a lit top edge.
function board(M, ctx, mat, color, h = 5.6) {
  return (pivot) => {
    mesh(metricBox(0.4, h, 7.6), mat, 0, FLOOR + h / 2, 3.8, pivot);
    glowBox(0.46, 0.1, 7.7, led(ctx, color), 0, FLOOR + h + 0.05, 3.8, pivot);
  };
}

// his project posters: the centre banner on the facade, the two side panels on taller boards
const POSTER = { hero: [10.4, 6.7], side: [5.6, 6.6] };

// The main block behind the hero (front face at z = -5.3), on a plinth over the wet sand.
function block(M, mat, w, h, d, parent, trim = mat) {
  const Z = -5.3;
  mesh(metricBox(w + 12, 2.6, d + 3), M.slab, 0, FLOOR - 1.3, Z - d / 2, parent);
  mesh(metricBox(w, h, d), mat, 0, FLOOR + h / 2, Z - d / 2, parent);
  mesh(metricBox(w + 0.4, 0.4, d + 0.4), trim, 0, FLOOR + h + 0.2, Z - d / 2, parent);
  return FLOOR + h + 0.4;
}

function signPlate(text, w, h, bg, fg, x, y, z, parent) {
  const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: nameTexture(text, bg, fg), toneMapped: false }), x, y, z, parent);
  m.castShadow = false;
  return m;
}

// ---------- 06 Credit card fraud: a steel bank vault. A great round vault door on the facade with its
// wheel turning; on the roof a grid of transactions, one of them glowing red (0.17%), and a red scan
// line sweeping across them looking for it.
function fraudVault(M, ctx, { heroes, sides }) {
  const { g } = ctx;
  const RED = '#ff4d55';
  deck(g, M.gunmetal, M.slab);
  layout(ctx, { heroes, sides, fit: POSTER, backWall: () => {}, sideWall: board(M, ctx, M.gunmetal, RED, 7.4) });
  const b = new THREE.Group();
  g.add(b);
  const Z = -5.3;
  const top = block(M, M.gunmetal, 20, 15, 9, b, M.brushed);
  // the vault door, with bolts round the rim and a turning wheel
  const door = new THREE.Group();
  door.position.set(0, FLOOR + 11.4, Z + 0.1);
  b.add(door);
  const disc = mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.7, 48), M.brushed, 0, 0, 0.35, door);
  disc.rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(3.35, 0.22, 10, 64), M.dark, 0, 0, 0.3, door);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const bolt = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.4, 10), M.dark, Math.cos(a) * 2.75, Math.sin(a) * 2.75, 0.85, door);
    bolt.rotation.x = Math.PI / 2;
  }
  const wheel = new THREE.Group();
  wheel.position.z = 1.0;
  door.add(wheel);
  mesh(new THREE.TorusGeometry(1.3, 0.12, 8, 40), M.steel, 0, 0, 0, wheel);
  for (let i = 0; i < 3; i++) mesh(metricBox(2.6, 0.14, 0.14), M.steel, 0, 0, 0, wheel).rotation.z = (i / 3) * Math.PI;
  const ringLight = mesh(new THREE.TorusGeometry(3.6, 0.06, 6, 80), led(ctx, RED), 0, 0, 0.2, door);
  ringLight.castShadow = false;
  // transactions on the roof: 18 x 12 cubes, one fraud among them
  const cols = 18, rows = 12;
  const cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), M.steel, cols * rows - 1);
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), m = new THREE.Matrix4();
  const at = (i, j) => v.set(-8.5 + i * 1.0, top + 0.25, Z - 0.9 - j * 0.65);
  let k = 0;
  const FI = 13, FJ = 7;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    if (i === FI && j === FJ) continue;
    cubes.setMatrixAt(k++, m.compose(at(i, j), q, s));
  }
  b.add(cubes);
  const fraudMat = led(ctx, RED);
  const fraud = glowBox(0.46, 0.46, 0.46, fraudMat, 0, 0, 0, b);
  fraud.position.copy(at(FI, FJ));
  const scanMat = holo(RED, 0.5);
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(0.12, rows * 0.65 + 0.6), scanMat);
  scan.rotation.x = -Math.PI / 2;
  b.add(scan);
  ctx.anim.push((t, active) => {
    wheel.rotation.z = t * 0.6;
    const u = (t * 0.12) % 1;
    scan.position.set(-9 + u * 18, top + 0.5, Z - 0.9 - (rows - 1) * 0.325);
    scanMat.opacity = 0.25 + active * 0.5;
    const hit = Math.exp(-((scan.position.x - fraud.position.x) ** 2) * 2);
    fraud.scale.setScalar(1 + hit * 0.6 + 0.15 * Math.sin(t * 6) * active);
  });
  ctx.lights.push(strip(30, 0, FLOOR + 0.06, Z + 0.1, b));
}

// ---------- 07 SMS spam: a sorting office. A conveyor runs across the facade carrying envelopes;
// at its end a lit gate sends spam (red) down into one bin and ham (white) into the other. A giant
// envelope stands on the roof.
function spamSorter(M, ctx, { heroes, sides }) {
  const { g } = ctx;
  const TEAL = '#5fe0cf', RED = '#ff5a5f';
  const wall = new THREE.MeshStandardMaterial({ color: '#e9ecef', roughness: 0.55 });
  deck(g, M.gunmetal, M.slab);
  layout(ctx, { heroes, sides, fit: POSTER, backWall: () => {}, sideWall: board(M, ctx, wall, TEAL, 7.4) });
  const b = new THREE.Group();
  g.add(b);
  const Z = -5.3;
  const top = block(M, wall, 22, 12, 9, b, M.dark);
  // conveyor across the facade above the hero
  const beltY = FLOOR + 9.2;
  mesh(metricBox(19, 0.3, 1.4), M.dark, -1, beltY, Z + 0.8, b);
  glowBox(19, 0.05, 0.05, led(ctx, TEAL), -1, beltY + 0.16, Z + 1.5, b);
  for (const x of [-9.8, 8.2]) mesh(metricBox(0.25, beltY - FLOOR, 0.25), M.dark, x, (beltY + FLOOR) / 2, Z + 1.3, b);
  // the two bins at the end, under the gate
  const bins = [[9.6, 'HAM', '#d9dde3'], [12.2, 'SPAM', RED]];
  for (const [x, label, col] of bins) {
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, emissive: col, emissiveIntensity: label === 'SPAM' ? 0.25 : 0.05 });
    mesh(metricBox(2.2, 1.6, 1.8), mat, x, FLOOR + 6.4, Z + 0.9, b);
    mesh(metricBox(0.4, 5.6, 0.4), M.dark, x, FLOOR + 2.8, Z + 0.9, b);
    signPlate(label, 1.8, 0.4, '#16181c', label === 'SPAM' ? '#ffb0b3' : '#ffffff', x, FLOOR + 6.4, Z + 1.81, b);
  }
  const gateMat = led(ctx, TEAL);
  glowBox(0.15, 2.2, 1.6, gateMat, 8.6, beltY + 1.0, Z + 0.8, b);
  // envelopes: a body and a darker flap; every fourth one is spam
  const env = [];
  const white = new THREE.MeshStandardMaterial({ color: '#f7f7f2', roughness: 0.7 });
  const red = new THREE.MeshStandardMaterial({ color: RED, roughness: 0.6, emissive: RED, emissiveIntensity: 0.3 });
  for (let i = 0; i < 9; i++) {
    const spam = i % 4 === 1;
    const e = new THREE.Group();
    mesh(metricBox(0.9, 0.08, 0.6), spam ? red : white, 0, 0, 0, e);
    const flap = mesh(new THREE.ConeGeometry(0.42, 0.3, 3), spam ? red : white, 0, 0.05, -0.12, e);
    flap.rotation.set(-Math.PI / 2, 0, 0);
    flap.scale.set(1, 1, 0.1);
    e.userData.spam = spam;
    b.add(e);
    env.push(e);
  }
  // the giant envelope on the roof
  const big = new THREE.Group();
  big.position.set(-4, top + 2.4, Z - 4);
  b.add(big);
  mesh(metricBox(6, 4, 0.4), white, 0, 0, 0, big);
  for (const s of [-1, 1]) mesh(metricBox(3.7, 0.18, 0.1), M.dark, s * 1.5, 0.95, 0.22, big).rotation.z = -s * 0.6;
  glowBox(6.1, 0.1, 0.5, led(ctx, TEAL), 0, -2.0, 0, big);
  ctx.anim.push((t, active) => {
    env.forEach((e, i) => {
      const u = ((t * 0.08 + i / env.length) % 1);
      const x = -10 + u * 22;
      let y = beltY + 0.2, z = Z + 0.8;
      if (x > 8.6) {
        const d = Math.min(1, (x - 8.6) / 2.4);
        const bx = e.userData.spam ? 12.2 : 9.6;
        e.position.set(8.6 + (bx - 8.6) * d, y - d * (y - (FLOOR + 7.3)), z);
      } else e.position.set(x, y, z);
      e.visible = x < 11.6;
    });
    gateMat.emissiveIntensity = (0.8 + active * 1.6) * (0.8 + 0.2 * Math.sin(t * 5));
    big.rotation.y = Math.sin(t * 0.5) * 0.15;
  });
  ctx.lights.push(strip(30, 0, FLOOR + 0.06, Z + 0.1, b));
}

// ---------- 08 Generative augmentation: a studio where a generator tower (layers widening upward,
// like transposed convolutions) faces a discriminator tower (layers narrowing), and generated
// CIFAR-10 tiles drift from one to the other.
function ganStudio(M, ctx, { heroes, sides }) {
  const { g } = ctx;
  const VIOLET = '#b48cff', TEAL = '#5fe0cf';
  const dark = new THREE.MeshStandardMaterial({ color: '#1b1626', roughness: 0.4, metalness: 0.6 });
  deck(g, M.gunmetal, M.slab);
  layout(ctx, { heroes, sides, fit: POSTER, backWall: () => {}, sideWall: board(M, ctx, dark, VIOLET, 7.4) });
  const b = new THREE.Group();
  g.add(b);
  const Z = -5.3;
  const top = block(M, dark, 22, 10, 9, b, M.gunmetal);
  glowBox(22.5, 0.1, 0.1, led(ctx, VIOLET), 0, top - 0.2, Z + 0.25, b);
  // generator (left) and discriminator (right): four layers each
  const towers = [[-7, VIOLET, [1.2, 2, 2.8, 3.6], 'GENERATOR'], [7, TEAL, [3.6, 2.8, 2, 1.2], 'DISCRIMINATOR']];
  for (const [x, col, sizes, label] of towers) {
    const edge = led(ctx, col);
    sizes.forEach((w, i) => {
      const y = top + 0.9 + i * 1.7;
      mesh(metricBox(w, 1.2, w), dark, x, y, Z - 4, b);
      glowBox(w + 0.05, 0.08, w + 0.05, edge, x, y + 0.62, Z - 4, b);
    });
    signPlate(label, 4.4, 0.5, '#1b1626', '#efe6ff', x, top + 0.4, Z - 1.9, b);
  }
  // CIFAR-10 sized tiles cut from the samples image, drifting from G to D
  const tiles = [];
  const src = sides[0];
  for (let i = 0; i < 10; i++) {
    let mat;
    if (src) {
      const t = src.clone();
      t.colorSpace = THREE.SRGBColorSpace;
      t.repeat.set(0.08, 0.128);
      t.offset.set(0.1 + (i % 5) * 0.16, 0.2 + Math.floor(i / 5) * 0.3);
      t.needsUpdate = true;
      mat = new THREE.MeshBasicMaterial({ map: t, toneMapped: false, side: THREE.DoubleSide });
    } else mat = holo(VIOLET, 0.8);
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), mat);
    b.add(tile);
    tiles.push(tile);
  }
  const frameMat = holo(VIOLET, 0.6);
  const frames = tiles.map((tile) => {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), frameMat);
    b.add(f);
    return f;
  });
  ctx.anim.push((t, active) => {
    tiles.forEach((tile, i) => {
      const u = ((t * 0.07 + i / tiles.length) % 1);
      const x = -5 + u * 10;
      const y = top + 4 + Math.sin(u * Math.PI) * 2.6 + Math.sin(t + i) * 0.15;
      tile.position.set(x, y, Z - 4 + Math.sin(i * 1.7) * 1.2);
      frames[i].position.copy(tile.position).add(new THREE.Vector3(0, 0, -0.02));
      tile.scale.setScalar(0.6 + 0.6 * Math.sin(u * Math.PI));
      frames[i].scale.copy(tile.scale);
    });
    frameMat.opacity = 0.2 + active * 0.4;
  });
  ctx.lights.push(strip(30, 0, FLOOR + 0.06, Z + 0.1, b));
}

// ---------- 09 Forecasting: a weather station. A lattice mast with a spinning anemometer, a giant
// thermometer, and ten years of temperature as a glowing ribbon over the roof, the forecast running on
// past it in a second colour.
function forecastStation(M, ctx, { heroes, sides }) {
  const { g } = ctx;
  const SUN = '#ffd166', TEAL = '#5fe0cf';
  deck(g, M.whiteStucco, M.paving);
  layout(ctx, { heroes, sides, fit: POSTER, backWall: () => {}, sideWall: board(M, ctx, M.whiteStucco, SUN, 7.4) });
  const b = new THREE.Group();
  g.add(b);
  const Z = -5.3;
  const top = block(M, M.whiteStucco, 20, 10, 9, b, M.dark);
  // the series: seasonal waves with a little noise, then a forecast segment
  const r = rng(17);
  const hist = [], fut = [];
  for (let i = 0; i <= 120; i++) {
    const x = -9 + i * 0.12;
    hist.push(new THREE.Vector3(x, top + 3.4 + 1.6 * Math.sin(i / 120 * Math.PI * 2 * 3.3) + (r() - 0.5) * 0.35, Z - 3));
  }
  for (let i = 0; i <= 30; i++) {
    const x = 5.4 + i * 0.12;
    fut.push(new THREE.Vector3(x, top + 3.4 + 1.6 * Math.sin((120 + i) / 120 * Math.PI * 2 * 3.3), Z - 3));
  }
  const tube = (pts, col, rad) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, rad, 6), led(ctx, col), 0, 0, 0, b);
  tube(hist, SUN, 0.12).castShadow = false;
  tube(fut, TEAL, 0.16).castShadow = false;
  for (const x of [-9, 9]) mesh(metricBox(0.15, 5.4, 0.15), M.dark, x, top + 2.7, Z - 3, b);
  mesh(metricBox(18.2, 0.1, 0.1), M.dark, 0, top + 1.5, Z - 3, b);
  // lattice mast and anemometer
  const mx = 7.5, mz = Z - 6.5, mh = 9;
  for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) mesh(metricBox(0.1, mh, 0.1), M.steel, mx + dx, top + mh / 2, mz + dz, b);
  for (let y = 1; y < mh; y += 1.2) mesh(metricBox(1.1, 0.06, 1.1), M.steel, mx, top + y, mz, b);
  const anemo = new THREE.Group();
  anemo.position.set(mx, top + mh + 0.4, mz);
  b.add(anemo);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = (i / 3) * Math.PI * 2;
    mesh(metricBox(1.4, 0.06, 0.06), M.steel, 0.7, 0, 0, arm);
    mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI), M.steel, 1.4, 0, 0, arm).rotation.y = Math.PI / 2;
    anemo.add(arm);
  }
  // thermometer on the facade, filling as the stop lights up
  const tx = -8.6;
  mesh(new THREE.CylinderGeometry(0.45, 0.45, 6, 18), M.glass, tx, FLOOR + 6.2, Z + 0.6, b);
  mesh(new THREE.SphereGeometry(0.8, 18, 14), led(ctx, '#ff6b4a'), tx, FLOOR + 2.8, Z + 0.6, b);
  const merc = mesh(new THREE.CylinderGeometry(0.25, 0.25, 1, 12), led(ctx, '#ff6b4a'), tx, 0, Z + 0.6, b);
  ctx.anim.push((t, active) => {
    anemo.rotation.y = t * 2.4;
    const h = 1 + (4.4 + 0.3 * Math.sin(t)) * (0.3 + 0.7 * active);
    merc.scale.y = h;
    merc.position.y = FLOOR + 3.4 + h / 2;
  });
  ctx.lights.push(strip(30, 0, FLOOR + 0.06, Z + 0.1, b));
}

// ---------- 10 SAKHI: a warm neighbourhood bank. A credit-score dial over the entrance, its needle
// climbing as the stop lights up; a giant phone on the roof paying by UPI, and chat bubbles rising
// from it (the chatbot that explains each score).
function sakhiBank(M, ctx, { heroes, sides }) {
  const { g } = ctx;
  const AMBER = '#ffb35c';
  const cream = pbr('white_stucco', { tile: 2.5, color: '#f3d9b8' });
  deck(g, M.laterite, M.paving);
  layout(ctx, { heroes, sides, fit: POSTER, backWall: () => {}, sideWall: board(M, ctx, cream, AMBER, 7.4) });
  const b = new THREE.Group();
  g.add(b);
  const Z = -5.3;
  const top = block(M, cream, 22, 14, 9, b, M.terraBand);
  for (const x of [-9.6, -7.4, 7.4, 9.6]) mesh(new THREE.CylinderGeometry(0.4, 0.45, 13, 18), M.whiteStucco, x, FLOOR + 6.5, Z + 0.6, b);
  signPlate('SAKHI', 5, 0.8, '#7a2e1a', '#ffe3c4', 0, top - 1, Z + 0.25, b);
  // credit-score dial: red to green arc and a needle
  const dial = new THREE.Group();
  dial.position.set(0, FLOOR + 9.1, Z + 0.3);
  b.add(dial);
  const segs = ['#e85d4a', '#f2a65a', '#f2d35a', '#9ed36a', '#4fbf6a'];
  segs.forEach((c, i) => {
    const arc = mesh(new THREE.TorusGeometry(2.6, 0.32, 8, 24, Math.PI / 5), led(ctx, c), 0, 0, 0, dial);
    arc.rotation.z = Math.PI - (i + 1) * Math.PI / 5;
    arc.castShadow = false;
  });
  const needle = new THREE.Group();
  dial.add(needle);
  mesh(metricBox(2.3, 0.14, 0.1), M.dark, 1.15, 0, 0.2, needle);
  mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.3, 16), M.dark, 0, 0, 0.2, dial).rotation.x = Math.PI / 2;
  // the phone and its UPI screen
  const phone = new THREE.Group();
  phone.position.set(5.5, top + 3.8, Z - 4);
  b.add(phone);
  mesh(metricBox(3.6, 7, 0.5), M.dark, 0, 0, 0, phone);
  const screen = mesh(new THREE.PlaneGeometry(3.1, 6.2), new THREE.MeshBasicMaterial({ color: '#2b1d14', toneMapped: false }), 0, 0, 0.26, phone);
  screen.castShadow = false;
  signPlate('UPI', 2.4, 0.5, '#2b1d14', '#ffcf8a', 0, 2, 0.28, phone);
  signPlate('CREDIT SCORE', 2.6, 0.45, '#2b1d14', '#9ed36a', 0, 0.4, 0.28, phone);
  // chat bubbles rising beside the phone
  const bubbleMat = new THREE.MeshStandardMaterial({ color: '#fff4e6', emissive: AMBER, emissiveIntensity: 0.35, roughness: 0.5 });
  const bubbles = [0, 1, 2].map((i) => {
    const bub = new THREE.Group();
    mesh(new THREE.CapsuleGeometry(0.6, 1.8, 6, 16).rotateZ(Math.PI / 2), bubbleMat, 0, 0, 0, bub);
    mesh(new THREE.ConeGeometry(0.25, 0.5, 8), bubbleMat, i % 2 ? 0.8 : -0.8, -0.6, 0, bub).rotation.z = Math.PI;
    b.add(bub);
    return bub;
  });
  ctx.anim.push((t, active) => {
    needle.rotation.z = Math.PI * (0.92 - 0.62 * (0.35 + 0.65 * active)) + 0.04 * Math.sin(t * 2);
    bubbles.forEach((bub, i) => {
      const u = ((t * 0.12 + i / 3) % 1);
      bub.position.set(1.2 + (i % 2) * 1.2, top + 2 + u * 7, Z - 4 + 0.8);
      bub.scale.setScalar(Math.sin(u * Math.PI) * (0.6 + active * 0.4) + 0.01);
    });
  });
  ctx.lights.push(strip(30, 0, FLOOR + 0.06, Z + 0.1, b));
}

// ---------- 11 Solar-flare early warning: an observatory. A dome with its slit open and a telescope
// pointing at a glowing sun whose flare loops flicker; Aditya-L1 circles between them, and a beacon on
// the roof flashes the 10-minute warning.
function isroObservatory(M, ctx, { heroes, sides }) {
  const { g } = ctx;
  const SUN = '#ffb03a', RED = '#ff4d4d';
  deck(g, M.gunmetal, M.slab);
  layout(ctx, { heroes, sides, fit: POSTER, backWall: () => {}, sideWall: board(M, ctx, M.whiteStucco, SUN, 7.4) });
  const b = new THREE.Group();
  g.add(b);
  const Z = -5.3;
  const top = block(M, M.whiteStucco, 20, 10, 10, b, M.dark);
  signPlate('SOLEXS · HEL1OS · ADITYA-L1', 11, 0.6, '#f4f2ee', '#1d2a44', 0, top - 1.3, Z + 0.25, b);
  // drum and dome with an open slit
  const dz = Z - 5.5;
  mesh(new THREE.CylinderGeometry(4.2, 4.2, 2.4, 40), M.whiteStucco, -4, top + 1.2, dz, b);
  const dome = mesh(new THREE.SphereGeometry(4.2, 40, 20, 0.35, Math.PI * 2 - 0.7, 0, Math.PI / 2), M.brushed, -4, top + 2.4, dz, b);
  dome.rotation.y = Math.PI / 2 + 0.6;
  const scope = mesh(new THREE.CylinderGeometry(0.45, 0.6, 5, 18), M.dark, -3.2, top + 4.2, dz + 0.6, b);
  scope.rotation.set(-0.5, 0, -0.75);
  // the sun with flare loops
  const sun = new THREE.Group();
  sun.position.set(5, top + 11, dz - 2);
  b.add(sun);
  const sunMat = new THREE.MeshBasicMaterial({ color: '#ffd38a', toneMapped: false });
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(2.2, 32, 20), sunMat));
  const loopMat = holo(SUN, 0.8);
  const loops = [0, 1, 2].map((i) => {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.9 + i * 0.3, 0.09, 8, 32, Math.PI), loopMat);
    loop.rotation.set(0, i * 1.9, 0.3 + i * 0.6);
    loop.position.set(Math.cos(i * 2.1) * 1.9, Math.sin(i * 2.1) * 1.9, 0);
    sun.add(loop);
    return loop;
  });
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: SUN, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  glowSprite.scale.setScalar(11);
  sun.add(glowSprite);
  // Aditya-L1: a gold body with two solar panels
  const sat = new THREE.Group();
  b.add(sat);
  mesh(metricBox(0.9, 0.9, 0.9), M.brass, 0, 0, 0, sat);
  const panel = new THREE.MeshStandardMaterial({ color: '#1f3a7a', metalness: 0.6, roughness: 0.3, emissive: '#1f3a7a', emissiveIntensity: 0.3 });
  for (const s of [-1, 1]) mesh(metricBox(2.2, 0.06, 0.9), panel, s * 1.6, 0, 0, sat);
  // the warning beacon
  const beaconMat = new THREE.MeshStandardMaterial({ color: '#2a0d0d', emissive: RED, emissiveIntensity: 0 });
  mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.6, 10), M.dark, 6.5, top + 0.8, Z - 1.5, b);
  const beacon = mesh(new THREE.SphereGeometry(0.45, 16, 12), beaconMat, 6.5, top + 1.9, Z - 1.5, b);
  beacon.castShadow = false;
  ctx.anim.push((t, active) => {
    loops.forEach((l, i) => { l.scale.setScalar(1 + 0.25 * Math.max(0, Math.sin(t * 1.3 + i * 2))); });
    loopMat.opacity = 0.5 + 0.4 * active;
    glowSprite.material.opacity = 0.55 + 0.25 * Math.sin(t * 0.9) + 0.2 * active;
    const a = t * 0.35;
    sat.position.set(0.5 + Math.cos(a) * 6, top + 8 + Math.sin(a * 2) * 0.6, dz - 1 + Math.sin(a) * 4);
    sat.rotation.y = -a;
    beaconMat.emissiveIntensity = (t % 2.5 < 0.35 ? 6 : 0.2) * (0.3 + 0.7 * active);
  });
  ctx.lights.push(strip(30, 0, FLOOR + 0.06, Z + 0.1, b));
}

// Glowing ring on the path where the buggy stops. Conforms to the sand.
function ring(cx, cz, r0, r1, color = '#ffc27a') {
  const seg = 96;
  const pos = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    for (const r of [r0, r1]) {
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      pos.push(x, heightAt(x, z) + 0.06, z);
    }
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
}

function glowDisc(cx, cz, r, tex, y) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(cx, (y ?? heightAt(cx, cz)) + 0.05, cz);
  return m;
}

// Soft additive glow around every lamp, so they glow even without bloom.
function halos(points, tex, size, color) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.PointsMaterial({ map: tex, size, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  return p;
}

function makeMaterials() {
  return {
    plaster: pbr('clay_plaster', { tile: 3, color: '#f3e7d6' }),
    laterite: pbr('red_laterite_soil_stones', { tile: 1.6, color: '#d9b49a' }),
    deck: pbr('wood_floor_deck', { tile: 2.4 }),
    timber: pbr('wood_floor_deck', { tile: 1.2, color: '#a0806a' }),
    ceiling: pbr('weathered_brown_planks', { tile: 2.2, color: '#b49a84' }),
    roof: pbr('clay_roof_tiles_02', { tile: 1.6, side: THREE.DoubleSide }),
    brick: pbr('brick_wall_02', { tile: 2.2 }),
    brickFloor: pbr('brick_wall_02', { tile: 1.6, color: '#d9b7a4' }),
    concrete: pbr('concrete_layers', { tile: 3, side: THREE.DoubleSide }),
    polished: pbr('concrete_wall_008', { tile: 3, roughness: 0.55 }),
    stucco: pbr('white_stucco', { tile: 2.5 }),
    oak: pbr('wood_floor_deck', { tile: 2.4, color: '#e7cdb2' }),
    pierPlank: pbr('weathered_brown_planks', { tile: 2 }),
    darkTimber: new THREE.MeshStandardMaterial({ color: '#4e3a2c', roughness: 0.7 }),
    // campus buildings
    whiteStucco: pbr('white_stucco', { tile: 2.5, color: '#fbf9f4' }),
    shadowStucco: new THREE.MeshStandardMaterial({ color: '#bdb8ae', roughness: 0.9 }),
    gridWindow: new THREE.MeshStandardMaterial({ map: windowGridTexture(), roughness: 0.2, metalness: 0.3, emissive: '#ffd9a0', emissiveIntensity: 0.04 }),
    turf: pbr('leafy_grass', { tile: 1.4, color: '#86d46a' }),
    salmon: pbr('white_stucco', { tile: 2.5, color: '#f6b9a0' }),
    teak: new THREE.MeshStandardMaterial({ color: '#a8754e', roughness: 0.7 }),
    redPot: new THREE.MeshStandardMaterial({ color: '#b3342b', roughness: 0.6 }),
    potPlant: new THREE.MeshStandardMaterial({ color: '#3c7a2a', roughness: 0.9 }),
    creamWall: pbr('white_stucco', { tile: 2.5, color: '#f1e2c8' }),
    terraBand: new THREE.MeshStandardMaterial({ color: '#9c4a2e', roughness: 0.75 }),
    paving: pbr('concrete_wall_008', { tile: 2, roughness: 0.7, color: '#c9b9a4' }),
    windowGlass: new THREE.MeshStandardMaterial({ color: '#1d2a33', roughness: 0.12, metalness: 0.6, emissive: '#ffcf8a', emissiveIntensity: 0.06 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c99a45', roughness: 0.35, metalness: 0.9 }),
    // AI pavilions
    slab: pbr('concrete_wall_008', { tile: 3, roughness: 0.4, color: '#5a5f68' }),
    gunmetal: new THREE.MeshStandardMaterial({ color: '#1e2228', roughness: 0.32, metalness: 0.85 }),
    brushed: new THREE.MeshStandardMaterial({ color: '#b4bac4', roughness: 0.28, metalness: 0.95 }),
    glass: new THREE.MeshStandardMaterial({ color: '#a8dcff', roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
    steel: new THREE.MeshStandardMaterial({ color: '#efe9de', roughness: 0.4, metalness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: '#23201d', roughness: 0.5, metalness: 0.6 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#ffe7c2', emissive: '#ffae5c', emissiveIntensity: 7 }),
    softLamp: new THREE.MeshStandardMaterial({ color: '#ffe7c2', emissive: '#ffae5c', emissiveIntensity: 1.6, side: THREE.DoubleSide }),
  };
}

// lanterns from the kit glow from inside
function lightUp(model, intensity = 9) {
  model.traverse((o) => {
    if (!o.isMesh) return;
    const name = (o.material.name || '').toLowerCase();
    if (name.includes('glass') || name.includes('flame')) {
      o.material = o.material.clone();
      o.material.emissive = new THREE.Color('#ffb15e');
      o.material.emissiveIntensity = intensity;
      o.castShadow = false;
    }
  });
}

// Her own building (converted from SketchUp) on its terrace in the hillside, on a low stone
// podium, scaled so its longer side is site.span metres and turned to face the sea (SketchUp's
// front view looks at the model's -Y side, which arrives here facing +z). Returns what the
// stop needs: the object, a footprint planting keeps clear of, and a camera shot that frames it.
function placeBuilding(M, site) {
  const model = site.object;
  const size = model.userData.size;
  const k = site.span / Math.max(size.x, size.z);
  const w = size.x * k, d = size.z * k, h = size.y * k;
  const g = new THREE.Group();
  mesh(metricBox(w + 3, 2, d + 3), M.polished, 0, -0.75, 0, g);
  mesh(metricBox(w + 3.2, 0.1, d + 3.2), M.dark, 0, 0.27, 0, g).castShadow = false;
  const m = model.clone();
  m.scale.setScalar(k);
  m.position.y = 0.32;
  m.rotation.y = Math.PI;
  g.add(m);
  g.position.set(site.x, site.y, site.z);
  const look = new THREE.Vector3(site.x, site.y + h * 0.35, site.z);
  return {
    object: g,
    y: site.y,
    footprint: { x: site.x, z: site.z, r: Math.hypot(w, d) / 2 + 4 },
    // from the beach below, a little to the side, high enough to see over the terrace edge
    shot: { look, pos: new THREE.Vector3(site.x - 14, site.y + h * 0.5 + 8, site.z - Math.max(w, d) * 0.95 - 6), radius: Math.max(w, d) },
  };
}

export function createExhibits({ projects, textures, path, kit = {}, display, sites = [] }) {
  const M = makeMaterials();
  const group = new THREE.Group();
  const stops = [];
  const pickables = [];
  const glow = glowTexture();
  const reveals = [];
  if (kit.lantern) lightUp(kit.lantern[0]);
  if (kit.diya) lightUp(kit.diya[0], 12);

  const placeStop = (id) => {
    const s = path.sAtX(STOP_X[id]);
    const P = path.pointAt(s);
    const T = path.tangentAt(s);
    const N = path.inwardAt(s);
    const normal = N.clone().sub(T).normalize();    // faces the land and the approaching buggy
    return { s, P, T, N, normal };
  };

  // ---------- Pavilions
  const groupStops = {};
  for (const p of projects) {
    const spot = p.group ? groupSpot(path, projects, p) : null;
    const { s, P, normal } = spot ? { s: spot.s, P: spot.P, normal: spot.N } : placeStop(p.id);
    // 22 m out: the pavilion's nearest corner (post, deck, screen) stays 2 m+ off the path
    const center = spot ? new THREE.Vector3(spot.x, 0, spot.z) : P.clone().addScaledVector(normal, -22);
    center.y = heightAt(center.x, center.z);
    const holder = new THREE.Group();
    holder.position.copy(center);
    holder.position.y -= 0.15;
    holder.rotation.y = spot ? spot.rotY : Math.atan2(normal.x, normal.z);
    group.add(holder);

    // glow: halos, frames and uplights; bright: the images themselves. accent: the pavilion's
    // light colour, which also tints its image frames. anim: per-frame updates (t, active).
    const ACCENT = { school: '#ffb877', iitkgp: '#ffb877', zepto: '#ff4f86', ixana: '#9fdcff', realtors: '#e0288f', fraud: '#ff5a5f', spam: '#5fe0cf', gan: '#b48cff', forecast: '#ffd166', sakhi: '#ffb35c', isro: '#ffb03a' };
    const ctx = { g: new THREE.Group(), lights: [], panels: [], picks: [], anim: [], kit, display, glow: 1, bright: 1, accent: ACCENT[p.detail] };
    const sides = (p.walls || []).map((id) => textures[id]);
    const heroes = [textures[p.hero], ...(p.heroSecond ? [textures[p.heroSecond]] : [])];
    const build = { school: schoolCampus, iitkgp: iitMainBuilding, zepto: zeptoStore, ixana: ixanaTower, realtors: realtorsTowers, fraud: fraudVault, spam: spamSorter, gan: ganStudio, forecast: forecastStation, sakhi: sakhiBank, isro: isroObservatory }[p.detail];
    build(M, ctx, { heroes, sides, logo: textures[p.logo] });
    // clay pots at the front corners, each with a small curly palm (~2.4 m)
    const potPalm = kit.palmSmall?.[0];
    if (kit.planter && potPalm) {
      const k = 2.4 / PAVILION_SCALE / potPalm.userData.size.y;
      for (const x of [-6.4, 6.4]) {
        const pot = kit.planter[0].clone();
        pot.scale.setScalar(4.2);
        pot.position.set(x, FLOOR, 4.4);
        ctx.g.add(pot);
        const plant = potPalm.clone();
        plant.scale.setScalar(k);
        plant.rotation.y = x * 0.7;
        plant.position.set(x, FLOOR + 0.8, 4.4);
        ctx.g.add(plant);
      }
    }
    lectern(M, labelTexture({ number: p.number, title: p.title, sub: p.type }), -4.6, 7.4, ctx.g);
    const site = sites.find((x) => x.id === p.id && x.object);
    const building = site ? placeBuilding(M, site) : null;
    if (building) group.add(building.object);
    ctx.g.scale.setScalar(spot ? GROUP_SCALE : PAVILION_SCALE);
    holder.add(ctx.g);
    ctx.picks.forEach((m) => { m.userData.stopId = p.id; pickables.push(m); });

    const wave = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 1, 72).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#ffd29a', transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }),
    );
    wave.position.set(center.x, center.y + 0.15, center.z);
    wave.visible = false;
    group.add(wave);

    // a group member: one building of its group's stop, which gathers their lights and images
    if (spot) {
      let gs = groupStops[p.group];
      if (!gs) {
        const r = ring(P.x, P.z, 3.0, 3.35);
        const disc = glowDisc(P.x, P.z, 4.4, glow);
        group.add(r, disc);
        gs = groupStops[p.group] = {
          id: p.group, kind: 'group', s, center: P.clone(), normal: spot.N.clone(), ring: P, ringMesh: r, disc,
          lights: [], panels: [], anim: [], active: 0, arrived: false, sheenT: 1, footprints: [],
        };
        stops.push(gs);
      }
      gs.lights.push(...ctx.lights);
      gs.panels.push(...ctx.panels);
      gs.anim.push(...ctx.anim);
      gs.footprints.push({ x: center.x, z: center.z, r: 13 });
      reveals.push({ s, center, holder: ctx.g, wave, landed: false, waveT: 1 });
      continue;
    }

    // where the buggy stops: a glowing ring on the path
    const r = ring(P.x, P.z, 3.0, 3.35);
    const disc = glowDisc(P.x, P.z, 4.4, glow);
    group.add(r, disc);

    const stop = {
      id: p.id, kind: 'project', s, center, normal, ring: P, ringMesh: r, disc,
      lights: ctx.lights, lightScale: ctx.glow, panels: ctx.panels, anim: ctx.anim,
      active: 0, holder: ctx.g, wave, landed: false, waveT: 1, sheenT: 1, arrived: false,
      building, footprint: building?.footprint ?? (ctx.footprint ? { x: center.x, z: center.z, r: ctx.footprint } : undefined),
    };
    stops.push(stop);
    reveals.push(stop);

    // her 3D building is its own stop, just past the pavilion, with its own ring on the path
    if (building) {
      const ms = path.sAtX(site.x);
      const MP = path.pointAt(ms);
      const mr = ring(MP.x, MP.z, 3.0, 3.35);
      const md = glowDisc(MP.x, MP.z, 4.4, glow);
      group.add(mr, md);
      stops.push({
        id: `${p.id}--model`, kind: 'model', project: p.id, s: ms, center: building.shot.look, normal,
        ring: MP, ringMesh: mr, disc: md, lights: [], active: 0, building,
      });
    }
  }

  // ---------- Pier: About & Contact
  {
    const { s, P } = placeStop('pier');
    const px = P.x;
    const pz = shoreZ(px);
    const pier = new THREE.Group();
    const deckY = 1.15;
    const L = 66;
    mesh(metricBox(3.6, 0.22, L), M.pierPlank, 0, deckY, -L / 2 + 2, pier);
    const lanternSpots = [];
    for (let z = 2; z > -L + 2; z -= 4) {
      for (const sx of [-1.6, 1.6]) {
        mesh(new THREE.CylinderGeometry(0.17, 0.2, 6, 10), M.timber, sx, deckY - 3, z, pier);
        mesh(metricBox(0.1, 1.0, 0.1), M.timber, sx * 1.08, deckY + 0.55, z, pier);
      }
      if (Math.abs(z) % 12 === 2) for (const sx of [-1.75, 1.75]) lanternSpots.push([sx, z]);
    }
    for (const sx of [-1, 1]) mesh(metricBox(0.1, 0.1, L - 2), M.timber, sx * 1.73, deckY + 1.05, -L / 2 + 2, pier);
    mesh(metricBox(9, 0.24, 9), M.pierPlank, 0, deckY, -L - 2, pier);
    for (let k = -4; k <= 4; k += 2) for (const [sx, sz] of [[k, -L - 6.4], [-4.4, -L - 2 + k], [4.4, -L - 2 + k]]) mesh(new THREE.CylinderGeometry(0.2, 0.22, 6, 10), M.timber, sx, deckY - 3, sz, pier);
    const ramp = mesh(metricBox(3.6, 0.2, 8), M.pierPlank, 0, deckY / 2 + 0.1, 6, pier);
    ramp.rotation.x = Math.atan2(deckY, 8);
    const lampPts = [];
    if (kit.lantern) {
      const mats = lanternSpots.map(([sx, z]) => new THREE.Matrix4().compose(new THREE.Vector3(sx, deckY + 1.08, z), new THREE.Quaternion(), new THREE.Vector3(1.6, 1.6, 1.6)));
      pier.add(instancesFromModel(kit.lantern[0], mats));
      lanternSpots.forEach(([sx, z]) => lampPts.push(new THREE.Vector3(px + sx, deckY + 1.5, pz + 3 + z)));
    }
    // life rings hung on the rail, facing out to either side
    if (kit.lifebuoy) {
      for (const [sx, z] of [[1, -14], [-1, -38], [1, -58]]) {
        const ring = kit.lifebuoy[0].clone();
        ring.position.set(sx * 1.86, deckY + 0.28, z);
        ring.rotation.y = Math.PI / 2;
        pier.add(ring);
      }
    }
    mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.6, 10), M.dark, 3.8, deckY + 1.8, -L + 1.5, pier);
    const bulb = mesh(new THREE.SphereGeometry(0.3, 16, 12), M.lamp, 3.8, deckY + 3.7, -L + 1.5, pier);
    bulb.castShadow = false;
    lampPts.push(new THREE.Vector3(px + 3.8, deckY + 3.7, pz + 3 - L + 1.5));
    const lampLight = new THREE.PointLight('#ffb366', 30, 28, 1.6);
    lampLight.position.set(3.8, deckY + 3.4, -L + 1.5);
    pier.add(lampLight);
    pier.position.set(px, 0, pz + 3);
    group.add(pier);
    group.add(halos(lampPts, glow, 1.8, '#ffc27a'));
    const sign = lectern(M, labelTexture({ number: '∞', title: 'About & Contact', sub: person.name }), 4.4, 6.5, pier);
    sign.position.y = heightAt(px + 4.4, pz + 9.5);

    // where to find him: a board for each link on the sand beside the pier; click one to open it
    const links = person.contact.links.filter((l) => l.label !== 'Institute email');
    links.forEach((l, i) => {
      // in a row on the wet sand, left of the pier, facing the camera at the pier stop
      const [ox, oz] = [[-6.2, 5.2], [-9.2, 4.6], [-12.2, 4.0]][i];
      const bx = px + ox, bz = pz + oz;
      const board = new THREE.Group();
      for (const sx of [-1.1, 1.1]) mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), M.gunmetal, sx, 1.1, -0.05, board);
      mesh(new THREE.BoxGeometry(3.3, 3.3, 0.12), M.gunmetal, 0, 3.6, -0.1, board);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.1), new THREE.MeshBasicMaterial({ map: linkBoardTexture(l.label, l.value, `assets/icons/${{ Email: 'gmail', LinkedIn: 'linkedin', GitHub: 'github' }[l.label]}.png`), toneMapped: false }));
      face.position.set(0, 3.6, 0.0);
      face.userData.stopId = `link:${l.href}`;
      pickables.push(face);
      board.add(face);
      board.position.set(bx, heightAt(bx, bz), bz);
      board.rotation.y = -0.22;
      board.scale.setScalar(0.85);
      group.add(board);
    });

    const r = ring(P.x, P.z, 3.0, 3.35);
    const disc = glowDisc(P.x, P.z, 4.4, glow);
    group.add(r, disc);
    stops.push({ id: 'pier', kind: 'pier', s, center: new THREE.Vector3(px, deckY, pz + 3), normal: new THREE.Vector3(0, 0, 1), ring: P, ringMesh: r, disc, lights: [], active: 0 });
  }

  // ---------- Lanterns on timber posts along the path, with string lights between them
  const posts = [];
  for (let s = 6; s < path.length - 4; s += 9) {
    if (stops.some((st) => Math.abs(st.s - s) < 7)) continue;
    const P = path.pointAt(s);
    const N = path.inwardAt(s);
    const x = P.x + N.x * 6.2, z = P.z + N.z * 6.2;
    posts.push(new THREE.Vector3(x, heightAt(x, z), z));
  }
  const postGeo = metricBox(0.14, 2.9, 0.14);
  const armGeo = metricBox(0.5, 0.08, 0.08);
  const postMesh = new THREE.InstancedMesh(postGeo, M.timber, posts.length);
  const armMesh = new THREE.InstancedMesh(armGeo, M.timber, posts.length);
  const m4 = new THREE.Matrix4();
  const tops = [];
  posts.forEach((pt, i) => {
    postMesh.setMatrixAt(i, m4.makeTranslation(pt.x, pt.y + 1.45, pt.z));
    armMesh.setMatrixAt(i, m4.makeTranslation(pt.x - 0.2, pt.y + 2.85, pt.z));
    tops.push(new THREE.Vector3(pt.x - 0.38, pt.y + 2.45, pt.z));
  });
  postMesh.castShadow = true;
  group.add(postMesh, armMesh);
  if (kit.lantern) {
    group.add(instancesFromModel(kit.lantern[0], tops.map((t) => new THREE.Matrix4().compose(new THREE.Vector3(t.x, t.y - 0.42, t.z), new THREE.Quaternion(), new THREE.Vector3(1.5, 1.5, 1.5)))));
  } else {
    const heads = new THREE.InstancedMesh(metricBox(0.3, 0.42, 0.3), M.lamp, tops.length);
    tops.forEach((t, i) => heads.setMatrixAt(i, m4.makeTranslation(t.x, t.y, t.z)));
    group.add(heads);
  }
  group.add(halos(tops, glow, 2.2, '#ffbf73'));

  const bulbs = [];
  const bulbColors = [];
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i].clone().setY(posts[i].y + 2.85), b = posts[i + 1].clone().setY(posts[i + 1].y + 2.85);
    if (a.distanceTo(b) > 14) continue;
    const n = Math.round(a.distanceTo(b) / 0.9);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const v = a.clone().lerp(b, t);
      v.y -= Math.sin(Math.PI * t) * 0.8 + 0.1;
      bulbs.push(v);
      bulbColors.push(4.6, 3.3, 1.9);
    }
  }
  const bulbGeo = new THREE.BufferGeometry().setFromPoints(bulbs);
  bulbGeo.setAttribute('color', new THREE.Float32BufferAttribute(bulbColors, 3));
  const stringLights = new THREE.Points(bulbGeo, new THREE.PointsMaterial({ map: glow, size: 0.5, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  stringLights.frustumCulled = false;
  group.add(stringLights);

  // ---------- Landing dust
  const DUST = 160;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST * 3);
  const dustVel = new Float32Array(DUST * 3);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ map: glow, size: 1.1, color: '#e9d2b4', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  group.add(dust);
  let dustT = 1;
  const burst = (c) => {
    for (let i = 0; i < DUST; i++) {
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 5;
      dustPos.set([c.x + Math.cos(a) * r, c.y + 0.3, c.z + Math.sin(a) * r], i * 3);
      const sp = 3 + Math.random() * 6;
      dustVel.set([Math.cos(a) * sp, 1 + Math.random() * 3, Math.sin(a) * sp], i * 3);
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustT = 0;
  };

  const ease = (t) => 1 - Math.pow(1 - t, 3);
  // falls like a dropped object (accelerating), then one small bounce
  const fall = (t) => {
    if (t < 0.72) { const u = t / 0.72; return 1 - u * u; }
    const u = (t - 0.72) / 0.28;
    return Math.sin(u * Math.PI) * 0.07;
  };

  return {
    group,
    stops,
    pickables,
    // s: where the buggy is along the path. Pavilions fall into place as it approaches.
    update(t, dt, s, activeId, reducedMotion) {
      for (const st of reveals) {
        // starts falling ~50 m out and lands ~31 m out, just before the camera turns to it
        const a = reducedMotion ? 1 : Math.min(1, Math.max(0, (s - (st.s - 50)) / 26));
        st.holder.visible = a > 0;
        st.holder.position.y = fall(a) * 30;
        st.holder.rotation.y = (1 - ease(Math.min(1, a / 0.72))) * 0.6;
        if (st.building) {
          // heavy: only drawn around its own stop
          st.building.object.visible = a > 0 && s < st.s + 120;
          st.building.object.position.y = st.building.y + fall(a) * 30;
        }
        const landedNow = a > 0.72;
        if (landedNow && !st.landed && !reducedMotion) {
          burst(st.center);
          st.waveT = 0;
          st.wave.visible = true;
        }
        st.landed = landedNow;
        if (st.waveT < 1) {
          st.waveT = Math.min(1, st.waveT + dt / 1.1);
          const k = ease(st.waveT);
          st.wave.scale.setScalar(2 + k * 18);
          st.wave.material.opacity = (1 - st.waveT) * 0.8;
          if (st.waveT >= 1) st.wave.visible = false;
        }
      }
      if (dustT < 1) {
        dustT = Math.min(1, dustT + dt / 1.6);
        for (let i = 0; i < DUST; i++) {
          dustPos[i * 3] += dustVel[i * 3] * dt;
          dustPos[i * 3 + 1] += dustVel[i * 3 + 1] * dt;
          dustPos[i * 3 + 2] += dustVel[i * 3 + 2] * dt;
          dustVel[i * 3 + 1] -= 3 * dt;
          dustVel[i * 3] *= 0.97;
          dustVel[i * 3 + 2] *= 0.97;
        }
        dustGeo.attributes.position.needsUpdate = true;
        dustMat.opacity = (1 - dustT) * 0.6;
      }
      for (const st of stops) {
        const target = st.id === activeId ? 1 : 0;
        st.active += (target - st.active) * Math.min(1, dt * 4);
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
        st.ringMesh.material.opacity = 0.3 + 0.2 * pulse + st.active * 0.45;
        st.disc.material.opacity = 0.18 + 0.1 * pulse + st.active * 0.4;
        const k = st.lightScale ?? 1;
        for (const l of st.lights) l.emissiveIntensity = (1 + st.active * 2.2 + pulse * 0.3) * k;
        if (st.anim && (st.holder?.visible ?? true)) for (const f of st.anim) f(t, st.active);
        if (!st.panels) continue;
        // arriving: a band of light sweeps across the images
        if (st.active > 0.5 && !st.arrived) { st.arrived = true; st.sheenT = 0; }
        if (st.active < 0.2) st.arrived = false;
        if (st.sheenT < 1) st.sheenT = Math.min(1, st.sheenT + dt / 1.5);
        st.panels.forEach((pn, i) => {
          const local = Math.min(1, Math.max(0, st.sheenT * 1.3 - i * 0.15));
          pn.uniforms.uSheen.value = st.sheenT < 1 ? -0.4 + local * 1.9 : -1;
          pn.haloMat.opacity = (0.12 + st.active * 0.22 + pulse * 0.03) * pn.glow;
          pn.frameMat.emissiveIntensity = (0.9 + st.active * 1.4) * pn.glow;
        });
      }
    },
  };
}
