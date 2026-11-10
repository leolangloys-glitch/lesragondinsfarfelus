// ==========================================================================
// Le monde des Ragondins Farfelus — entrée réaliste en 3D (page d'accueil)
//
// 1. Le seuil : une antichambre de marbre plongée dans la brume. Le portail doré
//    de la graphiste, en relief et en métal, est éclairé par un projecteur.
//    À travers lui, on voit déjà le monde.
// 2. Au clic, la caméra traverse le portail.
// 3. Le monde : une clairière de nuit au clair de lune. Vraie forêt générée
//    (chênes, frênes, pins, trembles), herbe qui ondule au vent, fleurs, rochers,
//    chemin de dalles en damier, champignons bioluminescents, lanternes,
//    lucioles, cartes à jouer en lévitation, scène et faisceaux au loin, brume.
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

async function construireMonde(alea: () => number, leger: boolean, dossier: string) {
  const scene = new THREE.Scene();
  const brumeCouleur = new THREE.Color(0x09201f);
  scene.background = brumeCouleur;
  scene.fog = new THREE.FogExp2(brumeCouleur, leger ? 0.026 : 0.022);
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
          vec3 horizon = vec3(0.0029, 0.0144, 0.0137);
          vec3 zenith = vec3(0.0008, 0.003, 0.006);
          vec3 col = mix(horizon, zenith, smoothstep(-0.02, 0.45, y));
          col += vec3(0.35, 0.09, 0.2) * exp(-abs(y - 0.03) * 22.0) * 0.18;
          vec3 g = floor(d * 380.0);
          float e = h(g);
          float etoile = step(0.9965, e) * smoothstep(0.0, 0.25, y);
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
  scene.add(new THREE.HemisphereLight(0x3b6f78, 0x0a120e, 0.55));
  const lune = new THREE.DirectionalLight(0xa8c8ff, 1.9);
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
           diffuseColor.rgb *= mix(cHerbe, cTerre, s);`,
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
        if (alea() < 0.06 + rang * 0.004) continue;
        const z = 1.8 - rang * 0.96;
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
      o.position.set(x, 0, z);
      o.rotation.set(0, alea() * Math.PI * 2, 0);
      const s = (0.35 + alea() * 0.45) / hauteur;
      o.scale.set(s * (0.8 + alea() * 0.6), s, s * (0.8 + alea() * 0.6));
      o.updateMatrix();
      herbe.setMatrixAt(k, o.matrix);
      herbe.setColorAt(k, c.setRGB(0.55 + alea() * 0.2, 0.7 + alea() * 0.3, 0.45 + alea() * 0.15));
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
      f.position.set(cheminX(z) + cote * (2 + alea() * 6), 0, z);
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
      r.position.set(cheminX(z) + cote * (2.6 + alea() * 7), -0.1, z);
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
    const nArbres = leger ? 34 : 70;
    for (let i = 0; i < nArbres; i++) {
      const modele = arbres[i % arbres.length];
      const a = modele.clone();
      const cote = i % 2 === 0 ? -1 : 1;
      const z = -7 - alea() * 76;
      const x = cheminX(z) + cote * ((z > -28 ? 7 : 5) + Math.pow(alea(), 1.3) * 26);
      a.scale.setScalar((9 + alea() * 11) / modele.userData.hauteur);
      a.position.set(x, 0, z);
      a.rotation.y = alea() * Math.PI * 2;
      scene.add(a);
    }
    for (let i = 0; i < (leger ? 14 : 30); i++) {
      const modele = buissons[i % buissons.length];
      const b = modele.clone();
      const cote = alea() < 0.5 ? -1 : 1;
      const z = -5 - alea() * 45;
      b.position.set(cheminX(z) + cote * (2.6 + alea() * 9), 0, z);
      b.scale.setScalar((1 + alea() * 1.2) / modele.userData.hauteur);
      b.rotation.y = alea() * Math.PI * 2;
      scene.add(b);
    }
  }
  animes.push((t) => modeles.forEach((m) => m.update(t)));

  // Champignons bioluminescents
  {
    const profil = [
      [0.02, 0], [0.55, 0.02], [0.78, 0.08], [0.82, 0.16], [0.7, 0.32], [0.48, 0.46], [0.22, 0.54], [0, 0.56],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const chapeau = new THREE.LatheGeometry(profil, 40);
    const pied = new THREE.LatheGeometry(
      [[0.13, 0], [0.11, 0.3], [0.09, 0.7], [0.1, 1.0], [0.12, 1.06]].map(([x, y]) => new THREE.Vector2(x, y)),
      24,
    );
    const matPied = new THREE.MeshStandardMaterial({ color: 0xe9e0c6, roughness: 0.75, emissive: 0x3a2a2a, emissiveIntensity: 0.3 });
    const teintes = [
      { couleur: 0xff4f9e, lueur: 0xff2f8a },
      { couleur: 0x2fd8b8, lueur: 0x14c8a4 },
    ];
    const pois = new THREE.SphereGeometry(0.05, 10, 6);
    const matPois = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff0d0, emissiveIntensity: 0.5 });
    const nLumieres = leger ? 1 : 3;
    for (let i = 0; i < (leger ? 7 : 12); i++) {
      const t = teintes[alea() < 0.7 ? 0 : 1];
      const g = new THREE.Group();
      const p = new THREE.Mesh(pied, matPied);
      p.scale.set(1, 0.8 + alea() * 0.9, 1);
      const c = new THREE.Mesh(
        chapeau,
        new THREE.MeshPhysicalMaterial({ color: t.couleur, emissive: t.lueur, emissiveIntensity: 0.22, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(t.couleur) }),
      );
      c.position.y = p.scale.y * 1.04;
      const lamelles = new THREE.Mesh(
        new THREE.CircleGeometry(0.76, 32),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(t.lueur).multiplyScalar(2.2), side: THREE.DoubleSide }),
      );
      lamelles.rotation.x = Math.PI / 2;
      lamelles.position.y = c.position.y + 0.01;
      g.add(lamelles);
      for (let k = 0; k < 7; k++) {
        const s = new THREE.Mesh(pois, matPois);
        const ang = alea() * Math.PI * 2;
        const r = 0.15 + alea() * 0.5;
        s.position.set(Math.cos(ang) * r, c.position.y + 0.52 - r * 0.6, Math.sin(ang) * r);
        s.scale.set(1, 0.4, 1);
        g.add(s);
      }
      p.castShadow = c.castShadow = true;
      g.add(p, c);
      const cote = i % 2 === 0 ? -1 : 1;
      const z = -9 - alea() * 30;
      g.position.set(cheminX(z) + cote * (2.6 + alea() * 4), 0, z);
      g.scale.setScalar(0.6 + alea() * 1.0);
      g.rotation.set((alea() - 0.5) * 0.25, alea() * 6, (alea() - 0.5) * 0.25);
      if (i < nLumieres) {
        const l = new THREE.PointLight(t.lueur, 5, 7, 2);
        l.position.set(0, c.position.y + 0.1, 0);
        g.add(l);
      }
      scene.add(g);
    }
  }

  // Lanternes de papier qui flottent
  {
    const corps = new THREE.SphereGeometry(0.22, 20, 14).scale(1, 1.3, 1);
    const matLanterne = new THREE.MeshStandardMaterial({ color: 0xffd8a0, emissive: 0xffa040, emissiveIntensity: 2.6, roughness: 0.6 });
    const nLumieres = leger ? 2 : 4;
    for (let i = 0; i < (leger ? 10 : 18); i++) {
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
    { x: [-12, 12], y: [0.3, 4], z: [-40, 3] },
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
    chateau.position.set(-26, 0, -78);
    chateau.rotation.y = 0.35;
    scene.add(chateau);
  }

  // Brume au ras du sol
  const brumes = [brume(70, 90, new THREE.Color(0x4f7c78), 0.13), brume(80, 60, new THREE.Color(0x3d6663), 0.08)];
  brumes[0].position.set(0, 0.22, -28);
  brumes[1].position.set(0, 0.55, -40);
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
  const regardMonde = new THREE.Vector3(0, 2.4, -40);
  const positionMonde = new THREE.Vector3(0, 1.7, -4.5);

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
      camera.position.set(
        positionMonde.x + pointeurLisse.x * 0.7,
        positionMonde.y + pointeurLisse.y * 0.25 + defilement * 0.5,
        positionMonde.z - defilement * 8,
      );
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
