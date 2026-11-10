// ==========================================================================
// Le monde des Ragondins Farfelus — entrée en 3D, rendu « peinture » (accueil)
//
// 1. Le seuil (dans index.astro, en 2D) : l'affiche de la graphiste, son miroir
//    doré, son sol en damier et son escalier ; on aperçoit ce monde à travers
//    le miroir (le canvas est masqué par la forme de l'ouverture).
// 2. Au clic, l'affiche grandit autour du miroir pendant que la caméra avance
//    (entrer()) : on plonge dans le monde.
// 3. Le monde (« monde magique du Loiret », ambiance des images envoyées par
//    l'équipe, sans en recopier aucune) : un chemin en damier traverse des
//    étangs miroirs, au milieu d'une forêt de champignons géants aux lamelles
//    orangées lumineuses. Ragondins farfelus (chapeau, baguette, pelage à
//    constellations) assis sur des nénuphars géants, libellules, papillons
//    (citron, azuré), colibris, fritillaires pintades à damier, œufs à pois,
//    lampions-champignons, cartes à jouer, lucioles. Au loin : le Loing avec
//    son petit pont, la scène et sa sphère armillaire dorée, le château de
//    Briquemault d'après la photo de l'équipe (deux tours rondes en ruine, mur
//    en briques à arcades, douves à nénuphars, lavande, peupliers), une île
//    flottante et sa cascade, des poissons fluo qui sautent, une grande lune.
//
// Rendu : matériaux physiques, HDRI, ombres, reflets dans l'eau (un seul
// miroir pour le Loing, les douves et les étangs), halo lumineux, puis un
// filtre « peinture » (Kuwahara pondéré orienté, couleurs d'illustration,
// grain de toile). La qualité s'adapte à l'appareil (allégée sur téléphone).
//
// Crédits : arbres générés avec ez-tree (MIT, Daniel Greenheck) ; herbe, fleurs,
// rochers et textures de sol issus de la démo ez-tree ; HDRI Poly Haven (CC0)
// via @pmndrs/assets. L'ancienne version stylisée est dans archives/3d/.
// ==========================================================================

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Tree } from "@dgreenheck/ez-tree";
import hdriCoucher from "@pmndrs/assets/hdri/sunset.exr.js";

export type OptionsMonde = {
  canvas: HTMLCanvasElement;
  dossierRessources: string; // herbe, rochers, textures du sol
  dejaEntre: boolean; // déjà entré pendant la visite : la caméra est tout de suite en place
  qualite?: "haute" | "basse" | null;
  surPret: () => void; // première image affichée
};

export type Monde = {
  entrer: (duree?: number) => void;
  passer: () => void;
  detruire: () => void;
};

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

function hasard(graine: number) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lisse = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const pause = () => new Promise((r) => setTimeout(r, 0));

function hdriDepuisDataUri(uri: string) {
  const binaire = atob(uri.slice(uri.indexOf(",") + 1));
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  const exr = new EXRLoader().setDataType(THREE.HalfFloatType).parse(octets.buffer);
  const tex = new THREE.DataTexture(exr.data, exr.width, exr.height, exr.format, exr.type);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.flipY = true;
  tex.needsUpdate = true;
  return tex;
}

function toile(l: number, h: number, dessin: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = l;
  c.height = h;
  dessin(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function textureNote(symbole: string) {
  return toile(128, 128, (g) => {
    g.fillStyle = "#f3e2b0";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "bold 96px serif";
    g.fillText(symbole, 64, 70);
  });
}

function textureHalo() {
  return toile(256, 256, (g) => {
    const d = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    d.addColorStop(0, "rgba(255,255,255,1)");
    d.addColorStop(0.2, "rgba(255,255,255,0.55)");
    d.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = d;
    g.fillRect(0, 0, 256, 256);
  });
}

// Faisceau de lumière volumétrique (cône additif, pointe = source)
function faisceau(couleur: THREE.Color, hauteur: number, rayon: number, intensite = 1) {
  const geo = new THREE.ConeGeometry(rayon, hauteur, 40, 1, true);
  geo.translate(0, -hauteur / 2, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uCouleur: { value: couleur }, uIntensite: { value: intensite }, uTemps: { value: 0 } },
    vertexShader: /* glsl */ `
      varying float vV; varying vec3 vN; varying vec3 vVue; varying vec3 vPos;
      void main() {
        vV = uv.y; vPos = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vVue = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCouleur; uniform float uIntensite; uniform float uTemps;
      varying float vV; varying vec3 vN; varying vec3 vVue; varying vec3 vPos;
      void main() {
        float bord = pow(abs(dot(vN, vVue)), 2.0);
        float poussiere = 0.75 + 0.25 * sin(vPos.y * 3.0 + uTemps * 0.7 + vPos.x * 2.0);
        float a = pow(vV, 1.8) * bord * 0.33 * uIntensite * poussiere;
        gl_FragColor = vec4(uCouleur * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Mesh(geo, mat);
}

// Particules lumineuses (lucioles, poussière dans la lumière)
function nuee(
  nombre: number,
  boite: { x: [number, number]; y: [number, number]; z: [number, number] },
  couleurs: THREE.Color[],
  taille: number,
  alea: () => number,
) {
  const pos = new Float32Array(nombre * 3);
  const phase = new Float32Array(nombre);
  const coul = new Float32Array(nombre * 3);
  for (let i = 0; i < nombre; i++) {
    pos[i * 3] = boite.x[0] + alea() * (boite.x[1] - boite.x[0]);
    pos[i * 3 + 1] = boite.y[0] + alea() * (boite.y[1] - boite.y[0]);
    pos[i * 3 + 2] = boite.z[0] + alea() * (boite.z[1] - boite.z[0]);
    phase[i] = alea();
    const c = couleurs[Math.floor(alea() * couleurs.length)];
    coul.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geo.setAttribute("aCouleur", new THREE.BufferAttribute(coul, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTemps: { value: 0 }, uTaille: { value: taille }, uRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aPhase; attribute vec3 aCouleur;
      uniform float uTemps; uniform float uTaille; uniform float uRatio;
      varying vec3 vCouleur; varying float vAlpha;
      void main() {
        vec3 p = position;
        p.x += sin(uTemps * 0.35 + aPhase * 6.28) * 0.6;
        p.y += sin(uTemps * 0.6 + aPhase * 12.0) * 0.35;
        p.z += cos(uTemps * 0.3 + aPhase * 9.0) * 0.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uTaille * uRatio * (6.0 / max(-mv.z, 0.4));
        vCouleur = aCouleur;
        vAlpha = clamp(0.25 + 0.75 * sin(uTemps * 1.7 + aPhase * 30.0), 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vCouleur; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d); a *= a * vAlpha;
        gl_FragColor = vec4(vCouleur * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

// Nappes de brume au ras du sol
function brume(largeur: number, profondeur: number, couleur: THREE.Color, opacite: number) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTemps: { value: 0 }, uCouleur: { value: couleur }, uOpacite: { value: opacite } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vMonde;
      void main() {
        vUv = uv; vec4 m = modelMatrix * vec4(position, 1.0); vMonde = m.xyz;
        gl_Position = projectionMatrix * viewMatrix * m;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTemps; uniform vec3 uCouleur; uniform float uOpacite;
      varying vec2 vUv; varying vec3 vMonde;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float b(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
      float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*b(p); p*=2.02; a*=0.5; } return v; }
      void main() {
        vec2 p = vMonde.xz * 0.12 + vec2(uTemps * 0.03, uTemps * 0.012);
        float n = fbm(p + fbm(p * 1.7 - uTemps * 0.02));
        float bord = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
        float a = smoothstep(0.35, 0.85, n) * bord * uOpacite;
        gl_FragColor = vec4(uCouleur, a);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(largeur, profondeur), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 5;
  return m;
}

// Vent sur l'herbe et les fleurs (inspiré de la démo ez-tree)
function ajouterVent(mat: THREE.Material, uniforms: { uTemps: { value: number } }, instancie: boolean) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTemps = uniforms.uTemps;
    shader.vertexShader =
      "uniform float uTemps;\n" +
      shader.vertexShader.replace(
        "#include <project_vertex>",
        `
        vec4 mvPosition = ${instancie ? "instanceMatrix *" : ""} vec4(transformed, 1.0);
        vec4 mondeVent = modelMatrix * mvPosition;
        float decal = sin(mondeVent.x * 0.35 + uTemps * 1.3) * cos(mondeVent.z * 0.3 + uTemps * 0.9);
        mvPosition.xz += position.y * vec2(0.18, 0.12) * decal;
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        `,
      );
  };
}

// ---------------------------------------------------------------------------
// Le monde : la clairière des Ragondins, au clair de lune
// ---------------------------------------------------------------------------

const cheminX = (z: number) => Math.sin(((1.8 - z) / 0.96) * 0.12) * 0.9;

// ---------------------------------------------------------------------------
// Champignons géants bioluminescents (d'après les références de l'équipe) :
// chapeau sombre bleu-violet piqueté de points lumineux, lamelles orange-rose
// qui rayonnent dessous, liseré lumineux, pied long et courbé.
// ---------------------------------------------------------------------------

function textureChapeau(alea: () => number, base: string, points: string) {
  const t = toile(512, 256, (g) => {
    const d = g.createLinearGradient(0, 0, 0, 256);
    d.addColorStop(0, base);
    d.addColorStop(1, "#0d0820");
    g.fillStyle = d;
    g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 2200; i++) {
      const x = alea() * 512;
      const y = alea() * 256;
      g.globalAlpha = 0.04 + alea() * 0.08;
      g.fillStyle = alea() < 0.5 ? "#000000" : "#6a7cff";
      g.fillRect(x, y, 2 + alea() * 6, 2 + alea() * 6);
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 420; i++) {
      const x = alea() * 512;
      const y = 20 + alea() * 230;
      const r = 1 + alea() * 3.2;
      g.fillStyle = points;
      g.beginPath();
      g.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function textureLamelles(alea: () => number) {
  const t = toile(1024, 128, (g) => {
    const d = g.createLinearGradient(0, 0, 0, 128);
    d.addColorStop(0, "#ffd36a"); // près du pied : jaune-orangé
    d.addColorStop(0.45, "#ff8a3d");
    d.addColorStop(1, "#ff3d8e"); // vers le bord : rose
    g.fillStyle = "#120612";
    g.fillRect(0, 0, 1024, 128);
    for (let i = 0; i < 260; i++) {
      const x = (i / 260) * 1024 + (alea() - 0.5) * 2;
      g.strokeStyle = d;
      g.globalAlpha = 0.55 + alea() * 0.45;
      g.lineWidth = 1 + alea() * 1.6;
      g.beginPath();
      g.moveTo(x, alea() * 18);
      g.lineTo(x + (alea() - 0.5) * 3, 128);
      g.stroke();
    }
    g.globalAlpha = 1;
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// Pied courbé : profil de révolution puis courbure progressive vers le haut
function geometriePied(courbure: number, direction: number) {
  const profil = [
    [0.16, 0], [0.13, 0.04], [0.105, 0.12], [0.09, 0.3], [0.082, 0.5], [0.08, 0.7], [0.086, 0.86], [0.1, 0.95], [0.14, 1.0],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(profil, 20);
  const pos = geo.attributes.position;
  const couleurs = new Float32Array(pos.count * 3);
  const bas = new THREE.Color(0x4b3a6e);
  const haut = new THREE.Color(0xf2d2c4);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const decal = courbure * y * y;
    pos.setX(i, pos.getX(i) + Math.cos(direction) * decal);
    pos.setZ(i, pos.getZ(i) + Math.sin(direction) * decal);
    c.lerpColors(bas, haut, Math.pow(y, 1.6));
    couleurs.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(couleurs, 3));
  geo.computeVertexNormals();
  return { geo, sommet: new THREE.Vector2(Math.cos(direction) * courbure, Math.sin(direction) * courbure) };
}

function ajouterChampignons(
  scene: THREE.Scene,
  alea: () => number,
  leger: boolean,
  animes: ((t: number) => void)[],
  emplacements: { x: number; z: number; geant: boolean }[],
) {
  // Chapeau (rayon 1) : dôme aplati, bord légèrement retroussé
  const chapeau = new THREE.LatheGeometry(
    [[1.0, 0.02], [1.02, 0.07], [0.97, 0.16], [0.86, 0.28], [0.68, 0.38], [0.45, 0.45], [0.22, 0.49], [0, 0.5]].map(
      ([x, y]) => new THREE.Vector2(x, y),
    ),
    48,
  );
  // Dessous : lamelles en cône très ouvert, du pied jusqu'au bord
  const dessous = new THREE.LatheGeometry(
    [[0.1, 0.13], [0.4, 0.1], [0.75, 0.05], [1.0, 0.02]].map(([x, y]) => new THREE.Vector2(x, y)),
    64,
  );
  const lisere = new THREE.TorusGeometry(1.01, 0.018, 8, 64);
  lisere.rotateX(Math.PI / 2);
  lisere.translate(0, 0.03, 0);

  const variantes = [
    { base: "#4b2a8a", points: "#e0c8ff", lueurPoints: 0xc8a8ff },
    { base: "#6a3aa0", points: "#ffd6ec", lueurPoints: 0xffb0e0 },
    { base: "#22408a", points: "#9fe8ff", lueurPoints: 0x7fdcff },
  ].map((v) => {
    const tex = textureChapeau(alea, v.base, v.points);
    return new THREE.MeshPhysicalMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color(v.lueurPoints),
      emissiveIntensity: 0.55,
      roughness: 0.5,
      sheen: 1,
      sheenColor: new THREE.Color(0x8a7cff),
      sheenRoughness: 0.5,
    });
  });
  const lamelles = textureLamelles(alea);
  const matDessous = new THREE.MeshStandardMaterial({
    color: 0x2a0c1c,
    emissive: 0xffffff,
    emissiveMap: lamelles,
    emissiveIntensity: 2.4,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  const matLisere = new THREE.MeshStandardMaterial({ color: 0xff6fae, emissive: 0xff4f9a, emissiveIntensity: 2.2 });
  const matPied = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, emissive: 0x4a1a30, emissiveIntensity: 0.7 });
  const pieds = Array.from({ length: 5 }, () => geometriePied(0.15 + alea() * 0.45, alea() * Math.PI * 2));

  // La lueur des lamelles pulse doucement
  animes.push((t) => (matDessous.emissiveIntensity = 2.9 + Math.sin(t * 0.8) * 0.4));

  let lumieres = leger ? 1 : 3;
  emplacements.forEach((e, i) => {
    const hauteur = e.geant ? 3.6 + alea() * 4.5 : 0.9 + alea() * 1.8;
    const rayon = e.geant ? hauteur * (0.28 + alea() * 0.12) : hauteur * (0.3 + alea() * 0.15);
    const pied = pieds[i % pieds.length];
    const g = new THREE.Group();

    const p = new THREE.Mesh(pied.geo, matPied);
    p.scale.set(rayon, hauteur, rayon);
    p.castShadow = true;
    g.add(p);

    const tete = new THREE.Group();
    const c = new THREE.Mesh(chapeau, variantes[Math.floor(alea() * variantes.length)]);
    c.scale.set(1, 0.85 + alea() * 0.4, 1);
    c.castShadow = true;
    tete.add(c, new THREE.Mesh(dessous, matDessous), new THREE.Mesh(lisere, matLisere));
    tete.scale.setScalar(rayon);
    tete.position.set(pied.sommet.x * rayon, hauteur * 0.985, pied.sommet.y * rayon);
    tete.rotation.set(pied.sommet.y * 0.35, alea() * 6, -pied.sommet.x * 0.35);
    g.add(tete);

    if (e.geant && lumieres > 0) {
      lumieres--;
      const l = new THREE.PointLight(0xff8a5c, 6 + hauteur * 3, hauteur * 2.4, 2);
      l.position.set(tete.position.x, hauteur * 0.8, tete.position.z);
      g.add(l);
    }
    g.position.set(e.x, 0, e.z);
    scene.add(g);
  });
}

// Petits champignons lumineux en grappes au ras du sol
function ajouterPetitsChampignons(scene: THREE.Scene, alea: () => number, leger: boolean) {
  const pied = new THREE.CylinderGeometry(0.025, 0.035, 0.22, 8);
  pied.translate(0, 0.11, 0);
  const tete = new THREE.SphereGeometry(0.09, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  tete.scale(1, 0.6, 1);
  tete.translate(0, 0.21, 0);
  const geo = mergeGeometries([pied, tete])!;
  const n = leger ? 140 : 320;
  const champs = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial(), n);
  const o = new THREE.Object3D();
  const teintes = [new THREE.Color(1.7, 1.0, 0.35), new THREE.Color(1.6, 0.75, 0.3), new THREE.Color(1.7, 1.0, 0.35), new THREE.Color(0.3, 1.1, 1.6), new THREE.Color(1.6, 0.45, 1.1)];
  let k = 0;
  while (k < n) {
    const bordure = alea() < 0.4; // une partie borde le chemin, comme des lampions
    const z0 = bordure ? -7 - alea() * 22 : 1 - alea() * 40;
    const x0 = cheminX(z0) + (alea() < 0.5 ? -1 : 1) * (bordure ? 1.6 + alea() * 0.4 : 1.8 + alea() * 9);
    if (dansEau(x0, z0, 0.6)) continue;
    const teinte = teintes[Math.floor(alea() * teintes.length)];
    const grappe = 3 + Math.floor(alea() * 6);
    for (let j = 0; j < grappe && k < n; j++, k++) {
      o.position.set(x0 + (alea() - 0.5) * 0.7, 0, z0 + (alea() - 0.5) * 0.7);
      o.rotation.set((alea() - 0.5) * 0.4, alea() * 6, (alea() - 0.5) * 0.4);
      o.scale.setScalar(0.6 + alea() * 1.6);
      o.updateMatrix();
      champs.setMatrixAt(k, o.matrix);
      champs.setColorAt(k, teinte);
    }
  }
  scene.add(champs);
}

// ---------------------------------------------------------------------------
// Le Loing enchanté : rivière bioluminescente, ragondins et faune des berges
// ---------------------------------------------------------------------------

const RIV_Z0 = -33; // le Loing coule au loin, sous un petit pont
const RIV_PENTE = 0.25; // elle traverse la vue en diagonale
const RIV_DEMI = 5; // demi-largeur
const RIV_NORME = Math.sqrt(1 + RIV_PENTE * RIV_PENTE);
const RIV_DIR = new THREE.Vector2(1, RIV_PENTE).normalize(); // sens du courant
const RIV_ANGLE = -Math.atan(RIV_PENTE);

/** Distance signée au milieu de la rivière (positive côté caméra). */
const distRiviere = (x: number, z: number) => (z - (RIV_Z0 + RIV_PENTE * x)) / RIV_NORME;
const dansRiviere = (x: number, z: number, marge = 0) => Math.abs(distRiviere(x, z)) < RIV_DEMI + marge;
const dansEau = (x: number, z: number, marge = 0) =>
  dansRiviere(x, z, marge) || dansDouves(x, z, Math.max(0, marge)) || dansEtang(x, z, Math.max(0, marge));
/** Point situé à l'abscisse x, à la distance d du milieu de la rivière. */
const pointRiviere = (x: number, d = 0) =>
  new THREE.Vector2(x - (RIV_PENTE / RIV_NORME) * d, RIV_Z0 + RIV_PENTE * x + d / RIV_NORME);

function orienterSurRiviere(o: THREE.Object3D) {
  o.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, RIV_ANGLE, 0, "YXZ"));
}

// La surface lumineuse : plancton, filaments, étincelles, sillages, ronds dans l'eau
function construireLumiereRiviere(nNageurs: number, densiteBrume: number) {
  const nageurs = Array.from({ length: nNageurs }, () => new THREE.Vector4(999, 999, 1, 0));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTemps: { value: 0 },
      uNageurs: { value: nageurs },
      uDir: { value: RIV_DIR.clone() },
      uDensite: { value: densiteBrume },
    },
    vertexShader: /* glsl */ `
      varying vec3 vMonde; varying float vDist;
      void main() {
        vec4 m = modelMatrix * vec4(position, 1.0); vMonde = m.xyz;
        vec4 mv = viewMatrix * m; vDist = length(mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      #define N ${nNageurs}
      uniform float uTemps; uniform vec4 uNageurs[N]; uniform vec2 uDir; uniform float uDensite;
      varying vec3 vMonde; varying float vDist;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float b(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
      float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*b(p); p*=2.03; a*=0.5; } return v; }
      void main() {
        vec2 p = vMonde.xz;
        float d = (p.y - (${RIV_Z0.toFixed(1)} + ${RIV_PENTE.toFixed(3)} * p.x)) / ${RIV_NORME.toFixed(4)};
        float dedans = smoothstep(${RIV_DEMI.toFixed(1)}, ${(RIV_DEMI - 1.2).toFixed(1)}, abs(d));
        vec2 courant = uDir * uTemps * 0.35;
        float n = fbm(p * 0.45 - courant);
        float n2 = fbm(p * 1.6 - courant * 1.7 + 7.0);
        vec3 col = vec3(0.0);
        col += vec3(0.03, 0.28, 0.32) * (0.4 + n);
        col += vec3(0.04, 0.6, 0.62) * smoothstep(0.42, 0.82, n) * 1.6;
        col += vec3(0.9, 0.12, 0.62) * smoothstep(0.68, 0.9, n2) * 0.6;
        vec2 cel = p * 7.0 - courant * 7.0;
        float e = h(floor(cel) + floor(uTemps * 1.3));
        col += vec3(0.4, 1.0, 0.95) * step(0.982, e) * smoothstep(0.35, 0.0, length(fract(cel) - 0.5)) * 1.2;
        col += vec3(0.1, 0.75, 0.7) * exp(-pow((abs(d) - ${(RIV_DEMI - 0.5).toFixed(1)}) * 2.2, 2.0)) * 0.3;
        for (int i = 0; i < N; i++) {
          vec2 r = p - uNageurs[i].xy;
          vec2 dir = uNageurs[i].zw;
          float le = dot(r, dir);
          float co = dot(r, vec2(-dir.y, dir.x));
          float derriere = smoothstep(0.3, -0.1, le);
          float bras = abs(abs(co) - (-le) * 0.36);
          float v = exp(-bras * bras * 26.0) * exp(le * 0.28) * derriere;
          v *= 0.55 + 0.45 * sin(-le * 8.0 + uTemps * 5.0);
          float tete = exp(-dot(r, r) * 5.0);
          col += vec3(0.25, 1.0, 0.9) * v * 3.4 + vec3(0.9, 0.5, 1.0) * tete * 1.1;
        }
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          float cycle = uTemps * 0.2 + fi * 0.37;
          float k = fract(cycle);
          float x = -10.0 + h(vec2(floor(cycle), fi)) * 20.0;
          vec2 c = vec2(x, ${RIV_Z0.toFixed(1)} + ${RIV_PENTE.toFixed(3)} * x + (h(vec2(fi, floor(cycle))) - 0.5) * 6.0);
          float rr = length(p - c);
          col += vec3(0.5, 1.0, 1.0) * exp(-pow((rr - k * 2.6) * 6.0, 2.0)) * (1.0 - k) * 0.9;
        }
        float brume = exp(-pow(uDensite * vDist, 2.0));
        gl_FragColor = vec4(col * dedans * brume, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(260, RIV_DEMI * 2, 1, 1), mat);
  orienterSurRiviere(m);
  m.position.set(0, 0.05, RIV_Z0);
  m.renderOrder = 4;
  return { maillage: m, nageurs };
}

const ShaderEau = {
  name: "EauPeinte",
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTemps: { value: 0 } },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vMonde;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vMonde = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color; uniform sampler2D tDiffuse; uniform float uTemps; varying vec4 vUv; varying vec3 vMonde;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      vec2 onde = vec2(
        sin(vMonde.x * 2.1 + uTemps * 0.9) + sin(vMonde.z * 3.3 - uTemps * 0.7),
        cos(vMonde.z * 2.7 + uTemps * 0.8) + sin(vMonde.x * 1.3 - uTemps * 0.5)) * 0.005;
      vec4 uv = vUv;
      uv.xy += onde * uv.w;
      vec3 reflet = texture2DProj(tDiffuse, uv).rgb;
      gl_FragColor = vec4(reflet * 0.85 + color, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

function construireEau(scene: THREE.Scene, leger: boolean, animes: ((t: number) => void)[]) {
  const repere = new THREE.Object3D();
  orienterSurRiviere(repere);
  repere.position.set(0, 0.03, RIV_Z0);
  repere.updateMatrix();
  const versLocal = repere.matrix.clone().invert();
  // Contours un peu irréguliers pour les douves et les étangs
  const nappe = (cx: number, cz: number, rx: number, rz: number, graine: number) => {
    const forme = new THREE.Shape();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const f = 1 + 0.07 * Math.sin(a * 3 + graine) + 0.04 * Math.sin(a * 7 + graine * 2);
      const x = cx + Math.cos(a) * rx * f;
      const y = -(cz + Math.sin(a) * rz * f);
      if (i === 0) forme.moveTo(x, y);
      else forme.lineTo(x, y);
    }
    const g = new THREE.ShapeGeometry(forme, 4);
    g.rotateX(-Math.PI / 2); // (x, y) -> (x, 0, -y)
    g.translate(0, 0.03, 0);
    return g.applyMatrix4(versLocal);
  };
  const geo = mergeGeometries([
    new THREE.PlaneGeometry(260, RIV_DEMI * 2 + 0.6),
    nappe(DOUVES.x, DOUVES.z, DOUVES.rx, DOUVES.rz, 1),
    ...ETANGS.map((e, i) => nappe(e.x, e.z, e.rx, e.rz, 2 + i * 1.7)),
  ])!;
  const eau = new Reflector(geo, {
    textureWidth: Math.floor(window.innerWidth * (leger ? 0.35 : 0.5)),
    textureHeight: Math.floor(window.innerHeight * (leger ? 0.35 : 0.5)),
    color: 0x05030c,
    clipBias: 0.003,
    shader: ShaderEau,
  });
  orienterSurRiviere(eau);
  eau.position.set(0, 0.03, RIV_Z0);
  scene.add(eau);
  animes.push((t) => ((eau.material as THREE.ShaderMaterial).uniforms.uTemps.value = t));
}

// Ragondin (Myocastor coypus) : corps trapu, tête ronde, dents orange, moustaches
function matieresRagondin() {
  return {
    fourrure: new THREE.MeshPhysicalMaterial({ color: 0x6e5238, roughness: 0.9, sheen: 0.8, sheenColor: new THREE.Color(0xa88462), sheenRoughness: 0.6 }),
    museau: new THREE.MeshPhysicalMaterial({ color: 0x8d7563, roughness: 0.85, sheen: 0.8, sheenColor: new THREE.Color(0xd8c0a8) }),
    dents: new THREE.MeshStandardMaterial({ color: 0xff8a1c, emissive: 0xff6a00, emissiveIntensity: 2.2, roughness: 0.35 }),
    oeil: new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0xffc35a, emissiveIntensity: 2.4, roughness: 0.1 }),
    queue: new THREE.MeshStandardMaterial({ color: 0x2c221c, roughness: 0.7 }),
    moustache: new THREE.LineBasicMaterial({ color: 0xe8e0d0, transparent: true, opacity: 0.8 }),
  };
}

function creerRagondin(m: ReturnType<typeof matieresRagondin>) {
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.SphereGeometry(0.22, 22, 16), m.fourrure);
  corps.scale.set(1, 0.82, 1.5);
  corps.position.set(0, 0.18, 0);
  corps.castShadow = true;
  const tete = new THREE.Group();
  tete.position.set(0, 0.25, 0.34);
  const crane = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 14), m.fourrure);
  crane.scale.set(1, 0.9, 1.2);
  const museau = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), m.museau);
  museau.scale.set(1.15, 0.85, 1);
  museau.position.set(0, -0.025, 0.12);
  const oreilles = [-1, 1].map((s) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), m.fourrure);
    o.position.set(s * 0.075, 0.08, -0.03);
    return o;
  });
  const yeux = [-1, 1].map((s) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 8), m.oeil);
    o.position.set(s * 0.068, 0.045, 0.075);
    return o;
  });
  const dents = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.05, 0.014), m.dents);
  dents.position.set(0, -0.08, 0.18);
  const lignes: number[] = [];
  for (const s of [-1, 1])
    for (let k = 0; k < 3; k++) lignes.push(s * 0.05, -0.03, 0.17, s * 0.2, -0.05 + k * 0.035, 0.2 + k * 0.02);
  const moustaches = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(lignes, 3)), m.moustache);
  tete.add(crane, museau, ...oreilles, ...yeux, dents, moustaches);
  const queue = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.035, 0.42, 8), m.queue);
  queue.rotation.x = Math.PI / 2 - 0.25;
  queue.position.set(0, 0.1, -0.5);
  g.add(corps, tete, queue);
  return { groupe: g, tete };
}

