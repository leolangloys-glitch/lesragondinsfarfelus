// ==========================================================================
// L'eau dans le miroir : quand on passe la souris ou qu'on touche le miroir,
// de petites vagues partent comme un caillou tombé dans l'eau, et le titre
// ondule à travers. Quelques gouttes tombent aussi toutes seules de temps en
// temps, pour que le miroir ait l'air vivant.
//
// Le canvas (WebGL, sans bibliothèque) redessine exactement ce qu'il y a
// derrière : le dégradé vert de l'affiche, son grain et le logo, puis les
// déforme. Il est découpé à la forme de l'ouverture du miroir (masque CSS).
// ==========================================================================

export type Eau = {
  /** Fait tomber une goutte aux coordonnées de l'écran (clientX / clientY). */
  goutte: (x: number, y: number, force?: number) => void;
  /** Goutte au centre du miroir. */
  goutteAuCentre: (force?: number) => void;
  detruire: () => void;
};

type Options = {
  canvas: HTMLCanvasElement;
  logo: HTMLImageElement;
  affiche: HTMLElement;
  surPret: () => void; // l'eau est dessinée : on peut l'afficher
  surEchec: () => void; // l'eau ne peut pas (ou plus) s'afficher : on garde le titre normal
};

const NB_GOUTTES = 8;

const SOMMETS = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAGMENTS = `
precision highp float;
uniform vec2 uTaille;
uniform float uTemps;
uniform vec4 uGouttes[${NB_GOUTTES}];
uniform sampler2D uLogo;
uniform vec4 uLogoRect;
uniform vec3 uFond;
uniform float uUnite;

// Le dégradé de l'affiche (mêmes arrêts que le CSS de .affiche::before)
vec3 degrade(float t) {
  vec3 c0 = vec3(46., 119., 111.) / 255.;
  vec3 c1 = vec3(36., 102., 95.) / 255.;
  vec3 c2 = vec3(25., 82., 78.) / 255.;
  vec3 c3 = vec3(17., 61., 58.) / 255.;
  vec3 c4 = vec3(11., 43., 43.) / 255.;
  vec3 c5 = vec3(7., 34., 35.) / 255.;
  if (t < 0.23) return mix(c0, c1, t / 0.23);
  if (t < 0.44) return mix(c1, c2, (t - 0.23) / 0.21);
  if (t < 0.65) return mix(c2, c3, (t - 0.44) / 0.21);
  if (t < 0.83) return mix(c3, c4, (t - 0.65) / 0.18);
  if (t < 1.0) return mix(c4, c5, (t - 0.83) / 0.17);
  return c5;
}

float hasard(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// Hauteur de l'eau : des anneaux qui s'élargissent et s'amortissent
float hauteur(vec2 p) {
  float h = 0.0;
  for (int i = 0; i < ${NB_GOUTTES}; i++) {
    vec4 g = uGouttes[i];
    float dt = uTemps - g.z;
    if (g.w <= 0.0 || dt < 0.0 || dt > 4.0) continue;
    float r = length(p - g.xy) / uUnite;
    float x = r - dt * 120.0;
    float enveloppe = exp(-x * x / 1400.0) * exp(-dt * 1.25) * g.w;
    h += enveloppe * sin(x * 0.38);
  }
  return h;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uTaille.y - gl_FragCoord.y);
  float e = 1.5 * uUnite;
  vec2 pente = vec2(
    hauteur(p + vec2(e, 0.0)) - hauteur(p - vec2(e, 0.0)),
    hauteur(p + vec2(0.0, e)) - hauteur(p - vec2(0.0, e))
  ) / 3.0;

  // Réfraction : ce qui est derrière l'eau se décale selon la pente
  vec2 q = p - pente * 11.0 * uUnite;
  vec3 col = degrade(length(q - uFond.xy) / uFond.z);
  vec2 uv = (q - uLogoRect.xy) / uLogoRect.zw;
  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
    vec4 l = texture2D(uLogo, uv);
    col = mix(col, l.rgb, l.a);
  }
  // Grain de l'affiche
  col = mix(col, vec3(1.0), 0.07 * hasard(floor(gl_FragCoord.xy)));

  // Lumière sur les vagues : reflets crème-rosé d'un côté, ombre douce de l'autre
  vec3 n = normalize(vec3(-pente * 2.2, 1.0));
  vec3 lumiere = normalize(vec3(-0.45, -0.6, 0.65));
  float reflet = pow(max(dot(reflect(-lumiere, n), vec3(0.0, 0.0, 1.0)), 0.0), 28.0);
  col *= 1.0 + dot(pente, vec2(-0.45, -0.6)) * 0.9;
  col += vec3(1.0, 0.88, 0.92) * reflet * 0.6;

  gl_FragColor = vec4(col, 1.0);
}`;

