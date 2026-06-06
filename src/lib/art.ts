// ═══════════════════════════════════════════════════════════════════════════════
// ART (server) — جلب لوحة من Met API مع كاش ذاكرة 24 ساعة + resilience
// ═══════════════════════════════════════════════════════════════════════════════
import { ART_OBJECT_IDS, ART_COLLECTION } from './art-collection';

const BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';
const TTL_MS = 24 * 60 * 60 * 1000;

export interface ArtResult {
  objectID: number;
  title: string;
  artist: string;
  year: string;
  imageUrl: string;
}

const cache = new Map<number, { data: ArtResult; ts: number }>();

function seed(id: number) {
  return ART_COLLECTION.find((a) => a.objectID === id);
}

// يجيب تفاصيل لوحة (مع صورة). null لو فشل/مفيش صورة.
export async function fetchArt(id: number): Promise<ArtResult | null> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data;
  try {
    const res = await fetch(`${BASE}/objects/${id}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const d = await res.json();
    const imageUrl: string = d.primaryImageSmall || d.primaryImage || '';
    if (!imageUrl) return null;
    const s = seed(id);
    const data: ArtResult = {
      objectID: id,
      title: d.title || s?.title || 'Untitled',
      artist: d.artistDisplayName || s?.artist || 'Unknown',
      year: d.objectDate || s?.year || '',
      imageUrl,
    };
    cache.set(id, { data, ts: Date.now() });
    return data;
  } catch {
    return null;
  }
}

// يجيب لوحة عشوائية (يجرّب عدّة IDs لحد ما يلاقي صورة)
export async function randomArt(excludeId?: number): Promise<ArtResult | null> {
  const ids = ART_OBJECT_IDS.filter((id) => id !== excludeId);
  // خلط Fisher–Yates
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  for (const id of ids) {
    const art = await fetchArt(id);
    if (art) return art;
  }
  return null;
}
