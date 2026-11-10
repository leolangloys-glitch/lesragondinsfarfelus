// ==========================================================================
// Le monde des Ragondins Farfelus — entrée en 3D de la page d'accueil.
//
// Deux décors :
//   - le « seuil » : le portail doré posé sur le damier, dans la pénombre.
//     À travers le portail, on aperçoit déjà le monde.
//   - le « monde » : une clairière de nuit, chemin en damier, arbres de travers,
//     champignons néon, lanternes, cartes à jouer qui flottent, notes de musique,
//     scène et faisceaux lumineux, château du domaine à l'horizon.
//
// Au clic, la caméra traverse le portail et passe d'un décor à l'autre.
// Tout est dessiné par le code (pas de modèle 3D à télécharger) pour rester
// léger. Quand la graphiste livrera ses illustrations en calques, on pourra
// les poser dans ce décor.
// ==========================================================================

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export type OptionsMonde = {
  canvas: HTMLCanvasElement;
  imagePortail: string;
  dejaEntre: boolean;
  surPret: () => void;
  surDepart: () => void;
  surEntree: () => void;
};

export type Monde = {
  entrer: () => void;
  passer: () => void;
  detruire: () => void;
};

// Générateur aléatoire déterministe : le décor est le même à chaque visite.
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
const hdr = (r: number, g: number, b: number) => new THREE.Color(r, g, b);

// --------------------------------------------------------------------------
// Petites textures dessinées à la volée
// --------------------------------------------------------------------------

