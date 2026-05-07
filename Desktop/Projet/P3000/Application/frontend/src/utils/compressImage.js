const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const QUALITY = 0.8;

/** Photos rapport Vigik+ : dimensions modérées + JPEG pour limiter le poids (upload / nginx). */
export const VIGIK_REPORT_PHOTO_OPTIONS = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.78,
  force: true,
};

/**
 * Compresse une image via un canvas pour limiter le poids de l'upload.
 *
 * @param {File} file
 * @param {{ maxWidth?: number, maxHeight?: number, quality?: number, force?: boolean, skipIfBytesUnder?: number }} [opts]
 *   force : si true, repasse toujours par le canvas JPEG (ignore le court-circuit « déjà léger »).
 *   skipIfBytesUnder : seuil du court-circuit quand force est false (défaut 500 ko).
 */
export function compressImage(
  file,
  { maxWidth = MAX_WIDTH, maxHeight = MAX_HEIGHT, quality = QUALITY, force = false, skipIfBytesUnder = 500_000 } = {}
) {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      if (!force && width <= maxWidth && height <= maxHeight && file.size < skipIfBytesUnder) {
        resolve(file);
        return;
      }

      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round(width * (maxHeight / height));
        height = maxHeight;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const baseName = (file.name || "photo").replace(/\.[^/.]+$/, "") || "photo";
          const outName = /\.jpe?g$/i.test(file.name || "") ? file.name || "photo.jpg" : `${baseName}.jpg`;
          const compressed = new File([blob], outName, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