// Héron cendré, immobile dans les eaux peu profondes
function creerHeron() {
  const plume = new THREE.MeshStandardMaterial({ color: 0x8e9aac, roughness: 0.85 });
  const fonce = new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: 0.8 });
  const bec = new THREE.MeshStandardMaterial({ color: 0xe0a83c, roughness: 0.5 });
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const patte = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.95, 6), fonce);
    patte.position.set(s * 0.05, 0.47, 0);
    g.add(patte);
  }
  const corps = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), plume);
  corps.scale.set(0.9, 0.85, 1.75);
  corps.position.set(0, 1.04, -0.02);
  corps.rotation.x = 0.35;
  corps.castShadow = true;
  const cou = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.12, 0.2),
        new THREE.Vector3(0, 1.3, 0.3),
        new THREE.Vector3(0, 1.42, 0.2),
        new THREE.Vector3(0, 1.58, 0.28),
      ]),
      20,
      0.035,
      8,
    ),
    plume,
  );
  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), plume);
  tete.position.set(0, 1.6, 0.31);
  const huppe = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.008, 0.14, 4), fonce);
  huppe.rotation.x = -1.3;
  huppe.position.set(0, 1.62, 0.22);
  const pointe = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.23, 8), bec);
  pointe.rotation.x = Math.PI / 2;
  pointe.position.set(0, 1.59, 0.45);
  g.add(corps, cou, tete, huppe, pointe);
  return g;
}

// Chevreuil qui broute à l'orée du bois
function creerChevreuil() {
  const robe = new THREE.MeshStandardMaterial({ color: 0x7a5034, roughness: 0.9 });
  const fonce = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.8 });
  const blanc = new THREE.MeshStandardMaterial({ color: 0xe8dccb, roughness: 0.9 });
  const g = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 6, 14), robe);
  corps.rotation.x = Math.PI / 2;
  corps.position.set(0, 0.85, 0);
  corps.castShadow = true;
  g.add(corps);
  for (const [x, z] of [[-0.11, 0.3], [0.11, 0.3], [-0.11, -0.3], [0.11, -0.3]]) {
    const patte = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.78, 6), fonce);
    patte.position.set(x, 0.39, z);
    g.add(patte);
  }
  const miroir = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), blanc);
  miroir.position.set(0, 0.92, -0.42);
  g.add(miroir);
  const avant = new THREE.Group();
  avant.position.set(0, 0.98, 0.36);
  const cou = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.45, 8), robe);
  cou.position.set(0, 0.18, 0.06);
  cou.rotation.x = 0.4;
  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), robe);
  tete.scale.set(0.9, 0.9, 1.5);
  tete.position.set(0, 0.42, 0.18);
  const museau = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), fonce);
  museau.position.set(0, 0.39, 0.32);
  const oreilles = [-1, 1].map((s) => {
    const o = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 6), robe);
    o.position.set(s * 0.07, 0.52, 0.12);
    o.rotation.z = -s * 0.5;
    return o;
  });
  avant.add(cou, tete, museau, ...oreilles);
  g.add(avant);
  return { groupe: g, avant };
}

// Roseaux et massettes lumineuses le long des berges
function ajouterRoseaux(
  scene: THREE.Scene,
  alea: () => number,
  n: number,
  vent: { uTemps: { value: number } },
  tirage?: () => THREE.Vector2,
) {
  const tige = new THREE.ConeGeometry(0.014, 1.35, 4);
  tige.translate(0, 0.675, 0);
  const matTige = new THREE.MeshStandardMaterial({ color: 0x2c4a2c, roughness: 0.8 });
  ajouterVent(matTige, vent, true);
  const tiges = new THREE.InstancedMesh(tige, matTige, n);
  const nTetes = Math.floor(n * 0.22);
  const tete = new THREE.CylinderGeometry(0.03, 0.03, 0.17, 8);
  tete.translate(0, 1.18, 0);
  const matTete = new THREE.MeshBasicMaterial();
  ajouterVent(matTete, vent, true);
  const tetes = new THREE.InstancedMesh(tete, matTete, nTetes);
  const teintes = [new THREE.Color(0.3, 1.6, 1.5), new THREE.Color(1.9, 0.5, 1.3), new THREE.Color(1.6, 1.2, 0.4)];
  const o = new THREE.Object3D();
  let k = 0;
  let kt = 0;
  while (k < n) {
    const p = tirage ? tirage() : pointRiviere((alea() - 0.5) * 70, (alea() < 0.5 ? -1 : 1) * (RIV_DEMI - 0.6 + alea() * 1.8));
    if (Math.abs(p.x - cheminX(p.y)) < 1.7) continue;
    const touffe = 4 + Math.floor(alea() * 8);
    for (let j = 0; j < touffe && k < n; j++, k++) {
      o.position.set(p.x + (alea() - 0.5) * 0.8, 0, p.y + (alea() - 0.5) * 0.8);
      o.rotation.set((alea() - 0.5) * 0.25, alea() * 6, (alea() - 0.5) * 0.25);
      o.scale.set(1, 0.6 + alea() * 0.9, 1);
      o.updateMatrix();
      tiges.setMatrixAt(k, o.matrix);
      if (kt < nTetes && alea() < 0.3) {
        tetes.setMatrixAt(kt, o.matrix);
        tetes.setColorAt(kt, teintes[Math.floor(alea() * teintes.length)]);
        kt++;
      }
    }
  }
  tetes.count = kt;
  scene.add(tiges, tetes);
}