function textureDamier(clair: string, fonce: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = fonce;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = clair;
  g.fillRect(0, 0, 64, 64);
  g.fillRect(64, 64, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function textureCarte(symbole: string, couleur: string) {
  const c = document.createElement("canvas");
  c.width = 200;
  c.height = 280;
  const g = c.getContext("2d")!;
  const arrondi = (x: number, y: number, l: number, h: number, r: number) => {
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, l, h, r);
    else g.rect(x, y, l, h);
  };
  g.fillStyle = "#fff6d8";
  arrondi(4, 4, 192, 272, 18);
  g.fill();
  g.strokeStyle = "#c9a15f";
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
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textureNote(symbole: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f3e2b0";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "bold 96px serif";
  g.fillText(symbole, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textureHalo(interieur: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const d = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  d.addColorStop(0, interieur);
  d.addColorStop(0.18, interieur);
  d.addColorStop(0.24, "rgba(255,246,216,0.35)");
  d.addColorStop(1, "rgba(255,246,216,0)");
  g.fillStyle = d;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --------------------------------------------------------------------------
// Matériaux spéciaux
// --------------------------------------------------------------------------

// Faisceau de lumière (cône transparent, plus intense près de sa source)
function faisceau(couleur: THREE.Color, hauteur: number, rayon: number, intensite = 1) {
  const geo = new THREE.ConeGeometry(rayon, hauteur, 32, 1, true);
  geo.translate(0, -hauteur / 2, 0); // la pointe (source) à l'origine
  const mat = new THREE.ShaderMaterial({
    uniforms: { uCouleur: { value: couleur }, uIntensite: { value: intensite } },
    vertexShader: /* glsl */ `
      varying float vV;
      varying vec3 vNormale;
      varying vec3 vVue;
      void main() {
        vV = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormale = normalize(normalMatrix * normal);
        vVue = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCouleur;
      uniform float uIntensite;
      varying float vV;
      varying vec3 vNormale;
      varying vec3 vVue;
      void main() {
        float bord = pow(abs(dot(vNormale, vVue)), 1.6);
        float a = pow(vV, 2.2) * bord * 0.55 * uIntensite;
        gl_FragColor = vec4(uCouleur * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Mesh(geo, mat);
}

// Nuée de particules lumineuses (lucioles, poussière d'or)
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
    uniforms: {
      uTemps: { value: 0 },
      uTaille: { value: taille },
      uRatio: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aPhase;
      attribute vec3 aCouleur;
      uniform float uTemps;
      uniform float uTaille;
      uniform float uRatio;
      varying vec3 vCouleur;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.x += sin(uTemps * 0.5 + aPhase * 6.28) * 0.7;
        p.y += sin(uTemps * 0.8 + aPhase * 12.0) * 0.45;
        p.z += cos(uTemps * 0.4 + aPhase * 9.0) * 0.7;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uTaille * uRatio * (10.0 / max(-mv.z, 0.5));
        vCouleur = aCouleur;
        vAlpha = 0.45 + 0.55 * sin(uTemps * 2.1 + aPhase * 30.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vCouleur;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vAlpha;
        gl_FragColor = vec4(vCouleur * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

// --------------------------------------------------------------------------
// Le seuil : le portail sur le damier
// --------------------------------------------------------------------------

const PORTAIL_L = 3.9;
const PORTAIL_H = PORTAIL_L * (1292 / 1007);
const PORTAIL_Y = PORTAIL_H / 2 + 0.42;

function construireSeuil(texturePortail: THREE.Texture, alea: () => number) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x021818);
  scene.fog = new THREE.FogExp2(0x021818, 0.07);

  // Sol en damier, comme sur l'affiche
  const damier = textureDamier("#0b4d47", "#031010");
  damier.repeat.set(40, 40);
  const sol = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshBasicMaterial({ map: damier }),
  );
  sol.rotation.x = -Math.PI / 2;
  scene.add(sol);

  // Escalier qui mène au portail
  const marche = new THREE.MeshBasicMaterial({ color: 0x0c4946 });
  const nez = new THREE.MeshBasicMaterial({ color: hdr(1.05, 0.98, 0.82) });
  for (let i = 0; i < 3; i++) {
    const largeur = 2.9 - i * 0.35;
    const z = 1.25 - i * 0.42;
    const y = 0.07 + i * 0.14;
    const b = new THREE.Mesh(new THREE.BoxGeometry(largeur, 0.14, 0.42), marche);
    b.position.set(0, y, z);
    const n = new THREE.Mesh(new THREE.BoxGeometry(largeur, 0.025, 0.05), nez);
    n.position.set(0, y + 0.07, z + 0.19);
    scene.add(b, n);
  }

  // Le cadre doré de la graphiste
  const cadre = new THREE.Mesh(
    new THREE.PlaneGeometry(PORTAIL_L, PORTAIL_H),
    new THREE.MeshBasicMaterial({
      map: texturePortail,
      transparent: true,
      depthWrite: false,
      color: hdr(1.3, 1.22, 1.1),
    }),
  );
  cadre.position.set(0, PORTAIL_Y, 0.02);
  cadre.renderOrder = 2;
  scene.add(cadre);

  // Deux faisceaux qui éclairent le portail depuis le ciel
  const f1 = faisceau(hdr(1, 0.85, 0.55), 16, 3.2, 0.5);
  f1.position.set(-3, 15, 1.5);
  f1.rotation.z = -0.2;
  const f2 = faisceau(hdr(0.5, 1, 0.9), 16, 3.2, 0.4);
  f2.position.set(3, 15, 1.5);
  f2.rotation.z = 0.2;
  scene.add(f1, f2);

  // Poussière d'or en suspension
  const poussiere = nuee(
    140,
    { x: [-6, 6], y: [0.2, 7], z: [-3, 6] },
    [hdr(1.6, 1.3, 0.8), hdr(1.2, 1.1, 1.0)],
    0.9,
    alea,
  );
  scene.add(poussiere);

  return { scene, cadre, poussiere };
}

// La membrane : la fenêtre ovale qui montre le monde de l'autre côté
function construireMembrane(texMonde: THREE.Texture) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMonde: { value: texMonde },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTemps: { value: 0 },
      uOuverture: { value: 0 },
      uSurvol: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMonde;
      uniform vec2 uResolution;
      uniform float uTemps;
      uniform float uOuverture;
      uniform float uSurvol;
      varying vec2 vUv;

      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float bruit(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * bruit(p); p *= 2.03; a *= 0.5; }
        return v;
      }

      void main() {
        vec2 c = vUv - 0.5;
        float d = length(c / vec2(0.452, 0.462));
        if (d > 1.0) discard;

        float ferme = 1.0 - uOuverture;
        vec2 suv = gl_FragCoord.xy / uResolution;
        float onde = sin(d * 22.0 - uTemps * 2.4) * 0.006 * ferme;
        vec3 col = texture2D(uMonde, suv + normalize(c + 1e-4) * onde).rgb;

        float n = fbm(vUv * 3.2 + vec2(uTemps * 0.06, -uTemps * 0.04));
        vec3 voile = mix(vec3(0.02, 0.22, 0.2), vec3(1.0, 0.45, 0.72), smoothstep(0.45, 0.85, n));
        float force = (0.06 + 0.32 * smoothstep(0.5, 1.0, d)) * (1.0 - 0.6 * uSurvol) * ferme;
        col = mix(col, voile, force);

        float lisere = smoothstep(0.78, 1.0, d);
        float eclat = uOuverture * (1.0 - uOuverture) * 4.0;
        col += vec3(1.0, 0.78, 0.55) * lisere * (0.1 + 0.45 * uSurvol + 2.0 * eclat);
        col += vec3(1.0, 0.7, 0.85) * eclat * 0.25;

        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(PORTAIL_L, PORTAIL_H), mat);
  m.position.set(0, PORTAIL_Y, 0);
  m.renderOrder = 1;
  return m;
}

// --------------------------------------------------------------------------
// Le monde : la clairière des Ragondins
// --------------------------------------------------------------------------

function construireMonde(alea: () => number, leger: boolean) {
  const scene = new THREE.Scene();
  const brume = new THREE.Color(0x11504b);
  scene.background = brume;
  scene.fog = new THREE.FogExp2(brume, 0.02);
  const animes: ((t: number) => void)[] = [];

  // Ciel : dégradé de nuit avec une lueur rose à l'horizon
  const ciel = new THREE.Mesh(
    new THREE.SphereGeometry(170, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          float y = vDir.y;
          // Couleurs en valeurs linéaires ; l'horizon = la couleur de la brume
          vec3 horizon = vec3(0.0056, 0.080, 0.0785);
          vec3 zenith = vec3(0.0008, 0.006, 0.008);
          vec3 col = mix(horizon, zenith, smoothstep(0.0, 0.5, y));
          col += vec3(0.9, 0.3, 0.55) * exp(-abs(y - 0.05) * 16.0) * 0.16;
          col += vec3(0.1, 0.5, 0.4) * exp(-abs(y - 0.2) * 9.0) * 0.05 * (0.6 + 0.4 * sin(vDir.x * 7.0));
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  scene.add(ciel);

  // Étoiles
  {
    const n = leger ? 500 : 1100;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = alea() * Math.PI * 2;
      const ph = Math.acos(0.12 + alea() * 0.88);
      const r = 150;
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const etoiles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: hdr(1.1, 1.05, 0.95), size: 1.6, sizeAttenuation: false, fog: false }),
    );
    scene.add(etoiles);
  }

  // Lune
  const lune = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: textureHalo("rgba(255,246,216,1)"), fog: false, depthWrite: false }),
  );
  lune.material.color = hdr(1.5, 1.45, 1.3);
  lune.position.set(34, 46, -120);
  lune.scale.setScalar(30);
  scene.add(lune);

  // Sol et chemin en damier
  const sol = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshBasicMaterial({ color: 0x062e2c }),
  );
  sol.rotation.x = -Math.PI / 2;
  scene.add(sol);

  const damier = textureDamier("#13695f", "#041616");
  damier.repeat.set(2, 46);
  const chemin = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 92),
    new THREE.MeshBasicMaterial({ map: damier }),
  );
  chemin.rotation.x = -Math.PI / 2;
  chemin.position.set(0, 0.01, -44);
  scene.add(chemin);

  // Arbres de travers (c'est le monde des Ragondins Farfelus)
  {
    const n = leger ? 110 : 190;
    const geo = new THREE.ConeGeometry(1.25, 4.6, 6);
    geo.translate(0, 2.3, 0);
    const arbres = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial(), n);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const teintes = [0x073833, 0x0a4540, 0x05302d, 0x0d4f47, 0x062f30];
    for (let i = 0; i < n; i++) {
      const cote = alea() < 0.5 ? -1 : 1;
      const x = cote * (5.5 + Math.pow(alea(), 1.4) * 30);
      const z = -10 - alea() * 80;
      const s = 0.7 + alea() * 1.9;
      e.set((alea() - 0.5) * 0.25, alea() * 6, (alea() - 0.5) * 0.5);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.8 + alea() * 0.8), s));
      arbres.setMatrixAt(i, m);
      arbres.setColorAt(i, new THREE.Color(teintes[Math.floor(alea() * teintes.length)]));
    }
    scene.add(arbres);
  }

  // Champignons géants au chapeau néon
  {
    const pied = new THREE.CylinderGeometry(0.16, 0.24, 1, 10);
    pied.translate(0, 0.5, 0);
    const chapeau = new THREE.SphereGeometry(0.75, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const matPied = new THREE.MeshBasicMaterial({ color: hdr(0.5, 0.46, 0.38) });
    const matRose = new THREE.MeshBasicMaterial({ color: hdr(1.2, 0.36, 0.68) });
    const matEmeraude = new THREE.MeshBasicMaterial({ color: hdr(0.18, 0.95, 0.78) });
    for (let i = 0; i < 22; i++) {
      const cote = i % 2 === 0 ? -1 : 1;
      const x = cote * (2.6 + alea() * 5);
      const z = -11 - alea() * 42;
      const s = 0.55 + alea() * 1.6;
      const g = new THREE.Group();
      const p = new THREE.Mesh(pied, matPied);
      p.scale.set(1, 1.2 + alea() * 1.2, 1);
      const c = new THREE.Mesh(chapeau, alea() < 0.72 ? matRose : matEmeraude);
      c.position.y = p.scale.y;
      c.scale.set(1, 0.65, 1);
      g.add(p, c);
      g.position.set(x, 0, z);
      g.scale.setScalar(s);
      g.rotation.z = (alea() - 0.5) * 0.4;
      scene.add(g);
    }
  }

  // Lanternes dorées qui flottent
  {
    const n = leger ? 34 : 60;
    const lanternes = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.11, 10, 8),
      new THREE.MeshBasicMaterial({ color: hdr(2.2, 1.6, 0.85) }),
      n,
    );
    const base = Array.from({ length: n }, () => ({
      x: (alea() - 0.5) * 22,
      y: 1.4 + alea() * 6,
      z: -3 - alea() * 50,
      p: alea() * 10,
    }));
    const m = new THREE.Matrix4();
    animes.push((t) => {
      base.forEach((l, i) => {
        m.makeTranslation(l.x + Math.sin(t * 0.3 + l.p) * 0.3, l.y + Math.sin(t * 0.7 + l.p) * 0.35, l.z);
        lanternes.setMatrixAt(i, m);
      });
      lanternes.instanceMatrix.needsUpdate = true;
    });
    scene.add(lanternes);
  }

  // Lucioles
  const lucioles = nuee(
    leger ? 140 : 260,
    { x: [-13, 13], y: [0.3, 5], z: [-48, -1] },
    [hdr(1.8, 1.45, 0.75), hdr(1.7, 0.75, 1.15), hdr(0.6, 1.5, 1.2)],
    1.1,
    alea,
  );
  scene.add(lucioles);

  // Cartes à jouer qui tournoient dans les airs
  {
    const faces = [
      textureCarte("♥", "#e8578f"),
      textureCarte("♠", "#083d3d"),
      textureCarte("♦", "#e8578f"),
      textureCarte("♣", "#083d3d"),
    ];
    const geo = new THREE.PlaneGeometry(0.62, 0.87);
    for (let i = 0; i < (leger ? 9 : 16); i++) {
      const carte = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ map: faces[i % 4], side: THREE.DoubleSide, color: hdr(1.08, 1.06, 1.02) }),
      );
      const x = (alea() < 0.5 ? -1 : 1) * (1.6 + alea() * 6);
      const y = 1.8 + alea() * 4;
      const z = -4 - alea() * 32;
      const v = 0.3 + alea() * 0.5;
      const p = alea() * 10;
      carte.position.set(x, y, z);
      animes.push((t) => {
        carte.rotation.set(Math.sin(t * v + p) * 0.6, t * v + p, Math.sin(t * 0.4 + p) * 0.4);
        carte.position.y = y + Math.sin(t * 0.6 + p) * 0.35;
      });
      scene.add(carte);
    }
  }

  // Notes de musique qui s'envolent
  {
    const notes = [textureNote("♪"), textureNote("♫")];
    for (let i = 0; i < (leger ? 8 : 14); i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: notes[i % 2], transparent: true, depthWrite: false, color: hdr(1.5, 1.35, 1.0) }),
      );
      const x = (alea() - 0.5) * 14;
      const z = -6 - alea() * 40;
      const p = alea();
      const v = 0.08 + alea() * 0.06;
      s.scale.setScalar(0.7 + alea() * 0.4);
      animes.push((t) => {
        const k = (t * v + p) % 1;
        s.position.set(x + Math.sin(k * 12 + p * 9) * 0.6, 0.5 + k * 9, z);
        s.material.opacity = Math.sin(k * Math.PI);
      });
      scene.add(s);
    }
  }

  // La scène au bout du chemin, avec son arche de lumière et ses faisceaux
  {
    const scn = new THREE.Group();
    scn.position.set(0, 0, -54);
    const plateau = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.7, 5),
      new THREE.MeshBasicMaterial({ color: 0x041d1d }),
    );
    plateau.position.y = 0.35;
    const arche = new THREE.Mesh(
      new THREE.TorusGeometry(5.6, 0.1, 8, 64, Math.PI),
      new THREE.MeshBasicMaterial({ color: hdr(2.0, 1.5, 0.8) }),
    );
    arche.position.y = 0.7;
    scn.add(plateau, arche);

    const ampoule = new THREE.SphereGeometry(0.16, 8, 6);
    const matA = new THREE.MeshBasicMaterial({ color: hdr(2.3, 0.9, 1.4) });
    const matB = new THREE.MeshBasicMaterial({ color: hdr(2.2, 2.0, 1.6) });
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI;
      const b = new THREE.Mesh(ampoule, i % 2 ? matA : matB);
      b.position.set(Math.cos(a) * 5.6, 0.7 + Math.sin(a) * 5.6, 0.15);
      scn.add(b);
    }

    const couleurs = [hdr(1.2, 0.45, 0.8), hdr(0.4, 1.1, 0.95), hdr(1.2, 0.95, 0.55), hdr(1.2, 0.45, 0.8)];
    couleurs.forEach((c, i) => {
      const f = faisceau(c, 40, 5, 0.9);
      f.rotation.x = Math.PI; // la pointe en bas, le faisceau monte vers le ciel
      f.position.set(-4.5 + i * 3, 0.8, 0);
      const p = i * 1.7;
      animes.push((t) => {
        f.rotation.z = Math.sin(t * 0.45 + p) * 0.55;
        f.rotation.x = Math.PI + Math.sin(t * 0.3 + p) * 0.15;
      });
      scn.add(f);
    });
    scene.add(scn);
  }

  // Le château du domaine, en ombre chinoise à l'horizon
  {
    const ombre = new THREE.MeshBasicMaterial({ color: 0x021416, fog: false });
    const fenetre = new THREE.MeshBasicMaterial({ color: hdr(1.9, 1.4, 0.7), fog: false });
    const chateau = new THREE.Group();
    const corps = new THREE.Mesh(new THREE.BoxGeometry(18, 9, 6), ombre);
    corps.position.y = 4.5;
    chateau.add(corps);
    [-9, 9, -3.5].forEach((x, i) => {
      const h = i === 2 ? 17 : 13;
      const tour = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.9, h, 12), ombre);
      tour.position.set(x, h / 2, 1);
      const toit = new THREE.Mesh(new THREE.ConeGeometry(2.3, 4.2, 12), ombre);
      toit.position.set(x, h + 2.1, 1);
      chateau.add(tour, toit);
    });
    for (let i = 0; i < 9; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1), fenetre);
      f.position.set(-7 + (i % 5) * 3.3 + (i > 4 ? 1.6 : 0), i > 4 ? 6.2 : 3.2, 3.02);
      chateau.add(f);
    }
    chateau.position.set(-24, 0, -96);
    chateau.rotation.y = 0.35;
    scene.add(chateau);
  }

  return { scene, lucioles, animes };
}

// --------------------------------------------------------------------------
// Mise en route
// --------------------------------------------------------------------------

export function lancerMonde(o: OptionsMonde): Monde {
  const alea = hasard(1240); // l'année où la forteresse de Briquemault est attestée
  const petitEcran = window.innerWidth < 700;
  const leger = petitEcran || (navigator.hardwareConcurrency || 8) <= 4;

  const renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: !leger, powerPreference: "high-performance" });
  const ratio = Math.min(window.devicePixelRatio || 1, leger ? 1.5 : 1.75);
  renderer.setPixelRatio(ratio);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);

  // Vue du monde à travers le portail (rendue à part, puis collée dans la membrane)
  const vueMonde = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });

  const texturePortail = new THREE.TextureLoader().load(o.imagePortail);
  texturePortail.colorSpace = THREE.SRGBColorSpace;
  texturePortail.anisotropy = 8;

  const seuil = construireSeuil(texturePortail, alea);
  const membrane = construireMembrane(vueMonde.texture);
  seuil.scene.add(membrane);
  const monde = construireMonde(alea, leger);
  const membraneMat = membrane.material as THREE.ShaderMaterial;

  const composer = new EffectComposer(renderer);
  const passeRendu = new RenderPass(seuil.scene, camera);
  const halo = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.45, 0.9);
  const HALO = 0.6;
  composer.addPass(passeRendu);
  composer.addPass(halo);
  composer.addPass(new OutputPass());

  // --- Cadrage selon l'écran ---
  let portrait = false;
  let zDepart = 9.5;
  function cadrer() {
    const l = o.canvas.clientWidth || window.innerWidth;
    const h = o.canvas.clientHeight || window.innerHeight;
    renderer.setSize(l, h, false);
    composer.setSize(l, h);
    halo.resolution.set(l * (leger ? 0.5 : 1), h * (leger ? 0.5 : 1));
    const pr = renderer.getPixelRatio();
    vueMonde.setSize(Math.floor(l * pr), Math.floor(h * pr));
    membraneMat.uniforms.uResolution.value.set(l * pr, h * pr);
    camera.aspect = l / h;
    portrait = camera.aspect < 0.8;
    camera.fov = portrait ? 64 : 46;
    zDepart = portrait ? 9.2 : 10.5;
    camera.updateProjectionMatrix();
    const pointRatio = pr * (h / 900);
    (seuil.poussiere.material as THREE.ShaderMaterial).uniforms.uRatio.value = pointRatio;
    (monde.lucioles.material as THREE.ShaderMaterial).uniforms.uRatio.value = pointRatio;
  }
  cadrer();

  // --- État ---
  type Etat = "seuil" | "traversee" | "monde";
  let etat: Etat = o.dejaEntre ? "monde" : "seuil";
  let debutTraversee = 0;
  const DUREE = 2.9;
  let survol = 0;
  let survolCible = 0;
  const pointeur = new THREE.Vector2(0, 0);
  const pointeurLisse = new THREE.Vector2(0, 0);
  let defilement = 0;

  const regard = new THREE.Vector3();
  const regardSeuil = () => new THREE.Vector3(0, PORTAIL_Y - (portrait ? 1.5 : 0.85), 0);
  const regardMonde = new THREE.Vector3(0, 2.8, -40);
  const positionMonde = new THREE.Vector3(0, 2.0, -6.5);

  function trajet() {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 2.0, zDepart),
      new THREE.Vector3(0, PORTAIL_Y - 0.15, 3.2),
      new THREE.Vector3(0, PORTAIL_Y - 0.25, 0),
      new THREE.Vector3(0, 2.25, -3.2),
      positionMonde.clone(),
    ]);
  }
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

  // N'anime que lorsque le monde est visible à l'écran
  let visible = true;
  const observateurVue = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) demarrer();
  });
  observateurVue.observe(o.canvas);
  document.addEventListener("visibilitychange", demarrer);

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
    if (etat === "monde") return;
    arriver();
  }

  // --- Boucle d'animation ---
  const horloge = new THREE.Timer();
  let boucle = 0;
  let premiereImage = true;

  function image() {
    boucle = 0;
    if (!visible || document.hidden) return;
    horloge.update();
    const t = horloge.getElapsed();
    pointeurLisse.lerp(pointeur, 0.05);
    survol += (survolCible - survol) * 0.08;

    seuil.poussiere.material.uniforms.uTemps.value = t;
    monde.lucioles.material.uniforms.uTemps.value = t;
    membraneMat.uniforms.uTemps.value = t;
    membraneMat.uniforms.uSurvol.value = survol;
    monde.animes.forEach((f) => f(t));

    if (etat === "seuil") {
      camera.position.set(
        pointeurLisse.x * 0.6 + Math.sin(t * 0.3) * 0.15,
        2.0 + pointeurLisse.y * 0.3,
        zDepart,
      );
      regard.copy(regardSeuil());
      camera.lookAt(regard);
      halo.strength = HALO + survol * 0.2;
    } else if (etat === "traversee") {
      const k = Math.min(1, (t - debutTraversee) / DUREE);
      const e = lisse(k);
      camera.position.copy(courbe.getPoint(e));
      regard.lerpVectors(regardSeuil(), regardMonde, Math.min(1, e * 1.4));
      camera.lookAt(regard);
      membraneMat.uniforms.uOuverture.value = Math.min(1, k * 2.2);
      halo.strength = HALO + Math.sin(Math.min(1, k * 1.6) * Math.PI) * 0.8;
      if (passeRendu.scene !== monde.scene && camera.position.z < 0.4) passeRendu.scene = monde.scene;
      if (k >= 1) arriver();
    } else {
      camera.position.set(
        positionMonde.x + pointeurLisse.x * 0.9,
        positionMonde.y + pointeurLisse.y * 0.35 + defilement * 0.6,
        positionMonde.z - defilement * 9,
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
