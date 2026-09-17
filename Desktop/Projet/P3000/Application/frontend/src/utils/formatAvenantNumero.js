const AVENANT_PREFIX_RE = /^avenant\s*n[°oº]?\s*/i;

export function padAvenantNumero(numero) {
  if (numero == null || numero === "") return "";
  const value = String(numero).trim().replace(AVENANT_PREFIX_RE, "").trim();
  if (/^\d+$/.test(value)) {
    return String(parseInt(value, 10)).padStart(2, "0");
  }
  return value;
}

export function formatAvenantNumero(numero) {
  const padded = padAvenantNumero(numero);
  if (!padded) return "";
  return `Avenant n°${padded}`;
}