// Nénuphars, dont certains en fleur et lumineux
function ajouterNenuphars(scene: THREE.Scene, alea: () => number, n: number, tirage?: () => THREE.Vector2) {
  const feuille = new THREE.CircleGeometry(0.34, 20, 0.3, Math.PI * 2 - 0.45);
  feuille.rotateX(-Math.PI / 2);
  const feuilles = new THREE.InstancedMesh(feuille, new THREE.MeshStandardMaterial({ color: 0x1f4c32, roughness: 0.35, side: THREE.DoubleSide }), n);
  const petales = Array.from({ length: 9 }, (_, k) => {
    const petale = new THREE.PlaneGeometry(0.05, 0.12);
    petale.translate(0, 0.06, 0);
    petale.rotateX(-0.75 - (k % 2) * 0.35);
    petale.rotateY((k / 9) * Math.PI * 2);
    return petale;
  });
  const coeur = new THREE.SphereGeometry(0.025, 8, 6);
  coeur.deleteAttribute("uv");
  petales.forEach((g) => g.deleteAttribute("uv"));
  const fleur = mergeGeometries([...petales, coeur])!;
  fleur.translate(0, 0.02, 0);
  const nFleurs = Math.floor(n * 0.4);
  const fleurs = new THREE.InstancedMesh(fleur, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), nFleurs);
  const teintes = [new THREE.Color(2.2, 0.7, 1.5), new THREE.Color(1.9, 1.8, 1.6), new THREE.Color(0.4, 1.6, 1.9)];
  const o = new THREE.Object3D();
  let kf = 0;
  for (let i = 0; i < n; i++) {
    const p = tirage ? tirage() : pointRiviere((alea() - 0.5) * 34, (alea() < 0.5 ? -1 : 1) * (2.2 + alea() * 2.4));
    o.position.set(p.x, 0.055, p.y);
    o.rotation.set(0, alea() * 6, 0);
    o.scale.setScalar(0.6 + alea() * 0.9);
    o.updateMatrix();
    feuilles.setMatrixAt(i, o.matrix);
    if (kf < nFleurs && alea() < 0.45) {
      fleurs.setMatrixAt(kf, o.matrix);
      fleurs.setColorAt(kf, teintes[Math.floor(alea() * teintes.length)]);
      kf++;
    }
  }
  fleurs.count = kf;
  scene.add(feuilles, fleurs);
}

// Petit pont de bois en arc, là où le chemin franchit la rivière
function construirePont(scene: THREE.Scene, leger: boolean) {
  const bois = new THREE.MeshStandardMaterial({ color: 0x3e2a1c, roughness: 0.85 });
  const lanterne = new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffa040, emissiveIntensity: 3 });
  const zA = RIV_Z0 + (RIV_DEMI + 1.6) * RIV_NORME;
  const zB = RIV_Z0 - (RIV_DEMI + 1.6) * RIV_NORME;
  const point = (t: number, dx = 0, dy = 0) => {
    const z = zA + (zB - zA) * t;
    return new THREE.Vector3(cheminX(z) + dx, 0.06 + 1.15 * Math.sin(Math.PI * t) + dy, z);
  };
  const n = 46;
  const planche = new THREE.BoxGeometry(2.1, 0.07, 0.25);
  const planches = new THREE.InstancedMesh(planche, bois, n);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    o.position.copy(point(t));
    o.lookAt(point(Math.min(1, t + 0.01)).add(new THREE.Vector3(0, 0, t >= 1 ? -0.01 : 0)));
    o.updateMatrix();
    planches.setMatrixAt(i, o.matrix);
  }
  planches.castShadow = planches.receiveShadow = true;
  scene.add(planches);
  for (const cote of [-1, 1]) {
    const rampe = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => point(i / 11, cote * 1.0, 0.95))), 64, 0.035, 8),
      bois,
    );
    scene.add(rampe);
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const bas = point(t, cote * 1.0);
      const poteau = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.0, 8), bois);
      poteau.position.set(bas.x, bas.y + 0.5, bas.z);
      scene.add(poteau);
      if (i === 0 || i === 6) {
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), lanterne);
        globe.position.set(bas.x, bas.y + 1.1, bas.z);
        scene.add(globe);
      }
    }
  }
  if (!leger) {
    const l = new THREE.PointLight(0xffb060, 5, 10, 2);
    l.position.copy(point(0.5, 0, 1.6));
    scene.add(l);
  }
}

function ajouterLoing(
  scene: THREE.Scene,
  alea: () => number,
  leger: boolean,
  animes: ((t: number) => void)[],
  vent: { uTemps: { value: number } },
  densiteBrume: number,
) {
  construireEau(scene, leger, animes);
  for (const [x, couleur] of (leger ? [[2, 0x3fe0d0]] : [[-4, 0x3fe0d0], [7, 0xb070ff]]) as [number, number][]) {
    const p = pointRiviere(x, 1.5);
    const l = new THREE.PointLight(couleur, 7, 16, 2);
    l.position.set(p.x, 0.6, p.y);
    scene.add(l);
  }
  const nNageurs = leger ? 4 : 6;
  const lumiere = construireLumiereRiviere(nNageurs, densiteBrume);
  scene.add(lumiere.maillage);
  animes.push((t) => ((lumiere.maillage.material as THREE.ShaderMaterial).uniforms.uTemps.value = t));

  construirePont(scene, leger);
  ajouterRoseaux(scene, alea, leger ? 320 : 760, vent);
  ajouterNenuphars(scene, alea, leger ? 30 : 60);

  // Ragondins qui nagent en laissant un sillage de lumière
  const mats = matieresRagondin();
  mats.fourrure = matieresRagondinMagique(alea).pelage;
  for (let i = 0; i < nNageurs; i++) {
    const { groupe, tete } = creerRagondin(mats);
    tete.position.y += 0.1;
    tete.rotation.x = -0.45;
    groupe.scale.setScalar(2.0);
    const sens = i % 3 === 2 ? 1 : -1; // la plupart remontent vers nous
    const vitesse = (0.45 + alea() * 0.35) * sens;
    const decalage = -1 + alea() * 4.2;
    const phase = alea() * 60;
    animes.push((t) => {
      const x = (((t * vitesse + phase) % 36) + 36) % 36 - 18;
      const d = decalage + Math.sin(t * 0.3 + i) * 0.5;
      const p = pointRiviere(x, d);
      const dir = RIV_DIR.clone().multiplyScalar(sens);
      const plongee = 1 - THREE.MathUtils.smoothstep(Math.abs(x), 15, 18);
      groupe.position.set(p.x, -1.12 + 0.62 * plongee + Math.sin(t * 2.2 + i) * 0.015, p.y);
      groupe.rotation.y = Math.atan2(dir.x, dir.y);
      lumiere.nageurs[i].set(p.x, p.y, dir.x, dir.y);
    });
    scene.add(groupe);
  }

  // Ragondins sur les berges, qui grignotent
  const surBerge: [number, number, number][] = [
    [4.2, RIV_DEMI + 0.8, 2.8],
    [7.4, RIV_DEMI + 1.0, -2.6],
    [5.5, -(RIV_DEMI + 0.9), 0.4],
    [10.5, -(RIV_DEMI + 1.1), 1.2],
  ];
  surBerge.forEach(([x, d, angle], i) => {
    const { groupe, tete } = creerRagondin(mats);
    const p = pointRiviere(x, d);
    groupe.position.set(p.x, 0, p.y);
    groupe.rotation.y = angle;
    groupe.scale.setScalar(1.8);
    animes.push((t) => {
      tete.rotation.x = 0.15 + Math.max(0, Math.sin(t * 2.4 + i * 2)) * 0.35;
      tete.rotation.y = Math.sin(t * 0.5 + i) * 0.3;
    });
    scene.add(groupe);
  });

  // Héron dans les eaux peu profondes
  const heron = creerHeron();
  const ph = pointRiviere(9, RIV_DEMI - 0.9);
  heron.position.set(ph.x, 0, ph.y);
  heron.rotation.y = -2.3;
  scene.add(heron);

  // Chevreuil qui broute sur l'autre rive
  const chevreuil = creerChevreuil();
  const pc = pointRiviere(13, -(RIV_DEMI + 2.6));
  chevreuil.groupe.position.set(pc.x, 0, pc.y);
  chevreuil.groupe.rotation.y = 0.6;
  chevreuil.groupe.scale.setScalar(1.1);
  animes.push((t) => {
    const broute = Math.max(0, Math.sin(t * 0.35));
    chevreuil.avant.rotation.x = broute * 1.05;
  });
  scene.add(chevreuil.groupe);

  // Lanternes qui dérivent au fil de l'eau
  const papier = new THREE.MeshStandardMaterial({ color: 0xffe2b8, emissive: 0xff9a40, emissiveIntensity: 2.4 });
  const socle = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.8 });
  for (let i = 0; i < (leger ? 6 : 10); i++) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 10), socle);
    const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.2, 10), papier);
    corps.position.y = 0.13;
    g.add(base, corps);
    const decalage = (alea() - 0.5) * 7;
    const phase = alea() * 70;
    animes.push((t) => {
      const x = ((t * 0.22 + phase) % 70) - 35;
      const p = pointRiviere(x, decalage + Math.sin(t * 0.2 + i) * 0.4);
      g.position.set(p.x, 0.04 + Math.sin(t * 1.6 + i) * 0.02, p.y);
      g.rotation.set(Math.sin(t * 1.3 + i) * 0.05, t * 0.1 + i, Math.cos(t * 1.1 + i) * 0.05);
    });
    scene.add(g);
  }

  // Chouettes : des yeux dorés qui clignent dans les arbres
  const oeil = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.7, 0.35) });
  const geoOeil = new THREE.SphereGeometry(0.035, 8, 6);
  for (let i = 0; i < (leger ? 4 : 7); i++) {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const o = new THREE.Mesh(geoOeil, oeil);
      o.position.x = s * 0.06;
      g.add(o);
    }
    let x = 0;
    let z = 0;
    do {
      x = (alea() - 0.5) * 50;
      z = -6 - alea() * 40;
    } while (dansEau(x, z, 3) || Math.abs(x - cheminX(z)) < 4);
    g.position.set(x, 3.5 + alea() * 5, z);
    g.lookAt(0, 2, 0);
    const p = alea() * 20;
    animes.push((t) => {
      const cycle = (t + p) % 6;
      g.scale.y = cycle < 0.15 ? 0.1 : 1;
    });
    scene.add(g);
  }
}

// ---------------------------------------------------------------------------
// Le petit peuple magique : ragondins farfelus, libellules, papillons,
// colibris, fritillaires à damier, château fort, cascade et poissons fluo.
// ---------------------------------------------------------------------------

function textureCarte(symbole: string, couleur: string) {
  return toile(200, 280, (g) => {
    const arrondi = (x: number, y: number, l: number, h: number, r: number) => {
      g.beginPath();
      if (g.roundRect) g.roundRect(x, y, l, h, r);
      else g.rect(x, y, l, h);
    };
    g.fillStyle = "#f6eedb";
    arrondi(4, 4, 192, 272, 18);
    g.fill();
    g.strokeStyle = "#b8904f";
    g.lineWidth = 6;
    arrondi(16, 16, 168, 248, 12);
    g.stroke();
    g.fillStyle = couleur;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "bold 120px serif";
    g.fillText(symbole, 100, 146);
    g.font = "bold 40px serif";
    g.fillText(symbole, 44, 52);
  });
}

