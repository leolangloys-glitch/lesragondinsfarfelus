"""Transforme le site construit (dist/) en pages autonomes pour l'aperçu Artifact.

- CSS et JS intégrés dans chaque page, polices (latin) en data: URI
- Images publiées à côté, en chemins relatifs (brouillon/...)
- Liens internes réécrits : /programmation/ -> programmation.html, / -> ./
- Le module 3D (chargé à la demande sur le vrai site) est intégré directement
"""
import base64, re, sys, pathlib, shutil
dist = pathlib.Path(sys.argv[1]); sortie = pathlib.Path(sys.argv[2])
if sortie.exists(): shutil.rmtree(sortie)
for dossier in ("brouillon", "monde"):
    if (dist / dossier).exists():
        shutil.copytree(dist / dossier, sortie / dossier)
for glb in (sortie / "monde").glob("*.glb"):
    glb.rename(glb.with_name(glb.name + ".wasm"))

def data_uri(p):
    mime = {"woff2": "font/woff2"}[p.suffix[1:]]
    return f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()

def css_integre(href):
    css = (dist / href.lstrip("/")).read_text()
    morceaux = re.split(r"(?=@font-face)", css)
    garde = []
    for b in morceaux:
        if b.startswith("@font-face"):
            fin = b.index("}") + 1
            if "-latin-wght" in b[:fin] or "-latin-full" in b[:fin]:
                garde.append(b[:fin])
            garde.append(b[fin:])
        else:
            garde.append(b)
    css = "".join(garde)
    return re.sub(r"url\((/_astro/[^)]+\.woff2)\)", lambda u: f"url({data_uri(dist / u.group(1).lstrip('/'))})", css)

def js_integre(src):
    js = (dist / src.lstrip("/")).read_text()
    modules = ""
    for nom in re.findall(r"import\(`\./([\w.-]+\.js)`\)", js):
        code = (dist / "_astro" / nom).read_text()
        assert not re.search(r"^import |\bimport\(", code, re.M), f"{nom} importe d'autres fichiers"
        m = re.search(r"export\{([^}]*)\};?\s*$", code)
        exports = ",".join(f"{b.strip()}:{a.strip()}" for a, b in (x.split(" as ") if " as " in x else (x, x) for x in m.group(1).split(",")))
        code = code[: m.start()] + f"window.__rf=window.__rf||{{}};window.__rf['{nom}']={{{exports}}};"
        modules += f"<script type=\"module\">{code}</script>"
        js = js.replace(f"import(`./{nom}`)", f"Promise.resolve(window.__rf['{nom}'])")
    return modules + f"<script type=\"module\">{js}</script>"

def nom_page(chemin):
    return "index.html" if chemin == "" else f"{chemin}.html"

def reecrire(html, principale):
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: f"<style>{css_integre(m.group(1))}</style>", html)
    html = re.sub(r'<script type="module" src="([^"]+)"></script>', lambda m: js_integre(m.group(1)), html)
    html = html.replace("/brouillon/", "brouillon/").replace('href="/favicon.svg"', 'href="data:,"')
    # Le service d'aperçu ne sert pas les .glb : on les publie en .glb.wasm (données binaires brutes)
    html = html.replace(".glb`", ".glb.wasm`")
    html = html.replace('"/monde"', '"monde"').replace('`/monde`', '`monde`').replace("/monde/", "monde/")
    html = re.sub(r'<link rel="sitemap"[^>]*>', "", html)
    def lien(m):
        chemin, ancre = m.group(1).strip("/"), m.group(2) or ""
        if chemin == "": return f'href="./{ancre}"'
        return f'href="{chemin}.html{ancre}"'
    html = re.sub(r'href="(/[a-z-]*/?)(#[\w-]+)?"', lien, html)
    if principale:
        html = re.sub(r"<!DOCTYPE html>|</?html[^>]*>|</?head>|</?body>", "", html)
        html = re.sub(r"<title>.*?</title>", "<title>Les Ragondins Farfelus</title>", html, count=1)
    return html

for page in sorted(dist.rglob("index.html")):
    chemin = str(page.parent.relative_to(dist)).replace(".", "")
    html = reecrire(page.read_text(), chemin == "")
    (sortie / nom_page(chemin)).write_text(html)
    print(nom_page(chemin), round(len(html) / 1024), "Ko")
