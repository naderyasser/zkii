// ═══════════════════════════════════════════════════════════════════════════════
// AI QUEUE — طابور تسلسلي global لنداءات الموديل (CPU واحد للجميع).
// نداء واحد في كل لحظة؛ الباقي ينتظر دوره.
// ═══════════════════════════════════════════════════════════════════════════════

let tail: Promise<unknown> = Promise.resolve();
let pending = 0; // عدد المنتظرين + الجاري حالياً

export function pendingCount(): number {
  return pending;
}

// نفّذ fn بعد ما يخلص اللي قبله (للنداءات غير المتدفّقة)
export function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  pending++;
  const result = tail.then(() => fn());
  tail = result.then(
    () => {},
    () => {}
  );
  const dec = () => {
    pending--;
  };
  result.then(dec, dec);
  return result;
}

// احجز slot يدوياً (للستريم) — بيرجّع دالة release لازم تتنده في finally
export async function acquireSlot(): Promise<() => void> {
  pending++;
  let release!: () => void;
  const done = new Promise<void>((r) => {
    release = r;
  });
  const prev = tail;
  tail = prev.then(() => done); // اللي بعدنا يستنى لحد ما نفك القفل
  await prev; // استنى دورنا
  let released = false;
  return () => {
    if (released) return;
    released = true;
    pending--;
    release();
  };
}