// Pelage magique : quelques taches lumineuses roses et turquoise, comme des constellations
function texturePelage(alea: () => number) {
  const t = toile(512, 256, (g) => {
    g.fillStyle = "#000000";
    g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 26; i++) {
      // petites constellations de 3 à 5 points
      const cx = alea() * 512;
      const cy = 50 + alea() * 160;
      const c = alea() < 0.6 ? "255,150,205" : "110,240,225";
      for (let k = 0; k < 3 + Math.floor(alea() * 3); k++) {
        const x = cx + (alea() - 0.5) * 34;
        const y = cy + (alea() - 0.5) * 22;
        const r = 1.2 + alea() * 2.2;
        const d = g.createRadialGradient(x, y, 0, x, y, r * 2.4);
        d.addColorStop(0, `rgba(${c},1)`);
        d.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = d;
        g.beginPath();
        g.arc(x, y, r * 2.4, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// Liseré lumineux sur les contours (effet « fourrure enchantée »)
function ajouterLisere(mat: THREE.Material, couleur: THREE.Color, force: number) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLisere = { value: couleur.clone().multiplyScalar(force) };
    shader.fragmentShader = ("uniform vec3 uLisere;\n" + shader.fragmentShader).replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
       float rebord = 1.0 - abs(dot(normal, normalize(vViewPosition)));
       totalEmissiveRadiance += uLisere * pow(rebord, 3.5);`,
    );
  };
}

function matieresRagondinMagique(alea: () => number) {
  const taches = texturePelage(alea);
  const pelage = new THREE.MeshPhysicalMaterial({
    color: 0x8a6448,
    roughness: 0.8,
    sheen: 1,
    sheenColor: new THREE.Color(0xffc8b0),
    sheenRoughness: 0.4,
    emissive: 0xffffff,
    emissiveMap: taches,
    emissiveIntensity: 0.8,
  });
  ajouterLisere(pelage, new THREE.Color(1.0, 0.45, 0.75), 0.5);
  const ventre = new THREE.MeshPhysicalMaterial({ color: 0xd8b898, roughness: 0.75, sheen: 1, sheenColor: new THREE.Color(0xfff0e0) });
  ajouterLisere(ventre, new THREE.Color(1.0, 0.8, 0.6), 0.4);
  return {
    pelage,
    ventre,
    nez: new THREE.MeshStandardMaterial({ color: 0x4a1a2c, roughness: 0.3, emissive: 0xff6fae, emissiveIntensity: 0.45 }),
    dents: new THREE.MeshStandardMaterial({ color: 0xff8a1c, emissive: 0xff6a00, emissiveIntensity: 2.2, roughness: 0.3 }),
    oeil: new THREE.MeshPhysicalMaterial({ color: 0x0a0604, emissive: 0xffb43a, emissiveIntensity: 1.1, roughness: 0.05, clearcoat: 1 }),
    reflet: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.5, 2.5) }),
    moustache: new THREE.LineBasicMaterial({ color: 0xfff0dc, transparent: true, opacity: 0.5 }),
    chapeau: new THREE.MeshPhysicalMaterial({ color: 0x0b3a36, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0x3fd0b0) }),
    ruban: new THREE.MeshStandardMaterial({ color: 0xffa0cb, emissive: 0xff70b0, emissiveIntensity: 1.2 }),
    baguette: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3 }),
    etoile: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 1.6) }),
  };
}

// Ragondin farfelu assis, en forme de poire, qui fait sa toilette (ou un tour de magie)
function creerRagondinMagique(m: ReturnType<typeof matieresRagondinMagique>, magicien: boolean) {
  const g = new THREE.Group();
  const profil = [
    [0.0, 0.0], [0.17, 0.02], [0.27, 0.1], [0.31, 0.24], [0.29, 0.38], [0.23, 0.52], [0.16, 0.62], [0.08, 0.68], [0.0, 0.7],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const corps = new THREE.Mesh(new THREE.LatheGeometry(profil, 32), m.pelage);
  corps.scale.set(1, 1, 0.9);
  const ventre = new THREE.Mesh(new THREE.SphereGeometry(0.21, 22, 16), m.ventre);
  ventre.scale.set(0.95, 1.2, 0.6);
  ventre.position.set(0, 0.3, 0.14);
  const pieds = [-1, 1].map((s) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), m.pelage);
    p.scale.set(1, 0.5, 1.7);
    p.position.set(s * 0.14, 0.035, 0.2);
    return p;
  });
  const queue = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.06, -0.2), new THREE.Vector3(0.12, 0.03, -0.45), new THREE.Vector3(0.36, 0.05, -0.6), new THREE.Vector3(0.5, 0.14, -0.62)]),
      20,
      0.028,
      8,
    ),
    m.nez,
  );
  const tete = new THREE.Group();
  tete.position.set(0, 0.74, 0.03);
  const crane = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 20), m.pelage);
  crane.scale.set(1.05, 0.95, 1.05);
  const joues = [-1, 1].map((s) => {
    const j = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), m.ventre);
    j.position.set(s * 0.065, -0.06, 0.11);
    return j;
  });
  const museau = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), m.ventre);
  museau.scale.set(1.3, 0.95, 1.35);
  museau.position.set(0, -0.035, 0.17);
  const nez = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), m.nez);
  nez.scale.set(1.3, 0.8, 1);
  nez.position.set(0, -0.01, 0.245);
  const oreilles = [-1, 1].map((s) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 8), m.pelage);
    o.scale.set(1, 1, 0.55);
    o.position.set(s * 0.125, 0.11, -0.01);
    return o;
  });
  const yeux = [-1, 1].flatMap((s) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), m.oeil);
    o.position.set(s * 0.075, 0.035, 0.13);
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), m.reflet);
    r.position.set(s * 0.075 + 0.012, 0.05, 0.163);
    return [o, r];
  });
  const dents = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.06, 0.018), m.dents);
  dents.position.set(0, -0.1, 0.205);
  const lignes: number[] = [];
  for (const s of [-1, 1])
    for (let k = 0; k < 3; k++) lignes.push(s * 0.07, -0.04, 0.22, s * 0.22, -0.065 + k * 0.035, 0.23 + k * 0.015);
  const moustaches = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(lignes, 3)), m.moustache);
  tete.add(crane, ...joues, museau, nez, ...oreilles, ...yeux, dents, moustaches);
  if (magicien) {
    const chapeau = new THREE.Group();
    const bord = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.018, 28), m.chapeau);
    const forme = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.22, 28), m.chapeau);
    forme.position.y = 0.11;
    const ruban = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.035, 28), m.ruban);
    ruban.position.y = 0.03;
    chapeau.add(bord, forme, ruban);
    chapeau.position.set(0.03, 0.14, -0.01);
    chapeau.rotation.z = -0.25;
    tete.add(chapeau);
  }
  const bras = [-1, 1].map((s) => {
    const b = new THREE.Group();
    const membre = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.13, 4, 10), m.pelage);
    membre.position.y = -0.085;
    b.add(membre);
    b.position.set(s * 0.15, 0.55, 0.17);
    b.rotation.set(-1.1, 0, s * 0.45);
    return b;
  });
  let pointe: THREE.Object3D | null = null;
  if (magicien) {
    const baguette = new THREE.Group();
    const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), m.baguette);
    tige.position.y = -0.15;
    const bout = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.04, 6), m.etoile);
    bout.position.y = -0.3;
    baguette.add(tige, bout);
    baguette.position.y = -0.16;
    baguette.rotation.x = 0.6;
    bras[1].add(baguette);
    pointe = bout;
  }
  [corps, crane].forEach((o) => (o.castShadow = true));
  g.add(corps, ventre, ...pieds, queue, tete, ...bras);
  return { groupe: g, tete, bras, pointe };
}

function ajouterRagondinsMagiques(scene: THREE.Scene, alea: () => number, animes: ((t: number) => void)[]) {
  const m = matieresRagondinMagique(alea);
  const camera = new THREE.Vector2(0, -4.5);
  const places: [number, number, number, boolean][] = [
    [-4.6, -10.5, 1.25, true],
    [5.4, -12, 1.15, false],
    [-7.2, -16.5, 1.3, false],
    [7.8, -18, 1.35, true],
    [5, -20, 1.0, false],
    [-5.4, -24, 1.1, false],
  ];
  const position = new THREE.Vector3();
  const matFeuille = new THREE.MeshStandardMaterial({ color: 0x1f5a38, roughness: 0.85, envMapIntensity: 0.2, emissive: 0x0c3a24, emissiveIntensity: 0.6, side: THREE.DoubleSide });
  const matBord = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 0.7, 1.3) });
  const feuilleGeo = new THREE.CircleGeometry(0.62, 32, 0.25, Math.PI * 2 - 0.4);
  feuilleGeo.rotateX(-Math.PI / 2);
  const bordGeo = new THREE.TorusGeometry(0.62, 0.012, 4, 40, Math.PI * 2 - 0.4);
  bordGeo.rotateZ(0.25);
  bordGeo.rotateX(-Math.PI / 2);
  places.forEach(([px, z, taille, magicien], i) => {
    const { groupe, tete, bras, pointe } = creerRagondinMagique(m, magicien);
    const feuille = new THREE.Group();
    feuille.add(new THREE.Mesh(feuilleGeo, matFeuille), new THREE.Mesh(bordGeo, matBord));
    feuille.position.set(px, 0.05, z);
    feuille.rotation.y = alea() * 6;
    feuille.scale.setScalar(taille);
    scene.add(feuille);
    groupe.position.set(px, 0.06, z);
    groupe.rotation.y = Math.atan2(camera.x - px, camera.y - z) + (alea() - 0.5) * 0.6;
    groupe.scale.setScalar(taille);
    scene.add(groupe);
    // Petite aura scintillante
    const aura = nuee(14, { x: [-0.6, 0.6], y: [0.2, 1.3], z: [-0.6, 0.6] }, [new THREE.Color(2.2, 1.0, 1.6), new THREE.Color(1.0, 2.0, 1.8)], 0.35, alea);
    groupe.add(aura);
    // Les magiciens font jaillir des étincelles du bout de leur baguette
    let etincelles: THREE.Points | null = null;
    if (pointe) {
      etincelles = nuee(18, { x: [-0.08, 0.08], y: [-0.08, 0.08], z: [-0.08, 0.08] }, [new THREE.Color(3, 2.5, 1.4), new THREE.Color(2.6, 1.2, 2.0)], 0.25, alea);
      scene.add(etincelles);
    }
    const p = i * 1.7;
    animes.push((t) => {
      (aura.material as THREE.ShaderMaterial).uniforms.uTemps.value = t;
      tete.rotation.set(0.1 + Math.sin(t * 0.7 + p) * 0.12, Math.sin(t * 0.45 + p) * 0.35, Math.sin(t * 0.6 + p) * 0.12);
      if (pointe && etincelles) {
        // tour de magie : la baguette décrit de petits cercles
        bras[1].rotation.set(-1.5 + Math.sin(t * 2.2 + p) * 0.35, Math.cos(t * 2.2 + p) * 0.3, 0.45);
        bras[0].rotation.x = -1.1;
        pointe.getWorldPosition(position);
        etincelles.position.copy(position);
        (etincelles.material as THREE.ShaderMaterial).uniforms.uTemps.value = t * 3;
      } else {
        const toilette = Math.max(0, Math.sin(t * 0.5 + p));
        bras.forEach((b, k) => {
          b.rotation.x = -1.1 - toilette * 0.7 + Math.sin(t * 7 + k) * 0.18 * toilette;
        });
      }
      feuille.position.y = 0.05 + Math.sin(t * 0.8 + p) * 0.012;
      groupe.position.y = feuille.position.y + 0.01 + Math.abs(Math.sin(t * 1.3 + p)) * 0.02;
    });
  });
}

// Libellules aux ailes bleu nuit irisées
function ajouterLibellules(scene: THREE.Scene, alea: () => number, leger: boolean, animes: ((t: number) => void)[]) {
  const corpsMat = new THREE.MeshPhysicalMaterial({ color: 0x1fb8a8, metalness: 0.6, roughness: 0.25, emissive: 0x0a6a62, emissiveIntensity: 0.6, iridescence: 1 });
  const aileMat = new THREE.MeshPhysicalMaterial({
    color: 0x3a6cff,
    emissive: 0x2244ff,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
    iridescence: 1,
    roughness: 0.2,
  });
  const aile = new THREE.PlaneGeometry(0.17, 0.045);
  aile.translate(0.085, 0, 0);
  aile.rotateX(-Math.PI / 2);
  for (let i = 0; i < (leger ? 5 : 10); i++) {
    const g = new THREE.Group();
    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), corpsMat);
    thorax.scale.set(1, 1, 1.5);
    const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.008, 0.32, 6), corpsMat);
    abdomen.rotation.x = Math.PI / 2;
    abdomen.position.z = -0.19;
    const tete = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), corpsMat);
    tete.position.z = 0.05;
    g.add(thorax, abdomen, tete);
    const ailes: THREE.Mesh[] = [];
    for (const s of [-1, 1])
      for (const dz of [0.012, -0.025]) {
        const a = new THREE.Mesh(aile, aileMat);
        a.position.set(0, 0.012, dz);
        a.scale.x = s;
        a.rotation.y = s * (dz > 0 ? -0.15 : 0.15);
        ailes.push(a);
        g.add(a);
      }
    const z0 = -6 - alea() * 22;
    const base = new THREE.Vector3(cheminX(z0) + (alea() - 0.5) * 7, 0.8 + alea() * 1.6, z0);
    const p = alea() * 10;
    const v = 0.5 + alea() * 0.5;
    const precedent = new THREE.Vector3();
    g.scale.setScalar(1.6);
    animes.push((t) => {
      precedent.copy(g.position);
      g.position.set(
        base.x + Math.sin(t * v + p) * 2.2 + Math.sin(t * v * 2.7 + p) * 0.5,
        base.y + Math.sin(t * v * 1.3 + p) * 0.35,
        base.z + Math.cos(t * v * 0.8 + p) * 1.8,
      );
      const dx = g.position.x - precedent.x;
      const dz = g.position.z - precedent.z;
      if (Math.abs(dx) + Math.abs(dz) > 1e-4) g.rotation.y = Math.atan2(dx, dz);
      ailes.forEach((a, k) => (a.rotation.z = Math.sin(t * 55 + k * 1.3) * 0.5 * a.scale.x));
    });
    scene.add(g);
  }
}

// Papillons : citron, bleu et rose, qui battent des ailes en voletant
function texturePapillon(fond: string, bord: string, points: string) {
  const t = toile(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = fond;
    g.beginPath();
    g.moveTo(4, 128);
    g.bezierCurveTo(30, 10, 200, -10, 250, 70);
    g.bezierCurveTo(240, 120, 180, 128, 150, 132);
    g.bezierCurveTo(230, 150, 220, 250, 140, 246);
    g.bezierCurveTo(90, 240, 30, 190, 4, 128);
    g.fill();
    g.lineWidth = 14;
    g.strokeStyle = bord;
    g.stroke();
    g.fillStyle = points;
    for (const [x, y, r] of [[200, 70, 12], [170, 200, 10], [120, 60, 7], [215, 105, 6]]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  });
  return t;
}

function ajouterPapillons(scene: THREE.Scene, alea: () => number, leger: boolean, animes: ((t: number) => void)[]) {
  const modeles = [
    texturePapillon("#e8f57a", "#c8d850", "#ff9a3c"),
    texturePapillon("#4a7dff", "#0b1a4a", "#bfe6ff"),
    texturePapillon("#ffa0cb", "#5a1a3a", "#fff6d8"),
    texturePapillon("#7ff3d8", "#0b3a36", "#ffa0cb"),
  ].map((tex) => new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.6 }));
  const aile = new THREE.PlaneGeometry(0.16, 0.16);
  aile.translate(0.08, 0, 0);
  aile.rotateX(Math.PI / 2); // l'aile avant vers la tête
  const corpsMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.6 });
  for (let i = 0; i < (leger ? 8 : 16); i++) {
    const g = new THREE.Group();
    const corps = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.07, 3, 6), corpsMat);
    corps.rotation.x = Math.PI / 2;
    g.add(corps);
    const mat = modeles[i % modeles.length];
    const ailes = [-1, 1].map((s) => {
      const a = new THREE.Mesh(aile, mat);
      a.scale.x = s;
      g.add(a);
      return a;
    });
    const z0 = -9 - alea() * 20;
    const base = new THREE.Vector3(cheminX(z0) + (alea() - 0.5) * 9, 0.6 + alea() * 1.8, z0);
    const p = alea() * 10;
    const v = 0.25 + alea() * 0.3;
    const precedent = new THREE.Vector3();
    g.scale.setScalar(1.0 + alea() * 0.6);
    animes.push((t) => {
      precedent.copy(g.position);
      g.position.set(
        base.x + Math.sin(t * v + p) * 1.6 + Math.sin(t * v * 3.1 + p) * 0.3,
        base.y + Math.abs(Math.sin(t * 4 + p)) * 0.12 + Math.sin(t * v * 0.7 + p) * 0.4,
        base.z + Math.cos(t * v * 0.9 + p) * 1.4,
      );
      const dx = g.position.x - precedent.x;
      const dz = g.position.z - precedent.z;
      if (Math.abs(dx) + Math.abs(dz) > 1e-4) g.rotation.y = Math.atan2(dx, dz);
      const battement = Math.sin(t * 11 + p) * 1.05;
      ailes.forEach((a) => (a.rotation.z = battement * a.scale.x));
    });
    scene.add(g);
  }
}

// Colibris irisés qui butinent les fleurs géantes
function ajouterColibris(scene: THREE.Scene, alea: () => number, fleurs: THREE.Vector3[], animes: ((t: number) => void)[]) {
  const plumes = new THREE.MeshPhysicalMaterial({ color: 0x18b07a, metalness: 0.5, roughness: 0.3, iridescence: 1, emissive: 0x0a5a40, emissiveIntensity: 0.5 });
  const gorge = new THREE.MeshStandardMaterial({ color: 0xff4f9e, emissive: 0xff3d8e, emissiveIntensity: 1.4 });
  const bec = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const aileMat = new THREE.MeshStandardMaterial({ color: 0x9fe8d0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const aile = new THREE.PlaneGeometry(0.1, 0.03);
  aile.translate(0.05, 0, 0);
  aile.rotateX(-Math.PI / 2);
  fleurs.slice(0, 4).forEach((cible, i) => {
    const g = new THREE.Group();
    const corps = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), plumes);
    corps.scale.set(1, 1, 1.6);
    const tete = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), plumes);
    tete.position.set(0, 0.03, 0.06);
    const g2 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), gorge);
    g2.position.set(0, 0.005, 0.07);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.005, 0.08, 6), bec);
    b.rotation.x = Math.PI / 2;
    b.position.set(0, 0.025, 0.12);
    const queue = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 6), plumes);
    queue.rotation.x = -Math.PI / 2 - 0.4;
    queue.position.set(0, -0.01, -0.08);
    g.add(corps, tete, g2, b, queue);
    const ailes = [-1, 1].map((s) => {
      const a = new THREE.Mesh(aile, aileMat);
      a.scale.x = s;
      a.position.set(s * 0.02, 0.02, 0);
      g.add(a);
      return a;
    });
    g.scale.setScalar(2.2);
    const p = i * 2.3;
    animes.push((t) => {
      const cycle = (t * 0.18 + p) % 1;
      const vol = THREE.MathUtils.smoothstep(cycle, 0.75, 1) * Math.sin(cycle * Math.PI);
      g.position.set(
        cible.x + 0.45 + Math.sin(t * 2.3 + p) * 0.06 + vol * 1.5,
        cible.y + 0.1 + Math.sin(t * 3.1 + p) * 0.05 + vol * 0.8,
        cible.z + 0.25 + Math.cos(t * 1.9 + p) * 0.05,
      );
      g.lookAt(cible.x, cible.y + 0.05, cible.z);
      ailes.forEach((a) => (a.rotation.z = Math.sin(t * 70 + p) * 1.2 * a.scale.x));
    });
    scene.add(g);
  });
}

// Fritillaires pintades : clochettes à damier rose, petites et géantes
function textureDamierRose() {
  const t = toile(256, 256, (g) => {
    for (let i = 0; i < 16; i++)
      for (let j = 0; j < 16; j++) {
        g.fillStyle = (i + j) % 2 === 0 ? "#ff8cc0" : "#7a1f4e";
        g.fillRect(i * 16, j * 16, 16, 16);
      }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.5, 1);
  return t;
}

function ajouterFritillaires(scene: THREE.Scene, alea: () => number, leger: boolean) {
  const damier = textureDamierRose();
  const clocheMat = new THREE.MeshPhysicalMaterial({ map: damier, emissiveMap: damier, emissive: 0xffffff, emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 0.45, sheen: 1, sheenColor: new THREE.Color(0xffd0e6) });
  const tigeMat = new THREE.MeshStandardMaterial({ color: 0x3f8a52, roughness: 0.7 });
  const cloche = new THREE.LatheGeometry(
    [[0.002, 0.0], [0.045, -0.008], [0.08, -0.035], [0.095, -0.08], [0.098, -0.15], [0.094, -0.21], [0.088, -0.25], [0.1, -0.27]].map(([x, y]) => new THREE.Vector2(x, y)),
    18,
  );
  const fleursGeantes: THREE.Vector3[] = [];
  const creer = (x: number, z: number, taille: number) => {
    const g = new THREE.Group();
    const courbe = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.02, 0.35, 0),
      new THREE.Vector3(0.08, 0.6, 0),
      new THREE.Vector3(0.2, 0.68, 0),
      new THREE.Vector3(0.27, 0.6, 0),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(courbe, 16, 0.008, 5), tigeMat));
    const c = new THREE.Mesh(cloche, clocheMat);
    c.position.set(0.27, 0.6, 0);
    c.rotation.z = -0.25;
    g.add(c);
    g.position.set(x, 0, z);
    g.rotation.y = alea() * Math.PI * 2;
    g.scale.setScalar(taille);
    scene.add(g);
    return g;
  };
  for (let i = 0; i < (leger ? 26 : 50); i++) {
    const z = 1 - alea() * 32;
    const x = cheminX(z) + (alea() < 0.5 ? -1 : 1) * (1.7 + alea() * 6);
    if (dansEau(x, z, 0.5)) continue;
    creer(x, z, 0.6 + alea() * 0.6);
  }
  // Fritillaires géantes, pour le côté « pays des merveilles »
  for (const [dx, z, taille] of [[-12.4, -10, 3.4], [13, -11, 3.6], [-11.5, -19, 3.8], [12.8, -22.5, 3.4]]) {
    const x = cheminX(z) + dx;
    const g = creer(x, z, taille);
    const tete = new THREE.Vector3(0.27, 0.5, 0).applyMatrix4(g.matrixWorld.compose(g.position, g.quaternion, g.scale));
    fleursGeantes.push(tete);
    const l = new THREE.PointLight(0xff7fbf, 3, 6, 2);
    l.position.copy(tete);
    scene.add(l);
  }
  return fleursGeantes;
}

// Petites fleurs lumineuses en étoile semées dans l'herbe
function ajouterFleursLumineuses(scene: THREE.Scene, alea: () => number, leger: boolean) {
  const petales = Array.from({ length: 6 }, (_, k) => {
    const p = new THREE.PlaneGeometry(0.035, 0.08);
    p.translate(0, 0.04, 0);
    p.rotateX(-1.0);
    p.rotateY((k / 6) * Math.PI * 2);
    p.deleteAttribute("uv");
    return p;
  });
  const geo = mergeGeometries(petales)!;
  geo.translate(0, 0.06, 0);
  const n = leger ? 70 : 160;
  const fleurs = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), n);
  const teintes = [new THREE.Color(2.0, 0.7, 1.4), new THREE.Color(1.8, 1.7, 1.4), new THREE.Color(0.5, 1.8, 1.7), new THREE.Color(1.8, 1.6, 0.5)];
  const o = new THREE.Object3D();
  let k = 0;
  while (k < n) {
    const z = 2 - alea() * 34;
    const x = cheminX(z) + (alea() < 0.5 ? -1 : 1) * (1.5 + alea() * 8);
    if (dansEau(x, z, 0.3)) continue;
    o.position.set(x, 0, z);
    o.rotation.y = alea() * 6;
    o.scale.setScalar(0.7 + alea() * 1.2);
    o.updateMatrix();
    fleurs.setMatrixAt(k, o.matrix);
    fleurs.setColorAt(k, teintes[Math.floor(alea() * teintes.length)]);
    k++;
  }
  scene.add(fleurs);
}

// Œufs magiques à pois lumineux, à demi enfoncés dans la mousse
function ajouterOeufs(scene: THREE.Scene, alea: () => number) {
  const profil = Array.from({ length: 17 }, (_, i) => {
    const t = i / 16;
    const y = t * 2;
    const r = Math.sin(Math.PI * t) * 0.72 * (1 - 0.18 * t);
    return new THREE.Vector2(Math.max(r, 0.001), y);
  });
  const geo = new THREE.LatheGeometry(profil, 40);
  const decors = [
    textureChapeau(alea, "#3a2470", "#ff9fd0"),
    textureChapeau(alea, "#123a5a", "#7ff0e0"),
    textureChapeau(alea, "#4a1f5a", "#ffd28a"),
  ].map(
    (tex) =>
      new THREE.MeshPhysicalMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.2 }),
  );
  [[-13.5, -11, 1.3], [14, -14.2, 1.6], [-10.6, -29, 1.1], [12.6, -25.4, 1.2], [-15.5, -18.5, 0.9], [15.6, -9, 0.8]].forEach(([x, z, s], i) => {
    const o = new THREE.Mesh(geo, decors[i % decors.length]);
    o.position.set(x, -0.25 * s, z);
    o.rotation.set((alea() - 0.5) * 0.25, alea() * 6, (alea() - 0.5) * 0.25);
    o.scale.setScalar(s);
    o.castShadow = true;
    scene.add(o);
  });
}

// Îles qui flottent dans le ciel, avec de fins filets d'eau qui s'évaporent en tombant
function ajouterIlesVolantes(scene: THREE.Scene, alea: () => number, leger: boolean, animes: ((t: number) => void)[]) {
  const roche = new THREE.MeshStandardMaterial({ color: 0x4a3a62, roughness: 0.95, flatShading: true });
  const herbe = new THREE.MeshStandardMaterial({ color: 0x2c5034, roughness: 1 });
  const lampe = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.4, 0.5) });
  const filet = new THREE.ShaderMaterial({
    uniforms: { uTemps: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTemps; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float b(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
      void main() {
        float f = b(vec2(vUv.x * 6.0, vUv.y * 4.0 + uTemps * 2.0));
        float bord = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
        float a = (0.3 + 0.5 * f) * bord * smoothstep(0.0, 0.7, vUv.y);
        gl_FragColor = vec4(vec3(0.5, 0.85, 1.0) * 0.9, a * 0.55);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  animes.push((t) => (filet.uniforms.uTemps.value = t));
  const iles: [number, number, number, number][] = [
    [15, 16, -58, 3.2],
    [-19, 23, -80, 2.4],
    [24, 12, -46, 1.8],
    [-30, 17, -66, 2.6],
  ];
  for (const [x, y, z, r] of leger ? iles.slice(0, 3) : iles) {
    const ile = new THREE.Group();
    const roc = new THREE.ConeGeometry(r, r * 1.6, 22, 5);
    roc.rotateX(Math.PI);
    roc.translate(0, -r * 0.8, 0);
    const pos = roc.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const yy = pos.getY(i);
      const a = Math.atan2(pos.getX(i), pos.getZ(i));
      const f = 1 + 0.14 * Math.sin(a * 4 + yy * 1.6 + r) + 0.08 * Math.sin(a * 9 - yy * 2.7);
      pos.setX(i, pos.getX(i) * f);
      pos.setZ(i, pos.getZ(i) * f);
    }
    roc.computeVertexNormals();
    ile.add(new THREE.Mesh(roc, roche));
    const dessus = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r, 0.3, 22), herbe);
    dessus.position.y = 0.1;
    ile.add(dessus);
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.14 * r * 0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), lampe);
      const a = alea() * Math.PI * 2;
      c.position.set(Math.cos(a) * r * 0.6, 0.25, Math.sin(a) * r * 0.6);
      ile.add(c);
    }
    const chute = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.35, y * 0.7), filet);
    chute.position.set(r * 0.5, -y * 0.35, r * 0.6);
    ile.add(chute);
    ile.position.set(x, y, z);
    const p = alea() * 10;
    animes.push((t) => (ile.position.y = y + Math.sin(t * 0.3 + p) * 0.25));
    scene.add(ile);
  }
}

// Sphère armillaire dorée qui tourne au-dessus de la scène : la magie du festival
function ajouterArmillaire(scene: THREE.Scene, animes: ((t: number) => void)[]) {
  const or = new THREE.MeshStandardMaterial({ color: 0xe8c070, metalness: 1, roughness: 0.25, emissive: 0xffb050, emissiveIntensity: 0.9 });
  const g = new THREE.Group();
  g.position.set(cheminX(-46), 10, -46.5);
  const anneaux = [1.9, 1.55, 1.2].map((r, i) => {
    const a = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 8, 96), or);
    a.rotation.set(i * 0.9, i * 0.5, 0);
    g.add(a);
    return a;
  });
  const coeur = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.3, 1.9) }));
  g.add(coeur);
  const l = new THREE.PointLight(0xffb0d8, 18, 22, 2);
  g.add(l);
  animes.push((t) => {
    anneaux[0].rotation.y = t * 0.25;
    anneaux[1].rotation.x = 0.9 + t * 0.32;
    anneaux[2].rotation.z = t * 0.4;
    g.position.y = 10 + Math.sin(t * 0.5) * 0.2;
    coeur.scale.setScalar(1 + Math.sin(t * 1.4) * 0.06);
  });
  scene.add(g);
}

// Le château de Briquemault, d'après la photo de l'équipe : deux grosses tours rondes
// en ruine (sans toit) reliées par un mur, une courtine basse, un pan de mur en briques
// percé d'arcades, le tout au milieu des douves à nénuphars, avec lavande et peupliers.
// Version « monde magique » : meurtrières et arcades qui luisent, lierre fleuri,
// lanternes, île flottante d'où tombe une cascade, poissons fluo qui sautent.
const CHATEAU = { x: -13, z: -46, angle: 0.15 };
const DOUVES = { x: -14.6, z: -45.5, rx: 8.3, rz: 5.5 };
const dansDouves = (x: number, z: number, marge = 0) =>
  Math.hypot((x - DOUVES.x) / (DOUVES.rx + marge), (z - DOUVES.z) / (DOUVES.rz + marge)) < 1;
const presChateau = (x: number, z: number, marge = 0) => dansDouves(x, z, marge + 1.5);

// Étangs miroirs de part et d'autre du chemin (le chemin devient une chaussée sur l'eau)
const ETANGS = [
  { x: -6.8, z: -13.5, rx: 4.6, rz: 6.5 },
  { x: 7.2, z: -15, rx: 4.8, rz: 7.5 },
  { x: -6, z: -24.5, rx: 3.8, rz: 3.6 },
];
const dansEtang = (x: number, z: number, marge = 0) =>
  ETANGS.some((e) => Math.hypot((x - e.x) / (e.rx + marge), (z - e.z) / (e.rz + marge)) < 1);
const pointEtang = (alea: () => number, rMin = 0, rMax = 0.9) => {
  const e = ETANGS[Math.floor(alea() * ETANGS.length)];
  const a = alea() * Math.PI * 2;
  const r = rMin + Math.sqrt(alea()) * (rMax - rMin);
  return new THREE.Vector2(e.x + Math.cos(a) * e.rx * r, e.z + Math.sin(a) * e.rz * r);
};
/** Tirage d'un point au hasard dans les douves, devant l'île du château. */
const pointDouves = (alea: () => number) => {
  const x = DOUVES.x + (alea() - 0.5) * DOUVES.rx * 1.5;
  const k = Math.sqrt(Math.max(0, 1 - ((x - DOUVES.x) / DOUVES.rx) ** 2));
  return new THREE.Vector2(x, DOUVES.z + DOUVES.rz * k * (0.62 + alea() * 0.3));
};

function texturePierre(alea: () => number, teinte: [number, number, number], brique: boolean) {
  const t = toile(512, 512, (g) => {
    g.fillStyle = brique ? "#4a2624" : "#3c3832";
    g.fillRect(0, 0, 512, 512);
    const hRang = brique ? 16 : 38;
    for (let y = 0; y < 512; y += hRang) {
      let x = -alea() * 60;
      while (x < 512) {
        const l = brique ? 32 + alea() * 8 : 36 + alea() * 46;
        const v = 0.78 + alea() * 0.36;
        g.fillStyle = `rgb(${Math.min(255, teinte[0] * v) | 0},${Math.min(255, teinte[1] * v) | 0},${Math.min(255, teinte[2] * v) | 0})`;
        g.fillRect(x + 2, y + 2, l - 4, hRang - 4);
        x += l;
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function echelleUV(geo: THREE.BufferGeometry, su: number, sv: number) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
}

// Tour ronde arasée : le sommet est irrégulier, comme sur la photo
function geometrieTour(r: number, h: number, alea: () => number) {
  const geo = new THREE.CylinderGeometry(r, r * 1.05, h, 44, 10, true);
  geo.translate(0, h / 2, 0);
  const pos = geo.attributes.position;
  const p1 = alea() * 6;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const a = Math.atan2(pos.getX(i), pos.getZ(i));
    if (y > h - 0.01) pos.setY(i, y - 0.35 - 0.35 * Math.sin(a * 3 + p1) - 0.18 * Math.sin(a * 11 + p1 * 2));
  }
  geo.computeVertexNormals();
  return echelleUV(geo, (2 * Math.PI * r) / 3, h / 3);
}

function formeMurRuine(largeur: number, hMin: number, hMax: number, alea: () => number) {
  const s = new THREE.Shape();
  s.moveTo(-largeur / 2, 0);
  s.lineTo(largeur / 2, 0);
  const n = 9;
  for (let i = n; i >= 0; i--) s.lineTo(-largeur / 2 + (largeur * i) / n, hMin + alea() * (hMax - hMin));
  s.lineTo(-largeur / 2, 0);
  return s;
}

// Le pan de mur en briques : sommet déchiqueté, trois arcades en bas, une grande baie
function formePignon() {
  const s = new THREE.Shape();
  s.moveTo(-1.4, 0);
  s.lineTo(1.4, 0);
  for (const [x, y] of [[1.4, 3.6], [1.15, 4.1], [1.25, 4.6], [0.8, 5.0], [0.55, 5.6], [0.1, 5.4], [-0.3, 5.75], [-0.75, 5.3], [-1.1, 4.9], [-1.4, 4.2]])
    s.lineTo(x, y);
  s.lineTo(-1.4, 0);
  for (const cx of [-0.8, 0, 0.8]) {
    const t = new THREE.Path();
    t.moveTo(cx - 0.24, 0.25);
    t.lineTo(cx + 0.24, 0.25);
    t.lineTo(cx + 0.24, 1.25);
    t.absarc(cx, 1.25, 0.24, 0, Math.PI, false);
    t.lineTo(cx - 0.24, 0.25);
    s.holes.push(t);
  }
  const baie = new THREE.Path();
  baie.moveTo(-0.7, 2.4);
  baie.lineTo(0.3, 2.4);
  baie.lineTo(0.3, 3.7);
  baie.absarc(-0.2, 3.7, 0.5, 0, Math.PI, false);
  baie.lineTo(-0.7, 2.4);
  s.holes.push(baie);
  return s;
}

// Peuplier d'Italie : grande silhouette en fuseau, comme ceux du domaine
function creerPeuplier(hauteur: number, mat: THREE.Material, matTronc: THREE.Material, alea: () => number) {
  const g = new THREE.Group();
  const tronc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, hauteur * 0.4, 8), matTronc);
  tronc.position.y = hauteur * 0.2;
  g.add(tronc);
  const r = hauteur * 0.1;
  const profil = [[0, 0], [0.55, 0.06], [0.92, 0.25], [1.0, 0.45], [0.85, 0.68], [0.55, 0.86], [0.22, 0.97], [0, 1]].map(
    ([x, y]) => new THREE.Vector2(x * r, y * hauteur * 0.88),
  );
  const geo = new THREE.LatheGeometry(profil, 28);
  const pos = geo.attributes.position;
  const p = alea() * 10;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const a = Math.atan2(pos.getX(i), pos.getZ(i));
    const f = 1 + 0.16 * Math.sin(a * 5 + y * 1.7 + p) + 0.1 * Math.sin(a * 11 - y * 3.1 + p);
    pos.setX(i, pos.getX(i) * f);
    pos.setZ(i, pos.getZ(i) * f);
  }
  geo.computeVertexNormals();
  const feuillage = new THREE.Mesh(geo, mat);
  feuillage.position.y = hauteur * 0.12;
  feuillage.castShadow = true;
  g.add(feuillage);
  return g;
}

function ajouterChateau(
  scene: THREE.Scene,
  alea: () => number,
  leger: boolean,
  animes: ((t: number) => void)[],
  vent: { uTemps: { value: number } },
) {
  const chateau = new THREE.Group();
  chateau.position.set(CHATEAU.x, 0, CHATEAU.z);
  chateau.rotation.y = CHATEAU.angle;
  const pierre = new THREE.MeshStandardMaterial({ map: texturePierre(alea, [214, 204, 186], false), color: 0xd8d0e8, roughness: 0.92 });
  const brique = new THREE.MeshStandardMaterial({ map: texturePierre(alea, [204, 120, 104], true), color: 0xf0d0d8, roughness: 0.9 });
  const lueur = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.3, 0.55) });
  const lueurRose = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.85, 1.2), side: THREE.DoubleSide });

  // L'île du château, au milieu des douves
  const ile = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.08, 0.3, 48), new THREE.MeshStandardMaterial({ color: 0x2a4632, roughness: 1 }));
  ile.scale.set(6.6, 1, 2.9);
  ile.position.set(-2, 0.12, -0.4);
  ile.receiveShadow = true;
  chateau.add(ile);

  // Les deux grosses tours rondes et le mur qui les relie
  const tours: [number, number, number, number][] = [
    [2.8, 0.2, 2.3, 8.2],
    [-1.4, -0.6, 1.9, 7.6],
  ];
  for (const [x, z, r, h] of tours) {
    const tour = new THREE.Mesh(geometrieTour(r, h, alea), pierre);
    tour.position.set(x, 0, z);
    tour.castShadow = tour.receiveShadow = true;
    chateau.add(tour);
    // Herbes folles sur le sommet arasé
    const sommet = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 32), new THREE.MeshStandardMaterial({ color: 0x23402a, roughness: 1 }));
    sommet.rotation.x = -Math.PI / 2;
    sommet.position.set(x, h - 0.75, z);
    chateau.add(sommet);
    // Meurtrières éclairées de l'intérieur
    for (let k = 0; k < 4; k++) {
      const a = (alea() - 0.5) * 1.6;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.62), lueur);
      m.position.set(x + Math.sin(a) * (r * 1.02 + 0.02), 1.6 + k * 1.55 + alea() * 0.5, z + Math.cos(a) * (r * 1.02 + 0.02));
      m.rotation.y = a;
      chateau.add(m);
    }
  }
  const liaison = new THREE.Mesh(echelleUV(new THREE.BoxGeometry(4.4, 7.1, 1.7), 4.4 / 3, 7.1 / 3), pierre);
  liaison.position.set(0.7, 3.55, -0.95);
  liaison.castShadow = true;
  chateau.add(liaison);

  // La courtine basse, puis le pan de mur en briques
  const courtine = new THREE.Mesh(
    echelleUV(new THREE.ExtrudeGeometry(formeMurRuine(3.4, 2.4, 3.3, alea), { depth: 0.9, bevelEnabled: false }), 1 / 3, 1 / 3),
    pierre,
  );
  courtine.position.set(-4.7, 0, -0.85);
  courtine.castShadow = true;
  chateau.add(courtine);
  const pignon = new THREE.Mesh(echelleUV(new THREE.ExtrudeGeometry(formePignon(), { depth: 0.9, bevelEnabled: false }), 1 / 3, 1 / 3), brique);
  pignon.position.set(-7.6, 0, -0.75);
  pignon.castShadow = true;
  chateau.add(pignon);
  const fond = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 4.4), lueurRose);
  fond.position.set(-7.6, 2.2, -0.95);
  chateau.add(fond);

  // Lierre qui grimpe sur les tours, avec de petites fleurs lumineuses
  {
    const n = leger ? 380 : 900;
    const feuille = new THREE.CircleGeometry(0.11, 5);
    const feuilles = new THREE.InstancedMesh(feuille, new THREE.MeshStandardMaterial({ color: 0x24502e, roughness: 0.8, side: THREE.DoubleSide }), n);
    const nFleurs = Math.floor(n * 0.12);
    const fleurs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 4), new THREE.MeshBasicMaterial(), nFleurs);
    const teintes = [new THREE.Color(2.4, 0.8, 1.6), new THREE.Color(0.6, 2.0, 1.9), new THREE.Color(2.4, 2.0, 1.2)];
    const o = new THREE.Object3D();
    let k = 0;
    let kf = 0;
    while (k < n) {
      const [x, z, r, h] = tours[Math.floor(alea() * tours.length)];
      let a = (alea() - 0.5) * 2.4;
      let y = 0;
      const haut = h * (0.35 + alea() * 0.5);
      while (y < haut && k < n) {
        y += 0.09;
        a += (alea() - 0.5) * 0.08;
        for (let j = 0; j < 2 && k < n; j++, k++) {
          const aa = a + (alea() - 0.5) * 0.14;
          const rr = r * 1.02 + 0.06;
          o.position.set(x + Math.sin(aa) * rr, y + (alea() - 0.5) * 0.12, z + Math.cos(aa) * rr);
          o.rotation.set((alea() - 0.5) * 0.8, aa, alea() * 6);
          o.scale.setScalar(0.7 + alea() * 0.6);
          o.updateMatrix();
          feuilles.setMatrixAt(k, o.matrix);
          if (kf < nFleurs && alea() < 0.1) {
            o.position.set(x + Math.sin(aa) * (rr + 0.05), o.position.y, z + Math.cos(aa) * (rr + 0.05));
            o.updateMatrix();
            fleurs.setMatrixAt(kf, o.matrix);
            fleurs.setColorAt(kf, teintes[Math.floor(alea() * teintes.length)]);
            kf++;
          }
        }
      }
    }
    fleurs.count = kf;
    chateau.add(feuilles, fleurs);
  }

  // Lavande (un clin d'œil aux massifs du domaine), qui luit doucement
  {
    const nTouffes = leger ? 8 : 14;
    const parTouffe = 26;
    const tige = new THREE.CylinderGeometry(0.006, 0.01, 0.5, 4);
    tige.translate(0, 0.25, 0);
    const epi = new THREE.CylinderGeometry(0.016, 0.028, 0.2, 6);
    epi.translate(0, 0.56, 0);
    const matTige = new THREE.MeshStandardMaterial({ color: 0x5a7a5a, roughness: 0.9 });
    const matEpi = new THREE.MeshStandardMaterial({ color: 0x9a6ae0, emissive: 0x7a48d0, emissiveIntensity: 1.1, roughness: 0.7 });
    ajouterVent(matTige, vent, true);
    ajouterVent(matEpi, vent, true);
    const tiges = new THREE.InstancedMesh(tige, matTige, nTouffes * parTouffe);
    const epis = new THREE.InstancedMesh(epi, matEpi, nTouffes * parTouffe);
    const o = new THREE.Object3D();
    let k = 0;
    for (let i = 0; i < nTouffes; i++) {
      // sur l'île, devant les tours
      const cx = -8.5 + alea() * 12.5;
      const cz = 0.9 + alea() * 1.1;
      for (let j = 0; j < parTouffe; j++, k++) {
        const a = alea() * Math.PI * 2;
        const d = Math.sqrt(alea()) * 0.45;
        o.position.set(cx + Math.cos(a) * d, 0.26, cz + Math.sin(a) * d);
        o.rotation.set(Math.sin(a) * d * 0.9, alea() * 6, -Math.cos(a) * d * 0.9);
        o.scale.setScalar(0.8 + alea() * 0.5);
        o.updateMatrix();
        tiges.setMatrixAt(k, o.matrix);
        epis.setMatrixAt(k, o.matrix);
      }
    }
    chateau.add(tiges, epis);
  }

  // Lueur rose derrière les ruines : les tours se découpent sur la brume
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: textureHalo(), color: new THREE.Color(0.5, 0.25, 0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  halo.scale.set(26, 16, 1);
  halo.position.set(-1, 5, -5);
  chateau.add(halo);
  const lumiere = new THREE.PointLight(0xd8a0ff, 22, 20, 2);
  lumiere.position.set(0, 4.5, 6.5);
  chateau.add(lumiere);

  // Lanternes qui flottent au-dessus des tours
  const papier = new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xff9a40, emissiveIntensity: 2.8 });
  for (let i = 0; i < 5; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10).scale(1, 1.3, 1), papier);
    const bx = -6 + alea() * 10;
    const by = 8.5 + alea() * 2.5;
    const bz = -1 + alea() * 2;
    const p = alea() * 10;
    animes.push((t) => l.position.set(bx + Math.sin(t * 0.2 + p) * 0.4, by + Math.sin(t * 0.5 + p) * 0.3, bz));
    chateau.add(l);
  }
  scene.add(chateau);

  // Lucioles autour des ruines
  const lucioles = nuee(
    leger ? 50 : 110,
    { x: [CHATEAU.x - 10, CHATEAU.x + 8], y: [0.4, 7], z: [CHATEAU.z - 3, CHATEAU.z + 5] },
    [new THREE.Color(2.4, 1.9, 0.7), new THREE.Color(2.2, 0.9, 1.6)],
    1.4,
    alea,
  );
  scene.add(lucioles);
  animes.push((t) => ((lucioles.material as THREE.ShaderMaterial).uniforms.uTemps.value = t));

  // Peupliers d'Italie autour du château
  const feuillage = new THREE.MeshStandardMaterial({ color: 0x23402c, roughness: 0.9 });
  const tronc = new THREE.MeshStandardMaterial({ color: 0x2a221e, roughness: 0.9 });
  for (const [x, z, h] of [[-25.5, -49, 15], [-27.5, -44.5, 13], [-23.5, -54, 16], [-4.5, -57, 14], [-29, -52, 12]]) {
    const peuplier = creerPeuplier(h, feuillage, tronc, alea);
    peuplier.position.set(x, 0, z);
    const p = alea() * 10;
    animes.push((t) => (peuplier.rotation.z = Math.sin(t * 0.6 + p) * 0.012));
    scene.add(peuplier);
  }

  // Nénuphars et roseaux dans les douves
  ajouterNenuphars(scene, alea, leger ? 14 : 26, () => pointDouves(alea));
  ajouterRoseaux(scene, alea, leger ? 90 : 200, vent, () => {
    const a = alea() * Math.PI * 2;
    const r = 0.92 + alea() * 0.14;
    return new THREE.Vector2(DOUVES.x + Math.cos(a) * DOUVES.rx * r, DOUVES.z + Math.sin(a) * DOUVES.rz * r);
  });

  // L'île flottante et sa cascade, derrière la courtine
  const ileVolante = new THREE.Group();
  ileVolante.position.set(-17.5, 12, -53);
  const roc = new THREE.ConeGeometry(3.2, 5, 26, 6);
  roc.rotateX(Math.PI);
  roc.translate(0, -2.5, 0);
  {
    const pos = roc.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const a = Math.atan2(pos.getX(i), pos.getZ(i));
      const f = 1 + 0.14 * Math.sin(a * 4 + y * 1.6) + 0.08 * Math.sin(a * 9 - y * 2.7);
      pos.setX(i, pos.getX(i) * f);
      pos.setZ(i, pos.getZ(i) * f);
    }
    roc.computeVertexNormals();
  }
  ileVolante.add(new THREE.Mesh(roc, new THREE.MeshStandardMaterial({ color: 0x4a3a62, roughness: 0.95, flatShading: true })));
  const pelouse = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.3, 0.35, 26), new THREE.MeshStandardMaterial({ color: 0x2c5034, roughness: 1 }));
  pelouse.position.y = 0.1;
  ileVolante.add(pelouse);
  const petitPeuplier = creerPeuplier(5.5, feuillage, tronc, alea);
  petitPeuplier.position.set(-1, 0.2, -1);
  ileVolante.add(petitPeuplier);
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.4, 0.5) }));
    const a = alea() * Math.PI * 2;
    c.position.set(Math.cos(a) * (1 + alea() * 2), 0.3, Math.sin(a) * (1 + alea() * 2));
    ileVolante.add(c);
  }
  // Racines qui pendent sous l'île
  const matRacine = new THREE.MeshStandardMaterial({ color: 0x3a2a30, roughness: 1 });
  for (let i = 0; i < 6; i++) {
    const a = alea() * Math.PI * 2;
    const r0 = 0.8 + alea() * 1.4;
    const courbe = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * r0, -1.5, Math.sin(a) * r0),
      new THREE.Vector3(Math.cos(a) * r0 * 0.8, -3.2, Math.sin(a) * r0 * 0.8),
      new THREE.Vector3(Math.cos(a + 0.4) * r0 * 0.6, -4.6 - alea(), Math.sin(a + 0.4) * r0 * 0.6),
    ]);
    ileVolante.add(new THREE.Mesh(new THREE.TubeGeometry(courbe, 10, 0.05, 5), matRacine));
  }
  animes.push((t) => (ileVolante.position.y = 12 + Math.sin(t * 0.35) * 0.08));
  scene.add(ileVolante);

  const haut = new THREE.Vector3(-17.5, 12.2, -50.1);
  const bas = new THREE.Vector3(-17.5, 0.05, -49.8);
  const eauMat = new THREE.ShaderMaterial({
    uniforms: { uTemps: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTemps; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float b(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
      void main() {
        vec2 p = vec2(vUv.x * 8.0, vUv.y * 5.0 + uTemps * 2.6);
        float filets = b(p) * 0.6 + b(vec2(p.x * 2.3, p.y * 1.7)) * 0.4;
        float irr = b(vec2(vUv.y * 6.0, 3.0)) * 0.18;
        float bord = smoothstep(irr, irr + 0.2, vUv.x) * smoothstep(1.0 - irr, 0.8 - irr, vUv.x);
        float ecume = smoothstep(0.85, 1.0, vUv.y);
        vec3 col = mix(vec3(0.2, 0.75, 0.95), vec3(0.95, 1.0, 1.0), filets) * 0.95;
        col += vec3(1.0, 0.5, 0.85) * 0.35 * (1.0 - filets);
        float a = (0.25 + 0.5 * filets) * bord + ecume * 0.3 * bord;
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const cascade = new THREE.Mesh(new THREE.PlaneGeometry(1.7, haut.distanceTo(bas), 1, 8), eauMat);
  cascade.position.copy(haut).add(bas).multiplyScalar(0.5);
  cascade.rotation.x = Math.atan2(haut.z - bas.z, haut.y - bas.y);
  scene.add(cascade);
  animes.push((t) => (eauMat.uniforms.uTemps.value = t));
  const embruns = nuee(leger ? 30 : 70, { x: [bas.x - 1.6, bas.x + 1.6], y: [2.5, 6], z: [bas.z - 1, bas.z + 1] }, [new THREE.Color(1.6, 2.0, 2.2), new THREE.Color(2.0, 1.2, 1.8)], 0.9, alea);
  scene.add(embruns);
  animes.push((t) => ((embruns.material as THREE.ShaderMaterial).uniforms.uTemps.value = t));
  const lueurCascade = new THREE.PointLight(0x5fe8ff, 8, 14, 2);
  lueurCascade.position.set(bas.x, 5, bas.z + 1.5);
  scene.add(lueurCascade);

  // Poissons fluo qui sautent dans les douves et dans le Loing
  const couleurs = [new THREE.Color(0.3, 2.2, 2.0), new THREE.Color(2.4, 0.6, 1.6), new THREE.Color(2.2, 2.0, 0.4)];
  for (let i = 0; i < (leger ? 6 : 10); i++) {
    const poisson = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: couleurs[i % couleurs.length] });
    const corps = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), mat);
    corps.scale.set(0.55, 0.8, 2);
    const nageoire = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 3), mat);
    nageoire.rotation.x = Math.PI / 2;
    nageoire.scale.set(0.3, 1, 1);
    nageoire.position.z = -0.3;
    poisson.add(corps, nageoire);
    poisson.scale.setScalar(1.4);
    poisson.rotation.order = "YXZ";
    scene.add(poisson);
    const duree = 1.3;
    const periode = 4 + alea() * 5;
    const decalage = alea() * periode;
    const depart = new THREE.Vector2();
    const sens = new THREE.Vector2();
    let cycle = -1;
    animes.push((t) => {
      const n = Math.floor((t + decalage) / periode);
      const k = ((t + decalage) % periode) / duree;
      if (n !== cycle) {
        cycle = n;
        depart.copy(i % 3 === 0 ? pointDouves(alea) : i % 3 === 1 ? pointEtang(alea, 0.1, 0.7) : pointRiviere(-16 + alea() * 22, (alea() - 0.5) * 6));
        const a = alea() * Math.PI * 2;
        sens.set(Math.sin(a), Math.cos(a));
      }
      if (k > 1) {
        poisson.visible = false;
        return;
      }
      poisson.visible = true;
      poisson.position.set(depart.x + sens.x * k * 1.8, 0.05 + Math.sin(k * Math.PI) * 1.2, depart.y + sens.y * k * 1.8);
      poisson.rotation.set(-Math.cos(k * Math.PI), Math.atan2(sens.x, sens.y), 0);
    });
  }
}

async function construireMonde(alea: () => number, leger: boolean, dossier: string) {
  const scene = new THREE.Scene();
  const brumeCouleur = new THREE.Color(0x1e1438);
  scene.background = brumeCouleur;
  scene.fog = new THREE.FogExp2(brumeCouleur, leger ? 0.025 : 0.021);
  scene.environmentIntensity = 0.22;
  const animes: ((t: number) => void)[] = [];
  const vent = { uTemps: { value: 0 } };

  const charge = new GLTFLoader();
  const chargeTex = new THREE.TextureLoader();
  const [herbeGlb, rocs, fleurs, texHerbe, texTerre, texTerreN] = await Promise.all([
    charge.loadAsync(`${dossier}/grass.glb`),
    Promise.all(["rock1", "rock2", "rock3"].map((r) => charge.loadAsync(`${dossier}/${r}.glb`))),
    Promise.all(["flower_white", "flower_blue", "flower_yellow"].map((f) => charge.loadAsync(`${dossier}/${f}.glb`))),
    chargeTex.loadAsync(`${dossier}/grass.jpg`),
    chargeTex.loadAsync(`${dossier}/dirt_color.jpg`),
    chargeTex.loadAsync(`${dossier}/dirt_normal.jpg`),
  ]);

  // Ciel nocturne : étoiles nettes, lune, lueur rose à l'horizon
  const ciel = new THREE.Mesh(
    new THREE.SphereGeometry(300, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTemps: { value: 0 }, uHorizon: { value: brumeCouleur } },
      vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTemps; uniform vec3 uHorizon; varying vec3 vDir;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
        void main() {
          vec3 d = normalize(vDir);
          float y = d.y;
          // Couleurs linéaires ; l'horizon = la couleur de la brume (violet)
          vec3 horizon = uHorizon;
          vec3 zenith = vec3(0.004, 0.004, 0.022);
          vec3 col = mix(horizon, zenith, smoothstep(-0.02, 0.6, y));
          col += vec3(0.6, 0.15, 0.4) * exp(-abs(y - 0.04) * 14.0) * 0.08;
          vec3 lune = normalize(vec3(0.22, 0.30, -0.93));
          float a = max(dot(d, lune), 0.0);
          vec2 pn = d.xz / (abs(y) + 0.25) * 1.6 + vec2(uTemps * 0.004, 0.0);
          float nuage = 0.0, amp = 0.5;
          for (int i = 0; i < 4; i++) { vec2 ip = floor(pn), fp = fract(pn); vec2 u = fp*fp*(3.0-2.0*fp);
            float a0 = h(vec3(ip,1.0)), a1 = h(vec3(ip+vec2(1,0),1.0)), a2 = h(vec3(ip+vec2(0,1),1.0)), a3 = h(vec3(ip+vec2(1,1),1.0));
            nuage += amp * mix(mix(a0,a1,u.x), mix(a2,a3,u.x), u.y); pn *= 2.1; amp *= 0.5; }
          float couverture = smoothstep(0.5, 0.85, nuage) * smoothstep(0.0, 0.12, y) * (1.0 - smoothstep(0.35, 0.8, y));
          // nuages peints, éclairés par la lune sur leurs bords
          vec3 cNuage = vec3(0.07, 0.045, 0.17) + vec3(0.3, 0.12, 0.3) * exp(-abs(y - 0.1) * 7.0) * 0.4;
          cNuage += vec3(0.5, 0.55, 0.8) * pow(a, 12.0) * smoothstep(0.5, 0.8, nuage) * 0.5;
          col = mix(col, cNuage, couverture * 0.9);
          vec3 g = floor(d * 380.0);
          float e = h(g);
          float etoile = step(0.9965, e) * smoothstep(0.0, 0.25, y) * (1.0 - couverture);
          etoile *= 0.6 + 0.4 * sin(uTemps * (1.0 + e * 3.0) + e * 50.0);
          col += vec3(0.9, 0.95, 1.0) * etoile * 1.4;
          float disque = smoothstep(0.9981, 0.9985, a);
          float mers = h(floor(d * 900.0)) * 0.15 + 0.85;
          col = mix(col, vec3(0.95, 0.97, 1.0) * 1.35 * mers, disque);
          col += vec3(0.45, 0.6, 1.0) * (pow(a, 300.0) * 0.35 + pow(a, 40.0) * 0.04 + pow(a, 6.0) * 0.008) * (1.0 - disque);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  scene.add(ciel);
  animes.push((t) => ((ciel.material as THREE.ShaderMaterial).uniforms.uTemps.value = t));

  // Lumières de nuit
  scene.add(new THREE.HemisphereLight(0x5b3f8f, 0x0e0816, 0.6));
  const lune = new THREE.DirectionalLight(0xb8aaff, 1.6);
  lune.position.set(14, 22, -26);
  lune.target.position.set(0, 0, -14);
  lune.castShadow = !leger;
  lune.shadow.mapSize.set(2048, 2048);
  Object.assign(lune.shadow.camera, { left: -18, right: 18, top: 22, bottom: -22, near: 1, far: 70 });
  lune.shadow.camera.updateProjectionMatrix();
  lune.shadow.bias = -0.0005;
  lune.shadow.normalBias = 0.03;
  scene.add(lune, lune.target);

  // Sol : herbe rase et terre mêlées
  [texHerbe, texTerre, texTerreN].forEach((t) => (t.wrapS = t.wrapT = THREE.RepeatWrapping));
  texHerbe.colorSpace = texTerre.colorSpace = THREE.SRGBColorSpace;
  const matSol = new THREE.MeshStandardMaterial({ roughness: 1, normalMap: texTerreN, color: 0x6f8f7a });
  matSol.onBeforeCompile = (shader) => {
    shader.uniforms.uHerbe = { value: texHerbe };
    shader.uniforms.uTerre = { value: texTerre };
    shader.vertexShader =
      "varying vec3 vMonde;\n" +
      shader.vertexShader.replace(
        "#include <project_vertex>",
        "#include <project_vertex>\n vMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    shader.fragmentShader =
      "varying vec3 vMonde; uniform sampler2D uHerbe; uniform sampler2D uTerre;\n" +
      `float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
       float bs(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
         return mix(mix(hs(i),hs(i+vec2(1,0)),u.x), mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),u.x), u.y); }\n` +
      shader.fragmentShader
        .replace(
          "#include <map_fragment>",
          `vec2 suv = vMonde.xz;
           vec3 cHerbe = texture2D(uHerbe, suv / 6.0).rgb;
           vec3 cTerre = texture2D(uTerre, suv / 4.0).rgb;
           float n = bs(suv / 7.0) * 0.65 + bs(suv / 2.3) * 0.35;
           float chemin = 1.0 - smoothstep(1.2, 2.6, abs(vMonde.x - sin(((1.8 - vMonde.z) / 0.96) * 0.12) * 0.9));
           float s = clamp(smoothstep(0.55, 0.75, n) + chemin * 0.8, 0.0, 1.0);
           float berge = smoothstep(7.5, 5.0, abs((vMonde.z - (${RIV_Z0.toFixed(1)} + ${RIV_PENTE} * vMonde.x)) / ${RIV_NORME.toFixed(4)}));
           float dd = length((vMonde.xz - vec2(${DOUVES.x.toFixed(2)}, ${DOUVES.z.toFixed(2)})) / vec2(${DOUVES.rx.toFixed(2)}, ${DOUVES.rz.toFixed(2)}));
           berge = max(berge, smoothstep(1.35, 1.0, dd));
           ${ETANGS.map((e) => `berge = max(berge, smoothstep(1.3, 1.02, length((vMonde.xz - vec2(${e.x.toFixed(2)}, ${e.z.toFixed(2)})) / vec2(${e.rx.toFixed(2)}, ${e.rz.toFixed(2)}))));`).join("\n")}
           diffuseColor.rgb *= mix(cHerbe, cTerre, max(s, berge)) * mix(1.0, 0.5, berge);`,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `vec3 mapN = texture2D(normalMap, vMonde.xz / 4.0).xyz * 2.0 - 1.0;
           mapN.xy *= normalScale;
           normal = normalize(tbn * mapN);`,
        );
  };
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), matSol);
  sol.rotation.x = -Math.PI / 2;
  sol.receiveShadow = true;
  scene.add(sol);

  // Chemin de dalles en damier, un peu de travers, avec des dalles manquantes
  {
    const dalles = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.92, 0.07, 0.92),
      new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.05, envMapIntensity: 1.2 }),
      3 * 70,
    );
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const vert = new THREE.Color(0x0e5c52);
    const noir = new THREE.Color(0x0a0d0d);
    let k = 0;
    for (let rang = 0; rang < 70; rang++) {
      for (let col = -1; col <= 1; col++) {
        const z = 1.8 - rang * 0.96;
        if (dansRiviere(cheminX(z), z, 1.7)) continue;
        if (alea() < 0.06 + rang * 0.004) continue;
        e.set((alea() - 0.5) * 0.04, (alea() - 0.5) * 0.12, (alea() - 0.5) * 0.04);
        q.setFromEuler(e);
        m.compose(new THREE.Vector3(col * 0.96 + cheminX(z), 0.015 + alea() * 0.02, z), q, new THREE.Vector3(1, 1, 1));
        dalles.setMatrixAt(k, m);
        dalles.setColorAt(k, (rang + col + 1) % 2 === 0 ? vert : noir);
        k++;
      }
    }
    dalles.count = k;
    dalles.receiveShadow = true;
    scene.add(dalles);
  }

  // Herbe haute qui ondule
  {
    const source = herbeGlb.scene.getObjectByProperty("isMesh", true) as THREE.Mesh;
    source.geometry.computeBoundingBox();
    const bb = source.geometry.boundingBox!;
    const hauteur = bb.max.y - bb.min.y || 1;
    const matHerbe = new THREE.MeshStandardMaterial({
      map: (source.material as THREE.MeshStandardMaterial).map,
      color: 0x8fb08a,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.9,
    });
    ajouterVent(matHerbe, vent, true);
    const n = leger ? 4500 : 12000;
    const herbe = new THREE.InstancedMesh(source.geometry, matHerbe, n);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    let k = 0;
    for (let i = 0; i < n * 2 && k < n; i++) {
      const x = (alea() - 0.5) * 40;
      const z = 6 - alea() * 70;
      if (Math.abs(x - cheminX(z)) < 1.7 + alea() * 0.4) continue;
      if (dansEau(x, z, 0.3)) continue;
      o.position.set(x, 0, z);
      o.rotation.set(0, alea() * Math.PI * 2, 0);
      const s = (0.35 + alea() * 0.45) / hauteur;
      o.scale.set(s * (0.8 + alea() * 0.6), s, s * (0.8 + alea() * 0.6));
      o.updateMatrix();
      herbe.setMatrixAt(k, o.matrix);
      if (alea() < 0.35) herbe.setColorAt(k, c.setRGB(0.55 + alea() * 0.2, 0.4 + alea() * 0.15, 0.75 + alea() * 0.2));
      else herbe.setColorAt(k, c.setRGB(0.45 + alea() * 0.2, 0.6 + alea() * 0.25, 0.5 + alea() * 0.15));
      k++;
    }
    herbe.count = k;
    herbe.receiveShadow = true;
    scene.add(herbe);
  }

  // Fleurs sauvages
  fleurs.forEach((gltf) => {
    const modele = gltf.scene;
    const bb = new THREE.Box3().setFromObject(modele);
    const h = bb.max.y - bb.min.y || 1;
    modele.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) ajouterVent(mesh.material as THREE.Material, vent, false);
    });
    for (let i = 0; i < (leger ? 8 : 18); i++) {
      const f = modele.clone();
      const cote = alea() < 0.5 ? -1 : 1;
      const z = 2 - alea() * 40;
      const x = cheminX(z) + cote * (2 + alea() * 6);
      if (dansEau(x, z, 0.5)) continue;
      f.position.set(x, 0, z);
      f.rotation.y = alea() * Math.PI * 2;
      f.scale.setScalar((0.22 + alea() * 0.15) / h);
      scene.add(f);
    }
  });

  // Rochers
  rocs.forEach((gltf) => {
    const modele = gltf.scene;
    const bb = new THREE.Box3().setFromObject(modele);
    const taille = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) || 1;
    modele.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true;
    });
    for (let i = 0; i < 4; i++) {
      const r = modele.clone();
      const cote = alea() < 0.5 ? -1 : 1;
      const z = 1 - alea() * 45;
      const x = cheminX(z) + cote * (2.6 + alea() * 7);
      if (dansEau(x, z, -0.6)) continue;
      r.position.set(x, -0.1, z);
      r.rotation.set(0, alea() * Math.PI * 2, 0);
      r.scale.setScalar((0.5 + alea() * 1.3) / taille);
      scene.add(r);
    }
  });

  // La forêt : vrais arbres générés (quelques modèles, clonés)
  const modeles: Tree[] = [];
  {
    const choix = leger
      ? ["Oak Medium", "Ash Medium", "Pine Medium", "Aspen Medium", "Bush 1", "Bush 2"]
      : ["Oak Large", "Oak Medium", "Ash Large", "Ash Medium", "Pine Large", "Pine Medium", "Aspen Large", "Aspen Medium", "Bush 1", "Bush 2", "Bush 3"];
    for (const [i, preset] of choix.entries()) {
      const arbre = new Tree();
      arbre.loadPreset(preset);
      arbre.options.seed = 1240 + i * 97;
      arbre.generate();
      arbre.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true;
      });
      const bb = new THREE.Box3().setFromObject(arbre);
      arbre.userData.hauteur = bb.max.y - bb.min.y || 1;
      arbre.userData.buisson = preset.startsWith("Bush");
      modeles.push(arbre);
      await pause();
    }
    const arbres = modeles.filter((a) => !a.userData.buisson);
    const buissons = modeles.filter((a) => a.userData.buisson);
    const nArbres = leger ? 24 : 46;
    for (let i = 0; i < nArbres; i++) {
      const modele = arbres[i % arbres.length];
      const a = modele.clone();
      const cote = i % 2 === 0 ? -1 : 1;
      const z = -7 - alea() * 76;
      const x = cheminX(z) + cote * ((z > -28 ? 12 : 8) + Math.pow(alea(), 1.3) * 24);
      if (dansEau(x, z, 3) || presChateau(x, z, 2)) continue;
      a.scale.setScalar((9 + alea() * 11) / modele.userData.hauteur);
      a.position.set(x, 0, z);
      a.rotation.y = alea() * Math.PI * 2;
      scene.add(a);
    }
    for (let i = 0; i < (leger ? 18 : 36); i++) {
      const modele = arbres[(i + 3) % arbres.length];
      const a = modele.clone();
      const x = 4 + alea() * 70;
      const p = pointRiviere(x, i % 2 === 0 ? -(RIV_DEMI + 4 + alea() * 16) : RIV_DEMI + 3 + alea() * 6);
      if (presChateau(p.x, p.y, 2) || Math.abs(p.x - cheminX(p.y)) < 6) continue;
      a.scale.setScalar((8 + alea() * 10) / modele.userData.hauteur);
      a.position.set(p.x, 0, p.y);
      a.rotation.y = alea() * Math.PI * 2;
      scene.add(a);
    }
    for (let i = 0; i < (leger ? 14 : 30); i++) {
      const modele = buissons[i % buissons.length];
      const b = modele.clone();
      const cote = alea() < 0.5 ? -1 : 1;
      const z = -5 - alea() * 45;
      const x = cheminX(z) + cote * (2.6 + alea() * 9);
      if (dansEau(x, z, 1.5)) continue;
      b.position.set(x, 0, z);
      b.scale.setScalar((1 + alea() * 1.2) / modele.userData.hauteur);
      b.rotation.y = alea() * Math.PI * 2;
      scene.add(b);
    }
  }
  animes.push((t) => modeles.forEach((m) => m.update(t)));

  // Champignons géants (au second plan) et petits champignons lumineux
  {
    const emplacements: { x: number; z: number; geant: boolean }[] = [];
    const placer = (geant: boolean, zMin: number, zMax: number, ecart: [number, number]) => {
      for (let essai = 0; essai < 40; essai++) {
        const z = zMin - alea() * (zMin - zMax);
        const x = cheminX(z) + (alea() < 0.5 ? -1 : 1) * (ecart[0] + alea() * (ecart[1] - ecart[0]));
        if (!dansEau(x, z, geant ? 2.5 : 1) && !presChateau(x, z, 3)) {
          emplacements.push({ x, z, geant });
          return;
        }
      }
    };
    const geants: [number, number][] = [
      [-9.8, -8.6], [-11.6, -14], [-8.6, -19.6], [-3.4, -17.2], [-6.4, -12.6],
      [10.6, -9.6], [9.8, -16.8], [3.9, -15.4], [11.8, -21.6], [7.4, -23.4],
      [-8.4, -27.2], [-3.2, -24.6], [-14.5, -24], [15, -16],
    ];
    for (const [x, z] of leger ? geants.filter((_, i) => i % 3 !== 2) : geants) emplacements.push({ x, z, geant: true });
    for (let i = 0; i < (leger ? 3 : 6); i++) placer(true, -26, -42, [5, 13]);
    for (let i = 0; i < (leger ? 5 : 10); i++) placer(false, -3, -36, [2.4, 8]);
    // Îlots moussus au pied des champignons qui poussent dans l'eau
    const ilot = new THREE.SphereGeometry(1, 22, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const matIlot = new THREE.MeshStandardMaterial({ color: 0x24402e, roughness: 0.95 });
    for (const e of emplacements)
      if (dansEau(e.x, e.z)) {
        const m = new THREE.Mesh(ilot, matIlot);
        m.position.set(e.x, -0.05, e.z);
        m.scale.set(1.3 + alea() * 0.6, 0.35, 1.2 + alea() * 0.6);
        m.receiveShadow = true;
        scene.add(m);
      }
    for (const [x, d] of [[8, -8.5], [14, -7.5], [21, -9], [12, 8.5], [19, 7.8]]) {
      const p = pointRiviere(x, d);
      emplacements.push({ x: p.x, z: p.y, geant: true });
    }
    ajouterChampignons(scene, alea, leger, animes, emplacements);
    ajouterPetitsChampignons(scene, alea, leger);
  }

  // Le Loing : rivière lumineuse, ragondins, héron, chevreuil, chouettes, pont
  ajouterLoing(scene, alea, leger, animes, vent, (scene.fog as THREE.FogExp2).density);

  // Lanternes de papier qui flottent
  {
    const corps = new THREE.SphereGeometry(0.22, 20, 14).scale(1, 1.3, 1);
    const matLanterne = new THREE.MeshStandardMaterial({ color: 0xffd8a0, emissive: 0xffa040, emissiveIntensity: 1.5, roughness: 0.6 });
    const nLumieres = leger ? 0 : 1;
    for (let i = 0; i < (leger ? 5 : 8); i++) {
      const l = new THREE.Group();
      l.add(new THREE.Mesh(corps, matLanterne));
      if (i < nLumieres) l.add(new THREE.PointLight(0xffb060, 4, 9, 2));
      const z = -7 - alea() * 28;
      const x = cheminX(z) + (i % 2 === 0 ? -1 : 1) * (2.2 + alea() * 4.5);
      const y = 2.2 + alea() * 2.8;
      const p = alea() * 10;
      animes.push((t) => {
        l.position.set(x + Math.sin(t * 0.25 + p) * 0.25, y + Math.sin(t * 0.6 + p) * 0.2, z);
        l.rotation.z = Math.sin(t * 0.5 + p) * 0.08;
      });
      scene.add(l);
    }
  }

  // Lucioles
  const lucioles = nuee(
    leger ? 220 : 440,
    { x: [-16, 16], y: [0.2, 3.5], z: [-36, -2] },
    [new THREE.Color(2.2, 1.7, 0.7), new THREE.Color(1.6, 1.9, 0.9), new THREE.Color(2.0, 0.9, 1.4)],
    0.7,
    alea,
  );
  scene.add(lucioles);

  // Cartes à jouer en lévitation
  {
    const faces = [textureCarte("♥", "#d64a83"), textureCarte("♠", "#083d3d"), textureCarte("♦", "#d64a83"), textureCarte("♣", "#083d3d")];
    const geo = new THREE.PlaneGeometry(0.42, 0.59);
    for (let i = 0; i < (leger ? 8 : 14); i++) {
      const carte = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ map: faces[i % 4], side: THREE.DoubleSide, roughness: 0.55, emissive: 0x332a20, emissiveIntensity: 0.25 }),
      );
      carte.castShadow = true;
      const z = -2.5 - alea() * 24;
      const x = cheminX(z) + (alea() < 0.5 ? -1 : 1) * (1.4 + alea() * 4);
      const y = 1.4 + alea() * 2.8;
      const v = 0.25 + alea() * 0.4;
      const p = alea() * 10;
      animes.push((t) => {
        carte.position.set(x, y + Math.sin(t * 0.5 + p) * 0.25, z);
        carte.rotation.set(Math.sin(t * v + p) * 0.5, t * v + p, Math.sin(t * 0.35 + p) * 0.3);
      });
      scene.add(carte);
    }
  }

  // Les étangs : nénuphars en fleur, roseaux, lucioles au ras de l'eau
  ajouterNenuphars(scene, alea, leger ? 40 : 80, () => pointEtang(alea, 0.15, 0.92));
  ajouterRoseaux(scene, alea, leger ? 160 : 360, vent, () => {
    let p: THREE.Vector2;
    do p = pointEtang(alea, 0.92, 1.08);
    while (Math.abs(p.x - cheminX(p.y)) < 2.6);
    return p;
  });
  {
    const surEau = nuee(
      leger ? 90 : 180,
      { x: [-12, 12], y: [0.15, 1.6], z: [-28, -7] },
      [new THREE.Color(2.4, 1.9, 0.6), new THREE.Color(1.6, 2.2, 0.8), new THREE.Color(2.2, 0.9, 1.5)],
      0.9,
      alea,
    );
    scene.add(surEau);
    animes.push((t) => ((surEau.material as THREE.ShaderMaterial).uniforms.uTemps.value = t));
  }
  ajouterOeufs(scene, alea);
  ajouterIlesVolantes(scene, alea, leger, animes);
  ajouterArmillaire(scene, animes);

  // Le petit peuple : ragondins farfelus, libellules, papillons, colibris, fleurs
  ajouterRagondinsMagiques(scene, alea, animes);
  ajouterLibellules(scene, alea, leger, animes);
  ajouterPapillons(scene, alea, leger, animes);
  const fleursGeantes = ajouterFritillaires(scene, alea, leger);
  ajouterColibris(scene, alea, fleursGeantes, animes);
  ajouterFleursLumineuses(scene, alea, leger);

  // Notes de musique dorées qui s'élèvent
  {
    const notes = [textureNote("♪"), textureNote("♫")];
    for (let i = 0; i < (leger ? 6 : 12); i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: notes[i % 2], transparent: true, depthWrite: false, color: new THREE.Color(1.6, 1.4, 1.0) }));
      const x = (alea() - 0.5) * 12;
      const z = -4 - alea() * 30;
      const p = alea();
      const v = 0.05 + alea() * 0.04;
      s.scale.setScalar(0.35 + alea() * 0.25);
      animes.push((t) => {
        const k = (t * v + p) % 1;
        s.position.set(x + Math.sin(k * 10 + p * 9) * 0.5, 0.6 + k * 7, z);
        s.material.opacity = Math.sin(k * Math.PI) * 0.9;
      });
      scene.add(s);
    }
  }

  // Rayons de lune entre les arbres
  for (let i = 0; i < (leger ? 3 : 5); i++) {
    const r = faisceau(new THREE.Color(0.55, 0.7, 0.95), 26, 2.2 + alea() * 1.5, 0.55);
    r.position.set((alea() - 0.5) * 18, 24, -6 - alea() * 26);
    r.rotation.set(0.18, 0, -0.32 + (alea() - 0.5) * 0.1);
    scene.add(r);
    animes.push((t) => ((r.material as THREE.ShaderMaterial).uniforms.uTemps.value = t));
  }

  // La scène au bout du chemin
  {
    const scn = new THREE.Group();
    scn.position.set(cheminX(-46), 0, -46);
    const plateau = new THREE.Mesh(new THREE.BoxGeometry(12, 0.8, 5), new THREE.MeshStandardMaterial({ color: 0x0b1414, roughness: 0.6 }));
    plateau.position.y = 0.4;
    const arche = new THREE.Mesh(
      new THREE.TorusGeometry(5, 0.09, 10, 80, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xd9a95a, metalness: 1, roughness: 0.3, emissive: 0xffb050, emissiveIntensity: 0.6 }),
    );
    arche.position.y = 0.8;
    scn.add(plateau, arche);
    const ampoule = new THREE.SphereGeometry(0.11, 10, 8);
    const matA = new THREE.MeshStandardMaterial({ color: 0xffd0e4, emissive: 0xff70b0, emissiveIntensity: 4 });
    const matB = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffd08a, emissiveIntensity: 4 });
    for (let i = 0; i <= 26; i++) {
      const a = (i / 26) * Math.PI;
      const b = new THREE.Mesh(ampoule, i % 2 ? matA : matB);
      b.position.set(Math.cos(a) * 5, 0.8 + Math.sin(a) * 5, 0.12);
      scn.add(b);
    }
    const lumiereScene = new THREE.PointLight(0xffa8d0, 30, 22, 2);
    lumiereScene.position.set(0, 4, 3);
    scn.add(lumiereScene);
    [new THREE.Color(1.1, 0.4, 0.75), new THREE.Color(0.35, 1.0, 0.85), new THREE.Color(1.1, 0.85, 0.5), new THREE.Color(1.1, 0.4, 0.75)].forEach((c, i) => {
      const f = faisceau(c, 45, 4.5, 0.85);
      f.rotation.x = Math.PI;
      f.position.set(-4.2 + i * 2.8, 0.9, 0.5);
      const p = i * 1.7;
      animes.push((t) => {
        f.rotation.z = Math.sin(t * 0.4 + p) * 0.5;
        f.rotation.x = Math.PI + Math.sin(t * 0.27 + p) * 0.14;
        (f.material as THREE.ShaderMaterial).uniforms.uTemps.value = t;
      });
      scn.add(f);
    });
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: textureHalo(), color: new THREE.Color(0.45, 0.2, 0.35), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    );
    halo.scale.set(16, 9, 1);
    halo.position.set(0, 4, -1);
    scn.add(halo);
    scene.add(scn);
  }

  // Le château de Briquemault dans ses douves, l'île flottante et sa cascade
  ajouterChateau(scene, alea, leger, animes, vent);

  // Brume au ras du sol
  const brumes = [brume(70, 90, new THREE.Color(0x7a5cb0), 0.06), brume(80, 60, new THREE.Color(0x553f86), 0.05)];
  brumes[0].position.set(0, 0.22, -28);
  brumes[1].position.set(0, 0.55, -40);
  const brumeRiviere = brume(100, 12, new THREE.Color(0x6a5aa0), 0.09);
  brumeRiviere.rotation.set(-Math.PI / 2, 0, 0);
  brumeRiviere.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), RIV_ANGLE);
  brumeRiviere.position.set(0, 0.32, RIV_Z0);
  brumes.push(brumeRiviere);
  scene.add(...brumes);

  animes.push((t) => (vent.uTemps.value = t));

  return { scene, lucioles, brumes, animes };
}

// ---------------------------------------------------------------------------
// Rendu « cinéma » : vignettage, grain, légère aberration chromatique
// ---------------------------------------------------------------------------

const PasseCinema = {
  uniforms: { tDiffuse: { value: null }, uTemps: { value: 0 }, uForce: { value: 1 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTemps; uniform float uForce; varying vec2 vUv;
    void main() {
      vec2 c = vUv - 0.5;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float v = smoothstep(0.95, 0.25, length(c * vec2(1.0, 0.9)));
      col *= mix(0.45, 1.0, v);
      col = mix(col, col * vec3(0.92, 1.0, 1.04), 0.5);
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

// Rendu « peinture numérique » : aplats de couleur qui suivent les formes
// (filtre de Kuwahara pondéré, orienté par un bruit pour imiter les coups de
// pinceau), couleurs d'illustration, grain de toile.
const PassePeinture = {
  defines: { RAYON: 3 },
  uniforms: {
    tDiffuse: { value: null },
    uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
    uPas: { value: 1.5 },
    uForce: { value: 1 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uPas; uniform float uForce; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float b(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
      return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
    void main() {
      vec3 base = texture2D(tDiffuse, vUv).rgb;
      float ang = b(vUv * vec2(5.0, 7.0)) * 6.2832;
      mat2 rot = mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
      vec2 pas = uTexel * uPas;
      vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
      vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
      for (int j = 0; j <= RAYON; j++) {
        for (int i = 0; i <= RAYON; i++) {
          vec2 d = rot * vec2(float(i), float(j) * 0.6);
          vec3 c;
          c = texture2D(tDiffuse, vUv - d * pas).rgb; m0 += c; s0 += c * c;
          c = texture2D(tDiffuse, vUv + vec2(d.y, -d.x) * pas).rgb; m1 += c; s1 += c * c;
          c = texture2D(tDiffuse, vUv + d * pas).rgb; m2 += c; s2 += c * c;
          c = texture2D(tDiffuse, vUv + vec2(-d.y, d.x) * pas).rgb; m3 += c; s3 += c * c;
        }
      }
      float n = float((RAYON + 1) * (RAYON + 1));
      m0 /= n; m1 /= n; m2 /= n; m3 /= n;
      float w0 = 1.0 / (1.0 + pow(dot(abs(s0 / n - m0 * m0), vec3(1.0)) * 400.0, 2.0));
      float w1 = 1.0 / (1.0 + pow(dot(abs(s1 / n - m1 * m1), vec3(1.0)) * 400.0, 2.0));
      float w2 = 1.0 / (1.0 + pow(dot(abs(s2 / n - m2 * m2), vec3(1.0)) * 400.0, 2.0));
      float w3 = 1.0 / (1.0 + pow(dot(abs(s3 / n - m3 * m3), vec3(1.0)) * 400.0, 2.0));
      vec3 peint = (m0 * w0 + m1 * w1 + m2 * w2 + m3 * w3) / (w0 + w1 + w2 + w3);
      vec3 col = mix(base, peint, uForce);
      // contours un peu soulignés, comme un trait de pinceau plus sombre
      vec2 e = uTexel * uPas * 1.5;
      vec3 L = vec3(0.299, 0.587, 0.114);
      float gx = dot(texture2D(tDiffuse, vUv + vec2(e.x, 0.0)).rgb - texture2D(tDiffuse, vUv - vec2(e.x, 0.0)).rgb, L);
      float gy = dot(texture2D(tDiffuse, vUv + vec2(0.0, e.y)).rgb - texture2D(tDiffuse, vUv - vec2(0.0, e.y)).rgb, L);
      col *= 1.0 - smoothstep(0.12, 0.45, length(vec2(gx, gy))) * 0.2 * uForce;
      // couleurs d'illustration : plus saturées, ombres bleu-violet, lumières chaudes
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, 1.0 + 0.32 * uForce);
      col = mix(col, col * col * (3.0 - 2.0 * col), 0.35 * uForce);
      col += uForce * (vec3(0.012, 0.0, 0.035) * (1.0 - l) + vec3(0.04, 0.012, -0.02) * l * l);
      // grain de toile et touches de pinceau
      vec2 px = gl_FragCoord.xy;
      float trame = b(px * vec2(0.9, 0.3)) * 0.5 + b(px * vec2(0.3, 0.9)) * 0.5;
      col *= 1.0 + uForce * (trame - 0.5) * 0.045;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

// ---------------------------------------------------------------------------
// Mise en route
// ---------------------------------------------------------------------------

export async function lancerMonde(o: OptionsMonde): Promise<Monde> {
  const alea = hasard(1240);
  const petitEcran = Math.min(window.innerWidth, window.innerHeight) < 700;
  const auto = petitEcran || (navigator.hardwareConcurrency || 8) <= 4;
  const leger = o.qualite === "haute" ? false : o.qualite === "basse" ? true : auto;

  const renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: false, powerPreference: "high-performance" });
  let ratio = Math.min(window.devicePixelRatio || 1, leger ? 1.5 : 2);
  renderer.setPixelRatio(ratio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !leger;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 600);

  // Éclairage d'ambiance (HDRI) pour les reflets de l'or et de l'eau
  const pmrem = new THREE.PMREMGenerator(renderer);
  const hdri = hdriDepuisDataUri(hdriCoucher as unknown as string);
  const environnement = pmrem.fromEquirectangular(hdri).texture;
  hdri.dispose();

  const monde = await construireMonde(alea, leger, o.dossierRessources);
  monde.scene.environment = environnement;

  // Chaîne de rendu
  const cible = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: leger ? 0 : 4 });
  const composer = new EffectComposer(renderer, cible);
  const halo = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.6, 0.8);
  const cinema = new ShaderPass(PasseCinema);
  const peinture = new ShaderPass({ ...PassePeinture, defines: { RAYON: leger ? 2 : 3 } });
  composer.addPass(new RenderPass(monde.scene, camera));
  composer.addPass(halo);
  composer.addPass(cinema);
  composer.addPass(new OutputPass());
  composer.addPass(peinture);

  // Sur le chemin en damier, face à la scène ; le Loing et le château au loin.
  // Avant d'entrer, on est un peu en retrait : on voit le monde à travers le miroir.
  const regardMonde = new THREE.Vector3(0, 2.4, -40);
  const positionMonde = new THREE.Vector3(0, 1.7, -4.5);
  const positionDepart = new THREE.Vector3(0, 2.1, 1.5);
  const directionVue = regardMonde.clone().sub(positionMonde).normalize();

  // --- Cadrage ---
  function cadrer() {
    const l = o.canvas.clientWidth || window.innerWidth;
    const h = o.canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(ratio);
    renderer.setSize(l, h, false);
    composer.setPixelRatio(ratio);
    composer.setSize(l, h);
    camera.aspect = l / h;
    peinture.uniforms.uTexel.value.set(1 / (l * ratio), 1 / (h * ratio));
    peinture.uniforms.uPas.value = 1.6 * ratio;
    const portrait = camera.aspect < 0.8;
    camera.fov = portrait ? 62 : 45;
    regardMonde.x = portrait ? -2 : 0;
    directionVue.copy(regardMonde).sub(positionMonde).normalize();
    camera.updateProjectionMatrix();
    (monde.lucioles.material as THREE.ShaderMaterial).uniforms.uRatio.value = ratio * (h / 900);
  }
  cadrer();

  // --- Entrée : la caméra avance pendant qu'on plonge dans le miroir ---
  const horloge = new THREE.Timer();
  let avancee = o.dejaEntre ? 1 : 0; // 0 = devant le miroir, 1 = dans le monde
  let debutEntree = -1;
  let dureeEntree = 2.6;
  function entrer(duree = 2.6) {
    if (debutEntree >= 0 || avancee >= 1) return;
    dureeEntree = duree;
    debutEntree = horloge.getElapsed();
  }
  function passer() {
    avancee = 1;
    debutEntree = -1;
  }

  // --- Interactions ---
  const pointeur = new THREE.Vector2();
  const pointeurLisse = new THREE.Vector2();
  let defilement = 0;
  function surMouvement(e: PointerEvent) {
    pointeur.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
  }
  function surDefilement() {
    defilement = Math.min(1, window.scrollY / Math.max(1, o.canvas.clientHeight));
  }
  window.addEventListener("pointermove", surMouvement, { passive: true });
  window.addEventListener("scroll", surDefilement, { passive: true });
  const observateurTaille = new ResizeObserver(cadrer);
  observateurTaille.observe(o.canvas);

  let visible = true;
  const observateurVue = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) demarrer();
  });
  observateurVue.observe(o.canvas);
  document.addEventListener("visibilitychange", demarrer);

  // --- Qualité adaptative : si l'appareil peine, on baisse la résolution ---
  let images = 0;
  let debutMesure = 0;
  function ajusterQualite(t: number) {
    images++;
    if (images === 30) debutMesure = t;
    if (images === 120) {
      const ips = 90 / Math.max(0.001, t - debutMesure);
      if (ips < 40 && ratio > 0.75) {
        ratio = Math.max(0.75, ratio * (ips < 25 ? 0.6 : 0.78));
        cadrer();
      }
      images = 0;
    }
  }

  // --- Boucle ---
  let boucle = 0;
  let premiereImage = true;
  const regard = new THREE.Vector3();
  const position = new THREE.Vector3();

  function image() {
    boucle = 0;
    if (!visible || document.hidden) return;
    horloge.update();
    const t = horloge.getElapsed();
    ajusterQualite(t);
    pointeurLisse.lerp(pointeur, 0.04);

    (monde.lucioles.material as THREE.ShaderMaterial).uniforms.uTemps.value = t;
    monde.brumes.forEach((b) => ((b.material as THREE.ShaderMaterial).uniforms.uTemps.value = t));
    cinema.uniforms.uTemps.value = t;
    monde.animes.forEach((f) => f(t));

    if (debutEntree >= 0) {
      avancee = Math.min(1, (t - debutEntree) / dureeEntree);
      if (avancee >= 1) debutEntree = -1;
    }
    const e = lisse(avancee);
    position.lerpVectors(positionDepart, positionMonde, e);
    // Devant le miroir, le monde respire doucement ; ensuite il suit la souris et le défilement
    position.y += (1 - e) * Math.sin(t * 0.4) * 0.06;
    camera.position
      .copy(position)
      .addScaledVector(directionVue, defilement * 6 * e)
      .add(regard.set(pointeurLisse.x * 0.6, pointeurLisse.y * 0.22 + defilement * 0.4, 0));
    regard.set(regardMonde.x + pointeurLisse.x * 3, regardMonde.y + pointeurLisse.y * 1.2, regardMonde.z);
    camera.lookAt(regard);
    halo.strength = 0.55 + Math.sin(Math.min(1, avancee * 1.4) * Math.PI) * 0.5;

    composer.render();

    if (premiereImage) {
      premiereImage = false;
      o.surPret();
    }
    boucle = requestAnimationFrame(image);
  }

  function demarrer() {
    if (!boucle && visible && !document.hidden) boucle = requestAnimationFrame(image);
  }

  // Prépare les shaders avant la première image pour éviter un à-coup
  renderer.compile(monde.scene, camera);
  demarrer();

  return {
    entrer,
    passer,
    detruire() {
      cancelAnimationFrame(boucle);
      observateurTaille.disconnect();
      observateurVue.disconnect();
      window.removeEventListener("pointermove", surMouvement);
      window.removeEventListener("scroll", surDefilement);
      document.removeEventListener("visibilitychange", demarrer);
      renderer.dispose();
    },
  };
}
