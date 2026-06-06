// ═══════════════════════════════════════════════════════════════════════════════
// ART COLLECTION — لوحات Met Museum (Open Access / CC0).
// قائمة مُنسّقة لأعمال public-domain شهيرة. الميتاداتا تُجلب live وقت العرض،
// ودي بمثابة seed/fallback. الـ API route resilient: لو ID فشل بيجرّب غيره.
// (مولّدة جزئياً بـ scripts/validate-art.ts ثم منسّقة يدوياً بسبب rate-limit الـ API.)
// ═══════════════════════════════════════════════════════════════════════════════
export interface ArtObject {
  objectID: number;
  title: string;
  artist: string;
  year: string;
}

export const ART_COLLECTION: ArtObject[] = [
  // Van Gogh
  { objectID: 436535, title: 'Wheat Field with Cypresses', artist: 'Vincent van Gogh', year: '1889' },
  { objectID: 436532, title: 'Self-Portrait with a Straw Hat', artist: 'Vincent van Gogh', year: '1887' },
  { objectID: 437984, title: 'Sunflowers', artist: 'Vincent van Gogh', year: '1887' },
  { objectID: 459123, title: 'La Berceuse (Woman Rocking a Cradle)', artist: 'Vincent van Gogh', year: '1889' },
  // Monet
  { objectID: 437133, title: 'Bridge over a Pond of Water Lilies', artist: 'Claude Monet', year: '1899' },
  { objectID: 438008, title: 'The Houses of Parliament (Effect of Fog)', artist: 'Claude Monet', year: '1903–04' },
  { objectID: 437127, title: 'Garden at Sainte-Adresse', artist: 'Claude Monet', year: '1867' },
  // Vermeer
  { objectID: 437881, title: 'Young Woman with a Water Pitcher', artist: 'Johannes Vermeer', year: 'ca. 1662' },
  // Rembrandt
  { objectID: 437394, title: 'Self-Portrait', artist: 'Rembrandt', year: '1660' },
  // Hokusai
  { objectID: 45434, title: 'Under the Wave off Kanagawa (The Great Wave)', artist: 'Katsushika Hokusai', year: 'ca. 1830–32' },
  // Degas (validated this session)
  { objectID: 438817, title: 'The Dance Class', artist: 'Edgar Degas', year: '1874' },
  { objectID: 436155, title: 'The Rehearsal of the Ballet Onstage', artist: 'Edgar Degas', year: 'ca. 1874' },
  { objectID: 436135, title: 'Dancer with a Fan', artist: 'Edgar Degas', year: 'ca. 1880' },
  { objectID: 436122, title: 'The Collector of Prints', artist: 'Edgar Degas', year: '1866' },
  // Cézanne (validated this session)
  { objectID: 435882, title: 'Still Life with Apples and a Pot of Primroses', artist: 'Paul Cézanne', year: 'ca. 1890' },
  { objectID: 435868, title: 'The Card Players', artist: 'Paul Cézanne', year: '1890–92' },
  { objectID: 459092, title: 'Trees and Houses Near the Jas de Bouffan', artist: 'Paul Cézanne', year: '1885–86' },
  { objectID: 435876, title: 'Madame Cézanne in a Red Dress', artist: 'Paul Cézanne', year: '1888–90' },
  // Renoir (validated this session)
  { objectID: 459110, title: 'Young Girl Bathing', artist: 'Auguste Renoir', year: '1892' },
  { objectID: 437432, title: 'Tilla Durieux', artist: 'Auguste Renoir', year: '1914' },
  { objectID: 438011, title: 'Eugène Murer', artist: 'Auguste Renoir', year: '1877' },
  { objectID: 438815, title: 'Madame Georges Charpentier and Her Children', artist: 'Auguste Renoir', year: '1878' },
  // Sargent / Turner
  { objectID: 12127, title: 'Madame X (Madame Pierre Gautreau)', artist: 'John Singer Sargent', year: '1883–84' },
  { objectID: 437196, title: 'Venice, from the Porch of Madonna della Salute', artist: 'J. M. W. Turner', year: 'ca. 1835' },
];

export const ART_OBJECT_IDS: number[] = ART_COLLECTION.map((a) => a.objectID);
