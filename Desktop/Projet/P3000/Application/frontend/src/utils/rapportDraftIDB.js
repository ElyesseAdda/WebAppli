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

function vigikSnapshotEntries(arr) {
  if (!arr?.length) return [];
  return arr
    .filter((p) => p?.file)
    .map((p) => ({
      blob: p.file,
      name: p.name || p.file.name || "photo.jpg",
    }));
}

/** Construit l'objet à stocker à partir de l'état React. */
export function buildPhotoSnapshot(pendingPhotos, pendingPhotosPlatine, pendingPhotosPlatinePortail) {
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
    pendingPhotosPlatine: vigikSnapshotEntries(pendingPhotosPlatine),
    pendingPhotosPlatinePortail: vigikSnapshotEntries(pendingPhotosPlatinePortail),
  };
}

export function photoSnapshotIsEmpty(snapshot) {
  if (!snapshot) return true;
  const p = snapshot.pendingPhotos || {};
  if (Object.keys(p).some((k) => p[k]?.length)) return false;
  if (snapshot.pendingPhotosPlatine?.length) return false;
  if (snapshot.pendingPhotosPlatinePortail?.length) return false;
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

/** Applique un snapshot IDB à l'état utilisable par RapportForm. */
export function applyPhotoSnapshotToState(snapshot) {
  if (!snapshot || photoSnapshotIsEmpty(snapshot)) {
    return {
      pendingPhotos: {},
      pendingPhotosPlatine: [],
      pendingPhotosPlatinePortail: [],
    };
  }
  const pendingPhotos = restorePendingPhotosFromSnapshot(snapshot);
  const pendingPhotosPlatine = (snapshot.pendingPhotosPlatine || [])
    .map((e) => restoreVigikPhotoFromSnapshot(e))
    .filter(Boolean);
  const pendingPhotosPlatinePortail = (snapshot.pendingPhotosPlatinePortail || [])
    .map((e) => restoreVigikPhotoFromSnapshot(e))
    .filter(Boolean);
  return { pendingPhotos, pendingPhotosPlatine, pendingPhotosPlatinePortail };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.includes(",")) return null;
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const b64 = parts[1];
  if (!b64) return null;
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

/**
 * Sérialise le snapshot (blobs) pour inclusion JSON dans le payload brouillon serveur.
 */
export async function serializePhotoSnapshotForPayload(snapshot) {
  if (!snapshot || photoSnapshotIsEmpty(snapshot)) return null;
  const out = { pendingPhotos: {}, pendingPhotosPlatine: [], pendingPhotosPlatinePortail: [] };
  for (const [idxStr, arr] of Object.entries(snapshot.pendingPhotos || {})) {
    if (!arr?.length) continue;
    out.pendingPhotos[idxStr] = [];
    for (const p of arr) {
      const blob = p.blob;
      if (!(blob instanceof Blob)) continue;
      const dataUrl = await blobToDataUrl(blob);
      out.pendingPhotos[idxStr].push({
        dataUrl,
        type_photo: p.type_photo,
        filename: p.filename || p.file?.name || "photo.jpg",
        date_photo: p.date_photo,
      });
    }
  }
  for (const e of snapshot.pendingPhotosPlatine || []) {
    if (!(e.blob instanceof Blob)) continue;
    out.pendingPhotosPlatine.push({
      dataUrl: await blobToDataUrl(e.blob),
      name: e.name || "photo.jpg",
    });
  }
  for (const e of snapshot.pendingPhotosPlatinePortail || []) {
    if (!(e.blob instanceof Blob)) continue;
    out.pendingPhotosPlatinePortail.push({
      dataUrl: await blobToDataUrl(e.blob),
      name: e.name || "photo.jpg",
    });
  }
  for (const k of Object.keys(out.pendingPhotos)) {
    if (!out.pendingPhotos[k]?.length) delete out.pendingPhotos[k];
  }
  if (
    !Object.keys(out.pendingPhotos).length &&
    !out.pendingPhotosPlatine.length &&
    !out.pendingPhotosPlatinePortail.length
  ) {
    return null;
  }
  return out;
}

/**
 * Repasse du JSON serveur au format snapshot interne (blobs) pour applyPhotoSnapshotToState.
 */
export function deserializePhotoSnapshotFromPayload(serialized) {
  if (!serialized) return null;
  const pendingPhotosOut = {};
  for (const [idxStr, arr] of Object.entries(serialized.pendingPhotos || {})) {
    if (!Array.isArray(arr)) continue;
    pendingPhotosOut[idxStr] = arr
      .map((item) => {
        const blob = dataUrlToBlob(item.dataUrl);
        if (!blob) return null;
        return {
          blob,
          type_photo: item.type_photo,
          filename: item.filename || "photo.jpg",
          date_photo: item.date_photo,
        };
      })
      .filter(Boolean);
  }
  const snapshot = {
    pendingPhotos: pendingPhotosOut,
    pendingPhotosPlatine: [],
    pendingPhotosPlatinePortail: [],
  };
  const legacyPlat = serialized.pendingPhotoPlatine?.dataUrl
    ? [{ dataUrl: serialized.pendingPhotoPlatine.dataUrl, name: serialized.pendingPhotoPlatine.name }]
    : [];
  const arrPlat = serialized.pendingPhotosPlatine?.length ? serialized.pendingPhotosPlatine : legacyPlat;
  for (const item of arrPlat || []) {
    const blob = dataUrlToBlob(item.dataUrl);
    if (blob) snapshot.pendingPhotosPlatine.push({ blob, name: item.name || "photo.jpg" });
  }
  const legacyPort = serialized.pendingPhotoPlatinePortail?.dataUrl
    ? [{ dataUrl: serialized.pendingPhotoPlatinePortail.dataUrl, name: serialized.pendingPhotoPlatinePortail.name }]
    : [];
  const arrPort = serialized.pendingPhotosPlatinePortail?.length
    ? serialized.pendingPhotosPlatinePortail
    : legacyPort;
  for (const item of arrPort || []) {
    const blob = dataUrlToBlob(item.dataUrl);
    if (blob) snapshot.pendingPhotosPlatinePortail.push({ blob, name: item.name || "photo.jpg" });
  }
  return photoSnapshotIsEmpty(snapshot) ? null : snapshot;
}
