/**
 * validate-art.ts — يكتشف لوحات public-domain من Met عبر search API، يتحقق إن
 * كل ID بيرجّع primaryImageSmall + isPublicDomain، ويولّد src/lib/art-collection.ts ثابت.
 * يتشغّل مرة واحدة (يحتاج إنترنت): bun scripts/validate-art.ts
 */
import { writeFileSync } from 'fs';

const BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';
const ARTISTS = [
  'Vincent van Gogh', 'Claude Monet', 'Johannes Vermeer', 'Rembrandt',
  'Katsushika Hokusai', 'Edgar Degas', 'Paul Cézanne', 'Pierre-Auguste Renoir',
  'J. M. W. Turner', 'John Singer Sargent', 'Paul Gauguin', 'Camille Pissarro',
  'Georges Seurat', 'Édouard Manet', 'Caravaggio', 'Eugène Delacroix',
];
const PER_ARTIST = 4;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ArtObj { objectID: number; title: string; artist: string; year: string; imageUrl: string }

async function fetchObject(id: number): Promise<ArtObj | null> {
  try {
    const res = await fetch(`${BASE}/objects/${id}`);
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.isPublicDomain || !d.primaryImageSmall) return null;
    return {
      objectID: d.objectID,
      title: d.title || 'Untitled',
      artist: d.artistDisplayName || 'Unknown',
      year: d.objectDate || '',
      imageUrl: d.primaryImageSmall,
    };
  } catch {
    return null;
  }
}

async function main() {
  const collected: ArtObj[] = [];
  const seen = new Set<number>();

  for (const artist of ARTISTS) {
    const url = `${BASE}/search?hasImages=true&q=${encodeURIComponent(artist)}`;
    let ids: number[] = [];
    try {
      const res = await fetch(url);
      const d = await res.json();
      ids = (d.objectIDs || []).slice(0, 40);
    } catch {
      console.warn(`search failed: ${artist}`);
      continue;
    }
    let kept = 0;
    for (const id of ids) {
      if (kept >= PER_ARTIST) break;
      if (seen.has(id)) continue;
      const obj = await fetchObject(id);
      await sleep(280);
      if (obj && obj.artist.toLowerCase().includes(artist.split(' ').pop()!.toLowerCase())) {
        collected.push(obj);
        seen.add(id);
        kept++;
        console.log(`  ✓ ${obj.artist} — ${obj.title} (${obj.objectID})`);
      }
    }
    console.log(`${artist}: ${kept} kept`);
  }

  const file = `// ═══════════════════════════════════════════════════════════════════════════════
// ART COLLECTION — لوحات Met Museum (Open Access / CC0). مُولّد بـ scripts/validate-art.ts
// كل ID متحقَّق إنه public domain وله صورة. عدد: ${collected.length}
// ═══════════════════════════════════════════════════════════════════════════════
export interface ArtObject {
  objectID: number;
  title: string;
  artist: string;
  year: string;
}

export const ART_COLLECTION: ArtObject[] = ${JSON.stringify(
    collected.map(({ imageUrl, ...rest }) => { void imageUrl; return rest; }),
    null,
    2
  )};

export const ART_OBJECT_IDS: number[] = ART_COLLECTION.map((a) => a.objectID);
`;
  writeFileSync('src/lib/art-collection.ts', file, 'utf8');
  console.log(`\nWrote src/lib/art-collection.ts with ${collected.length} artworks.`);
}

main();
