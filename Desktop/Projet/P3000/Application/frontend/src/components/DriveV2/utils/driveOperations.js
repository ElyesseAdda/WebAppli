/**
 * Helpers pour les opérations Drive longues (rename / move / download).
 */

export const getCsrfCookie = (name = 'csrftoken') => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i += 1) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === `${name}=`) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

export async function consumeNdjsonStream(response, onEvent) {
  const contentType = response.headers.get('content-type') || '';
  const isNdjson = contentType.includes('ndjson') || contentType.includes('stream');

  if (!isNdjson) {
    const data = await response.json().catch(() => ({ error: `Erreur HTTP ${response.status}` }));
    if (!response.ok) {
      throw new Error(data.error || `Erreur HTTP ${response.status}`);
    }
    const completed = { status: 'completed', ...data };
    onEvent?.(completed);
    return completed;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: `Erreur HTTP ${response.status}` }));
    throw new Error(data.error || `Erreur HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastEvent = null;

  const handleLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    lastEvent = JSON.parse(trimmed);
    onEvent?.(lastEvent);
    if (lastEvent.status === 'failed') {
      throw new Error(lastEvent.error || 'Opération échouée');
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(handleLine);
  }

  if (buffer.trim()) {
    handleLine(buffer);
  }

  return lastEvent || { status: 'completed' };
}

export async function drivePostWithProgress(url, body, onEvent) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfCookie(),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return consumeNdjsonStream(response, onEvent);
}

export function startNativeFolderDownload(folderPath, folderName) {
  const url = `/api/drive-v2/download-folder/?folder_path=${encodeURIComponent(folderPath)}`;
  const link = document.createElement('a');
  link.href = url;
  link.download = `${folderName || 'dossier'}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const streamFileFallback = (filePath, signal) => fetch(
  `/api/drive-v2/stream-file/?file_path=${encodeURIComponent(filePath)}`,
  { credentials: 'include', signal }
);

export async function downloadFolderToDisk({
  folderPath,
  zipFilename,
  onProgress,
  signal,
  writable,
}) {
  const manifestResponse = await fetch(
    `/api/drive-v2/folder-download-manifest/?folder_path=${encodeURIComponent(folderPath)}`,
    { credentials: 'include', signal }
  );
  if (!manifestResponse.ok) {
    const errorData = await manifestResponse.json().catch(() => ({ error: 'Impossible de préparer le téléchargement' }));
    throw new Error(errorData.error || `Erreur HTTP ${manifestResponse.status}`);
  }

  const manifest = await manifestResponse.json();
  const files = manifest.files || [];
  const total = manifest.total_size || files.reduce((sum, file) => sum + (file.size || 0), 0);
  onProgress?.({
    loaded: 0,
    total,
    current: files.length ? 'Connexion au stockage...' : 'Dossier vide',
    fileCount: files.length,
  });

  const { createZipStoreWriter } = await import('./zipStoreWriter');
  const zipWriter = createZipStoreWriter(writable);
  let loaded = 0;
  let useDirectS3 = true;
  let reportedS3 = null;
  let lastProgressAt = 0;

  const reportProgress = (payload) => {
    const now = Date.now();
    const isFinal = payload.phase === 'finalizing';
    if (!isFinal && now - lastProgressAt < 250 && payload.loaded !== payload.total) {
      return;
    }
    lastProgressAt = now;
    onProgress?.(payload);
  };

  const fetchFile = async (file) => {
    if (useDirectS3 && file.download_url) {
      try {
        const response = await fetch(file.download_url, {
          mode: 'cors',
          credentials: 'omit',
          signal,
        });
        if (response.ok) {
          if (reportedS3 !== true) {
            reportedS3 = true;
            reportProgress({ loaded, total, current: file.relative_path, viaS3: true });
          }
          return response;
        }
      } catch (error) {
        if (error?.name === 'AbortError') throw error;
      }
      useDirectS3 = false;
      if (reportedS3 !== false) {
        reportedS3 = false;
        reportProgress({ loaded, total, current: file.relative_path, viaS3: false });
      }
    }
    const response = await streamFileFallback(file.path, signal);
    if (!response.ok) {
      throw new Error(`Impossible de télécharger ${file.relative_path}`);
    }
    return response;
  };

  for (let i = 0; i < files.length; i += 1) {
    if (signal?.aborted) {
      throw new DOMException('Téléchargement annulé', 'AbortError');
    }

    const file = files[i];
    reportProgress({
      loaded,
      total,
      current: file.relative_path,
      fileIndex: i + 1,
      fileCount: files.length,
      viaS3: reportedS3,
    });

    const response = await fetchFile(file);

    await zipWriter.addFile({
      name: file.relative_path,
      lastModified: file.last_modified,
      stream: response.body,
      sizeHint: file.size || 0,
      onChunk: (byteLength) => {
        loaded += byteLength;
        reportProgress({
          loaded,
          total,
          current: file.relative_path,
          fileIndex: i + 1,
          fileCount: files.length,
          viaS3: reportedS3,
        });
      },
    });
  }

  reportProgress({
    loaded,
    total: total || loaded,
    current: 'Écriture du fichier sur le disque…',
    phase: 'finalizing',
    viaS3: reportedS3,
  });
  await zipWriter.finalize();
  return manifest;
}
