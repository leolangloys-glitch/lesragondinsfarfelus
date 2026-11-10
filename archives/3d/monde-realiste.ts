// ==========================================================================
// Le monde des Ragondins Farfelus — entrée réaliste en 3D (page d'accueil)
//
// 1. Le seuil : une antichambre de marbre plongée dans la brume. Le portail doré
//    de la graphiste, en relief et en métal, est éclairé par un projecteur.
//    À travers lui, on voit déjà le monde.
// 2. Au clic, la caméra traverse le portail.
// 3. Le monde : les berges enchantées du Loing, la nuit. La rivière s'illumine
//    de plancton fluorescent ; des ragondins y nagent en laissant un sillage de
//    lumière. Héron dans les roseaux, chevreuil sur l'autre rive, chouettes aux
//    yeux d'or, nénuphars et massettes lumineux, lanternes qui dérivent, petit
//    pont de bois. Autour : vraie forêt générée, herbe au vent, champignons
//    géants bioluminescents, lucioles, scène et faisceaux, château dans la brume.
//
// Rendu : matériaux physiques, éclairage d'ambiance HDRI, ombres portées,
// halo lumineux, vignettage et grain de film. La qualité s'adapte à l'appareil
// (jusqu'à la 4K sur un écran 4K, allégée sur téléphone).
//
// Crédits : arbres générés avec ez-tree (MIT, Daniel Greenheck) ; herbe, fleurs,
// rochers et textures de sol issus de la démo ez-tree ; HDRI Poly Haven (CC0)
// via @pmndrs/assets. L'ancienne version stylisée est dans monde-stylise.ts.
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
  imagePortail: string; // repli si le cadre en relief n'est pas disponible
  formePortail: string; // contour vectoriel du cadre (JSON)
  dossierRessources: string; // herbe, rochers, textures du sol
  dejaEntre: boolean;
  qualite?: "haute" | "basse" | null;
  surPret: () => void;
  surDepart: () => void;
  surEntree: () => void;
};

