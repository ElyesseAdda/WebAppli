/**
 * Téléchargement de dossier global : survit au changement de page.
 */

import { downloadFolderToDisk } from './driveOperations';

const listeners = new Set();

const idleState = {
  status: 'idle',
  title: '',
  current: '',
  loaded: 0,
  total: 0,
  progress: 0,
  error: '',
  viaS3: null,
};

let state = { ...idleState };
let abortController = null;
let unloadHandler = null;

const emit = (partial) => {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener(state));
};

export const getFolderDownloadState = () => state;

export const subscribeFolderDownload = (listener) => {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
};

const attachUnloadGuard = () => {
  if (unloadHandler || typeof window === 'undefined') return;
  unloadHandler = (event) => {
    if (state.status !== 'downloading' && state.status !== 'finalizing') return;
    event.preventDefault();
    event.returnValue = '';
  };
  window.addEventListener('beforeunload', unloadHandler);
};

const detachUnloadGuard = () => {
  if (!unloadHandler || typeof window === 'undefined') return;
  window.removeEventListener('beforeunload', unloadHandler);
  unloadHandler = null;
};

export const cancelFolderDownload = () => {
  if (state.status === 'finalizing' || state.status === 'completed') return;
  abortController?.abort();
};

export const dismissFolderDownload = () => {
  if (state.status === 'downloading' || state.status === 'finalizing') return;
  emit({ ...idleState });
};

export async function startFolderDownload({ fileHandle, folderPath, folderName }) {
  if (state.status === 'downloading' || state.status === 'finalizing') {
    throw new Error('Un téléchargement de dossier est déjà en cours');
  }

  abortController = new AbortController();
  attachUnloadGuard();
  emit({
    status: 'downloading',
    title: `Téléchargement de « ${folderName} »`,
    current: 'Préparation du fichier…',
    loaded: 0,
    total: 0,
    progress: 0,
    error: '',
    viaS3: null,
  });

  let writable;
  try {
    writable = await fileHandle.createWritable({ keepExistingData: false });
  } catch (error) {
    abortController = null;
    detachUnloadGuard();
    emit({
      status: 'error',
      current: error.message || 'Impossible de créer le fichier',
      error: error.message || 'Impossible de créer le fichier',
    });
    return;
  }
  let closed = false;
  let committed = false;
  const closeSafely = async () => {
    if (closed) return;
    closed = true;
    await writable.close();
    committed = true;
  };

  try {
    await downloadFolderToDisk({
      folderPath,
      zipFilename: `${folderName}.zip`,
      writable,
      signal: abortController.signal,
      onProgress: ({ loaded, total, current, phase, viaS3 }) => {
        const isFinalizing = phase === 'finalizing';
        const percent = total ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
        emit({
          status: isFinalizing ? 'finalizing' : 'downloading',
          title: `Téléchargement de « ${folderName} »`,
          current: isFinalizing
            ? 'Écriture du fichier sur le disque…'
            : (current || 'Téléchargement en cours…'),
          loaded,
          total,
          progress: isFinalizing ? 100 : percent,
          viaS3: viaS3 ?? state.viaS3,
        });
      },
    });

    emit({
      status: 'finalizing',
      current: 'Écriture du fichier sur le disque…',
      progress: 100,
      loaded: state.total || state.loaded,
    });
    abortController = null;
    await closeSafely();
    emit({
      status: 'completed',
      current: 'Fichier enregistré. Vous pouvez l’ouvrir.',
      progress: 100,
      loaded: state.total || state.loaded,
    });
  } catch (error) {
    const aborted = error?.name === 'AbortError';
    const transferDone = committed || state.status === 'finalizing' || state.progress >= 100;
    if (transferDone) {
      try {
        await closeSafely();
      } catch (closeError) {
        // Le fichier est souvent déjà sur le disque à ce stade.
      }
      emit({
        status: 'completed',
        current: 'Fichier enregistré. Vous pouvez l’ouvrir.',
        progress: 100,
        loaded: state.total || state.loaded,
      });
      return;
    }
    try {
      if (!closed) {
        await writable.abort();
        closed = true;
      }
    } catch (closeError) {
      // ignore
    }
    emit({
      status: aborted ? 'cancelled' : 'error',
      current: aborted ? 'Téléchargement annulé' : (error.message || 'Échec du téléchargement'),
      error: aborted ? '' : (error.message || 'Échec du téléchargement'),
    });
  } finally {
    abortController = null;
    detachUnloadGuard();
  }
}
