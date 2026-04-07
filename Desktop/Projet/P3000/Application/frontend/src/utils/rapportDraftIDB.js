/**
 * Cache local des photos de brouillon (IndexedDB : capacité bien supérieure au localStorage).
 */

const DB_NAME = "rapport-intervention-draft-photos";
const DB_VERSION = 1;
const STORE = "drafts";

const openDb = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

/** Construit l’objet à stocker à partir de l’état React. */
export function buildPhotoSnapshot(pendingPhotos, pendingPhotoPlatine, pendingPhotoPlatinePortail) {
  const pendingPhotosOut = {};
  for (const [idxStr, arr] of Object.entries(pendingPhotos || {})) {
    if (!arr?.length) continue;
    pendingPhotosOut[idxStr] = arr.map((p) => ({
      blob: p.file,
      type_photo: p.type_photo,
      filename: p.filename || p.file?.name || "photo.jpg",
      date_photo: p.date_photo,
    }));
  }
  return {
    pendingPhotos: pendingPhotosOut,
    pendingPhotoPlatine: pendingPhotoPlatine?.file
      ? { blob: pendingPhotoPlatine.file, name: pendingPhotoPlatine.name || pendingPhotoPlatine.file.name }
      : null,
    pendingPhotoPlatinePortail: pendingPhotoPlatinePortail?.file
      ? {
          blob: pendingPhotoPlatinePortail.file,
          name: pendingPhotoPlatinePortail.name || pendingPhotoPlatinePortail.file.name,
        }
      : null,
  };
}

export function photoSnapshotIsEmpty(snapshot) {
  if (!snapshot) return true;
  const p = snapshot.pendingPhotos || {};
  if (Object.keys(p).some((k) => p[k]?.length)) return false;
  if (snapshot.pendingPhotoPlatine?.blob) return false;
  if (snapshot.pendingPhotoPlatinePortail?.blob) return false;
  return true;
}

export async function saveRapportDraftPhotos(draftKey, snapshot) {
  if (!draftKey) return;
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    if (photoSnapshotIsEmpty(snapshot)) {
      store.delete(draftKey);
    } else {
      store.put(snapshot, draftKey);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadRapportDraftPhotos(draftKey) {
  if (!draftKey) return null;
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(draftKey);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearRapportDraftPhotos(draftKey) {
  if (!draftKey) return;
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(draftKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Reconstruit pendingPhotos (fichiers + URLs de prévisualisation). */
export function restorePendingPhotosFromSnapshot(snapshot) {
  if (!snapshot?.pendingPhotos) return {};
  const out = {};
  for (const [idxStr, arr] of Object.entries(snapshot.pendingPhotos)) {
    if (!Array.isArray(arr)) continue;
    out[idxStr] = arr
      .map((item) => {
        const blob = item.blob;
        if (!(blob instanceof Blob)) return null;
        const file = new File([blob], item.filename || "photo.jpg", { type: blob.type || "image/jpeg" });
        const previewUrl = URL.createObjectURL(file);
        return {
          file,
          type_photo: item.type_photo,
          _previewUrl: previewUrl,
          filename: item.filename || file.name,
          date_photo: item.date_photo,
        };
      })
      .filter(Boolean);
  }
  return out;
}

export function restoreVigikPhotoFromSnapshot(entry) {
  if (!entry?.blob || !(entry.blob instanceof Blob)) return null;
  const file = new File([entry.blob], entry.name || "photo.jpg", { type: entry.blob.type || "image/jpeg" });
  const previewUrl = URL.createObjectURL(file);
  return { file, name: entry.name || file.name, previewUrl };
}

/** Applique un snapshot IDB à l’état utilisable par RapportForm. */
export function applyPhotoSnapshotToState(snapshot) {
  if (!snapshot || photoSnapshotIsEmpty(snapshot)) {
    return {
      pendingPhotos: {},
      pendingPhotoPlatine: null,
      pendingPhotoPlatinePortail: null,
    };
  }
  const pendingPhotos = restorePendingPhotosFromSnapshot(snapshot);
  const pendingPhotoPlatine = snapshot.pendingPhotoPlatine?.blob
    ? restoreVigikPhotoFromSnapshot(snapshot.pendingPhotoPlatine)
    : null;
  const pendingPhotoPlatinePortail = snapshot.pendingPhotoPlatinePortail?.blob
    ? restoreVigikPhotoFromSnapshot(snapshot.pendingPhotoPlatinePortail)
    : null;
  return { pendingPhotos, pendingPhotoPlatine, pendingPhotoPlatinePortail };
}
