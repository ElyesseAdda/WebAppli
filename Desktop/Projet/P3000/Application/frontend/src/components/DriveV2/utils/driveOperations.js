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
