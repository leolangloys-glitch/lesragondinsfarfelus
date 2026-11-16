// Outils pour les liens de musique et de vidéo saisis dans l'administration.

/** Identifiant d'une vidéo YouTube à partir de n'importe quel lien (watch, youtu.be, shorts, embed). */
export function idYouTube(lien: string | undefined): string | null {
  if (!lien) return null;
  const m = lien.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}

/** Lecteur intégré Spotify (artiste, album, titre ou playlist), sinon null. */
export function lecteurSpotify(lien: string | undefined): string | null {
  if (!lien) return null;
  const m = lien.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(artist|album|track|playlist)\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0` : null;
}

/** Nom lisible d'une plateforme d'écoute, pour le bouton. */
export function nomPlateforme(lien: string): string {
  const plateformes: [RegExp, string][] = [
    [/spotify\./, "Spotify"],
    [/deezer\./, "Deezer"],
    [/soundcloud\./, "SoundCloud"],
    [/music\.apple\./, "Apple Music"],
    [/bandcamp\./, "Bandcamp"],
    [/youtube\.|youtu\.be/, "YouTube"],
  ];
  return plateformes.find(([r]) => r.test(lien))?.[1] ?? "Écouter";
}