export type Monde = {
  entrer: () => void;
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

// Marbre en damier (vert émeraude et noir veiné)
function textureMarbre(alea: () => number) {
  const t = toile(1024, 1024, (g) => {
    const cases = [
      ["#12685d", "#0b1212"],
      ["#0b1212", "#12685d"],
    ];
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        g.fillStyle = cases[i][j];
        g.fillRect(i * 512, j * 512, 512, 512);
      }
    g.globalAlpha = 0.18;
    for (let k = 0; k < 70; k++) {
      g.strokeStyle = alea() < 0.5 ? "#e8f1e8" : "#1d8f7f";
      g.lineWidth = 0.6 + alea() * 2.2;
      g.beginPath();
      let x = alea() * 1024;
      let y = alea() * 1024;
      g.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        x += (alea() - 0.5) * 220;
        y += (alea() - 0.5) * 220;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    g.strokeStyle = "rgba(0,0,0,0.6)";
    g.lineWidth = 3;
    g.strokeRect(0, 0, 512, 512);
    g.strokeRect(512, 512, 512, 512);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
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
// Le portail : cadre doré en relief + membrane qui montre le monde
// ---------------------------------------------------------------------------

const PORTAIL_H = 3.4;
const PORTAIL_L = PORTAIL_H * (1007 / 1292);
const SOCLE = 0.3;
const PORTAIL_Y = SOCLE + PORTAIL_H / 2;

type FormeCadre = { formes: { contour: number[][]; trous: number[][][] }[] };

function versPoints(pts: number[][]) {
  return pts.map(([x, y]) => new THREE.Vector2((x - 0.5) * PORTAIL_L, (0.5 - y) * PORTAIL_H));
}

function aire(pts: THREE.Vector2[]) {
  return pts.length > 2 ? Math.abs(THREE.ShapeUtils.area(pts)) : 0;
}

function construireCadre(forme: FormeCadre, or: THREE.Material) {
  const shapes: THREE.Shape[] = [];
  let ouverture: THREE.Vector2[] = [];
  for (const f of forme.formes) {
    const s = new THREE.Shape(versPoints(f.contour));
    for (const t of f.trous) {
      const p = versPoints(t);
      if (aire(p) > aire(ouverture)) ouverture = p;
      s.holes.push(new THREE.Path(p));
    }
    shapes.push(s);
  }
  const prof = 0.07;
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: prof,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.012,
    bevelSegments: 3,
    curveSegments: 1,
  });
  geo.translate(0, 0, -prof / 2);
  geo.computeVertexNormals();
  const cadre = new THREE.Mesh(geo, or);
  cadre.position.set(0, PORTAIL_Y, 0);
  cadre.castShadow = true;
  return { cadre, ouverture };
}

function construireMembrane(texMonde: THREE.Texture, ouverture: THREE.Vector2[] | null) {
  const geo =
    ouverture && ouverture.length > 8
      ? new THREE.ShapeGeometry(new THREE.Shape(ouverture), 1)
      : new THREE.CircleGeometry(1, 64).scale(PORTAIL_L * 0.45, PORTAIL_H * 0.46, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMonde: { value: texMonde },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTemps: { value: 0 },
      uOuverture: { value: 0 },
      uSurvol: { value: 0 },
      uTaille: { value: new THREE.Vector2(PORTAIL_L, PORTAIL_H) },
    },
    vertexShader: /* glsl */ `
      uniform vec2 uTaille; varying vec2 vUv;
      void main() {
        vUv = position.xy / uTaille + 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMonde; uniform vec2 uResolution;
      uniform float uTemps; uniform float uOuverture; uniform float uSurvol;
      varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float b(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
      float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*b(p); p*=2.03; a*=0.5; } return v; }
      void main() {
        vec2 c = vUv - 0.5;
        float d = length(c / vec2(0.45, 0.46));
        float ferme = 1.0 - uOuverture;
        vec2 suv = gl_FragCoord.xy / uResolution;
        float onde = sin(d * 24.0 - uTemps * 2.0) * 0.004 * ferme;
        vec3 col = texture2D(uMonde, suv + normalize(c + 1e-4) * onde).rgb;
        float n = fbm(vUv * 3.0 + vec2(uTemps * 0.05, -uTemps * 0.035));
        vec3 voile = mix(vec3(0.01, 0.12, 0.11), vec3(0.9, 0.35, 0.6), smoothstep(0.5, 0.9, n));
        col = mix(col, voile, (0.04 + 0.25 * smoothstep(0.55, 1.0, d)) * (1.0 - 0.6 * uSurvol) * ferme);
        float eclat = uOuverture * (1.0 - uOuverture) * 4.0;
        col += vec3(1.0, 0.75, 0.5) * smoothstep(0.82, 1.0, d) * (0.08 + 0.35 * uSurvol + 1.6 * eclat);
        col += vec3(1.0, 0.7, 0.85) * eclat * 0.2;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(0, PORTAIL_Y, -0.005);
  return m;
}

// ---------------------------------------------------------------------------
// Le seuil : antichambre de marbre dans la brume
// ---------------------------------------------------------------------------

function construireSeuil(alea: () => number, leger: boolean, or: THREE.Material) {
  const scene = new THREE.Scene();
  const nuit = new THREE.Color(0x020b0c);
  scene.background = nuit;
  scene.fog = new THREE.FogExp2(nuit, 0.06);
  scene.environmentIntensity = 0.55;

  // Sol de marbre poli en damier
  const marbre = textureMarbre(alea);
  marbre.repeat.set(25, 25);
  const sol = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshPhysicalMaterial({ map: marbre, roughness: 0.2, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.9 }),
  );
  sol.rotation.x = -Math.PI / 2;
  sol.receiveShadow = true;
  scene.add(sol);

  // Socle : deux marches de marbre au nez doré
  const matMarche = new THREE.MeshStandardMaterial({ color: 0x0a2c29, roughness: 0.22, envMapIntensity: 0.8 });
  for (let i = 0; i < 2; i++) {
    const largeur = 3.6 - i * 0.5;
    const prof = 1.5 - i * 0.45;
    const marche = new THREE.Mesh(new THREE.BoxGeometry(largeur, 0.15, prof), matMarche);
    marche.position.set(0, 0.075 + i * 0.15, 0.2 - i * 0.12);
    marche.castShadow = marche.receiveShadow = true;
    const nez = new THREE.Mesh(new THREE.BoxGeometry(largeur + 0.01, 0.02, 0.03), or);
    nez.position.set(0, 0.14 + i * 0.15, 0.2 - i * 0.12 + prof / 2);
    scene.add(marche, nez);
  }

  // Colonnes de marbre qui se perdent dans la brume
  const matColonne = new THREE.MeshPhysicalMaterial({ color: 0x0c2422, roughness: 0.3, clearcoat: 0.6, envMapIntensity: 0.7 });
  const fut = new THREE.CylinderGeometry(0.32, 0.36, 9, 24);
  const chapiteau = new THREE.BoxGeometry(1, 0.3, 1);
  for (const cote of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const f = new THREE.Mesh(fut, matColonne);
      f.position.y = 4.5;
      const base = new THREE.Mesh(chapiteau, matColonne);
      base.position.y = 0.15;
      const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.03, 8, 32), or);
      anneau.rotation.x = Math.PI / 2;
      anneau.position.y = 0.4;
      f.castShadow = f.receiveShadow = true;
      g.add(f, base, anneau);
      g.position.set(cote * (2.7 + i * 1.3), 0, -0.8 - i * 3.4);
      scene.add(g);
    }
  }

  // Lumières
  scene.add(new THREE.HemisphereLight(0x2a5d63, 0x020606, 0.25));
  const projecteur = new THREE.SpotLight(0xffe0b0, 420, 24, 0.45, 0.7, 2);
  projecteur.position.set(0, 9, 4.2);
  projecteur.target.position.set(0, 1.2, 0);
  projecteur.castShadow = !leger;
  projecteur.shadow.mapSize.set(1024, 1024);
  projecteur.shadow.bias = -0.0004;
  scene.add(projecteur, projecteur.target);

  const lueurMonde = new THREE.PointLight(0x7fe0cc, 6, 9, 2);
  lueurMonde.position.set(0, 1.6, 0.6);
  const lueurRose = new THREE.PointLight(0xff8fc8, 3, 7, 2);
  lueurRose.position.set(0, 3.0, 0.5);
  scene.add(lueurMonde, lueurRose);

  // Faisceau visible du projecteur et poussière d'or
  const rayon = faisceau(new THREE.Color(1.0, 0.85, 0.6), 10, 3.2, 0.55);
  rayon.position.copy(projecteur.position);
  rayon.lookAt(projecteur.target.position);
  rayon.rotateX(-Math.PI / 2);
  scene.add(rayon);
  const poussiere = nuee(leger ? 90 : 180, { x: [-2.5, 2.5], y: [0.3, 6], z: [-1, 4] }, [new THREE.Color(1.6, 1.3, 0.9)], 0.6, alea);
  scene.add(poussiere);

  const brumes = [brume(30, 20, new THREE.Color(0x9fc9c2), 0.22), brume(40, 26, new THREE.Color(0x6c9e98), 0.16)];
  brumes[0].position.set(0, 0.25, 0);
  brumes[1].position.set(0, 0.7, -2);
  scene.add(...brumes);

  return { scene, poussiere, brumes, rayon };
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
    { base: "#1d3a8a", points: "#7fe8ff", lueurPoints: 0x56d8ff },
    { base: "#3a1f78", points: "#c7a8ff", lueurPoints: 0xa98bff },
    { base: "#173f6e", points: "#ffd2f0", lueurPoints: 0xff9fd8 },
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
  const matPied = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, emissive: 0x1a0a24, emissiveIntensity: 0.6 });
  const pieds = Array.from({ length: 5 }, () => geometriePied(0.15 + alea() * 0.45, alea() * Math.PI * 2));

  // La lueur des lamelles pulse doucement
  animes.push((t) => (matDessous.emissiveIntensity = 2.2 + Math.sin(t * 0.8) * 0.3));

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
  const n = leger ? 90 : 220;
  const champs = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial(), n);
  const o = new THREE.Object3D();
  const teintes = [new THREE.Color(0.25, 1.4, 2.0), new THREE.Color(0.4, 0.8, 2.2), new THREE.Color(2.0, 0.5, 1.4), new THREE.Color(0.3, 1.8, 1.3)];
  let k = 0;
  while (k < n) {
    const z0 = 1 - alea() * 40;
    const x0 = cheminX(z0) + (alea() < 0.5 ? -1 : 1) * (1.8 + alea() * 9);
    if (dansRiviere(x0, z0, 0.6)) continue;
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

const RIV_Z0 = -16; // la rivière passe à z = -16 sous le pont
const RIV_PENTE = 0.25; // elle traverse la vue en diagonale
const RIV_DEMI = 5; // demi-largeur
const RIV_NORME = Math.sqrt(1 + RIV_PENTE * RIV_PENTE);
const RIV_DIR = new THREE.Vector2(1, RIV_PENTE).normalize(); // sens du courant
const RIV_ANGLE = -Math.atan(RIV_PENTE);

/** Distance signée au milieu de la rivière (positive côté caméra). */
const distRiviere = (x: number, z: number) => (z - (RIV_Z0 + RIV_PENTE * x)) / RIV_NORME;
const dansRiviere = (x: number, z: number, marge = 0) => Math.abs(distRiviere(x, z)) < RIV_DEMI + marge;
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

function construireEau(scene: THREE.Scene, leger: boolean) {
  const geo = new THREE.PlaneGeometry(260, RIV_DEMI * 2 + 0.6);
  let eau: THREE.Mesh;
  if (!leger) {
    eau = new Reflector(geo, {
      textureWidth: Math.floor(window.innerWidth * 0.5),
      textureHeight: Math.floor(window.innerHeight * 0.5),
      color: 0x3a3f58,
      clipBias: 0.003,
    });
  } else {
    eau = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x090a18, roughness: 0.06, metalness: 0.4, envMapIntensity: 0.5 }));
  }
  orienterSurRiviere(eau);
  eau.position.set(0, 0.03, RIV_Z0);
  scene.add(eau);
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
function ajouterRoseaux(scene: THREE.Scene, alea: () => number, leger: boolean, vent: { uTemps: { value: number } }) {
  const n = leger ? 320 : 760;
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
    const x = (alea() - 0.5) * 70;
    const cote = alea() < 0.5 ? -1 : 1;
    const d = cote * (RIV_DEMI - 0.6 + alea() * 1.8);
    const p = pointRiviere(x, d);
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
function ajouterNenuphars(scene: THREE.Scene, alea: () => number, leger: boolean) {
  const n = leger ? 30 : 60;
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
    const x = (alea() - 0.5) * 34;
    const d = (alea() < 0.5 ? -1 : 1) * (2.2 + alea() * 2.4);
    const p = pointRiviere(x, d);
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
  construireEau(scene, leger);
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
  ajouterRoseaux(scene, alea, leger, vent);
  ajouterNenuphars(scene, alea, leger);

  // Ragondins qui nagent en laissant un sillage de lumière
  const mats = matieresRagondin();
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
      const x = (((t * vitesse + phase) % 34) + 34) % 34 - 4;
      const d = decalage + Math.sin(t * 0.3 + i) * 0.5;
      const p = pointRiviere(x, d);
      const dir = RIV_DIR.clone().multiplyScalar(sens);
      const plongee = 1 - THREE.MathUtils.smoothstep(Math.abs(x - 13), 13, 17);
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
    } while (dansRiviere(x, z, 3) || Math.abs(x - cheminX(z)) < 4);
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

async function construireMonde(alea: () => number, leger: boolean, dossier: string) {
  const scene = new THREE.Scene();
  const brumeCouleur = new THREE.Color(0x1a0f2e);
  scene.background = brumeCouleur;
  scene.fog = new THREE.FogExp2(brumeCouleur, leger ? 0.028 : 0.024);
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
      uniforms: { uTemps: { value: 0 } },
      vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTemps; varying vec3 vDir;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
        void main() {
          vec3 d = normalize(vDir);
          float y = d.y;
          // Couleurs linéaires ; l'horizon = la couleur de la brume (violet)
          vec3 horizon = vec3(0.0103, 0.0048, 0.027);
          vec3 zenith = vec3(0.0015, 0.0008, 0.006);
          vec3 col = mix(horizon, zenith, smoothstep(-0.02, 0.5, y));
          col += vec3(0.55, 0.12, 0.35) * exp(-abs(y - 0.04) * 16.0) * 0.12;
          vec2 pn = d.xz / (abs(y) + 0.25) * 1.6 + vec2(uTemps * 0.004, 0.0);
          float nuage = 0.0, amp = 0.5;
          for (int i = 0; i < 4; i++) { vec2 ip = floor(pn), fp = fract(pn); vec2 u = fp*fp*(3.0-2.0*fp);
            float a0 = h(vec3(ip,1.0)), a1 = h(vec3(ip+vec2(1,0),1.0)), a2 = h(vec3(ip+vec2(0,1),1.0)), a3 = h(vec3(ip+vec2(1,1),1.0));
            nuage += amp * mix(mix(a0,a1,u.x), mix(a2,a3,u.x), u.y); pn *= 2.1; amp *= 0.5; }
          float couverture = smoothstep(0.5, 0.85, nuage) * smoothstep(0.0, 0.12, y) * (1.0 - smoothstep(0.35, 0.8, y));
          col = mix(col, vec3(0.05, 0.02, 0.09) + vec3(0.25, 0.06, 0.18) * exp(-abs(y - 0.12) * 8.0), couverture * 0.85);
          vec3 g = floor(d * 380.0);
          float e = h(g);
          float etoile = step(0.9965, e) * smoothstep(0.0, 0.25, y) * (1.0 - couverture);
          etoile *= 0.6 + 0.4 * sin(uTemps * (1.0 + e * 3.0) + e * 50.0);
          col += vec3(0.9, 0.95, 1.0) * etoile * 1.4;
          vec3 lune = normalize(vec3(0.42, 0.34, -0.84));
          float a = max(dot(d, lune), 0.0);
          col += vec3(0.85, 0.9, 1.0) * (smoothstep(0.9993, 0.9996, a) * 6.0 + pow(a, 220.0) * 0.6 + pow(a, 18.0) * 0.05);
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
           float berge = smoothstep(7.5, 5.0, abs((vMonde.z - (-16.0 + 0.25 * vMonde.x)) / 1.0308));
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
      if (dansRiviere(x, z, 0.3)) continue;
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
      if (dansRiviere(x, z, 0.5)) continue;
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
      if (dansRiviere(x, z, -0.6)) continue;
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
      if (dansRiviere(x, z, 3)) continue;
      a.scale.setScalar((9 + alea() * 11) / modele.userData.hauteur);
      a.position.set(x, 0, z);
      a.rotation.y = alea() * Math.PI * 2;
      scene.add(a);
    }
    for (let i = 0; i < (leger ? 18 : 36); i++) {
      const modele = arbres[(i + 3) % arbres.length];
      const a = modele.clone();
      const x = 4 + alea() * 70;
      const p = pointRiviere(x, (i % 2 === 0 ? -1 : 1) * (RIV_DEMI + 4 + alea() * 16));
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
      if (dansRiviere(x, z, 1.5)) continue;
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
        if (!dansRiviere(x, z, geant ? 2.5 : 1)) {
          emplacements.push({ x, z, geant });
          return;
        }
      }
    };
    for (let i = 0; i < (leger ? 4 : 7); i++) placer(true, -5, -42, [4, 13]);
    for (let i = 0; i < (leger ? 5 : 10); i++) placer(false, -3, -36, [2.4, 8]);
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
    const matLanterne = new THREE.MeshStandardMaterial({ color: 0xffd8a0, emissive: 0xffa040, emissiveIntensity: 2.6, roughness: 0.6 });
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
    leger ? 160 : 320,
    { x: [-16, 16], y: [0.3, 3.5], z: [-30, -2] },
    [new THREE.Color(2.2, 1.7, 0.7), new THREE.Color(1.6, 1.9, 0.9), new THREE.Color(2.0, 0.9, 1.4)],
    0.7,
    alea,
  );
  scene.add(lucioles);

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

  // Le château du domaine, au loin dans la brume
  {
    const pierre = new THREE.MeshStandardMaterial({ color: 0x1a2424, roughness: 0.9 });
    const fenetre = new THREE.MeshStandardMaterial({ color: 0xffd090, emissive: 0xffa040, emissiveIntensity: 3 });
    const chateau = new THREE.Group();
    const corps = new THREE.Mesh(new THREE.BoxGeometry(18, 9, 6), pierre);
    corps.position.y = 4.5;
    chateau.add(corps);
    [-9, 9, -3.5].forEach((x, i) => {
      const h = i === 2 ? 17 : 13;
      const tour = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.9, h, 16), pierre);
      tour.position.set(x, h / 2, 1);
      const toit = new THREE.Mesh(new THREE.ConeGeometry(2.3, 4.2, 16), new THREE.MeshStandardMaterial({ color: 0x101818, roughness: 0.7, metalness: 0.2 }));
      toit.position.set(x, h + 2.1, 1);
      chateau.add(tour, toit);
    });
    for (let i = 0; i < 9; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1), fenetre);
      f.position.set(-7 + (i % 5) * 3.3 + (i > 4 ? 1.6 : 0), i > 4 ? 6.2 : 3.2, 3.02);
      chateau.add(f);
    }
    chateau.position.set(42, 0, -36);
    chateau.rotation.y = -1.14;
    scene.add(chateau);
  }

  // Brume au ras du sol
  const brumes = [brume(70, 90, new THREE.Color(0x7a5cb0), 0.08), brume(80, 60, new THREE.Color(0x553f86), 0.06)];
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
      float ca = dot(c, c) * 0.006 * uForce;
      vec3 col = vec3(texture2D(tDiffuse, vUv + c * ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - c * ca).b);
      float v = smoothstep(0.95, 0.25, length(c * vec2(1.0, 0.9)));
      col *= mix(0.45, 1.0, v);
      col = mix(col, col * vec3(0.92, 1.0, 1.04), 0.5);
      float g = fract(sin(dot(vUv * 1000.0 + uTemps * 37.0, vec2(12.9898, 78.233))) * 43758.5453);
      col += (g - 0.5) * 0.012 * uForce;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
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

  // Éclairage d'ambiance (HDRI) pour les reflets de l'or et du marbre
  const pmrem = new THREE.PMREMGenerator(renderer);
  const hdri = hdriDepuisDataUri(hdriCoucher as unknown as string);
  const environnement = pmrem.fromEquirectangular(hdri).texture;
  hdri.dispose();

  const or = new THREE.MeshPhysicalMaterial({
    color: 0xe0b464,
    metalness: 1,
    roughness: 0.28,
    clearcoat: 0.5,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.3,
  });

  // Le monde vu à travers le portail (rendu à résolution réduite)
  const vueMonde = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });

  const seuil = construireSeuil(alea, leger, or);
  seuil.scene.environment = environnement;

  // Cadre doré en relief (repli : image plate si le contour manque)
  let ouverture: THREE.Vector2[] | null = null;
  try {
    const forme = (await (await fetch(o.formePortail)).json()) as FormeCadre;
    const res = construireCadre(forme, or);
    ouverture = res.ouverture;
    seuil.scene.add(res.cadre);
  } catch {
    const tex = await new THREE.TextureLoader().loadAsync(o.imagePortail);
    tex.colorSpace = THREE.SRGBColorSpace;
    const plan = new THREE.Mesh(
      new THREE.PlaneGeometry(PORTAIL_L, PORTAIL_H),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, metalness: 0.6, roughness: 0.35 }),
    );
    plan.position.set(0, PORTAIL_Y, 0.01);
    seuil.scene.add(plan);
  }
  const membrane = construireMembrane(vueMonde.texture, ouverture);
  seuil.scene.add(membrane);
  const membraneMat = membrane.material as THREE.ShaderMaterial;

  const monde = await construireMonde(alea, leger, o.dossierRessources);
  monde.scene.environment = environnement;

  // Chaîne de rendu
  const cible = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: leger ? 0 : 4 });
  const composer = new EffectComposer(renderer, cible);
  const passeRendu = new RenderPass(seuil.scene, camera);
  const halo = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.6, 0.78);
  const HALO = 0.5;
  const cinema = new ShaderPass(PasseCinema);
  composer.addPass(passeRendu);
  composer.addPass(halo);
  composer.addPass(cinema);
  composer.addPass(new OutputPass());

  // --- Cadrage ---
  let portrait = false;
  let zDepart = 6.6;
  function cadrer() {
    const l = o.canvas.clientWidth || window.innerWidth;
    const h = o.canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(ratio);
    renderer.setSize(l, h, false);
    composer.setPixelRatio(ratio);
    composer.setSize(l, h);
    vueMonde.setSize(Math.floor(l * ratio * 0.6), Math.floor(h * ratio * 0.6));
    membraneMat.uniforms.uResolution.value.set(l * ratio, h * ratio);
    camera.aspect = l / h;
    portrait = camera.aspect < 0.8;
    camera.fov = portrait ? 62 : 45;
    zDepart = portrait ? 7.0 : 6.6;
    camera.updateProjectionMatrix();
    const pointRatio = ratio * (h / 900);
    (seuil.poussiere.material as THREE.ShaderMaterial).uniforms.uRatio.value = pointRatio;
    (monde.lucioles.material as THREE.ShaderMaterial).uniforms.uRatio.value = pointRatio;
  }
  cadrer();

  // --- État ---
  type Etat = "seuil" | "traversee" | "monde";
  let etat: Etat = o.dejaEntre ? "monde" : "seuil";
  let debutTraversee = 0;
  const DUREE = 3.4;
  let survol = 0;
  let survolCible = 0;
  const pointeur = new THREE.Vector2();
  const pointeurLisse = new THREE.Vector2();
  let defilement = 0;

  const regard = new THREE.Vector3();
  const regardSeuil = () => new THREE.Vector3(0, portrait ? 1.25 : 1.85, 0);
  // Au sommet du pont, accoudé à la rambarde, on regarde le Loing descendre
  const regardMonde = new THREE.Vector3(17, 0.1, -12.2);
  const positionMonde = new THREE.Vector3(cheminX(RIV_Z0) - 0.2, 2.75, RIV_Z0);
  const directionVue = regardMonde.clone().sub(positionMonde).normalize();

  const trajet = () =>
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.65, zDepart),
      new THREE.Vector3(0, 1.95, 2.6),
      new THREE.Vector3(0, PORTAIL_Y - 0.1, 0.2),
      new THREE.Vector3(0, 1.85, -2.2),
      positionMonde.clone(),
    ]);
  let courbe = trajet();

  // --- Interactions ---
  const raycaster = new THREE.Raycaster();
  function surMouvement(e: PointerEvent) {
    const r = o.canvas.getBoundingClientRect();
    pointeur.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    if (etat === "seuil") {
      raycaster.setFromCamera(pointeur, camera);
      const touche = raycaster.intersectObject(membrane).length > 0;
      survolCible = touche ? 1 : 0;
      o.canvas.style.cursor = touche ? "pointer" : "";
    }
  }
  function surClic(e: PointerEvent) {
    if (etat !== "seuil") return;
    surMouvement(e);
    if (survolCible > 0) entrer();
  }
  function surDefilement() {
    defilement = Math.min(1, window.scrollY / Math.max(1, o.canvas.clientHeight));
  }
  o.canvas.addEventListener("pointermove", surMouvement);
  o.canvas.addEventListener("pointerdown", surClic);
  window.addEventListener("scroll", surDefilement, { passive: true });
  const observateurTaille = new ResizeObserver(() => {
    cadrer();
    courbe = trajet();
  });
  observateurTaille.observe(o.canvas);

  let visible = true;
  const observateurVue = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) demarrer();
  });
  observateurVue.observe(o.canvas);
  document.addEventListener("visibilitychange", demarrer);

  const horloge = new THREE.Timer();

  function entrer() {
    if (etat !== "seuil") return;
    etat = "traversee";
    debutTraversee = horloge.getElapsed();
    o.canvas.style.cursor = "";
    o.surDepart();
  }
  function arriver() {
    etat = "monde";
    passeRendu.scene = monde.scene;
    o.surEntree();
  }
  function passer() {
    if (etat !== "monde") arriver();
  }

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

  function image() {
    boucle = 0;
    if (!visible || document.hidden) return;
    horloge.update();
    const t = horloge.getElapsed();
    ajusterQualite(t);
    pointeurLisse.lerp(pointeur, 0.04);
    survol += (survolCible - survol) * 0.08;

    (seuil.poussiere.material as THREE.ShaderMaterial).uniforms.uTemps.value = t;
    seuil.brumes.forEach((b) => ((b.material as THREE.ShaderMaterial).uniforms.uTemps.value = t));
    (seuil.rayon.material as THREE.ShaderMaterial).uniforms.uTemps.value = t;
    (monde.lucioles.material as THREE.ShaderMaterial).uniforms.uTemps.value = t;
    monde.brumes.forEach((b) => ((b.material as THREE.ShaderMaterial).uniforms.uTemps.value = t));
    membraneMat.uniforms.uTemps.value = t;
    membraneMat.uniforms.uSurvol.value = survol;
    cinema.uniforms.uTemps.value = t;
    monde.animes.forEach((f) => f(t));

    if (etat === "seuil") {
      camera.position.set(pointeurLisse.x * 0.45 + Math.sin(t * 0.25) * 0.08, 1.65 + pointeurLisse.y * 0.18, zDepart);
      camera.lookAt(regard.copy(regardSeuil()));
      halo.strength = HALO + survol * 0.15;
    } else if (etat === "traversee") {
      const k = Math.min(1, (t - debutTraversee) / DUREE);
      const e = lisse(k);
      camera.position.copy(courbe.getPoint(e));
      regard.lerpVectors(regardSeuil(), regardMonde, Math.min(1, e * 1.3));
      camera.lookAt(regard);
      membraneMat.uniforms.uOuverture.value = Math.min(1, k * 2);
      halo.strength = HALO + Math.sin(Math.min(1, k * 1.5) * Math.PI) * 0.7;
      if (passeRendu.scene !== monde.scene && camera.position.z < 0.12) passeRendu.scene = monde.scene;
      if (k >= 1) arriver();
    } else {
      camera.position
        .copy(positionMonde)
        .addScaledVector(directionVue, defilement * 6)
        .add(regard.set(pointeurLisse.x * 0.6, pointeurLisse.y * 0.22 + defilement * 0.4, 0));
      regard.set(regardMonde.x + pointeurLisse.x * 3, regardMonde.y + pointeurLisse.y * 1.2, regardMonde.z);
      camera.lookAt(regard);
      halo.strength = HALO;
    }

    if (passeRendu.scene === seuil.scene) {
      renderer.setRenderTarget(vueMonde);
      renderer.render(monde.scene, camera);
      renderer.setRenderTarget(null);
    }
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

  if (etat === "monde") passeRendu.scene = monde.scene;
  // Prépare les shaders avant la première image pour éviter un à-coup au clic
  renderer.compile(monde.scene, camera);
  renderer.compile(seuil.scene, camera);
  demarrer();

  return {
    entrer,
    passer,
    detruire() {
      cancelAnimationFrame(boucle);
      observateurTaille.disconnect();
      observateurVue.disconnect();
      window.removeEventListener("scroll", surDefilement);
      document.removeEventListener("visibilitychange", demarrer);
      renderer.dispose();
    },
  };
}