function compiler(gl: WebGLRenderingContext, type: number, source: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

export function creerEau(o: Options): Eau | null {
  // Canvas transparent et image conservée : si le téléphone efface le dessin,
  // on voit le titre normal en dessous, jamais un miroir noir.
  const gl = o.canvas.getContext("webgl", {
    antialias: false,
    premultipliedAlpha: false,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  if (!gl) return null;

  type Ressources = {
    uTaille: WebGLUniformLocation | null;
    uTemps: WebGLUniformLocation | null;
    uGouttes: WebGLUniformLocation | null;
    uLogoRect: WebGLUniformLocation | null;
    uFond: WebGLUniformLocation | null;
    uUnite: WebGLUniformLocation | null;
    texture: WebGLTexture | null;
  };

  // Programme, géométrie et texture (refait si le téléphone perd le contexte WebGL)
  function initialiser(): Ressources | null {
    const prog = gl!.createProgram()!;
    gl!.attachShader(prog, compiler(gl!, gl!.VERTEX_SHADER, SOMMETS));
    gl!.attachShader(prog, compiler(gl!, gl!.FRAGMENT_SHADER, FRAGMENTS));
    gl!.linkProgram(prog);
    if (!gl!.getProgramParameter(prog, gl!.LINK_STATUS)) return null;
    gl!.useProgram(prog);
    const tampon = gl!.createBuffer();
    gl!.bindBuffer(gl!.ARRAY_BUFFER, tampon);
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl!.STATIC_DRAW);
    const aPos = gl!.getAttribLocation(prog, "aPos");
    gl!.enableVertexAttribArray(aPos);
    gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0);
    const u = (nom: string) => gl!.getUniformLocation(prog, nom);
    gl!.uniform1i(u("uLogo"), 0);
    const texture = gl!.createTexture();
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    return {
      uTaille: u("uTaille"),
      uTemps: u("uTemps"),
      uGouttes: u("uGouttes"),
      uLogoRect: u("uLogoRect"),
      uFond: u("uFond"),
      uUnite: u("uUnite"),
      texture,
    };
  }

  let r = initialiser();
  if (!r) return null;

  const gouttes = new Float32Array(NB_GOUTTES * 4);
  let prochaine = 0;
  let finAnimation = 0;
  const debut = performance.now();
  const maintenant = () => (performance.now() - debut) / 1000;
  let pret = false;
  let perdu = false;
  let fini = false;

  function echec(erreur?: unknown) {
    if (erreur) console.error("L'eau du miroir ne peut pas s'afficher :", erreur);
    pret = false;
    o.surEchec();
  }

  // Géométrie : tout est recalculé à partir de la mise en page réelle
  function mesurer() {
    if (!r || perdu) return false;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rc = o.canvas.getBoundingClientRect();
    const ra = o.affiche.getBoundingClientRect();
    const rl = o.logo.getBoundingClientRect();
    if (rc.width < 2 || rl.width < 2) return false;
    o.canvas.width = Math.round(rc.width * ratio);
    o.canvas.height = Math.round(rc.height * ratio);
    const echelle = o.canvas.width / rc.width;
    gl!.viewport(0, 0, o.canvas.width, o.canvas.height);
    gl!.uniform2f(r.uTaille, o.canvas.width, o.canvas.height);
    gl!.uniform1f(r.uUnite, o.canvas.width / 600);
    // centre et rayon du dégradé : (50 %, 49 %) de l'affiche, rayon 0,66 × sa largeur
    gl!.uniform3f(
      r.uFond,
      (ra.left + ra.width * 0.5 - rc.left) * echelle,
      (ra.top + ra.height * 0.49 - rc.top) * echelle,
      ra.width * 0.66 * echelle,
    );
    const lx = (rl.left - rc.left) * echelle;
    const ly = (rl.top - rc.top) * echelle;
    const lw = rl.width * echelle;
    const lh = rl.height * echelle;
    gl!.uniform4f(r.uLogoRect, lx, ly, lw, lh);
    // le logo est redessiné à sa taille d'affichage pour rester net
    const toile = document.createElement("canvas");
    toile.width = Math.max(1, Math.round(lw));
    toile.height = Math.max(1, Math.round(lh));
    const c = toile.getContext("2d")!;
    c.imageSmoothingQuality = "high";
    c.drawImage(o.logo, 0, 0, toile.width, toile.height);
    gl!.bindTexture(gl!.TEXTURE_2D, r.texture);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, toile);
    return true;
  }

  let boucle = 0;
  function image() {
    boucle = 0;
    if (!r || perdu || fini) return;
    const t = maintenant();
    try {
      gl!.uniform1f(r.uTemps, t);
      gl!.uniform4fv(r.uGouttes, gouttes);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    } catch (erreur) {
      echec(erreur);
      return;
    }
    if (!pret && !gl!.isContextLost()) {
      pret = true;
      o.surPret();
    }
    if (t < finAnimation && !document.hidden) boucle = requestAnimationFrame(image);
  }
  function relancer() {
    if (!boucle && !fini) boucle = requestAnimationFrame(image);
  }

  function ajouter(xCanvas: number, yCanvas: number, force: number) {
    const t = maintenant();
    gouttes.set([xCanvas, yCanvas, t, force], prochaine * 4);
    prochaine = (prochaine + 1) % NB_GOUTTES;
    finAnimation = Math.max(finAnimation, t + 4);
    relancer();
  }

  function goutte(x: number, y: number, force = 1) {
    const rc = o.canvas.getBoundingClientRect();
    // coordonnées dans le canvas, même pendant le zoom de la traversée
    ajouter(((x - rc.left) / rc.width) * o.canvas.width, ((y - rc.top) / rc.height) * o.canvas.height, force);
  }

  function goutteAuCentre(force = 1) {
    ajouter(o.canvas.width * 0.5, o.canvas.height * 0.5, force);
  }

  // De temps en temps, une goutte tombe toute seule (plus souvent sur les écrans
  // tactiles, où il n'y a pas de survol à la souris)
  const tactile = window.matchMedia("(hover: none)").matches;
  let minuteur = 0;
  function gouttePlusTard() {
    const delai = tactile ? 1800 + Math.random() * 1800 : 3500 + Math.random() * 3000;
    minuteur = window.setTimeout(() => {
      if (!document.hidden && pret) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * 0.28;
        ajouter(o.canvas.width * (0.5 + Math.cos(a) * d), o.canvas.height * (0.5 + Math.sin(a) * d * 0.8), tactile ? 0.9 : 0.7);
      }
      gouttePlusTard();
    }, delai);
  }

  function dessinerDeNouveau() {
    try {
      if (mesurer()) relancer();
    } catch (erreur) {
      echec(erreur);
    }
  }

  const observateur = new ResizeObserver(dessinerDeNouveau);

  // Le téléphone peut retirer le WebGL (mémoire, appli en arrière-plan) : on
  // montre le titre normal, puis on redessine l'eau quand il revient
  function surPerte(e: Event) {
    e.preventDefault();
    perdu = true;
    cancelAnimationFrame(boucle);
    boucle = 0;
    echec();
  }
  function surRetour() {
    perdu = false;
    r = initialiser();
    if (r) dessinerDeNouveau();
  }
  function surVisibilite() {
    if (!document.hidden) relancer();
  }
  o.canvas.addEventListener("webglcontextlost", surPerte);
  o.canvas.addEventListener("webglcontextrestored", surRetour);
  document.addEventListener("visibilitychange", surVisibilite);

  function demarrer() {
    try {
      if (!mesurer()) return;
    } catch (erreur) {
      echec(erreur);
      return;
    }
    observateur.observe(o.canvas);
    relancer();
    gouttePlusTard();
  }
  if (o.logo.complete && o.logo.naturalWidth > 0) demarrer();
  else o.logo.addEventListener("load", demarrer, { once: true });

  return {
    goutte,
    goutteAuCentre,
    detruire() {
      fini = true;
      cancelAnimationFrame(boucle);
      clearTimeout(minuteur);
      observateur.disconnect();
      o.canvas.removeEventListener("webglcontextlost", surPerte);
      o.canvas.removeEventListener("webglcontextrestored", surRetour);
      document.removeEventListener("visibilitychange", surVisibilite);
    },
  };
}
